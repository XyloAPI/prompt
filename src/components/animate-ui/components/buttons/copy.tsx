"use client";

import * as React from "react";
import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { Check, Copy } from "@phosphor-icons/react";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type CopyButtonProps = VariantProps<typeof buttonVariants> & {
  content: string;
  copied?: boolean;
  onCopiedChange?: (copied: boolean, content?: string) => void;
  delay?: number;
  hoverScale?: number;
  tapScale?: number;
  className?: string;
} & Omit<HTMLMotionProps<"button">, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag">;

const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      content,
      copied: copiedProp,
      onCopiedChange,
      delay = 2500,
      variant,
      size,
      hoverScale = 1.05,
      tapScale = 0.95,
      className,
      ...props
    },
    ref
  ) => {
    const [internalCopied, setInternalCopied] = React.useState(false);
    const copied = copiedProp ?? internalCopied;

    const setCopied = React.useCallback(
      (value: boolean) => {
        setInternalCopied(value);
        onCopiedChange?.(value, content);
      },
      [content, onCopiedChange]
    );

    React.useEffect(() => {
      if (!copied) return;
      const timer = setTimeout(() => setCopied(false), delay);
      return () => clearTimeout(timer);
    }, [copied, delay, setCopied]);

    async function handleCopy() {
      if (!content) return;
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
      } catch {
        onCopiedChange?.(false, content);
      }
    }

    return (
      <motion.button
        ref={ref}
        type="button"
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: tapScale }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={handleCopy}
        aria-live="polite"
        className={cn(
          buttonVariants({ variant, size, className }),
          "relative inline-flex items-center justify-center overflow-hidden font-medium select-none"
        )}
        {...props}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="inline-flex items-center justify-center text-foreground"
            >
              <Check aria-hidden="true" className="size-3.5" weight="bold" />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <Copy aria-hidden="true" className="size-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);
CopyButton.displayName = "CopyButton";

export { CopyButton, type CopyButtonProps };
