var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-VVkxN7/functionsWorker-0.47286120096615036.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
function decodeValue(v) {
  if (v == null) return null;
  if (v.type === "null") return null;
  if (v.type === "integer") return Number(v.value);
  if (v.type === "float") return v.value;
  if (v.type === "text") return v.value;
  return v.value;
}
__name(decodeValue, "decodeValue");
__name2(decodeValue, "decodeValue");
function encodeArg(v) {
  if (v === null || v === void 0) return { type: "null" };
  if (typeof v === "number") return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v };
  if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
  return { type: "text", value: String(v) };
}
__name(encodeArg, "encodeArg");
__name2(encodeArg, "encodeArg");
async function pipeline(env, stmts) {
  const base = env.TURSO_URL.replace(/\/$/, "").replace(/^libsql:\/\//i, "https://");
  const url = base + "/v2/pipeline";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TURSO_TOKEN}`
    },
    body: JSON.stringify({
      requests: stmts.map((s) => ({
        type: "execute",
        stmt: { sql: s.sql, args: (s.args ?? []).map(encodeArg) }
      }))
    })
  });
  if (!res.ok) throw new Error(`Turso error (${res.status})`);
  const data = await res.json();
  return (data.results ?? []).map((r) => {
    if (r.type !== "ok" || !r.response?.result) {
      throw new Error(r.response ? "Turso statement failed" : r.error?.message || "Turso error");
    }
    const cols = r.response.result.cols.map((c) => c.name);
    const rows = r.response.result.rows.map((row) => {
      const obj = {};
      const values = Array.isArray(row) ? row : row.values;
      cols.forEach((c, i) => {
        obj[c] = decodeValue(values?.[i]);
      });
      return obj;
    });
    return { cols, rows };
  });
}
__name(pipeline, "pipeline");
__name2(pipeline, "pipeline");
async function q(env, sql, args) {
  return (await pipeline(env, [{ sql, args }]))[0].rows;
}
__name(q, "q");
__name2(q, "q");
function parseJsonArray(v) {
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
__name(parseJsonArray, "parseJsonArray");
__name2(parseJsonArray, "parseJsonArray");
function parseJsonPalette(v) {
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
__name(parseJsonPalette, "parseJsonPalette");
__name2(parseJsonPalette, "parseJsonPalette");
function toImage(row) {
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
    blurDataUrl: row.blur_data_url == null ? "" : String(row.blur_data_url)
  };
}
__name(toImage, "toImage");
__name2(toImage, "toImage");
var IMAGE_COLS = "id,title,description,category,tags,prompt,palette,url,thumbnail_url,width,height,size_bytes,downloads,trending,is_daily_pick,created_at,blur_data_url";
var IMAGE_COLS_SLIM = "id,title,description,category,tags,url,thumbnail_url,width,height,size_bytes,downloads,trending,is_daily_pick,created_at";
async function getSetting(env, key) {
  const rows = await q(env, "SELECT value FROM settings WHERE key = ? LIMIT 1", [key]);
  return rows.length ? String(rows[0].value ?? "") : null;
}
__name(getSetting, "getSetting");
__name2(getSetting, "getSetting");
async function setSetting(env, key, value) {
  await q(env, "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", [
    key,
    value
  ]);
}
__name(setSetting, "setSetting");
__name2(setSetting, "setSetting");
var MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
var SECRET_SETTING_KEYS = /* @__PURE__ */ new Set([
  "gemini_api_key",
  "nvidia_api_key",
  "groq_api_key",
  "mistral_api_key",
  "cloudflare_api_token",
  "filegarden_auth_cookie",
  "imgcdn_api_key"
]);
function maskIfSecret(key, value) {
  if (!SECRET_SETTING_KEYS.has(key)) return value;
  return value ? MASK : "";
}
__name(maskIfSecret, "maskIfSecret");
__name2(maskIfSecret, "maskIfSecret");
function isSecretUpdate(key, value) {
  const v = value.trim();
  return SECRET_SETTING_KEYS.has(key) && v.length > 0 && v !== MASK;
}
__name(isSecretUpdate, "isSecretUpdate");
__name2(isSecretUpdate, "isSecretUpdate");
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
__name2(timingSafeEqual, "timingSafeEqual");
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacHex, "hmacHex");
__name2(hmacHex, "hmacHex");
async function makeSession(env) {
  const exp = Date.now() + 7 * 24 * 3600 * 1e3;
  const body = `admin.${exp}`;
  const sig = await hmacHex(env.SESSION_SECRET || env.ADMIN_PASSWORD, body);
  return `${body}.${sig}`;
}
__name(makeSession, "makeSession");
__name2(makeSession, "makeSession");
async function checkSession(req, env) {
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
__name(checkSession, "checkSession");
__name2(checkSession, "checkSession");
function sessionCookie(req, env, token, maxAge) {
  const host = new URL(req.url).hostname;
  let cookie = `luminaq_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  if (host.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const labels = host.split(".");
    const base = labels.length > 2 ? labels.slice(-2).join(".") : host;
    const domain = env.COOKIE_DOMAIN?.trim() || base;
    if (domain) cookie += `; Domain=${domain}`;
  }
  return `${cookie}; Max-Age=${maxAge}`;
}
__name(sessionCookie, "sessionCookie");
__name2(sessionCookie, "sessionCookie");
function json(data, status = 200, setCookie) {
  const headers = { "Content-Type": "application/json" };
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new Response(JSON.stringify(data), { status, headers });
}
__name(json, "json");
__name2(json, "json");
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
__name(safeJson, "safeJson");
__name2(safeJson, "safeJson");
function corsHeaders(req, env) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = (env.ALLOWED_ORIGIN ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      Vary: "Origin"
    };
  }
  return {};
}
__name(corsHeaders, "corsHeaders");
__name2(corsHeaders, "corsHeaders");
function withCors(res, req, env) {
  const h = corsHeaders(req, env);
  if (!Object.keys(h).length) return res;
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
  return out;
}
__name(withCors, "withCors");
__name2(withCors, "withCors");
function robustParseJson(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
    }
  }
  return null;
}
__name(robustParseJson, "robustParseJson");
__name2(robustParseJson, "robustParseJson");
function toMetadata(parsed) {
  return {
    title: String(parsed?.title ?? "").trim(),
    description: String(parsed?.description ?? "").trim(),
    tags: Array.isArray(parsed?.tags) ? parsed.tags.map(String).slice(0, 8) : [],
    palette: Array.isArray(parsed?.palette) ? parsed.palette.filter((c) => c && typeof c.hex === "string").slice(0, 6) : [],
    prompt: String(parsed?.prompt ?? "").trim()
  };
}
__name(toMetadata, "toMetadata");
__name2(toMetadata, "toMetadata");
var CURATOR_PROMPT = /* @__PURE__ */ __name2((hint, video) => [
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
  "Output only the JSON object without markdown fences or additional commentary."
].filter(Boolean).join("\n"), "CURATOR_PROMPT");
var SFX_PROMPT = /* @__PURE__ */ __name2((hint) => [
  "You are an expert sound designer and audio curator. Listen to this sound effect carefully and generate structured metadata for a modern media asset library.",
  hint ? `Reference filename / context: "${hint}"` : "",
  "Focus on the actual sound events, texture, intensity, environment, and any musical character. Do not invent visuals.",
  "Respond strictly in valid JSON format with this exact structure:",
  "{",
  '  "title": "A short, descriptive, punchy title (max 5-6 words, no quotes)",',
  '  "description": "A concise, engaging 1-2 sentence description of what the sound is and where it would be used",',
  '  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],',
  '  "palette": [],',
  '  "prompt": ""',
  "}",
  "Output only the JSON object without markdown fences or additional commentary."
].filter(Boolean).join("\n"), "SFX_PROMPT");
function b64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 32768) {
    s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(s);
}
__name(b64, "b64");
__name2(b64, "b64");
function b64ToBytes(base64) {
  const bin = atob(base64.includes(",") ? base64.split(",").pop() : base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
__name(b64ToBytes, "b64ToBytes");
__name2(b64ToBytes, "b64ToBytes");
async function analyzeWithGemini(bytes, mimeType, model, apiKey, hint) {
  if (!apiKey) return { ok: false, error: "Gemini API key not configured." };
  const isAudio = mimeType.startsWith("audio/");
  const isVideo = mimeType.startsWith("video/");
  const prompt = isAudio ? SFX_PROMPT(hint) : CURATOR_PROMPT(hint, isVideo);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(isAudio ? 45e3 : 2e4),
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: b64(bytes) } }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096, topP: 0.95, responseMimeType: "application/json" }
      })
    });
    if (!res.ok) {
      const body2 = await safeJson(res);
      return { ok: false, error: body2?.error?.message ?? `Gemini request failed (${res.status}).` };
    }
    const body = await safeJson(res);
    const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const parsed = robustParseJson(text);
    if (!parsed) return { ok: false, error: "Could not parse Gemini metadata." };
    return { ok: true, data: toMetadata(parsed) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Gemini request error." };
  }
}
__name(analyzeWithGemini, "analyzeWithGemini");
__name2(analyzeWithGemini, "analyzeWithGemini");
function openAiImageMessages(prompt, mimeType, bytes) {
  return [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64(bytes)}` } }
      ]
    }
  ];
}
__name(openAiImageMessages, "openAiImageMessages");
__name2(openAiImageMessages, "openAiImageMessages");
async function analyzeOpenAiCompatible(name, url, apiKey, model, body, pickContent) {
  if (!apiKey) return { ok: false, error: `${name} API key not configured.` };
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(2e4),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.2, ...body })
    });
    if (!res.ok) {
      const b2 = await safeJson(res);
      return { ok: false, error: b2?.error?.message ?? b2?.message ?? `${name} request failed (${res.status}).` };
    }
    const b = await res.json();
    const content = pickContent(b);
    if (!content) return { ok: false, error: `${name} returned empty response.` };
    const parsed = robustParseJson(content);
    if (!parsed) return { ok: false, error: `Could not parse ${name} metadata.` };
    return { ok: true, data: toMetadata(parsed) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : `${name} request error.` };
  }
}
__name(analyzeOpenAiCompatible, "analyzeOpenAiCompatible");
__name2(analyzeOpenAiCompatible, "analyzeOpenAiCompatible");
async function analyzeWithCloudflare(bytes, model, accountId, apiToken, hint) {
  if (!accountId || !apiToken) return { ok: false, error: "Cloudflare Account ID or API Token not configured." };
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      signal: AbortSignal.timeout(25e3),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ prompt: CURATOR_PROMPT(hint, false), image: [b64(bytes)], max_tokens: 1024 })
    });
    const data = await safeJson(res);
    if (!res.ok || !data?.success) {
      return { ok: false, error: `Cloudflare Workers AI request failed: ${data?.errors?.[0]?.message || res.statusText}` };
    }
    const parsed = robustParseJson(data?.result?.response ?? "");
    if (!parsed) return { ok: false, error: "Could not parse Cloudflare Workers AI metadata." };
    return { ok: true, data: toMetadata(parsed) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Cloudflare Workers AI request error." };
  }
}
__name(analyzeWithCloudflare, "analyzeWithCloudflare");
__name2(analyzeWithCloudflare, "analyzeWithCloudflare");
var MODEL_LISTS = {
  gemini: ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-3-flash-preview"],
  groq: ["qwen/qwen3.6-27b"]
};
async function analyzeImage(env, bytes, mimeType, modelOverride, hint) {
  const [sets] = await pipeline(env, [
    {
      sql: "SELECT key, value FROM settings WHERE key IN ('ai_provider','gemini_api_key','gemini_model','nvidia_api_key','nvidia_model','groq_api_key','groq_model','cloudflare_account_id','cloudflare_api_token','cloudflare_model','mistral_api_key','mistral_model')"
    }
  ]);
  const s = {};
  for (const r of sets.rows) s[String(r.key)] = String(r.value ?? "");
  let provider = s.ai_provider || "gemini";
  const mo = modelOverride?.trim();
  if (mimeType.startsWith("audio/")) {
    const audioModel = mo && mo.startsWith("gemini-") ? mo : s.gemini_model || "gemini-3.8-flash";
    return analyzeWithGemini(bytes, mimeType, audioModel, s.gemini_api_key, hint);
  }
  if (mo) {
    if (MODEL_LISTS.groq.includes(mo)) provider = "groq";
    else if (mo.startsWith("@cf/")) provider = "cloudflare";
    else if (mo.includes("/") || mo.includes("llama") || mo.includes("qwen2") || mo.includes("paligemma") || mo.includes("neva") || mo.includes("phi-3") || mo.includes("nvlm")) provider = "nvidia";
    else if (mo.startsWith("pixtral-") || mo.startsWith("mistral-") || mo.startsWith("ministral-")) provider = "mistral";
    else if (mo.startsWith("gemini-")) provider = "gemini";
  }
  if (provider === "nvidia") {
    return analyzeOpenAiCompatible(
      "NVIDIA NIM",
      "https://integrate.api.nvidia.com/v1/chat/completions",
      s.nvidia_api_key,
      mo || s.nvidia_model || "meta/llama-3.2-90b-vision-instruct",
      { messages: openAiImageMessages(CURATOR_PROMPT(hint, false), mimeType, bytes), max_tokens: 4096, response_format: { type: "json_object" } },
      (b) => b.choices?.[0]?.message?.content ?? ""
    );
  }
  if (provider === "groq") {
    return analyzeOpenAiCompatible(
      "Groq",
      "https://api.groq.com/openai/v1/chat/completions",
      s.groq_api_key,
      mo || s.groq_model || "qwen/qwen3.6-27b",
      { messages: openAiImageMessages(CURATOR_PROMPT(hint, false), mimeType, bytes), max_tokens: 2048, response_format: { type: "json_object" } },
      (b) => b.choices?.[0]?.message?.content ?? ""
    );
  }
  if (provider === "cloudflare") {
    return analyzeWithCloudflare(bytes, mo || s.cloudflare_model || "@cf/meta/llama-3.2-11b-vision-instruct", s.cloudflare_account_id, s.cloudflare_api_token, hint);
  }
  if (provider === "mistral") {
    return analyzeOpenAiCompatible(
      "Mistral",
      "https://api.mistral.ai/v1/chat/completions",
      s.mistral_api_key,
      mo || s.mistral_model || "ministral-14b-2512",
      { messages: openAiImageMessages(CURATOR_PROMPT(hint, false), mimeType, bytes), response_format: { type: "json_object" } },
      (b) => b.choices?.[0]?.message?.content ?? ""
    );
  }
  return analyzeWithGemini(bytes, mimeType, mo || s.gemini_model || "gemini-3.5-flash", s.gemini_api_key, hint);
}
__name(analyzeImage, "analyzeImage");
__name2(analyzeImage, "analyzeImage");
async function testProvider(env) {
  const [sets] = await pipeline(env, [
    { sql: "SELECT key, value FROM settings WHERE key LIKE '%api_key' OR key LIKE '%model' OR key = 'ai_provider' OR key = 'cloudflare_account_id' OR key = 'cloudflare_api_token'" }
  ]);
  const s = {};
  for (const r of sets.rows) s[String(r.key)] = String(r.value ?? "");
  const provider = s.ai_provider || "gemini";
  try {
    if (provider === "nvidia") {
      if (!s.nvidia_api_key) return { error: "No NVIDIA NIM API key saved." };
      const res2 = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(15e3),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.nvidia_api_key}` },
        body: JSON.stringify({ model: s.nvidia_model, messages: [{ role: "user", content: "Reply with the single word: ok" }], max_tokens: 10 })
      });
      const d2 = await safeJson(res2);
      if (!res2.ok) return { error: d2?.error?.message ?? "NVIDIA NIM connection failed." };
      return { message: `Connected to ${s.nvidia_model} successfully.` };
    }
    if (provider === "groq") {
      if (!s.groq_api_key) return { error: "No Groq API key saved." };
      const res2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(15e3),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.groq_api_key}` },
        body: JSON.stringify({ model: s.groq_model, messages: [{ role: "user", content: "Reply with the single word: ok" }], max_tokens: 10 })
      });
      const d2 = await safeJson(res2);
      if (!res2.ok) return { error: d2?.error?.message ?? "Groq connection failed." };
      return { message: `Connected to ${s.groq_model} successfully.` };
    }
    if (provider === "cloudflare") {
      if (!s.cloudflare_account_id || !s.cloudflare_api_token) return { error: "No Cloudflare Account ID or API Token saved." };
      const res2 = await fetch(`https://api.cloudflare.com/client/v4/accounts/${s.cloudflare_account_id}/ai/run/${s.cloudflare_model}`, {
        method: "POST",
        signal: AbortSignal.timeout(15e3),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.cloudflare_api_token}` },
        body: JSON.stringify({ prompt: "Reply with the single word: ok" })
      });
      const d2 = await safeJson(res2);
      if (!res2.ok || !d2?.success) return { error: `Cloudflare Workers AI connection failed: ${d2?.errors?.[0]?.message || res2.statusText}` };
      return { message: `Connected to ${s.cloudflare_model} successfully.` };
    }
    if (provider === "mistral") {
      if (!s.mistral_api_key) return { error: "No Mistral API key saved." };
      const res2 = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: AbortSignal.timeout(15e3),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.mistral_api_key}` },
        body: JSON.stringify({ model: s.mistral_model, messages: [{ role: "user", content: "Reply with the single word: ok" }], max_tokens: 10 })
      });
      const d2 = await safeJson(res2);
      if (!res2.ok) return { error: d2?.error?.message ?? "Mistral connection failed." };
      return { message: `Connected to ${s.mistral_model} successfully.` };
    }
    if (!s.gemini_api_key) return { error: "No Gemini API key saved." };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${s.gemini_model}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(15e3),
      headers: { "Content-Type": "application/json", "x-goog-api-key": s.gemini_api_key },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word: ok" }] }] })
    });
    const d = await safeJson(res);
    if (!res.ok || d?.error) return { error: d?.error?.message ?? "Gemini connection failed." };
    return { message: `Connected to ${s.gemini_model} successfully.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Connection test failed." };
  }
}
__name(testProvider, "testProvider");
__name2(testProvider, "testProvider");
var CATS = ["photo", "illustration", "3d", "video", "sfx"];
var worker = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const method = req.method.toUpperCase();
    const respond = /* @__PURE__ */ __name2((r) => withCors(r, req, env), "respond");
    if (method === "OPTIONS") {
      return respond(new Response(null, { status: 204 }));
    }
    const need = /* @__PURE__ */ __name2((p) => {
      const v = env[p];
      if (!v) throw new Error(`Missing secret: ${p}`);
      return v;
    }, "need");
    try {
      if (path === "/login" && method === "POST") {
        const body = await req.json().catch(() => null);
        if (!body?.password || !timingSafeEqual(body.password, need("ADMIN_PASSWORD"))) {
          return respond(json({ error: "Incorrect password." }, 401));
        }
        const token = await makeSession(env);
        return respond(json({ ok: true }, 200, sessionCookie(req, env, token, 7 * 24 * 3600)));
      }
      if (path === "/logout" && method === "POST") {
        return respond(json({ ok: true }, 200, sessionCookie(req, env, "", 0)));
      }
      if (path === "/me") {
        return respond(json({ authed: await checkSession(req, env) }));
      }
      if (path === "/increment" && method === "POST") {
        const body = await req.json().catch(() => null);
        if (!body?.id) return respond(json({ error: "Missing id." }, 400));
        const rows = await q(env, "UPDATE images SET downloads = downloads + 1 WHERE id = ? RETURNING downloads", [body.id]);
        return respond(json({ downloads: rows.length ? Number(rows[0].downloads) : 0 }));
      }
      if (path === "/tools/image-to-prompt" && method === "POST") {
        const raw = await req.text();
        if (raw.length > 6e6) return respond(json({ error: "Image payload too large." }, 413));
        const body = JSON.parse(raw);
        if (!body?.image) return respond(json({ success: false, error: "Image data is required" }, 400));
        const res = await fetch("https://api.imagepromptguru.net/image-to-prompt", {
          method: "POST",
          signal: AbortSignal.timeout(25e3),
          headers: {
            "Content-Type": "application/json",
            Origin: "https://imagepromptguru.net",
            Referer: "https://imagepromptguru.net/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({ image: body.image, language: body.language ?? "en", model: body.model ?? "general" })
        });
        if (!res.ok) {
          const t = await res.text();
          return respond(json({ success: false, error: `API error: ${res.status} - ${t}` }, res.status));
        }
        return respond(json(await res.json()));
      }
      if (path === "/library" && method === "GET") {
        const images = await fetchLibrary(env);
        const res = json({ images });
        res.headers.set("Cache-Control", "no-store");
        return respond(res);
      }
      if (path === "/home" && method === "GET") {
        const [latest, perCategory] = await Promise.all([
          q(env, `SELECT ${IMAGE_COLS} FROM images ORDER BY created_at DESC LIMIT 48`),
          q(
            env,
            `SELECT * FROM (SELECT ${IMAGE_COLS}, ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) AS rn FROM images) WHERE rn <= 24 ORDER BY created_at DESC`
          )
        ]);
        const byCategory = {};
        for (const category of CATS) byCategory[category] = [];
        for (const row of perCategory) {
          const image = toImage(row);
          (byCategory[image.category] ??= []).push(image);
        }
        const res = json({ images: latest.map(toImage), byCategory });
        res.headers.set("Cache-Control", "no-store");
        return respond(res);
      }
      const publicImageMatch = path.match(/^\/images\/([^/]+)$/);
      if (publicImageMatch && method === "GET") {
        const rows = await q(env, `SELECT ${IMAGE_COLS} FROM images WHERE id = ? LIMIT 1`, [decodeURIComponent(publicImageMatch[1])]);
        if (!rows.length) return respond(json({ error: "Not found." }, 404));
        return respond(json(toImage(rows[0])));
      }
      if (!await checkSession(req, env)) {
        return respond(json({ error: "Unauthorized." }, 401));
      }
      if (path === "/dashboard" && method === "GET") {
        const [stats, byDay, byCat, topTags, topDl, trending] = await pipeline(env, [
          { sql: "SELECT COUNT(*) c, COALESCE(SUM(downloads),0) d, COALESCE(SUM(size_bytes),0) s, COALESCE(SUM(is_daily_pick),0) p FROM images" },
          { sql: "SELECT substr(created_at,1,10) d, COUNT(*) c FROM images WHERE created_at >= date('now','-30 days') GROUP BY d ORDER BY d" },
          { sql: "SELECT category c, COUNT(*) n FROM images GROUP BY category" },
          { sql: "SELECT jt.value t, COUNT(*) n FROM images, json_each(images.tags) jt GROUP BY jt.value ORDER BY n DESC LIMIT 10" },
          { sql: "SELECT title t, downloads v FROM images ORDER BY downloads DESC LIMIT 8" },
          { sql: "SELECT title t, trending v FROM images ORDER BY trending DESC LIMIT 8" }
        ]);
        const s0 = stats.rows[0] ?? {};
        const dayMap = /* @__PURE__ */ new Map();
        for (const r of byDay.rows) dayMap.set(String(r.d), Number(r.c));
        const days = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
          days.push({ date: d, count: dayMap.get(d) ?? 0 });
        }
        const label = { photo: "Photo", illustration: "Illustration", "3d": "3D", video: "Video" };
        return respond(
          json({
            stats: {
              images: Number(s0.c ?? 0),
              downloads: Number(s0.d ?? 0),
              storageBytes: Number(s0.s ?? 0),
              dailyPicks: Number(s0.p ?? 0)
            },
            uploadsByDay: days,
            byCategory: byCat.rows.map((r) => ({ name: label[String(r.c)] ?? String(r.c), value: Number(r.n) })),
            topTags: topTags.rows.map((r) => ({ name: String(r.t), value: Number(r.n) })),
            topDownloaded: topDl.rows.map((r) => ({ name: String(r.t), value: Number(r.v) })),
            bucketUsage: [],
            trending: trending.rows.map((r) => ({ title: String(r.t), value: Number(r.v) }))
          })
        );
      }
      if (path === "/images" && method === "GET") {
        const rows = await q(env, `SELECT ${IMAGE_COLS_SLIM} FROM images ORDER BY created_at DESC LIMIT 2000`);
        return respond(json(rows.map(toImage)));
      }
      const imageIdMatch = path.match(/^\/images\/([^/]+)$/);
      if (path === "/images" && method === "POST") {
        const b = await req.json();
        const title = (b.title ?? "").trim();
        const rurl = (b.url ?? "").trim();
        const category = (b.category ?? "photo").trim();
        if (!title) return respond(json({ error: "Title is required." }, 400));
        if (!/^https?:\/\//.test(rurl)) return respond(json({ error: "Invalid image URL." }, 400));
        if (!CATS.includes(category)) return respond(json({ error: "Invalid category." }, 400));
        let palette = [];
        try {
          palette = b.palette ? JSON.parse(b.palette).filter((c) => c && typeof c.hex === "string") : [];
        } catch {
          return respond(json({ error: "Invalid palette data." }, 400));
        }
        const tags = (b.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean);
        const thumb = (b.thumbnailUrl ?? "").trim();
        const id = crypto.randomUUID();
        await q(
          env,
          "INSERT INTO images (id,title,description,category,tags,prompt,palette,url,thumbnail_url,width,height,size_bytes,downloads,trending,is_daily_pick,created_at,blur_data_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),?)",
          [
            id,
            title,
            (b.description ?? "").trim(),
            category,
            JSON.stringify(tags),
            (b.prompt ?? "").trim(),
            JSON.stringify(palette),
            rurl,
            category === "sfx" ? thumb : thumb || rurl,
            Math.max(1, Number(b.width) || 1200),
            Math.max(1, Number(b.height) || 800),
            Math.max(0, Number(b.sizeBytes) || 0),
            0,
            0,
            0,
            (b.blurDataUrl ?? "").trim()
          ]
        );
        return respond(json({ ok: true, id }));
      }
      if (imageIdMatch && method === "PATCH") {
        const id = decodeURIComponent(imageIdMatch[1]);
        const b = await req.json();
        const existing = await q(env, `SELECT ${IMAGE_COLS} FROM images WHERE id = ? LIMIT 1`, [id]);
        if (!existing.length) return respond(json({ error: "Image not found." }, 404));
        const cur = toImage(existing[0]);
        const title = String(b.title ?? cur.title).trim();
        if (!title) return respond(json({ error: "Title is required." }, 400));
        const category = String(b.category ?? cur.category);
        if (!CATS.includes(category)) return respond(json({ error: "Invalid category." }, 400));
        const tags = Array.isArray(b.tags) ? b.tags.map(String) : cur.tags;
        const palette = Array.isArray(b.palette) ? b.palette.filter((c) => c && typeof c.hex === "string") : cur.palette;
        await q(
          env,
          "UPDATE images SET title=?,description=?,category=?,tags=?,palette=?,prompt=?,url=?,thumbnail_url=?,width=?,height=? WHERE id=?",
          [
            title,
            b.description == null ? cur.description : String(b.description),
            category,
            JSON.stringify(tags),
            JSON.stringify(palette),
            b.prompt == null ? cur.prompt : String(b.prompt),
            b.url == null ? cur.url : String(b.url),
            b.thumbnailUrl == null ? cur.thumbnailUrl : String(b.thumbnailUrl),
            b.width == null ? cur.width : Math.max(1, Number(b.width) || cur.width),
            b.height == null ? cur.height : Math.max(1, Number(b.height) || cur.height),
            id
          ]
        );
        return respond(json({ ok: true }));
      }
      if (imageIdMatch && method === "DELETE") {
        await q(env, "DELETE FROM images WHERE id = ?", [decodeURIComponent(imageIdMatch[1])]);
        return respond(json({ ok: true }));
      }
      if (path === "/settings/ai" && method === "GET") {
        const [sets] = await pipeline(env, [
          { sql: "SELECT key, value FROM settings WHERE key IN ('ai_provider','gemini_api_key','gemini_model','nvidia_api_key','nvidia_model','groq_api_key','groq_model','cloudflare_account_id','cloudflare_api_token','cloudflare_model','mistral_api_key','mistral_model')" }
        ]);
        const s = {
          provider: "gemini",
          geminiApiKey: "",
          geminiModel: "gemini-3.5-flash",
          nvidiaApiKey: "",
          nvidiaModel: "meta/llama-3.2-90b-vision-instruct",
          groqApiKey: "",
          groqModel: "qwen/qwen3.6-27b",
          cloudflareAccountId: "",
          cloudflareApiToken: "",
          cloudflareModel: "@cf/meta/llama-3.2-11b-vision-instruct",
          mistralApiKey: "",
          mistralModel: "ministral-14b-2512"
        };
        const map = {
          ai_provider: "provider",
          gemini_api_key: "geminiApiKey",
          gemini_model: "geminiModel",
          nvidia_api_key: "nvidiaApiKey",
          nvidia_model: "nvidiaModel",
          groq_api_key: "groqApiKey",
          groq_model: "groqModel",
          cloudflare_account_id: "cloudflareAccountId",
          cloudflare_api_token: "cloudflareApiToken",
          cloudflare_model: "cloudflareModel",
          mistral_api_key: "mistralApiKey",
          mistral_model: "mistralModel"
        };
        for (const r of sets.rows) {
          const rawKey = String(r.key);
          const k = map[rawKey];
          if (k && String(r.value ?? "")) s[k] = maskIfSecret(rawKey, String(r.value));
        }
        return respond(json(s));
      }
      if (path === "/settings/ai" && method === "PUT") {
        const b = await req.json();
        const pairs = [
          ["ai_provider", (b.provider ?? "gemini").trim()],
          ["cloudflare_account_id", (b.cloudflareAccountId ?? "").trim()]
        ];
        if (isSecretUpdate("gemini_api_key", b.geminiApiKey ?? "")) pairs.push(["gemini_api_key", b.geminiApiKey.trim()]);
        if (isSecretUpdate("nvidia_api_key", b.nvidiaApiKey ?? "")) pairs.push(["nvidia_api_key", b.nvidiaApiKey.trim()]);
        if (isSecretUpdate("groq_api_key", b.groqApiKey ?? "")) pairs.push(["groq_api_key", b.groqApiKey.trim()]);
        if (isSecretUpdate("cloudflare_api_token", b.cloudflareApiToken ?? "")) pairs.push(["cloudflare_api_token", b.cloudflareApiToken.trim()]);
        if (isSecretUpdate("mistral_api_key", b.mistralApiKey ?? "")) pairs.push(["mistral_api_key", b.mistralApiKey.trim()]);
        if ((b.geminiModel ?? "").trim()) pairs.push(["gemini_model", b.geminiModel.trim()]);
        if ((b.nvidiaModel ?? "").trim()) pairs.push(["nvidia_model", b.nvidiaModel.trim()]);
        if ((b.groqModel ?? "").trim()) pairs.push(["groq_model", b.groqModel.trim()]);
        if ((b.cloudflareModel ?? "").trim()) pairs.push(["cloudflare_model", b.cloudflareModel.trim()]);
        if ((b.mistralModel ?? "").trim()) pairs.push(["mistral_model", b.mistralModel.trim()]);
        await pipeline(env, pairs.map(([k, v]) => ({
          sql: "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
          args: [k, v]
        })));
        return respond(json({ ok: true }));
      }
      if (path === "/settings/ai/test" && method === "POST") {
        return respond(json(await testProvider(env)));
      }
      if (path === "/settings/storage" && method === "GET") {
        const [sets] = await pipeline(env, [
          { sql: "SELECT key, value FROM settings WHERE key IN ('storage_provider','filegarden_user_id','filegarden_auth_cookie','filegarden_public_id','imgcdn_api_key')" }
        ]);
        const s = { storageProvider: "filegarden", fgUserId: "", fgAuthCookie: "", fgPublicId: "", imgCdnApiKey: "" };
        const map = {
          storage_provider: "storageProvider",
          filegarden_user_id: "fgUserId",
          filegarden_auth_cookie: "fgAuthCookie",
          filegarden_public_id: "fgPublicId",
          imgcdn_api_key: "imgCdnApiKey"
        };
        for (const r of sets.rows) {
          const rawKey = String(r.key);
          const k = map[rawKey];
          if (k) s[k] = maskIfSecret(rawKey, String(r.value ?? ""));
        }
        return respond(json(s));
      }
      if (path === "/settings/storage/provider" && method === "PUT") {
        const b = await req.json();
        await setSetting(env, "storage_provider", (b.provider ?? "filegarden").trim());
        return respond(json({ ok: true }));
      }
      if (path === "/settings/storage/filegarden" && method === "PUT") {
        const b = await req.json();
        if (!(b.userId ?? "").trim()) return respond(json({ error: "Storage User ID is required." }, 400));
        const stmts = [
          { sql: "INSERT INTO settings (key, value, updated_at) VALUES ('filegarden_user_id', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", args: [(b.userId ?? "").trim().toLowerCase()] },
          { sql: "INSERT INTO settings (key, value, updated_at) VALUES ('filegarden_public_id', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", args: [(b.publicId ?? "").trim()] }
        ];
        if (isSecretUpdate("filegarden_auth_cookie", b.authCookie ?? "")) {
          stmts.push({ sql: "INSERT INTO settings (key, value, updated_at) VALUES ('filegarden_auth_cookie', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", args: [(b.authCookie ?? "").trim()] });
        }
        await pipeline(env, stmts);
        return respond(json({ ok: true }));
      }
      if (path === "/settings/storage/imgcdn" && method === "PUT") {
        const b = await req.json();
        const incoming = (b.apiKey ?? "").trim();
        if (!incoming) return respond(json({ error: "ImgCDN API key is required." }, 400));
        if (incoming !== MASK) await setSetting(env, "imgcdn_api_key", incoming);
        return respond(json({ ok: true }));
      }
      if (path === "/upload" && method === "POST") {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return respond(json({ error: "No file provided." }, 400));
        if (file.size > 25 * 1024 * 1024) return respond(json({ error: "File too large (max 25MB)." }, 413));
        const provider = await getSetting(env, "storage_provider") || "filegarden";
        const buf = new Uint8Array(await file.arrayBuffer());
        if (provider === "imgcdn") {
          const apiKey = await getSetting(env, "imgcdn_api_key");
          if (!apiKey) return respond(json({ error: "ImgCDN API key is not configured in settings." }, 400));
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const merged = new Uint8Array(buf.length + salt.length);
          merged.set(buf, 0);
          merged.set(salt, buf.length);
          const ext2 = file.name.includes(".") ? file.name.split(".").pop() : "";
          const randomFilename2 = ext2 ? `${crypto.randomUUID()}.${ext2}` : crypto.randomUUID();
          const up = new FormData();
          up.append("key", apiKey);
          up.append("action", "upload");
          up.append("source", new File([merged], randomFilename2, { type: file.type || "image/jpeg" }));
          const res2 = await fetch("https://imgcdn.dev/api/1/upload", { method: "POST", body: up, signal: AbortSignal.timeout(6e4) });
          const data2 = await safeJson(res2);
          if (!res2.ok) {
            const code = data2?.error?.code ?? data2?.status_code;
            const existing = data2?.image?.url || data2?.image?.display_url;
            if (code === 101 && existing) return respond(json({ url: existing }));
            return respond(json({ error: `ImgCDN upload failed (${res2.status}): ${data2?.error?.message || data2?.message || res2.statusText}` }, res2.status));
          }
          const imageUrl = data2?.image?.url || data2?.image?.display_url;
          if (!imageUrl) return respond(json({ error: "Invalid response from ImgCDN (missing image URL)." }, 500));
          return respond(json({ url: imageUrl }));
        }
        const userId = await getSetting(env, "filegarden_user_id") || "";
        let authCookie = await getSetting(env, "filegarden_auth_cookie") || "";
        const publicId = await getSetting(env, "filegarden_public_id") || userId;
        if (!userId || !authCookie) {
          return respond(json({ error: "File Garden User ID or Auth Cookie is not configured in settings." }, 400));
        }
        authCookie = authCookie.trim();
        if (!authCookie.includes("auth=")) authCookie = `auth=${authCookie}`;
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
        const randomFilename = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();
        const res = await fetch(`https://api.filegarden.com/users/${userId.trim().toLowerCase()}/pipe`, {
          method: "POST",
          signal: AbortSignal.timeout(6e4),
          headers: {
            Cookie: authCookie,
            "Content-Type": "application/octet-stream",
            "X-Data": JSON.stringify({ parent: null, name: randomFilename })
          },
          body: buf
        });
        if (!res.ok) {
          const t = await res.text();
          return respond(json({ error: `File Garden upload failed (${res.status}): ${t || res.statusText}` }, res.status));
        }
        const data = await res.json();
        const p = data?.path || data?.items?.[0]?.path;
        if (!p) return respond(json({ error: "Invalid response from File Garden (missing path)." }, 500));
        return respond(json({ url: `https://file.garden/${publicId.trim()}/${p}` }));
      }
      if (path === "/ai/generate" && method === "POST") {
        const b = await req.json();
        if (!b.url) return respond(json({ error: "Missing url." }, 400));
        let bytes;
        try {
          const res = await fetch(b.url, { signal: AbortSignal.timeout(3e4) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ab = await res.arrayBuffer();
          const ext = b.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
          const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac", flac: "audio/flac", opus: "audio/opus", weba: "audio/webm" };
          const mimeType = mime[ext] ?? "image/jpeg";
          const maxBytes = mimeType.startsWith("audio/") ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
          if (ab.byteLength > maxBytes) return respond(json({ error: "Remote file too large." }, 413));
          bytes = new Uint8Array(ab);
          const result = await analyzeImage(env, bytes, mimeType, b.model, b.hint);
          if (!result.ok) return respond(json({ error: result.error }, 500));
          return respond(json(result.data));
        } catch (err) {
          return respond(json({ error: `Could not read asset URL: ${err instanceof Error ? err.message : "fetch failed"}` }, 400));
        }
      }
      if (path === "/ai/generate-file" && method === "POST") {
        const b = await req.json();
        if (!b.base64) return respond(json({ error: "Missing base64." }, 400));
        try {
          const bytes = b64ToBytes(b.base64);
          const mimeType = b.mimeType || "image/jpeg";
          const maxBytes = mimeType.startsWith("audio/") ? 10 * 1024 * 1024 : 15 * 1024 * 1024;
          if (bytes.length > maxBytes) return respond(json({ error: "File too large for AI analysis." }, 413));
          const result = await analyzeImage(env, bytes, mimeType, b.model, b.hint);
          if (!result.ok) return respond(json({ error: result.error }, 500));
          return respond(json(result.data));
        } catch (err) {
          return respond(json({ error: err instanceof Error ? err.message : "Metadata generation failed." }, 500));
        }
      }
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
              createdAt: String(r.created_at ?? "")
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
  }
};
var src_default = worker;
async function fetchImageById(env, id) {
  const rows = await q(env, `SELECT ${IMAGE_COLS} FROM images WHERE id = ? LIMIT 1`, [id]);
  return rows.length ? toImage(rows[0]) : null;
}
__name(fetchImageById, "fetchImageById");
__name2(fetchImageById, "fetchImageById");
async function fetchLibrary(env) {
  const rows = await q(
    env,
    "SELECT id,title,description,category,tags,thumbnail_url,url,width,height,downloads,trending,is_daily_pick,created_at FROM images ORDER BY created_at DESC LIMIT 5000"
  );
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    description: r.description == null ? null : String(r.description),
    category: String(r.category ?? "photo"),
    tags: parseJsonArray(r.tags),
    thumbnailUrl: String(r.thumbnail_url ?? r.url ?? ""),
    url: String(r.url ?? ""),
    width: r.width == null ? null : Number(r.width),
    height: r.height == null ? null : Number(r.height),
    downloads: Number(r.downloads ?? 0),
    trending: Number(r.trending ?? 0),
    isDailyPick: r.is_daily_pick === 1 || r.is_daily_pick === true,
    createdAt: String(r.created_at ?? "")
  }));
}
__name(fetchLibrary, "fetchLibrary");
__name2(fetchLibrary, "fetchLibrary");
async function onRequest(ctx) {
  const env = {
    ...ctx.env,
    TURSO_URL: ctx.env.TURSO_URL ?? ctx.env.DATABASE_URL ?? "",
    TURSO_TOKEN: ctx.env.TURSO_TOKEN ?? ctx.env.TURSO_AUTH_TOKEN ?? ""
  };
  const url = new URL(ctx.request.url);
  url.pathname = url.pathname.replace(/^\/api(?=\/|$)/, "");
  const req = ctx.request.method === "GET" || ctx.request.method === "HEAD" ? new Request(url.toString(), ctx.request) : new Request(url.toString(), {
    method: ctx.request.method,
    headers: ctx.request.headers,
    redirect: ctx.request.redirect,
    body: ctx.request.body,
    duplex: "half"
  });
  return src_default.fetch(req, env);
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeHtml, "escapeHtml");
__name2(escapeHtml, "escapeHtml");
function withEnv(env) {
  return {
    ...env,
    TURSO_URL: env.TURSO_URL ?? env.DATABASE_URL ?? "",
    TURSO_TOKEN: env.TURSO_TOKEN ?? env.TURSO_AUTH_TOKEN ?? ""
  };
}
__name(withEnv, "withEnv");
__name2(withEnv, "withEnv");
async function handleAssetPage(ctx) {
  const url = new URL(ctx.request.url);
  const id = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  const assets = ctx.env.ASSETS;
  if (assets) {
    const staticUrl = new URL(url.pathname + url.search, url.origin);
    const staticRes = await assets.fetch(new Request(staticUrl.toString(), ctx.request));
    if (staticRes.status === 200) return staticRes;
  }
  const image = await fetchImageById(withEnv(ctx.env), id);
  const html = await fetchShell(url.origin, ctx.request, assets);
  if (!image) {
    return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  const title = escapeHtml(image.title);
  const description = escapeHtml(image.description || `Browse and download "${image.title}" on Luminaq.`);
  const shareImg = escapeHtml(image.thumbnailUrl || image.url);
  const isAudio = image.category === "sfx";
  const page = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title} \xB7 Luminaq</title>`).replace(
    "</head>",
    `<meta name="description" content="${description}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
${isAudio ? "" : `<meta property="og:image" content="${shareImg}" />`}
<meta property="og:type" content="website" />
<script>window.__LIVE_ASSET__=${JSON.stringify(image).replace(/</g, "\\u003c")};<\/script>
</head>`
  );
  return new Response(page, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}
__name(handleAssetPage, "handleAssetPage");
__name2(handleAssetPage, "handleAssetPage");
async function fetchShell(origin, request, assets) {
  if (assets) {
    for (const path of ["/404", "/404.html"]) {
      const res = await assets.fetch(new Request(new URL(path, origin).toString(), request));
      if (res.status !== 200) continue;
      const html = await res.text();
      if (html.includes("</head>")) return html;
    }
  }
  return '<!doctype html><html><head><meta charset="utf-8"><title>Luminaq</title></head><body></body></html>';
}
__name(fetchShell, "fetchShell");
__name2(fetchShell, "fetchShell");
async function onRequest2(ctx) {
  return handleAssetPage(ctx);
}
__name(onRequest2, "onRequest2");
__name2(onRequest2, "onRequest");
async function onRequest3(ctx) {
  return handleAssetPage(ctx);
}
__name(onRequest3, "onRequest3");
__name2(onRequest3, "onRequest");
async function onRequest4(ctx) {
  return handleAssetPage(ctx);
}
__name(onRequest4, "onRequest4");
__name2(onRequest4, "onRequest");
var routes = [
  {
    routePath: "/api/:route*",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/image/:id*",
    mountPath: "/image",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/sfx/:id*",
    mountPath: "/sfx",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/video/:id*",
    mountPath: "/video",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker2) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker2;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker2.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker2.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker2,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker2.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker2.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-ybBcwL/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-ybBcwL/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker2) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker2;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker2.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker2.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker2,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker2.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker2.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.47286120096615036.js.map
