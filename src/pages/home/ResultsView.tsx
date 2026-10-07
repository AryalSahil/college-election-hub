import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FadeIn } from "@/components/FadeIn";
import { CenteredLoader } from "@/components/Loader";
import { ResultPost } from "@/components/ResultPost";

/**
 * State 2 — the results page. Shows per-post tallies with percentages,
 * NOTA counts, and the winner. Only renders data when the admin has turned
 * Public Results ON (enforced server-side in `voting.publicResults`).
 */
export function ResultsView() {
  const data = useQuery(api.voting.publicResults);

  if (data === undefined) return <CenteredLoader label="Loading results" />;
  if (data === null) return null;

  return (
    <FadeIn>
      <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
        Official Results
      </p>
      <h1 className="mt-3 text-2xl font-bold uppercase leading-tight tracking-[0.06em] sm:text-3xl">
        {data.election.name} {data.election.year}
      </h1>
      <div className="mt-5 h-px w-full bg-border" />
      <h2 className="mt-6 text-lg font-semibold tracking-tight">
        Election Results
      </h2>

      {!data.published ? (
        <div className="mt-8 rounded-lg border border-border bg-card px-6 py-14 text-center">
          <h3 className="text-base font-semibold tracking-tight">
            Results will be published soon
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The election administrator has not published the results yet.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="flex items-baseline justify-between rounded-md border border-border bg-muted/60 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Total ballots cast
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {data.results?.totalBallots.toLocaleString() ?? 0}
            </span>
          </div>

          <div className="mt-10 space-y-10">
            {(data.results?.posts ?? []).map((post, index) => (
              <ResultPost key={post.postId} post={post} index={index} />
            ))}
          </div>
        </div>
      )}
    </FadeIn>
  );
}

export default ResultsView;
