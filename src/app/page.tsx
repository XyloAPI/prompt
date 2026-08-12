import Link from "next/link";
import { listImages } from "@/lib/data";
import { ImageCard } from "@/components/image-card";
import { Masonry, MasonryItem } from "@/components/masonry";
import { BlurFade } from "@/components/magicui/blur-fade";
import { arrangeAestheticImages } from "@/lib/layout-utils";

export default async function HomePage() {
  const rawImages = await listImages();
  const images = arrangeAestheticImages(rawImages, 4);

  return (
    <div className="space-y-2">
      {/* Hero Header */}
      <section className="mx-auto max-w-[1800px] px-4 pt-10 pb-6 sm:px-8 sm:pt-16 sm:pb-8 lg:px-12">
        <BlurFade delay={0.08} inView>
          <h1 className="text-right text-5xl font-bold tracking-tight leading-[0.92] text-foreground lowercase sm:text-7xl md:text-8xl lg:text-[7rem] xl:text-[8rem]">
            no more boring visuals
          </h1>
        </BlurFade>
        <BlurFade delay={0.16} inView className="flex justify-end">
          <p className="mt-4 max-w-xl text-right text-base font-normal leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
            Curated visual assets for modern interfaces, brands, and creative direction.
          </p>
        </BlurFade>
      </section>

      {/* Quick Filter Bar & Masonry Gallery */}
      <section className="mx-auto max-w-[1800px] px-4 sm:px-8 lg:px-12 pb-16">
        <BlurFade delay={0.22} inView className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-full bg-foreground px-3.5 text-xs font-semibold text-background transition-colors"
            >
              All Assets
            </Link>
            <Link
              href="/gallery?category=photo"
              className="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Photos
            </Link>
            <Link
              href="/gallery?category=illustration"
              className="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Illustrations
            </Link>
            <Link
              href="/gallery?category=3d"
              className="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              3D Renders
            </Link>
          </div>

          <Link
            href="/gallery"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
          >
            <span>View all in gallery</span>
            <span>&rarr;</span>
          </Link>
        </BlurFade>

        <Masonry>
          {images.map((image, i) => (
            <MasonryItem key={image.id}>
              <BlurFade delay={0.05 + (i % 12) * 0.03} inView>
                <ImageCard image={image} eager={i < 6} />
              </BlurFade>
            </MasonryItem>
          ))}
        </Masonry>
      </section>
    </div>
  );
}
