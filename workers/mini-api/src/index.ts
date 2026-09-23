/**
 * luminaq-api — tiny raw Cloudflare Worker (no framework, no deps).
 *
 * Owns everything the static Pages site cannot do:
 * admin auth + CRUD, uploads, AI metadata, download counting,
 * image-to-prompt proxy, and Pages rebuild trigger.
 *
 * Kept dependency-free and allocation-light on purpose: on the Workers
 * Free plan each request gets ~10ms CPU, so every endpoint does at most
 * one small Turso round-trip (network wait doesn't count toward CPU).
 */

type Env = {
  TURSO_URL: string;
  TURSO_TOKEN: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  DEPLOY_HOOK_URL?: string;
  ALLOWED_ORIGIN?: string; // default https://luminaq.xyz
  COOKIE_DOMAIN?: string; // default luminaq.xyz
};

// ---------- Hrana (Turso HTTP) minimal client ----------

type HranaValue =
  | { type: "null" }
  | { type: "integer"; value: string }
  | { type: "float"; value: number }
  | { type: "text"; value: string }
  | { type: "blob"; value: string };

function decodeValue(v: HranaValue): unknown {
  if (v.type === "null") return null;
  if (v.type === "integer") return Number(v.value);
  if (v.type === "float") return v.value;
  if (v.type === "text") return v.value;
  return v.value; // blob base64
}

function encodeArg(v: unknown): HranaValue | string | number | null {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "number") return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v };
  if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
  return { type: "text", value: String(v) };
}

type HranaRow = { values: HranaValue[] };

