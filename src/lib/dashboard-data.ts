import { listImages } from "@/lib/data";
import { getR2Buckets } from "@/db/queries";
import type { Category } from "@/db/schema";

const categoryLabels: Record<Category, string> = {  photo: "Photo",
  illustration: "Illustration",
  "3d": "3D",
};

export type DashboardData = {
  stats: {
    images: number;
    downloads: number;
    storageBytes: number;
    buckets: number;
    dailyPicks: number;
  };
  uploadsByDay: { date: string; count: number }[];
  byCategory: { name: string; value: number }[];
  topTags: { name: string; value: number }[];
  topDownloaded: { name: string; value: number }[];
  bucketUsage: {
    name: string;
    usedBytes: number;
    quotaBytes: number;
    pct: number;
  }[];
  trending: { title: string; value: number }[];
};

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [images, buckets] = await Promise.all([listImages(), getR2Buckets()]);

  const stats = {
    images: images.length,
    downloads: images.reduce((s, i) => s + (i.downloads ?? 0), 0),
    storageBytes: images.reduce((s, i) => s + (i.sizeBytes ?? 0), 0),
    buckets: buckets.length,
    dailyPicks: images.filter((i) => i.isDailyPick).length,
  };

  // Uploads per day over the last 30 days
  const dayCount = new Map<string, number>();
  for (const day of lastNDays(30)) dayCount.set(day, 0);
  for (const img of images) {
    const day = (img.createdAt ?? "").slice(0, 10);
    if (dayCount.has(day)) dayCount.set(day, (dayCount.get(day) ?? 0) + 1);
  }
  const uploadsByDay = [...dayCount.entries()].map(([date, count]) => ({ date, count }));

  // Category distribution
  const byCategoryMap = new Map<string, number>();
  for (const img of images) {
    byCategoryMap.set(img.category, (byCategoryMap.get(img.category) ?? 0) + 1);
  }
  const byCategory = [...byCategoryMap.entries()].map(([cat, value]) => ({
    name: categoryLabels[cat as Category] ?? cat,
    value,
  }));

  // Top tags
  const tagCount = new Map<string, number>();
  for (const img of images) {
    for (const tag of img.tags ?? []) {
      tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCount.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Top downloaded
  const topDownloaded = [...images]
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))
    .slice(0, 8)
    .map((img) => ({ name: img.title, value: img.downloads ?? 0 }));

  // Bucket usage
  const bucketUsage = buckets.map((b) => {
    const used = b.usedBytes ?? 0;
    const quota = b.quotaBytes ?? 0;
    return {
      name: b.name,
      usedBytes: used,
      quotaBytes: quota,
      pct: quota ? Math.min(100, (used / quota) * 100) : 0,
    };
  });

  // Trending
  const trending = [...images]
    .sort((a, b) => (b.trending ?? 0) - (a.trending ?? 0))
    .slice(0, 8)
    .map((img) => ({ title: img.title, value: img.trending ?? 0 }));

  return { stats, uploadsByDay, byCategory, topTags, topDownloaded, bucketUsage, trending };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}