import { getSetting } from "@/db/queries";

export const GEMINI_API_KEY_SETTING = "gemini_api_key";
export const GEMINI_MODEL_SETTING = "gemini_model";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export type GeminiMetadata = {
  title: string;
  description: string;
  tags: string[];
  palette: { hex: string; name?: string }[];
  prompt: string;
};

async function getGeminiSettings(): Promise<{ apiKey: string; model: string }> {
  const apiKey = (await getSetting(GEMINI_API_KEY_SETTING)) ?? "";
  const model = (await getSetting(GEMINI_MODEL_SETTING)) ?? DEFAULT_GEMINI_MODEL;
  return { apiKey, model };
}

function robustParseJson(text: string): Partial<GeminiMetadata> | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/```/g, "")
    .trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned) as GeminiMetadata;
  } catch {}

  // 2. Bound substring { ... }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as GeminiMetadata;
    } catch {}

    // 3. Clean common issues (trailing commas, quotes)
    try {
      const sanitized = cleaned
        .slice(start, end + 1)
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(sanitized) as GeminiMetadata;
    } catch {}
  }

  // 4. Fallback: Robust regex extraction of each individual field
  const result: Partial<GeminiMetadata> = {};

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

export type AnalyzeResult =
  | { ok: true; data: GeminiMetadata }
  | { ok: false; error: string };

export async function analyzeImageBuffer(
  bytes: Buffer,
  mimeType: string,
  modelOverride?: string
): Promise<AnalyzeResult> {
  const settings = await getGeminiSettings();
  const apiKey = settings.apiKey;
  const model = modelOverride?.trim() || settings.model;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "Gemini API key not configured. Add it in Admin → Settings before using auto-metadata.",
    };
  }

  const prompt = [
    "You are an expert design & photography assistant. Analyze this image and generate structured metadata for a modern visual asset library.",
    "Return valid JSON with exactly:",
    '- "title": A short, elegant, punchy title (max 5-6 words, no quotes)',
    '- "description": A concise, engaging 1-2 sentence description of the subject and visual aesthetic',
    '- "tags": An array of 5-8 relevant lowercase keywords (no hashtags)',
    '- "palette": An array of 4-6 prominent colors with "hex" (e.g. #2D3748) and "name" (color name)',
    '- "prompt": A high-detail Midjourney/Flux style text prompt that can recreate this exact visual (lighting, camera lens, composition, style, color mood)',
  ].join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
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
      } catch {
        // ignore parse error
      }
      return { ok: false, error: message };
    }

    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("");
    if (!text) return { ok: false, error: "Gemini returned no content." };

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
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Gemini request error." };
  }
}