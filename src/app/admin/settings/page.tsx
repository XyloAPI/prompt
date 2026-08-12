import type { Metadata } from "next";
import { getSetting } from "@/db/queries";
import { GEMINI_API_KEY_SETTING, GEMINI_MODEL_SETTING, DEFAULT_GEMINI_MODEL } from "@/lib/gemini";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const apiKey = (await getSetting(GEMINI_API_KEY_SETTING)) ?? "";
  const model = (await getSetting(GEMINI_MODEL_SETTING)) ?? DEFAULT_GEMINI_MODEL;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gemini API ({model})</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm initialApiKey={apiKey} initialModel={model} />
        </CardContent>
      </Card>
    </div>
  );
}