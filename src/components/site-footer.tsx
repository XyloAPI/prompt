import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-12 sm:px-8 lg:px-12 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-sm text-muted-foreground">
            Imagery for the modern web.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/gallery" className="transition-colors hover:text-foreground">
            Gallery
          </Link>
          <span className="text-muted-foreground/60">
            © {new Date().getFullYear()} Luminaq
          </span>
        </div>
      </div>
    </footer>
  );
}