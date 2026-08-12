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
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini";
import type { PaletteColor } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";
import { ColorPalette } from "@/components/color-palette";
import { Sparkle, CircleNotch, UploadSimple, ImageSquare } from "@phosphor-icons/react";
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
  const [geminiModel, setGeminiModel] = React.useState<string>(
    model ?? DEFAULT_GEMINI_MODEL
  );

  const MODEL_OPTIONS = [
    { value: "gemini-3.5-flash", label: "gemini-3.5-flash (recommended)" },
    { value: "gemini-3.5-flash-lite", label: "gemini-3.5-flash-lite" },
    { value: "gemini-3-flash-preview", label: "gemini-3-flash-preview (preview)" },
  ];

  const masterInputRef = React.useRef<HTMLInputElement>(null);
  const previewInputRef = React.useRef<HTMLInputElement>(null);

  function selectFile(slot: "master" | "preview", file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (slot === "master") {
      setMasterFile(file);
      setMasterPreviewUrl(url);

      const img = new window.Image();
      img.onload = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setMasterDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      img.src = url;

    } else {
      setPreviewFile(file);
      setPreviewPreviewUrl(url);
    }
  }

  async function handleGenerate() {
    const targetFile = previewFile || masterFile;
    if (!targetFile) {
      toast.error("Please select an image first to generate metadata.");
      return;
    }

    setGenerating(true);
    try {
      if (uploaded) {
        const res = await generateMetadataAction({
          key: uploaded.previewKey || uploaded.key,
          bucketId: uploaded.bucketId,
          model: geminiModel,
        });
        if (res.error) {
          toast.error(res.error);
          return;
        }
        applyGeneratedMetadata(res);
      } else {
        // Generate directly from local file base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(targetFile);
        const base64 = await base64Promise;

        const res = await generateMetadataFromFileAction({
          base64,
          mimeType: targetFile.type || "image/jpeg",
          model: geminiModel,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }
        applyGeneratedMetadata(res);
      }
      toast.success("Metadata generated with Gemini!");
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
    if (!masterFile || !previewFile) return null;
    const bucket = bucketOptions.find((b) => b.value === bucketId);
    if (!bucket) throw new Error("No bucket selected.");

    const res = await createUploadAction({
      bucketId,
      master: {
        fileName: masterFile.name,
        contentType: masterFile.type || "image/jpeg",
        size: masterFile.size,
      },
      preview: {
        fileName: previewFile.name,
        contentType: previewFile.type || "image/jpeg",
        size: previewFile.size,
      },
    });

    if ("error" in res) throw new Error(res.error);

    const uploads = [
      fetch(res.url, {
        method: "PUT",
        headers: { "Content-Type": masterFile.type || "image/jpeg" },
        body: masterFile,
      }),
    ];

    if (res.previewUrl) {
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
      previewKey: res.previewKey,
      bucketId: res.bucketId,
      bucketName: res.bucketName,
      sizeBytes: masterFile.size + (res.previewUrl ? previewFile.size : 0),
    };
    setUploaded(uploadedInfo);
    return uploadedInfo;
  }

  async function handleSaveAndUpload() {
    if (!metadata.title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (!uploaded && (!masterFile || !previewFile)) {
      toast.error("Please select both master and preview images.");
      return;
    }

    setSaving(true);
    try {
      let fileInfo = uploaded;
      if (!fileInfo) {
        toast.info("Uploading images to Cloudflare R2…");
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
        {(
          [
            {
              slot: "master" as const,
              label: "Master Image",
              sub: "Full-size original asset",
              ref: masterInputRef,
              file: masterFile,
              url: masterPreviewUrl,
            },
            {
              slot: "preview" as const,
              label: "Preview Image",
              sub: "Lightweight web display",
              ref: previewInputRef,
              file: previewFile,
              url: previewPreviewUrl,
            },
          ] as const
        ).map(({ slot, label, sub, ref, file, url }) => (
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
              accept="image/*"
              className="hidden"
              onChange={(e) => selectFile(slot, e.target.files?.[0] ?? undefined)}
            />

            {file && url ? (
              <div className="flex w-full items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-background">
                  <Image src={url} alt={label} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-semibold text-foreground">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(file.size)}
                    {slot === "master" && masterDimensions ? ` · ${masterDimensions.width}×${masterDimensions.height}` : ""}
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
            <div className="w-44 sm:w-52">
              <FormSelect
                name="gemini-model"
                defaultValue={geminiModel}
                items={MODEL_OPTIONS}
                onValueChange={setGeminiModel}
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
        disabled={saving || (!uploaded && (!masterFile || !previewFile)) || !metadata.title.trim()}
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