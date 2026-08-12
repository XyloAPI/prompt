import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
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
