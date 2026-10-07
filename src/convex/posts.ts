import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./helpers";
import {
  ensureElection,
  recordActivity,
  requireAdmin,
  verifySession,
} from "./helpers";

export type PostDoc = Doc<"posts">;

async function sortedPosts(ctx: QueryCtx | MutationCtx, electionId: Id<"elections">) {
  const posts = await ctx.db
    .query("posts")
    .withIndex("by_election", (q) => q.eq("electionId", electionId))
    .collect();
  return posts.sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Admin: every post (active and inactive) with its candidate count. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;

    const election = await ctx.db.query("elections").order("desc").first();
    if (!election) return { posts: [] as (PostDoc & { candidateCount: number })[] };

    const posts = await sortedPosts(ctx, election._id);
    const candidates = await ctx.db.query("candidates").collect();
    const counts = new Map<string, number>();
    for (const candidate of candidates) {
      counts.set(candidate.postId, (counts.get(candidate.postId) ?? 0) + 1);
    }
    return {
      posts: posts.map((post) => ({
        ...post,
        candidateCount: counts.get(post._id) ?? 0,
      })),
    };
  },
});

/** Admin: add a post. It goes to the end of the display order. */
export const create = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const name = args.name.trim();
    if (!name) throw new Error("Post name is required.");
    if (name.length > 120) throw new Error("Post name is too long.");

    const election = await ensureElection(ctx);
    const posts = await sortedPosts(ctx, election._id);
    const nextOrder =
      posts.length === 0
        ? 1
        : Math.max(...posts.map((post) => post.displayOrder)) + 1;

    await ctx.db.insert("posts", {
      electionId: election._id,
      name,
      description: args.description?.trim() || undefined,
      displayOrder: nextOrder,
      active: true,
    });
    await recordActivity(ctx, "post.create", `Post added: ${name}`);
    return { ok: true as const };
  },
});

/** Admin: edit a post's details, toggle it, etc. */
export const update = mutation({
  args: {
    token: v.string(),
    postId: v.id("posts"),
    name: v.string(),
    description: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("This post no longer exists.");

    const name = args.name.trim();
    if (!name) throw new Error("Post name is required.");
    if (name.length > 120) throw new Error("Post name is too long.");

    const changes: string[] = [];
    if (post.name !== name) changes.push(`renamed to ${name}`);
    if (post.active !== args.active) {
      changes.push(args.active ? "enabled" : "disabled");
    }

    await ctx.db.patch(post._id, {
      name,
      description: args.description?.trim() || undefined,
      active: args.active,
    });
    if (changes.length > 0) {
      await recordActivity(ctx, "post.update", `Post ${name}: ${changes.join(", ")}`);
    }
    return { ok: true as const };
  },
});

/** Admin: delete a post. Blocked once any vote exists for it. */
export const remove = mutation({
  args: { token: v.string(), postId: v.id("posts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("This post no longer exists.");

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .take(1);
    if (votes.length > 0) {
      throw new Error(
        "Votes have already been cast for this post, so it cannot be deleted. Disable it instead.",
      );
    }

    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_post", (q) => q.eq("postId", post._id))
      .collect();
    for (const candidate of candidates) {
      await ctx.db.delete(candidate._id);
    }
    await ctx.db.delete(post._id);
    await recordActivity(
      ctx,
      "post.delete",
      `Post deleted: ${post.name} (${candidates.length} candidate(s) removed)`,
    );
    return { ok: true as const };
  },
});

/** Admin: move a post up or down in the display order. */
export const move = mutation({
  args: {
    token: v.string(),
    postId: v.id("posts"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("This post no longer exists.");

    const posts = await sortedPosts(ctx, post.electionId);
    const index = posts.findIndex((p) => p._id === post._id);
    const swapWith =
      args.direction === "up" ? posts[index - 1] : posts[index + 1];
    if (!swapWith) return { ok: true as const };

    await ctx.db.patch(post._id, { displayOrder: swapWith.displayOrder });
    await ctx.db.patch(swapWith._id, { displayOrder: post.displayOrder });
    await recordActivity(
      ctx,
      "post.reorder",
      `Post moved ${args.direction}: ${post.name}`,
    );
    return { ok: true as const };
  },
});
