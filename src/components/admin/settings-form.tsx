"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveAiSettingsAction, testAiAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/admin/form-select";
import {
  AiProvider,
  GEMINI_VISION_MODELS,
  NVIDIA_VISION_MODELS,
} from "@/lib/ai-assistant";

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "nvidia", label: "NVIDIA NIM" },
];

export function SettingsForm({
  initialProvider,
  initialGeminiApiKey,
  initialGeminiModel,
  initialNvidiaApiKey,
  initialNvidiaModel,
}: {
  initialProvider: AiProvider;
  initialGeminiApiKey: string;
  initialGeminiModel: string;
  initialNvidiaApiKey: string;
  initialNvidiaModel: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = React.useState<AiProvider>(initialProvider || "gemini");
  const [geminiApiKey, setGeminiApiKey] = React.useState(initialGeminiApiKey);
  const [geminiModel, setGeminiModel] = React.useState(initialGeminiModel);
  const [nvidiaApiKey, setNvidiaApiKey] = React.useState(initialNvidiaApiKey);
  const [nvidiaModel, setNvidiaModel] = React.useState(initialNvidiaModel);

  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const activeApiKey = provider === "nvidia" ? nvidiaApiKey : geminiApiKey;

  async function handleSave() {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("provider", provider);
      form.set("geminiApiKey", geminiApiKey);
      form.set("geminiModel", geminiModel);
      form.set("nvidiaApiKey", nvidiaApiKey);
      form.set("nvidiaModel", nvidiaModel);

      const res = await saveAiSettingsAction({}, form);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("AI Settings saved successfully");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await testAiAction();
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message || "Connection OK!");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel>Active AI Provider</FieldLabel>
          <FormSelect
            name="provider"
            defaultValue={provider}
            items={PROVIDER_OPTIONS}
            onValueChange={(val) => setProvider(val as AiProvider)}
          />
        </Field>

        {provider === "gemini" && (
          <>
            <Field>
              <FieldLabel>Gemini API Key</FieldLabel>
              <Input
                id="gemini_api_key_input"
                name="gemini_api_key"
                type="text"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
              />
            </Field>
            <Field>
              <FieldLabel>Gemini Vision Model</FieldLabel>
              <FormSelect
                name="geminiModel"
                defaultValue={geminiModel}
                items={GEMINI_VISION_MODELS}
                onValueChange={setGeminiModel}
              />
            </Field>
          </>
        )}

        {provider === "nvidia" && (
          <>
            <Field>
              <FieldLabel>NVIDIA NIM API Key</FieldLabel>
              <Input
                id="nvidia_api_key_input"
                name="nvidia_api_key"
                type="text"
                value={nvidiaApiKey}
                onChange={(e) => setNvidiaApiKey(e.target.value)}
                placeholder="nvapi-..."
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
              />
            </Field>
            <Field>
              <FieldLabel>NVIDIA NIM Vision Model</FieldLabel>
              <FormSelect
                name="nvidiaModel"
                defaultValue={nvidiaModel}
                items={NVIDIA_VISION_MODELS}
                onValueChange={setNvidiaModel}
              />
            </Field>
          </>
        )}
      </FieldGroup>

      <div className="flex gap-2 pt-2">
        <RippleButton
          type="button"
          className="rounded-full"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save settings"}
          <RippleButtonRipples />
        </RippleButton>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={testing || !activeApiKey}
          onClick={handleTest}
        >
          {testing ? "Testing…" : `Test connection (${provider === "nvidia" ? "NVIDIA NIM" : "Gemini"})`}
        </Button>
      </div>
    </div>
  );
}