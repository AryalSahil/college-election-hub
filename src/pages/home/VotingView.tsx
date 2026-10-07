import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, TriangleAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { FadeIn } from "@/components/FadeIn";
import { CenteredLoader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/lib/errors";
import type { Id } from "@/convex/_generated/dataModel";

/** Sentinel choice id for NOTA — mirrors `NOTA` in src/convex/schema.ts. */
const NOTA_ID = "NOTA";

type ChoiceId = Id<"candidates"> | typeof NOTA_ID;

type Ballot = NonNullable<FunctionReturnType<typeof api.voting.publicBallot>>;

const VOTING_NOTICES: Record<string, string> = {
  not_started: "Voting has not started yet. Submissions are disabled.",
  paused: "Voting is currently paused. Submissions are disabled.",
  closed: "Voting is closed. Submissions are disabled.",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function optionLabel(
  post: Ballot["posts"][number],
  choiceId: string,
): string {
  return (
    post.options.find((option) => option.id === choiceId)?.name ??
    "Not selected"
  );
}

/**
 * State 1 — the voting page. Large radio rows, one option per post, NOTA
 * appended last by the server, review summary, confirm dialog, success screen.
 */
export function VotingView() {
  const ballot = useQuery(api.voting.publicBallot);
  const castVote = useMutation(api.voting.castVote);

  const [selections, setSelections] = useState<Record<string, ChoiceId>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isOpen = ballot?.votingStatus === "open";
  const totalPosts = ballot?.posts.length ?? 0;
  const answered = useMemo(
    () =>
      (ballot?.posts ?? []).filter((post) => selections[post.id]).length,
    [ballot, selections],
  );

  const summary = useMemo(
    () =>
      (ballot?.posts ?? []).map((post) => ({
        postId: post.id,
        postName: post.name,
        choiceId: selections[post.id],
        label: selections[post.id]
          ? optionLabel(post, selections[post.id])
          : null,
      })),
    [ballot, selections],
  );

  if (submitted) return <SuccessScreen />;

  if (ballot === undefined) {
    return <CenteredLoader label="Loading ballot" />;
  }

  if (ballot === null) {
    return (
      <FadeIn className="py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          The ballot is unavailable
        </h1>
        <p className="mt-3 text-muted-foreground">
          Voting is not open on this page right now. Please check again later.
        </p>
      </FadeIn>
    );
  }

  function select(postId: string, choiceId: ChoiceId) {
    setError(null);
    setSelections((prev) => ({ ...prev, [postId]: choiceId }));
  }

  function handleSubmit() {
    if (totalPosts === 0) return;
    const missing = summary.filter((row) => !row.choiceId);
    if (missing.length > 0) {
      setError("Please select an option for every post.");
      const element = document.getElementById(`post-${missing[0].postId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    setSubmitting(true);
    try {
      await castVote({
        selections: (ballot?.posts ?? []).map((post) => ({
          postId: post.id,
          choice: selections[post.id],
        })),
      });
      setConfirmOpen(false);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setConfirmOpen(false);
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-4">
      {/* Masthead */}
      <FadeIn>
        <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
          Official Ballot
        </p>
        <h1 className="mt-3 text-2xl font-bold uppercase leading-tight tracking-[0.06em] sm:text-3xl">
          {ballot.election.name} {ballot.election.year}
        </h1>
        <div className="mt-5 h-px w-full bg-border" />
        <h2 className="mt-6 text-lg font-semibold tracking-tight">
          Cast Your Vote
        </h2>
        <ul className="mt-3 space-y-1.5 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed text-muted-foreground">
          <li>Select one candidate for each post.</li>
          <li>You can select only one option per post.</li>
          <li>Your vote cannot be changed after submission.</li>
        </ul>

        {!isOpen && (
          <div className="mt-6 flex items-start gap-2.5 rounded-md border border-border bg-muted/70 px-4 py-3 text-sm text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {VOTING_NOTICES[ballot.votingStatus] ??
                "Voting is not open right now. Submissions are disabled."}
            </span>
          </div>
        )}
      </FadeIn>

      {/* Posts */}
      {totalPosts === 0 ? (
        <FadeIn delay={0.05} className="mt-10">
          <div className="rounded-md border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            No posts are currently available for voting.
          </div>
        </FadeIn>
      ) : (
        <div className="mt-10 space-y-10">
          {ballot.posts.map((post, index) => (
            <FadeIn key={post.id} delay={0.04 * Math.min(index, 5)}>
              <section id={`post-${post.id}`} className="scroll-mt-24">
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
                    Select one
                  </span>
                </div>
                {post.description && (
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {post.description}
                  </p>
                )}

                <div
                  role="radiogroup"
                  aria-label={post.name}
                  className="mt-3"
                >
                  {post.options.map((option) => {
                    const selected = selections[post.id] === option.id;
                    return (
                      <label
                        key={option.id}
                        className={[
                          "group flex cursor-pointer items-center gap-4 border-b border-border/70 px-3 py-4 transition-colors sm:px-4",
                          "hover:bg-muted/60",
                          "has-[:checked]:border-primary/30 has-[:checked]:bg-primary/[0.05]",
                          "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-ring/60",
                          option.isNota ? "mt-3 rounded-md border-t" : "",
                          !isOpen ? "cursor-not-allowed opacity-60" : "",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name={`post-${post.id}`}
                          value={option.id}
                          checked={selected}
                          disabled={!isOpen}
                          onChange={() => select(post.id, option.id)}
                          className="size-4 shrink-0 accent-primary"
                        />
                        {!option.isNota && (
                          <span
                            className={[
                              "flex size-10 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold uppercase tracking-wide transition-colors",
                              selected
                                ? "border-primary/40 bg-primary/5 text-primary"
                                : "border-border text-muted-foreground",
                            ].join(" ")}
                          >
                            {option.photoUrl ? (
                              <img
                                src={option.photoUrl}
                                alt=""
                                className="size-full rounded-md object-cover"
                                onError={(event) => {
                                  const image = event.currentTarget;
                                  image.style.display = "none";
                                }}
                              />
                            ) : (
                              initialsOf(option.name)
                            )}
                          </span>
                        )}

                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium leading-snug sm:text-base">
                            {option.name}
                          </span>
                          {option.isNota ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              NOTA is not a candidate.
                            </span>
                          ) : (
                            (option.department ||
                              option.semester ||
                              option.class ||
                              option.description) && (
                              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                                {[
                                  option.department,
                                  option.semester && `${option.semester}`,
                                  option.class,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                                {option.description &&
                                  (option.department ||
                                    option.semester ||
                                    option.class) &&
                                  " — "}
                                {option.description}
                              </span>
                            )
                          )}
                        </span>

                        {!option.isNota && option.symbol && (
                          <span className="hidden shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:block">
                            {option.symbol}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            </FadeIn>
          ))}
        </div>
      )}

      {/* Review */}
      <FadeIn delay={0.08} className="mt-12">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-base font-semibold tracking-tight">
              Review Your Vote
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {answered} of {totalPosts} post{totalPosts === 1 ? "" : "s"}{" "}
              answered
            </p>
          </div>
          <div className="divide-y divide-border/70 px-5">
            {summary.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">
                There are no posts to vote on yet.
              </p>
            )}
            {summary.map((row) => (
              <div
                key={row.postId}
                className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className="text-sm text-muted-foreground">
                  {row.postName}
                </span>
                <span
                  className={[
                    "text-sm sm:text-right",
                    row.label
                      ? "font-medium text-foreground"
                      : "italic text-muted-foreground/70",
                  ].join(" ")}
                >
                  {row.label ?? "Not selected"}
                </span>
              </div>
            ))}
          </div>
          {error && (
            <div className="flex items-center gap-2 border-t border-destructive/30 bg-destructive/5 px-5 py-3 text-sm font-medium text-destructive">
              <TriangleAlert className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </FadeIn>

      {/* Sticky submit */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-8 border-t border-border/70 bg-background/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            Your vote cannot be changed after submission.
          </p>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!isOpen || totalPosts === 0}
            onClick={handleSubmit}
          >
            Submit Vote
          </Button>
        </div>
      </div>

      {/* Confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="tracking-tight">
              Confirm Your Vote
            </DialogTitle>
            <DialogDescription>
              Please review your selections carefully.
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-border/70 rounded-md border border-border">
            {summary.map((row) => (
              <div
                key={row.postId}
                className="flex items-baseline justify-between gap-4 px-4 py-2.5"
              >
                <span className="text-xs text-muted-foreground">
                  {row.postName}
                </span>
                <span className="text-right text-xs font-medium">
                  {row.label ?? "Not selected"}
                </span>
              </div>
            ))}
          </div>

          <p className="text-sm font-medium text-muted-foreground">
            Your vote cannot be changed after submission.
          </p>

          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={confirmSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuccessScreen() {
  return (
    <FadeIn className="flex flex-col items-center py-16 text-center sm:py-24">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-primary"
      >
        <Check className="size-8" strokeWidth={2.2} />
      </motion.div>
      <h1 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
        Vote Submitted Successfully
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
        Thank you for participating in the election.
      </p>
      <div className="mt-6 h-px w-14 bg-border" />
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Your ballot is final and cannot be changed. Results will be announced
        by the election administrator.
      </p>
    </FadeIn>
  );
}
