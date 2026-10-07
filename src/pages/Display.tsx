import { useQuery } from "convex/react";
import { Maximize, Minimize, Trophy } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Seal } from "@/components/Seal";
import { CenteredLoader } from "@/components/Loader";
import { useFullscreen } from "@/hooks/use-fullscreen";

export type { DisplayData } from "@/convex/display";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const PAGE_LABELS: Record<string, string> = {
  voting: "Voting",
  results: "Results",
  notifications: "Notifications",
  none: "No Page Available",
};

const VOTING_LABELS: Record<string, string> = {
  not_started: "Not Started",
  open: "Voting Open",
  paused: "Voting Paused",
  closed: "Voting Closed",
};

function statusOf(data: DisplayData): { label: string; tone: string } {
  if (data.maintenanceMode) {
    return { label: "Under Maintenance", tone: "bg-amber-500/15 text-amber-600" };
  }
  if (data.page === "voting") {
    const label = VOTING_LABELS[data.votingStatus] ?? "Voting";
    return {
      label,
      tone:
        data.votingStatus === "open"
          ? "bg-emerald-500/15 text-emerald-600"
          : "bg-muted text-muted-foreground",
    };
  }
  if (data.page === "results") {
    return {
      label: data.resultsVisibility ? "Results Published" : "Results Pending",
      tone: data.resultsVisibility
        ? "bg-primary/15 text-primary"
        : "bg-muted text-muted-foreground",
    };
  }
  return {
    label: PAGE_LABELS[data.page] ?? "Election",
    tone: "bg-muted text-muted-foreground",
  };
}

/**
 * `/display` — a clean, distance-readable full-screen presentation for
 * projectors, LED screens, and large monitors. Public by design: it only
 * ever receives what Page Control allows (results stay hidden until the
 * admin publishes them, enforced server-side).
 */
