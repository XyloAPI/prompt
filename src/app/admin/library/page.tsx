"use client";

import * as React from "react";
import { ImageSquare, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { apiGetAiSettings, apiGetImages } from "@/lib/admin-api";
import { DEFAULT_GEMINI_MODEL } from "@/lib/ai-models";
import type { Image } from "@/db/schema";
import { LibraryGrid } from "@/components/admin/library-grid";
import { UploadDialog } from "@/components/admin/upload-dialog";
import { Card } from "@/components/ui/card";

export default function AdminLibraryPage() {
  const [images, setImages] = React.useState<Image[] | null>(null);
  const [model, setModel] = React.useState<string>(DEFAULT_GEMINI_MODEL);

  React.useEffect(() => {
    apiGetImages().then(setImages).catch(() => setImages([]));
    apiGetAiSettings()
      .then((s) => {
        setModel(
          s.provider === "nvidia"
            ? s.nvidiaModel
            : s.provider === "groq"
              ? s.groqModel
              : s.provider === "cloudflare"
                ? s.cloudflareModel
                : s.provider === "mistral"
                  ? s.mistralModel
                  : s.geminiModel
        );
      })
      .catch(() => {});
  }, []);

  if (!images) {
    return <p className="text-sm text-muted-foreground">Loading library…</p>;
  }

  const totalDownloads = images.reduce((s, i) => s + (i.downloads ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Media Library</h2>
        </div>

        <div className="flex items-center gap-2">
          <UploadDialog model={model} />
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/50 bg-muted/20 py-3 px-4 shadow-none">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground">
              <ImageSquare className="size-4.5" weight="bold" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Total Assets</p>
              <p className="text-lg font-bold tracking-tight text-foreground font-mono">
                {images.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-border/50 bg-muted/20 py-3 px-4 shadow-none">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground">
              <DownloadSimple className="size-4.5" weight="bold" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Downloads</p>
              <p className="text-lg font-bold tracking-tight text-foreground font-mono">
                {totalDownloads.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Library Catalog */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-6 shadow-xs">
        <LibraryGrid images={images} model={model} />
      </div>
    </div>
  );
}
