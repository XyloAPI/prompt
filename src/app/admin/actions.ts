"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyAdminPassword, clearAdminSession, isAdmin } from "@/lib/auth";
import {
  createImage,
  updateImage,
  deleteImage,
} from "@/lib/admin-data";
import {
  getImageById,
} from "@/db/queries";
import {
  analyzeImageBuffer,
  AI_PROVIDER_SETTING,
  GEMINI_API_KEY_SETTING,
  GEMINI_MODEL_SETTING,
  NVIDIA_API_KEY_SETTING,
  NVIDIA_MODEL_SETTING,
  GROQ_API_KEY_SETTING,
  GROQ_MODEL_SETTING,
  CLOUDFLARE_ACCOUNT_ID_SETTING,
  CLOUDFLARE_API_TOKEN_SETTING,
  CLOUDFLARE_MODEL_SETTING,
  MISTRAL_API_KEY_SETTING,
  MISTRAL_MODEL_SETTING,
  getAiSettings,
} from "@/lib/ai-assistant";
import { setSetting } from "@/db/queries";
import type { Category, PaletteColor } from "@/db/schema";
import { getFileGardenConfig } from "@/lib/filegarden";
import { getImgCdnConfig } from "@/lib/imgcdn";

export async function loginAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  const ok = await verifyAdminPassword(password);
  if (!ok) return { error: "Incorrect password." };
  redirect("/admin");
  return {};
}

export async function logoutAction(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}

function unauthorized() {
  return { error: "Unauthorized." };
}

// ---------- Settings ----------

export async function saveAiSettingsAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();

  const provider = String(formData.get("provider") ?? "gemini").trim();
  const geminiApiKey = String(formData.get("geminiApiKey") ?? "").trim();
  const geminiModel = String(formData.get("geminiModel") ?? "").trim();
  const nvidiaApiKey = String(formData.get("nvidiaApiKey") ?? "").trim();
  const nvidiaModel = String(formData.get("nvidiaModel") ?? "").trim();
  const groqApiKey = String(formData.get("groqApiKey") ?? "").trim();
  const groqModel = String(formData.get("groqModel") ?? "").trim();
  const cloudflareAccountId = String(formData.get("cloudflareAccountId") ?? "").trim();
  const cloudflareApiToken = String(formData.get("cloudflareApiToken") ?? "").trim();
  const cloudflareModel = String(formData.get("cloudflareModel") ?? "").trim();
  const mistralApiKey = String(formData.get("mistralApiKey") ?? "").trim();
  const mistralModel = String(formData.get("mistralModel") ?? "").trim();

  await setSetting(AI_PROVIDER_SETTING, provider);
  await setSetting(GEMINI_API_KEY_SETTING, geminiApiKey);
  if (geminiModel) await setSetting(GEMINI_MODEL_SETTING, geminiModel);
  await setSetting(NVIDIA_API_KEY_SETTING, nvidiaApiKey);
  if (nvidiaModel) await setSetting(NVIDIA_MODEL_SETTING, nvidiaModel);
  await setSetting(GROQ_API_KEY_SETTING, groqApiKey);
  if (groqModel) await setSetting(GROQ_MODEL_SETTING, groqModel);
  await setSetting(CLOUDFLARE_ACCOUNT_ID_SETTING, cloudflareAccountId);
  await setSetting(CLOUDFLARE_API_TOKEN_SETTING, cloudflareApiToken);
  if (cloudflareModel) await setSetting(CLOUDFLARE_MODEL_SETTING, cloudflareModel);
  await setSetting(MISTRAL_API_KEY_SETTING, mistralApiKey);
  if (mistralModel) await setSetting(MISTRAL_MODEL_SETTING, mistralModel);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return {};
}

export const saveGeminiSettingsAction = saveAiSettingsAction;

// ---------- Upload flow ----------

