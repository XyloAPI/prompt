import { getSetting } from "@/db/queries";

export async function getFileGardenConfig() {
  const userId = process.env.FILEGARDEN_USER_ID || (await getSetting("filegarden_user_id")) || "";
  const authCookie = process.env.FILEGARDEN_AUTH_COOKIE || (await getSetting("filegarden_auth_cookie")) || "";
  const publicId = (await getSetting("filegarden_public_id")) || userId;
  return { userId, authCookie, publicId };
}
