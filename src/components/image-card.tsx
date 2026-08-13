"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Image as ImageType } from "@/db/schema";

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

  const isThumbnailVideo =
    /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.thumbnailUrl);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  return (
    <Link
      href={isVideo ? `/video/${image.id}` : `/image/${image.id}`}
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
      {isThumbnailVideo ? (
        <video
          ref={videoRef}
          src={image.thumbnailUrl || image.url}
          loop
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      ) : (
        <Image
          src={image.thumbnailUrl || image.url}
          alt={image.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={eager}
        />
      )}

      {/* Video Indicator Badge */}
      {isVideo && (
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur-md border border-white/10 shadow-xs">
          <Play className="size-2.5 fill-white" />
          <span>Video</span>
        </div>
      )}

      {/* Hover overlay text */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 pt-12 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate text-sm font-medium text-white">{image.title}</p>
        <p className="truncate text-xs text-white/70 capitalize">{image.category}</p>
      </div>
    </Link>
  );
}