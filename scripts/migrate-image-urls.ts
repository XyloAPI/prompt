import { db } from "../src/db";
import { images, r2Buckets } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const rows = await db.select().from(images).all();
  const buckets = await db.select().from(r2Buckets).all();
  const bucketNames = new Map(buckets.map((b) => [b.id, b.name]));

  let updated = 0;
  for (const row of rows) {
    if (row.url.startsWith("https://picsum.photos")) continue;
    if (!row.bucketId || !row.r2Key) {
      console.log(`skip ${row.id}: no bucketId/r2Key`);
      continue;
    }
    const bucketName = bucketNames.get(row.bucketId);
    if (!bucketName) {
      console.log(`skip ${row.id}: bucket not found`);
      continue;
    }
    const slug = row.r2Key.split("/").pop() ?? row.r2Key;
    const url = `/${encodeURIComponent(bucketName)}/uploads/${encodeURIComponent(row.category)}/${encodeURIComponent(slug)}`;
    await db
      .update(images)
      .set({ url, thumbnailUrl: url })
      .where(eq(images.id, row.id));
    console.log(`migrated ${row.id} -> ${url}`);
    updated++;
  }

  console.log(`Done. Updated ${updated} images.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });