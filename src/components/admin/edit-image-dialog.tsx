"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash, Sparkle, CircleNotch, UploadSimple } from "@phosphor-icons/react";
import {
  createReplaceUploadAction,
  generateMetadataAction,
  updateImageAction,
  deleteImageAction,
  refreshImageSizeAction,
} from "@/app/admin/actions";
import { ALL_VISION_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/ai-assistant";
import type { Category, Image as ImageType } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/admin/form-select";
import { ColorPalette } from "@/components/color-palette";
import { CopyButton } from "@/components/animate-ui/components/buttons/copy";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const categoryOptions: { value: Category; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "illustration", label: "Illustration" },
  { value: "3d", label: "3D" },
  { value: "video", label: "Video" },
];

const MODEL_OPTIONS = ALL_VISION_MODELS;

export function EditImageDialog({
  image,
  model,
  open,
  onOpenChange,
}: {
  image: ImageType;
  model?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [metadata, setMetadata] = React.useState({
    title: image.title,
    description: image.description ?? "",
    category: image.category,
    tags: image.tags ?? [],
    palette: image.palette ?? [],
    prompt: image.prompt ?? "",
  });
  const [masterFile, setMasterFile] = React.useState<File | null>(null);
  const [previewFile, setPreviewFile] = React.useState<File | null>(null);
  const [aiModel, setAiModel] = React.useState<string>(model ?? DEFAULT_GEMINI_MODEL);
  const [saving, setSaving] = React.useState(false);
  const [replacing, setReplacing] = React.useState<"master" | "preview" | null>(null);
  const [generating, setGenerating] = React.useState(false);

  async function replaceFile(slot: "master" | "preview", file: File) {
    if (!image.bucketId || !image.r2Key) {
      toast.error("This image has no R2 object to replace.");
      return;
    }
    setReplacing(slot);
    try {
      const key =
        slot === "master"
          ? image.r2Key
          : image.r2Key.startsWith("images/")
            ? `images/preview/${image.r2Key.slice("images/".length)}`
            : image.r2Key;

      const res = await createReplaceUploadAction({
        bucketId: image.bucketId,
        ...(slot === "master" ? { master: { key, contentType: file.type } } : {}),
        ...(slot === "preview" ? { preview: { key, contentType: file.type } } : {}),
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const target = slot === "master" ? res.master : res.preview;
      if (!target) return;

      const putRes = await fetch(target.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        toast.error(`Replace failed (${putRes.status}).`);
        return;
      }
      if (slot === "master") {
        setMasterFile(null);
        // Calculate new master dimensions
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = async () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            await updateImageAction({
              id: image.id,
              title: metadata.title,
              description: metadata.description,
              category: metadata.category,
              tags: metadata.tags,
              palette: metadata.palette,
              prompt: metadata.prompt,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
          URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => URL.revokeObjectURL(objectUrl);
        img.src = objectUrl;
      } else {
        setPreviewFile(null);
      }
      await refreshImageSizeAction(image.id);
      toast.success(`${slot === "master" ? "Master" : "Preview"} replaced`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Replace failed.");
    } finally {
      setReplacing(null);
    }
  }

  async function handleGenerate() {
    if (!image.bucketId || !image.r2Key) {
      toast.error("This image has no R2 object to analyze.");
      return;
    }
    setGenerating(true);
    try {
      const res = await generateMetadataAction({
        key: image.r2Key,
        bucketId: image.bucketId,
        model: aiModel,
      });
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setMetadata((m) => ({
        ...m,
        title: res.title ?? m.title,
        description: res.description ?? m.description,
        tags: res.tags ?? m.tags,
        palette: res.palette ?? m.palette,
        prompt: res.prompt ?? m.prompt,
      }));
      toast.success("Metadata regenerated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generate failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await updateImageAction({
        id: image.id,
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags,
        palette: metadata.palette,
        prompt: metadata.prompt,
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Changes saved");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-lg font-semibold">Edit Image</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(85vh-140px)] px-5 sm:px-6 py-5">
          <div className="space-y-5">
            {/* Thumbnails */}
            <div className="grid gap-3 sm:grid-cols-2">
            <FileSlot
              label="Master"
              src={image.url}
              file={masterFile}
              onSelect={(f) => setMasterFile(f)}
              onReplace={() => masterFile && replaceFile("master", masterFile)}
              busy={replacing === "master"}
            />
            <FileSlot
              label="Preview"
              src={image.thumbnailUrl}
              file={previewFile}
              onSelect={(f) => setPreviewFile(f)}
              onReplace={() => previewFile && replaceFile("preview", previewFile)}
              busy={replacing === "preview"}
            />
          </div>

          {/* URLs */}
          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 text-sm">
            <UrlRow label="Master URL" url={image.url} />
            {image.thumbnailUrl !== image.url && (
              <UrlRow label="Preview URL" url={image.thumbnailUrl} />
            )}
          </div>

          {/* AI Metadata Assistant Card */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    className="h-8 text-xs bg-background/80"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium"
                  disabled={generating || !image.r2Key}
                  onClick={handleGenerate}
                >
                  {generating ? (
                    <>
                      <CircleNotch className="size-3.5 animate-spin" />
                      <span>Generating…</span>
                    </>
                  ) : (
                    <>
                      <Sparkle className="size-3.5" />
                      <span>Regenerate</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Category</FieldLabel>
                <FormSelect
                  name="category"
                  defaultValue={metadata.category}
                  items={categoryOptions}
                  onValueChange={(v) => setMetadata((m) => ({ ...m, category: v as Category }))}
                  className="h-8 text-sm"
                />
              </Field>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={metadata.title}
                  onChange={(e) => setMetadata((m) => ({ ...m, title: e.target.value }))}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={metadata.description}
                onChange={(e) => setMetadata((m) => ({ ...m, description: e.target.value }))}
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel>Tags (comma separated)</FieldLabel>
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
              />
            </Field>

            <Field>
              <FieldLabel>Prompt</FieldLabel>
              <Textarea
                value={metadata.prompt}
                onChange={(e) => setMetadata((m) => ({ ...m, prompt: e.target.value }))}
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel>Color palette</FieldLabel>
              {metadata.palette.length > 0 ? (
                <ColorPalette colors={metadata.palette} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  No palette — use &ldquo;Regenerate&rdquo; to add one.
                </p>
              )}
            </Field>
          </FieldGroup>
        </div>
      </ScrollArea>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/20 m-0">
          <DeleteImageButton id={image.id} title={image.title} />
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <RippleButton size="sm" onClick={handleSave} disabled={saving || !metadata.title.trim()}>
            {saving ? "Saving…" : "Save changes"}
            <RippleButtonRipples />
          </RippleButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileSlot({
  label,
  src,
  file,
  onSelect,
  onReplace,
  busy,
}: {
  label: string;
  src: string;
  file: File | null;
  onSelect: (f: File | null) => void;
  onReplace: () => void;
  busy: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isVideo = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(src);
  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-xs">
        {isVideo ? (
          <video
            src={src}
            loop
            muted
            playsInline
            preload="metadata"
            controls
            className="size-full object-cover"
          />
        ) : (
          <Image src={src} alt={label} fill className="object-cover" sizes="(min-width: 640px) 280px, 100vw" />
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-foreground uppercase backdrop-blur-md shadow-xs border border-border/40">
            {label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={label.toLowerCase().includes("master") ? "image/*,video/*" : "image/*"}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) {
              const isMaster = label.toLowerCase().includes("master");
              if (!isMaster && !f.type.startsWith("image/")) {
                toast.error("Please choose an image file for preview.");
                return;
              }
              onSelect(f);
              e.target.value = "";
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 flex-1 text-xs truncate"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <UploadSimple className="size-3.5 shrink-0 mr-1 text-muted-foreground" />
          <span className="truncate">{busy ? "Replacing…" : file ? file.name : "Replace file"}</span>
        </Button>
        {file && (
          <Button type="button" size="sm" className="h-8 text-xs" onClick={onReplace} disabled={busy}>
            Upload
          </Button>
        )}
      </div>
    </div>
  );
}

function UrlRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-md bg-background/70 border border-border/40 px-2.5 py-1 font-mono text-xs text-foreground select-all">
        {url}
      </code>
      <CopyButton content={url} variant="outline" size="icon-sm" hoverScale={1} tapScale={0.95} />
    </div>
  );
}

function DeleteImageButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash />
          <span>Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete image?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{title}&rdquo; and its preview will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              await deleteImageAction(id);
              setOpen(false);
              router.refresh();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ImageThumb({ image }: { image: ImageType }) {
  const isThumbnailVideo = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.thumbnailUrl);

  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden rounded-lg bg-muted")}>
      {isThumbnailVideo ? (
        <video
          src={image.thumbnailUrl || image.url}
          loop
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      ) : (
        <Image src={image.thumbnailUrl || image.url} alt={image.title} fill className="object-cover" sizes="(min-width: 1024px) 200px, 50vw" />
      )}
    </div>
  );
}
