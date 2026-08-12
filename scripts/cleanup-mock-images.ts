import { db } from "../src/db";
import { images } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db
    .delete(images)
    .where(sql`substr(${images.id}, 1, 1) = 'i'`);
  console.log(`Deleted ${result.rowsAffected} mock images.`);
  const remaining = await db.select().from(images).all();
  console.log(`Remaining images: ${remaining.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });