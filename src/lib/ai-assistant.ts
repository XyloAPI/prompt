import { getSetting } from "@/db/queries";

export const AI_PROVIDER_SETTING = "ai_provider";
export const GEMINI_API_KEY_SETTING = "gemini_api_key";
export const GEMINI_MODEL_SETTING = "gemini_model";
export const NVIDIA_API_KEY_SETTING = "nvidia_api_key";
export const NVIDIA_MODEL_SETTING = "nvidia_model";
export const GROQ_API_KEY_SETTING = "groq_api_key";
export const GROQ_MODEL_SETTING = "groq_model";
export const CLOUDFLARE_ACCOUNT_ID_SETTING = "cloudflare_account_id";
export const CLOUDFLARE_API_TOKEN_SETTING = "cloudflare_api_token";
export const CLOUDFLARE_MODEL_SETTING = "cloudflare_model";
export const MISTRAL_API_KEY_SETTING = "mistral_api_key";
export const MISTRAL_MODEL_SETTING = "mistral_model";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";
export const DEFAULT_GROQ_MODEL = "qwen/qwen3.6-27b";
export const DEFAULT_CLOUDFLARE_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
export const DEFAULT_MISTRAL_MODEL = "pixtral-12b-2409";

export type AiProvider = "gemini" | "nvidia" | "groq" | "cloudflare" | "mistral";

