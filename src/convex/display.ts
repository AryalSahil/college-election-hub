import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  computePublicPage,
  getActiveElection,
  getSettings,
  resolveCandidatePhoto,
  resolveSettings,
} from "./helpers";
import { computeResults } from "./voting";

type DisplayPost = {
  id: Id<"posts">;
  name: string;
  candidates: {
    id: Id<"candidates">;
    name: string;
    photoUrl?: string;
    symbol?: string;
    department?: string;
    semester?: string;
    class?: string;
  }[];
};

/**
 * Public: data for the full-screen Display mode (`/display`) used on
 * projectors and LED screens. Results are only included when the admin has
 * turned Public Results ON — the display can never leak unpublished tallies.
 */
export const data = query({
  args: {},
  handler: async (ctx) => {
    const settings = resolveSettings(await getSettings(ctx));
    const election = await getActiveElection(ctx);
    const logoUrl = settings.logoStorageId
      ? await ctx.storage.getUrl(settings.logoStorageId)
      : null;

    const results =
      settings.resultsVisibility && election
        ? await computeResults(ctx, election)
        : null;

    let posts: DisplayPost[] = [];
    if (election) {
      const allPosts = await ctx.db
        .query("posts")
        .withIndex("by_election", (q) => q.eq("electionId", election._id))
        .collect();
      const activePosts = allPosts
        .filter((post) => post.active)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      const candidates = await ctx.db.query("candidates").collect();
      const byPost = new Map<string, typeof candidates>();
      for (const candidate of candidates) {
        if (!candidate.active) continue;
        const list = byPost.get(candidate.postId) ?? [];
        list.push(candidate);
        byPost.set(candidate.postId, list);
      }
      posts = await Promise.all(
        activePosts.map(async (post) => ({
          id: post._id,
          name: post.name,
          candidates: await Promise.all(
            (byPost.get(post._id) ?? []).map(async (candidate) => ({
              id: candidate._id,
              name: candidate.name,
              photoUrl: await resolveCandidatePhoto(ctx, candidate),
              symbol: candidate.symbol,
              department: candidate.department,
              semester: candidate.semester,
              class: candidate.class,
            })),
          ),
        })),
      );
    }

    return {
      page: computePublicPage(settings),
      maintenanceMode: settings.maintenanceMode,
      activePublicPage: settings.activePublicPage,
      votingStatus: settings.votingStatus,
      resultsVisibility: settings.resultsVisibility,
      electionStatus: election?.status ?? null,
      branding: {
        collegeName: settings.collegeName,
        logoUrl,
        electionTitle: election?.name ?? "College Election",
        year: election?.year ?? String(new Date().getFullYear()),
      },
      results,
      posts,
    };
  },
});
