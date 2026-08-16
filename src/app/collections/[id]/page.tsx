import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listImages } from "@/lib/data";
import { getCollectionDataById } from "@/lib/collections";
import { ImageCard } from "@/components/image-card";
import { Masonry, MasonryItem } from "@/components/masonry";
import { BlurFade } from "@/components/magicui/blur-fade";
import { arrangeAestheticImages } from "@/lib/layout-utils";
import { ArrowLeft } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const rawImages = await listImages();
  const collection = getCollectionDataById(id, rawImages);

  if (!collection) {
    return {
      title: "Collection Not Found",
    };
  }

  const desc = collection.description || `Browse "${collection.name}" collection on Luminaq.`;
  const shareImg = collection.images?.[0]?.thumbnailUrl || collection.images?.[0]?.url || "";

  return {
    title: `${collection.name} - Collection`,
    description: desc,
    openGraph: {
      title: `${collection.name} - Collection`,
      description: desc,
      type: "website",
      images: shareImg
        ? [
            {
              url: shareImg,
              width: 1200,
              height: 630,
              alt: collection.name,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${collection.name} - Collection`,
      description: desc,
      images: shareImg ? [shareImg] : [],
    },
  };
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params;
  const rawImages = await listImages();
  const collection = getCollectionDataById(id, rawImages);

  if (!collection) {
    notFound();
  }

  const images = arrangeAestheticImages(collection.images, 4);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-10 sm:px-8 lg:px-12">
      {/* Back link */}
      <BlurFade delay={0.05} inView className="mb-6">
        <Link
          href="/collections"
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to collections</span>
        </Link>
      </BlurFade>

      {/* Header */}
      <div className="mb-10 border-b border-border/40 pb-8">
        <BlurFade delay={0.1} inView className="flex flex-col gap-3">


          <h1 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl lg:text-6xl lowercase">
            {collection.name}
          </h1>

          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            {collection.description}
          </p>
        </BlurFade>
      </div>

      {/* Grid */}
      <div className="mt-8 pb-10">
        {images.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No assets in this collection yet</EmptyTitle>
              <EmptyDescription>
                Assets will automatically appear here once their tags or color palettes match this collection.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Masonry>
            {images.map((image, i) => (
              <MasonryItem key={image.id}>
                <BlurFade delay={0.05 + (i % 12) * 0.03} inView>
                  <ImageCard image={image} />
                </BlurFade>
              </MasonryItem>
            ))}
          </Masonry>
        )}
      </div>
    </div>
  );
}
