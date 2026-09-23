"use client";

import * as React from "react";
import { SettingsForm } from "@/components/admin/settings-form";
import { StorageSettingsPanel } from "@/components/admin/storage-settings-panel";
import { PublishButton } from "@/components/admin/publish-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiGetAiSettings, apiGetStorageSettings, type AiSettings, type StorageSettings } from "@/lib/admin-api";

export default function AdminSettingsPage() {
  const [ai, setAi] = React.useState<AiSettings | null>(null);
  const [storage, setStorage] = React.useState<StorageSettings | null>(null);

  React.useEffect(() => {
    apiGetAiSettings().then(setAi).catch(() => setAi(null));
    apiGetStorageSettings().then(setStorage).catch(() => setStorage(null));
  }, []);

  if (!ai || !storage) {
    return <p className="text-sm text-muted-foreground">Loading settings…</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Admin Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your AI assistant configurations and external storage credentials.
          </p>
        </div>
        <PublishButton />
      </div>

      {/* Storage integration */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Storage Integration</CardTitle>
          <CardDescription>
            Choose your active storage provider and configure credentials for direct asset uploads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StorageSettingsPanel
            initialProvider={storage.storageProvider || "filegarden"}
            initialFgUserId={storage.fgUserId || ""}
            initialFgAuthCookie={storage.fgAuthCookie || ""}
            initialFgPublicId={storage.fgPublicId || ""}
            initialImgCdnApiKey={storage.imgCdnApiKey || ""}
          />
        </CardContent>
      </Card>

      {/* AI settings */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>AI Provider &amp; Vision Models</CardTitle>
          <CardDescription>
            Configure Vision AI models to generate metadata, descriptions, tags, and prompts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initialProvider={ai.provider}
            initialGeminiApiKey={ai.geminiApiKey}
            initialGeminiModel={ai.geminiModel}
            initialNvidiaApiKey={ai.nvidiaApiKey}
            initialNvidiaModel={ai.nvidiaModel}
            initialGroqApiKey={ai.groqApiKey}
            initialGroqModel={ai.groqModel}
            initialCloudflareAccountId={ai.cloudflareAccountId}
            initialCloudflareApiToken={ai.cloudflareApiToken}
            initialCloudflareModel={ai.cloudflareModel}
            initialMistralApiKey={ai.mistralApiKey}
            initialMistralModel={ai.mistralModel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
