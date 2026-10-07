import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Ban,
  Bell,
  BarChart3,
  Loader2,
  Power,
  Vote,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  StatusPill,
} from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";
import { PAGE_LABELS, type PageKey } from "@/lib/labels";

type TargetPage = "voting" | "results" | "notifications" | "none";

const PAGE_OPTIONS: {
  target: TargetPage;
  label: string;
  icon: React.ReactNode;
  hint: string;
}[] = [
  {
    target: "voting",
    label: PAGE_LABELS.voting,
    icon: <Vote className="size-4" />,
    hint: "Students cast their ballot",
  },
  {
    target: "results",
    label: PAGE_LABELS.results,
    icon: <BarChart3 className="size-4" />,
    hint: "Show the tally",
  },
  {
    target: "notifications",
    label: PAGE_LABELS.notifications,
    icon: <Bell className="size-4" />,
    hint: "Show announcements",
  },
  {
    target: "none",
    label: PAGE_LABELS.none,
    icon: <Ban className="size-4" />,
    hint: "Hide everything",
  },
];

/**
 * Admin → Page Control: the most important screen. Exactly one public page
 * is active at a time, and maintenance overrides all of them.
 */
export default function AdminPageControl() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.settings.get, { token });
  const setPublicPage = useMutation(api.settings.setPublicPage);
  const setMaintenance = useMutation(api.settings.setMaintenance);

  const [pendingTarget, setPendingTarget] = useState<TargetPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);

  if (data === undefined) return <InlineLoader label="Loading page control" />;
  if (data === null) return null;

  const currentPage = data.currentPage as PageKey;
  const maintenanceOn = data.settings.maintenanceMode;

  async function applyPage(target: TargetPage) {
    setBusy(true);
    try {
      await setPublicPage({ token, page: target });
      toast.success(`Public page is now ${PAGE_LABELS[target]}.`);
      setPendingTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function requestPage(target: TargetPage) {
    if (target === currentPage) return;
    setPendingTarget(target);
  }

  async function toggleMaintenance() {
    setMaintenanceBusy(true);
    try {
      await setMaintenance({ token, enabled: !maintenanceOn });
      toast.success(
        maintenanceOn
          ? "Maintenance mode turned OFF."
          : "Maintenance mode turned ON. Students now see the maintenance screen.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setMaintenanceBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Page Control"
        description="Decide exactly what students see when they open the public page."
      />

      {/* Current page banner */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
          maintenanceOn ? "border-destructive/40 bg-destructive/5" : "border-border bg-card",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Current Public Page
          </span>
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span
              className={cn(
                "size-2 rounded-full",
                maintenanceOn
                  ? "bg-destructive animate-pulse"
                  : currentPage === "none"
                    ? "bg-muted-foreground/50"
                    : "bg-emerald-500",
              )}
            />
            {maintenanceOn ? "Maintenance" : PAGE_LABELS[currentPage]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {maintenanceOn
            ? "Maintenance mode overrides every other setting."
            : "Students opening / see this right now."}
        </p>
      </div>

      {/* Quick switch buttons */}
      <Panel>
        <PanelHeader
          title="Public Page"
          description="Only one page can be active at a time."
        />
        <PanelBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAGE_OPTIONS.map((option) => {
            const isActive = !maintenanceOn && currentPage === option.target;
            return (
              <button
                key={option.target}
                type="button"
                onClick={() => requestPage(option.target)}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-2 rounded-md border px-4 py-4 text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/40 hover:bg-primary/[0.03]",
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      isActive ? "text-primary-foreground" : "text-primary",
                    )}
                  >
                    {option.icon}
                  </span>
                  {isActive && (
                    <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]">
                      Active
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold">{option.label}</span>
                <span
                  className={cn(
                    "text-xs leading-snug",
                    isActive
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {option.hint}
                </span>
              </button>
            );
          })}
        </PanelBody>
        <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
          Priority order: Maintenance → Voting → Results → Notifications → No
          Page. The public page updates instantly for every student.
        </div>
      </Panel>

      {/* Maintenance */}
      <Panel>
        <PanelHeader
          title="Maintenance Mode"
          description="While ON, students see only the maintenance screen — no other page loads."
        />
        <PanelBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <StatusPill
              label={maintenanceOn ? "ON" : "OFF"}
              color={maintenanceOn ? "red" : "gray"}
            />
            <span className="text-sm text-muted-foreground">
              {maintenanceOn
                ? "The election portal is temporarily unavailable to students."
                : "The public page is accessible according to the setting above."}
            </span>
          </div>
          <Button
            variant={maintenanceOn ? "default" : "destructive"}
            disabled={maintenanceBusy}
            onClick={toggleMaintenance}
          >
            {maintenanceBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Power className="size-4" />
            )}
            {maintenanceOn
              ? "Turn OFF Maintenance Mode"
              : "Turn ON Maintenance Mode"}
          </Button>
        </PanelBody>
      </Panel>

      {/* Switch confirmation */}
      <Dialog
        open={pendingTarget !== null}
        onOpenChange={(open) => !open && setPendingTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tight">
              Change the public page?
            </DialogTitle>
            <DialogDescription>
              {currentPage === "voting" && pendingTarget
                ? `Are you sure you want to disable the Voting Page and show ${PAGE_LABELS[pendingTarget]} instead?`
                : pendingTarget
                  ? `The public page will change from ${PAGE_LABELS[currentPage]} to ${PAGE_LABELS[pendingTarget]}. Students will see this immediately.`
                  : ""}
            </DialogDescription>
          </DialogHeader>
          {pendingTarget === "voting" && (
            <p className="rounded-md border border-border bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Showing the voting page does not open voting by itself — students
              can only submit while Voting status is Open.
            </p>
          )}
          {pendingTarget === "results" && !data.settings.resultsVisibility && (
            <p className="rounded-md border border-border bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Public Results is currently OFF, so students will see a
              &ldquo;results will be published soon&rdquo; message. Turn it ON
              from the Results screen to release the tally.
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setPendingTarget(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              onClick={() => pendingTarget && applyPage(pendingTarget)}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
