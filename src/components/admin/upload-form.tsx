"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  generateMetadataAction,
  generateMetadataFromFileAction,
  saveImageAction,
} from "@/app/admin/actions";
import { ALL_VISION_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/ai-assistant";
import type { PaletteColor } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";
import { ColorPalette } from "@/components/color-palette";
import { Sparkle, CircleNotch, UploadSimple, ImageSquare, LinkSimple, Info, CloudArrowUp, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compressor";

type Metadata = {
  title: string;
  description: string;
  tags: string[];
  palette: PaletteColor[];
  prompt: string;
};

export function UploadForm({
  model,
  onSuccess,
}: {
  model?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();

  // Local files for dimensions and instant client previews
  const [masterFile, setMasterFile] = React.useState<File | null>(null);
  const [masterPreviewUrl, setMasterPreviewUrl] = React.useState<string | null>(null);
  const [masterDimensions, setMasterDimensions] = React.useState<{ width: number; height: number } | null>(null);

  const [previewFile, setPreviewFile] = React.useState<File | null>(null);
  const [previewPreviewUrl, setPreviewPreviewUrl] = React.useState<string | null>(null);

  const [uploadingMaster, setUploadingMaster] = React.useState(false);
  const [uploadingPreview, setUploadingPreview] = React.useState(false);
  const [dragging, setDragging] = React.useState<"master" | "preview" | null>(null);

  // Field values
  const [masterUrl, setMasterUrl] = React.useState("");
  const [previewUrl, setPreviewUrl] = React.useState("");
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
  const [aiModel, setAiModel] = React.useState<string>(model ?? DEFAULT_GEMINI_MODEL);

  const MODEL_OPTIONS = ALL_VISION_MODELS;
  const masterInputRef = React.useRef<HTMLInputElement>(null);
  const previewInputRef = React.useRef<HTMLInputElement>(null);

  // Sync Master File properties (Dimensions & Category)
  React.useEffect(() => {
    if (masterFile) {
      const url = URL.createObjectURL(masterFile);
      setMasterPreviewUrl(url);

      const isVideo = masterFile.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(masterFile.name);
      if (isVideo) {
        setCategory("video");
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
      }

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setMasterPreviewUrl(null);
      setMasterDimensions(null);
    }
  }, [masterFile]);

  React.useEffect(() => {
    if (previewFile) {
      const url = URL.createObjectURL(previewFile);
      setPreviewPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewPreviewUrl(null);
    }
  }, [previewFile]);

  async function selectFile(slot: "master" | "preview", file: File | undefined) {
    if (!file) return;

    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
    if (slot === "master" && !isVideo) {
      compressImage(file)
        .then((compressedFile) => {
          selectFile("preview", compressedFile);
        })
        .catch((err) => {
          console.error("Auto-compression failed:", err);
        });
    }

    if (slot === "master") {
      setUploadingMaster(true);
      setMasterFile(file);
    } else {
      setUploadingPreview(true);
      setPreviewFile(file);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed with status ${response.status}`);
      }

      const res = await response.json();

      if (res.error) {
        toast.error(res.error);
        if (slot === "master") setMasterFile(null);
        else setPreviewFile(null);
        return;
      }

      if (res.url) {
        toast.success(`Uploaded ${file.name} to Storage!`);
        if (slot === "master") {
          setMasterUrl(res.url);
        } else {
          setPreviewUrl(res.url);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
      if (slot === "master") setMasterFile(null);
      else setPreviewFile(null);
    } finally {
      if (slot === "master") setUploadingMaster(false);
      else setUploadingPreview(false);
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

            const sampleW = Math.min(width, 40);
            const sampleH = Math.min(height, 40);
            const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
            let sum = 0;
            for (let i = 0; i < imgData.length; i += 4) {
              sum += imgData[i] + imgData[i + 1] + imgData[i + 2];
            }
            const avgBrightness = sum / (sampleW * sampleH * 3);

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
    if (!masterFile && !masterUrl.trim()) {
      toast.error("Please select a file or paste a Master URL first to generate metadata.");
      return;
    }

    const hint = masterFile
      ? masterFile.name.replace(/\.[^/.]+$/, "")
      : masterUrl.split("/").pop()?.split("?")[0].replace(/\.[^/.]+$/, "") ?? "";

    setGenerating(true);
    try {
      if (masterFile) {
        const { base64, mimeType } = await getOptimizedAiImageBase64(masterFile);
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
      } else {
        const res = await generateMetadataAction({
          url: masterUrl.trim(),
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

  async function handleSave() {
    if (!metadata.title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (!masterUrl.trim()) {
      toast.error("Please enter or upload a Master URL.");
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.set("url", masterUrl.trim());
      form.set("thumbnailUrl", previewUrl.trim() || masterUrl.trim());

      const width = masterDimensions?.width ?? 1200;
      const height = masterDimensions?.height ?? 800;
      form.set("width", String(width));
      form.set("height", String(height));

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

      toast.success("Asset successfully added to library!");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/library");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  }

  const isVideo = category === "video" || (masterFile && (masterFile.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(masterFile.name)));

  return (
    <div className="space-y-6">
      {/* Storage Slots */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            slot: "master" as const,
            label: isVideo ? "Master Video Asset" : "Master Asset",
            sub: "Upload to Storage",
            ref: masterInputRef,
            file: masterFile,
            url: masterPreviewUrl,
            loading: uploadingMaster,
            value: masterUrl,
          },
          {
            slot: "preview" as const,
            label: "Preview Asset",
            sub: "Upload preview to Storage",
            ref: previewInputRef,
            file: previewFile,
            url: previewPreviewUrl,
            loading: uploadingPreview,
            value: previewUrl,
          },
        ].map(({ slot, label, sub, ref, file, url, loading, value }) => (
          <div
            key={slot}
            role="button"
            tabIndex={0}
            onClick={() => !loading && ref.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && !loading && ref.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(slot);
            }}
            onDragLeave={() => setDragging(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(null);
              if (e.dataTransfer.files?.[0]) {
                selectFile(slot, e.dataTransfer.files[0]);
              }
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
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  selectFile(slot, e.target.files[0]);
                }
              }}
            />

            {loading ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <CircleNotch className="size-6 animate-spin text-primary" />
                <p className="text-xs font-semibold text-foreground">Uploading to Storage…</p>
              </div>
            ) : file && url ? (
              <div className="flex w-full items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-background">
                  {file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(file.name) || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url) ? (
                    <video src={url} className="size-full object-cover" muted playsInline />
                  ) : (
                    <Image src={url} alt={label} fill className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-semibold text-foreground">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {slot === "master" && masterDimensions ? `${masterDimensions.width}×${masterDimensions.height} · ` : ""}
                    {value ? (
                      <span className="text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle className="size-3.5 fill-emerald-500" /> Uploaded
                      </span>
                    ) : (
                      "Waiting for URL..."
                    )}
                  </p>
                  <span className="mt-1 inline-block text-[10px] text-primary underline underline-offset-2">
                    Click to replace file
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <CloudArrowUp className="size-6 text-muted-foreground/60 transition-transform group-hover:scale-110" />
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* URL Inputs */}
      <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <LinkSimple className="size-4 text-muted-foreground" />
          <span>Asset Source URLs</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel className="text-xs">Master Asset URL</FieldLabel>
            <Input
              value={masterUrl}
              onChange={(e) => setMasterUrl(e.target.value)}
              placeholder="Auto-populated or paste Storage URL"
              className="h-9 text-xs"
              required
            />
          </Field>
          <Field>
            <FieldLabel className="text-xs">Preview Image URL (Optional)</FieldLabel>
            <Input
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="Auto-populated or paste Preview URL"
              className="h-9 text-xs"
            />
          </Field>
        </div>
      </div>

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
              disabled={generating || (!masterFile && !masterUrl.trim())}
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

      {/* Metadata Fields */}
      <FieldGroup className="gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel className="text-xs">Category</FieldLabel>
            <FormSelect
              name="category"
              value={category}
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
        disabled={saving || uploadingMaster || uploadingPreview || !masterUrl.trim() || !metadata.title.trim()}
        onClick={handleSave}
      >
        {saving ? (
          <>
            <CircleNotch className="size-4 animate-spin" />
            <span>Saving to Library…</span>
          </>
        ) : (
          <>
            <Sparkle className="size-4" weight="bold" />
            <span>Save to Library</span>
          </>
        )}
        <RippleButtonRipples />
      </RippleButton>
    </div>
  );
}