/**
 * Edge Middleware (Proxy) — serves R2 assets plus the admin route guard.
 *
 * Asset URLs like /cdn1/uploads/<filetype>/preview/<uuid>.<format> are
 * answered directly here (with R2 proxying + edge cache) and short-circuit
 * BEFORE the Next.js server runs, so image requests carry minimal overhead
 * and never hit the worker's resource limits.
 *
 * NOTE: This was originally proxy.ts (Next.js 16 convention) but has been
 * renamed to middleware.ts for compatibility with @opennextjs/cloudflare.
 * Revert once OpenNext adds proxy.ts support.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, validateToken } from "@/lib/auth";
import { serveR2Object } from "@/lib/r2-proxy";

const ADMIN_PATHS = [
  "/admin",
  "/admin/library",
  "/admin/r2",
  "/admin/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip trailing slash to keep parsing predictable.
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  // Serve R2 assets before the Next server runs.
  const uploadsIdx = clean.indexOf("/uploads/");
  if (uploadsIdx > 0) {
    const after = clean.slice(uploadsIdx + "/uploads/".length).split("/");
    // Format: <bucket>/uploads/<filetype>/<...rest>
    if (after.length >= 2) {
      const rest = after.slice(1);
      const response = await serveR2Object(
        request,
        decodeURIComponent(clean.slice(0, uploadsIdx).split("/").pop() ?? ""),
        rest.map((p) => decodeURIComponent(p))
      );
      return response;
    }
  }

  if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const isLogin = pathname === "/admin/login";
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const authed = await validateToken(token);

    if (isLogin) {
      if (authed) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    if (!authed) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/:bucketName/uploads/:path*"],
};