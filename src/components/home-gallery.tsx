"use client";

import * as React from "react";
import Link from "next/link";
import { OptionWheel } from "@/components/ui/option-wheel";
import { ImageCard } from "@/components/image-card";
import { Masonry, MasonryItem } from "@/components/masonry";
import { BlurFade } from "@/components/magicui/blur-fade";
import { arrangeAestheticImages } from "@/lib/layout-utils";
import type { Image as ImageType, Category } from "@/db/schema";
import { ArrowUpRight } from "@phosphor-icons/react";

const CATEGORY_ITEMS = ["All Assets", "Photos", "Illustrations", "3D Renders"];

const CATEGORY_VALUES: (Category | "")[] = ["", "photo", "illustration", "3d"];

export function HomeGallery({ initialImages }: { initialImages: ImageType[] }) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const selectedCategory = CATEGORY_VALUES[selectedIndex];

  const filteredImages = React.useMemo(() => {
    if (!selectedCategory) return initialImages;
    return initialImages.filter((img) => img.category === selectedCategory);
  }, [initialImages, selectedCategory]);

  const displayImages = React.useMemo(() => {
    return arrangeAestheticImages(filteredImages, 4);
  }, [filteredImages]);

  return (
    <section className="mx-auto max-w-[1800px] px-4 sm:px-8 lg:px-12 pb-16">
      {/* OptionWheel Category Bar */}
      <BlurFade delay={0.2} inView className="mb-6 border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="h-36 w-72 sm:w-80 relative overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
            <OptionWheel
              items={CATEGORY_ITEMS}
              defaultSelected={selectedIndex}
              selectedIndex={selectedIndex}
              onChange={(idx) => setSelectedIndex(idx)}
              align="top"
              fontSize={1.25}
              spacing={1.6}
              curve={0.7}
              tilt={4.5}
              blur={1.4}
              fade={0.35}
              minOpacity={0.15}
              smoothing={180}
              inset={8}
              textColor="rgba(160, 160, 160, 0.4)"
              activeColor="hsl(var(--foreground))"
              className="h-full w-full"
            />
          </div>

          <Link
            href={`/gallery${selectedCategory ? `?category=${selectedCategory}` : ""}`}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-4 py-2 text-xs font-medium text-foreground backdrop-blur-sm transition-all hover:border-foreground/30 hover:bg-muted/50 self-start sm:self-auto"
          >
            <span>Open in full gallery</span>
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </BlurFade>

      {/* Masonry Gallery Grid */}
      <Masonry key={selectedCategory}>
        {displayImages.map((image, i) => (
          <MasonryItem key={image.id}>
            <BlurFade delay={0.03 + (i % 8) * 0.03} inView>
              <ImageCard image={image} eager={i < 6} />
            </BlurFade>
          </MasonryItem>
        ))}
      </Masonry>
    </section>
  );
}
