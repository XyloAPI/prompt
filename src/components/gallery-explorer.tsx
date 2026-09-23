"use client";

import * as React from "react";
import { GalleryControls } from "@/components/gallery-controls";
import { ImageCard } from "@/components/image-card";
import { Masonry, MasonryItem } from "@/components/masonry";
import { BlurFade } from "@/components/magicui/blur-fade";
import { arrangeAestheticImages } from "@/lib/layout-utils";
import { filterImages, loadImageIndex, type IndexImage } from "@/lib/client-search";
import type { CardImage } from "@/lib/card-image";

const PAGE_SIZE = 60;
const VALID_SORTS = ["latest", "trending", "downloads"] as const;
type Sort = (typeof VALID_SORTS)[number];

function readUrlState(): { category: string; sort: Sort; q: string } {
  if (typeof window === "undefined") return { category: "", sort: "latest", q: "" };
  try {
    const p = new URLSearchParams(window.location.search);
    const sort = p.get("sort");
    return {
      category: p.get("category") ?? "",
      sort: (VALID_SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "latest",
      q: p.get("q") ?? "",
    };
  } catch {
    return { category: "", sort: "latest", q: "" };
  }
}

export function GalleryExplorer({ initialImages }: { initialImages: CardImage[] }) {
  // Init filter state from the URL (static page has no server searchParams).
  const [urlState] = React.useState(readUrlState);
  const [category, setCategory] = React.useState(urlState.category);
  const [sort, setSort] = React.useState<Sort>(urlState.sort);
  const [query, setQuery] = React.useState(urlState.q);
  const [fullList, setFullList] = React.useState<IndexImage[] | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [searched, setSearched] = React.useState<CardImage[] | null>(null);

  // Load the full on-device index in the background.
  React.useEffect(() => {
    let live = true;
    loadImageIndex()
      .then((list) => {
        if (live) setFullList(list);
      })
      .catch(() => {
        if (live) setFullList([]);
      });
    return () => {
      live = false;
    };
  }, []);

  function resetPaging() {
    setVisibleCount(PAGE_SIZE);
  }

  // Keep the URL in sync without navigation.
  React.useEffect(() => {
    try {
      const p = new URLSearchParams();
      if (category) p.set("category", category);
      if (sort !== "latest") p.set("sort", sort);
      if (query) p.set("q", query);
      const qs = p.toString();
      window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    } catch {}
  }, [category, sort, query]);

  // Run search/filter over the full on-device index when it arrives or filters change.
  React.useEffect(() => {
    let cancelled = false;
    if (fullList === null) {
      return;
    }
    filterImages({ category: category || undefined, search: query || undefined, sort }).then((res) => {
      if (!cancelled) setSearched(res);
    });
    return () => {
      cancelled = true;
    };
  }, [fullList, category, query, sort]);

  // Pre-index fallback: category filter over the prerendered slice.
  // (Full sorting/search kicks in once the on-device index loads.)
  const fallback = React.useMemo(() => {
    if (!category) return initialImages;
    return initialImages.filter((i) => i.category === category);
  }, [initialImages, category]);

  // While the index loads show the prerendered slice; afterwards the
  // full on-device index backs every filter.
  const active: CardImage[] = searched ?? fallback;
  const display = React.useMemo(() => arrangeAestheticImages(active, 4), [active]);
  const visible = display.slice(0, visibleCount);

  return (
    <>
      <BlurFade delay={0.2} inView>
        <GalleryControls
          category={category}
          sort={sort}
          query={query}
          onCategoryChange={(v) => {
            setCategory(v);
            resetPaging();
          }}
          onSortChange={(v) => {
            setSort(v as Sort);
            resetPaging();
          }}
          onQueryChange={(v) => {
            setQuery(v);
            resetPaging();
          }}
        />
      </BlurFade>

      <p className="mt-4 text-muted-foreground">
        {searched ? display.length : `${display.length}+`} result{display.length === 1 ? "" : "s"}
        {fullList === null ? " (loading full index…)" : ""}
      </p>

      <div className="mt-8 pb-10">
        {visible.length === 0 ? (
          <p className="text-muted-foreground">No results found. Try adjusting your search or filters.</p>
        ) : (
          <>
            <Masonry>
              {visible.map((image, i) => (
                <MasonryItem key={image.id}>
                  <BlurFade delay={0.05 + (i % 12) * 0.03} inView>
                    <ImageCard image={image} />
                  </BlurFade>
                </MasonryItem>
              ))}
            </Masonry>
            {visibleCount < display.length && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-full border border-border/60 bg-muted/20 px-6 py-2.5 text-sm font-medium transition-all hover:border-foreground/30 hover:bg-muted/50"
                >
                  Load more ({display.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

