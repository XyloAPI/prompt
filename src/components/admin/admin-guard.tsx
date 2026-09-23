"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { apiMe } from "@/lib/admin-api";

/**
 * Client-side auth gate for the static admin section.
 * The worker owns the session cookie; unauthenticated visitors
 * are bounced to /admin/login.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [authed, setAuthed] = React.useState<boolean | null>(() => (isLogin ? true : null));

  React.useEffect(() => {
    if (isLogin) return;
    let live = true;
    apiMe().then(({ authed: ok }) => {
      if (!live) return;
      if (!ok) {
        window.location.assign("/admin/login");
        return;
      }
      setAuthed(true);
    });
    return () => {
      live = false;
    };
  }, [isLogin]);

  if (authed !== true) {
    return <p className="text-sm text-muted-foreground">Checking session…</p>;
  }
  return <>{children}</>;
}
