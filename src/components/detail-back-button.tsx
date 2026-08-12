"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";

export function DetailBackButton({ defaultCategory }: { defaultCategory?: string }) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      const target = defaultCategory ? `/gallery?category=${defaultCategory}` : "/gallery";
      router.push(target);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
    >
      <ArrowLeft className="size-3.5" />
      <span>Back</span>
    </button>
  );
}
