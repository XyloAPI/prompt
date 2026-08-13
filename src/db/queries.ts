import { desc, eq, and, sql } from "drizzle-orm";
import {
  images,
  settings,
  type Category,
  type Image,
  type Setting,
} from "@/db/schema";

async function hasDb(): Promise<boolean> {
  return Boolean(process.env.DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export async function getImages(opts?: {
  category?: Category;
  search?: string;
  sort?: "latest" | "trending" | "downloads";
}): Promise<Image[]> {
  const db = (await import("@/db")).db;
  const conditions = [];
  if (opts?.category) conditions.push(eq(images.category, opts.category));
  if (opts?.search) conditions.push(sql`${images.title} LIKE ${`%${opts.search}%`}`);

  const orderBy =
    opts?.sort === "trending"
      ? desc(images.trending)
      : opts?.sort === "downloads"
        ? desc(images.downloads)
        : desc(images.createdAt);

  const rows = await db
    .select()
    .from(images)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(orderBy);

  return rows;
}

export async function getDailyPicks(): Promise<Image[]> {
  const db = (await import("@/db")).db;
  return db
    .select()
    .from(images)
    .where(eq(images.isDailyPick, true))
    .orderBy(desc(images.trending));
}

export async function getImageById(id: string): Promise<Image | null> {
  const db = (await import("@/db")).db;
  const rows = await db.select().from(images).where(eq(images.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getRelatedImages(image: Image, limit = 4): Promise<Image[]> {
  const { rankSimilarImages } = await import("@/lib/similarity");
  const db = (await import("@/db")).db;
  const candidates = await db
    .select()
    .from(images)
    .where(sql`${images.id} != ${image.id}`);

  return rankSimilarImages(image, candidates, limit);
}

export async function incrementDownloads(id: string): Promise<number> {
  const db = (await import("@/db")).db;
  const rows = await db
    .update(images)
    .set({
      downloads: sql`${images.downloads} + 1`,
    })
    .where(eq(images.id, id))
    .returning({ downloads: images.downloads });
  return rows[0]?.downloads ?? 0;
}

// ---------- Settings ----------

export async function getSetting(key: string): Promise<string | null> {
  const db = (await import("@/db")).db;
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Setting[]> {
  const db = (await import("@/db")).db;
  return db.select().from(settings).orderBy(desc(settings.updatedAt));
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = (await import("@/db")).db;
  await db
    .insert(settings)
    .values({ key, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date().toISOString() },
    });
}

export async function deleteSetting(key: string): Promise<void> {
  const db = (await import("@/db")).db;
  await db.delete(settings).where(eq(settings.key, key));
}

export { hasDb };