import type { Image } from "@/db/schema";

let images: Image[] = [];

export const memoryImages = (): Image[] => images;

export function memoryUpsertImage(image: Image): void {
  const idx = images.findIndex((i) => i.id === image.id);
  if (idx >= 0) images[idx] = image;
  else images.unshift(image);
}

export function memoryDeleteImage(id: string): void {
  images = images.filter((i) => i.id !== id);
}

export function memoryIncrementDownloads(id: string): number {
  const item = images.find((i) => i.id === id);
  if (item) {
    item.downloads = (item.downloads || 0) + 1;
    return item.downloads;
  }
  return 0;
}

export function memoryReset(): void {
  images = [];
}
