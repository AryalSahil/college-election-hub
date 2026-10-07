import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Panel, PanelBody, PanelHeader } from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { ImageUploader, type ImageDraft } from "@/components/ImageUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";
import { Seal } from "@/components/Seal";
/**
 * Admin → Settings → College Branding: college logo (upload / replace /
 * remove / preview), college name, election title, and academic year.
 
 */

export function BrandingPanel() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.settings.get, { token });
  const updateBranding = useMutation(api.settings.updateBranding);
  const updateElection = useMutation(api.election.update);

  const [collegeName, setCollegeName] = useState("");
  const [electionName, setElectionName] = useState("");
  const [year, setYear] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [logoDraft, setLogoDraft] = useState<ImageDraft | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
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
          status: data.election?.status ?? "draft",
        });
      }

      setLogoDraft(null);
      setLogoRemoved(false);
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
 