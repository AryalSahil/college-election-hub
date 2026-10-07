import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./helpers";
import {
  ensureElection,
  getOrCreateSettings,
  recordActivity,
  requireAdmin,
} from "./helpers";

/**
 * Destructive, admin-only election resets.
 *
 * Protections:
 * - Every mutation requires a valid admin session (validated server-side).
 * - resetVotes / startFresh additionally require the exact confirmation
 *   phrase from the client, checked here — a forged request without it fails.
 * - They only ever touch votes, voter-code usage, and voting status.
 *   Candidates, photos, posts, branding, notifications, and the admin
 *   account are never modified.
 * - Every operation writes an audit-log entry.
 */

async function deleteAllVotes(
  ctx: MutationCtx,
  electionId: Id<"elections">,
): Promise<number> {
  const votes = await ctx.db
    .query("votes")
    .withIndex("by_election", (q) => q.eq("electionId", electionId))
    .collect();
  for (const vote of votes) await ctx.db.delete(vote._id);
  return votes.length;
}

async function resetVoterCodeUsage(
  ctx: MutationCtx,
  electionId: Id<"elections">,
): Promise<number> {
  const codes = await ctx.db
    .query("voterCodes")
    .withIndex("by_election", (q) => q.eq("electionId", electionId))
    .collect();
  let reset = 0;
  for (const entry of codes) {
    if (!entry.used) continue;
    await ctx.db.patch(entry._id, {
      used: false,
      usedAt: undefined,
      ballotId: undefined,
    });
    reset += 1;
  }
  return reset;
}

/** Danger Zone: delete every recorded vote. Phrase: RESET VOTES */
export const resetVotes = mutation({
  args: { token: v.string(), confirmation: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    if (args.confirmation.trim().toUpperCase() !== "RESET VOTES") {
      throw new Error('Type "RESET VOTES" to confirm.');
    }
    const election = await ensureElection(ctx);
    const deleted = await deleteAllVotes(ctx, election._id);
    await recordActivity(
      ctx,
      "votes.reset",
      `Admin reset all voting data · Election: ${election.name} · ${deleted} vote record(s) deleted`,
    );
    return { ok: true as const, deleted };
  },
});

/** Danger Zone: return every voter code to unused. Confirmation dialog. */
export const resetVoterStatus = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const election = await ensureElection(ctx);
    const reset = await resetVoterCodeUsage(ctx, election._id);
    await recordActivity(
      ctx,
      "voter_codes.reset",
      `Admin reset voter-code usage · Election: ${election.name} · ${reset} code(s) returned to unused`,
    );
    return { ok: true as const, reset };
  },
});

/**
 * Danger Zone: Start Fresh Election — clear votes + voter-code usage, set the
 * configured starting voting status, keep everything else. Phrase:
 * START FRESH
 */
export const startFresh = mutation({
  args: { token: v.string(), confirmation: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    if (args.confirmation.trim().toUpperCase() !== "START FRESH") {
      throw new Error('Type "START FRESH" to confirm.');
    }

    const election = await ensureElection(ctx);
    const settings = await getOrCreateSettings(ctx);

    const deleted = await deleteAllVotes(ctx, election._id);
    const codesReset = await resetVoterCodeUsage(ctx, election._id);
    const startStatus = settings.resetVotingStatus ?? "not_started";
    await ctx.db.patch(settings._id, {
      votingStatus: startStatus,
      updatedAt: Date.now(),
    });

    await recordActivity(
      ctx,
      "election.fresh_start",
      `Election reset successfully · Admin · Election: ${election.name} · ${deleted} vote record(s) cleared · ${codesReset} voter code(s) reset · voting status: ${startStatus}`,
    );
    return {
      ok: true as const,
      deleted,
      codesReset,
      votingStatus: startStatus,
    };
  },
});
