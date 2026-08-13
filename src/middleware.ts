/**
 * Edge Middleware — Admin route guard.
 *
 * NOTE: This was originally proxy.ts (Next.js 16 convention) but has been
 * renamed to middleware.ts for compatibility with @opennextjs/cloudflare,
 * which does not yet support the Node.js-runtime proxy.ts architecture.
 * Revert once OpenNext adds proxy.ts support.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, validateToken } from "@/lib/auth";

const ADMIN_PATHS = [
  "/admin",
  "/admin/library",
  "/admin/r2",
  "/admin/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
