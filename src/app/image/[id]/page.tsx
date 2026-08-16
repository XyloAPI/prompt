import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { imageById, relatedImages } from "@/lib/data";
import { DownloadButton } from "@/components/download-button";
import { CopyButton } from "@/components/animate-ui/components/buttons/copy";
import { ColorPalette, SectionTitle } from "@/components/color-palette";
import { ImageCard } from "@/components/image-card";
import { Masonry, MasonryItem } from "@/components/masonry";
import { Separator } from "@/components/ui/separator";
import { ImageDetailsCard } from "@/components/image-display-section";
import { DetailImageWrapper } from "@/components/detail-image-wrapper";

import { VideoPlayer } from "@/components/video-player";
import { DetailBackButton } from "@/components/detail-back-button";

const categoryLabels: Record<string, string> = {
  photo: "Photo",
  illustration: "Illustration",
  "3d": "3D",
  video: "Video",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const image = await imageById(id);
  if (!image) return { title: "Not found" };

  const desc = image.description || `Browse and download "${image.title}" on Luminaq.`;
  const shareImg = image.thumbnailUrl || image.url;

  return {
    title: image.title,
    description: desc,
    openGraph: {
      title: image.title,
      description: desc,
      type: "website",
      images: [
        {
          url: shareImg,
          width: image.width || 1200,
          height: image.height || 630,
          alt: image.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: image.title,
      description: desc,
      images: [shareImg],
    },
  };
}

export default async function ImageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const image = await imageById(id);
  if (!image) notFound();

  const [related] = await Promise.all([
    relatedImages(image, 8),
  ]);

  const tags = image.tags ?? [];
  const palette = image.palette ?? [];
  const prompt = image.prompt ?? "";
  const isVideo = image.category === "video" || /\.(mp4|webm|mov|mkv)$/i.test(image.url);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-8 lg:px-12 sm:py-8">
      <DetailBackButton defaultCategory={image.category} />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px] xl:gap-12">
        {/* Main image / video presentation */}
        <div className="flex items-start justify-center min-w-0">
          <DetailImageWrapper
            url={image.url}
            title={image.title}
            prompt={image.prompt ?? undefined}
            isVideo={isVideo}
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
            {isVideo ? (
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

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {categoryLabels[image.category] ?? image.category}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {image.title}
            </h1>
            {image.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {image.description}
              </p>
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

          {prompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <SectionTitle>Prompt</SectionTitle>
                <CopyButton
                  content={prompt}
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                />
              </div>
              <div className="relative rounded-xl border border-border/50 bg-muted/20 p-3.5 text-xs leading-relaxed text-foreground select-text font-mono">
                {prompt}
              </div>
            </div>
          )}

          <Separator className="opacity-60" />

          {/* Details */}
          <ImageDetailsCard
            id={image.id}
            url={image.url}
            initialWidth={image.width}
            initialHeight={image.height}
            downloads={image.downloads}
            createdAt={image.createdAt}
          />

          {tags.length > 0 && (
            <div className="space-y-2.5">
              <SectionTitle>Tags</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
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

          {palette.length > 0 && (
            <div className="space-y-2.5">
              <SectionTitle>Color palette</SectionTitle>
              <ColorPalette colors={palette} />
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16 sm:mt-20">
          <h2 className="mb-6 text-xl font-bold tracking-tight text-foreground">
            More like this
          </h2>
          <Masonry>
            {related.map((img) => (
              <MasonryItem key={img.id}>
                <ImageCard image={img} />
              </MasonryItem>
            ))}
          </Masonry>
        </section>
      )}
    </div>
  );
}