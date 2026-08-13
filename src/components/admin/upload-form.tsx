"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createUploadAction,
  generateMetadataAction,
  generateMetadataFromFileAction,
  saveImageAction,
} from "@/app/admin/actions";
import { ALL_VISION_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/ai-assistant";
import { compressImage } from "@/lib/compressor";
import type { PaletteColor } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";
import { ColorPalette } from "@/components/color-palette";
import { Sparkle, CircleNotch, UploadSimple, ImageSquare, Lightning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type UploadedFile = {
  key: string;
  previewKey: string;
  bucketId: string;
  bucketName: string;
  sizeBytes: number;
};

type Metadata = {
  title: string;
  description: string;
  tags: string[];
  palette: PaletteColor[];
  prompt: string;
};

export function UploadForm({
  bucketOptions,
  model,
  onSuccess,
}: {
  bucketOptions: { value: string; label: string }[];
  model?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [masterFile, setMasterFile] = React.useState<File | null>(null);
  const [previewFile, setPreviewFile] = React.useState<File | null>(null);
  const [masterPreviewUrl, setMasterPreviewUrl] = React.useState<string | null>(null);
  const [previewPreviewUrl, setPreviewPreviewUrl] = React.useState<string | null>(null);
  const [masterDimensions, setMasterDimensions] = React.useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = React.useState<"master" | "preview" | null>(null);
  const [compressingPreview, setCompressingPreview] = React.useState(false);
  const [isAutoCompressed, setIsAutoCompressed] = React.useState(false);
  
  const [uploaded, setUploaded] = React.useState<UploadedFile | null>(null);
  const [category, setCategory] = React.useState<string>("photo");
  const [metadata, setMetadata] = React.useState<Metadata>({
    title: "",
    description: "",
    tags: [],
    palette: [],
    prompt: "",
  });

  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [bucketId, setBucketId] = React.useState<string>(bucketOptions[0]?.value ?? "");
  const [aiModel, setAiModel] = React.useState<string>(
    model ?? DEFAULT_GEMINI_MODEL
  );

  const MODEL_OPTIONS = ALL_VISION_MODELS;

  const isMasterVideo = Boolean(
    (masterFile && (masterFile.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(masterFile.name))) ||
    category === "video"
  );

  const masterInputRef = React.useRef<HTMLInputElement>(null);
  const previewInputRef = React.useRef<HTMLInputElement>(null);

  async function extractVideoFrame(file: File): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      let resolved = false;
      const capture = () => {
        if (resolved) return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext("2d");
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                if (!resolved) {
                  resolved = true;
                  URL.revokeObjectURL(url);
                  resolve(blob);
                }
              },
              "image/jpeg",
              0.85
            );
            return;
          }
        } catch {}
        if (!resolved) {
          resolved = true;
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
      };

      video.onseeked = () => {
        capture();
      };

      video.onerror = () => {
        if (!resolved) {
          resolved = true;
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      setTimeout(() => {
        if (!resolved) capture();
      }, 4000);
    });
  }

  async function selectFile(slot: "master" | "preview", file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);

    if (slot === "master") {
      setMasterFile(file);
      setMasterPreviewUrl(url);

      if (isVideo) {
        setCategory("video");
        setPreviewFile(null);
        setPreviewPreviewUrl(null);
        setIsAutoCompressed(false);
        setCompressingPreview(false);

        const video = document.createElement("video");
        video.src = url;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setMasterDimensions({ width: video.videoWidth, height: video.videoHeight });
          }
        };
      } else {
        const img = new window.Image();
        img.onload = () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            setMasterDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          }
        };
        img.src = url;

        // Automatically generate compressed preview from Master using compressorjs
        setCompressingPreview(true);
        try {
          const compressed = await compressImage(file, {
            quality: 0.82,
            maxWidth: 1920,
            maxHeight: 1920,
            mimeType: "image/jpeg",
          });
          const compressedUrl = URL.createObjectURL(compressed);
          setPreviewFile(compressed);
          setPreviewPreviewUrl(compressedUrl);
          setIsAutoCompressed(true);
        } catch (err) {
          console.error("Auto compression failed:", err);
        } finally {
          setCompressingPreview(false);
        }
      }
    } else {
      setPreviewFile(file);
      setPreviewPreviewUrl(url);
      setIsAutoCompressed(false);
    }
  }

