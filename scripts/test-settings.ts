import { getAllSettings } from "../src/db/queries";

async function main() {
  console.log("Fetching all settings...");
  try {
    const settings = await getAllSettings();
    console.log("Settings found:");
    const sanitized = settings.map(s => {
      let val = s.value;
      if (s.key.includes("key") || s.key.includes("token") || s.key.includes("cookie")) {
        val = val ? `[CONFIGURED (length: ${val.length})]` : "[EMPTY]";
      }
      return { key: s.key, value: val, updatedAt: s.updatedAt };
    });
    console.dir(sanitized, { depth: null });
  } catch (err) {
    console.error("Error fetching settings:", err);
  }
}

main();
