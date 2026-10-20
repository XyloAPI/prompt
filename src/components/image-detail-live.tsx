"use client";

import * as React from "react";
import Link from "next/link";
import { CopyButton } from "@/components/animate-ui/components/buttons/copy";
import { ColorPalette, SectionTitle } from "@/components/color-palette";
import { DetailBackButton } from "@/components/detail-back-button";
import { DetailImageWrapper } from "@/components/detail-image-wrapper";
import { DownloadButton } from "@/components/download-button";
import { ImageDetailsCard } from "@/components/image-display-section";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { VideoPlayer } from "@/components/video-player";
import { AudioPlayer } from "@/components/audio-player";
import { isAudioAsset } from "@/lib/media";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type LiveImage = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  prompt: string;
  palette: { hex: string; name?: string }[];
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  downloads: number;
  createdAt: string;
};

/**
 * Detail view for assets that are not part of the current static build
 * (uploaded after the last deploy). The page itself is prerendered, so this
 * fallback lives in the 404 page and resolves the id at runtime from the API.
 */
export function ImageDetailLive({ id }: { id: string }) {
  const [image, setImage] = React.useState<LiveImage | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ok" | "missing">("loading");

  React.useEffect(() => {
    let cancelled = false;
    // The Function embeds the asset for live pages -> render instantly.
    const embedded = (window as unknown as { __LIVE_ASSET__?: LiveImage }).__LIVE_ASSET__;
    if (embedded && embedded.id === id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImage(embedded);
      setStatus("ok");
      document.title = `${embedded.title} · Luminaq`;
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/images/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (!cancelled) setStatus("missing");
          return;
        }
        const data = (await res.json()) as LiveImage;
        if (cancelled) return;
        setImage(data);
        setStatus("ok");
        document.title = `${data.title} · Luminaq`;
      } catch {
        if (!cancelled) setStatus("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 text-center text-muted-foreground">
        <p className="text-sm">Loading asset…</p>
      </div>
    );
  }

  if (status === "missing" || !image) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <p className="text-6xl font-semibold tracking-tight">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">This page wandered off</h1>
        <p className="mt-2 text-muted-foreground">
          The image or page you&apos;re looking for doesn&apos;t exist or was removed.
        </p>
        <Button asChild className="mt-6 rounded-full">
          <Link href="/">Back to library</Link>
        </Button>
      </div>
    );
  }

  const isAudio = isAudioAsset(image.category, image.url, image.thumbnailUrl);
  const isVideo =
    !isAudio && (image.category === "video" || /\.(mp4|webm|mov|mkv)$/i.test(image.url));

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-8 lg:px-12 sm:py-8">
      <DetailBackButton defaultCategory={image.category} />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px] xl:gap-12">
        <div className="flex items-start justify-center min-w-0">
          <DetailImageWrapper
            url={image.url}
            title={image.title}
            prompt={image.prompt || undefined}
            isVideo={isVideo}
            variant={isAudio ? "panel" : "frame"}
          >
            {image.thumbnailUrl && (
              <div
                className="pointer-events-none absolute -inset-4 scale-110 opacity-20 blur-3xl filter"
                style={{
                  backgroundImage: `url(${image.thumbnailUrl})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              />
            )}
            {isAudio ? (
              <AudioPlayer src={image.url} title={image.title} className="relative z-10" />
            ) : isVideo ? (
              <VideoPlayer
                src={image.url}
                poster={image.thumbnailUrl}
                title={image.title}
                width={image.width}
                height={image.height}
                autoPlay
                loop
                className="relative z-10"
              />
            ) : (
              <img
                src={image.url}
                alt={image.title}
                className="relative z-10 block h-auto max-h-[calc(100vh-8rem)] w-auto max-w-full rounded-2xl object-contain"
              />
            )}
          </DetailImageWrapper>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {image.category === "sfx" ? "SFX" : image.category}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{image.title}</h1>
            {image.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{image.description}</p>
            )}
          </div>

          <div>
            <DownloadButton
              id={image.id}
              url={image.url}
              thumbnailUrl={image.thumbnailUrl}
              title={image.title}
              className="w-full h-9 font-medium shadow-xs"
            />
          </div>

          {image.prompt && (
            <div className="space-y-2">
              <SectionTitle>Prompt</SectionTitle>
              <CopyButton
                content={image.prompt}
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
              />
              <div className="select-text rounded-xl border border-border/50 bg-muted/20 p-3.5 font-mono text-xs leading-relaxed text-foreground">
                {image.prompt}
              </div>
            </div>
          )}

          <Separator className="opacity-60" />

          <ImageDetailsCard
            id={image.id}
            url={image.url}
            initialWidth={image.width}
            initialHeight={image.height}
            downloads={image.downloads}
            createdAt={image.createdAt}
            isAudio={isAudio}
          />

          {image.tags?.length > 0 && (
            <div className="space-y-2.5">
              <SectionTitle>Tags</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {image.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {image.palette?.length > 0 && (
            <div className="space-y-2.5">
              <SectionTitle>Color palette</SectionTitle>
              <ColorPalette colors={image.palette} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
