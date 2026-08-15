import { getSetting } from "@/db/queries";

export async function getImgCdnConfig() {
  const apiKey = process.env.IMGCDN_API_KEY || (await getSetting("imgcdn_api_key")) || "";
  return { apiKey };
}
