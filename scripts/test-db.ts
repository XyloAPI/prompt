import { getDb } from "../src/db";
import { errorLogs } from "../src/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  console.log("Fetching latest error logs...");
  try {
    const db = getDb();
    const logs = await db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(10);
    console.log("Recent Error Logs:");
    console.dir(logs, { depth: null });
  } catch (err) {
    console.error("Failed to fetch logs:", err);
  }
}

main();
