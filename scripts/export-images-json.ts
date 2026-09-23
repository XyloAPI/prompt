/**
 * Build-time export: dump a slim public search index to
 * `public/data/search-index.json` so the static site can search/filter
 * entirely in the browser (no worker, no CPU limit).
 *
 * Excludes heavy fields (prompt, palette, blurDataUrl) to keep the
 * client download small. Card blur placeholders come from the
 * build-time prerender instead.
 *
 * Run: `tsx --env-file=.env scripts/export-images-json.ts`
 * (also runs automatically as part of `npm run build:static`)
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data", "search-index.json");

async function main() {
  const { getDb } = await import("../src/db/index.js");
  const { images } = await import("../src/db/schema.js");
  const { desc } = await import("drizzle-orm");

  const db = getDb();
  const rows = await db
    .select({
      id: images.id,
      title: images.title,
      description: images.description,
      category: images.category,
      tags: images.tags,
      thumbnailUrl: images.thumbnailUrl,
      url: images.url,
      width: images.width,
      height: images.height,
      downloads: images.downloads,
      trending: images.trending,
      createdAt: images.createdAt,
    })
    .from(images)
    .orderBy(desc(images.createdAt))
    .limit(5000);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ exportedAt: new Date().toISOString(), images: rows }));
  console.log(`Exported ${rows.length} images -> public/data/search-index.json`);
}

main().catch((err) => {
  console.error("export-images-json failed:", err);
  process.exit(1);
});
