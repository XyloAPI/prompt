import { createHash } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "luminaq_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function expectedToken(): string {
  return hash(process.env.ADMIN_PASSWORD ?? "luminaq-admin");
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return Boolean(token && token === expectedToken());
}

export function validateToken(token: string | undefined): boolean {
  return Boolean(token && token === expectedToken());
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  try {
    const store = await cookies();
    if (password === (process.env.ADMIN_PASSWORD ?? "luminaq-admin")) {
      store.set(ADMIN_COOKIE, expectedToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: ADMIN_COOKIE_MAX_AGE,
      });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