async function pipeline(
  env: Env,
  stmts: { sql: string; args?: unknown[] }[]
): Promise<{ cols: string[]; rows: Record<string, unknown>[] }[]> {
  const url = env.TURSO_URL.replace(/\/$/, "") + "/v2/pipeline";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TURSO_TOKEN}`,
    },
    body: JSON.stringify({
      requests: stmts.map((s) => ({
        type: "execute",
        stmt: { sql: s.sql, args: (s.args ?? []).map(encodeArg) },
      })),
    }),
  });
  if (!res.ok) throw new Error(`Turso error (${res.status})`);
  const data = (await res.json()) as {
    results?: { type: string; response?: { result?: { cols: { name: string }[]; rows: HranaRow[] } }; error?: { message: string } }[];
  };
  return (data.results ?? []).map((r) => {
    if (r.type !== "ok" || !r.response?.result) {
      throw new Error(r.response ? "Turso statement failed" : r.error?.message || "Turso error");
    }
    const cols = r.response.result.cols.map((c) => c.name);
    const rows = r.response.result.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      cols.forEach((c, i) => {
        obj[c] = decodeValue(row.values[i]);
      });
      return obj;
    });
    return { cols, rows };
  });
}

async function q(env: Env, sql: string, args?: unknown[]): Promise<Record<string, unknown>[]> {
  return (await pipeline(env, [{ sql, args }]))[0].rows;
}

function parseJsonArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonPalette(v: unknown): { hex: string; name?: string }[] {
  if (Array.isArray(v)) return v.filter((c) => c && typeof c.hex === "string");
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.filter((c) => c && typeof c.hex === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toImage(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: row.description == null ? "" : String(row.description),
    category: String(row.category ?? "photo"),
    tags: parseJsonArray(row.tags),
    prompt: row.prompt == null ? "" : String(row.prompt),
    palette: parseJsonPalette(row.palette),
    url: String(row.url ?? ""),
    thumbnailUrl: String(row.thumbnail_url ?? row.url ?? ""),
    width: row.width == null ? 1200 : Number(row.width),
    height: row.height == null ? 800 : Number(row.height),
    sizeBytes: row.size_bytes == null ? 0 : Number(row.size_bytes),
    downloads: Number(row.downloads ?? 0),
    trending: Number(row.trending ?? 0),
    isDailyPick: row.is_daily_pick === 1 || row.is_daily_pick === true,
    createdAt: String(row.created_at ?? ""),
    blurDataUrl: row.blur_data_url == null ? "" : String(row.blur_data_url),
  };
}

const IMAGE_COLS =
  "id,title,description,category,tags,prompt,palette,url,thumbnail_url,width,height,size_bytes,downloads,trending,is_daily_pick,created_at,blur_data_url";
// Slim list for the admin grid (skips prompt/palette/blur to stay small).
const IMAGE_COLS_SLIM =
  "id,title,description,category,tags,url,thumbnail_url,width,height,size_bytes,downloads,trending,is_daily_pick,created_at";

async function getSetting(env: Env, key: string): Promise<string | null> {
  const rows = await q(env, "SELECT value FROM settings WHERE key = ? LIMIT 1", [key]);
  return rows.length ? String(rows[0].value ?? "") : null;
}

async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await q(env, "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", [
    key,
    value,
  ]);
}

// ---------- auth (HMAC session cookie) ----------

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeSession(env: Env): Promise<string> {
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  const body = `admin.${exp}`;
  const sig = await hmacHex(env.SESSION_SECRET || env.ADMIN_PASSWORD, body);
  return `${body}.${sig}`;
}

async function checkSession(req: Request, env: Env): Promise<boolean> {
  const cookie = req.headers.get("Cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)luminaq_admin=([^;]+)/);
  const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const token = m?.[1] ?? bearer;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "admin") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const sig = await hmacHex(env.SESSION_SECRET || env.ADMIN_PASSWORD, `${parts[0]}.${parts[1]}`);
  return timingSafeEqual(sig, parts[2]);
}

function sessionCookie(env: Env, token: string, maxAge: number): string {
  const domain = env.COOKIE_DOMAIN || "luminaq.xyz";
  return `luminaq_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Domain=${domain}; Max-Age=${maxAge}`;
}

// ---------- http helpers ----------

function json(data: unknown, status = 200, setCookie?: string): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new Response(JSON.stringify(data), { status, headers });
}

// Loose JSON helper: upstream AI/storage APIs have untyped shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGIN || "https://luminaq.xyz").split(",").map((s) => s.trim());
  if (allowed.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      Vary: "Origin",
    };
  }
  return {};
}

function withCors(res: Response, req: Request, env: Env): Response {
  const h = corsHeaders(req, env);
  if (!Object.keys(h).length) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
  return out;
}

// ---------- AI (ported from the Next.js app) ----------

function robustParseJson(text: string): Record<string, unknown> | null {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch { /* fall through */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch { /* fall through */ }
  }
  return null;
}

function toMetadata(parsed: Record<string, unknown> | null) {
  return {
    title: String(parsed?.title ?? "").trim(),
    description: String(parsed?.description ?? "").trim(),
    tags: Array.isArray(parsed?.tags) ? (parsed.tags as unknown[]).map(String).slice(0, 8) : [],
    palette: Array.isArray(parsed?.palette)
      ? (parsed.palette as { hex?: unknown; name?: unknown }[]).filter((c) => c && typeof c.hex === "string").slice(0, 6)
      : [],
    prompt: String(parsed?.prompt ?? "").trim(),
  };
}

const CURATOR_PROMPT = (hint: string | undefined, video: boolean) =>
  [
    `You are an expert ${video ? "cinematography & motion design" : "design & photography"} curator. Analyze this visual asset carefully and generate structured metadata for a modern media asset library.`,
    hint ? `Reference filename / context: "${hint}"` : "",
    "Respond strictly in valid JSON format with this exact structure:",
    "{",
    '  "title": "A short, descriptive, elegant, punchy title (max 5-6 words, no quotes)",',
    '  "description": "A concise, engaging 1-2 sentence description accurately detailing the subject, lighting, and aesthetic",',
    '  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],',
    '  "palette": [{"hex": "#2D3748", "name": "Slate"}, {"hex": "#E2E8F0", "name": "Light Gray"}],',
    '  "prompt": "A high-detail AI generation prompt that accurately recreates this exact visual subject, lighting, lens/camera, mood, and art style"',
    "}",
    "Output only the JSON object without markdown fences or additional commentary.",
  ]
    .filter(Boolean)
    .join("\n");

function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function b64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64.includes(",") ? base64.split(",").pop()! : base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function analyzeWithGemini(bytes: Uint8Array, mimeType: string, model: string, apiKey: string, hint?: string) {
  if (!apiKey) return { ok: false as const, error: "Gemini API key not configured." };
  const isVideo = mimeType.startsWith("video/");
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: CURATOR_PROMPT(hint, isVideo) }, { inlineData: { mimeType, data: b64(bytes) } }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096, topP: 0.95, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) {
      const body = await safeJson(res);
      return { ok: false as const, error: body?.error?.message ?? `Gemini request failed (${res.status}).` };
    }
    const body = await safeJson(res);
    const text = body?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    const parsed = robustParseJson(text);
    if (!parsed) return { ok: false as const, error: "Could not parse Gemini metadata." };
    return { ok: true as const, data: toMetadata(parsed) };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Gemini request error." };
  }
}

function openAiImageMessages(prompt: string, mimeType: string, bytes: Uint8Array) {
  return [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64(bytes)}` } },
      ],
    },
  ];
}

async function analyzeOpenAiCompatible(
  name: string,
  url: string,
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  pickContent: (b: Record<string, unknown>) => string
) {
  if (!apiKey) return { ok: false as const, error: `${name} API key not configured.` };
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.2, ...body }),
    });
    if (!res.ok) {
      const b = await safeJson(res);
      return { ok: false as const, error: b?.error?.message ?? b?.message ?? `${name} request failed (${res.status}).` };
    }
    const b = (await res.json()) as Record<string, unknown>;
    const content = pickContent(b);
    if (!content) return { ok: false as const, error: `${name} returned empty response.` };
    const parsed = robustParseJson(content);
    if (!parsed) return { ok: false as const, error: `Could not parse ${name} metadata.` };
    return { ok: true as const, data: toMetadata(parsed) };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : `${name} request error.` };
  }
}

