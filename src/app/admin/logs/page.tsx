import { AdminNav } from "@/components/admin/admin-nav";
import { LogsClient } from "./logs-client";

export default function AdminLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">System Logs</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor client and server-side unhandled errors and rejections.
          </p>
        </div>
      </div>

      <AdminNav />

      <LogsClient />
    </div>
  );
}
