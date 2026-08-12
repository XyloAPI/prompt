"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyAdminPassword, clearAdminSession, isAdmin } from "@/lib/auth";
import {
  createImage,
  updateImage,
  deleteImage,
  createR2Account,
  deleteR2Account,
  createR2Bucket,
  updateR2Bucket,
  deleteR2Bucket,
} from "@/lib/admin-data";
import {
  getR2Accounts,
  getR2BucketById,
  getImageById,
  getR2Buckets,
  getSetting,
  setSetting,
  updateR2BucketUsage,
  adjustR2BucketUsage,
} from "@/db/queries";
import {
  createPresignedUploadUrl,
  deleteR2Object,
  getObjectBuffer,
  getObjectSize,
  computeBucketUsage,
} from "@/lib/r2";
import {
  analyzeImageBuffer,
  AI_PROVIDER_SETTING,
  GEMINI_API_KEY_SETTING,
  GEMINI_MODEL_SETTING,
  NVIDIA_API_KEY_SETTING,
  NVIDIA_MODEL_SETTING,
  getAiSettings,
} from "@/lib/ai-assistant";
import type { Category, Image, PaletteColor } from "@/db/schema";

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

// ---------- R2 accounts & buckets ----------

export async function createR2AccountAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();

  const name = String(formData.get("name") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "").trim();
  const accessKeyId = String(formData.get("accessKeyId") ?? "").trim();
  const secretAccessKey = String(formData.get("secretAccessKey") ?? "").trim();

  if (!name || !accountId || !accessKeyId || !secretAccessKey) {
    return { error: "All R2 account fields are required." };
  }

  await createR2Account({ name, accountId, accessKeyId, secretAccessKey });
  revalidatePath("/admin/r2");
  return {};
}

export async function deleteR2AccountAction(id: string): Promise<void> {
  if (!(await isAdmin())) return;
  await deleteR2Account(id);
  revalidatePath("/admin/r2");
}

export async function createR2BucketAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();

  const accountId = String(formData.get("accountId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const publicUrl = String(formData.get("publicUrl") ?? "").trim();
  const quotaRaw = String(formData.get("quotaBytes") ?? "").trim();

  if (!accountId || !name) return { error: "Account and bucket name are required." };

  const quotaBytes = quotaRaw
    ? Number(quotaRaw) * 1024 * 1024 * 1024
    : 10 * 1024 * 1024 * 1024;

  await createR2Bucket({ accountId, name, publicUrl: publicUrl || undefined, quotaBytes });
  revalidatePath("/admin/r2");
  return {};
}

export async function updateR2BucketAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const publicUrl = String(formData.get("publicUrl") ?? "").trim();
  const quotaRaw = String(formData.get("quotaBytes") ?? "").trim();

  if (!id) return { error: "Missing bucket." };

  await updateR2Bucket({
    id,
    name: name || undefined,
    publicUrl: publicUrl || undefined,
    quotaBytes: quotaRaw ? Number(quotaRaw) * 1024 * 1024 * 1024 : undefined,
  });
  revalidatePath("/admin/r2");
  return {};
}

export async function deleteR2BucketAction(id: string): Promise<void> {
  if (!(await isAdmin())) return;
  await deleteR2Bucket(id);
  revalidatePath("/admin/r2");
}

export async function syncR2BucketAction(id: string): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();

  const bucket = await getR2BucketById(id);
  if (!bucket) return { error: "Bucket not found." };
  const account = (await getR2Accounts()).find((a) => a.id === bucket.accountId);
  if (!account) return { error: "R2 account not found." };

  const usedBytes = await computeBucketUsage({ account, bucketName: bucket.name });
  await updateR2BucketUsage(id, usedBytes);
  revalidatePath("/admin/r2");
  return {};
}

// ---------- Settings ----------

