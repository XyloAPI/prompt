"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { NavbarSearch } from "@/components/navbar-search";
import { Heart } from "@phosphor-icons/react";
import { useFavoritesStore } from "@/store/favorites-store";

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const favoritesCount = useFavoritesStore((state) => state.favorites.length);
  const displayCount = mounted ? favoritesCount : 0;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-6 px-4 sm:px-8 lg:px-12">
        <Logo />
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/gallery?category=photo"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Photos
          </Link>
          <Link
            href="/gallery?category=illustration"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Illustration
          </Link>
          <Link
            href="/gallery?category=3d"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            3D
          </Link>
          <Link
            href="/gallery?category=video"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Videos
          </Link>
          <Link
            href="/collections"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Collections
          </Link>
          <Link
            href="/tools/image-to-prompt"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Tools
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <NavbarSearch />
          <Link
            href="/favorites"
            className="relative flex size-9 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:border-border hover:bg-muted/60 hover:text-foreground shadow-xs"
            aria-label="Favorites"
          >
            <Heart className="size-4" />
            {displayCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs tabular-nums animate-in zoom-in duration-200">
                {displayCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}