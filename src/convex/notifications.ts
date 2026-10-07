import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  computePublicPage,
  ensureElection,
  getActiveElection,
  getSettings,
  recordActivity,
  requireAdmin,
  resolveSettings,
  verifySession,
} from "./helpers";

type NotificationRow = {
  id: Id<"notifications">;
  title: string;
  content: string;
  published: boolean;
  scheduledFor?: number;
  updatedAt: number;
};

function toRow(notification: Doc<"notifications">): NotificationRow {
  return {
    id: notification._id,
    title: notification.title,
    content: notification.content,
    published: notification.published,
    scheduledFor: notification.scheduledFor,
    updatedAt: notification.updatedAt,
  };
}

function byDate(a: Doc<"notifications">, b: Doc<"notifications">): number {
  const aTime = a.scheduledFor ?? a._creationTime;
  const bTime = b.scheduledFor ?? b._creationTime;
  return bTime - aTime;
}

/** Admin: every notification, newest first. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return null;
    const notifications = await ctx.db.query("notifications").collect();
    notifications.sort(byDate);
    return { notifications: notifications.map(toRow) };
  },
});

/**
 * Public: published notifications for the notifications page. Returns null
 * unless `/` is currently showing the notifications page.
 */
export const publicList = query({
  args: {},
  handler: async (ctx) => {
    const settings = resolveSettings(await getSettings(ctx));
    if (computePublicPage(settings) !== "notifications") return null;

    const election = await getActiveElection(ctx);
    const all = await ctx.db.query("notifications").collect();
    const published = all.filter((notification) => notification.published);
    published.sort(byDate);
    return {
      election: election ? { name: election.name, year: election.year } : null,
      notifications: published.map(toRow),
    };
  },
});

/** Admin: create a notification. */
export const create = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    content: v.string(),
    published: v.boolean(),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const title = args.title.trim();
    const content = args.content.trim();
    if (!title) throw new Error("Notification title is required.");
    if (!content) throw new Error("Notification description is required.");
    if (title.length > 160) throw new Error("Title is too long.");

    const election = await ensureElection(ctx);
    await ctx.db.insert("notifications", {
      electionId: election._id,
      title,
      content,
      published: args.published,
      scheduledFor: args.scheduledFor,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      "notification.create",
      `Notification created: ${title}${args.published ? " (published)" : " (draft)"}`,
    );
    return { ok: true as const };
  },
});

/** Admin: edit a notification or publish/unpublish it. */
export const update = mutation({
  args: {
    token: v.string(),
    notificationId: v.id("notifications"),
    title: v.string(),
    content: v.string(),
    published: v.boolean(),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await ctx.db.get(args.notificationId);
    if (!existing) throw new Error("This notification no longer exists.");

    const title = args.title.trim();
    const content = args.content.trim();
    if (!title) throw new Error("Notification title is required.");
    if (!content) throw new Error("Notification description is required.");

    const notes: string[] = [];
    if (existing.published !== args.published) {
      notes.push(args.published ? "published" : "unpublished");
    }
    if (title !== existing.title) notes.push("renamed");

    await ctx.db.patch(existing._id, {
      title,
      content,
      published: args.published,
      scheduledFor: args.scheduledFor,
      updatedAt: Date.now(),
    });
    if (notes.length > 0) {
      await recordActivity(
        ctx,
        "notification.update",
        `Notification ${title}: ${notes.join(", ")}`,
      );
    }
    return { ok: true as const };
  },
});

/** Admin: delete a notification. */
export const remove = mutation({
  args: { token: v.string(), notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await ctx.db.get(args.notificationId);
    if (!existing) throw new Error("This notification no longer exists.");

    await ctx.db.delete(existing._id);
    await recordActivity(
      ctx,
      "notification.delete",
      `Notification deleted: ${existing.title}`,
    );
    return { ok: true as const };
  },
});
