import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, validateToken } from "@/lib/auth";

const ADMIN_PATHS = [
  "/admin",
  "/admin/library",
  "/admin/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*"],
};