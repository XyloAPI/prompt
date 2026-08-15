import type { Metadata } from "next";
import { getAiSettings } from "@/lib/ai-assistant";
import { SettingsForm } from "@/components/admin/settings-form";
import { StorageSettingsPanel } from "@/components/admin/storage-settings-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSetting } from "@/db/queries";

export const metadata: Metadata = { title: "Admin Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [
    aiSettings,
    storageProvider,
    fgUserId,
    fgAuthCookie,
    fgPublicId,
    imgCdnApiKey,
  ] = await Promise.all([
    getAiSettings(),
    getSetting("storage_provider"),
    getSetting("filegarden_user_id"),
    getSetting("filegarden_auth_cookie"),
    getSetting("filegarden_public_id"),
    getSetting("imgcdn_api_key"),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Admin Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your AI assistant configurations and external storage credentials.
        </p>
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
            initialProvider={storageProvider || "filegarden"}
            initialFgUserId={fgUserId || ""}
            initialFgAuthCookie={fgAuthCookie || ""}
            initialFgPublicId={fgPublicId || ""}
            initialImgCdnApiKey={imgCdnApiKey || ""}
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
            initialProvider={aiSettings.provider}
            initialGeminiApiKey={aiSettings.geminiApiKey}
            initialGeminiModel={aiSettings.geminiModel}
            initialNvidiaApiKey={aiSettings.nvidiaApiKey}
            initialNvidiaModel={aiSettings.nvidiaModel}
            initialGroqApiKey={aiSettings.groqApiKey}
            initialGroqModel={aiSettings.groqModel}
            initialCloudflareAccountId={aiSettings.cloudflareAccountId}
            initialCloudflareApiToken={aiSettings.cloudflareApiToken}
            initialCloudflareModel={aiSettings.cloudflareModel}
            initialMistralApiKey={aiSettings.mistralApiKey}
            initialMistralModel={aiSettings.mistralModel}
          />
        </CardContent>
      </Card>
    </div>
  );
}