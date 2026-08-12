import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  const client = createClient({ url, authToken: token });

  const rows = await client.execute(`SELECT id, r2_key, url, thumbnail_url FROM images`);
  let fixed = 0;
  for (const row of rows.rows) {
    const url = String(row.url ?? "");
    const thumb = String(row.thumbnail_url ?? "");
    const r2Key = String(row.r2_key ?? "");
    const id = String(row.id);

    if (thumb.includes("%2F") || url.includes("%2F")) {
      const slug = r2Key.split("/").pop() ?? "";
      if (slug) {
        const bucket = url.split("/").filter(Boolean)[0] ?? "cdn1";
        const category = url.split("/")[3] ?? "photo";
        const newUrl = `/${bucket}/uploads/${category}/${slug}`;
        const newThumb = newUrl;
        await client.execute({
          sql: `UPDATE images SET url = ?, thumbnail_url = ? WHERE id = ?`,
          args: [newUrl, newThumb, id],
        });
        fixed++;
        console.log(`Fixed ${id}: ${newUrl} (thumbnail -> master)`);
      }
    }
  }
  // Images created before the preview feature point at a /preview/ object that
  // does not exist in R2 — fall the thumbnail back to the master URL.
  const stale = await client.execute({
    sql: `UPDATE images SET thumbnail_url = url WHERE thumbnail_url LIKE '%/preview/%'`,
    args: [],
  });
  if (stale.rowsAffected > 0) {
    fixed += Number(stale.rowsAffected);
    console.log(`Fell back ${Number(stale.rowsAffected)} thumbnail(s) to master URL.`);
  }

  console.log(`Fixed ${fixed} row(s).`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});