import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_HINT,
  readValidatedImage,
} from "@/lib/images";

/** A freshly uploaded (validated) file waiting to be saved with the form. */
export type ImageDraft = { storageId: Id<"_storage">; previewUrl: string };

type ImageUploaderProps = {
  kind: "logo" | "candidate";
  /** Currently saved image URL (already resolved server-side), if any. */
  existingUrl?: string | null;
  /** Unsaved upload from this form session. */
  draft: ImageDraft | null;
  /** True when the admin explicitly removed the existing image. */
  removed: boolean;
  onDraft: (draft: ImageDraft | null) => void;
  onRemoved: (removed: boolean) => void;
  label?: string;
  hint?: string;
  /** Square crops for candidate photos, wider fit for the college logo. */
  aspect?: "square" | "wide";
  className?: string;
};

/**
 * Admin image uploader: drag & drop or click to upload, live preview,
 * replace, and remove. Files are validated client-side with the shared rules
 * and stored through the admin-only `images.upload` action; the storage id is
 * handed back to the parent form, which saves it with the record.
 */
export function ImageUploader({
  kind,
  existingUrl,
  draft,
  removed,
  onDraft,
  onRemoved,
  label,
  hint,
  aspect = "square",
  className,
}: ImageUploaderProps) {
  const token = useAdminToken() ?? "";
  const upload = useAction(api.images.upload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = draft?.previewUrl ?? (removed ? null : existingUrl ?? null);
  const hasImage = Boolean(previewUrl);

  function clearDraft() {
    if (draft?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(draft.previewUrl);
    }
    onDraft(null);
  }

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const bytes = await readValidatedImage(file, kind);
      const { storageId } = await upload({ token, kind, bytes });
      clearDraft();
      onDraft({ storageId, previewUrl: URL.createObjectURL(file) });
      onRemoved(false);
    } catch (err) {
      setError(errorMessage(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      // Allow re-picking the same file name later.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    setError(null);
    clearDraft();
    onRemoved(true);
  }

  function handleRestore() {
    setError(null);
    onRemoved(false);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      )}

      <div
        role="button"
        tabIndex={0}
        aria-label={label ?? "Upload image"}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !busy) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) void handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center transition-colors",
          "hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60",
          dragging ? "border-primary bg-primary/5" : "border-border",
          hasImage && "p-3",
          busy && "pointer-events-none opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />

        {hasImage ? (
          <div className="flex w-full items-center gap-4">
            <div
              className={cn(
                "shrink-0 overflow-hidden rounded-md border border-border bg-muted",
                aspect === "square" ? "size-20" : "h-20 w-28",
              )}
            >
              <img
                src={previewUrl!}
                alt="Current preview"
                className="size-full object-contain"
                onError={() => {
                  // A stale URL should not break the form; fall back to placeholder.
                  setError("This image could not be loaded. Please re-upload it.");
                }}
              />
            </div>
            <div className="min-w-0 text-left">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-4 text-primary" />{" "}
                    {draft ? "New image ready" : "Image attached"}
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Drop a file here or click to replace.
              </p>
            </div>
          </div>
        ) : (
          <>
            {busy ? (
              <Loader2 className="size-7 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="size-7 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">
              {busy ? "Uploading…" : "Drag & drop an image, or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground">{IMAGE_HINT}</p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="size-3.5" />
          {hasImage ? "Replace image" : "Upload image"}
        </button>

        {hasImage && !removed && (
          <button
            type="button"
            disabled={busy}
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            Remove image
          </button>
        )}

        {removed && (
          <button
            type="button"
            onClick={handleRestore}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            Restore current image
          </button>
        )}
      </div>

      {removed && (
        <p className="text-xs text-destructive">
          The image will be removed when you save.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default ImageUploader;
