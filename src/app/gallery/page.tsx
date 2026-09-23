import type { Metadata } from "next";

import { listImages } from "@/lib/data";
import { GalleryExplorer } from "@/components/gallery-explorer";
import { BlurFade } from "@/components/magicui/blur-fade";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Browse the Luminaq visual library.",
};

// Static export: prerender the first slice at build time; all filtering,
// sorting and search happen on-device via the search index (no worker).
export default async function GalleryPage() {
  const rawImages = await listImages({ sort: "latest", limit: 120 });

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
            Browse the Luminaq visual library.
          </p>
        </BlurFade>
      </div>

      <GalleryExplorer initialImages={rawImages} />
    </div>
  );
}
