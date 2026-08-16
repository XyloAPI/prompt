import type { Image } from "@/db/schema";

export interface Collection {
  id: string;
  name: string;
  description: string;
  type: "color" | "tag" | "curated";
  filter: (image: Image) => boolean;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  if (cleanHex.length !== 6) {
    return { h: 0, s: 0, l: 0 };
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function isGreen(hex: string, name?: string): boolean {
  const n = (name ?? "").toLowerCase();
  if (["green", "emerald", "lime", "forest", "mint", "olive", "moss", "sage"].some((w) => n.includes(w))) {
    return true;
  }
  const { h, s, l } = hexToHsl(hex);
  return h >= 75 && h <= 165 && s > 15 && l > 10 && l < 85;
}

function isWarm(hex: string, name?: string): boolean {
  const n = (name ?? "").toLowerCase();
  if (["red", "orange", "yellow", "gold", "sunset", "warm", "peach", "coral", "rose", "crimson", "amber", "fire", "rust"].some((w) => n.includes(w))) {
    return true;
  }
  const { h, s, l } = hexToHsl(hex);
  // Red, Orange, Yellow, Pink range
  return (h < 45 || h > 320 || (h >= 45 && h <= 70)) && s > 20 && l > 15;
}

function isMonochrome(hex: string, name?: string): boolean {
  const n = (name ?? "").toLowerCase();
  if (["gray", "grey", "black", "white", "slate", "charcoal", "silver", "ash", "monochrome", "carbon", "ink", "cement"].some((w) => n.includes(w))) {
    return true;
  }
  const { s, l } = hexToHsl(hex);
  return s < 18 || l < 15 || l > 88;
}

export const COLLECTIONS: Collection[] = [
  {
    id: "emerald-forest",
    name: "Emerald & Forest",
    description: "A collection of waxy greens, foliage, and deep nature aesthetics.",
    type: "color",
    filter: (image) => {
      const palette = image.palette || [];
      return palette.some((c) => isGreen(c.hex, c.name));
    },
  },
  {
    id: "sunset-warmth",
    name: "Sunset & Warm Tones",
    description: "Rich oranges, deep golds, and warm cinematic lighting.",
    type: "color",
    filter: (image) => {
      const palette = image.palette || [];
      return palette.some((c) => isWarm(c.hex, c.name));
    },
  },
  {
    id: "minimalist-slate",
    name: "Minimalist Slate",
    description: "Monochromatic tones, clean slates, and high-contrast shadows.",
    type: "color",
    filter: (image) => {
      const palette = image.palette || [];
      return palette.some((c) => isMonochrome(c.hex, c.name));
    },
  },
  {
    id: "nature-macro",
    name: "Dewy Nature Macro",
    description: "Extreme close-ups, water droplets, and detailed natural textures.",
    type: "tag",
    filter: (image) => {
      const tags = (image.tags || []).map((t) => t.toLowerCase());
      return ["macro", "dew", "droplet", "close-up", "water", "leaf", "veins", "foliage", "rain"].some((w) =>
        tags.some((tag) => tag.includes(w))
      );
    },
  },
  {
    id: "3d-abstract",
    name: "3D & Abstract Worlds",
    description: "Vibrant digital renders, abstract designs, and 3D illustrations.",
    type: "tag",
    filter: (image) => {
      const tags = (image.tags || []).map((t) => t.toLowerCase());
      return ["3d", "render", "cgi", "abstract", "blender", "c4d", "octane", "digital", "unreal"].some((w) =>
        tags.some((tag) => tag.includes(w))
      );
    },
  },
  {
    id: "cinematic-moods",
    name: "Cinematic Moods",
    description: "Moody shadows, dramatic lighting, and deep atmospheric compositions.",
    type: "tag",
    filter: (image) => {
      const tags = (image.tags || []).map((t) => t.toLowerCase());
      return ["cinematic", "moody", "shadow", "dark", "lighting", "dramatic", "atmosphere", "glow"].some((w) =>
        tags.some((tag) => tag.includes(w))
      );
    },
  },
];

export interface CollectionData {
  id: string;
  name: string;
  description: string;
  type: "color" | "tag" | "curated";
  images: Image[];
}

export function getCollectionsData(images: Image[]): CollectionData[] {
  return COLLECTIONS.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    type: c.type,
    images: images.filter(c.filter),
  })).filter((c) => c.images.length > 0); // Only show collections that have assets
}

export function getCollectionDataById(id: string, images: Image[]): CollectionData | null {
  const collection = COLLECTIONS.find((c) => c.id === id);
  if (!collection) return null;
  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    type: collection.type,
    images: images.filter(collection.filter),
  };
}
