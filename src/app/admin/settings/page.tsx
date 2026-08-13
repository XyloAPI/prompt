import type { Metadata } from "next";
import { getAiSettings } from "@/lib/ai-assistant";
import { SettingsForm } from "@/components/admin/settings-form";
import { FileGardenSettingsForm } from "@/components/admin/filegarden-settings-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getSetting } from "@/db/queries";

export const metadata: Metadata = { title: "Admin Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [aiSettings, fgUserId, fgAuthCookie, fgPublicId] = await Promise.all([
    getAiSettings(),
    getSetting("filegarden_user_id"),
    getSetting("filegarden_auth_cookie"),
    getSetting("filegarden_public_id"),
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
            Enable direct uploads when adding new assets to the library.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileGardenSettingsForm
            initialUserId={fgUserId || ""}
            initialAuthCookie={fgAuthCookie || ""}
            initialPublicId={fgPublicId || ""}
          />
        </CardContent>
      </Card>

      {/* AI settings */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>AI Provider & Vision Models</CardTitle>
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
          />
        </CardContent>
      </Card>
    </div>
  );
}