async function analyzeWithCloudflare(bytes: Uint8Array, model: string, accountId: string, apiToken: string, hint?: string) {
  if (!accountId || !apiToken) return { ok: false as const, error: "Cloudflare Account ID or API Token not configured." };
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ prompt: CURATOR_PROMPT(hint, false), image: [b64(bytes)], max_tokens: 1024 }),
    });
    const data = (await safeJson(res)) as { success?: boolean; result?: { response?: string }; errors?: { message?: string }[] } | null;
    if (!res.ok || !data?.success) {
      return { ok: false as const, error: `Cloudflare Workers AI request failed: ${data?.errors?.[0]?.message || res.statusText}` };
    }
    const parsed = robustParseJson(data?.result?.response ?? "");
    if (!parsed) return { ok: false as const, error: "Could not parse Cloudflare Workers AI metadata." };
    return { ok: true as const, data: toMetadata(parsed) };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Cloudflare Workers AI request error." };
  }
}

const MODEL_LISTS: Record<string, string[]> = {
  gemini: ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-pro"],
  groq: ["qwen/qwen3.6-27b"],
};

async function analyzeImage(
  env: Env,
  bytes: Uint8Array,
  mimeType: string,
  modelOverride?: string,
  hint?: string
): Promise<{ ok: boolean; error?: string; data?: ReturnType<typeof toMetadata> }> {
  const [sets] = await pipeline(env, [
    {
      sql: "SELECT key, value FROM settings WHERE key IN ('ai_provider','gemini_api_key','gemini_model','nvidia_api_key','nvidia_model','groq_api_key','groq_model','cloudflare_account_id','cloudflare_api_token','cloudflare_model','mistral_api_key','mistral_model')",
    },
  ]);
  const s: Record<string, string> = {};
  for (const r of sets.rows) s[String(r.key)] = String(r.value ?? "");

  let provider = s.ai_provider || "gemini";
  const mo = modelOverride?.trim();
  if (mo) {
    if (MODEL_LISTS.groq.includes(mo)) provider = "groq";
    else if (mo.startsWith("@cf/")) provider = "cloudflare";
    else if (mo.includes("/") || mo.includes("llama") || mo.includes("qwen2") || mo.includes("paligemma") || mo.includes("neva") || mo.includes("phi-3") || mo.includes("nvlm")) provider = "nvidia";
    else if (mo.startsWith("pixtral-") || mo.startsWith("mistral-") || mo.startsWith("ministral-")) provider = "mistral";
    else if (mo.startsWith("gemini-")) provider = "gemini";
  }

  if (provider === "nvidia") {
    return analyzeOpenAiCompatible("NVIDIA NIM", "https://integrate.api.nvidia.com/v1/chat/completions", s.nvidia_api_key, mo || s.nvidia_model || "meta/llama-3.2-90b-vision-instruct",
      { messages: openAiImageMessages(CURATOR_PROMPT(hint, false), mimeType, bytes), max_tokens: 4096, response_format: { type: "json_object" } },
      (b) => (b.choices as { message?: { content?: string } }[])?.[0]?.message?.content ?? "");
  }
  if (provider === "groq") {
    return analyzeOpenAiCompatible("Groq", "https://api.groq.com/openai/v1/chat/completions", s.groq_api_key, mo || s.groq_model || "qwen/qwen3.6-27b",
      { messages: openAiImageMessages(CURATOR_PROMPT(hint, false), mimeType, bytes), max_tokens: 2048, response_format: { type: "json_object" } },
      (b) => (b.choices as { message?: { content?: string } }[])?.[0]?.message?.content ?? "");
  }
  if (provider === "cloudflare") {
    return analyzeWithCloudflare(bytes, mo || s.cloudflare_model || "@cf/meta/llama-3.2-11b-vision-instruct", s.cloudflare_account_id, s.cloudflare_api_token, hint);
  }
  if (provider === "mistral") {
    return analyzeOpenAiCompatible("Mistral", "https://api.mistral.ai/v1/chat/completions", s.mistral_api_key, mo || s.mistral_model || "pixtral-12b-2409",
      { messages: openAiImageMessages(CURATOR_PROMPT(hint, false), mimeType, bytes), response_format: { type: "json_object" } },
      (b) => (b.choices as { message?: { content?: string } }[])?.[0]?.message?.content ?? "");
  }
  return analyzeWithGemini(bytes, mimeType, mo || s.gemini_model || "gemini-3.5-flash", s.gemini_api_key, hint);
}

