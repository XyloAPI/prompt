"use client";

import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DownloadSimple, X } from "@phosphor-icons/react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    // Check if dismissed recently (within 3 days)
    const dismissedAt = localStorage.getItem("pwa_install_dismissed_at");
    if (dismissedAt) {
      const diff = Date.now() - parseInt(dismissedAt, 10);
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (diff < threeDays) {
        return; // Don't show
      }
    }

    const handler = (e: Event) => {
      // Prevent the default browser prompt
      e.preventDefault();
      // Store the event
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Open our drawer
      setIsOpen(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Trigger the browser prompt
    await deferredPrompt.prompt();
    
    // Wait for the user choice
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      console.log("PWA install accepted");
    }
    
    setDeferredPrompt(null);
    setIsOpen(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_dismissed_at", Date.now().toString());
    setIsOpen(false);
  };

  if (!deferredPrompt) return null;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="border-t border-border bg-card p-4 md:p-6">
        <div className="mx-auto max-w-md w-full">
          <DrawerHeader className="relative flex flex-col items-center text-center pb-4">
            <button
              onClick={handleDismiss}
              className="absolute right-0 top-0 rounded-full p-1.5 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Glowing Brand Icon */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 border border-border shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900 to-zinc-800 opacity-50" />
              <Image src="/luminaq.svg" alt="Luminaq Logo" width={32} height={32} className="relative z-10 invert dark:invert-0" />
            </div>

            <DrawerTitle className="font-heading text-2xl font-bold tracking-tight text-foreground lowercase">
              install luminaq
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground max-w-sm mt-1">
              Add Luminaq to your home screen for quick, offline-ready access to our AI visual library.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter className="flex flex-col gap-2 p-0 pt-2">
            <Button
              onClick={handleInstall}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <DownloadSimple className="mr-2 size-4" weight="bold" />
              Install App
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full h-11 rounded-xl text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer"
            >
              Maybe later
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
