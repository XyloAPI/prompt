import type { Category } from "@/db/schema";

export function categoriesWithLabels(): { value: Category; label: string }[] {
  return [
    { value: "photo", label: "Photos" },
    { value: "illustration", label: "Illustrations" },
    { value: "3d", label: "3D" },
    { value: "video", label: "Videos" },
  ];
}
