"use client";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/admin/actions";

export function LogoutButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => logoutAction()}>
      Log out
    </Button>
  );
}
