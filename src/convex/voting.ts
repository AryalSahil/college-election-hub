import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { NOTA } from "./schema";
import type { QueryCtx } from "./helpers";
import {
  NOTA_LABEL,
  computePublicPage,
  getActiveElection,
  getSettings,
  isNotaName,
  randomHex,
  resolveSettings,
  verifySession,
} from "./helpers";

// ---------------------------------------------------------------------------
// Result computation (shared by the admin Results screen and the public
// Results page)
// ---------------------------------------------------------------------------

export type OptionResult = {
  id: string;
  name: string;
  photoUrl?: string;
  symbol?: string;
  votes: number;
  percent: number;
  isNota: boolean;
  isWinner: boolean;
};

export type PostResult = {
  postId: string;
  name: string;
  description?: string;
  active: boolean;
  totalVotes: number;
  options: OptionResult[];
};

export type ElectionResults = {
  totalBallots: number;
  posts: PostResult[];
};

async function computeResults(
  ctx: QueryCtx,
  election: Doc<"elections">,
): Promise<ElectionResults> {
  const [posts, candidates, votes] = await Promise.all([
    ctx.db
      .query("posts")
      .withIndex("by_election", (q) => q.eq("electionId", election._id))
      .collect(),
    ctx.db.query("candidates").collect(),
    ctx.db
      .query("votes")
      .withIndex("by_election", (q) => q.eq("electionId", election._id))
      .collect(),
  ]);

  posts.sort((a, b) => a.displayOrder - b.displayOrder);
  const ballots = new Set(votes.map((vote) => vote.ballotId));

  const postResults: PostResult[] = posts.map((post) => {
    const postVotes = votes.filter((vote) => vote.postId === post._id);
    const totalVotes = postVotes.length;

    const countByCandidate = new Map<string, number>();
    let notaVotes = 0;
    for (const vote of postVotes) {
      if (vote.candidateId === NOTA) {
        notaVotes += 1;
      } else {
        countByCandidate.set(
          vote.candidateId,
          (countByCandidate.get(vote.candidateId) ?? 0) + 1,
        );
      }
    }

    const postCandidates = candidates.filter(
      (candidate) => candidate.postId === post._id,
    );
    const raw: OptionResult[] = postCandidates.map((candidate) => ({
      id: candidate._id,
      name: candidate.name,
      photoUrl: candidate.photoUrl,
      symbol: candidate.symbol,
      votes: countByCandidate.get(candidate._id) ?? 0,
      percent: 0,
      isNota: false,
      isWinner: false,
    }));
    raw.push({
      id: NOTA,
      name: NOTA_LABEL,
      votes: notaVotes,
      percent: 0,
      isNota: true,
      isWinner: false,
    });

    const max = Math.max(0, ...raw.map((option) => option.votes));
    for (const option of raw) {
      option.percent =
        totalVotes === 0
          ? 0
          : Math.round((option.votes / totalVotes) * 1000) / 10;
      option.isWinner = totalVotes > 0 && option.votes === max;
    }

    raw.sort((a, b) => b.votes - a.votes);
    return {
      postId: post._id,
      name: post.name,
      description: post.description,
      active: post.active,
      totalVotes,
      options: raw,
    };
  });

  return { totalBallots: ballots.size, posts: postResults };
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/**
 * Public: the ballot for the voting page. Returns null unless the admin has
 * made `/` show the voting page (and maintenance is off), so students can
 * never fetch the ballot through the API when voting is not the active page.
 */
export const publicBallot = query({
  args: {},
  handler: async (ctx) => {
    const settings = resolveSettings(await getSettings(ctx));
    if (computePublicPage(settings) !== "voting") return null;

    const election = await getActiveElection(ctx);
    if (!election) return null;

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_election", (q) => q.eq("electionId", election._id))
      .collect();
    const activePosts = posts
      .filter((post) => post.active)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const candidates = await ctx.db.query("candidates").collect();
    const byPost = new Map<string, Doc<"candidates">[]>();
    for (const candidate of candidates) {
      if (!candidate.active) continue;
      const list = byPost.get(candidate.postId) ?? [];
      list.push(candidate);
      byPost.set(candidate.postId, list);
    }

    return {
      election: { name: election.name, year: election.year },
      votingStatus: settings.votingStatus,
      posts: activePosts.map((post) => ({
        id: post._id,
        name: post.name,
        description: post.description,
        options: [
          ...(byPost.get(post._id) ?? []).map((candidate) => ({
            id: candidate._id,
            name: candidate.name,
            photoUrl: candidate.photoUrl,
            department: candidate.department,
            semester: candidate.semester,
            class: candidate.class,
            symbol: candidate.symbol,
            description: candidate.description,
            isNota: false as const,
          })),
          // NOTA is always appended server-side, always last.
          {
            id: NOTA,
            name: NOTA_LABEL,
            isNota: true as const,
          },
        ],
      })),
    };
  },
});

/**
 * Public: cast a full ballot. Every check runs on the server — the frontend
 * validation is convenience only. All vote rows are written inside this one
 * mutation, so a partial ballot is impossible.
 */
export const castVote = mutation({
  args: {
    selections: v.array(
      v.object({
        postId: v.id("posts"),
        choice: v.union(v.id("candidates"), v.literal(NOTA)),
      }),
    ),
  },
  handler: async (ctx, { selections }) => {
    // --- Gate 1: is voting actually open to students? ---
    const settings = resolveSettings(await getSettings(ctx));
    if (settings.maintenanceMode) {
      throw new Error(
        "The election portal is temporarily unavailable. Please try again later.",
      );
    }
    if (settings.activePublicPage !== "voting") {
      throw new Error("Voting is not currently available.");
    }
    if (settings.votingStatus !== "open") {
      throw new Error("Voting is not open right now.");
    }

    // --- Gate 2: which posts are active? ---
    const election = await getActiveElection(ctx);
    if (!election) throw new Error("No election is configured.");
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_election", (q) => q.eq("electionId", election._id))
      .collect();
    const activePosts = posts.filter((post) => post.active);
    if (activePosts.length === 0) {
      throw new Error("There are no active posts to vote for.");
    }

    // --- Gate 3: exactly one valid choice for every active post ---
    const activeIds = new Set(activePosts.map((post) => post._id));
    const seen = new Set<string>();
    for (const selection of selections) {
      if (!activeIds.has(selection.postId)) {
        throw new Error("Please select an option for every post.");
      }
      if (seen.has(selection.postId)) {
        throw new Error("Please select an option for every post.");
      }
      seen.add(selection.postId);
    }
    if (seen.size !== activePosts.length) {
      throw new Error("Please select an option for every post.");
    }

    for (const selection of selections) {
      if (selection.choice === NOTA) continue;
      const candidate = await ctx.db.get(selection.choice);
      if (
        !candidate ||
        !candidate.active ||
        candidate.postId !== selection.postId
      ) {
        throw new Error(
          "One of your selections is no longer valid. Please review your ballot.",
        );
      }
      if (isNotaName(candidate.name)) {
        throw new Error(
          "One of your selections is no longer valid. Please review your ballot.",
        );
      }
    }

    // --- Write the whole ballot atomically ---
    const ballotId = randomHex(16);
    for (const selection of selections) {
      await ctx.db.insert("votes", {
        electionId: election._id,
        postId: selection.postId,
        candidateId: selection.choice,
        ballotId,
        // Reserved for the future one-time voter-code system; unused in v1.
        voterToken: undefined,
      });
    }
    return { ok: true as const };
  },
});

/**
 * Public: results for the results page. Returns null unless `/` is showing
 * results. When Public Results is OFF, `results` is null even if votes exist.
 */
export const publicResults = query({
  args: {},
  handler: async (ctx) => {
    const settings = resolveSettings(await getSettings(ctx));
    if (computePublicPage(settings) !== "results") return null;

    const election = await getActiveElection(ctx);
    if (!election) return null;

    return {
      election: { name: election.name, year: election.year },
      votingStatus: settings.votingStatus,
      published: settings.resultsVisibility,
      results: settings.resultsVisibility
        ? await computeResults(ctx, election)
        : null,
    };
  },
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Admin: full results regardless of visibility settings. */
export const adminResults = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;
    const settings = resolveSettings(await getSettings(ctx));
    const election = await getActiveElection(ctx);
    if (!election) {
      return { published: settings.resultsVisibility, results: null };
    }
    return {
      published: settings.resultsVisibility,
      results: await computeResults(ctx, election),
    };
  },
});

/** Admin: turnout numbers for the Voting control screen. */
export const voteStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;

    const settings = resolveSettings(await getSettings(ctx));
    const election = await getActiveElection(ctx);
    if (!election) {
      return { votingStatus: settings.votingStatus, totalBallots: 0, posts: [] };
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_election", (q) => q.eq("electionId", election._id))
      .collect();
    posts.sort((a, b) => a.displayOrder - b.displayOrder);

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_election", (q) => q.eq("electionId", election._id))
      .collect();
    const ballots = new Set(votes.map((vote) => vote.ballotId));

    const perPost = new Map<string, number>();
    for (const vote of votes) {
      perPost.set(vote.postId, (perPost.get(vote.postId) ?? 0) + 1);
    }

    return {
      votingStatus: settings.votingStatus,
      totalBallots: ballots.size,
      posts: posts.map((post) => ({
        id: post._id,
        name: post.name,
        active: post.active,
        votes: perPost.get(post._id) ?? 0,
      })),
    };
  },
});
