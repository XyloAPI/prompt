"use client";

import { CopyButton } from "@/components/animate-ui/components/buttons/copy";

export function CopyPromptButton({
  prompt,
  className,
}: {
  prompt: string;
  className?: string;
}) {
  return (
    <CopyButton
      content={prompt}
      variant="secondary"
      size="sm"
      hoverScale={1.05}
      tapScale={0.95}
      className={className}
    />
  );
}