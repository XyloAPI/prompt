"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { toast } from "sonner";
import {
  ArrowSquareOut,
  Copy,
  LinkSimple,
  DownloadSimple,
  Info,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import type { Image as ImageType } from "@/db/schema";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function ImageCard({
  image,
  className,
  eager = false,
}: {
  image: ImageType;
  className?: string;
  eager?: boolean;
}) {
  const isVideo =
    image.category === "video" ||
    /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.thumbnailUrl) ||
    /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.url);

  const previewUrl = image.thumbnailUrl || image.url;

  const isThumbnailVideo = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(previewUrl);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      // Get filename from url or title
      const ext = image.url.split(".").pop()?.split("?")[0] || (isVideo ? "mp4" : "png");
      a.download = `${image.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch (err) {
      window.open(image.url, "_blank");
      toast.success("Opening asset link for download...");
    }
  };

  const detailUrl = isVideo ? `/video/${image.id}` : `/image/${image.id}`;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link
          href={detailUrl}
          className={cn("group relative block overflow-hidden rounded-lg bg-muted", className)}
          style={{ aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : undefined }}
          onMouseEnter={() => {
            if (isThumbnailVideo && videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }}
          onMouseLeave={() => {
            if (isThumbnailVideo && videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0;
            }
          }}
        >
          {!previewUrl ? (
            <div className="flex size-full min-h-[160px] flex-col items-center justify-center bg-muted/40 text-muted-foreground p-4 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-background/70 shadow-xs mb-2">
                <Play className="size-4 fill-muted-foreground/60 text-muted-foreground/60 ml-0.5" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">No Preview</span>
            </div>
          ) : isThumbnailVideo ? (
            <video
              ref={videoRef}
              src={previewUrl}
              loop
              muted
              playsInline
              preload="metadata"
              className="size-full object-cover"
            />
          ) : (
            <Image
              src={previewUrl}
              alt={image.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover"
              priority={eager}
            />
          )}

          {/* Category Indicator Badge */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur-md border border-white/10 shadow-xs">
            {isVideo ? (
              <>
                <Play className="size-2.5 fill-white" />
                <span>Video</span>
              </>
            ) : (
              <span>{image.category === "3d" ? "3D" : image.category}</span>
            )}
          </div>

          {/* Hover overlay text */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 pt-12 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <p className="truncate text-sm font-medium text-white">{image.title}</p>
            <p className="truncate text-xs text-white/70 capitalize">{image.category}</p>
          </div>
        </Link>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <Link href={detailUrl}>
          <ContextMenuItem className="cursor-pointer">
            <Info className="size-4 text-muted-foreground" />
            <span>View Details</span>
          </ContextMenuItem>
        </Link>

        <ContextMenuItem
          className="cursor-pointer"
          onClick={() => handleCopyText(image.url, "URL")}
        >
          <LinkSimple className="size-4 text-muted-foreground" />
          <span>Copy Asset URL</span>
        </ContextMenuItem>

        {image.prompt && (
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => handleCopyText(image.prompt!, "Prompt")}
          >
            <Copy className="size-4 text-muted-foreground" />
            <span>Copy Prompt</span>
          </ContextMenuItem>
        )}

        <ContextMenuItem
          className="cursor-pointer"
          onClick={() => handleCopyText(image.title, "Title")}
        >
          <Copy className="size-4 text-muted-foreground" />
          <span>Copy Title</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="cursor-pointer"
          onClick={handleDownload}
        >
          <DownloadSimple className="size-4 text-muted-foreground" />
          <span>Download Asset</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}