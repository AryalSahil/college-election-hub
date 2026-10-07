import { Check } from "lucide-react";
import type { ElectionResults } from "@/convex/voting";

export type PostResult = ElectionResults["posts"][number];

/** One post's tally: rows with vote counts, percentages, bars, and winner. */
export function ResultPost({ post, index }: { post: PostResult; index: number }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 border-b border-foreground/15 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
            {index + 1}.
          </span>
          <h3 className="text-base font-semibold tracking-tight sm:text-lg">
            {post.name}
          </h3>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {post.totalVotes.toLocaleString()} vote
          {post.totalVotes === 1 ? "" : "s"}
        </span>
      </div>

      {post.totalVotes === 0 ? (
        <p className="pt-4 text-sm text-muted-foreground">
          No votes have been recorded for this post yet.
        </p>
      ) : (
        <div className="pt-1">
          {post.options.map((option) => (
            <div
              key={option.id}
              className={[
                "py-3.5",
                option.isNota
                  ? "mt-2 border-t border-border/70"
                  : "border-b border-border/70",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span
                  className={[
                    "flex min-w-0 items-center gap-2 text-[15px]",
                    option.isWinner ? "font-semibold" : "font-normal",
                  ].join(" ")}
                >
                  <span className="truncate">{option.name}</span>
                  {option.isWinner && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                      <Check className="size-3" strokeWidth={2.5} />
                      {option.isNota ? "NOTA leads" : "Winner"}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {option.votes.toLocaleString()} votes —{" "}
                  <span className="font-medium text-foreground">
                    {option.percent.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    option.isWinner
                      ? option.isNota
                        ? "bg-muted-foreground/70"
                        : "bg-primary"
                      : "bg-muted-foreground/35",
                  ].join(" ")}
                  style={{ width: `${option.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ResultPost;
