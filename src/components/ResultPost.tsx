import { Ban, Check, Trophy } from "lucide-react";
import type { ElectionResults } from "@/convex/voting";

export type PostResult = ElectionResults["posts"][number];
type OptionResult = PostResult["options"][number];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Small candidate photo with an initials fallback underneath. */
function Thumb({ option, size }: { option: OptionResult; size: number }) {
  if (option.isNota) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <Ban className="size-1/2" strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-md border border-border bg-muted"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {initialsOf(option.name)}
      </span>
      {option.photoUrl && (
        <img
          src={option.photoUrl}
          alt={option.name}
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

/**
 * One post's tally: photo rows with vote counts, percentages, bars, and a
 * highlighted winner card at the top. NOTA never shows a candidate photo.
 */
export function ResultPost({ post, index }: { post: PostResult; index: number }) {
  const winner =
    post.totalVotes > 0
      ? post.options.find((option) => option.isWinner && !option.isNota)
      : undefined;

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
        <div className="pt-4">
          {/* Winner card */}
          {winner && (
            <div className="mb-5 flex items-center gap-4 rounded-xl border-2 border-primary/40 bg-primary/[0.05] p-4 sm:gap-5 sm:p-5">
              <Thumb option={winner} size={72} />
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  <Trophy className="size-3" strokeWidth={2.4} />
                  Winner
                </span>
                <p className="mt-2 truncate text-lg font-bold tracking-tight sm:text-xl">
                  {winner.name}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {winner.votes.toLocaleString()}
                  </span>{" "}
                  vote{winner.votes === 1 ? "" : "s"} ·{" "}
                  <span className="font-medium text-foreground">
                    {winner.percent.toFixed(1)}%
                  </span>
                </p>
              </div>
            </div>
          )}

          {post.options.map((option) => (
            <div
              key={option.id}
              className={[
                "py-3.5",
                option.isNota
                  ? "mt-2 border-t border-border/70"
                  : "border-b border-border/70",
                option.isWinner && option.isNota ? "rounded-md bg-muted/50 px-3" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <Thumb option={option} size={40} />
                <div className="min-w-0 flex-1">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ResultPost;
