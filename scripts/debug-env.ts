import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { images } from "../src/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  console.log("url?", Boolean(url), "token?", Boolean(token));
  const client = createClient({ url: url!, authToken: token });
  const db = drizzle(client, { schema: { images } });
  try {
    const rows = await db.select().from(images).all();
    console.log("query ok, rows:", rows.length);
  } catch (e) {
    console.log("query FAILED:", e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});