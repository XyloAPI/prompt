import type { Metadata } from "next";

import { listImages } from "@/lib/data";
import type { Category } from "@/db/schema";
import { GalleryControls } from "@/components/gallery-controls";
import { ImageCard } from "@/components/image-card";
import { Masonry, MasonryItem } from "@/components/masonry";
import { BlurFade } from "@/components/magicui/blur-fade";
import { arrangeAestheticImages } from "@/lib/layout-utils";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Browse the Luminaq visual library.",
};

type Props = {
  searchParams: Promise<{ category?: string; sort?: string; q?: string }>;
};

export default async function GalleryPage({ searchParams }: Props) {
  const sp = await searchParams;

  const category = (["photo", "illustration", "3d"] as Category[]).includes(
    sp.category as Category
  )
    ? (sp.category as Category)
    : undefined;
  const sort = (["latest", "trending", "downloads"] as const).includes(
    sp.sort as "latest"
  )
    ? (sp.sort as "latest" | "trending" | "downloads")
    : undefined;
  const q = sp.q ?? "";

  const rawImages = await listImages({ category, sort, search: q });
  const images = sort ? rawImages : arrangeAestheticImages(rawImages, 4);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-10 sm:px-8 lg:px-12">
      <div className="mb-8">
        <BlurFade delay={0.1} inView>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
            Gallery
          </h1>
        </BlurFade>
        <BlurFade delay={0.15} inView>
          <p className="mt-3 text-muted-foreground">
            {images.length} result{images.length === 1 ? "" : "s"}
          </p>
        </BlurFade>
      </div>

      <BlurFade delay={0.2} inView>
        <GalleryControls
          initialCategory={category ?? ""}
          initialSort={sort ?? ""}
          initialQuery={q}
        />
      </BlurFade>

      <div className="mt-8 pb-10">
        {images.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No results found</EmptyTitle>
              <EmptyDescription>
                Try adjusting your search or filters.
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