export default function Display() {
  const data = useQuery(api.display.data);
  const { active: fullscreen, toggle } = useFullscreen();

  if (data === undefined) return <CenteredLoader label="Loading display" />;
  if (data === null) return null;
  const branding = data.branding ?? ({} as DisplayData["branding"]);
  const status = statusOf(data);
  const results = data.results;
  const showResults = Boolean(results && data.resultsVisibility);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Header: logo, college, election, status */}
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-10">
          <div className="flex min-w-0 items-center gap-5">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={`${branding.collegeName} logo`}
                className="size-16 shrink-0 object-contain sm:size-20"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border sm:size-20">
                <Seal className="size-10 text-primary sm:size-12" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold uppercase tracking-[0.16em] sm:text-3xl">
                {branding.collegeName}
              </h1>
              <p className="mt-1 truncate text-sm font-semibold uppercase tracking-[0.3em] text-primary sm:text-lg">
                {branding.electionTitle} {branding.year}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] sm:text-base ${status.tone}`}
            >
              {status.label}
            </span>
            <button
              type="button"
              onClick={() => void toggle()}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="flex size-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {fullscreen ? (
                <Minimize className="size-5" />
              ) : (
                <Maximize className="size-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8 sm:px-10 sm:py-10">
        {showResults && results ? (
          <>
            <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-foreground/15 pb-4">
              <h2 className="text-2xl font-bold uppercase tracking-[0.14em] sm:text-4xl">
                Election Results
              </h2>
              <p className="text-lg font-semibold tabular-nums text-muted-foreground sm:text-2xl">
                {results.totalBallots.toLocaleString()}{" "}
                <span className="text-sm font-medium uppercase tracking-widest">
                  ballots
                </span>
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {results.posts.map((post) => {
                const winner =
                  post.totalVotes > 0
                    ? post.options.find(
                        (option) => option.isWinner && !option.isNota,
                      )
                    : undefined;
                return (
                  <section
                    key={post.postId}
                    className="rounded-2xl border border-border bg-card p-5 sm:p-7"
                  >
                    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
                      <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {post.name}
                      </h3>
                      <span className="shrink-0 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                        {post.totalVotes.toLocaleString()} votes
                      </span>
                    </div>

                    {post.totalVotes === 0 ? (
                      <p className="pt-6 text-lg text-muted-foreground">
                        No votes recorded yet.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {post.options.map((option) => (
                          <div
                            key={option.id}
                            className={[
                              "flex items-center gap-4 rounded-xl border p-3",
                              option.isWinner
                                ? option.isNota
                                  ? "border-border bg-muted/50"
                                  : "border-primary/50 bg-primary/[0.05]"
                                : "border-transparent",
                            ].join(" ")}
                          >
                            {/* Photo or NOTA mark */}
                            <span className="relative block size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:size-20">
                              {option.isNota ? (
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                  NOTA
                                </span>
                              ) : (
                                <>
                                  <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold uppercase text-muted-foreground">
                                    {initialsOf(option.name)}
                                  </span>
                                  {option.photoUrl && (
                                    <img
                                      src={option.photoUrl}
                                      alt={option.name}
                                      className="absolute inset-0 size-full object-cover"
                                      onError={(event) => {
                                        event.currentTarget.style.display =
                                          "none";
                                      }}
                                    />
                                  )}
                                </>
                              )}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="flex min-w-0 items-center gap-2 truncate text-lg font-semibold sm:text-xl">
                                  <span className="truncate">
                                    {option.isNota ? "NOTA" : option.name}
                                  </span>
                                  {option.isWinner && (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                                      <Trophy className="size-3.5" />
                                      {option.isNota ? "NOTA leads" : "Winner"}
                                    </span>
                                  )}
                                </p>
                                <p className="shrink-0 text-lg font-bold tabular-nums sm:text-2xl">
                                  {option.percent.toFixed(1)}%
                                </p>
                              </div>
                              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={[
                                    "h-full rounded-full",
                                    option.isWinner
                                      ? option.isNota
                                        ? "bg-muted-foreground/60"
                                        : "bg-primary"
                                      : "bg-muted-foreground/35",
                                  ].join(" ")}
                                  style={{ width: `${option.percent}%` }}
                                />
                              </div>
                              <p className="mt-1.5 text-sm text-muted-foreground">
                                {option.votes.toLocaleString()} vote
                                {option.votes === 1 ? "" : "s"}
                                {winner && option.id === winner.id
                                  ? " · Leading"
                                  : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        ) : data.page === "voting" || data.page === "results" ? (
          <>
            <div className="mb-8 flex items-baseline justify-between gap-4 border-b border-foreground/15 pb-4">
              <h2 className="text-2xl font-bold uppercase tracking-[0.14em] sm:text-4xl">
                {data.page === "voting"
                  ? "Cast Your Vote"
                  : "Results Will Be Announced Soon"}
              </h2>
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
                {data.page === "voting"
                  ? "Select one candidate per post"
                  : "Stay tuned"}
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {data.posts.map((post) => (
                <section
                  key={post.id}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-7"
                >
                  <h3 className="border-b border-border pb-3 text-xl font-bold tracking-tight sm:text-2xl">
                    {post.name}
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {post.candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex flex-col items-center text-center"
                      >
                        <span className="relative block aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted">
                          <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold uppercase text-muted-foreground">
                            {initialsOf(candidate.name)}
                          </span>
                          {candidate.photoUrl && (
                            <img
                              src={candidate.photoUrl}
                              alt={candidate.name}
                              className="absolute inset-0 size-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </span>
                        <p className="mt-2 w-full truncate text-base font-semibold sm:text-lg">
                          {candidate.name}
                        </p>
                        <p className="w-full truncate text-sm text-muted-foreground">
                          {[
                            candidate.department,
                            candidate.semester,
                            candidate.class,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                    {post.candidates.length === 0 && (
                      <p className="col-span-full py-6 text-center text-muted-foreground">
                        No candidates yet.
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>

            {data.posts.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-xl text-muted-foreground">
                No posts have been configured yet.
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-24 text-center">
            <span className="flex size-20 items-center justify-center rounded-full border border-border">
              <Seal className="size-12 text-primary" />
            </span>
            <h2 className="mt-8 text-3xl font-bold uppercase tracking-[0.16em] sm:text-5xl">
              {data.maintenanceMode
                ? "Under Maintenance"
                : (PAGE_LABELS[data.page] ?? "Election Portal")}
            </h2>
            <p className="mt-4 text-xl text-muted-foreground">
              {data.maintenanceMode
                ? "The election portal will be back shortly."
                : "There is no active election page right now."}
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 text-xs uppercase tracking-[0.3em] text-muted-foreground sm:px-10">
          <span className="truncate">{branding.collegeName}</span>
          <span className="shrink-0">
            {branding.electionTitle} · {branding.year}
          </span>
        </div>
      </footer>
    </div>
  );
}
