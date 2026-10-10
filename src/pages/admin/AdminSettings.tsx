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
import {
  type PersonImageLayout,
  type PersonImageSize,
  LABEL_LAYOUT,
  LABEL_SIZE,
} from "@/convex/settings";
import { Image, LayoutGrid, Circle, List } from "lucide-react";

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

function PersonDisplayPreview({
  showPersonPhotos,
  layout,
  size,
}: {
  showPersonPhotos: boolean;
  layout: PersonImageLayout;
  size: PersonImageSize;
}) {
  return null;
}
  const demoPeople = [
    {
      name: "Rohan Das",
      role: "President",
      photo:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%236366f1'/%3E%3Ccircle cx='50' cy='40' r='18' fill='%23ffffff'/%3E%3Crect x='34' y='58' width='32' height='4' rx='2' fill='%23ffffff'/%3E%3Crect x='34' y='66' width='22' height='4' rx='2' fill='%23ffffff'/%3E%3C/svg%3E",
    },
    {
      name: "Meena Baruah",
      role: "Secretary",
      photo:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23ec4899'/%3E%3Ccircle cx='50' cy='40' r='18' fill='%23ffffff'/%3E%3Crect x='34' y='58' width='32' height='4' rx='2' fill='%23ffffff'/%3E%3Crect x='34' y='66' width='22' height='4' rx='2' fill='%23ffffff'/%3E%3C/svg%3E",
    },
    {
      name: "Arjun Pegu",
      role: "Treasurer",
      photo:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%2314b8a6'/%3E%3Ccircle cx='50' cy='40' r='18' fill='%23ffffff'/%3E%3Crect x='34' y='58' width='32' height='4' rx='2' fill='%23ffffff'/%3E%3Crect x='34' y='66' width='22' height='4' rx='2' fill='%23ffffff'/%3E%3C/svg%3E",
    },
  ];

  const sizeMap = {
    small: "w-8 h-8",
    medium: "w-12 h-12",
    large: "w-20 h-20",
  } as const;

  if (!showPersonPhotos) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        No person photos are shown when the toggle is OFF.
      </div>
    );
  }

  if (layout === "grid") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {demoPeople.map((person) => (
          <div
            key={person.name}
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <img
              src={person.photo}
              alt={person.name}
              className={`object-cover rounded-md border border-border ${sizeMap[size]}`}
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
        {demoPeople.map((person) => (
          <div
            key={person.name}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <img
              src={person.photo}
              alt={person.name}
              className={`object-cover rounded-md border border-border ${sizeMap[size]}`}
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

  return (
    <div className="space-y-3">
      {demoPeople.map((person) => (
        <div
          key={person.name}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5"
        >
          <img
            src={person.photo}
            alt={person.name}
            className={`object-cover rounded-full border border-border ${sizeMap[size]}`}
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

/**\n * Admin → Settings: branding, election configuration, public page controls,\n * security, and the Danger Zone resets.\n */\nexport default function AdminSettings() {\n  const token = useAdminToken() ?? \"\";\n  const status = useQuery(api.adminAuth.status);\n  const settingsData = useQuery(api.settings.get, { token });\n  const changePassword = useMutation(api.adminAuth.changePassword);\n  const logout = useMutation(api.adminAuth.logout);\n  const setPublicPage = useMutation(api.settings.setPublicPage);\n  const setMaintenance = useMutation(api.settings.setMaintenance);\n  const setResultsVisibility = useMutation(api.settings.setResultsVisibility);\n  const setVoterCodesEnabled = useMutation(api.settings.setVoterCodesEnabled);\n  const setShowWinnersPage = useMutation(api.settings.setShowWinnersPage);\n  const setResetVotingStatus = useMutation(api.settings.setResetVotingStatus);\n  const setShowPersonPhotos = useMutation(api.settings.setShowPersonPhotos);\n  const setPersonImageLayout = useMutation(api.settings.setPersonImageLayout);\n  const setPersonImageSize = useMutation(api.settings.setPersonImageSize);\n  const navigate = useNavigate();\n\n  const [busy, setBusy] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n\n  if (status === undefined) return <InlineLoader label=\"Loading settings\" />;\n\n  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {\n    event.preventDefault();\n    const formData = new FormData(event.currentTarget);\n    const currentPassword = String(formData.get(\"currentPassword\") ?? \"\");\n    const newPassword = String(formData.get(\"newPassword\") ?? \"\");\n    const confirmPassword = String(formData.get(\"confirmPassword\") ?? \"\");\n\n    if (newPassword !== confirmPassword) {\n      setError(\"New passwords do not match.\");\n      return;\n    }\n\n    const form = event.currentTarget;\n    setBusy(true);\n    setError(null);\n    try {\n      const result = await changePassword({\n        token,\n        currentPassword,\n        newPassword,\n      });\n      if (!result.ok) {\n        setError(result.error);\n        return;\n      }\n      setAdminToken(result.token);\n      toast.success(\"Password changed. Other sessions were signed out.\");\n      form.reset();\n    } catch (err) {\n      setError(errorMessage(err));\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function signOut() {\n    try {\n      if (token) await logout({ token });\n    } catch {\n      // Session may already be invalid server-side.\n    }\n    setAdminToken(null);\n    navigate(\"/admin/login\", { replace: true });\n  }\n\n  async function guard(action: () => Promise<unknown>, failure?: string) {\n    try {\n      await action();\n    } catch (err) {\n      toast.error(failure ?? errorMessage(err));\n    }\n  }\n\n  const settings = settingsData?.settings;\n  const currentPage = settingsData?.currentPage;\n\n  return (\n    <div className=\"space-y-8\">\n      <PageHeader\n        title=\"Settings\"\n        description=\"College branding, election configuration, public pages, security, and election reset controls.\"\n        actions={\n          <Button\n            variant=\"outline\"\n            className=\"gap-2\"\n            onClick={() => window.open(\"/display\", \"_blank\", \"noopener\")}\n          >\n            <MonitorUp className=\"size-4\" />\n            Display Election\n          </Button>\n        }\n      />\n\n      <nav className=\"flex flex-wrap gap-2\">\n        {SECTIONS.map((section) => (\n          <a\n            key={section.id}\n            href={`#${section.id}`}\n            className={[\n              \"rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground\",\n              section.id === \"danger-zone\"\n                ? \"border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/5 hover:text-destructive\"\n                : \"\",\n            ].join(\" \")}\n          >\n            {section.label}\n          </a>\n        ))}\n      </nav>\n\n      <div id=\"branding\" className=\"scroll-mt-24\">\n        <BrandingPanel />\n      </div>\n\n      <div id=\"election-settings\" className=\"scroll-mt-24\">\n        <Panel>\n          <PanelHeader\n            title=\"Election Settings\"\n            description=\"Voter-code system and the voting status applied when you start a fresh election.\"\n          />\n          <PanelBody className=\"space-y-5\">\n            <div className=\"flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5\">\n              <div className=\"min-w-0\">\n                <p className=\"text-sm font-medium\">Voter codes</p>\n                <p className=\"mt-0.5 text-xs text-muted-foreground\">\n                  Require a one-time code before a student can open the\n                  ballot. Codes are managed on the Voting screen.\n                </p>\n              </div>\n              <Switch\n                checked={settings?.voterCodesEnabled ?? false}\n                onCheckedChange={(checked) =>\n                  void guard(() =>\n                    setVoterCodesEnabled({ token, enabled: checked }),\n                  )\n                }\n              />\n            </div>\n\n            <div className=\"grid gap-4 sm:grid-cols-2\">\n              <div className=\"space-y-2\">\n                <Label>Voting status after Start Fresh Election</Label>\n                <Select\n                  value={settings?.resetVotingStatus ?? \"not_started\"}\n                  onValueChange={(value) =>\n                    void guard(() =>\n                      setResetVotingStatus({\n                        token,\n                        status: value as\n                          | \"not_started\"\n                          | \"open\"\n                          | \"paused\"\n                          | \"closed\",\n                      }),\n                    )\n                  }\n                >\n                  <SelectTrigger className=\"w-full\">\n                    <SelectValue placeholder=\"Select a status\" />\n                  </SelectTrigger>\n                  <SelectContent>\n                    {Object.entries(VOTING_LABELS).map(([value, label]) => (\n                      <SelectItem key={value} value={value}>\n                        {label}\n                      </SelectItem>\n                    ))}\n                  </SelectContent>\n                </Select>\n                <p className=\"text-xs text-muted-foreground\">\n                  Keeps results, candidates and settings — only activity is\n                  cleared.\n                </p>\n              </div>\n\n              <div className=\"space-y-2\">\n                <Label>Current voting status</Label>\n                <div className=\"flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 text-sm font-medium\">\n                  {settings\n                    ? (VOTING_LABELS[settings.votingStatus] ??\n                      settings.votingStatus)\n                    : \"—\"}\n                </div>\n                <p className=\"text-xs text-muted-foreground\">\n                  Change it from the Voting screen.\n                </p>\n              </div>\n            </div>\n          </PanelBody>\n        </Panel>\n      </div>\n\n      <div id=\"public-pages\" className=\"scroll-mt-24\">\n        <Panel>\n          <PanelHeader\n            title=\"Public Page Settings\"\n            description=\"Quick control of what students see on `/`. Exactly one page is ever active.\"\n            action={\n              currentPage ? (\n                <span className=\"rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium\">\n                  Active: {PAGE_LABELS[currentPage] ?? currentPage}\n                </span>\n              ) : null\n            }\n          />\n          <PanelBody className=\"space-y-5\">\n            <div className=\"flex flex-wrap gap-2\">\n              {Object.entries(PAGE_LABELS).map(([value, label]) => (\n                <button\n                  key={value}\n                  type=\"button\"\n                  onClick={() =>\n                    void guard(() =>\n                      setPublicPage({\n                        token,\n                        page: value as\n                          | \"voting\"\n                          | \"results\"\n                          | \"notifications\"\n                          | \"none\",\n                      }),\n                    )\n                  }\n                  className={[\n                    \"rounded-md border px-3.5 py-2 text-sm font-medium transition-colors\",\n                    currentPage === value\n                      ? \"border-primary bg-primary text-primary-foreground\"\n                      : \"border-border text-muted-foreground hover:bg-muted hover:text-foreground\",\n                  ].join(\" \")}\n                >\n                  {label}\n                </button>\n              ))}\n            </div>\n\n            <div className=\"grid gap-4 sm:grid-cols-2\">\n              <div className=\"flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5\">\n                <div className=\"min-w-0\">\n                  <p className=\"text-sm font-medium\">Maintenance mode</p>\n                  <p className=\"mt-0.5 text-xs text-muted-foreground\">\n                    Overrides every page with the maintenance screen.\n                  </p>\n                </div>\n                <Switch\n                  checked={settings?.maintenanceMode ?? false}\n                  onCheckedChange={(checked) =>\n                    void guard(() =>\n                      setMaintenance({ token, enabled: checked }),\n                    )\n                  }\n                />\n              </div>\n\n              <div className=\"flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5\">\n                <div className=\"min-w-0\">\n                  <p className=\"text-sm font-medium\">Public results</p>\n                  <p className=\"mt-0.5 text-xs text-muted-foreground\">\n                    Students see tallies only when this is ON.\n                  </p>\n                </div>\n                <Switch\n                  checked={settings?.resultsVisibility ?? false}\n                  onCheckedChange={(checked) =>\n                    void guard(() =>\n                      setResultsVisibility({ token, enabled: checked }),\n                    )\n                  }\n                />\n              </div>\n            </div>\n\n            <div className=\"flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5\">\n              <div className=\"min-w-0\">\n                <p className=\"text-sm font-medium\">\n                  Show Current Office Bearers Page\n                </p>\n                <p className=\"mt-0.5 text-xs text-muted-foreground\">\n                  Controls `/winners` in public navigation and direct access.\n                  Independent of the voting page.\n                </p>\n              </div>\n              <Switch\n                checked={settings?.showWinnersPage ?? true}\n                onCheckedChange={(checked) =>\n                  void guard(() =>\n                    setShowWinnersPage({ token, enabled: checked }),\n                  )\n                }\n              />\n            </div>\n\n            <div className=\"flex items-center gap-2 text-xs text-muted-foreground\">\n              <ExternalLink className=\"size-3.5\" />\n              Full controls live on Page Control, Voting, and Results.\n            </div>\n          </PanelBody>\n        </Panel>\n      </div>\n\n      <div id=\"appearance\" className=\"scroll-mt-24\">\n        <Panel>\n          <PanelHeader\n            title=\"Appearance & Display\"\n            description=\"Control how candidate, winner and office-bearer photos are shown across the public app.\"\n            action={\n              <span className=\"rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium\">\n                Live on every public page\n              </span>\n            }\n          />\n          <PanelBody className=\"space-y-6\">\n            <div className=\"flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3.5\">\n              <div className=\"min-w-0\">\n                <p className=\"text-sm font-medium\">Show person photos</p>\n                <p className=\"mt-0.5 text-xs text-muted-foreground\">\n                  When ON, candidate, winner and office-bearer portraits appear in\ne\n                  voting, results and the office bearers page. Branding images are\n                  unrelated and always shown.\n                </p>\n              </div>\n              <Switch\n                checked={settings?.appearance.showPersonPhotos ?? true}\n                onCheckedChange={(checked) =>\n                  void guard(() =>\n                    setShowPersonPhotos({ token, enabled: checked }),\n                  )\n                }\n              />\n            </div>\n\n            <div className=\"space-y-2\">\n              <Label>Photo layout</Label>\n              <div className=\"grid gap-3 sm:grid-cols-3\">\n                {((["grid", "compact", "list"]) as const).map((layout) => {\n                  const selected =\n                    settings?.appearance.personImageLayout === layout;\n                  return (\n                    <button\n                      key={layout}\n                      type=\"button\"\n                      onClick={() =>\n                        void guard(() =>\n                          setPersonImageLayout({\n                            token,\n                            layout: layout as PersonImageLayout,\n                          }),\n                        )\n                      }\n                      className={[\n                        \"flex cursor-pointer flex-col items-start gap-2 rounded-lg border p-3.5 text-left transition-colors\",\n                        selected\n                          ? \"border-primary bg-primary/5 ring-1 ring-primary/20\"\n                          : \"border-border bg-muted/40 hover:border-primary/40\",\n                      ].join(" ")}\n                    >\n                      <div className=\"flex items-center gap-2\">\n                        {layout === "grid" && (\n                          <LayoutGrid className=\"size-4\" />)}\n                        {layout === "compact" && (\n                          <Circle className=\"size-4\" />)}\n                        {layout === "list" && (\n                          <List className=\"size-4\" />)}\n                        <span className=\"text-sm font-medium\">\n                          {LABEL_LAYOUT[layout]}\n                        </span>\n                      </div>\n                      <p className=\"text-xs text-muted-foreground\">\n                        {layout === "grid"\n                          ? "Responsive grid of medium cards with square photos."\n                          : layout === "compact"\n                            ? "Compact horizontal rows with small rounded photos."\n                            : "Clean single-column list with small square photos."}\n                      </p>\n                    </button>\n                  );\n                })}\n              </div>\n            </div>\n\n            <div className=\"space-y-2\">\n              <Label>Photo size</Label>\n              <div className=\"grid gap-3 sm:grid-cols-3\">\n                {((["small", "medium", "large"]) as const).map((size) => {\n                  const selected =\n                    settings?.appearance.personImageSize === size;\n                  return (\n                    <button\n                      key={size}\n                      type=\"button\"\n                      onClick={() =>\n                        void guard(() =>\n                          setPersonImageSize({\n                            token,\n                            size: size as PersonImageSize,\n                          }),\n                        )\n                      }\n                      className={[\n                        \"flex cursor-pointer flex-col items-center gap-3 rounded-lg border p-4 text-center transition-colors\",\n                        selected\n                          ? \"border-primary bg-primary/5 ring-1 ring-primary/20\"\n                          : \"border-border bg-muted/40 hover:border-primary/40\",\n                      ].join(" ")}\n                    >\n                      <div className={[\n                        "relative", "flex", "items-center", "justify-center",\n                        size === "small" ? "w-10 h-10" : size === "medium" ? "w-14 h-14" : "w-20 h-20",\n                        "rounded-md", "border", "border-border",\n                        "bg-muted", "overflow-hidden",\n                      ].join(" ")}>\n                        <Image\n                          className=\"object-cover inset-0 w-full h-full\"\n                          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%239ca3af'/%3E%3Ccircle cx='50' cy='40' r='18' fill='%23ffffff'/%3E%3Crect x='34' y='58' width='32' height='4' rx='2' fill='%23ffffff'/%3E%3Crect x='34' y='66' width='22' height='4' rx='2' fill='%23ffffff'/%3E%3C/svg%3E"\n                          alt={LABEL_SIZE[size]}\n                        />\n                      </div>\n                      <span className=\"text-sm font-medium\">\n                        {LABEL_SIZE[size]}\n                      </span>\n                      <p className=\"text-xs text-muted-foreground\">\n                        {size === "small"\n                          ? "Compact portraits. Best for dense lists."\n                          : size === "medium"\n                            ? "Balanced default size for most screens."\n                            : "Larger portraits for grid cards."}\n                      </p>\n                    </button>\n                  );\n                })}\n              </div>\n              <p className=\"text-xs text-muted-foreground\">\n                Sizes are scaled down on mobile so the interface stays readable.\n              </p>\n            </div>\n\n            <div className=\"space-y-3\">\n              <Label>Live preview</Label>\n              <PersonDisplayPreview\n                showPersonPhotos={settings?.appearance.showPersonPhotos ?? true}\n                layout={settings?.appearance.personImageLayout ?? "compact"}\n                size={settings?.appearance.personImageSize ?? "medium"}\n              />\n            </div>\n          </PanelBody>\n        </Panel>\n      </div>\n\n      <div id=\"security\" className=\"scroll-mt-24 space-y-8\">\n        <Panel>\n          <PanelHeader\n            title=\"Change admin password\"\n            description={\n              status.passwordSet\n                ? "Changing the password signs out every other session."\n                : "No password has been created yet."\n            }\n          />\n          <form onSubmit={handleSubmit}>\n            <PanelBody className=\"max-w-md space-y-4\">\n              <div className=\"space-y-2\">\n                <Label htmlFor=\"currentPassword\">Current password</Label>\n                <Input\n                  id=\"currentPassword\"\n                  name=\"currentPassword\"\n                  type=\"password\"\n                  autoComplete=\"current-password\"\n                  required\n                />\n              </div>\n              <div className=\"space-y-2\">\n                <Label htmlFor=\"newPassword\">New password</Label>\n                <Input\n                  id=\"newPassword\"\n                  name=\"newPassword\"\n                  type=\"password\"\n                  autoComplete=\"new-password\"\n                  placeholder=\"At least 8 characters\"\n                  required\n                  minLength={8}\n                />\n              </div>\n              <div className=\"space-y-2\">\n                <Label htmlFor=\"confirmPassword\">Confirm new password</Label>\n                <Input\n                  id=\"confirmPassword\"\n                  name=\"confirmPassword\"\n                  type=\"password\"\n                  autoComplete=\"new-password\"\n                  required\n                  minLength={8}\n                />\n              </div>\n\n              {error && (\n                <p className=\"rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive\">\n                  {error}\n                </p>\n              )}\n            </PanelBody>\n            <div className=\"flex justify-end border-t border-border px-5 py-4\">\n              <Button type=\"submit\" disabled={busy}>\n                {busy ? (\n                  <Loader2 className="mr-2 size-4 animate-spin" />\n                ) : (\n                  <KeyRound className="mr-2 size-4" />\n                )}\n                Change password\n              </Button>\n            </div>\n          </form>\n        </Panel>\n\n        <Panel>\n          <PanelHeader\n            title=\"This session\"\n            description=\"Sessions expire automatically after 7 days.\"\n          />\n          <PanelBody className=\"flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between\">\n            <p className=\"text-sm text-muted-foreground\">\n              You are signed in on this device. Signing out here ends the\n              session immediately.\n            </p>\n            <Button variant=\"outline\" onClick={signOut}>\n              <LogOut className="size-4" />\n              Sign out\n            </Button>\n          </PanelBody>\n        </Panel>\n      </div>\n\n      <DangerZonePanel />\n\n      <Panel>\n        <PanelHeader title=\"About\" />\n        <PanelBody className=\"text-sm leading-relaxed text-muted-foreground\">\n          College Election Portal — version 1. A single administrator controls\n          the public page; students need no account and vote without signing\n          in. Activity logs record every important change, including all\n          election resets.\n        </PanelBody>\n      </Panel>\n    </div>\n  );\n}
