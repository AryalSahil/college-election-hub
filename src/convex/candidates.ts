import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  isNotaName,
  recordActivity,
  requireAdmin,
  resolveCandidatePhoto,
  verifySession,
} from "./helpers";

type CandidateInput = {
  name: string;
  photoUrl?: string;
  department?: string;
  semester?: string;
  class?: string;
  symbol?: string;
  description?: string;
};

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Validate candidate fields before any write. NOTA is virtual and appended
 * automatically, so a candidate must never use the NOTA name.
 */
function validateCandidate(input: CandidateInput): void {
  const name = input.name.trim();
  if (!name) throw new Error("Candidate name is required.");
  if (name.length > 120) throw new Error("Candidate name is too long.");
  if (isNotaName(name)) {
    throw new Error(
      "NOTA is added automatically to every post and cannot be created as a candidate.",
    );
  }
}

/** Admin: all candidates across all posts, for the management screen. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;

    const candidates = await ctx.db.query("candidates").collect();
    const posts = await ctx.db.query("posts").collect();
    const postNames = new Map(posts.map((post) => [post._id, post.name]));

    const rows = await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        photoUrl: await resolveCandidatePhoto(ctx, candidate),
        postName: postNames.get(candidate.postId) ?? "Unknown post",
      })),
    );
    rows.sort(
      (a, b) =>
        a.postName.localeCompare(b.postName) || a.name.localeCompare(b.name),
    );
    return { candidates: rows, postCount: posts.length };
  },
});

/** Admin: add a candidate to a post. */
export const create = mutation({
  args: {
    token: v.string(),
    postId: v.id("posts"),
    name: v.string(),
    photoUrl: v.optional(v.string()),
    department: v.optional(v.string()),
    semester: v.optional(v.string()),
    class: v.optional(v.string()),
    symbol: v.optional(v.string()),
    description: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    validateCandidate(args);

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("This post no longer exists.");

    // The file was validated and stored by the images.upload action.
    const photoStorageId = args.photoStorageId;
    const photoUrl = photoStorageId ? undefined : clean(args.photoUrl);

    await ctx.db.insert("candidates", {
      postId: args.postId,
      name: args.name.trim(),
      photoUrl,
      photoStorageId,
      department: clean(args.department),
      semester: clean(args.semester),
      class: clean(args.class),
      symbol: clean(args.symbol),
      description: clean(args.description),
      active: true,
    });
    await recordActivity(
      ctx,
      "candidate.create",
      `Candidate added to ${post.name}: ${args.name.trim()}`,
    );
    return { ok: true as const };
  },
});

/** Admin: edit a candidate or move them to a different post. */
export const update = mutation({
  args: {
    token: v.string(),
    candidateId: v.id("candidates"),
    postId: v.id("posts"),
    name: v.string(),
    photoUrl: v.optional(v.string()),
    department: v.optional(v.string()),
    semester: v.optional(v.string()),
    class: v.optional(v.string()),
    symbol: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.boolean(),
    photoStorageId: v.optional(v.id("_storage")),
    photoRemoved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    validateCandidate(args);

    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("This candidate no longer exists.");
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("The selected post no longer exists.");

    const notes: string[] = [];
    if (candidate.postId !== args.postId) {
      notes.push(`moved to ${post.name}`);
    }
    if (candidate.active !== args.active) {
      notes.push(args.active ? "activated" : "deactivated");
    }

    let photoStorageId = candidate.photoStorageId;
    let photoUrl =
      args.photoUrl !== undefined ? clean(args.photoUrl) : candidate.photoUrl;
    if (
      args.photoStorageId &&
      args.photoStorageId !== candidate.photoStorageId
    ) {
      if (candidate.photoStorageId) {
        await ctx.storage.delete(candidate.photoStorageId);
      }
      photoStorageId = args.photoStorageId;
      photoUrl = undefined;
      notes.push("photo replaced");
    } else if (args.photoRemoved) {
      if (candidate.photoStorageId) {
        await ctx.storage.delete(candidate.photoStorageId);
      }
      photoStorageId = undefined;
      photoUrl = undefined;
      notes.push("photo removed");
    }

    await ctx.db.patch(candidate._id, {
      postId: args.postId,
      name: args.name.trim(),
      photoUrl,
      photoStorageId,
      department: clean(args.department),
      semester: clean(args.semester),
      class: clean(args.class),
      symbol: clean(args.symbol),
      description: clean(args.description),
      active: args.active,
    });
    if (notes.length > 0) {
      await recordActivity(
        ctx,
        "candidate.update",
        `Candidate ${args.name.trim()}: ${notes.join(", ")}`,
      );
    }
    return { ok: true as const };
  },
});

/** Admin: delete a candidate. Blocked once they have received any vote. */
export const remove = mutation({
  args: { token: v.string(), candidateId: v.id("candidates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("This candidate no longer exists.");

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_post", (q) => q.eq("postId", candidate.postId))
      .collect();
    const hasVotes = votes.some((vote) => vote.candidateId === candidate._id);
    if (hasVotes) {
      throw new Error(
        "This candidate has already received votes, so they cannot be deleted. Deactivate them instead.",
      );
    }

    await ctx.db.delete(candidate._id);
    await recordActivity(
      ctx,
      "candidate.delete",
      `Candidate deleted: ${candidate.name}`,
    );
    return { ok: true as const };
  },
});