export const GEMINI_VISION_MODELS = [
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash (Recommended)" },
  { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export const NVIDIA_VISION_MODELS = [
  { value: "meta/llama-3.2-90b-vision-instruct", label: "Llama 3.2 90B Vision Instruct" },
  { value: "meta/llama-3.2-11b-vision-instruct", label: "Llama 3.2 11B Vision Instruct" },
  { value: "mistralai/pixtral-large-instruct-2411", label: "Pixtral Large Instruct" },
  { value: "mistralai/pixtral-12b", label: "Pixtral 12B" },
  { value: "nvidia/nvlm-d-72b", label: "NVLM-D 72B" },
  { value: "qwen/qwen2-vl-72b-instruct", label: "Qwen2 VL 72B Instruct" },
  { value: "qwen/qwen2-vl-7b-instruct", label: "Qwen2 VL 7B Instruct" },
  { value: "microsoft/phi-3.5-vision-instruct", label: "Phi-3.5 Vision Instruct" },
  { value: "microsoft/phi-3-vision-128k-instruct", label: "Phi-3 Vision 128k Instruct" },
  { value: "google/paligemma", label: "PaliGemma" },
  { value: "google/paligemma-3b-pt-448", label: "PaliGemma 3B 448" },
  { value: "nvidia/neva-22b", label: "NeVA 22B" },
];

export const GROQ_VISION_MODELS = [
  { value: "qwen/qwen3.6-27b", label: "Qwen 3.6 27B" },
];

export const CLOUDFLARE_VISION_MODELS = [
  { value: "@cf/meta/llama-3.2-11b-vision-instruct", label: "Llama 3.2 11B Vision (Recommended)" },
  { value: "@cf/llava-hf/llava-1.5-7b-hf", label: "LLaVA 1.5 (7B)" },
  { value: "@cf/moondream/moondream3.1-9b-a2b", label: "Moondream 3.1 (9B)" },
];

export const MISTRAL_VISION_MODELS = [
  { value: "pixtral-12b-2409", label: "Pixtral 12B" },
  { value: "mistral-large-latest", label: "Mistral Large (Multimodal)" },
  { value: "mistral-medium-latest", label: "Mistral Medium (Multimodal)" },
  { value: "ministral-3b-latest", label: "Ministral 3B (Multimodal)" },
  { value: "ministral-8b-latest", label: "Ministral 8B (Multimodal)" },
  { value: "ministral-14b-latest", label: "Ministral 14B (Multimodal)" },
];

export const ALL_VISION_MODELS = [
  ...GEMINI_VISION_MODELS,
  ...NVIDIA_VISION_MODELS,
  ...GROQ_VISION_MODELS,
  ...CLOUDFLARE_VISION_MODELS,
  ...MISTRAL_VISION_MODELS,
];

export type AiMetadata = {
  title: string;
  description: string;
  tags: string[];
  palette: { hex: string; name?: string }[];
  prompt: string;
};

export type AnalyzeResult =
  | { ok: true; data: AiMetadata }
  | { ok: false; error: string };

export async function getAiSettings(): Promise<{
  provider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  nvidiaApiKey: string;
  nvidiaModel: string;
  groqApiKey: string;
  groqModel: string;
  cloudflareAccountId: string;
  cloudflareApiToken: string;
  cloudflareModel: string;
  mistralApiKey: string;
  mistralModel: string;
}> {
  const provider = ((await getSetting(AI_PROVIDER_SETTING)) as AiProvider) || "gemini";
  const geminiApiKey = (await getSetting(GEMINI_API_KEY_SETTING)) ?? "";
  const geminiModel = (await getSetting(GEMINI_MODEL_SETTING)) ?? DEFAULT_GEMINI_MODEL;
  const nvidiaApiKey = (await getSetting(NVIDIA_API_KEY_SETTING)) ?? "";
  const nvidiaModel = (await getSetting(NVIDIA_MODEL_SETTING)) ?? DEFAULT_NVIDIA_MODEL;
  const groqApiKey = (await getSetting(GROQ_API_KEY_SETTING)) ?? "";
  const groqModel = (await getSetting(GROQ_MODEL_SETTING)) ?? DEFAULT_GROQ_MODEL;
  const cloudflareAccountId = (await getSetting(CLOUDFLARE_ACCOUNT_ID_SETTING)) ?? "";
  const cloudflareApiToken = (await getSetting(CLOUDFLARE_API_TOKEN_SETTING)) ?? "";
  const cloudflareModel = (await getSetting(CLOUDFLARE_MODEL_SETTING)) ?? DEFAULT_CLOUDFLARE_MODEL;
  const mistralApiKey = (await getSetting(MISTRAL_API_KEY_SETTING)) ?? "";
  const mistralModel = (await getSetting(MISTRAL_MODEL_SETTING)) ?? DEFAULT_MISTRAL_MODEL;
  return {
    provider,
    geminiApiKey,
    geminiModel,
    nvidiaApiKey,
    nvidiaModel,
    groqApiKey,
    groqModel,
    cloudflareAccountId,
    cloudflareApiToken,
    cloudflareModel,
    mistralApiKey,
    mistralModel,
  };
}

export function robustParseJson(text: string): Partial<AiMetadata> | null {
  if (!text) return null;
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/```/g, "")
    .trim();

  // 1. Direct parse
  try {
    return JSON.parse(cleaned) as AiMetadata;
  } catch { }

  // 2. Substring between { ... }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as AiMetadata;
    } catch { }

    try {
      const sanitized = cleaned
        .slice(start, end + 1)
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(sanitized) as AiMetadata;
    } catch { }
  }

  // 3. Fallback regex field extraction
  const result: Partial<AiMetadata> = {};

  const titleMatch = cleaned.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  if (titleMatch) result.title = titleMatch[1].replace(/\\"/g, '"');

  const descMatch = cleaned.match(/"description"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  if (descMatch) result.description = descMatch[1].replace(/\\"/g, '"');

  const promptMatch = cleaned.match(/"prompt"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  if (promptMatch) result.prompt = promptMatch[1].replace(/\\"/g, '"');

  const tagsMatch = cleaned.match(/"tags"\s*:\s*\[([\s\S]*?)\]/);
  if (tagsMatch) {
    const rawTags = tagsMatch[1].match(/"([^"]+)"/g);
    if (rawTags) {
      result.tags = rawTags.map((t) => t.replace(/"/g, "").trim()).filter(Boolean);
    }
  }

  const paletteMatch = cleaned.match(/"palette"\s*:\s*\[([\s\S]*?)\]/);
  if (paletteMatch) {
    try {
      result.palette = JSON.parse(`[${paletteMatch[1]}]`);
    } catch {
      const hexMatches = Array.from(paletteMatch[1].matchAll(/"hex"\s*:\s*"([^"]+)"/g));
      if (hexMatches.length > 0) {
        result.palette = hexMatches.map((m) => ({ hex: m[1] }));
      }
    }
  }

  if (result.title || result.description || result.tags || result.prompt) {
    return result;
  }

  return null;
}

export async function analyzeImageBuffer(
  bytes: Buffer,
  mimeType: string,
  modelOverride?: string,
  hint?: string
): Promise<AnalyzeResult> {
  const settings = await getAiSettings();
  let provider = settings.provider;

  if (modelOverride) {
    if (
      GROQ_VISION_MODELS.some((m) => m.value === modelOverride)
    ) {
      provider = "groq";
    } else if (
      modelOverride.includes("/") ||
      NVIDIA_VISION_MODELS.some((m) => m.value === modelOverride)
    ) {
      // Check if it's cloudflare since CF models also contain slashes like @cf/meta/llama-3.2-11b-vision-instruct
      if (
        modelOverride.startsWith("@cf/") ||
        CLOUDFLARE_VISION_MODELS.some((m) => m.value === modelOverride)
      ) {
        provider = "cloudflare";
      } else {
        provider = "nvidia";
      }
    } else if (
      modelOverride.startsWith("pixtral-") ||
      modelOverride.startsWith("mistral-") ||
      modelOverride.startsWith("ministral-") ||
      MISTRAL_VISION_MODELS.some((m) => m.value === modelOverride)
    ) {
      provider = "mistral";
    } else if (
      modelOverride.startsWith("gemini-") ||
      GEMINI_VISION_MODELS.some((m) => m.value === modelOverride)
    ) {
      provider = "gemini";
    }
  }

  if (provider === "nvidia") {
    return analyzeWithNvidiaNim(
      bytes,
      mimeType,
      modelOverride || settings.nvidiaModel,
      settings.nvidiaApiKey,
      hint
    );
  } else if (provider === "groq") {
    return analyzeWithGroq(
      bytes,
      mimeType,
      modelOverride || settings.groqModel,
      settings.groqApiKey,
      hint
    );
  } else if (provider === "cloudflare") {
    return analyzeWithCloudflare(
      bytes,
      mimeType,
      modelOverride || settings.cloudflareModel,
      settings.cloudflareAccountId,
      settings.cloudflareApiToken,
      hint
    );
  } else if (provider === "mistral") {
    return analyzeWithMistral(
      bytes,
      mimeType,
      modelOverride || settings.mistralModel,
      settings.mistralApiKey,
      hint
    );
  } else {
    return analyzeWithGemini(
      bytes,
      mimeType,
      modelOverride || settings.geminiModel,
      settings.geminiApiKey,
      hint
    );
  }
}

function sanitizeHintForGemini(hint?: string): string | undefined {
  if (!hint) return undefined;
  const sensitivePatterns = [
    /trap/gi, /captiv/gi, /prison/gi, /kidnap/gi, /hostag/gi, /abus/gi, /harm/gi, /hurt/gi,
    /kill/gi, /dying/gi, /dead/gi, /death/gi, /suicid/gi, /murder/gi, /blood/gi, /gore/gi,
    /nude/gi, /naked/gi, /sex/gi, /erotic/gi, /porn/gi, /weapon/gi,
    /gun/gi, /pistol/gi, /rifle/gi, /bomb/gi, /shoot/gi, /attack/gi, /assault/gi, /violenc/gi,
    /violent/gi, /drug/gi, /confin/gi, /slash/gi, /stab/gi, /choke/gi, /hang/gi
  ];
  let cleaned = hint;
  for (const pattern of sensitivePatterns) {
    cleaned = cleaned.replace(pattern, "theme");
  }
  return cleaned;
}

async function analyzeWithGemini(
  bytes: Buffer,
  mimeType: string,
  model: string,
  apiKey: string,
  hint?: string
): Promise<AnalyzeResult> {
  if (!apiKey) {
    return {
      ok: false,
      error: "Gemini API key not configured.",
    };
  }

  const sanitizedHint = sanitizeHintForGemini(hint);
  const isVideo = mimeType.startsWith("video/");
  const prompt = [
    `You are an expert ${isVideo ? "cinematography & motion design" : "design & photography"} curator. Analyze this visual asset carefully and generate structured metadata for a modern media asset library.`,
    sanitizedHint ? `Reference filename / context: "${sanitizedHint}"` : "",
    "Return valid JSON with exactly:",
    '- "title": A short, descriptive, elegant, punchy title (max 5-6 words, no quotes)',
    '- "description": A concise, engaging 1-2 sentence description accurately detailing the subject, lighting, and aesthetic',
    '- "tags": An array of 5-8 relevant lowercase keywords (no hashtags)',
    '- "palette": An array of 4-6 prominent colors with "hex" (e.g. #2D3748) and "name" (color name)',
    '- "prompt": A high-detail AI generation prompt that accurately recreates this exact visual subject, lighting, lens/camera, mood, and art style',
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(20000),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: bytes.toString("base64") } },
              ],
            },
          ],
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            topP: 0.95,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
                tags: {
                  type: "ARRAY",
                  items: { type: "STRING" },
                },
                palette: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      hex: { type: "STRING" },
                      name: { type: "STRING" },
                    },
                    required: ["hex"],
                  },
                },
                prompt: { type: "STRING" },
              },
              required: ["title", "description", "tags", "palette", "prompt"],
            },
          },
        }),
      }
    );

    if (!res.ok) {
      let message = `Gemini request failed (${res.status}).`;
      try {
        const body = await res.json();
        message = body?.error?.message ?? message;
      } catch { }
      return { ok: false, error: message };
    }

    const body = await res.json();

    // Check prompt feedback block
    if (body?.promptFeedback?.blockReason) {
      return {
        ok: false,
        error: `Gemini request blocked by safety filter: ${body.promptFeedback.blockReason}`,
      };
    }

    const candidate = body?.candidates?.[0];
    if (!candidate) {
      return {
        ok: false,
        error: "Gemini returned no candidates. The request might have been blocked or filtered.",
      };
    }

    const finishReason = candidate.finishReason;
    if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
      return {
        ok: false,
        error: `Gemini generation was cut off or blocked (Reason: ${finishReason}).`,
      };
    }

    const text = candidate?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!text) {
      return { ok: false, error: "Gemini returned candidates but no text content was found." };
    }

    const parsed = robustParseJson(text);
    if (!parsed) {
      const snippet = text.length > 300 ? `${text.slice(0, 300)}…` : text;
      return {
        ok: false,
        error: `Could not parse Gemini metadata. Raw response: ${snippet}`,
      };
    }

    return {
      ok: true,
      data: {
        title: String(parsed.title ?? "").trim(),
        description: String(parsed.description ?? "").trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
        palette: Array.isArray(parsed.palette)
          ? parsed.palette
            .filter((c) => c && typeof c.hex === "string")
            .slice(0, 6)
          : [],
        prompt: String(parsed.prompt ?? "").trim(),
      },
    };
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return { ok: false, error: "Gemini request timed out (20s). Please try again or switch model." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Gemini request error." };
  }
}

async function analyzeWithNvidiaNim(
  bytes: Buffer,
  mimeType: string,
  model: string,
  apiKey: string,
  hint?: string
): Promise<AnalyzeResult> {
  if (!apiKey) {
    return {
      ok: false,
      error: "NVIDIA NIM API key not configured. Add it in Admin → Settings.",
    };
  }

  const base64Url = `data:${mimeType};base64,${bytes.toString("base64")}`;

  const prompt = [
    "You are an expert visual asset curator. Analyze this visual asset and generate structured metadata for a modern visual asset library.",
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
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: base64Url,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      let message = `NVIDIA NIM request failed (${res.status}).`;
      try {
        const body = await res.json();
        message = body?.error?.message ?? body?.message ?? message;
      } catch { }
      return { ok: false, error: message };
    }

    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, error: "NVIDIA NIM returned empty response." };

    const parsed = robustParseJson(content);
    if (!parsed) {
      const snippet = content.length > 300 ? `${content.slice(0, 300)}…` : content;
      return {
        ok: false,
        error: `Could not parse NVIDIA NIM metadata. Raw response: ${snippet}`,
      };
    }

    return {
      ok: true,
      data: {
        title: String(parsed.title ?? "").trim(),
        description: String(parsed.description ?? "").trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
        palette: Array.isArray(parsed.palette)
          ? parsed.palette
            .filter((c) => c && typeof c.hex === "string")
            .slice(0, 6)
          : [],
        prompt: String(parsed.prompt ?? "").trim(),
      },
    };
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return { ok: false, error: "NVIDIA NIM request timed out (20s). Please try again or switch model." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "NVIDIA NIM request error." };
  }
}

async function analyzeWithGroq(
  bytes: Buffer,
  mimeType: string,
  model: string,
  apiKey: string,
  hint?: string
): Promise<AnalyzeResult> {
  if (!apiKey) {
    return {
      ok: false,
      error: "Groq API key not configured. Add it in Admin → Settings.",
    };
  }

  const base64Url = `data:${mimeType};base64,${bytes.toString("base64")}`;

  const prompt = [
    "You are an expert visual asset curator. Analyze this visual asset and generate structured metadata for a modern visual asset library.",
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
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: base64Url,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
        reasoning_format: "hidden",
      }),
    });

    if (!res.ok) {
      let message = `Groq request failed (${res.status}).`;
      try {
        const body = await res.json();
        message = body?.error?.message ?? body?.message ?? message;
      } catch { }
      return { ok: false, error: message };
    }

    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, error: "Groq returned empty response." };

    const parsed = robustParseJson(content);
    if (!parsed) {
      const snippet = content.length > 300 ? `${content.slice(0, 300)}…` : content;
      return {
        ok: false,
        error: `Could not parse Groq metadata. Raw response: ${snippet}`,
      };
    }

    return {
      ok: true,
      data: {
        title: String(parsed.title ?? "").trim(),
        description: String(parsed.description ?? "").trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
        palette: Array.isArray(parsed.palette)
          ? parsed.palette
            .filter((c) => c && typeof c.hex === "string")
            .slice(0, 6)
          : [],
        prompt: String(parsed.prompt ?? "").trim(),
      },
    };
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return { ok: false, error: "Groq request timed out (20s). Please try again or switch model." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Groq request error." };
  }
}

async function analyzeWithCloudflare(
  bytes: Buffer,
  mimeType: string,
  model: string,
  accountId: string,
  apiToken: string,
  hint?: string
): Promise<AnalyzeResult> {
  if (!accountId || !apiToken) {
    return {
      ok: false,
      error: "Cloudflare Account ID or API Token not configured. Add it in Admin → Settings.",
    };
  }

  const prompt = [
    "You are an expert visual asset curator. Analyze this visual asset and generate structured metadata for a modern visual asset library.",
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
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        prompt,
        image: [bytes.toString("base64")],
        max_tokens: 1024,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const errorMsg = data?.errors?.[0]?.message || res.statusText || "Request failed.";
      return { ok: false, error: `Cloudflare Workers AI request failed: ${errorMsg}` };
    }

    const content = data?.result?.response ?? "";
    if (!content) return { ok: false, error: "Cloudflare Workers AI returned empty response." };

    const parsed = robustParseJson(content);
    if (!parsed) {
      const snippet = content.length > 300 ? `${content.slice(0, 300)}…` : content;
      return {
        ok: false,
        error: `Could not parse Cloudflare Workers AI metadata. Raw response: ${snippet}`,
      };
    }

    return {
      ok: true,
      data: {
        title: String(parsed.title ?? "").trim(),
        description: String(parsed.description ?? "").trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
        palette: Array.isArray(parsed.palette)
          ? parsed.palette
            .filter((c) => c && typeof c.hex === "string")
            .slice(0, 6)
          : [],
        prompt: String(parsed.prompt ?? "").trim(),
      },
    };
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return { ok: false, error: "Cloudflare Workers AI request timed out (25s). Please try again." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Cloudflare Workers AI request error." };
  }
}

async function analyzeWithMistral(
  bytes: Buffer,
  mimeType: string,
  model: string,
  apiKey: string,
  hint?: string
): Promise<AnalyzeResult> {
  if (!apiKey) {
    return {
      ok: false,
      error: "Mistral API key not configured. Add it in Admin → Settings.",
    };
  }

  const prompt = [
    "You are an expert visual asset curator. Analyze this visual asset and generate structured metadata for a modern visual asset library.",
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
  ].filter(Boolean).join("\n");

  try {
    const base64Image = `data:${mimeType};base64,${bytes.toString("base64")}`;
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: base64Image } },
            ],
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      let message = `Mistral request failed (${res.status}).`;
      try {
        const body = await res.json();
        message = body?.error?.message ?? body?.message ?? message;
      } catch {}
      return { ok: false, error: message };
    }

    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content ?? "";
    if (!content) return { ok: false, error: "Mistral AI returned empty response." };

    const parsed = robustParseJson(content);
    if (!parsed) {
      const snippet = content.length > 300 ? `${content.slice(0, 300)}…` : content;
      return {
        ok: false,
        error: `Could not parse Mistral AI metadata. Raw response: ${snippet}`,
      };
    }

    return {
      ok: true,
      data: {
        title: String(parsed.title ?? "").trim(),
        description: String(parsed.description ?? "").trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
        palette: Array.isArray(parsed.palette)
          ? parsed.palette
              .filter((c) => c && typeof c.hex === "string")
              .slice(0, 6)
          : [],
        prompt: String(parsed.prompt ?? "").trim(),
      },
    };
  } catch (err: any) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return { ok: false, error: "Mistral AI request timed out (25s). Please try again." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Mistral AI request error." };
  }
}