async function getOptimizedAiImageBase64(file: File, maxDim = 1024): Promise<{ base64: string; mimeType: string }> {
  const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);

  if (isVideo) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      video.src = url;
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("Video extraction timed out."));
      }, 15000);

      const tryCapture = (attempt = 0) => {
        try {
          let width = video.videoWidth || 1280;
          let height = video.videoHeight || 720;
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
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("Canvas context failed");

          ctx.drawImage(video, 0, 0, width, height);

          // Check brightness of sampled frame
          const sampleW = Math.min(width, 40);
          const sampleH = Math.min(height, 40);
          const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
          let sum = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            sum += imgData[i] + imgData[i + 1] + imgData[i + 2];
          }
          const avgBrightness = sum / (sampleW * sampleH * 3);

          // If frame is completely black and we have more seek points, try later timestamp
          const seekPoints = [0.25, 0.5, 0.75, 0.9];
          if (avgBrightness < 6 && attempt < seekPoints.length && video.duration > 0.5) {
            video.currentTime = Math.min(video.duration - 0.1, video.duration * seekPoints[attempt]);
            return;
          }

          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
        } catch (e) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          reject(e);
        }
      };

      video.onloadedmetadata = () => {
        const initSeek = video.duration > 1 ? Math.min(1.5, video.duration * 0.25) : 0.1;
        video.currentTime = initSeek;
      };

      let attemptCount = 0;
      video.onseeked = () => {
        attemptCount++;
        // Play briefly to ensure browser hardware decoder renders the frame
        video.play().then(() => {
          setTimeout(() => {
            video.pause();
            tryCapture(attemptCount);
          }, 100);
        }).catch(() => {
          tryCapture(attemptCount);
        });
      };

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(url);
        reject(new Error("Video playback error during frame extraction"));
      };
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
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
          const raw = (e.target?.result as string).split(",")[1];
          return resolve({ base64: raw, mimeType: file.type || "image/jpeg" });
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64: base64, mimeType: "image/jpeg" });
      };
      img.onerror = () => {
        const raw = (e.target?.result as string).split(",")[1];
        resolve({ base64: raw, mimeType: file.type || "image/jpeg" });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

  async function handleGenerate() {
    const targetFile = isMasterVideo ? masterFile : (previewFile || masterFile);
    if (!targetFile) {
      toast.error("Please select an asset first to generate metadata.");
      return;
    }

    const hint = targetFile.name.replace(/\.[^/.]+$/, "");

    setGenerating(true);
    try {
      if (uploaded) {
        const res = await generateMetadataAction({
          key: uploaded.previewKey || uploaded.key,
          bucketId: uploaded.bucketId,
          model: aiModel,
          hint,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        applyGeneratedMetadata(res);
      } else {
        // Optimize local image or extract frame before sending base64 to AI
        const { base64, mimeType } = await getOptimizedAiImageBase64(targetFile);

        const res = await generateMetadataFromFileAction({
          base64,
          mimeType,
          model: aiModel,
          hint,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }
        applyGeneratedMetadata(res);
      }
      toast.success("Metadata generated with AI Assistant!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Metadata generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function applyGeneratedMetadata(res: any) {
    setMetadata((m) => ({
      title: res.title ?? m.title,
      description: res.description ?? m.description,
      tags: res.tags && res.tags.length ? res.tags : m.tags,
      palette: res.palette && res.palette.length ? res.palette : m.palette,
      prompt: res.prompt ?? m.prompt,
    }));
  }

  async function uploadFilesToR2(): Promise<UploadedFile | null> {
    if (!masterFile) return null;
    const bucket = bucketOptions.find((b) => b.value === bucketId);
    if (!bucket) throw new Error("No bucket selected.");

    const res = await createUploadAction({
      bucketId,
      master: {
        fileName: masterFile.name,
        contentType: masterFile.type || (isMasterVideo ? "video/mp4" : "image/jpeg"),
        size: masterFile.size,
      },
      preview: previewFile && !isMasterVideo ? {
        fileName: previewFile.name,
        contentType: previewFile.type || "image/jpeg",
        size: previewFile.size,
      } : undefined,
    });

    if ("error" in res) throw new Error(res.error);

    const uploads = [
      fetch(res.url, {
        method: "PUT",
        headers: { "Content-Type": masterFile.type || (isMasterVideo ? "video/mp4" : "image/jpeg") },
        body: masterFile,
      }),
    ];

    if (res.previewUrl && previewFile && !isMasterVideo) {
      uploads.push(
        fetch(res.previewUrl, {
          method: "PUT",
          headers: { "Content-Type": previewFile.type || "image/jpeg" },
          body: previewFile,
        })
      );
    }

    const responses = await Promise.all(uploads);
    for (const r of responses) {
      if (!r.ok) throw new Error(`R2 upload failed: ${r.statusText}`);
    }

    const uploadedInfo: UploadedFile = {
      key: res.key,
      previewKey: res.previewKey || "",
      bucketId: res.bucketId,
      bucketName: res.bucketName,
      sizeBytes: masterFile.size + (res.previewUrl && previewFile ? previewFile.size : 0),
    };
    setUploaded(uploadedInfo);
    return uploadedInfo;
  }

  async function handleSaveAndUpload() {
    if (!metadata.title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (!uploaded && (!masterFile || (!isMasterVideo && !previewFile))) {
      toast.error(isMasterVideo ? "Please select a video file." : "Please select both master and preview images.");
      return;
    }

    setSaving(true);
    try {
      let fileInfo = uploaded;
      if (!fileInfo) {
        toast.info(isMasterVideo ? "Uploading video to Cloudflare R2…" : "Uploading images to Cloudflare R2…");
        fileInfo = await uploadFilesToR2();
      }

      if (!fileInfo) {
        toast.error("Upload failed.");
        return;
      }

      const form = new FormData();
      form.set("r2Key", fileInfo.key);
      form.set("previewKey", fileInfo.previewKey);
      form.set("bucketId", fileInfo.bucketId);
      form.set("sizeBytes", String(fileInfo.sizeBytes));
      if (masterDimensions?.width && masterDimensions?.height) {
        form.set("width", String(masterDimensions.width));
        form.set("height", String(masterDimensions.height));
      }
      form.set("category", category);
      form.set("title", metadata.title.trim());
      form.set("description", metadata.description.trim());
      form.set("prompt", metadata.prompt.trim());
      form.set("tags", metadata.tags.join(", "));
      form.set("palette", JSON.stringify(metadata.palette));

      const res = await saveImageAction({}, form);
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Image successfully added to library!");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/library");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save image.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Section: File Dropzones */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            slot: "master" as const,
            label: isMasterVideo ? "Master Video Asset" : "Master Image",
            sub: isMasterVideo ? "Full-res original (MP4, WebM, MOV)" : "Full-size original asset",
            ref: masterInputRef,
            file: masterFile,
            url: masterPreviewUrl,
          },
          {
            slot: "preview" as const,
            label: "Preview Image",
            sub: "Lightweight compressed preview",
            ref: previewInputRef,
            file: previewFile,
            url: previewPreviewUrl,
          },
        ].map(({ slot, label, sub, ref, file, url }) => (
          <div
            key={slot}
            role="button"
            tabIndex={0}
            onClick={() => ref.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(slot);
            }}
            onDragLeave={() => setDragging(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(null);
              selectFile(slot, e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition-all",
              dragging === slot
                ? "border-primary bg-primary/10"
                : file
                  ? "border-border/80 bg-muted/20"
                  : "border-border/60 bg-muted/10 hover:border-border hover:bg-muted/25"
            )}
          >
            <input
              ref={ref}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => selectFile(slot, e.target.files?.[0] ?? undefined)}
            />

            {slot === "preview" && compressingPreview ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CircleNotch className="size-6 animate-spin text-primary" />
                <p className="text-xs font-semibold text-foreground">Generating preview…</p>
                <p className="text-[11px] text-muted-foreground">Optimizing from master asset</p>
              </div>
            ) : file && url ? (
              <div className="flex w-full items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-background">
                  {file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name) ? (
                    <video src={url} className="size-full object-cover" muted playsInline />
                  ) : (
                    <Image src={url} alt={label} fill className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-foreground">{file.name}</p>
                    {slot === "preview" && isAutoCompressed && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-500">
                        <Lightning className="size-2.5" weight="fill" /> Auto
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(file.size)}
                    {slot === "master" && masterDimensions ? ` · ${masterDimensions.width}×${masterDimensions.height}` : ""}
                    {slot === "preview" && masterFile && masterFile.size > file.size && (
                      <span className="text-emerald-500 font-medium ml-1">
                        (-{Math.round(((masterFile.size - file.size) / masterFile.size) * 100)}%)
                      </span>
                    )}
                  </p>
                  <span className="mt-1 inline-block text-[10px] text-primary underline underline-offset-2">
                    Click to replace
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <ImageSquare className="size-6 text-muted-foreground/60 transition-transform group-hover:scale-110" />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Target Bucket Selector */}
      <Field>
        <FieldLabel className="text-xs">Storage Bucket</FieldLabel>
        <FormSelect
          name="bucket"
          defaultValue={bucketId}
          items={bucketOptions}
          onValueChange={setBucketId}
          className="h-9 text-xs"
        />
      </Field>

      {/* AI Assistant Banner */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkle className="size-4 text-foreground" weight="bold" />
            <p className="text-xs font-semibold text-foreground">AI Metadata Assistant</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-48 sm:w-60">
              <FormSelect
                name="ai-model"
                defaultValue={aiModel}
                items={MODEL_OPTIONS}
                onValueChange={setAiModel}
                className="h-8 text-xs bg-background"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-medium"
              disabled={generating || (!masterFile && !previewFile && !uploaded)}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <CircleNotch className="size-3.5 animate-spin" />
                  <span>Analyzing…</span>
                </>
              ) : (
                <>
                  <Sparkle className="size-3.5" />
                  <span>Generate</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Direct Metadata Fields */}
      <FieldGroup className="gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel className="text-xs">Category</FieldLabel>
            <FormSelect
              name="category"
              defaultValue={category}
              items={[
                { value: "photo", label: "Photo" },
                { value: "illustration", label: "Illustration" },
                { value: "3d", label: "3D Render" },
                { value: "video", label: "Video" },
              ]}
              onValueChange={setCategory}
              className="h-9 text-xs"
            />
          </Field>
          <Field>
            <FieldLabel className="text-xs">Title</FieldLabel>
            <Input
              value={metadata.title}
              onChange={(e) => setMetadata((m) => ({ ...m, title: e.target.value }))}
              placeholder="e.g. Misty Morning Valley"
              className="h-9 text-xs"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel className="text-xs">Description</FieldLabel>
          <Textarea
            value={metadata.description}
            onChange={(e) =>
              setMetadata((m) => ({ ...m, description: e.target.value }))
            }
            placeholder="Short description of the image…"
            rows={2}
            className="text-xs"
          />
        </Field>

        <Field>
          <FieldLabel className="text-xs">Tags (comma separated)</FieldLabel>
          <Input
            value={metadata.tags.join(", ")}
            onChange={(e) =>
              setMetadata((m) => ({
                ...m,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="nature, landscape, mist, dramatic lighting"
            className="h-9 text-xs"
          />
        </Field>

        <Field>
          <FieldLabel className="text-xs">Prompt (Optional / AI Generated)</FieldLabel>
          <Textarea
            value={metadata.prompt}
            onChange={(e) => setMetadata((m) => ({ ...m, prompt: e.target.value }))}
            placeholder="The text-to-image prompt used to generate this image…"
            rows={3}
            className="text-xs font-mono text-[11px]"
          />
        </Field>

        <Field>
          <FieldLabel className="text-xs">Color Palette</FieldLabel>
          {metadata.palette.length > 0 ? (
            <ColorPalette colors={metadata.palette} />
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No palette generated yet — click &ldquo;Generate&rdquo; above to extract colors automatically.
            </p>
          )}
        </Field>
      </FieldGroup>

      {/* Save Button */}
      <RippleButton
        type="button"
        className="w-full h-10 gap-2 rounded-xl font-medium shadow-xs"
        disabled={
          saving ||
          (!uploaded && (!masterFile || (!isMasterVideo && !previewFile))) ||
          !metadata.title.trim()
        }
        onClick={handleSaveAndUpload}
      >
        {saving ? (
          <>
            <CircleNotch className="size-4 animate-spin" />
            <span>Uploading & Saving…</span>
          </>
        ) : (
          <>
            <UploadSimple className="size-4" weight="bold" />
            <span>Save to Library</span>
          </>
        )}
        <RippleButtonRipples />
      </RippleButton>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}