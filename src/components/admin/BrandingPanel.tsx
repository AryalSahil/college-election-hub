import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Panel, PanelBody, PanelHeader } from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { ImageUploader, type ImageDraft } from "@/components/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { readValidatedImage } from "@/lib/images";
import { FAVICON_ACCEPT } from "@/lib/images";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useAdminToken } from "@/lib/adminSession";
import { Seal } from "@/components/Seal";
/**
 * Favicon uploader: click or drag & drop, live preview, replace, remove.
 * ICO files are accepted for favicons; the server still validates magic
 * bytes and the 512 KB favicon limit. Saves via updateFavicon on Save.
 */
function FaviconUploader({
  token,
  existingUrl,
  draft,
  removed,
  onDraft,
  onRemoved,
}: {
  token: string;
  existingUrl: string | null;
  draft: ImageDraft | null;
  removed: boolean;
  onDraft: (draft: ImageDraft | null) => void;
  onRemoved: (removed: boolean) => void;
}) {
  const upload = useAction(api.images.upload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const previewUrl = draft?.previewUrl ?? (removed ? null : existingUrl);

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setBusy(true);
    try {
      const bytes = await readValidatedImage(file, "favicon");
      const { storageId } = await upload({ token, kind: "favicon", bytes });
      if (draft?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(draft.previewUrl);
      }
      onDraft({ storageId, previewUrl: URL.createObjectURL(file) });
      onRemoved(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Favicon</p>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload favicon"
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
          "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 text-left transition-colors",
          "hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60",
          dragging ? "border-primary bg-primary/5" : "border-border",
          busy && "pointer-events-none opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={FAVICON_ACCEPT}
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Current favicon"
              className="size-10 object-contain"
            />
          ) : (
            <Seal className="size-8 text-primary" />
          )}
        </span>
        <span className="min-w-0 text-sm">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <span className="font-medium">
                {previewUrl ? "Favicon attached" : "Upload favicon"}
              </span>
              <span className="block text-xs text-muted-foreground">
                PNG, ICO, WebP or SVG · up to 512 KB
              </span>
            </>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="size-3.5" />
          {previewUrl ? "Replace" : "Upload Favicon"}
        </button>
        {previewUrl && !removed && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (draft?.previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(draft.previewUrl);
              }
              onDraft(null);
              onRemoved(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        )}
        {removed && (
          <button
            type="button"
            onClick={() => onRemoved(false)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            Restore
          </button>
        )}
      </div>
      {removed && (
        <p className="text-xs text-destructive">
          The favicon will revert to the default when you save.
        </p>
      )}
    </div>
  );
}

/**
 * Admin → Settings → College Branding: college logo (upload / replace /
 * remove / preview), favicon, college name, election title, and academic year.
 */

export function BrandingPanel() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.settings.get, { token });
  const updateBranding = useMutation(api.settings.updateBranding);
  const updateElection = useMutation(api.election.update);
  const updateFavicon = useMutation(api.settings.updateFavicon);
  const uploadImage = useAction(api.images.upload);

  const [collegeName, setCollegeName] = useState("");
  const [electionName, setElectionName] = useState("");
  const [year, setYear] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [logoDraft, setLogoDraft] = useState<ImageDraft | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [faviconDraft, setFaviconDraft] = useState<ImageDraft | null>(null);
  const [faviconRemoved, setFaviconRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || initialized) return;
    setCollegeName(data.branding.collegeName ?? "");
    setElectionName(data.election?.name ?? "");
    setYear(data.election?.year ?? String(new Date().getFullYear()));
    setInitialized(true);
  }, [data, initialized]);

  if (data === undefined) {
    return (
      <Panel>
        <PanelHeader
          title="College Branding"
          description="Logo, college name, election title, and academic year."
        />
        <PanelBody>
          <InlineLoader label="Loading branding" />
        </PanelBody>
      </Panel>
    );
  }

  if (data === null) return null;

  const currentLogoUrl = data.branding.logoUrl ?? null;

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = collegeName.trim();
    if (!name) {
      setError("College name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateBranding({
        token,
        collegeName: name,
        ...(logoDraft ? { logoStorageId: logoDraft.storageId } : {}),
        ...(!logoDraft && logoRemoved ? { logoRemoved: true } : {}),
      });

      const title = electionName.trim();
      const academicYear = year.trim();
      if (title && academicYear) {
        await updateElection({
          token,
          name: title,
          year: academicYear,
          status: data?.election?.status ?? "draft",
        });
      }

      setLogoDraft(null);
      setLogoRemoved(false);

      // Favicon is saved independently so partial uploads still stick.
      try {
        if (faviconDraft || faviconRemoved) {
          await updateFavicon({
            token,
            ...(faviconDraft ? { faviconStorageId: faviconDraft.storageId } : {}),
            ...(!faviconDraft && faviconRemoved ? { faviconRemoved: true } : {}),
          });
          setFaviconDraft(null);
          setFaviconRemoved(false);
        }
      } catch (faviconErr) {
        toast.warning(
          `Branding saved, but the favicon could not be updated: ${errorMessage(faviconErr)}`,
        );
      }

      toast.success("College branding saved.");
    } catch (err) {
      setError(errorMessage(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="College Branding"
        description="The logo and titles shown on the voting page, results, notifications, admin panel, and display mode."
      />
      <form onSubmit={handleSave}>
        <PanelBody className="space-y-6">
          {/* Logo uploader + live preview */}
          <div className="grid gap-6 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <div className="space-y-3">
              <ImageUploader
                kind="logo"
                label="College logo"
                existingUrl={currentLogoUrl}
                draft={logoDraft}
                removed={logoRemoved}
                onDraft={setLogoDraft}
                onRemoved={setLogoRemoved}
                aspect="wide"
                hint="PNG, JPG, WebP or SVG"
              />
            </div>

            {/* Preview of the public lockup */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Preview
              </p>
              <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 px-5 py-4">
                {!logoRemoved && (
                  <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden">
                    {logoDraft?.previewUrl ?? currentLogoUrl ? (
                      <img
                        src={logoDraft?.previewUrl ?? currentLogoUrl ?? ""}
                        alt="College logo preview"
                        className="size-full object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Seal className="size-12 text-primary" />
                    )}
                  </span>
                )}
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold uppercase tracking-[0.2em]">
                    {collegeName || "College Name"}
                  </p>
                  <p className="mt-1 truncate text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                    {(electionName || "Election Title") +
                      (year ? ` ${year}` : "")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="branding-college">College name</Label>
              <Input
                id="branding-college"
                value={collegeName}
                onChange={(event) => setCollegeName(event.target.value)}
                placeholder="e.g. Pragjyotish College"
                maxLength={80}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branding-title">Election title</Label>
              <Input
                id="branding-title"
                value={electionName}
                onChange={(event) => setElectionName(event.target.value)}
                placeholder="e.g. College Election"
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branding-year">Academic year</Label>
              <Input
                id="branding-year"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="e.g. 2026"
                maxLength={20}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </PanelBody>
        <div className="flex justify-end border-t border-border px-5 py-4">
          <Button type="submit" disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save branding
          </Button>
        </div>
      </form>
    </Panel>
  );
}

export default BrandingPanel;
 