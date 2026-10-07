import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Pause, Play, RotateCcw, Square } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  StatTile,
  StatusPill,
} from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";
import { VOTING_STATUS_LABELS, type VotingStatusKey } from "@/lib/labels";

type Target = "not_started" | "open" | "paused" | "closed";

const ACTIONS: {
  target: Target;
  label: string;
  icon: React.ReactNode;
  variant:
    | "default"
    | "outline"
    | "destructive"
    | "secondary"
    | "ghost";
}[] = [
  { target: "open", label: "Open Voting", icon: <Play className="size-4" />, variant: "default" },
  { target: "paused", label: "Pause Voting", icon: <Pause className="size-4" />, variant: "outline" },
  { target: "closed", label: "Close Voting", icon: <Square className="size-4" />, variant: "outline" },
  { target: "not_started", label: "Mark Not Started", icon: <RotateCcw className="size-4" />, variant: "ghost" },
];

/** Admin → Voting: lifecycle controls plus live turnout numbers. */
export default function AdminVoting() {
  const token = useAdminToken() ?? "";
  const stats = useQuery(api.voting.voteStats, { token });
  const setVotingStatus = useMutation(api.settings.setVotingStatus);
  const [busy, busySet] = useState<Target | null>(null);

  if (stats === undefined) return <InlineLoader label="Loading voting status" />;
  if (stats === null) return null;

  const status = stats.votingStatus as VotingStatusKey;
  const isOpen = status === "open";

  async function change(target: Target) {
    busySet(target);
    try {
      await setVotingStatus({ token, status: target });
      toast.success(`Voting status set to ${VOTING_STATUS_LABELS[target]}.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      busySet(null);
    }
  }

  const maxVotes = Math.max(1, ...stats.posts.map((post) => post.votes));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Voting"
        description="Students can submit a ballot only when the status is Open and Page Control is showing the Voting page."
        actions={
          <StatusPill
            label={VOTING_STATUS_LABELS[status]}
            color={isOpen ? "green" : status === "paused" ? "amber" : "gray"}
          />
        }
      />

      <Panel>
        <PanelHeader
          title="Voting status"
          description="Not Started · Open · Paused · Closed"
        />
        <PanelBody className="space-y-5">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-tight">
              {VOTING_STATUS_LABELS[status]}
            </span>
            <span className="text-sm text-muted-foreground">
              {isOpen
                ? "Students can vote now"
                : "Submissions are blocked server-side"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => {
              const isCurrent = status === action.target;
              return (
                <Button
                  key={action.target}
                  variant={isCurrent ? "secondary" : action.variant}
                  disabled={isCurrent || busy !== null}
                  onClick={() => change(action.target)}
                >
                  {busy === action.target ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    action.icon
                  )}
                  {action.label}
                </Button>
              );
            })}
          </div>

          <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Closing voting immediately blocks new ballots, even if the public
            page still shows Voting. Pausing keeps the ballot visible but
            stops submissions.
          </div>
        </PanelBody>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Ballots Cast"
          value={stats.totalBallots.toLocaleString()}
          hint="Completed submissions"
        />
        <StatTile
          label="Posts Tracking"
          value={stats.posts.length}
          hint={`${stats.posts.filter((post) => post.active).length} active`}
        />
        <StatTile
          label="Submissions"
          value={isOpen ? "Accepted" : "Blocked"}
          tone={isOpen ? "live" : "muted"}
          hint={isOpen ? "Voting is open" : "Voting is not open"}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Turnout by post"
          description="Each completed ballot records one vote per post."
        />
        {stats.posts.length === 0 ? (
          <PanelBody className="py-10 text-center text-sm text-muted-foreground">
            No posts yet.
          </PanelBody>
        ) : (
          <div className="divide-y divide-border/70">
            {stats.posts.map((post) => (
              <div key={post.id} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">{post.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {post.votes.toLocaleString()} votes
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{
                      width: `${Math.round((post.votes / maxVotes) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
