"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveFileGardenSettingsAction } from "@/app/admin/actions";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function FileGardenSettingsForm({
  initialUserId,
  initialAuthCookie,
  initialPublicId,
}: {
  initialUserId: string;
  initialAuthCookie: string;
  initialPublicId: string;
}) {
  const router = useRouter();
  const [userId, setUserId] = React.useState(initialUserId);
  const [authCookie, setAuthCookie] = React.useState(initialAuthCookie);
  const [publicId, setPublicId] = React.useState(initialPublicId);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!userId.trim()) {
      toast.error("Storage User ID is required.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("userId", userId.trim());
      form.set("authCookie", authCookie.trim());
      form.set("publicId", publicId.trim());

      const res = await saveFileGardenSettingsAction({}, form);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Storage settings saved!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel>User ID / Hash</FieldLabel>
          <Input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g. 6428c0db14e59048a12bc8f4"
            spellCheck={false}
            required
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            This is your alphanumeric user identifier found in the Storage URLs or API endpoints.
          </p>
        </Field>

        <Field>
          <FieldLabel>Public URL Identifier</FieldLabel>
          <Input
            type="text"
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
            placeholder="e.g. ae1-BGGpjxW7ELpI"
            spellCheck={false}
            required
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            The folder name used in your public direct links (e.g. if your link is file.garden/abc-XYZ/file.png, enter abc-XYZ).
          </p>
        </Field>

        <Field>
          <FieldLabel>Auth Cookie Value</FieldLabel>
          <Input
            type="text"
            value={authCookie}
            onChange={(e) => setAuthCookie(e.target.value)}
            placeholder="auth=..."
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            The cookie value (inspect request header `Cookie: auth=...` on the storage provider website).
          </p>
        </Field>
      </FieldGroup>

      <div className="pt-2">
        <RippleButton
          type="button"
          className="rounded-full"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save settings"}
          <RippleButtonRipples />
        </RippleButton>
      </div>
    </div>
  );
}
