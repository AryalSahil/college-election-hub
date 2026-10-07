import { v } from "convex/values";
import { query } from "./_generated/server";
import { verifySession } from "./helpers";

/** Admin: recent activity log, newest first. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;
    const logs = await ctx.db
      .query("activityLogs")
      .order("desc")
      .take(150);
    return {
      logs: logs.map((log) => ({
        id: log._id,
        action: log.action,
        detail: log.detail,
        createdAt: log.createdAt,
      })),
    };
  },
});
