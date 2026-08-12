"use client";

import * as React from "react";
import { ArrowsOutSimple, CalendarBlank, DownloadSimple } from "@phosphor-icons/react";

interface ImageDetailsCardProps {
  id?: string;
  url: string;
  initialWidth?: number | null;
  initialHeight?: number | null;
  downloads: number;
  createdAt: string | number | Date;
}

export function ImageDetailsCard({
  id,
  url,
  initialWidth,
  initialHeight,
  downloads: initialDownloads,
  createdAt,
}: ImageDetailsCardProps) {
  const [dimensions, setDimensions] = React.useState({
    width: initialWidth ?? 0,
    height: initialHeight ?? 0,
  });
  const [downloads, setDownloads] = React.useState(initialDownloads);

  React.useEffect(() => {
    setDownloads(initialDownloads);
  }, [initialDownloads]);

  React.useEffect(() => {
    const handleDownload = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; downloads?: number }>;
      if (customEvent.detail && customEvent.detail.id === id) {
        setDownloads((prev) => customEvent.detail.downloads ?? prev + 1);
      }
    };
    window.addEventListener("image-downloaded", handleDownload);
    return () => window.removeEventListener("image-downloaded", handleDownload);
  }, [id]);

  React.useEffect(() => {
    if (!url) return;
    const isVideo = /\.(mp4|webm|mov|mkv)$/i.test(url);
    if (isVideo) {
      const vid = document.createElement("video");
      vid.onloadedmetadata = () => {
        if (vid.videoWidth > 0 && vid.videoHeight > 0) {
          setDimensions({ width: vid.videoWidth, height: vid.videoHeight });
        }
      };
      vid.src = url;
    } else {
      const img = new window.Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        }
      };
      img.src = url;
    }
  }, [url]);

  return (
    <div className="space-y-2.5 rounded-xl border border-border/50 bg-muted/20 p-4 text-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <DownloadSimple className="size-3.5" />
          <span>Downloads</span>
        </span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {downloads.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <ArrowsOutSimple className="size-3.5" />
          <span>Dimensions</span>
        </span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {dimensions.width > 0 && dimensions.height > 0
            ? `${dimensions.width} × ${dimensions.height}`
            : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarBlank className="size-3.5" />
          <span>Added</span>
        </span>
        <span className="font-medium text-foreground" suppressHydrationWarning>
          {formatAddedDate(createdAt)}
        </span>
      </div>
    </div>
  );
}

function formatAddedDate(dateVal: string | number | Date): string {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  } catch {
    return String(dateVal);
  }
}
