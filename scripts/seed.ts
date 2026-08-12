import { db } from "../src/db";
import { images } from "../src/db/schema";

async function main() {
  const rows = await db.select().from(images).all();
  console.log(`Database ready. ${rows.length} image(s) present.`);
  console.log("No seed data is inserted automatically — upload real images from Admin → Upload.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });