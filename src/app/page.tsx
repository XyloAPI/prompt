import { listImages } from "@/lib/data";
import { BlurFade } from "@/components/magicui/blur-fade";
import { HomeGallery } from "@/components/home-gallery";
import type { Category, Image as ImageType } from "@/db/schema";

const WHEEL_CATEGORIES: Category[] = ["photo", "illustration", "3d", "video", "sfx"];

// Static export: prerendered once at build time (no worker, no CPU limit).
export default async function HomePage() {
  const [latest, ...perCategory] = await Promise.all([
    listImages({ sort: "latest", limit: 48 }),
    ...WHEEL_CATEGORIES.map((category) =>
      listImages({ category, sort: "latest", limit: 24 })
    ),
  ]);

  // Each wheel category gets its own list, otherwise rare categories
  // (e.g. SFX) never show up in the filtered grid.
  const categoryImages = {} as Record<Category, ImageType[]>;
  WHEEL_CATEGORIES.forEach((category, index) => {
    categoryImages[category] = perCategory[index];
  });

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

      {/* OptionWheel Category & Masonry Gallery */}
      <HomeGallery initialImages={latest} categoryImages={categoryImages} />
    </div>
  );
}
