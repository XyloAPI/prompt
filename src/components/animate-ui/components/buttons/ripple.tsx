"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface RippleContextValue {
  ripples: Ripple[];
  addRipple: (event: React.MouseEvent<HTMLElement>) => void;
  removeRipple: (id: number) => void;
}

const RippleContext = React.createContext<RippleContextValue | null>(null);

export function useRipple() {
  const context = React.useContext(RippleContext);
  return context;
}

export type RippleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    rippleColor?: string;
    asChild?: boolean;
  };

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      children,
      onClick,
      rippleColor,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = React.useState<Ripple[]>([]);

    const addRipple = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple: Ripple = {
        id: Date.now() + Math.random(),
        x,
        y,
        size,
      };

      setRipples((prev) => [...prev, newRipple]);
    }, []);

    const removeRipple = React.useCallback((id: number) => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, []);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      addRipple(e);
      onClick?.(e);
    };

    return (
      <RippleContext.Provider value={{ ripples, addRipple, removeRipple }}>
        <button
          ref={ref}
          className={cn(
            buttonVariants({ variant, size }),
            "relative isolate overflow-hidden select-none active:scale-[0.98] transition-transform",
            className
          )}
          onClick={handleClick}
          {...props}
        >
          {children}
        </button>
      </RippleContext.Provider>
    );
  }
);
RippleButton.displayName = "RippleButton";

export function RippleButtonRipples({
  className,
  color,
}: {
  className?: string;
  color?: string;
}) {
  const context = useRipple();
  if (!context) return null;

  const { ripples, removeRipple } = context;

  return (
    <span className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.35 }}
            animate={{ scale: 1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            onAnimationComplete={() => removeRipple(ripple.id)}
            className={cn(
              "absolute rounded-full bg-foreground/20",
              className
            )}
            style={{
              top: ripple.y,
              left: ripple.x,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: color,
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );
}
