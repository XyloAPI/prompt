"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

export function NavbarSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState("");

  // Sync initial query from URL if on gallery page
  React.useEffect(() => {
    if (pathname === "/gallery") {
      setQuery(searchParams.get("q") ?? "");
    }
  }, [pathname, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (pathname === "/gallery") {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      router.push(`/gallery?${params.toString()}`);
    } else {
      router.push(q ? `/gallery?q=${encodeURIComponent(q)}` : "/gallery");
    }
  };

  const handleClear = () => {
    setQuery("");
    if (pathname === "/gallery") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("q");
      router.push(`/gallery?${params.toString()}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="relative flex items-center w-full max-w-[200px] sm:max-w-[260px] transition-all duration-200"
    >
      <MagnifyingGlass className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search assets…"
        className="h-9 w-full rounded-full border border-border/60 bg-muted/30 pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-foreground/30 focus:bg-background/90 focus:ring-1 focus:ring-foreground/20"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </form>
  );
}