async function testProvider(env: Env) {
  const [sets] = await pipeline(env, [
    { sql: "SELECT key, value FROM settings WHERE key LIKE '%api_key' OR key LIKE '%model' OR key = 'ai_provider' OR key = 'cloudflare_account_id' OR key = 'cloudflare_api_token'" },
  ]);
  const s: Record<string, string> = {};
  for (const r of sets.rows) s[String(r.key)] = String(r.value ?? "");
  const provider = s.ai_provider || "gemini";
  try {
    if (provider === "nvidia") {
      if (!s.nvidia_api_key) return { error: "No NVIDIA NIM API key saved." };
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.nvidia_api_key}` },
        body: JSON.stringify({ model: s.nvidia_model, messages: [{ role: "user", content: "Reply with the single word: ok" }], max_tokens: 10 }),
      });
      const d = await safeJson(res);
      if (!res.ok) return { error: d?.error?.message ?? "NVIDIA NIM connection failed." };
      return { message: `Connected to ${s.nvidia_model} successfully.` };
    }
    if (provider === "groq") {
      if (!s.groq_api_key) return { error: "No Groq API key saved." };
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.groq_api_key}` },
        body: JSON.stringify({ model: s.groq_model, messages: [{ role: "user", content: "Reply with the single word: ok" }], max_tokens: 10 }),
      });
      const d = await safeJson(res);
      if (!res.ok) return { error: d?.error?.message ?? "Groq connection failed." };
      return { message: `Connected to ${s.groq_model} successfully.` };
    }
    if (provider === "cloudflare") {
      if (!s.cloudflare_account_id || !s.cloudflare_api_token) return { error: "No Cloudflare Account ID or API Token saved." };
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${s.cloudflare_account_id}/ai/run/${s.cloudflare_model}`, {
        method: "POST", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.cloudflare_api_token}` },
        body: JSON.stringify({ prompt: "Reply with the single word: ok" }),
      });
      const d = (await safeJson(res)) as { success?: boolean; errors?: { message?: string }[] } | null;
      if (!res.ok || !d?.success) return { error: `Cloudflare Workers AI connection failed: ${d?.errors?.[0]?.message || res.statusText}` };
      return { message: `Connected to ${s.cloudflare_model} successfully.` };
    }
    if (provider === "mistral") {
      if (!s.mistral_api_key) return { error: "No Mistral API key saved." };
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST", signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.mistral_api_key}` },
        body: JSON.stringify({ model: s.mistral_model, messages: [{ role: "user", content: "Reply with the single word: ok" }], max_tokens: 10 }),
      });
      const d = await safeJson(res);
      if (!res.ok) return { error: d?.error?.message ?? "Mistral connection failed." };
      return { message: `Connected to ${s.mistral_model} successfully.` };
    }
    if (!s.gemini_api_key) return { error: "No Gemini API key saved." };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${s.gemini_model}:generateContent`, {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": s.gemini_api_key },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word: ok" }] }] }),
    });
    const d = await safeJson(res);
    if (!res.ok || d?.error) return { error: d?.error?.message ?? "Gemini connection failed." };
    return { message: `Connected to ${s.gemini_model} successfully.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Connection test failed." };
  }
}

// ---------- router ----------

const CATS = ["photo", "illustration", "3d", "video"];

