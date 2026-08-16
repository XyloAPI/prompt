"use client";

import * as React from "react";
import type { ErrorLog } from "@/db/schema";
import {
  Bug,
  Trash,
  Check,
  CalendarBlank,
  Globe,
  Monitor,
  CaretDown,
  CaretUp,
  MagnifyingGlass,
  Warning,
} from "@phosphor-icons/react";
import { resolveErrorLogAction, deleteErrorLogAction } from "@/app/admin/actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogsClient({ initialLogs }: { initialLogs: ErrorLog[] }) {
  const [logs, setLogs] = React.useState<ErrorLog[]>(initialLogs);
  const [filter, setFilter] = React.useState<"unresolved" | "resolved" | "all">("unresolved");
  const [search, setSearch] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const filteredLogs = React.useMemo(() => {
    let list = logs;

    if (filter !== "all") {
      list = list.filter((log) => log.status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (log) =>
          log.message.toLowerCase().includes(q) ||
          (log.url ?? "").toLowerCase().includes(q) ||
          (log.stack ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [logs, filter, search]);

  const counts = React.useMemo(() => {
    return {
      all: logs.length,
      unresolved: logs.filter((l) => l.status === "unresolved").length,
      resolved: logs.filter((l) => l.status === "resolved").length,
    };
  }, [logs]);

  const handleResolve = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await resolveErrorLogAction(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Error resolved!");
      setLogs((prev) =>
        prev.map((log) => (log.id === id ? { ...log, status: "resolved" } : log))
      );
    } catch (err) {
      toast.error("Failed to resolve error.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this log?")) return;
    setLoadingId(id);
    try {
      const res = await deleteErrorLogAction(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Log entry deleted.");
      setLogs((prev) => prev.filter((log) => log.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      toast.error("Failed to delete log.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search error message, URL, stack trace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-muted/20"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { value: "unresolved" as const, label: "Unresolved" },
            { value: "resolved" as const, label: "Resolved" },
            { value: "all" as const, label: "All Logs" },
          ].map((opt) => {
            const isSelected = filter === opt.value;
            const count = counts[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer",
                  isSelected
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{opt.label}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.2 text-[10px] tabular-nums",
                    isSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Logs Listing */}
      {filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/5 py-16 text-center">
          <Check className="size-8 text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-foreground">All quiet!</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {search
              ? `No logs matched "${search}". Try searching different terms.`
              : `No ${filter === "all" ? "" : filter} error logs reported.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            const isLoading = loadingId === log.id;
            const dateStr = new Date(log.createdAt).toLocaleString();

            return (
              <div
                key={log.id}
                className={cn(
                  "rounded-xl border transition-colors bg-card/20 overflow-hidden",
                  log.status === "resolved" ? "border-border/30 opacity-75" : "border-border/80"
                )}
              >
                {/* Header card info */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  onKeyDown={(e) => e.key === "Enter" && setExpandedId(isExpanded ? null : log.id)}
                  className="flex items-start justify-between gap-4 p-4 cursor-pointer hover:bg-muted/10"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      <Warning
                        className={cn(
                          "size-5",
                          log.status === "resolved" ? "text-muted-foreground" : "text-destructive"
                        )}
                      />
                    </div>
                    <div className="space-y-1 min-w-0 text-left">
                      <h4 className="font-semibold text-xs text-foreground font-mono leading-tight break-all line-clamp-2">
                        {log.message}
                      </h4>
                      <p className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1">
                          <CalendarBlank className="size-3" />
                          {dateStr}
                        </span>
                        {log.url && (
                          <span className="flex items-center gap-1 truncate max-w-xs sm:max-w-md">
                            <Globe className="size-3" />
                            {log.url.replace(typeof window !== "undefined" ? window.location.origin : "", "")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isExpanded ? <CaretUp className="size-4" /> : <CaretDown className="size-4" />}
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="border-t border-border/50 bg-muted/10 p-4 space-y-4 text-left">
                    <div className="grid gap-3 text-xs sm:grid-cols-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Globe className="size-3" /> URL Path
                        </span>
                        <p className="font-mono text-[11px] text-foreground break-all bg-background/50 px-2 py-1 rounded border border-border/40">
                          {log.url || "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Monitor className="size-3" /> User Agent
                        </span>
                        <p className="font-mono text-[11px] text-foreground break-all bg-background/50 px-2 py-1 rounded border border-border/40">
                          {log.userAgent || "—"}
                        </p>
                      </div>
                    </div>

                    {log.stack && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Stack Trace
                        </span>
                        <pre className="bg-zinc-950 p-4 rounded-lg font-mono text-[10px] overflow-auto text-rose-400 max-h-[300px] border border-border/40 whitespace-pre-wrap leading-relaxed">
                          {log.stack}
                        </pre>
                      </div>
                    )}

                    {/* Actions Panel inside details */}
                    <div className="flex justify-end items-center gap-2 pt-2 border-t border-border/40">
                      {log.status === "unresolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isLoading}
                          onClick={() => handleResolve(log.id)}
                          className="h-8 text-xs gap-1 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                        >
                          <Check className="size-3.5" />
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isLoading}
                        onClick={() => handleDelete(log.id)}
                        className="h-8 text-xs gap-1 border-destructive/30 hover:bg-destructive/10 hover:text-destructive text-destructive"
                      >
                        <Trash className="size-3.5" />
                        Delete Log
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
