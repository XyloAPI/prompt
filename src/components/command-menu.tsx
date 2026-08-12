"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { categoriesWithLabels } from "@/lib/mock";

type ResImage = {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
};
type SearchRes = { images: ResImage[]; total: number };

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<SearchRes>({ images: [], total: 0 });
  const [q, setQ] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as SearchRes;
        setResults(data);
      } catch {
        setResults({ images: [], total: 0 });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-between gap-3 rounded-full border border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground sm:w-64 shadow-xs"
        aria-label="Search visual library"
      >
        <div className="flex items-center gap-2 truncate">
          <MagnifyingGlass className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">Search library...</span>
        </div>
        <kbd className="pointer-events-none hidden h-5 shrink-0 select-none items-center gap-1 rounded-md border border-border/70 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/90 shadow-xs lg:inline-flex">
          <span className="text-[11px] leading-none">⌘</span>
          <span className="leading-none">K</span>
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search Luminaq" description="Search images">
        <CommandInput
          placeholder="Search images, tags, or prompts…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Categories">
            {categoriesWithLabels().map((c) => (
              <CommandItem key={c.value} onSelect={() => go(`/gallery?category=${c.value}`)}>
                <span>Browse {c.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {results.images.length > 0 && (
            <CommandGroup heading="Assets">
              {results.images.map((i) => (
                <CommandItem
                  key={i.id}
                  onSelect={() => go(i.category === "video" ? `/video/${i.id}` : `/image/${i.id}`)}
                >
                  <span>{i.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">{i.category}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
