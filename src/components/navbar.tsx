"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { CommandMenu } from "@/components/command-menu";

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);

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
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <CommandMenu />
        </div>
      </div>
    </header>
  );
}