export async function saveAiSettingsAction(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  if (!(await isAdmin())) return unauthorized();

  const provider = String(formData.get("provider") ?? "gemini").trim();
  const geminiApiKey = String(formData.get("geminiApiKey") ?? "").trim();
  const geminiModel = String(formData.get("geminiModel") ?? "").trim();
  const nvidiaApiKey = String(formData.get("nvidiaApiKey") ?? "").trim();
  const nvidiaModel = String(formData.get("nvidiaModel") ?? "").trim();

  await setSetting(AI_PROVIDER_SETTING, provider);
  await setSetting(GEMINI_API_KEY_SETTING, geminiApiKey);
  if (geminiModel) await setSetting(GEMINI_MODEL_SETTING, geminiModel);
  await setSetting(NVIDIA_API_KEY_SETTING, nvidiaApiKey);
  if (nvidiaModel) await setSetting(NVIDIA_MODEL_SETTING, nvidiaModel);

  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return {};
}

export const saveGeminiSettingsAction = saveAiSettingsAction;

// ---------- Upload flow ----------

function pickExt(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return map[contentType] ?? "jpg";
}

async function pickBucket(
  preferredBucketId?: string
): Promise<{ bucketId: string; name: string; accountId: string } | null> {
  let bucket;
  if (preferredBucketId) {
    bucket = await getR2BucketById(preferredBucketId);
  } else {
    const buckets = await getR2Buckets();
    if (buckets.length === 0) return null;
    // best-effort: most free space relative to quota
    let best = buckets[0];
    let bestFree = Number.NEGATIVE_INFINITY;
    for (const b of buckets) {
      const free = (b.quotaBytes ?? 0) - (b.usedBytes ?? 0);
      if (free > bestFree) {
        bestFree = free;
        best = b;
      }
    }
    bucket = best;
  }
  if (!bucket) return null;
  return { bucketId: bucket.id, name: bucket.name, accountId: bucket.accountId };
}

export type CreateUploadResult =
  | { error: string }
  | {
      url: string;
      previewUrl: string;
      key: string;
      previewKey: string;
      bucketId: string;
      bucketName: string;
    };

export async function createUploadAction(input: {
  master: { fileName: string; contentType: string; size: number };
  preview: { fileName: string; contentType: string; size: number };
  bucketId?: string;
}): Promise<CreateUploadResult> {
  if (!(await isAdmin())) return { error: "Unauthorized." };

  const bucket = await pickBucket(input.bucketId);
  if (!bucket) return { error: "No R2 bucket configured. Add one in Admin → R2." };

  const accounts = await getR2Accounts();
  const accountObj = accounts.find((a) => a.id === bucket.accountId);
  if (!accountObj) return { error: "R2 account not found." };

  const ext = pickExt(input.master.contentType);
  const slug = crypto.randomUUID();
  const key = `images/${slug}.${ext}`;
  const previewKey = `images/preview/${slug}.${ext}`;

  try {
    const [url, previewUrl] = await Promise.all([
      createPresignedUploadUrl({
        account: accountObj,
        bucketName: bucket.name,
        key,
        contentType: input.master.contentType,
      }),
      createPresignedUploadUrl({
        account: accountObj,
        bucketName: bucket.name,
        key: previewKey,
        contentType: input.preview.contentType || input.master.contentType,
      }),
    ]);

    return { url, previewUrl, key, previewKey, bucketId: bucket.bucketId, bucketName: bucket.name };
  } catch (err) {
    return {
      error: err instanceof Error ? `Presign failed: ${err.message}` : "Presign failed.",
    };
  }
}

