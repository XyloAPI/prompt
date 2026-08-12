"use client";

import * as React from "react";
import { toast } from "sonner";
import type { PaletteColor } from "@/db/schema";
import { cn } from "@/lib/utils";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
  );
}

export function ColorPalette({ colors, className }: { colors: PaletteColor[]; className?: string }) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {colors.map((c, i) => (
        <button
          key={`${c.hex}-${i}`}
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(c.hex);
              toast.success(`Copied ${c.hex}`);
            } catch {
              // ignore
            }
          }}
          className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-2 text-left transition-all hover:bg-muted/50 hover:border-border active:scale-[0.98]"
          title={`Click to copy ${c.hex}`}
        >
          <div
            className="size-7 shrink-0 rounded-lg border border-black/15 shadow-xs transition-transform group-hover:scale-105"
            style={{ backgroundColor: c.hex }}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-[11px] font-medium leading-none text-foreground">{c.name ?? "Color"}</p>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">{c.hex}</p>
          </div>
        </button>
      ))}
    </div>
  );
}