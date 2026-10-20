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
  Heart,
  Pause,
  SpeakerHigh,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { isAudioAsset } from "@/lib/media";
import { seededWaveform } from "@/lib/waveform";
import type { CardImage } from "@/lib/card-image";
import { useFavoritesStore } from "@/store/favorites-store";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

const audioRegistry = new Set<HTMLAudioElement>();

function pauseOtherAudio(current: HTMLAudioElement) {
  for (const element of audioRegistry) {
    if (element !== current) element.pause();
  }
}

export function ImageCard({
  image,
  className,
  eager = false,
}: {
  image: CardImage;
  className?: string;
  eager?: boolean;
}) {
  const isAudio = isAudioAsset(image.category, image.url, image.thumbnailUrl);

  const isVideo =
    !isAudio &&
    (image.category === "video" ||
      /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.thumbnailUrl) ||
      /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.url));

  const previewUrl = image.thumbnailUrl || image.url;

  const isThumbnailVideo = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(previewUrl);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = React.useState(false);
  const [audioProgress, setAudioProgress] = React.useState(0);
  const waveform = React.useMemo(() => seededWaveform(image.id, 48), [image.id]);

  React.useEffect(() => {
    if (!isAudio) return;
    const element = new Audio(image.url);
    element.preload = "none";
    audioRef.current = element;
    audioRegistry.add(element);

    const onPlay = () => {
      pauseOtherAudio(element);
      setAudioPlaying(true);
    };
    const onPause = () => setAudioPlaying(false);
    const onEnded = () => {
      setAudioPlaying(false);
      setAudioProgress(0);
    };
    const onTimeUpdate = () => {
      if (Number.isFinite(element.duration) && element.duration > 0) {
        setAudioProgress(element.currentTime / element.duration);
      }
    };

    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      element.pause();
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("timeupdate", onTimeUpdate);
      audioRegistry.delete(element);
      audioRef.current = null;
    };
  }, [image.url, isAudio]);

  const toggleAudio = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const element = audioRef.current;
    if (!element) return;
    if (element.paused) {
      element.play().catch(() => toast.error("Could not play this sound effect."));
    } else {
      element.pause();
    }
  };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite(image.id));
  const isFav = mounted ? isFavorite : false;

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

  const detailUrl = isAudio ? `/sfx/${image.id}` : isVideo ? `/video/${image.id}` : `/image/${image.id}`;

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
          {isAudio ? (
            <div className="relative flex size-full min-h-[160px] flex-col justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 p-4">
              <div className="flex h-16 items-end gap-[2px]" aria-hidden>
                {waveform.map((height, index) => (
                  <span
                    key={index}
                    className={cn(
                      "min-w-[2px] flex-1 rounded-full transition-colors duration-150",
                      index / waveform.length <= audioProgress ? "bg-white" : "bg-white/25"
                    )}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={toggleAudio}
                aria-label={audioPlaying ? "Pause sound effect" : "Play sound effect"}
                className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60"
              >
                {audioPlaying ? (
                  <Pause className="size-5" weight="fill" />
                ) : (
                  <Play className="size-5 translate-x-0.5 fill-white" />
                )}
              </button>
            </div>
          ) : !previewUrl ? (
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
              placeholder={image.blurDataUrl ? "blur" : undefined}
              blurDataURL={image.blurDataUrl || undefined}
            />
          )}

          {/* Category Indicator Badge */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur-md border border-white/10 shadow-xs">
            {isAudio ? (
              <>
                <SpeakerHigh className="size-2.5" weight="fill" />
                <span>SFX</span>
              </>
            ) : isVideo ? (
              <>
                <Play className="size-2.5 fill-white" />
                <span>Video</span>
              </>
            ) : (
              <span>{image.category === "3d" ? "3D" : image.category}</span>
            )}
          </div>

          {/* Favorites Heart Button Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(image);
              toast.success(isFav ? "Removed from favorites." : "Added to favorites!");
            }}
            className={cn(
              "absolute top-2.5 right-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 hover:scale-105 transition-all opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer",
              isFav && "opacity-100"
            )}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={cn("size-3.5", isFav ? "text-rose-500 fill-rose-500" : "text-white")}
              weight={isFav ? "fill" : "regular"}
            />
          </button>

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
          onClick={() => {
            toggleFavorite(image);
            toast.success(isFav ? "Removed from favorites." : "Added to favorites!");
          }}
        >
          <Heart className={cn("size-4", isFav ? "text-rose-500 fill-rose-500" : "text-muted-foreground")} weight={isFav ? "fill" : "regular"} />
          <span>{isFav ? "Remove from Favorites" : "Add to Favorites"}</span>
        </ContextMenuItem>

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