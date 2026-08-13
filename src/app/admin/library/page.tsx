import Link from "next/link";
import { ImageSquare, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { listImages } from "@/lib/data";
import { getAiSettings } from "@/lib/ai-assistant";
import { LibraryGrid } from "@/components/admin/library-grid";
import { UploadDialog } from "@/components/admin/upload-dialog";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminLibraryPage() {
  const [images, aiSettings] = await Promise.all([
    listImages(),
    getAiSettings(),
  ]);
  const model = aiSettings.provider === "nvidia" ? aiSettings.nvidiaModel : aiSettings.geminiModel;

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