"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CircleNotch, DownloadSimple, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { incrementDownloadAction } from "@/app/actions";

export function DownloadButton({
  id,
  url,
  thumbnailUrl,
  title,
  variant = "default",
  className,
  onDownloaded,
}: {
  id?: string;
  url: string;
  thumbnailUrl?: string | null;
  title: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  onDownloaded?: (newCount: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  async function handleConfirmDownload() {
    setDownloading(true);
    try {
      if (id) {
        incrementDownloadAction(id)
          .then((res) => {
            if (res.success) {
              window.dispatchEvent(
                new CustomEvent("image-downloaded", {
                  detail: { id, downloads: res.downloads },
                })
              );
              onDownloaded?.(res.downloads);
            }
          })
          .catch(() => {});
      }

      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started");
      setOpen(false);
    } catch {
      window.open(url, "_blank");
      setOpen(false);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <RippleButton
          variant={variant}
          className={cn("gap-2 font-medium", className)}
        >
          <DownloadSimple className="size-4" />
          <span>Download</span>
          <RippleButtonRipples />
        </RippleButton>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Download Asset
          </DialogTitle>
        </DialogHeader>

        <div className="my-2">
          {/* Preview banner */}
          <div className="flex items-center gap-3.5 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-background">
              <img
                src={thumbnailUrl || url}
                alt={title}
                className="size-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-medium text-foreground">{title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary">
                  <CheckCircle className="size-3" weight="fill" />
                  High Quality
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-3 mt-4">
          <Button
            type="button"
            variant="outline"
            size="default"
            disabled={downloading}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <RippleButton
            type="button"
            variant="default"
            size="default"
            disabled={downloading}
            onClick={handleConfirmDownload}
            className="gap-2 font-medium"
          >
            {downloading ? (
              <>
                <CircleNotch className="size-4 animate-spin" />
                <span>Downloading…</span>
              </>
            ) : (
              <>
                <DownloadSimple className="size-4" />
                <span>Download Now</span>
              </>
            )}
            <RippleButtonRipples />
          </RippleButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