export async function generateMetadataAction(input: {
  url: string;
  model?: string;
  hint?: string;
}): Promise<{ error?: string } & Partial<{ title: string; description: string; tags: string[]; palette: PaletteColor[]; prompt: string }>> {
  if (!(await isAdmin())) return { error: "Unauthorized." };

  let bytes: Buffer;
  try {
    const res = await fetch(input.url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const arrayBuffer = await res.arrayBuffer();
    bytes = Buffer.from(arrayBuffer);
  } catch (err) {
    return {
      error: err instanceof Error ? `Could not read image URL: ${err.message}` : "Could not read image URL.",
    };
  }

  const ext = input.url.split("?")[0].split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
    }[ext] ?? "image/jpeg";

  const result = await analyzeImageBuffer(bytes, mimeType, input.model, input.hint);
  if (!result.ok) return { error: result.error };

  return {
    title: result.data.title,
    description: result.data.description,
    tags: result.data.tags,
    palette: result.data.palette,
    prompt: result.data.prompt,
  };
}

export async function generateMetadataFromFileAction(input: {
  base64: string;
  mimeType: string;
  model?: string;
  hint?: string;
}): Promise<{ error?: string } & Partial<{ title: string; description: string; tags: string[]; palette: PaletteColor[]; prompt: string }>> {
  if (!(await isAdmin())) return { error: "Unauthorized." };
  try {
    const buffer = Buffer.from(input.base64, "base64");
    const result = await analyzeImageBuffer(buffer, input.mimeType, input.model, input.hint);
    if (!result.ok) return { error: result.error };
    return {
      title: result.data.title,
      description: result.data.description,
      tags: result.data.tags,
      palette: result.data.palette,
      prompt: result.data.prompt,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Metadata generation failed." };
  }
}

export async function saveImageAction(
  prev: unknown,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  if (!(await isAdmin())) return unauthorized();

  const url = String(formData.get("url") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "photo") as Category;
  const prompt = String(formData.get("prompt") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const paletteRaw = String(formData.get("palette") ?? "").trim();

  if (!title) return { error: "Title is required." };
  if (!url) return { error: "Image URL is required." };

  let palette: PaletteColor[] = [];
  if (paletteRaw) {
    try {
      palette = JSON.parse(paletteRaw) as PaletteColor[];
    } catch {
      return { error: "Invalid palette data." };
    }
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const widthRaw = Number(String(formData.get("width") ?? "0"));
  const heightRaw = Number(String(formData.get("height") ?? "0"));
  const width = widthRaw > 0 ? widthRaw : 1200;
  const height = heightRaw > 0 ? heightRaw : 800;
  const sizeBytes = Number(String(formData.get("sizeBytes") ?? "0"));

  await createImage({
    title,
    description,
    category,
    tags,
    prompt,
    palette,
    url,
    thumbnailUrl: thumbnailUrl || url,
    width,
    height,
    sizeBytes,
  });

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteImageAction(id: string): Promise<void> {
  if (!(await isAdmin())) return;
  await deleteImage(id);
  revalidatePath("/admin");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function updateImageAction(input: {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  palette: PaletteColor[];
  prompt: string;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}): Promise<{ error?: string; ok?: boolean }> {
  if (!(await isAdmin())) return unauthorized();

  const image = await getImageById(input.id);
  if (!image) return { error: "Image not found." };
  if (!input.title) return { error: "Title is required." };

  await updateImage(image.id, {
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags,
    palette: input.palette,
    prompt: input.prompt,
    url: input.url ?? image.url,
    thumbnailUrl: input.thumbnailUrl ?? image.thumbnailUrl,
    width: input.width !== undefined && input.width > 0 ? input.width : (image.width ?? undefined),
    height: input.height !== undefined && input.height > 0 ? input.height : (image.height ?? undefined),
  });

  revalidatePath("/admin");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

export async function testAiAction(): Promise<{ error?: string; ok?: boolean; message?: string }> {
  if (!(await isAdmin())) return unauthorized();
  const settings = await getAiSettings();

  if (settings.provider === "nvidia") {
    if (!settings.nvidiaApiKey) return { error: "No NVIDIA NIM API key saved." };
    try {
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.nvidiaApiKey}`,
        },
        body: JSON.stringify({
          model: settings.nvidiaModel,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
          max_tokens: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data?.error?.message ?? data?.message ?? "NVIDIA NIM connection failed." };
      }
      return { ok: true, message: `Connected to ${settings.nvidiaModel} successfully.` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "NVIDIA NIM request failed." };
    }
  } else if (settings.provider === "groq") {
    if (!settings.groqApiKey) return { error: "No Groq API key saved." };
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.groqApiKey}`,
        },
        body: JSON.stringify({
          model: settings.groqModel,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
          max_tokens: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data?.error?.message ?? data?.message ?? "Groq connection failed." };
      }
      return { ok: true, message: `Connected to ${settings.groqModel} successfully.` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Groq request failed." };
    }
  } else if (settings.provider === "cloudflare") {
    if (!settings.cloudflareAccountId || !settings.cloudflareApiToken) {
      return { error: "No Cloudflare Account ID or API Token saved." };
    }
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${settings.cloudflareAccountId}/ai/run/${settings.cloudflareModel}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.cloudflareApiToken}`,
          },
          body: JSON.stringify({
            prompt: "Reply with the single word: ok",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        const errorMsg = data?.errors?.[0]?.message || res.statusText || "Request failed.";
        return { error: `Cloudflare Workers AI connection failed: ${errorMsg}` };
      }
      return { ok: true, message: `Connected to ${settings.cloudflareModel} successfully.` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Cloudflare Workers AI request failed." };
    }
  } else if (settings.provider === "mistral") {
    if (!settings.mistralApiKey) return { error: "No Mistral API key saved." };
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.mistralApiKey}`,
        },
        body: JSON.stringify({
          model: settings.mistralModel,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
          max_tokens: 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data?.error?.message ?? data?.message ?? "Mistral connection failed." };
      }
      return { ok: true, message: `Connected to ${settings.mistralModel} successfully.` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Mistral request failed." };
    }
  } else {
    if (!settings.geminiApiKey) return { error: "No Gemini API key saved." };
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": settings.geminiApiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Reply with the single word: ok" }] }],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || data?.error) {
        return { error: data?.error?.message ?? "Gemini connection failed." };
      }
      return { ok: true, message: `Connected to ${settings.geminiModel} successfully.` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Gemini request failed." };
    }
  }
}

