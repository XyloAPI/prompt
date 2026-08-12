"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "@phosphor-icons/react";

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
  { value: "", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "illustration", label: "Illustration" },
  { value: "3d", label: "3D" },
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

  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const category = initialCategory ?? "";
  const sort = initialSort ?? "latest";

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => update({ category: c.value })}
            className={
              category === c.value
                ? "text-sm font-medium text-foreground"
                : "text-sm text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
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