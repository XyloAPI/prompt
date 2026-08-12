"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { OptionWheel } from "@/components/ui/option-wheel";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

const categories = [
  { value: "", label: "All Assets" },
  { value: "photo", label: "Photos" },
  { value: "illustration", label: "Illustrations" },
  { value: "3d", label: "3D Renders" },
  { value: "video", label: "Videos" },
];

const sortOptions = [
  { value: "latest", label: "Latest" },
  { value: "trending", label: "Trending" },
  { value: "downloads", label: "Most downloaded" },
];

export function GalleryControls({
  initialCategory,
  initialSort,
  initialQuery,
}: {
  initialCategory?: string;
  initialSort?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(initialQuery ?? "");

  const category = initialCategory ?? "";
  const sort = initialSort ?? "latest";

  const selectedIndex = Math.max(
    0,
    categories.findIndex((c) => c.value === category)
  );

  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if ("category" in patch) {
      try {
        sessionStorage.setItem("home_active_category", patch.category || "");
      } catch {}
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6 border-b border-border/40 pb-6 lg:flex-row lg:items-center lg:justify-between">
      {/* OptionWheel Selector */}
      <div className="h-36 w-72 sm:w-80 relative overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_60%,transparent_100%)]">
        <OptionWheel
          items={categories.map((c) => c.label)}
          defaultSelected={selectedIndex}
          selectedIndex={selectedIndex}
          onChange={(idx) => {
            const targetCat = categories[idx]?.value ?? "";
            update({ category: targetCat });
          }}
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
          textColor="rgba(160, 160, 160, 0.45)"
          activeColor="hsl(var(--foreground))"
          className="h-full w-full"
        />
      </div>

      <div className="flex items-center gap-3">
        <InputGroup className="w-full lg:w-64">
          <InputGroupInput
            placeholder="Search images…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              update({ q: e.target.value });
            }}
          />
          {query && (
            <InputGroupAddon>
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                onClick={() => {
                  setQuery("");
                  update({ q: "" });
                }}
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            </InputGroupAddon>
          )}
        </InputGroup>

        <Select value={sort} onValueChange={(v: string) => update({ sort: v })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sortOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}