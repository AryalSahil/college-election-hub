import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, RotateCcw, TriangleAlert, Zap } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Panel, PanelBody, PanelHeader } from "@/components/admin/Panel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";

type DialogState =
  | null
  | { op: "votes"; stage: "confirm" | "phrase" }
  | { op: "fresh"; stage: "confirm" | "phrase" }
  | { op: "voter" };

const PHRASES = {
  votes: "RESET VOTES",
  fresh: "START FRESH",
} as const;

/**
 * Admin → Settings → Danger Zone.
 *
 * Every destructive operation is admin-session gated and re-validated on the
 * server (`convex/resets.ts`): the typed confirmation phrase is checked
 * server-side, and each operation writes an audit-log entry. Candidates,
 * posts, photos, branding, notifications, and the admin account are never
 * touched — only election activity (votes, voter-code usage, voting status).
 *
 * Client-side protection is a two-step dialog: an "Are you sure?" prompt
 * first, then the typed phrase, so one accidental click can never destroy
 * data.
 */
export function DangerZonePanel() {
  const token = useAdminToken() ?? "";
  const stats = useQuery(api.voting.voterCodeStats, { token });
  const resetVotes = useMutation(api.resets.resetVotes);
  const resetVoterStatus = useMutation(api.resets.resetVoterStatus);
  const startFresh = useMutation(api.resets.startFresh);

  const [dialog, setDialog] = useState<DialogState>(null);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setDialog(null);
    setPhrase("");
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      close();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const phraseValid =
    !dialog ||
    (dialog.op === "votes" &&
      phrase.trim().toUpperCase() === PHRASES.votes) ||
    (dialog.op === "fresh" && phrase.trim().toUpperCase() === PHRASES.fresh);

  return (
    <section
      id="danger-zone"
      className="rounded-lg border-2 border-destructive/40 bg-destructive/[0.02]"
    >
      <div className="flex items-start gap-3 border-b border-destructive/30 px-5 py-4">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-destructive">
            Danger Zone
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            These actions permanently clear election activity. Candidates,
            photos, posts, branding, notifications, and your admin account are
            never deleted. Every operation is logged.
          </p>
        </div>
      </div>

      <div className="divide-y divide-destructive/15">
        {/* ---------------------------------------------------------- */}
        {/* 1. Reset Voting Data                                       */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Reset Voting Data</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Delete all recorded votes. Results return to “No votes recorded
              yet.” Candidates and images are kept.
            </p>
          </div>
          <Button
            variant="destructive"
            className="shrink-0 gap-2"
            onClick={() => setDialog({ op: "votes", stage: "confirm" })}
          >
            <RotateCcw className="size-4" />
            Reset Votes
          </Button>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* 2. Reset Voter Status                                      */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Reset Voter Status</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Return every voter code to unused.{" "}
              {stats ? (
                <span className="tabular-nums">
                  Unused: <span className="font-medium">{stats.unused}</span>
                  {" · "}
                  Used: <span className="font-medium">{stats.used}</span>
                  {!stats.enabled && " (voter codes are currently disabled)"}
                </span>
              ) : (
                "Loading voter-code usage…"
              )}
            </p>
          </div>
          <Button
            variant="destructive"
            className="shrink-0 gap-2"
            disabled={!stats || stats.total === 0}
            onClick={() => setDialog({ op: "voter" })}
          >
            <RotateCcw className="size-4" />
            Reset All Voter Codes
          </Button>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* 3. Start Fresh Election                                    */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Start Fresh Election</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Clear all existing votes and reset voting activity while keeping
              your candidates, posts, branding and election settings.
            </p>
          </div>
          <Button
            variant="destructive"
            className="shrink-0 gap-2"
            onClick={() => setDialog({ op: "fresh", stage: "confirm" })}
          >
            <Zap className="size-4" />
            Start Fresh Election
          </Button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Step 1 — “Are you sure?” (first confirmation)                    */}
      {/* ---------------------------------------------------------------- */}
      <Dialog
        open={!!dialog && (dialog.op === "voter" || dialog.stage === "confirm")}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-tight text-destructive">
              <TriangleAlert className="size-5" />
              {dialog?.op === "votes" && "Reset all votes?"}
              {dialog?.op === "fresh" && "Start a fresh election?"}
              {dialog?.op === "voter" && "Reset all voter codes?"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.op === "votes" && (
                <>
                  ⚠️ <strong>RESET ALL VOTES</strong> — this will permanently
                  delete all recorded votes for this election. This action
                  cannot be undone. Are you absolutely sure?
                </>
              )}
              {dialog?.op === "fresh" && (
                <>
                  This will clear all existing votes and reset voting activity
                  while keeping your candidates, posts, branding and election
                  settings. Are you sure?
                </>
              )}
              {dialog?.op === "voter" && (
                <>
                  Every voter code will return to unused
                  {stats ? ` (${stats.used} currently used)` : ""}. Candidates
                  and votes are not affected. Are you sure?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            {dialog?.op === "voter" ? (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => resetVoterStatus({ token }),
                    "All voter codes reset to unused.",
                  )
                }
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Reset All Voter Codes
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  setPhrase("");
                  setDialog(
                    dialog?.op === "votes"
                      ? { op: "votes", stage: "phrase" }
                      : { op: "fresh", stage: "phrase" },
                  );
                }}
              >
                {dialog?.op === "votes" ? "Yes, reset votes" : "Yes, continue"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* Step 2 — typed confirmation phrase (second confirmation)         */}
      {/* ---------------------------------------------------------------- */}
      <Dialog
        open={!!dialog && dialog.op === "votes" && dialog.stage === "phrase"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 tracking-tight text-destructive">
              <TriangleAlert className="size-5" />
              {dialog?.op === "votes"
                ? "⚠️ RESET ALL VOTES"
                : "Start Fresh Election"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.op === "votes"
                ? "This will permanently delete all recorded votes for this election. This action cannot be undone. Are you absolutely sure?"
                : "This will clear all existing votes and reset voting activity while keeping your candidates, posts, branding and election settings."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type{" "}
              <code className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                {dialog?.op === "votes" ? PHRASES.votes : PHRASES.fresh}
              </code>{" "}
              to confirm.
            </p>
            <Input
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              placeholder={
                dialog?.op === "votes" ? PHRASES.votes : PHRASES.fresh
              }
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className="font-mono uppercase"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!phraseValid || busy}
              onClick={() => {
                if (dialog?.op === "votes") {
                  void run(
                    () => resetVotes({ token, confirmation: phrase }),
                    "All votes deleted. Results now show no votes recorded.",
                  );
                } else if (dialog?.op === "fresh") {
                  void run(
                    () => startFresh({ token, confirmation: phrase }),
                    "Election reset successfully. The election is ready to start fresh.",
                  );
                }
              }}
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              {dialog?.op === "votes" ? "Reset Votes" : "Start Fresh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default DangerZonePanel;
