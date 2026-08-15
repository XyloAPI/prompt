"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CloudArrowUp,
  Sparkle,
  Copy,
  Check,
  Trash,
  CircleNotch,
  ImageSquare,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export default function ImageToPromptPage() {
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [base64Data, setBase64Data] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [promptResult, setPromptResult] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [language, setLanguage] = React.useState("en");
  const [model, setModel] = React.useState("general");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resizeAndCompress = async (file: File): Promise<{ base64: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const maxDim = 1024; // Limit dimensions for efficient payload transfer
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get 2D context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve({
            base64: dataUrl, // full data URI
            preview: dataUrl,
          });
        };
        img.onerror = () => reject(new Error("Failed to load image element"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setImageFile(file);
    try {
      const { base64, preview } = await resizeAndCompress(file);
      setBase64Data(base64);
      setImagePreview(preview);
      setPromptResult(null);
    } catch (err: any) {
      toast.error("Failed to process image: " + err.message);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!base64Data) {
      toast.error("Please upload an image first");
      return;
    }

    setGenerating(true);
    setPromptResult(null);

    try {
      const response = await fetch("/api/tools/image-to-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Data,
          language,
          model,
        }),
      });

      const data = await response.json();
      if (data.success && data.prompt) {
        setPromptResult(data.prompt);
        toast.success("Prompt generated successfully!");
      } else {
        throw new Error(data.error || "Failed to generate prompt");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred during generation");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!promptResult) return;
    navigator.clipboard.writeText(promptResult);
    setCopied(true);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setBase64Data(null);
    setPromptResult(null);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" weight="bold" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Image to Prompt
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Extract detailed descriptive prompts from your visual assets instantly.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Input & Setup */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-foreground mb-4">Input Asset</h2>

            {/* Dropzone */}
            {!imagePreview ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex h-72 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-6 text-center transition-all hover:bg-muted/20 hover:border-primary/50"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
                <div className="flex size-12 items-center justify-center rounded-full border border-border bg-background shadow-xs transition-transform group-hover:scale-105">
                  <CloudArrowUp className="size-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-xs font-semibold text-foreground">
                  Drag and drop your image here, or click to browse
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Supports PNG, JPEG, WEBP, or GIF up to 10MB
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/40 aspect-video flex items-center justify-center">
                  <div className="relative inline-flex max-h-full max-w-full overflow-hidden rounded-lg">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-[280px] w-auto max-w-full object-contain relative z-10"
                    />
                    {/* Scanning Animation */}
                    {generating && (
                      <div
                        className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/80 to-transparent shadow-[0_0_16px_4px_rgba(255,255,255,0.25)] pointer-events-none scanner-line z-20"
                        style={{
                          animation: "scan 2.5s ease-in-out infinite",
                        }}
                      />
                    )}
                  </div>
                  <style jsx global>{`
                    @keyframes scan {
                      0% { top: 0%; }
                      50% { top: 100%; }
                      100% { top: 0%; }
                    }
                    .scanner-line {
                      animation: scan 2.5s ease-in-out infinite;
                    }
                  `}</style>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[200px] font-mono">
                    {imageFile?.name}
                  </span>
                  <button
                    onClick={handleClear}
                    className="flex items-center gap-1.5 font-medium text-destructive hover:underline cursor-pointer"
                  >
                    <Trash className="size-3.5" />
                    <span>Clear image</span>
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                disabled={generating || !base64Data}
                onClick={handleGenerate}
                className={cn(
                  "w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md",
                  (generating || !base64Data) && "opacity-50 cursor-not-allowed"
                )}
              >
                {generating ? (
                  <>
                    <CircleNotch className="size-4 animate-spin" />
                    <span>Analyzing Image...</span>
                  </>
                ) : (
                  <>
                    <Sparkle className="size-4" weight="bold" />
                    <span>Generate Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-xs h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Generated Prompt</h2>
              {promptResult && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="size-4 text-emerald-500" />
                      <span className="text-emerald-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              {!generating && !promptResult ? (
                <div className="flex-1 min-h-[300px] border border-dashed border-border/60 rounded-xl bg-muted/5 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <ImageSquare className="size-10 text-muted-foreground/40 mb-3" />
                  <p className="text-xs font-medium">No prompt generated yet</p>
                  <p className="text-[11px] mt-1 max-w-sm">
                    Upload an image on the left and click "Generate Prompt" to get started.
                  </p>
                </div>
              ) : generating ? (
                <div className="flex-1 min-h-[300px] border border-border/50 rounded-xl bg-muted/10 p-6 flex flex-col gap-3">
                  {/* Glowing skeleton lines */}
                  <div className="h-4 w-3/4 rounded-sm bg-muted animate-pulse" />
                  <div className="h-4 w-full rounded-sm bg-muted animate-pulse" />
                  <div className="h-4 w-5/6 rounded-sm bg-muted animate-pulse" />
                  <div className="h-4 w-4/5 rounded-sm bg-muted animate-pulse" />
                  <div className="h-4 w-full rounded-sm bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 rounded-sm bg-muted animate-pulse" />
                </div>
              ) : (
                <div className="flex-1 min-h-[300px] border border-border/50 rounded-xl bg-muted/10 p-5 text-sm leading-relaxed text-foreground select-text font-sans whitespace-pre-wrap">
                  {promptResult}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
