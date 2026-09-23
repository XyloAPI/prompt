"use client";

import Fuse from "fuse.js";

export type IndexImage = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  thumbnailUrl: string;
  url: string;
  width: number | null;
  height: number | null;
  downloads: number;
  trending: number;
  createdAt: string;
};

let indexPromise: Promise<IndexImage[]> | null = null;
let fuse: Fuse<IndexImage> | null = null;

export function loadImageIndex(): Promise<IndexImage[]> {
  if (!indexPromise) {
    indexPromise = fetch("/data/search-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(`index ${r.status}`);
        return r.json() as Promise<{ images: IndexImage[] }>;
      })
      .then((d) => d.images ?? [])
      .catch(() => []);
  }
  return indexPromise;
}

function getFuse(list: IndexImage[]): Fuse<IndexImage> {
  if (!fuse) {
    fuse = new Fuse(list, {
      keys: [
        { name: "title", weight: 1.0 },
        { name: "tags", weight: 0.8 },
        { name: "category", weight: 0.5 },
        { name: "description", weight: 0.4 },
      ],
      threshold: 0.4,
    });
  }
  return fuse;
}

export async function searchImages(q: string, limit = 8): Promise<{ images: IndexImage[]; total: number }> {
  const list = await loadImageIndex();
  const query = q.trim();
  if (!query) return { images: list.slice(0, limit), total: list.length };
  const hits = getFuse(list).search(query).map((r) => r.item);
  return { images: hits.slice(0, limit), total: list.length };
}

export async function filterImages(opts: {
  category?: string;
  search?: string;
  sort?: "latest" | "trending" | "downloads";
}): Promise<IndexImage[]> {
  let list = await loadImageIndex();
  if (opts.category) list = list.filter((i) => i.category === opts.category);
  if (opts.search) {
    list = getFuse(list).search(opts.search).map((r) => r.item);
  }
  const sorted = [...list];
  if (opts.sort === "trending") sorted.sort((a, b) => b.trending - a.trending);
  else if (opts.sort === "downloads") sorted.sort((a, b) => b.downloads - a.downloads);
  else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sorted;
}
