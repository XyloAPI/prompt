"use client";

import { useState } from "react";
import { WifiSlash, ArrowClockwise } from "@phosphor-icons/react";
import Link from "next/link";

export default function OfflinePage() {
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = () => {
    setIsReconnecting(true);
    // Simulate a brief connection check before reloading
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      {/* Background Gradients for Premium Aesthetics */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full bg-zinc-800/10 blur-[80px]" />
        <div className="absolute top-1/3 left-1/3 h-[200px] w-[200px] rounded-full bg-zinc-900/20 blur-[60px]" />
      </div>

      <div className="max-w-md w-full space-y-8 rounded-2xl border border-border bg-card/30 p-8 md:p-12 backdrop-blur-xl shadow-2xl">
        {/* Animated Premium Icon Container */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-zinc-950 border border-border shadow-inner relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-800 opacity-50 group-hover:opacity-80 transition-opacity" />
          <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent blur-md" />
          <WifiSlash className="relative h-12 w-12 text-muted-foreground/80 animate-pulse" />
        </div>

        {/* Content Section */}
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground lowercase md:text-4xl">
            connection lost
          </h1>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            It looks like you've gone offline. Please check your network connection or try reloading the page.
          </p>
        </div>

        {/* Try Reconnecting Interactive Button */}
        <div className="pt-2">
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 w-full cursor-pointer"
          >
            <ArrowClockwise className={`h-4 w-4 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? "checking connection..." : "try reconnecting"}
          </button>
        </div>

        {/* Navigation Link fallback */}
        <div className="text-xs text-muted-foreground/60 pt-2">
          <Link href="/" className="hover:text-foreground transition-colors underline underline-offset-4">
            go back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
