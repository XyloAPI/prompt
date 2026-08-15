"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveImgCdnSettingsAction } from "@/app/admin/actions";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ImgCdnSettingsForm({
  initialApiKey,
}: {
  initialApiKey: string;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = React.useState(initialApiKey);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    if (!apiKey.trim()) {
      toast.error("ImgCDN API key is required.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("apiKey", apiKey.trim());

      const res = await saveImgCdnSettingsAction({}, form);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("ImgCDN settings saved!");
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
          <FieldLabel>API Key</FieldLabel>
          <Input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Your imgcdn.dev API v1 key"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
          />

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
