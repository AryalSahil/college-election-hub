import { Link } from "react-router";
import { useQuery } from "convex/react";
import { ArrowUpRight, Settings2 } from "lucide-react";
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
import { useAdminToken } from "@/lib/adminSession";
import {
  ELECTION_STATUS_LABELS,
  PAGE_LABELS,
  VOTING_STATUS_LABELS,
  type PageKey,
  type VotingStatusKey,
} from "@/lib/labels";

/**
 * Dashboard cards: election status, posts, candidates, votes, voting status,
 * results status, current public page, maintenance status.
 */
export default function AdminDashboard() {
  const token = useAdminToken() ?? "";
  const overview = useQuery(api.settings.overview, { token });

  if (overview === undefined) return <InlineLoader label="Loading dashboard" />;
  if (overview === null) return null;

  const { settings, currentPage, totals, election } = overview;
  const votingOpen = settings.votingStatus === "open";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Everything that students can see, in one view."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/page-control">
                <Settings2 className="size-4" />
                Page Control
              </Link>
            </Button>
            <Button asChild>
              <Link to="/" target="_blank">
                View public page
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Public Page"
          tone={currentPage === "none" ? "muted" : "live"}
          hint={`Students see: ${PAGE_LABELS[currentPage as PageKey]}`}
          value={
            <span className="flex items-center gap-2">
              <StatusPill
                label={PAGE_LABELS[currentPage as PageKey]}
                color={
                  currentPage === "maintenance"
                    ? "red"
                    : currentPage === "none"
                      ? "gray"
                      : "green"
                }
              />
            </span>
          }
        />
        <StatTile
          label="Voting"
          tone={votingOpen ? "live" : "muted"}
          hint={
            votingOpen
              ? "Students can submit ballots"
              : "Submissions are disabled"
          }
          value={
            <span className="flex items-center gap-2">
              <StatusPill
                label={
                  votingOpen
                    ? "LIVE"
                    : VOTING_STATUS_LABELS[settings.votingStatus as VotingStatusKey]
                }
                color={votingOpen ? "green" : "gray"}
              />
            </span>
          }
        />
        <StatTile
          label="Election Status"
          value={
            election
              ? ELECTION_STATUS_LABELS[
                  election.status as keyof typeof ELECTION_STATUS_LABELS
                ]
              : "Not created"
          }
          hint={election ? `${election.name} ${election.year}` : undefined}
        />
        <StatTile
          label="Results Status"
          value={settings.resultsVisibility ? "Public — ON" : "Public — OFF"}
          hint={
            settings.resultsVisibility
              ? "Students can see results"
              : "Results hidden from students"
          }
          tone={settings.resultsVisibility ? "live" : "muted"}
        />
        <StatTile
          label="Total Posts"
          value={totals.posts}
          hint={`${totals.activePosts} active`}
        />
        <StatTile
          label="Total Candidates"
          value={totals.candidates}
          hint={`${totals.activeCandidates} active`}
        />
        <StatTile
          label="Total Votes"
          value={totals.ballots.toLocaleString()}
          hint={`${totals.voteRows.toLocaleString()} vote records`}
        />
        <StatTile
          label="Maintenance"
          value={settings.maintenanceMode ? "ON" : "OFF"}
          hint={
            settings.maintenanceMode
              ? "Maintenance overrides every page"
              : "Public page is accessible"
          }
          tone={settings.maintenanceMode ? "warn" : "muted"}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Quick controls"
          description="The two switches you'll use most on election day."
        />
        <PanelBody className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/admin/page-control"
            className="group flex items-center justify-between rounded-md border border-border px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
          >
            <span>
              <span className="block text-sm font-medium">
                Change the public page
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Currently showing {PAGE_LABELS[currentPage as PageKey]}
              </span>
            </span>
            <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
          <Link
            to="/admin/voting"
            className="group flex items-center justify-between rounded-md border border-border px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-primary/[0.03]"
          >
            <span>
              <span className="block text-sm font-medium">
                Control voting status
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {VOTING_STATUS_LABELS[settings.votingStatus as VotingStatusKey]}{" "}
                · {totals.ballots.toLocaleString()} ballots cast
              </span>
            </span>
            <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
        </PanelBody>
      </Panel>
    </div>
  );
}
