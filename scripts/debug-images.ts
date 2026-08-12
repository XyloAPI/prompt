import { db } from "../src/db";
import { images } from "../src/db/schema";

async function main() {
  const rows = await db.select().from(images).all();
  console.log("count:", rows.length);
  for (const r of rows.slice(0, 10)) {
    console.log(`${r.id} | ${r.title} | ${r.url}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });