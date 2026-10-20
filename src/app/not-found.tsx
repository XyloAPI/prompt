"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ImageDetailLive } from "@/components/image-detail-live";

/**
 * The site is a static export: every asset page is prerendered at build
 * time. Assets uploaded after the last deploy have no page yet, so this
 * fallback resolves /image/<id> (and /video/<id>) at runtime from the API.
 */
export default function NotFound() {
  const [assetId, setAssetId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const match = window.location.pathname.match(/^\/(?:image|video)\/([^/]+)\/?$/);
    if (match) setAssetId(decodeURIComponent(match[1]));
  }, []);

  if (assetId) return <ImageDetailLive id={assetId} />;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-semibold tracking-tight">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        This page wandered off
      </h1>
      <p className="mt-2 text-muted-foreground">
        The image or page you&apos;re looking for doesn&apos;t exist or was removed.
      </p>
      <Button asChild className="mt-6 rounded-full">
        <Link href="/">
          Back to library
        </Link>
      </Button>
    </div>
  );
}
