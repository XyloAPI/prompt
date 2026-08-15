"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveStorageProviderAction } from "@/app/admin/actions";
import { FileGardenSettingsForm } from "@/components/admin/filegarden-settings-form";
import { ImgCdnSettingsForm } from "@/components/admin/imgcdn-settings-form";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  {
    id: "filegarden" as const,
    name: "File Garden",
    description: "file.garden — authenticated file hosting",
  },
  {
    id: "imgcdn" as const,
    name: "ImgCDN",
    description: "imgcdn.dev — Cloudflare-powered CDN",
  },
];

type ProviderId = (typeof PROVIDERS)[number]["id"];

export function StorageSettingsPanel({
  initialProvider,
  initialFgUserId,
  initialFgAuthCookie,
  initialFgPublicId,
  initialImgCdnApiKey,
}: {
  initialProvider: string;
  initialFgUserId: string;
  initialFgAuthCookie: string;
  initialFgPublicId: string;
  initialImgCdnApiKey: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = React.useState<ProviderId>(
    (initialProvider as ProviderId) || "filegarden"
  );
  const [switching, setSwitching] = React.useState(false);

  async function handleProviderChange(id: ProviderId) {
    if (id === provider) return;
    setSwitching(true);
    try {
      const form = new FormData();
      form.set("provider", id);
      const res = await saveStorageProviderAction({}, form);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      setProvider(id);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch provider.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Provider Selector */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Active Storage Provider</p>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map(({ id, name, description }) => {
            const active = provider === id;
            return (
              <button
                key={id}
                type="button"
                disabled={switching}
                onClick={() => handleProviderChange(id)}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border/60 bg-muted/10 hover:bg-muted/20 hover:border-border"
                )}
              >
                <span className="text-sm font-semibold text-foreground">{name}</span>
                <span className="text-[11px] text-muted-foreground">{description}</span>
                {active && (
                  <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Provider-specific config */}
      {provider === "filegarden" ? (
        <FileGardenSettingsForm
          initialUserId={initialFgUserId}
          initialAuthCookie={initialFgAuthCookie}
          initialPublicId={initialFgPublicId}
        />
      ) : (
        <ImgCdnSettingsForm initialApiKey={initialImgCdnApiKey} />
      )}
    </div>
  );
}
