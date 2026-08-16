import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listImages } from "@/lib/data";
import { getCollectionsData } from "@/lib/collections";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Layers, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Collections",
  description: "Visual collections grouped by color and style.",
};

export default async function CollectionsPage() {
  const rawImages = await listImages();
  const collections = getCollectionsData(rawImages);

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-10 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="mb-12 border-b border-border/40 pb-8">
        <BlurFade delay={0.08} inView>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl lg:text-6xl lowercase">
            collections
          </h1>
        </BlurFade>
        <BlurFade delay={0.16} inView>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Galleries grouped collection.
          </p>
        </BlurFade>
      </div>

      {/* Grid of collections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {collections.map((col, index) => {
          const previewImages = col.images.slice(0, 4);

          return (
            <BlurFade key={col.id} delay={0.1 + index * 0.05} inView>
              <Link
                href={`/collections/${col.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-muted/5 p-4 transition-all duration-300 hover:border-foreground/20 hover:bg-muted/10 hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)]"
              >
                {/* 2x2 Collage Preview */}
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/30 bg-muted/10 relative">
                  {previewImages.length > 0 ? (
                    <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-1 p-1">
                      {/* Grid cells */}
                      {[0, 1, 2, 3].map((cellIdx) => {
                        const img = previewImages[cellIdx];
                        if (!img) {
                          return (
                            <div
                              key={cellIdx}
                              className="h-full w-full rounded-md bg-muted/20 flex items-center justify-center border border-dashed border-border/40"
                            >
                              <Layers className="size-4 text-muted-foreground/30" />
                            </div>
                          );
                        }
                        return (
                          <div key={cellIdx} className="relative h-full w-full overflow-hidden rounded-md bg-muted/10">
                            <Image
                              src={img.thumbnailUrl}
                              alt={img.title}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              className="object-cover"
                              placeholder={img.blurDataUrl ? "blur" : undefined}
                              blurDataURL={img.blurDataUrl || undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Layers className="size-10 text-muted-foreground/20" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="mt-4 flex flex-1 flex-col">


                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground">
                    {col.name}
                  </h2>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-2">
                    {col.description}
                  </p>

                  <div className="mt-4 flex items-center text-xs font-semibold text-foreground/80 transition-colors group-hover:text-foreground">
                    <span>Explore collection</span>
                    <ChevronRight className="size-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </BlurFade>
          );
        })}
      </div>
    </div>
  );
}
