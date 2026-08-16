import { getErrorLogs } from "@/db/queries";
import { isAdmin } from "@/lib/auth";
import { unauthorized } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogsClient } from "./logs-client";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  if (!(await isAdmin())) return unauthorized();

  const logs = await getErrorLogs();

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

      <LogsClient initialLogs={logs} />
    </div>
  );
}
