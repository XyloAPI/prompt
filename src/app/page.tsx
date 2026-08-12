import { listImages } from "@/lib/data";
import { BlurFade } from "@/components/magicui/blur-fade";
import { HomeGallery } from "@/components/home-gallery";

export default async function HomePage() {
  const rawImages = await listImages();

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
      <HomeGallery initialImages={rawImages} />
    </div>
  );
}
