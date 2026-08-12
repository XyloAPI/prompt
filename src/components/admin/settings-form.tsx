"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveGeminiSettingsAction, testGeminiAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/admin/form-select";

const MODEL_OPTIONS = [
  { value: "gemini-3.5-flash", label: "gemini-3.5-flash (recommended)" },
  { value: "gemini-3.5-flash-lite", label: "gemini-3.5-flash-lite" },
  { value: "gemini-3-flash-preview", label: "gemini-3-flash-preview (preview)" },
];

export function SettingsForm({
  initialApiKey,
  initialModel,
}: {
  initialApiKey: string;
  initialModel: string;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = React.useState(initialApiKey);
  const [model, setModel] = React.useState(initialModel);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("apiKey", apiKey);
      form.set("model", model);
      const res = await saveGeminiSettingsAction({}, form);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Settings saved");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await testGeminiAction();
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Gemini connection OK");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <FieldGroup>
        <Field>
          <FieldLabel>API key</FieldLabel>
          <Input
            id="gemini_api_key_input"
            name="gemini_api_key"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
          />
        </Field>
        <Field>
          <FieldLabel>Model</FieldLabel>
          <FormSelect
            name="model"
            defaultValue={model}
            items={MODEL_OPTIONS}
            onValueChange={setModel}
          />
        </Field>
      </FieldGroup>
      <div className="flex gap-2">
        <RippleButton type="button" className="rounded-full" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save settings"}
          <RippleButtonRipples />
        </RippleButton>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={testing || !apiKey}
          onClick={handleTest}
        >
          {testing ? "Testing…" : "Test connection"}
        </Button>
      </div>
    </div>
  );
}