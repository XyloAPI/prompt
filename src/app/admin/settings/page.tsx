import type { Metadata } from "next";
import { getAiSettings } from "@/lib/ai-assistant";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAiSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">AI Assistant Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure Vision AI models to generate metadata, descriptions, tags, and prompts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider & Vision Models</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initialProvider={settings.provider}
            initialGeminiApiKey={settings.geminiApiKey}
            initialGeminiModel={settings.geminiModel}
            initialNvidiaApiKey={settings.nvidiaApiKey}
            initialNvidiaModel={settings.nvidiaModel}
          />
        </CardContent>
      </Card>
    </div>
  );
}