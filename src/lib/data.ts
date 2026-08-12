import type { Category, Image } from "@/db/schema";
import * as query from "@/db/queries";
import { memoryImages } from "@/lib/memory";
import { rankSimilarImages } from "@/lib/similarity";

export async function useDbFallback(): Promise<boolean> {
  return await query.hasDb();
}

function filterMemory(opts?: {
  category?: Category;
  search?: string;
  sort?: "latest" | "trending" | "downloads";
}) {
  let list = memoryImages();
  if (opts?.category) list = list.filter((i) => i.category === opts.category);
  if (opts?.search) {
    const s = opts.search.toLowerCase();
    list = list.filter(
      (i) =>
        i.title.toLowerCase().includes(s) ||
        (i.description ?? "").toLowerCase().includes(s) ||
        (i.prompt ?? "").toLowerCase().includes(s) ||
        i.tags.some((t) => t.toLowerCase().includes(s))
    );
  }
  if (opts?.sort === "trending") list = [...list].sort((a, b) => b.trending - a.trending);
  else if (opts?.sort === "downloads") list = [...list].sort((a, b) => b.downloads - a.downloads);
  else list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

export async function listImages(opts?: {
  category?: Category;
  search?: string;
  sort?: "latest" | "trending" | "downloads";
}): Promise<Image[]> {
  if (!await query.hasDb()) return filterMemory(opts);
  try {
    return await query.getImages(opts);
  } catch {
    return filterMemory(opts);
  }
}

export async function dailyPicks(): Promise<Image[]> {
  if (!await query.hasDb()) return memoryImages().filter((i) => i.isDailyPick);
  try {
    return await query.getDailyPicks();
  } catch {
    return memoryImages().filter((i) => i.isDailyPick);
  }
}

export async function imageById(id: string): Promise<Image | null> {
  if (!await query.hasDb()) return memoryImages().find((i) => i.id === id) ?? null;
  try {
    return await query.getImageById(id);
  } catch {
    return memoryImages().find((i) => i.id === id) ?? null;
  }
}

export async function relatedImages(image: Image, limit = 4): Promise<Image[]> {
  if (!await query.hasDb()) {
    const all = memoryImages();
    return rankSimilarImages(image, all, limit);
  }
  try {
    return await query.getRelatedImages(image, limit);
  } catch {
    const all = memoryImages();
    return rankSimilarImages(image, all, limit);
  }
}

export async function trackDownload(id: string): Promise<number> {
  if (!await query.hasDb()) return (await import("@/lib/memory")).memoryIncrementDownloads(id);
  try {
    return await query.incrementDownloads(id);
  } catch {
    return (await import("@/lib/memory")).memoryIncrementDownloads(id);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}