export const testGeminiAction = testAiAction;

// ---------- Storage Provider ----------

export async function saveStorageProviderAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();
  const provider = String(formData.get("provider") ?? "filegarden").trim();
  await setSetting("storage_provider", provider);
  revalidatePath("/admin/settings");
  return {};
}

// ---------- File Garden ----------

export async function saveFileGardenSettingsAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();

  const userId = String(formData.get("userId") ?? "").trim().toLowerCase();
  const authCookie = String(formData.get("authCookie") ?? "").trim();
  const publicId = String(formData.get("publicId") ?? "").trim();

  await setSetting("filegarden_user_id", userId);
  await setSetting("filegarden_auth_cookie", authCookie);
  await setSetting("filegarden_public_id", publicId);

  revalidatePath("/admin/settings");
  return {};
}

// ---------- ImgCDN.dev ----------

export async function saveImgCdnSettingsAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  await setSetting("imgcdn_api_key", apiKey);
  revalidatePath("/admin/settings");
  return {};
}

export async function uploadToFileGardenAction(input: {
  base64: string;
  fileName: string;
  contentType: string;
}): Promise<{ error?: string; url?: string }> {
  if (!(await isAdmin())) return { error: "Unauthorized." };

  const { userId, authCookie, publicId } = await getFileGardenConfig();
  if (!userId || !authCookie) {
    return { error: "File Garden User ID or Auth Cookie is not configured in settings." };
  }

  try {
    const buffer = Buffer.from(input.base64, "base64");

    let cookieHeader = authCookie.trim();
    if (!cookieHeader.includes("auth=")) {
      cookieHeader = `auth=${cookieHeader}`;
    }

    const res = await fetch(`https://api.filegarden.com/users/${userId.trim().toLowerCase()}/pipe`, {
      method: "POST",
      headers: {
        "Cookie": cookieHeader,
        "Content-Type": "application/octet-stream",
        "X-Data": JSON.stringify({ parent: null, name: input.fileName }),
      },
      body: buffer,
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `File Garden upload failed (${res.status}): ${text || res.statusText}` };
    }

    const data = await res.json();
    const path = data?.path || data?.items?.[0]?.path;
    if (!path) {
      return { error: "Invalid response from File Garden (missing path)." };
    }

    const publicUrl = `https://file.garden/${publicId.trim()}/${path}`;
    return { url: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to upload to File Garden." };
  }
}