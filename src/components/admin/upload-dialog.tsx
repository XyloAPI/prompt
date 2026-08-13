"use client";

import * as React from "react";
import { PlusCircle } from "@phosphor-icons/react";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadForm } from "@/components/admin/upload-form";

export function UploadDialog({
  model,
  triggerVariant = "default",
}: {
  model?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <RippleButton
          variant={triggerVariant}
          className="gap-2 rounded-full font-medium shadow-xs"
        >
          <PlusCircle className="size-4" weight="bold" />
          <span>Upload asset</span>
          <RippleButtonRipples />
        </RippleButton>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <DialogTitle className="text-xl font-bold tracking-tight">Upload New Asset</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-90px)] px-6 py-5">
          <UploadForm
            model={model}
            onSuccess={() => setOpen(false)}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
