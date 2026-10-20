import type { CardImage } from "@/lib/card-image";

export type HomeFeed = {
  images: CardImage[];
  byCategory: Record<string, CardImage[]>;
};

/**
 * Live home feed: the newest assets plus a slice per category.
 * The static export only holds a build-time snapshot, so anything
 * uploaded afterwards has to come from the API.
 */
export async function loadHomeFeed(): Promise<HomeFeed | null> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    const res = await fetch(`${api}/home`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<HomeFeed>;
    if (!Array.isArray(data.images)) return null;
    return {
      images: data.images,
      byCategory: data.byCategory ?? {},
    };
  } catch {
    return null;
  }
}
