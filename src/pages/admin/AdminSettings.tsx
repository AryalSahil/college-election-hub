import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ExternalLink,
  KeyRound,
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
  { id: "security", label: "Security" },
  { id: "danger-zone", label: "Danger Zone" },
];

/**
 * Admin → Settings: branding, election configuration, public page controls,
 * security, and the Danger Zone resets.
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
  const setVoterCodesEnabled = useMutation(api.settings.setVoterCodesEnabled);
  const setResetVotingStatus = useMutation(api.settings.setResetVotingStatus);
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
      // Password change invalidates old sessions; keep this browser signed in.
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
  const currentPage = settingsData?.currentPage;

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

      {/* Section jump links */}
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

      {/* ---------------------------------------------------------- */}
      {/* 1. College Branding                                        */}
      {/* ---------------------------------------------------------- */}
      <div id="branding" className="scroll-mt-24">
        <BrandingPanel />
      </div>

      {/* ---------------------------------------------------------- */}
      {/* 2. Election Settings                                       */}
      {/* ---------------------------------------------------------- */}
      <div id="election-settings" className="scroll-mt-24">
        <Panel>
          <PanelHeader
            title="Election Settings"
            description="Voter-code system and the voting status applied when you start a fresh election."
          />
          <PanelBody className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Voter codes</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Require a one-time code before a student can open the
                  ballot. Codes are managed on the Voting screen.
                </p>
              </div>
              <Switch
                checked={settings?.voterCodesEnabled ?? false}
                onCheckedChange={(checked) =>
                  void guard(() =>
                    setVoterCodesEnabled({ token, enabled: checked }),
                  )
                }
              />
            </div>

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

      {/* ---------------------------------------------------------- */}
      {/* 3. Public Page Settings                                    */}
      {/* ---------------------------------------------------------- */}
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

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="size-3.5" />
              Full controls live on Page Control, Voting, and Results.
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* 4. Security                                                */}
      {/* ---------------------------------------------------------- */}
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

      {/* ---------------------------------------------------------- */}
      {/* 5. Danger Zone                                             */}
      {/* ---------------------------------------------------------- */}
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
