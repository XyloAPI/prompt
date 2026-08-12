import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { Category, Image, PaletteColor, R2Account, R2Bucket } from "@/db/schema";
import { images, r2Accounts, r2Buckets } from "@/db/schema";
import * as query from "@/db/queries";
import { memoryImages, memoryUpsertImage, memoryDeleteImage } from "@/lib/memory";

export type UpliftImageInput = {
  title: string;
  description?: string;
  category: Category;
  tags: string[];
  prompt?: string;
  palette?: PaletteColor[];
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  r2Key?: string | null;
  bucketId?: string | null;
  sizeBytes?: number | null;
};

export async function createImage(data: UpliftImageInput): Promise<Image> {
  const newImage: Image = {
    id: randomUUID(),
    title: data.title,
    description: data.description ?? "",
    category: data.category,
    tags: data.tags,
    prompt: data.prompt ?? "",
    palette: data.palette ?? [],
    url: data.url,
    thumbnailUrl: data.thumbnailUrl ?? data.url,
    width: data.width ?? 1200,
    height: data.height ?? 800,
    r2Key: data.r2Key ?? null,
    bucketId: data.bucketId ?? null,
    sizeBytes: data.sizeBytes ?? 0,
    downloads: 0,
    trending: 0,
    isDailyPick: false,
    createdAt: new Date().toISOString(),
  };

  if (await query.hasDb()) {
    try {
      const db = (await import("@/db")).db;
      await db.insert(images).values(newImage);
      return newImage;
    } catch {
      // fall through to memory if DB is unavailable
    }
  }

  memoryUpsertImage(newImage);
  return newImage;
}

export async function updateImage(id: string, data: Partial<UpliftImageInput>): Promise<void> {
  if (await query.hasDb()) {
    try {
      const db = (await import("@/db")).db;
      const values: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) values[k] = v;
      }
      if (Object.keys(values).length > 0) {
        await db.update(images).set(values).where(eq(images.id, id));
      }
      return;
    } catch {
      // fall through
    }
  }
  const current = memoryImages().find((i) => i.id === id);
  if (current) {
    memoryUpsertImage({ ...current, ...data });
  }
}

export async function deleteImage(id: string): Promise<void> {
  if (await query.hasDb()) {
    try {
      const db = (await import("@/db")).db;
      await db.delete(images).where(eq(images.id, id));
      return;
    } catch {
      // fall through
    }
  }
  memoryDeleteImage(id);
}

// ---------- R2 ----------

export async function createR2Account(data: {
  name: string;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<R2Account> {
  const row: R2Account = {
    id: randomUUID(),
    name: data.name,
    accountId: data.accountId,
    accessKeyId: data.accessKeyId,
    secretAccessKey: data.secretAccessKey,
    createdAt: new Date().toISOString(),
  };
  const db = (await import("@/db")).db;
  await db.insert(r2Accounts).values(row);
  return row;
}

export async function deleteR2Account(id: string): Promise<void> {
  const db = (await import("@/db")).db;
  await db.delete(r2Accounts).where(eq(r2Accounts.id, id));
}

export async function createR2Bucket(data: {
  accountId: string;
  name: string;
  publicUrl?: string;
  quotaBytes?: number;
}): Promise<R2Bucket> {
  const row: R2Bucket = {
    id: randomUUID(),
    accountId: data.accountId,
    name: data.name,
    publicUrl: data.publicUrl ?? null,
    quotaBytes: data.quotaBytes ?? 10 * 1024 * 1024 * 1024,
    usedBytes: 0,
    lastSyncAt: null,
    createdAt: new Date().toISOString(),
  };
  const db = (await import("@/db")).db;
  await db.insert(r2Buckets).values(row);
  return row;
}

export async function updateR2Bucket(data: {
  id: string;
  name?: string;
  publicUrl?: string;
  quotaBytes?: number;
}): Promise<void> {
  const db = (await import("@/db")).db;
  const values: Record<string, unknown> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.publicUrl !== undefined) values.publicUrl = data.publicUrl;
  if (data.quotaBytes !== undefined) values.quotaBytes = data.quotaBytes;
  await db.update(r2Buckets).set(values).where(eq(r2Buckets.id, data.id));
}

export async function deleteR2Bucket(id: string): Promise<void> {
  const db = (await import("@/db")).db;
  await db.delete(r2Buckets).where(eq(r2Buckets.id, id));
}

export { memoryImages };