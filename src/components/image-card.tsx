import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { Image as ImageType } from "@/db/schema";

export async function ImageCard({
  image,
  className,
  eager = false,
}: {
  image: ImageType;
  className?: string;
  eager?: boolean;
}) {
  return (
    <Link
      href={`/image/${image.id}`}
      className={cn("group relative block overflow-hidden rounded-lg bg-muted", className)}
      style={{ aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : undefined }}
    >
      <Image
        src={image.thumbnailUrl}
        alt={image.title}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
        className="object-cover"
        priority={eager}
      />

      {/* Hover overlay text */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 pt-12 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate text-sm font-medium text-white">{image.title}</p>
        <p className="truncate text-xs text-white/70 capitalize">{image.category}</p>
      </div>
    </Link>
  );
}