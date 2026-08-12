import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center", className)}
      aria-label="Luminaq home"
    >
      <Image
        src="/luminaq.svg"
        alt="Luminaq"
        width={341}
        height={98}
        unoptimized
        priority
        className="h-20 w-auto invert dark:invert-0"
      />
    </Link>
  );
}
