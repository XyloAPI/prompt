import { cookies } from "next/headers";

export const ADMIN_COOKIE = "luminaq_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function hash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function expectedToken(): Promise<string> {
  return hash(process.env.ADMIN_PASSWORD ?? "luminaq-admin");
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return Boolean(token && token === await expectedToken());
}

export async function validateToken(token: string | undefined): Promise<boolean> {
  return Boolean(token && token === await expectedToken());
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  try {
    const store = await cookies();
    if (password === (process.env.ADMIN_PASSWORD ?? "luminaq-admin")) {
      store.set(ADMIN_COOKIE, await expectedToken(), {
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