const worker = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const method = req.method.toUpperCase();

    const respond = (r: Response) => withCors(r, req, env);

    if (method === "OPTIONS") {
      return respond(new Response(null, { status: 204 }));
    }

    const need = (p: string) => {
      const v = env[p as keyof Env];
      if (!v) throw new Error(`Missing secret: ${p}`);
      return v as string;
    };

    try {
      // ----- public: login -----
      if (path === "/login" && method === "POST") {
        const body = (await req.json().catch(() => null)) as { password?: string } | null;
        if (!body?.password || !timingSafeEqual(body.password, need("ADMIN_PASSWORD"))) {
          return respond(json({ error: "Incorrect password." }, 401));
        }
        const token = await makeSession(env);
        return respond(json({ ok: true }, 200, sessionCookie(env, token, 7 * 24 * 3600)));
      }
      if (path === "/logout" && method === "POST") {
        return respond(json({ ok: true }, 200, sessionCookie(env, "", 0)));
      }
      if (path === "/me") {
        return respond(json({ authed: await checkSession(req, env) }));
      }

      // ----- public: download counter (tiny single-row write) -----
      if (path === "/increment" && method === "POST") {
        const body = (await req.json().catch(() => null)) as { id?: string } | null;
        if (!body?.id) return respond(json({ error: "Missing id." }, 400));
        const rows = await q(env, "UPDATE images SET downloads = downloads + 1 WHERE id = ? RETURNING downloads", [body.id]);
        return respond(json({ downloads: rows.length ? Number(rows[0].downloads) : 0 }));
      }

      // ----- public: image-to-prompt proxy (capped) -----
      if (path === "/tools/image-to-prompt" && method === "POST") {
        const raw = await req.text();
        if (raw.length > 6_000_000) return respond(json({ error: "Image payload too large." }, 413));
        const body = JSON.parse(raw) as { image?: string; language?: string; model?: string };
        if (!body?.image) return respond(json({ success: false, error: "Image data is required" }, 400));
        const res = await fetch("https://api.imagepromptguru.net/image-to-prompt", {
          method: "POST",
          signal: AbortSignal.timeout(25000),
          headers: {
            "Content-Type": "application/json",
            Origin: "https://imagepromptguru.net",
            Referer: "https://imagepromptguru.net/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({ image: body.image, language: body.language ?? "en", model: body.model ?? "general" }),
        });
        if (!res.ok) {
          const t = await res.text();
          return respond(json({ success: false, error: `API error: ${res.status} - ${t}` }, res.status));
        }
        return respond(json(await res.json()));
      }

      // ----- everything below requires admin session -----
      if (!(await checkSession(req, env))) {
        return respond(json({ error: "Unauthorized." }, 401));
      }

      // ----- dashboard (aggregates computed in SQL, tiny response) -----
      if (path === "/dashboard" && method === "GET") {
        const [stats, byDay, byCat, topTags, topDl, trending] = await pipeline(env, [
          { sql: "SELECT COUNT(*) c, COALESCE(SUM(downloads),0) d, COALESCE(SUM(size_bytes),0) s, COALESCE(SUM(is_daily_pick),0) p FROM images" },
          { sql: "SELECT substr(created_at,1,10) d, COUNT(*) c FROM images WHERE created_at >= date('now','-30 days') GROUP BY d ORDER BY d" },
          { sql: "SELECT category c, COUNT(*) n FROM images GROUP BY category" },
          { sql: "SELECT jt.value t, COUNT(*) n FROM images, json_each(images.tags) jt GROUP BY jt.value ORDER BY n DESC LIMIT 10" },
          { sql: "SELECT title t, downloads v FROM images ORDER BY downloads DESC LIMIT 8" },
          { sql: "SELECT title t, trending v FROM images ORDER BY trending DESC LIMIT 8" },
        ]);
        const s0 = stats.rows[0] ?? {};
        const dayMap = new Map<string, number>();
        for (const r of byDay.rows) dayMap.set(String(r.d), Number(r.c));
        const days: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
          days.push({ date: d, count: dayMap.get(d) ?? 0 });
        }
        const label: Record<string, string> = { photo: "Photo", illustration: "Illustration", "3d": "3D", video: "Video" };
        return respond(
          json({
            stats: {
              images: Number(s0.c ?? 0),
              downloads: Number(s0.d ?? 0),
              storageBytes: Number(s0.s ?? 0),
              dailyPicks: Number(s0.p ?? 0),
            },
            uploadsByDay: days,
            byCategory: byCat.rows.map((r) => ({ name: label[String(r.c)] ?? String(r.c), value: Number(r.n) })),
            topTags: topTags.rows.map((r) => ({ name: String(r.t), value: Number(r.n) })),
            topDownloaded: topDl.rows.map((r) => ({ name: String(r.t), value: Number(r.v) })),
            bucketUsage: [],
            trending: trending.rows.map((r) => ({ title: String(r.t), value: Number(r.v) })),
          })
        );
      }

      // ----- images list (slim) / single -----
      if (path === "/images" && method === "GET") {
        const rows = await q(env, `SELECT ${IMAGE_COLS_SLIM} FROM images ORDER BY created_at DESC LIMIT 2000`);
        return respond(json(rows.map(toImage)));
      }
      const imageIdMatch = path.match(/^\/images\/([^/]+)$/);
      if (imageIdMatch && method === "GET") {
        const rows = await q(env, `SELECT ${IMAGE_COLS} FROM images WHERE id = ? LIMIT 1`, [decodeURIComponent(imageIdMatch[1])]);
        if (!rows.length) return respond(json({ error: "Not found." }, 404));
        return respond(json(toImage(rows[0])));
      }
      if (path === "/images" && method === "POST") {
        const b = (await req.json()) as Record<string, string>;
        const title = (b.title ?? "").trim();
        const rurl = (b.url ?? "").trim();
        const category = (b.category ?? "photo").trim();
        if (!title) return respond(json({ error: "Title is required." }, 400));
        if (!/^https?:\/\//.test(rurl)) return respond(json({ error: "Invalid image URL." }, 400));
        if (!CATS.includes(category)) return respond(json({ error: "Invalid category." }, 400));
        let palette: { hex: string; name?: string }[] = [];
        try {
          palette = b.palette ? JSON.parse(b.palette).filter((c: { hex?: unknown }) => c && typeof c.hex === "string") : [];
        } catch {
          return respond(json({ error: "Invalid palette data." }, 400));
        }
        const tags = (b.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
        const id = crypto.randomUUID();
        await q(
          env,
          "INSERT INTO images (id,title,description,category,tags,prompt,palette,url,thumbnail_url,width,height,size_bytes,downloads,trending,is_daily_pick,created_at,blur_data_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)",
          [
            id, title, (b.description ?? "").trim(), category, JSON.stringify(tags), (b.prompt ?? "").trim(),
            JSON.stringify(palette), rurl, (b.thumbnailUrl ?? "").trim() || rurl,
            Math.max(1, Number(b.width) || 1200), Math.max(1, Number(b.height) || 800), Math.max(0, Number(b.sizeBytes) || 0),
            0, 0, 0, (b.blurDataUrl ?? "").trim(),
          ]
        );
        return respond(json({ ok: true, id }));
      }
      if (imageIdMatch && method === "PATCH") {
        const id = decodeURIComponent(imageIdMatch[1]);
        const b = (await req.json()) as Record<string, unknown>;
        const existing = await q(env, `SELECT ${IMAGE_COLS} FROM images WHERE id = ? LIMIT 1`, [id]);
        if (!existing.length) return respond(json({ error: "Image not found." }, 404));
        const cur = toImage(existing[0]);
        const title = String(b.title ?? cur.title).trim();
        if (!title) return respond(json({ error: "Title is required." }, 400));
        const category = String(b.category ?? cur.category);
        if (!CATS.includes(category)) return respond(json({ error: "Invalid category." }, 400));
        const tags = Array.isArray(b.tags) ? (b.tags as unknown[]).map(String) : cur.tags;
        const palette = Array.isArray(b.palette) ? (b.palette as { hex: string }[]).filter((c) => c && typeof c.hex === "string") : cur.palette;
        await q(
          env,
          "UPDATE images SET title=?,description=?,category=?,tags=?,palette=?,prompt=?,url=?,thumbnail_url=?,width=?,height=? WHERE id=?",
          [
            title, b.description == null ? cur.description : String(b.description), category,
            JSON.stringify(tags), JSON.stringify(palette), b.prompt == null ? cur.prompt : String(b.prompt),
            b.url == null ? cur.url : String(b.url), b.thumbnailUrl == null ? cur.thumbnailUrl : String(b.thumbnailUrl),
            b.width == null ? cur.width : Math.max(1, Number(b.width) || cur.width),
            b.height == null ? cur.height : Math.max(1, Number(b.height) || cur.height), id,
          ]
        );
        return respond(json({ ok: true }));
      }
      if (imageIdMatch && method === "DELETE") {
        await q(env, "DELETE FROM images WHERE id = ?", [decodeURIComponent(imageIdMatch[1])]);
        return respond(json({ ok: true }));
      }

      // ----- AI settings -----
      if (path === "/settings/ai" && method === "GET") {
        const [sets] = await pipeline(env, [
          { sql: "SELECT key, value FROM settings WHERE key IN ('ai_provider','gemini_api_key','gemini_model','nvidia_api_key','nvidia_model','groq_api_key','groq_model','cloudflare_account_id','cloudflare_api_token','cloudflare_model','mistral_api_key','mistral_model')" },
        ]);
        const s: Record<string, string> = {
          provider: "gemini", geminiApiKey: "", geminiModel: "gemini-3.5-flash",
          nvidiaApiKey: "", nvidiaModel: "meta/llama-3.2-90b-vision-instruct",
          groqApiKey: "", groqModel: "qwen/qwen3.6-27b",
          cloudflareAccountId: "", cloudflareApiToken: "", cloudflareModel: "@cf/meta/llama-3.2-11b-vision-instruct",
          mistralApiKey: "", mistralModel: "pixtral-12b-2409",
        };
        const map: Record<string, string> = {
          ai_provider: "provider", gemini_api_key: "geminiApiKey", gemini_model: "geminiModel",
          nvidia_api_key: "nvidiaApiKey", nvidia_model: "nvidiaModel", groq_api_key: "groqApiKey", groq_model: "groqModel",
          cloudflare_account_id: "cloudflareAccountId", cloudflare_api_token: "cloudflareApiToken", cloudflare_model: "cloudflareModel",
          mistral_api_key: "mistralApiKey", mistral_model: "mistralModel",
        };
        for (const r of sets.rows) {
          const k = map[String(r.key)];
          if (k && String(r.value ?? "")) s[k] = String(r.value);
        }
        return respond(json(s));
      }
      if (path === "/settings/ai" && method === "PUT") {
        const b = (await req.json()) as Record<string, string>;
        const pairs: [string, string][] = [
          ["ai_provider", (b.provider ?? "gemini").trim()],
          ["gemini_api_key", (b.geminiApiKey ?? "").trim()],
          ["nvidia_api_key", (b.nvidiaApiKey ?? "").trim()],
          ["groq_api_key", (b.groqApiKey ?? "").trim()],
          ["cloudflare_account_id", (b.cloudflareAccountId ?? "").trim()],
          ["cloudflare_api_token", (b.cloudflareApiToken ?? "").trim()],
          ["mistral_api_key", (b.mistralApiKey ?? "").trim()],
        ];
        if ((b.geminiModel ?? "").trim()) pairs.push(["gemini_model", b.geminiModel.trim()]);
        if ((b.nvidiaModel ?? "").trim()) pairs.push(["nvidia_model", b.nvidiaModel.trim()]);
        if ((b.groqModel ?? "").trim()) pairs.push(["groq_model", b.groqModel.trim()]);
        if ((b.cloudflareModel ?? "").trim()) pairs.push(["cloudflare_model", b.cloudflareModel.trim()]);
        if ((b.mistralModel ?? "").trim()) pairs.push(["mistral_model", b.mistralModel.trim()]);
        await pipeline(env, pairs.map(([k, v]) => ({
          sql: "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
          args: [k, v],
        })));
        return respond(json({ ok: true }));
      }
      if (path === "/settings/ai/test" && method === "POST") {
        return respond(json(await testProvider(env)));
      }

      // ----- storage settings -----
      if (path === "/settings/storage" && method === "GET") {
        const [sets] = await pipeline(env, [
          { sql: "SELECT key, value FROM settings WHERE key IN ('storage_provider','filegarden_user_id','filegarden_auth_cookie','filegarden_public_id','imgcdn_api_key')" },
        ]);
        const s: Record<string, string> = { storageProvider: "filegarden", fgUserId: "", fgAuthCookie: "", fgPublicId: "", imgCdnApiKey: "" };
        const map: Record<string, string> = {
          storage_provider: "storageProvider", filegarden_user_id: "fgUserId", filegarden_auth_cookie: "fgAuthCookie",
          filegarden_public_id: "fgPublicId", imgcdn_api_key: "imgCdnApiKey",
        };
        for (const r of sets.rows) {
          const k = map[String(r.key)];
          if (k) s[k] = String(r.value ?? "");
        }
        return respond(json(s));
      }
      if (path === "/settings/storage/provider" && method === "PUT") {
        const b = (await req.json()) as { provider?: string };
        await setSetting(env, "storage_provider", (b.provider ?? "filegarden").trim());
        return respond(json({ ok: true }));
      }
      if (path === "/settings/storage/filegarden" && method === "PUT") {
        const b = (await req.json()) as { userId?: string; authCookie?: string; publicId?: string };
        if (!(b.userId ?? "").trim()) return respond(json({ error: "Storage User ID is required." }, 400));
        await pipeline(env, [
          { sql: "INSERT INTO settings (key, value, updated_at) VALUES ('filegarden_user_id', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", args: [(b.userId ?? "").trim().toLowerCase()] },
          { sql: "INSERT INTO settings (key, value, updated_at) VALUES ('filegarden_auth_cookie', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", args: [(b.authCookie ?? "").trim()] },
          { sql: "INSERT INTO settings (key, value, updated_at) VALUES ('filegarden_public_id', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", args: [(b.publicId ?? "").trim()] },
        ]);
        return respond(json({ ok: true }));
      }
      if (path === "/settings/storage/imgcdn" && method === "PUT") {
        const b = (await req.json()) as { apiKey?: string };
        if (!(b.apiKey ?? "").trim()) return respond(json({ error: "ImgCDN API key is required." }, 400));
        await setSetting(env, "imgcdn_api_key", (b.apiKey ?? "").trim());
        return respond(json({ ok: true }));
      }

      // ----- upload (buffered, 25MB cap — admin use only) -----
      if (path === "/upload" && method === "POST") {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return respond(json({ error: "No file provided." }, 400));
        if (file.size > 25 * 1024 * 1024) return respond(json({ error: "File too large (max 25MB)." }, 413));
        const provider = (await getSetting(env, "storage_provider")) || "filegarden";
        const buf = new Uint8Array(await file.arrayBuffer());
        if (provider === "imgcdn") {
          const apiKey = await getSetting(env, "imgcdn_api_key");
          if (!apiKey) return respond(json({ error: "ImgCDN API key is not configured in settings." }, 400));
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const merged = new Uint8Array(buf.length + salt.length);
          merged.set(buf, 0);
          merged.set(salt, buf.length);
          const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
          const randomFilename = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();
          const up = new FormData();
          up.append("key", apiKey);
          up.append("action", "upload");
          up.append("source", new File([merged], randomFilename, { type: file.type || "image/jpeg" }));
          const res = await fetch("https://imgcdn.dev/api/1/upload", { method: "POST", body: up, signal: AbortSignal.timeout(60000) });
          const data = (await safeJson(res)) as { image?: { url?: string; display_url?: string }; error?: { code?: number; message?: string }; message?: string; status_code?: number } | null;
          if (!res.ok) {
            const code = data?.error?.code ?? data?.status_code;
            const existing = data?.image?.url || data?.image?.display_url;
            if (code === 101 && existing) return respond(json({ url: existing }));
            return respond(json({ error: `ImgCDN upload failed (${res.status}): ${data?.error?.message || data?.message || res.statusText}` }, res.status));
          }
          const imageUrl = data?.image?.url || data?.image?.display_url;
          if (!imageUrl) return respond(json({ error: "Invalid response from ImgCDN (missing image URL)." }, 500));
          return respond(json({ url: imageUrl }));
        }
        // filegarden
        const userId = (await getSetting(env, "filegarden_user_id")) || "";
        let authCookie = (await getSetting(env, "filegarden_auth_cookie")) || "";
        const publicId = (await getSetting(env, "filegarden_public_id")) || userId;
        if (!userId || !authCookie) {
          return respond(json({ error: "File Garden User ID or Auth Cookie is not configured in settings." }, 400));
        }
        authCookie = authCookie.trim();
        if (!authCookie.includes("auth=")) authCookie = `auth=${authCookie}`;
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
        const randomFilename = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();
        const res = await fetch(`https://api.filegarden.com/users/${userId.trim().toLowerCase()}/pipe`, {
          method: "POST",
          signal: AbortSignal.timeout(60000),
          headers: {
            Cookie: authCookie,
            "Content-Type": "application/octet-stream",
            "X-Data": JSON.stringify({ parent: null, name: randomFilename }),
          },
          body: buf,
        });
        if (!res.ok) {
          const t = await res.text();
          return respond(json({ error: `File Garden upload failed (${res.status}): ${t || res.statusText}` }, res.status));
        }
        const data = (await res.json()) as { path?: string; items?: { path?: string }[] };
        const p = data?.path || data?.items?.[0]?.path;
        if (!p) return respond(json({ error: "Invalid response from File Garden (missing path)." }, 500));
        return respond(json({ url: `https://file.garden/${publicId.trim()}/${p}` }));
      }

      // ----- AI generate -----
      if (path === "/ai/generate" && method === "POST") {
        const b = (await req.json()) as { url?: string; model?: string; hint?: string };
        if (!b.url) return respond(json({ error: "Missing url." }, 400));
        let bytes: Uint8Array;
        try {
          const res = await fetch(b.url, { signal: AbortSignal.timeout(30000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ab = await res.arrayBuffer();
          if (ab.byteLength > 15 * 1024 * 1024) return respond(json({ error: "Remote image too large (max 15MB)." }, 413));
          bytes = new Uint8Array(ab);
        } catch (err) {
          return respond(json({ error: `Could not read image URL: ${err instanceof Error ? err.message : "fetch failed"}` }, 400));
        }
        const ext = b.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
        const mime: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
        const result = await analyzeImage(env, bytes, mime[ext] ?? "image/jpeg", b.model, b.hint);
        if (!result.ok) return respond(json({ error: result.error }, 500));
        return respond(json(result.data));
      }
      if (path === "/ai/generate-file" && method === "POST") {
        const b = (await req.json()) as { base64?: string; mimeType?: string; model?: string; hint?: string };
        if (!b.base64) return respond(json({ error: "Missing base64." }, 400));
        try {
          const bytes = b64ToBytes(b.base64);
          if (bytes.length > 15 * 1024 * 1024) return respond(json({ error: "Image too large (max 15MB)." }, 413));
          const result = await analyzeImage(env, bytes, b.mimeType || "image/jpeg", b.model, b.hint);
          if (!result.ok) return respond(json({ error: result.error }, 500));
          return respond(json(result.data));
        } catch (err) {
          return respond(json({ error: err instanceof Error ? err.message : "Metadata generation failed." }, 500));
        }
      }

      // ----- logs -----
      if (path === "/logs" && method === "GET") {
        const rows = await q(env, "SELECT id,message,stack,url,user_agent,status,created_at FROM error_logs ORDER BY created_at DESC LIMIT 200");
        return respond(
          json(
            rows.map((r) => ({
              id: String(r.id),
              message: String(r.message ?? ""),
              stack: r.stack == null ? "" : String(r.stack),
              url: r.url == null ? "" : String(r.url),
              userAgent: r.user_agent == null ? "" : String(r.user_agent),
              status: String(r.status ?? "unresolved"),
              createdAt: String(r.created_at ?? ""),
            }))
          )
        );
      }
      const logResolve = path.match(/^\/logs\/([^/]+)\/resolve$/);
      if (logResolve && method === "POST") {
        await q(env, "UPDATE error_logs SET status = 'resolved' WHERE id = ?", [decodeURIComponent(logResolve[1])]);
        return respond(json({ ok: true }));
      }
      const logId = path.match(/^\/logs\/([^/]+)$/);
      if (logId && method === "DELETE") {
        await q(env, "DELETE FROM error_logs WHERE id = ?", [decodeURIComponent(logId[1])]);
        return respond(json({ ok: true }));
      }

      // ----- publish (trigger Pages rebuild) -----
      if (path === "/publish" && method === "POST") {
        const hook = env.DEPLOY_HOOK_URL;
        if (!hook) return respond(json({ error: "Deploy hook is not configured." }, 500));
        const res = await fetch(hook, { method: "POST" });
        if (!res.ok) return respond(json({ error: `Deploy hook failed (${res.status}).` }, 502));
        return respond(json({ ok: true }));
      }

      return respond(json({ error: "Not found." }, 404));
    } catch (err) {
      return respond(json({ error: err instanceof Error ? err.message : "Internal error." }, 500));
    }
  },
};

export default worker;
