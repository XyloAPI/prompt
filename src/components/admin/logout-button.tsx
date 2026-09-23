"use client";

import { Button } from "@/components/ui/button";
import { apiLogout } from "@/lib/admin-api";

export function LogoutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await apiLogout();
        window.location.assign("/admin/login");
      }}
    >
      Log out
    </Button>
  );
}
