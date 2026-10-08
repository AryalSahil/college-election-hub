import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { imageBlob, validateImageUpload } from "./helpers";

/**
 * Admin-only upload action (Convex exposes file storage from actions).
 *
 * Validates session, size, real file type (magic bytes), and SVG safety
 * before storing. The client receives only the storage id; the follow-up
 * save mutation (branding/candidate) references it.
 */
export const upload = action({
  args: {
    token: v.string(),
    kind: v.union(
      v.literal("logo"),
      v.literal("candidate"),
      v.literal("favicon"),
      v.literal("winner"),
    ),
    bytes: v.bytes(),
  },
  handler: async (ctx, args) => {
    const authorized = await ctx.runQuery(api.adminAuth.session, {
      token: args.token,
    });
    if (!authorized) {
      throw new Error(
        "Your admin session is invalid or has expired. Please sign in again.",
      );
    }
    const { contentType } = validateImageUpload(args.bytes, args.kind);
    const storageId = await ctx.storage.store(
      imageBlob(args.bytes, contentType),
    );
    return { storageId };
  },
});
