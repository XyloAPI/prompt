"use client";

import * as React from "react";
import { toast } from "sonner";
import { RocketLaunch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { apiPublish } from "@/lib/admin-api";

/**
 * Triggers a rebuild + redeploy of the static public site
 * via the mini worker (which holds the Pages deploy hook URL).
 */
export function PublishButton() {
  const [pending, setPending] = React.useState(false);

  async function handlePublish() {
    setPending(true);
    try {
      const res = await apiPublish();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Rebuild triggered — changes go live in 1–2 minutes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handlePublish}
      disabled={pending}
      className="gap-1.5 rounded-full"
    >
      <RocketLaunch className="size-4" />
      {pending ? "Publishing…" : "Publish site"}
    </Button>
  );
}
