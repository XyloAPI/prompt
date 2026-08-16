"use client";

import * as React from "react";
import { useFavoritesStore } from "@/store/favorites-store";
import { ImageCard } from "@/components/image-card";
import { Masonry, MasonryItem } from "@/components/masonry";
import { BlurFade } from "@/components/magicui/blur-fade";
import { arrangeAestheticImages } from "@/lib/layout-utils";
import { Heart, ArrowLeft } from "@phosphor-icons/react";
import Link from "next/link";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export default function FavoritesPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const favorites = useFavoritesStore((state) => state.favorites);

  const displayImages = React.useMemo(() => {
    if (!mounted) return [];
    return arrangeAestheticImages(favorites, 4);
  }, [favorites, mounted]);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-10 sm:px-8 lg:px-12">
      {/* Back link */}
      <BlurFade delay={0.05} inView className="mb-6">
        <Link
          href="/gallery"
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to gallery</span>
        </Link>
      </BlurFade>

      {/* Header */}
      <div className="mb-10 border-b border-border/40 pb-8">
        <BlurFade delay={0.1} inView className="flex flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl lg:text-6xl lowercase">
            favorites
          </h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Browse and manage your locally saved AI photography, illustrations, and 3D renders.
          </p>
        </BlurFade>
      </div>

      {/* Grid */}
      <div className="mt-8 pb-10">
        {!mounted ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Loading your favorites...
          </div>
        ) : displayImages.length === 0 ? (
          <Empty className="py-12 border border-dashed border-border/40 rounded-2xl bg-muted/5">
            <EmptyHeader>
              <div className="flex size-12 items-center justify-center rounded-full bg-rose-500/10 mb-4 mx-auto border border-rose-500/20 shadow-xs">
                <Heart className="size-5 text-rose-500 fill-rose-500" weight="fill" />
              </div>
              <EmptyTitle>No favorites bookmarked yet</EmptyTitle>
              <EmptyDescription>
                Click the heart icon on any image card to bookmark it locally.
              </EmptyDescription>
            </EmptyHeader>
            <div className="mt-6 flex justify-center">
              <Link
                href="/gallery"
                className="inline-flex items-center justify-center rounded-full bg-foreground text-background px-6 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Browse Gallery
              </Link>
            </div>
          </Empty>
        ) : (
          <Masonry>
            {displayImages.map((image, i) => (
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
