/**
 * Client-safe AI provider/model constants (no server imports).
 * Imported by admin UI components bundled for the browser.
 */

export type AiProvider = "gemini" | "nvidia" | "groq" | "cloudflare" | "mistral";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
export const DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";
export const DEFAULT_GROQ_MODEL = "qwen/qwen3.6-27b";
export const DEFAULT_CLOUDFLARE_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
export const DEFAULT_MISTRAL_MODEL = "pixtral-12b-2409";

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
