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
  GROQ_VISION_MODELS,
  CLOUDFLARE_VISION_MODELS,
  MISTRAL_VISION_MODELS,
} from "@/lib/ai-assistant";

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Google Gemini" },
  { value: "nvidia", label: "NVIDIA NIM" },
  { value: "groq", label: "Groq API" },
  { value: "cloudflare", label: "Cloudflare Workers AI" },
  { value: "mistral", label: "Mistral AI" },
];

export function SettingsForm({
  initialProvider,
  initialGeminiApiKey,
  initialGeminiModel,
  initialNvidiaApiKey,
  initialNvidiaModel,
  initialGroqApiKey,
  initialGroqModel,
  initialCloudflareAccountId,
  initialCloudflareApiToken,
  initialCloudflareModel,
  initialMistralApiKey,
  initialMistralModel,
}: {
  initialProvider: AiProvider;
  initialGeminiApiKey: string;
  initialGeminiModel: string;
  initialNvidiaApiKey: string;
  initialNvidiaModel: string;
  initialGroqApiKey: string;
  initialGroqModel: string;
  initialCloudflareAccountId?: string;
  initialCloudflareApiToken?: string;
  initialCloudflareModel?: string;
  initialMistralApiKey?: string;
  initialMistralModel?: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = React.useState<AiProvider>(initialProvider || "gemini");
  const [geminiApiKey, setGeminiApiKey] = React.useState(initialGeminiApiKey);
  const [geminiModel, setGeminiModel] = React.useState(initialGeminiModel);
  const [nvidiaApiKey, setNvidiaApiKey] = React.useState(initialNvidiaApiKey);
  const [nvidiaModel, setNvidiaModel] = React.useState(initialNvidiaModel);
  const [groqApiKey, setGroqApiKey] = React.useState(initialGroqApiKey);
  const [groqModel, setGroqModel] = React.useState(initialGroqModel);
  const [cloudflareAccountId, setCloudflareAccountId] = React.useState(initialCloudflareAccountId || "");
  const [cloudflareApiToken, setCloudflareApiToken] = React.useState(initialCloudflareApiToken || "");
  const [cloudflareModel, setCloudflareModel] = React.useState(initialCloudflareModel || "");
  const [mistralApiKey, setMistralApiKey] = React.useState(initialMistralApiKey || "");
  const [mistralModel, setMistralModel] = React.useState(initialMistralModel || "");

  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const activeApiKey =
    provider === "nvidia"
      ? nvidiaApiKey
      : provider === "groq"
      ? groqApiKey
      : provider === "cloudflare"
      ? cloudflareApiToken
      : provider === "mistral"
      ? mistralApiKey
      : geminiApiKey;

  async function handleSave() {
    setSaving(true);
    try {
      const form = new FormData();
      form.set("provider", provider);
      form.set("geminiApiKey", geminiApiKey);
      form.set("geminiModel", geminiModel);
      form.set("nvidiaApiKey", nvidiaApiKey);
      form.set("nvidiaModel", nvidiaModel);
      form.set("groqApiKey", groqApiKey);
      form.set("groqModel", groqModel);
      form.set("cloudflareAccountId", cloudflareAccountId);
      form.set("cloudflareApiToken", cloudflareApiToken);
      form.set("cloudflareModel", cloudflareModel);
      form.set("mistralApiKey", mistralApiKey);
      form.set("mistralModel", mistralModel);

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

        {provider === "groq" && (
          <>
            <Field>
              <FieldLabel>Groq API Key</FieldLabel>
              <Input
                id="groq_api_key_input"
                name="groq_api_key"
                type="text"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="gsk_..."
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
              />
            </Field>
            <Field>
              <FieldLabel>Groq Vision Model</FieldLabel>
              <FormSelect
                name="groqModel"
                defaultValue={groqModel}
                items={GROQ_VISION_MODELS}
                onValueChange={setGroqModel}
              />
            </Field>
          </>
        )}

        {provider === "cloudflare" && (
          <>
            <Field>
              <FieldLabel>Cloudflare Account ID</FieldLabel>
              <Input
                id="cloudflare_account_id_input"
                name="cloudflare_account_id"
                type="text"
                value={cloudflareAccountId}
                onChange={(e) => setCloudflareAccountId(e.target.value)}
                placeholder="Account ID"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field>
              <FieldLabel>Cloudflare API Token</FieldLabel>
              <Input
                id="cloudflare_api_token_input"
                name="cloudflare_api_token"
                type="text"
                value={cloudflareApiToken}
                onChange={(e) => setCloudflareApiToken(e.target.value)}
                placeholder="API Token"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
              />
            </Field>
            <Field>
              <FieldLabel>Cloudflare Vision Model</FieldLabel>
              <FormSelect
                name="cloudflareModel"
                defaultValue={cloudflareModel}
                items={CLOUDFLARE_VISION_MODELS}
                onValueChange={setCloudflareModel}
              />
            </Field>
          </>
        )}

        {provider === "mistral" && (
          <>
            <Field>
              <FieldLabel>Mistral API Key</FieldLabel>
              <Input
                id="mistral_api_key_input"
                name="mistral_api_key"
                type="text"
                value={mistralApiKey}
                onChange={(e) => setMistralApiKey(e.target.value)}
                placeholder="Mistral API Key"
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
              />
            </Field>
            <Field>
              <FieldLabel>Mistral Vision Model</FieldLabel>
              <FormSelect
                name="mistralModel"
                defaultValue={mistralModel}
                items={MISTRAL_VISION_MODELS}
                onValueChange={setMistralModel}
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
          {testing
            ? "Testing…"
            : `Test connection (${
                provider === "nvidia"
                  ? "NVIDIA NIM"
                  : provider === "groq"
                  ? "Groq"
                  : provider === "cloudflare"
                  ? "Cloudflare"
                  : provider === "mistral"
                  ? "Mistral"
                  : "Gemini"
              })`}
        </Button>
      </div>
    </div>
  );
}