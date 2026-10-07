import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  StatusPill,
} from "@/components/admin/Panel";
import { InlineLoader } from "@/components/Loader";
import { ResultPost } from "@/components/ResultPost";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/errors";
import { useAdminToken } from "@/lib/adminSession";

/** Admin → Results: full tallies plus the Public Results ON/OFF control. */
export default function AdminResults() {
  const token = useAdminToken() ?? "";
  const data = useQuery(api.voting.adminResults, { token });
  const setResultsVisibility = useMutation(api.settings.setResultsVisibility);

  if (data === undefined) return <InlineLoader label="Loading results" />;
  if (data === null) return null;

  async function toggleVisibility(enabled: boolean) {
    try {
      await setResultsVisibility({ token, enabled });
      toast.success(
        enabled
          ? "Public results turned ON. Students can see them once Page Control shows Results."
          : "Public results turned OFF. Students can no longer see results.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const results = data.results;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Results"
        description="Tallies per post, including NOTA. Students only see results when Public Results is ON and Page Control is set to Results."
        actions={
          <span className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Public Results
            </span>
            <Switch
              checked={data.published}
              onCheckedChange={toggleVisibility}
              aria-label="Toggle public results"
            />
            <span
              className={
                data.published
                  ? "text-xs font-semibold text-primary"
                  : "text-xs font-semibold text-muted-foreground"
              }
            >
              {data.published ? "ON" : "OFF"}
            </span>
          </span>
        }
      />

      {!results ? (
        <Panel>
          <PanelHeader title="No election yet" />
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            Create an election and posts to start collecting votes.
          </div>
        </Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Total Ballots"
              value={results.totalBallots.toLocaleString()}
              hint="Completed submissions"
            />
            <StatTile
              label="Posts"
              value={results.posts.length}
              hint={`${results.posts.filter((post) => post.active).length} active`}
            />
            <StatTile
              label="Public Visibility"
              value={data.published ? "ON" : "OFF"}
              tone={data.published ? "live" : "muted"}
              hint={
                data.published
                  ? "Students can view results"
                  : "Results hidden from students"
              }
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusPill
              label={data.published ? "Published" : "Hidden"}
              color={data.published ? "green" : "gray"}
            />
            <span>
              {data.published
                ? "Results are visible to students on the public page."
                : "Turn Public Results ON to release the tally."}
            </span>
          </div>

          <div className="space-y-10">
            {results.posts.map((post, index) => (
              <ResultPost key={post.postId} post={post} index={index} />
            ))}
          </div>

          {results.posts.length === 0 && (
            <Panel>
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <BarChart3 className="size-6 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No posts yet — results will appear here once the ballot has
                  content.
                </p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link to="/admin/posts">Manage posts</Link>
                </Button>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
