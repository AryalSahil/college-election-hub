import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ExternalLink,
  Image,
  KeyRound,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  MonitorUp,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/admin/Panel";
import { BrandingPanel } from "@/components/admin/BrandingPanel";
import { DangerZonePanel } from "@/components/admin/DangerZonePanel";
import { InlineLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/errors";
import { setAdminToken, useAdminToken } from "@/lib/adminSession";
import {
  type PersonImageLayout,
  type PersonImageSize,
  LABEL_LAYOUT,
  LABEL_SIZE,
} from "@/convex/settings";

const PAGE_LABELS: Record<string, string> = {
  voting: "Voting",
  results: "Results",
  notifications: "Notifications",
  none: "No Page",
};

const VOTING_LABELS: Record<string, string> = {
  not_started: "Not Started",
  open: "Open",
  paused: "Paused",
  closed: "Closed",
};

const SECTIONS: { id: string; label: string }[] = [
  { id: "branding", label: "College Branding" },
  { id: "election-settings", label: "Election Settings" },
  { id: "public-pages", label: "Public Page Settings" },
  { id: "appearance", label: "Appearance & Display" },
  { id: "security", label: "Security" },
  { id: "danger-zone", label: "Danger Zone" },
];

const DEMO_PEOPLE = [
  { name: "Rohan Das", role: "President", tone: "#6366f1" },
  { name: "Meena Baruah", role: "Secretary", tone: "#ec4899" },
  { name: "Arjun Pegu", role: "Treasurer", tone: "#14b8a6" },
];

function previewAvatar(name: string, tone: string): string {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${tone}"/><text x="50" y="56" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${initials}</text></svg>`,
  )}`;
}

const SIZE_CLASS: Record<PersonImageSize, string> = {
  small: "size-10",
  medium: "size-14",
  large: "size-20",
};

/**
 * Miniature rendering of each person-photo layout so the admin can see the
 * effect of their choices instantly. Purely presentational: it shares the
 * same layout vocabulary as the public pages (grid / compact / list) but no
 * real data.
 */
function PersonDisplayPreview({
  showPersonPhotos,
  layout,
  size,
}: {
  showPersonPhotos: boolean;
  layout: PersonImageLayout;
  size: PersonImageSize;
}) {
  const sizeClass = SIZE_CLASS[size];

  if (!showPersonPhotos) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        Photos are hidden. Pages show a clean, text-only view for candidates,
        winners and office bearers.
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {DEMO_PEOPLE.map((person) => (
          <div
            key={person.name}
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <img
              src={previewAvatar(person.name, person.tone)}
              alt={person.name}
              className={`shrink-0 rounded-md border border-border object-cover ${sizeClass}`}
            />
            <div className="text-center">
              <p className="text-sm font-medium">{person.name}</p>
              <p className="text-xs text-muted-foreground">{person.role}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (layout === "list") {
    return (
      <div className="space-y-3">
        {DEMO_PEOPLE.map((person) => (
          <div
            key={person.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <img
              src={previewAvatar(person.name, person.tone)}
              alt={person.name}
              className={`shrink-0 rounded-md border border-border object-cover ${sizeClass}`}
            />
            <div>
              <p className="text-sm font-medium">{person.name}</p>
              <p className="text-xs text-muted-foreground">{person.role}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // compact — small circular photos beside names
  return (
    <div className="space-y-3">
      {DEMO_PEOPLE.map((person) => (
        <div
          key={person.name}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5"
        >
          <img
            src={previewAvatar(person.name, person.tone)}
            alt={person.name}
            className={`shrink-0 rounded-full border border-border object-cover ${sizeClass}`}
          />
          <div>
            <p className="text-sm font-medium">{person.name}</p>
            <p className="text-xs text-muted-foreground">{person.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Admin → Settings: branding, election configuration, public page controls,
 * appearance (person-photo display), security, and the Danger Zone resets.
 */
export default function AdminSettings() {
  const token = useAdminToken() ?? "";
  const status = useQuery(api.adminAuth.status);
  const settingsData = useQuery(api.settings.get, { token });
  const changePassword = useMutation(api.adminAuth.changePassword);
  const logout = useMutation(api.adminAuth.logout);
  const setPublicPage = useMutation(api.settings.setPublicPage);
  const setMaintenance = useMutation(api.settings.setMaintenance);
  const setResultsVisibility = useMutation(api.settings.setResultsVisibility);
  const setShowWinnersPage = useMutation(api.settings.setShowWinnersPage);
  const setResetVotingStatus = useMutation(api.settings.setResetVotingStatus);
  const setShowPersonPhotos = useMutation(api.settings.setShowPersonPhotos);
  const setPersonImageLayout = useMutation(api.settings.setPersonImageLayout);
  const setPersonImageSize = useMutation(api.settings.setPersonImageSize);
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === undefined) return <InlineLoader label="Loading settings" />;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      const result = await changePassword({
        token,
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdminToken(result.token);
      toast.success("Password changed. Other sessions were signed out.");
      form.reset();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      if (token) await logout({ token });
    } catch {
      // Session may already be invalid server-side.
    }
    setAdminToken(null);
    navigate("/admin/login", { replace: true });
  }

  async function guard(action: () => Promise<unknown>, failure?: string) {
    try {
      await action();
    } catch (err) {
      toast.error(failure ?? errorMessage(err));
    }
  }

  const settings = settingsData?.settings;
  const appearance = settingsData?.appearance;
  const currentPage = settingsData?.currentPage;

  const showPersonPhotos = appearance?.showPersonPhotos ?? true;
  const personImageLayout = appearance?.personImageLayout ?? "compact";
  const personImageSize = appearance?.personImageSize ?? "medium";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="College branding, election configuration, public pages, security, and election reset controls."
        actions={
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open("/display", "_blank", "noopener")}
          >
            <MonitorUp className="size-4" />
            Display Election
          </Button>
        }
      />

      <nav className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={[
              "rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground",
              section.id === "danger-zone"
                ? "border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive"
                : "",
            ].join(" ")}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div id="branding" className="scroll-mt-24">
        <BrandingPanel />
      </div>

      <div id="election-settings" className="scroll-mt-24">
        <Panel>
          <PanelHeader
            title="Election Settings"
            description="Voting status applied when you start a fresh election."
          />
          <PanelBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Voting status after Start Fresh Election</Label>
                <Select
                  value={settings?.resetVotingStatus ?? "not_started"}
                  onValueChange={(value) =>
                    void guard(() =>
                      setResetVotingStatus({
                        token,
                        status: value as
                          | "not_started"
                          | "open"
                          | "paused"
                          | "closed",
                      }),
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VOTING_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Keeps results, candidates and settings — only activity is
                  cleared.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Current voting status</Label>
                <div className="flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-medium">
                  {settings
                    ? (VOTING_LABELS[settings.votingStatus] ??
                      settings.votingStatus)
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Change it from the Voting screen.
                </p>
              </div>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div id="public-pages" className="scroll-mt-24">
        <Panel>
          <PanelHeader
            title="Public Page Settings"
            description="Quick control of what students see on `/`. Exactly one page is ever active."
            action={
              currentPage ? (
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
                  Active: {PAGE_LABELS[currentPage] ?? currentPage}
                </span>
              ) : null
            }
          />
          <PanelBody className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {Object.entries(PAGE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    void guard(() =>
                      setPublicPage({
                        token,
                        page: value as
                          | "voting"
                          | "results"
                          | "notifications"
                          | "none",
                      }),
                    )
                  }
                  className={[
                    "rounded-md border px-3.5 py-2 text-sm font-medium transition-colors",
                    currentPage === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Maintenance mode</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Overrides every page with the maintenance screen.
                  </p>
                </div>
                <Switch
                  checked={settings?.maintenanceMode ?? false}
                  onCheckedChange={(checked) =>
                    void guard(() =>
                      setMaintenance({ token, enabled: checked }),
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Public results</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Students see tallies only when this is ON.
                  </p>
                </div>
                <Switch
                  checked={settings?.resultsVisibility ?? false}
                  onCheckedChange={(checked) =>
                    void guard(() =>
                      setResultsVisibility({ token, enabled: checked }),
                    )
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Show Current Office Bearers Page
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Controls `/winners` in public navigation and direct access.
                  Independent of the voting page.
                </p>
              </div>
              <Switch
                checked={settings?.showWinnersPage ?? true}
                onCheckedChange={(checked) =>
                  void guard(() =>
                    setShowWinnersPage({ token, enabled: checked }),
                  )
                }
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="size-3.5" />
              Full controls live on Page Control, Voting, and Results.
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div id="appearance" className="scroll-mt-24">
        <Panel>
          <PanelHeader
            title="Appearance & Display"
            description="Control how candidate, winner and office-bearer photos are shown across the public app."
            action={
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
                Live on every public page
              </span>
            }
          />
          <PanelBody className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Show person photos</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  When ON, candidate, winner and office-bearer portraits appear
                  in voting, results and the office bearers page. Branding
                  images (college logo, favicon) are unrelated and always
                  shown.
                </p>
              </div>
              <Switch
                checked={showPersonPhotos}
                onCheckedChange={(checked) =>
                  void guard(() =>
                    setShowPersonPhotos({ token, enabled: checked }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Photo layout</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["grid", "compact", "list"] as const).map((layout) => {
                  const selected = personImageLayout === layout;
                  return (
                    <button
                      key={layout}
                      type="button"
                      disabled={!showPersonPhotos}
                      onClick={() =>
                        void guard(() =>
                          setPersonImageLayout({ token, layout }),
                        )
                      }
                      className={[
                        "flex flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-muted/40 hover:border-primary/40",
                        !showPersonPhotos
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        {layout === "grid" && <LayoutGrid className="size-4" />}
                        {layout === "compact" && <Image className="size-4" />}
                        {layout === "list" && <List className="size-4" />}
                        <span className="text-sm font-medium">
                          {LABEL_LAYOUT[layout]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {layout === "grid"
                          ? "Responsive grid of medium cards with square photos."
                          : layout === "compact"
                            ? "Compact horizontal rows with small rounded photos."
                            : "Clean single-column list with small square photos."}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Photo size</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["small", "medium", "large"] as const).map((size) => {
                  const selected = personImageSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!showPersonPhotos}
                      onClick={() => void guard(() => setPersonImageSize({ token, size }))}
                      className={[
                        "flex flex-col items-center gap-2 rounded-lg border p-3.5 text-center transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border bg-muted/40 hover:border-primary/40",
                        !showPersonPhotos
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      <span className="text-sm font-medium">
                        {LABEL_SIZE[size]}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {size === "small"
                          ? "Compact portraits. Best for dense lists."
                          : size === "medium"
                            ? "Balanced default size for most screens."
                            : "Larger portraits for grid cards."}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Live preview</Label>
              <PersonDisplayPreview
                showPersonPhotos={showPersonPhotos}
                layout={personImageLayout}
                size={personImageSize}
              />
              <p className="text-xs text-muted-foreground">
                Sizes are scaled down on mobile so the interface stays
                readable. The public pages update reactively — no refresh
                needed.
              </p>
            </div>
          </PanelBody>
        </Panel>
      </div>

      <div id="security" className="scroll-mt-24 space-y-8">
        <Panel>
          <PanelHeader
            title="Change admin password"
            description={
              status.passwordSet
                ? "Changing the password signs out every other session."
                : "No password has been created yet."
            }
          />
          <form onSubmit={handleSubmit}>
            <PanelBody className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
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
                  <KeyRound className="mr-2 size-4" />
                )}
                Change password
              </Button>
            </div>
          </form>
        </Panel>

        <Panel>
          <PanelHeader
            title="This session"
            description="Sessions expire automatically after 7 days."
          />
          <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              You are signed in on this device. Signing out here ends the
              session immediately.
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </PanelBody>
        </Panel>
      </div>

      <DangerZonePanel />

      <Panel>
        <PanelHeader title="About" />
        <PanelBody className="text-sm leading-relaxed text-muted-foreground">
          College Election Portal — version 1. A single administrator controls
          the public page; students need no account and vote without signing
          in. Activity logs record every important change, including all
          election resets.
        </PanelBody>
      </Panel>
    </div>
  );
}
