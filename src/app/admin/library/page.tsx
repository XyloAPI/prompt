import Link from "next/link";
import { HardDrives, ImageSquare, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { listImages } from "@/lib/data";
import { getR2Buckets, getR2Accounts, getSetting } from "@/db/queries";
import { GEMINI_MODEL_SETTING, DEFAULT_GEMINI_MODEL } from "@/lib/gemini";
import { LibraryGrid } from "@/components/admin/library-grid";
import { UploadDialog } from "@/components/admin/upload-dialog";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminLibraryPage() {
  const [images, buckets, accounts, modelSetting] = await Promise.all([
    listImages(),
    getR2Buckets(),
    getR2Accounts(),
    getSetting(GEMINI_MODEL_SETTING),
  ]);
  const model = modelSetting ?? DEFAULT_GEMINI_MODEL;
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const bucketOptions = buckets.map((b) => ({
    value: b.id,
    label: `${b.name} (${accountNames.get(b.accountId) ?? "?"})`,
  }));

  const totalDownloads = images.reduce((s, i) => s + (i.downloads ?? 0), 0);
  const totalStorage = formatBytes(images.reduce((s, i) => s + (i.sizeBytes ?? 0), 0));

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Media Library</h2>
        </div>

        <div className="flex items-center gap-2">
          {bucketOptions.length > 0 ? (
            <UploadDialog bucketOptions={bucketOptions} model={model} />
          ) : (
            <Link
              href="/admin/r2"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Configure R2 to Upload
            </Link>
          )}

          <Link
            href="/admin/r2"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HardDrives className="size-3.5" />
            <span>Manage Storage</span>
          </Link>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-3 gap-3">
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

        <Card className="border-border/50 bg-muted/20 py-3 px-4 shadow-none">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground">
              <HardDrives className="size-4.5" weight="bold" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Used Storage</p>
              <p className="text-lg font-bold tracking-tight text-foreground font-mono">
                {totalStorage}
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}