"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowSquareOut,
  ArrowsDownUp,
  DownloadSimple,
  MagnifyingGlass,
  PencilSimple,
  Play,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import type { Category, Image as ImageType } from "@/db/schema";
import { EditImageDialog } from "@/components/admin/edit-image-dialog";
import { DeleteImageButton } from "@/components/admin/delete-image-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const categoryOptions: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All Assets" },
  { value: "photo", label: "Photos" },
  { value: "illustration", label: "Illustrations" },
  { value: "3d", label: "3D Renders" },
  { value: "video", label: "Videos" },
];

export function LibraryGrid({
  images,
  model,
}: {
  images: ImageType[];
  model?: string;
}) {
  const [filter, setFilter] = React.useState<Category | "all">("all");
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"newest" | "downloads" | "trending">("newest");
  const [editing, setEditing] = React.useState<ImageType | null>(null);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem("admin_library_filter");
      if (saved && ["all", "photo", "illustration", "3d", "video"].includes(saved)) {
        setFilter(saved as Category | "all");
      }
    } catch {}
  }, []);

  const handleFilterChange = (cat: Category | "all") => {
    setFilter(cat);
    try {
      sessionStorage.setItem("admin_library_filter", cat);
    } catch {}
  };

  const filtered = React.useMemo(() => {
    let list = images;
    if (filter !== "all") {
      list = list.filter((i) => i.category === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          (i.prompt ?? "").toLowerCase().includes(q) ||
          (i.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === "downloads") {
      return [...list].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else if (sortBy === "trending") {
      return [...list].sort((a, b) => (b.trending || 0) - (a.trending || 0));
    } else {
      return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [images, filter, search, sortBy]);

  const countsByCategory = React.useMemo(() => {
    return {
      all: images.length,
      photo: images.filter((i) => i.category === "photo").length,
      illustration: images.filter((i) => i.category === "illustration").length,
      "3d": images.filter((i) => i.category === "3d").length,
      video: images.filter((i) => i.category === "video").length,
    };
  }, [images]);

  return (
    <div className="space-y-5">
      {/* Search and filter toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search titles, tags, prompts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-muted/20"
          />
        </div>

        {/* Sort & Quick stats */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/20 px-2.5 py-1 text-xs text-muted-foreground">
            <ArrowsDownUp className="size-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-medium text-foreground outline-none cursor-pointer"
            >
              <option value="newest" className="bg-popover text-foreground">Newest</option>
              <option value="downloads" className="bg-popover text-foreground">Most Downloads</option>
              <option value="trending" className="bg-popover text-foreground">Trending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 pb-3">
        {categoryOptions.map((opt) => {
          const count = countsByCategory[opt.value];
          const isSelected = filter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleFilterChange(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                isSelected
                  ? "bg-foreground text-background shadow-xs font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{opt.label}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.2 text-[10px] tabular-nums",
                  isSelected
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid view */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10 py-16 text-center">
          <SlidersHorizontal className="size-8 text-muted-foreground/60 mb-3" />
          <p className="text-sm font-medium text-foreground">No images found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {search
              ? `No images matched "${search}". Try searching with different keywords.`
              : "No images in this category yet. Upload one to get started."}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="mt-4 text-xs font-medium text-primary hover:underline underline-offset-4"
            >
              Clear search query
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((image) => (
            <div
              key={image.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-border hover:shadow-md"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                {(() => {
                  const isVideo = image.category === "video" || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.url);
                  const previewUrl = image.thumbnailUrl || image.url;

                  if (!previewUrl) {
                    return (
                      <div className="flex size-full flex-col items-center justify-center bg-muted/40 text-muted-foreground p-3 text-center">
                        <Play className="size-6 text-muted-foreground/60 mb-1" />
                        <span className="text-[11px] font-medium text-muted-foreground">No Preview</span>
                      </div>
                    );
                  }

                  if (/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(previewUrl)) {
                    return (
                      <video
                        src={previewUrl}
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => {
                          e.currentTarget.play().catch(() => {});
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                        className="size-full object-cover"
                      />
                    );
                  }

                  return (
                    <Image
                      src={previewUrl}
                      alt={image.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                    />
                  );
                })()}

                {/* Quick overlay buttons */}
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(image)}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background transition-transform active:scale-95"
                    title="Edit metadata"
                  >
                    <PencilSimple className="size-4" />
                  </button>
                  <Link
                    href={
                      image.category === "video" ||
                      /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.thumbnailUrl) ||
                      /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.url)
                        ? `/video/${image.id}`
                        : `/image/${image.id}`
                    }
                    target="_blank"
                    className="inline-flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background transition-transform active:scale-95"
                    title="View public page"
                  >
                    <ArrowSquareOut className="size-4" />
                  </Link>
                  <DeleteImageButton id={image.id} title={image.title} />
                </div>

                {/* Category Pill Tag */}
                <div className="absolute top-2 left-2">
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-xs capitalize">
                    {image.category}
                  </span>
                </div>
              </div>

              {/* Card Meta Info */}
              <div className="p-3">
                <p className="truncate text-xs font-semibold text-foreground" title={image.title}>
                  {image.title}
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DownloadSimple className="size-3" />
                    <span className="font-mono tabular-nums">{image.downloads ?? 0}</span>
                  </span>
                  <span className="font-mono text-[10px]">
                    {image.width && image.height ? `${image.width}×${image.height}` : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditImageDialog
          image={editing}
          model={model}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </div>
  );
}
