import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import type { Category, Image, PaletteColor } from "@/db/schema";
import { images } from "@/db/schema";
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

export { memoryImages };