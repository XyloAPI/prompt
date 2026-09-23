"use client";

/**
 * Browser client for the luminaq-api mini worker.
 * Session is a HttpOnly cookie (Domain=.luminaq.xyz) set by the worker,
 * so every request just uses `credentials: "include"`.
 */
import type { ErrorLog, Image, PaletteColor } from "@/db/schema";
import type { AiProvider } from "@/lib/ai-models";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new ApiError("API is not configured (NEXT_PUBLIC_API_URL).", 0);
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401) throw new ApiError("Session expired. Please sign in again.", 401);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status}).`, res.status);
  return data as T;
}

export type ActionResult = { error?: string };
export type GeneratedMetadata = {
  error?: string;
  title?: string;
  description?: string;
  tags?: string[];
  palette?: PaletteColor[];
  prompt?: string;
};

export type AiSettings = {
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
};

export type StorageSettings = {
  storageProvider: string;
  fgUserId: string;
  fgAuthCookie: string;
  fgPublicId: string;
  imgCdnApiKey: string;
};

export type DashboardData = {
  stats: { images: number; downloads: number; storageBytes: number; dailyPicks: number };
  uploadsByDay: { date: string; count: number }[];
  byCategory: { name: string; value: number }[];
  topTags: { name: string; value: number }[];
  topDownloaded: { name: string; value: number }[];
  bucketUsage: [];
  trending: { title: string; value: number }[];
};

// ---------- auth ----------

export async function apiLogin(password: string): Promise<ActionResult> {
  try {
    await req<{ ok: true }>("/login", { method: "POST", body: JSON.stringify({ password }) });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign in failed." };
  }
}

export async function apiLogout(): Promise<void> {
  try {
    await req("/logout", { method: "POST" });
  } catch {
    // ignore — client redirects to login regardless
  }
}

export async function apiMe(): Promise<{ authed: boolean }> {
  try {
    return await req<{ authed: boolean }>("/me");
  } catch {
    return { authed: false };
  }
}

// ---------- dashboard / library ----------

export async function apiGetDashboard(): Promise<DashboardData> {
  return req<DashboardData>("/dashboard");
}

export async function apiGetImages(): Promise<Image[]> {
  return req<Image[]>("/images");
}

export async function apiGetImage(id: string): Promise<Image> {
  return req<Image>(`/images/${encodeURIComponent(id)}`);
}

export async function apiSaveImage(values: Record<string, string>): Promise<ActionResult> {
  try {
    await req("/images", { method: "POST", body: JSON.stringify(values) });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save asset." };
  }
}

export async function apiUpdateImage(input: {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  palette: PaletteColor[];
  prompt: string;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}): Promise<ActionResult> {
  try {
    await req(`/images/${input.id}`, { method: "PATCH", body: JSON.stringify(input) });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function apiDeleteImage(id: string): Promise<ActionResult> {
  try {
    await req(`/images/${id}`, { method: "DELETE" });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed." };
  }
}

// ---------- AI ----------

export async function apiGenerateMetadata(input: {
  url: string;
  model?: string;
  hint?: string;
}): Promise<GeneratedMetadata> {
  try {
    return await req<GeneratedMetadata>("/ai/generate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Metadata generation failed." };
  }
}

export async function apiGenerateMetadataFromFile(input: {
  base64: string;
  mimeType: string;
  model?: string;
  hint?: string;
}): Promise<GeneratedMetadata> {
  try {
    return await req<GeneratedMetadata>("/ai/generate-file", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Metadata generation failed." };
  }
}

export async function apiGetAiSettings(): Promise<AiSettings> {
  return req<AiSettings>("/settings/ai");
}

export async function apiSaveAiSettings(values: Record<string, string>): Promise<ActionResult> {
  try {
    await req("/settings/ai", { method: "PUT", body: JSON.stringify(values) });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save settings." };
  }
}

export async function apiTestAi(): Promise<{ error?: string; message?: string }> {
  try {
    return await req<{ message: string }>("/settings/ai/test", { method: "POST" });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Connection test failed." };
  }
}

// ---------- storage ----------

export async function apiGetStorageSettings(): Promise<StorageSettings> {
  return req<StorageSettings>("/settings/storage");
}

export async function apiSaveStorageProvider(provider: string): Promise<ActionResult> {
  try {
    await req("/settings/storage/provider", { method: "PUT", body: JSON.stringify({ provider }) });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to switch provider." };
  }
}

export async function apiSaveFileGarden(values: {
  userId: string;
  authCookie: string;
  publicId: string;
}): Promise<ActionResult> {
  try {
    await req("/settings/storage/filegarden", { method: "PUT", body: JSON.stringify(values) });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save settings." };
  }
}

export async function apiSaveImgCdn(values: { apiKey: string }): Promise<ActionResult> {
  try {
    await req("/settings/storage/imgcdn", { method: "PUT", body: JSON.stringify(values) });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save settings." };
  }
}

export async function apiUpload(file: File): Promise<{ url?: string; error?: string }> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok) return { error: data.error || `Upload failed (${res.status}).` };
    return data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed." };
  }
}

// ---------- logs ----------

export async function apiGetLogs(): Promise<ErrorLog[]> {
  return req<ErrorLog[]>("/logs");
}

export async function apiResolveLog(id: string): Promise<ActionResult> {
  try {
    await req(`/logs/${id}/resolve`, { method: "POST" });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to resolve error." };
  }
}

export async function apiDeleteLog(id: string): Promise<ActionResult> {
  try {
    await req(`/logs/${id}`, { method: "DELETE" });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete log." };
  }
}

// ---------- publish ----------

export async function apiPublish(): Promise<ActionResult> {
  try {
    await req("/publish", { method: "POST" });
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to trigger rebuild." };
  }
}
