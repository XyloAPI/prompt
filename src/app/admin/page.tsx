import Link from "next/link";
import {
  ArrowUpRight,
  HardDrives,
  ImageSquare,
  PlusCircle,
  TrendUp,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr";
import { getDashboardData, formatBytes } from "@/lib/dashboard-data";
import { UploadsChart, CategoryChart, TopTagsChart, TopDownloadsChart, BucketUsageChart } from "@/components/charts/dashboard-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  const statCards = [
    {
      label: "Total images",
      value: data.stats.images.toLocaleString(),
      icon: ImageSquare,
    },
    {
      label: "Total downloads",
      value: data.stats.downloads.toLocaleString(),
      icon: DownloadSimple,
    },
    {
      label: "Storage used",
      value: formatBytes(data.stats.storageBytes),
      icon: HardDrives,
    },
    {
      label: "Daily picks",
      value: data.stats.dailyPicks.toLocaleString(),
      icon: TrendUp,
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Dashboard</h2>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/library"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <PlusCircle className="size-4" />
            Upload image
          </Link>
          <Link
            href="/admin/library"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Open library
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-semibold tracking-tight">{s.value}</CardTitle>
                <CardDescription className="mt-1">{s.label}</CardDescription>
              </div>
              <s.icon className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <Separator />

      {/* Activity + category */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Uploads — last 30 days</CardTitle>
            <CardDescription>Images added to the library per day.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.uploadsByDay.every((d) => d.count === 0) ? (
              <EmptyChart label="No uploads in the last 30 days." />
            ) : (
              <UploadsChart data={data.uploadsByDay} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
            <CardDescription>Distribution across the library.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byCategory.length === 0 ? (
              <EmptyChart label="No images yet." />
            ) : (
              <CategoryChart data={data.byCategory} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tags + downloads */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top tags</CardTitle>
            <CardDescription>Most frequently used tags.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topTags.length === 0 ? (
              <EmptyChart label="No tags yet." />
            ) : (
              <TopTagsChart data={data.topTags} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most downloaded</CardTitle>
            <CardDescription>Top images by download count.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topDownloaded.every((d) => d.value === 0) ? (
              <EmptyChart label="No downloads recorded yet." />
            ) : (
              <TopDownloadsChart data={data.topDownloaded} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage monitor */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Storage monitoring</CardTitle>
            <CardDescription>R2 bucket usage vs quota.</CardDescription>
          </div>
          <Link href="/admin/r2" className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
            Manage R2
          </Link>
        </CardHeader>
        <CardContent>
          {data.bucketUsage.length === 0 ? (
            <EmptyChart label="No R2 buckets configured." />
          ) : (
            <div className="space-y-6">
              <BucketUsageChart data={data.bucketUsage} />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.bucketUsage.map((b) => (
                  <div key={b.name} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="truncate text-sm font-medium">{b.name}</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className={b.pct > 85 ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-primary"}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatBytes(b.usedBytes)} of {formatBytes(b.quotaBytes)} · {b.pct.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}