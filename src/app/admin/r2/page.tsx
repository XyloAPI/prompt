import type { Metadata } from "next";
import { getR2Accounts, getR2Buckets } from "@/db/queries";
import {
  AccountDialogForm,
  AddBucketDialog,
  EditBucketDialog,
  DeleteBucketButton,
  DeleteAccountButton,
  SyncBucketButton,
} from "@/components/admin/r2-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "R2 Storage" };
export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default async function AdminR2Page() {
  const [accounts, buckets] = await Promise.all([getR2Accounts(), getR2Buckets()]);
  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Cloudflare R2</h2>
        </div>
        <div className="flex gap-2">
          <AddBucketDialog accounts={accountOptions} />
          <AccountDialogForm />
        </div>
      </div>

      {/* Accounts */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Accounts</h3>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No R2 accounts yet. Add one to start uploading.
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const accountBuckets = buckets.filter((b) => b.accountId === account.id);
              const totalUsed = accountBuckets.reduce((s, b) => s + (b.usedBytes ?? 0), 0);
              const totalQuota = accountBuckets.reduce((s, b) => s + (b.quotaBytes ?? 0), 0);
              return (
                <Card key={account.id}>
                  <CardHeader className="flex-row items-start justify-between">
                    <div>
                      <CardTitle>{account.name}</CardTitle>
                      <CardDescription>{account.accountId}</CardDescription>
                    </div>
                    <DeleteAccountButton account={account} />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {accountBuckets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No buckets.</p>
                    ) : (
                      <div className="space-y-2">
                        {accountBuckets.map((bucket) => {
                          const pct = bucket.quotaBytes
                            ? Math.min(100, ((bucket.usedBytes ?? 0) / bucket.quotaBytes) * 100)
                            : 0;
                          return (
                            <div
                              key={bucket.id}
                              className="rounded-xl border border-border/60 bg-muted/20 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{bucket.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBytes(bucket.usedBytes ?? 0)} of {formatBytes(bucket.quotaBytes ?? 0)} used
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <EditBucketDialog bucket={bucket} />
                                  <SyncBucketButton bucket={bucket} />
                                  <DeleteBucketButton bucket={bucket} />
                                </div>
                              </div>
                              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Total: {formatBytes(totalUsed)} of {formatBytes(totalQuota)} across{" "}
                      {accountBuckets.length} bucket{accountBuckets.length === 1 ? "" : "s"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}