export async function generateMetadataAction(input: {
  key: string;
  bucketId: string;
  model?: string;
}): Promise<{ error?: string } & Partial<{ title: string; description: string; tags: string[]; palette: PaletteColor[]; prompt: string }>> {
  if (!(await isAdmin())) return { error: "Unauthorized." };

  const bucket = await getR2BucketById(input.bucketId);
  if (!bucket) return { error: "Bucket not found." };
  const account = (await getR2Accounts()).find((a) => a.id === bucket.accountId);
  if (!account) return { error: "R2 account not found." };

  const ext = input.key.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" }[ext] ??
    "image/jpeg";

  let res: { bytes: Buffer; contentType?: string };
  try {
    res = await getObjectBuffer({ account, bucketName: bucket.name, key: input.key });
  } catch (err) {
    return {
      error: err instanceof Error ? `Could not read object: ${err.message}` : "Could not read object.",
    };
  }
  const bytes = res.bytes;

  const result = await analyzeImageBuffer(bytes, mimeType, input.model);
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
}): Promise<{ error?: string } & Partial<{ title: string; description: string; tags: string[]; palette: PaletteColor[]; prompt: string }>> {
  if (!(await isAdmin())) return { error: "Unauthorized." };
  try {
    const buffer = Buffer.from(input.base64, "base64");
    const result = await analyzeImageBuffer(buffer, input.mimeType, input.model);
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

  const key = String(formData.get("r2Key") ?? "").trim();
  const previewKey = String(formData.get("previewKey") ?? "").trim();
  const bucketId = String(formData.get("bucketId") ?? "").trim();
  const sizeBytes = Number(String(formData.get("sizeBytes") ?? "0"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "photo") as Category;
  const prompt = String(formData.get("prompt") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const paletteRaw = String(formData.get("palette") ?? "").trim();

  if (!title) return { error: "Title is required." };
  if (!key || !bucketId) return { error: "Upload to R2 first." };

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

  const bucket = await getR2BucketById(bucketId);
  if (!bucket) return { error: "Bucket not found." };
  const slug = key.split("/").pop() ?? key;
  const url = `/${encodeURIComponent(bucket.name)}/uploads/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`;
  const thumbnailUrl = previewKey
    ? `/${encodeURIComponent(bucket.name)}/uploads/${encodeURIComponent(category)}/preview/${encodeURIComponent(previewKey.split("/").pop() ?? "")}`
    : url;

  const widthRaw = Number(String(formData.get("width") ?? "0"));
  const heightRaw = Number(String(formData.get("height") ?? "0"));
  const width = widthRaw > 0 ? widthRaw : 1200;
  const height = heightRaw > 0 ? heightRaw : 800;

  await createImage({
    title,
    description,
    category,
    tags,
    prompt,
    palette,
    url,
    thumbnailUrl,
    width,
    height,
    r2Key: key,
    bucketId,
    sizeBytes,
  });

  await adjustR2BucketUsage(bucketId, sizeBytes);

  revalidatePath("/gallery");
  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteImageAction(id: string): Promise<void> {
  if (!(await isAdmin())) return;
  const image = await getImageById(id);
  if (image?.r2Key && image.bucketId) {
    const bucket = await getR2BucketById(image.bucketId);
    const account = (await getR2Accounts()).find((a) => a.id === bucket?.accountId);
    if (bucket && account) {
      try {
        await deleteR2Object({ account, bucketName: bucket.name, key: image.r2Key });
        if (image.r2Key.startsWith("images/")) {
          const previewKey = `images/preview/${image.r2Key.slice("images/".length)}`;
          await deleteR2Object({ account, bucketName: bucket.name, key: previewKey });
        }
        await adjustR2BucketUsage(bucket.id, -(image.sizeBytes ?? 0));
      } catch {
        // ignore object-delete errors; remove record regardless
      }
    }
  }
  await deleteImage(id);
  revalidatePath("/admin");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export type CreateReplaceUploadResult =
  | { error: string }
  | {
      master?: { url: string; key: string };
      preview?: { url: string; key: string };
      bucketId: string;
      bucketName: string;
    };

export async function createReplaceUploadAction(input: {
  bucketId: string;
  master?: { key: string; contentType: string };
  preview?: { key: string; contentType: string };
}): Promise<CreateReplaceUploadResult> {
  if (!(await isAdmin())) return { error: "Unauthorized." };

  const bucket = await getR2BucketById(input.bucketId);
  if (!bucket) return { error: "Bucket not found." };
  const account = (await getR2Accounts()).find((a) => a.id === bucket.accountId);
  if (!account) return { error: "R2 account not found." };

  try {
    const [master, preview] = await Promise.all([
      input.master
        ? createPresignedUploadUrl({
            account,
            bucketName: bucket.name,
            key: input.master.key,
            contentType: input.master.contentType,
          }).then((url) => ({ url, key: input.master!.key }))
        : null,
      input.preview
        ? createPresignedUploadUrl({
            account,
            bucketName: bucket.name,
            key: input.preview.key,
            contentType: input.preview.contentType,
          }).then((url) => ({ url, key: input.preview!.key }))
        : null,
    ]);

    const result: CreateReplaceUploadResult = {
      bucketId: bucket.id,
      bucketName: bucket.name,
    };
    if (master) result.master = master;
    if (preview) result.preview = preview;
    return result;
  } catch (err) {
    return { error: err instanceof Error ? `Presign failed: ${err.message}` : "Presign failed." };
  }
}

export async function updateImageAction(input: {
  id: string;
  title: string;
  description: string;
  category: Category;
  tags: string[];
  palette: PaletteColor[];
  prompt: string;
  newSizeBytes?: number;
  width?: number;
  height?: number;
}): Promise<{ error?: string; ok?: boolean }> {
  if (!(await isAdmin())) return unauthorized();

  const image = await getImageById(input.id);
  if (!image) return { error: "Image not found." };
  if (!input.title) return { error: "Title is required." };

  const bucket = image.bucketId ? await getR2BucketById(image.bucketId) : null;

  // Rebuild public URLs from the R2 key so category changes stay consistent.
  let url = image.url;
  let thumbnailUrl = image.thumbnailUrl;
  if (bucket && image.r2Key) {
    const slug = image.r2Key.split("/").pop() ?? image.r2Key;
    url = `/${encodeURIComponent(bucket.name)}/uploads/${encodeURIComponent(input.category)}/${encodeURIComponent(slug)}`;
    thumbnailUrl = await previewThumbnailUrl(image, bucket.name, input.category, slug, url);
  }

  await updateImage(image.id, {
    title: input.title,
    description: input.description,
    category: input.category,
    tags: input.tags,
    palette: input.palette,
    prompt: input.prompt,
    url,
    thumbnailUrl,
    sizeBytes: input.newSizeBytes !== undefined ? input.newSizeBytes : image.sizeBytes ?? 0,
    width: input.width !== undefined && input.width > 0 ? input.width : (image.width ?? undefined),
    height: input.height !== undefined && input.height > 0 ? input.height : (image.height ?? undefined),
  });

  if (input.newSizeBytes !== undefined && bucket) {
    await adjustR2BucketUsage(bucket.id, input.newSizeBytes - (image.sizeBytes ?? 0));
  }

  revalidatePath("/admin");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

async function previewThumbnailUrl(
  image: Image,
  bucketName: string,
  category: string,
  slug: string,
  fallback: string
): Promise<string> {
  if (!image.r2Key?.startsWith("images/") || !image.bucketId) return fallback;
  try {
    const bucket = await getR2BucketById(image.bucketId);
    const account = (await getR2Accounts()).find((a) => a.id === bucket?.accountId);
    if (!bucket || !account) return fallback;
    const previewKey = `images/preview/${image.r2Key.slice("images/".length)}`;
    await getObjectSize({ account, bucketName: bucket.name, key: previewKey });
    return `/${encodeURIComponent(bucketName)}/uploads/${encodeURIComponent(category)}/preview/${encodeURIComponent(slug)}`;
  } catch {
    return fallback;
  }
}

export async function refreshImageSizeAction(id: string): Promise<{ error?: string; sizeBytes?: number }> {
  if (!(await isAdmin())) return unauthorized();
  const image = await getImageById(id);
  if (!image) return { error: "Image not found." };
  if (!image.r2Key || !image.bucketId) return { error: "Image has no R2 object." };

  const bucket = await getR2BucketById(image.bucketId);
  const account = (await getR2Accounts()).find((a) => a.id === bucket?.accountId);
  if (!bucket || !account) return { error: "R2 configuration not found." };

  let total = 0;
  try {
    total += await getObjectSize({ account, bucketName: bucket.name, key: image.r2Key });
    if (image.r2Key.startsWith("images/")) {
      const previewKey = `images/preview/${image.r2Key.slice("images/".length)}`;
      try {
        total += await getObjectSize({ account, bucketName: bucket.name, key: previewKey });
      } catch {
        // preview may not exist yet
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? `Could not read object size: ${err.message}` : "Could not read object size." };
  }

  await updateImage(id, { sizeBytes: total });
  if (bucket) await adjustR2BucketUsage(bucket.id, total - (image.sizeBytes ?? 0));

  revalidatePath("/admin");
  return { sizeBytes: total };
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