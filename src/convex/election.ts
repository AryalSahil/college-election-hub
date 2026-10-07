import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { electionStatusValidator } from "./schema";
import { ensureElection, recordActivity, requireAdmin } from "./helpers";

/** Admin: create-or-update the single election's profile. */
export const update = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    year: v.string(),
    status: electionStatusValidator,
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const name = args.name.trim();
    const year = args.year.trim();
    if (!name) throw new Error("Election name is required.");
    if (!year) throw new Error("Election year is required.");
    if (name.length > 120) throw new Error("Election name is too long.");
    if (year.length > 20) throw new Error("Election year is too long.");

    const election = await ensureElection(ctx);
    await ctx.db.patch(election._id, {
      name,
      year,
      status: args.status,
      description: args.description?.trim() || undefined,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      "election.update",
      `Election updated: ${name} ${year} (${args.status})`,
    );
    return { ok: true as const };
  },
});
