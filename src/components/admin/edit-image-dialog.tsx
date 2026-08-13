"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash, Sparkle, CircleNotch, LinkSimple, Play } from "@phosphor-icons/react";
import {
  generateMetadataAction,
  updateImageAction,
  deleteImageAction,
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
  
  // URL States
  const [masterUrl, setMasterUrl] = React.useState(image.url);
  const [previewUrl, setPreviewUrl] = React.useState(image.thumbnailUrl);

  const [metadata, setMetadata] = React.useState({
    title: image.title,
    description: image.description ?? "",
    category: image.category,
    tags: image.tags ?? [],
    palette: image.palette ?? [],
    prompt: image.prompt ?? "",
  });

  const [aiModel, setAiModel] = React.useState<string>(model ?? DEFAULT_GEMINI_MODEL);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMasterUrl(image.url);
      setPreviewUrl(image.thumbnailUrl);
      setMetadata({
        title: image.title,
        description: image.description ?? "",
        category: image.category,
        tags: image.tags ?? [],
        palette: image.palette ?? [],
        prompt: image.prompt ?? "",
      });
    }
  }, [open, image]);

  async function handleGenerate() {
    if (!masterUrl.trim()) {
      toast.error("Please provide a Master URL first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await generateMetadataAction({
        url: masterUrl.trim(),
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
    if (!masterUrl.trim()) {
      toast.error("Master URL is required.");
      return;
    }
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
        url: masterUrl.trim(),
        thumbnailUrl: previewUrl.trim() || masterUrl.trim(),
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

  const isVideoCategory = metadata.category === "video" || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(masterUrl);
  const showPreviewSrc = previewUrl.trim() || masterUrl.trim();
  const isPreviewVideo = /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(showPreviewSrc);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-lg font-semibold">Edit Asset</DialogTitle>
        </DialogHeader>
 
        <ScrollArea className="h-[calc(85vh-140px)] px-5 sm:px-6 py-5">
          <div className="space-y-5">
            {/* Visual Previews */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Master Asset Preview</p>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted border">
                  {masterUrl ? (
                    isVideoCategory ? (
                      <video
                        src={masterUrl}
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Image src={masterUrl} alt="Master" fill className="object-cover" sizes="280px" unoptimized />
                    )
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">No URL provided</div>
                  )}
                </div>
              </div>
 
              <div className="rounded-xl border border-border/60 bg-muted/20 p-2 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Preview Thumbnail</p>
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted border">
                  {showPreviewSrc ? (
                    isPreviewVideo ? (
                      <video
                        src={showPreviewSrc}
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Image src={showPreviewSrc} alt="Preview" fill className="object-cover" sizes="280px" unoptimized />
                    )
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">No URL provided</div>
                  )}
                </div>
              </div>
            </div>

            {/* URL Editing Fields */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                <LinkSimple className="size-4 text-muted-foreground" />
                <span>Asset Source URLs</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs">Master URL</FieldLabel>
                  <Input
                    value={masterUrl}
                    onChange={(e) => setMasterUrl(e.target.value)}
                    placeholder=""
                    className="h-8.5 text-xs"
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Preview URL</FieldLabel>
                  <Input
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                    placeholder=""
                    className="h-8.5 text-xs"
                  />
                </Field>
              </div>
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
                    disabled={generating || !masterUrl.trim()}
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

            {/* Metadata Fields */}
            <FieldGroup className="gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <FormSelect
                    name="category"
                    value={metadata.category}
                    items={categoryOptions}
                    onValueChange={(v) => setMetadata((m) => ({ ...m, category: v as Category }))}
                    className="h-8.5 text-sm"
                  />
                </Field>
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    value={metadata.title}
                    onChange={(e) => setMetadata((m) => ({ ...m, title: e.target.value }))}
                    className="h-8.5 text-sm"
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
                  className="h-8.5 text-sm"
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

        <div className="flex p-4 px-6 border-t border-border/60 bg-muted/20 m-0 items-center gap-3">
          <DeleteImageButton id={image.id} title={image.title} />
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <RippleButton size="sm" onClick={handleSave} disabled={saving || !metadata.title.trim()}>
            {saving ? "Saving…" : "Save changes"}
            <RippleButtonRipples />
          </RippleButton>
        </div>
      </DialogContent>
    </Dialog>
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
          <AlertDialogTitle>Delete asset?</AlertDialogTitle>
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
  const isVideo = image.category === "video" || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(image.url);
  const previewUrl = image.thumbnailUrl || image.url;

  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden rounded-lg bg-muted")}>
      {!previewUrl ? (
        <div className="flex size-full flex-col items-center justify-center bg-muted/40 text-muted-foreground p-2 text-center">
          <Play className="size-5 text-muted-foreground/60 mb-1" />
          <span className="text-[10px] font-medium text-muted-foreground">No Preview</span>
        </div>
      ) : isVideo ? (
        <video
          src={previewUrl}
          loop
          muted
          playsInline
          preload="metadata"
          className="size-full object-cover"
        />
      ) : (
        <Image src={previewUrl} alt={image.title} fill className="object-cover" sizes="200px" unoptimized />
      )}
    </div>
  );
}
