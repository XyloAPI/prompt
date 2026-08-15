"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, LinkSimple, DownloadSimple } from "@phosphor-icons/react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface DetailImageWrapperProps {
  url: string;
  title: string;
  prompt?: string;
  isVideo: boolean;
  children: React.ReactNode;
}

export function DetailImageWrapper({
  url,
  title,
  prompt,
  isVideo,
  children,
}: DetailImageWrapperProps) {
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = url.split(".").pop()?.split("?")[0] || (isVideo ? "mp4" : "png");
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch (err) {
      window.open(url, "_blank");
      toast.success("Opening asset link for download...");
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative inline-flex max-w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-2xl">
          {children}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-52">
        <ContextMenuItem
          className="cursor-pointer"
          onClick={() => handleCopyText(url, "URL")}
        >
          <LinkSimple className="size-4 text-muted-foreground" />
          <span>Copy Asset URL</span>
        </ContextMenuItem>

        {prompt && (
          <ContextMenuItem
            className="cursor-pointer"
            onClick={() => handleCopyText(prompt, "Prompt")}
          >
            <Copy className="size-4 text-muted-foreground" />
            <span>Copy Prompt</span>
          </ContextMenuItem>
        )}

        <ContextMenuItem
          className="cursor-pointer"
          onClick={() => handleCopyText(title, "Title")}
        >
          <Copy className="size-4 text-muted-foreground" />
          <span>Copy Title</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem
          className="cursor-pointer"
          onClick={handleDownload}
        >
          <DownloadSimple className="size-4 text-muted-foreground" />
          <span>Download Asset</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
