import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  publicPageValidator,
  votingStatusValidator,
  type PublicPage,
} from "./schema";
import {
  computePublicPage,
  getActiveElection,
  getSettings,
  getOrCreateSettings,
  recordActivity,
  requireAdmin,
  resolveSettings,
  verifySession,
} from "./helpers";

export const PAGE_LABELS: Record<PublicPage, string> = {
  voting: "Voting",
  results: "Results",
  notifications: "Notifications",
  none: "No Page",
};

export const VOTING_LABELS: Record<
  "not_started" | "open" | "paused" | "closed",
  string
> = {
  not_started: "Not Started",
  open: "Open",
  paused: "Paused",
  closed: "Closed",
};

/**
 * Public: everything the `/` route needs to decide which of the five states
 * to render. The priority (maintenance > voting > results > notifications >
 * none) is resolved on the server so the client cannot spoof it.
 */
export const publicState = query({
  args: {},
  handler: async (ctx) => {
    const settings = resolveSettings(await getSettings(ctx));
    const election = await getActiveElection(ctx);
    return {
      page: computePublicPage(settings),
      activePublicPage: settings.activePublicPage,
      maintenanceMode: settings.maintenanceMode,
      votingStatus: settings.votingStatus,
      resultsVisibility: settings.resultsVisibility,
      election: election
        ? { name: election.name, year: election.year, status: election.status }
        : null,
    };
  },
});

/** Admin: full settings + election snapshot for the panel. */
export const get = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;
    const settings = resolveSettings(await getSettings(ctx));
    const election = await getActiveElection(ctx);
    return {
      settings,
      currentPage: computePublicPage(settings),
      election: election
        ? {
            id: election._id,
            name: election.name,
            year: election.year,
            status: election.status,
            description: election.description,
            updatedAt: election.updatedAt,
          }
        : null,
    };
  },
});

/** Admin: aggregate numbers for the dashboard cards. */
export const overview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;

    const settings = resolveSettings(await getSettings(ctx));
    const election = await getActiveElection(ctx);

    const posts = await ctx.db.query("posts").collect();
    const candidates = await ctx.db.query("candidates").collect();

    let ballots = 0;
    let voteRows = 0;
    if (election) {
      const votes = await ctx.db
        .query("votes")
        .withIndex("by_election", (q) => q.eq("electionId", election._id))
        .collect();
      voteRows = votes.length;
      ballots = new Set(votes.map((vote) => vote.ballotId)).size;
    }

    return {
      currentPage: computePublicPage(settings),
      settings,
      election: election
        ? { name: election.name, year: election.year, status: election.status }
        : null,
      totals: {
        posts: posts.length,
        activePosts: posts.filter((post) => post.active).length,
        candidates: candidates.length,
        activeCandidates: candidates.filter((candidate) => candidate.active)
          .length,
        ballots,
        voteRows,
      },
    };
  },
});

/** Admin: switch what students see on `/`. Exactly one page is ever active. */
export const setPublicPage = mutation({
  args: { token: v.string(), page: publicPageValidator },
  handler: async (ctx, { token, page }) => {
    await requireAdmin(ctx, token);
    const settings = await getOrCreateSettings(ctx);
    if (settings.activePublicPage === page) return { ok: true as const };
    const from = PAGE_LABELS[settings.activePublicPage];
    await ctx.db.patch(settings._id, {
      activePublicPage: page,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      "page.change",
      `Public page switched from ${from} to ${PAGE_LABELS[page]}`,
    );
    return { ok: true as const };
  },
});

/** Admin: maintenance mode overrides every other public state. */
export const setMaintenance = mutation({
  args: { token: v.string(), enabled: v.boolean() },
  handler: async (ctx, { token, enabled }) => {
    await requireAdmin(ctx, token);
    const settings = await getOrCreateSettings(ctx);
    if (settings.maintenanceMode === enabled) return { ok: true as const };
    await ctx.db.patch(settings._id, {
      maintenanceMode: enabled,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      "maintenance.toggle",
      `Maintenance mode turned ${enabled ? "ON" : "OFF"}`,
    );
    return { ok: true as const };
  },
});

/** Admin: Not Started / Open / Paused / Closed. */
export const setVotingStatus = mutation({
  args: { token: v.string(), status: votingStatusValidator },
  handler: async (ctx, { token, status }) => {
    await requireAdmin(ctx, token);
    const settings = await getOrCreateSettings(ctx);
    if (settings.votingStatus === status) return { ok: true as const };
    const from = VOTING_LABELS[settings.votingStatus];
    await ctx.db.patch(settings._id, {
      votingStatus: status,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      "voting.status",
      `Voting status changed from ${from} to ${VOTING_LABELS[status]}`,
    );
    return { ok: true as const };
  },
});

/** Admin: Public Results OFF/ON. Students see results only when ON. */
export const setResultsVisibility = mutation({
  args: { token: v.string(), enabled: v.boolean() },
  handler: async (ctx, { token, enabled }) => {
    await requireAdmin(ctx, token);
    const settings = await getOrCreateSettings(ctx);
    if (settings.resultsVisibility === enabled) return { ok: true as const };
    await ctx.db.patch(settings._id, {
      resultsVisibility: enabled,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      "results.visibility",
      `Public results turned ${enabled ? "ON" : "OFF"}`,
    );
    return { ok: true as const };
  },
});
