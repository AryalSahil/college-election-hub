import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  ADMIN_KEY,
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  MIN_PASSWORD_LENGTH,
  createSession,
  getAdmin,
  hashPassword,
  randomHex,
  recordActivity,
  requireAdmin,
  sha256Hex,
  verifyPassword,
  verifySession,
} from "./helpers";

/** Public: has the one-time admin password been created yet? */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const admin = await getAdmin(ctx);
    return { passwordSet: admin !== null };
  },
});

/** Public: is this session token valid? Used by the admin route guard. */
export const session = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return (await verifySession(ctx, token)) !== null;
  },
});

/**
 * First-run: create the single admin password. Only allowed while no
 * administrator exists. Returns a session token on success.
 */
export const setup = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const existing = await getAdmin(ctx);
    if (existing) {
      return {
        ok: false as const,
        error: "Admin access has already been configured. Please sign in.",
      };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        ok: false as const,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }

    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const id = await ctx.db.insert("admins", {
      key: ADMIN_KEY,
      passwordHash,
      salt,
      authVersion: 1,
      failedAttempts: 0,
      updatedAt: Date.now(),
    });
    const admin = (await ctx.db.get(id))!;
    const token = await createSession(ctx, admin);
    await recordActivity(ctx, "admin.setup", "Administrator password created");
    return { ok: true as const, token };
  },
});

/**
 * Sign in with the single admin password. Failures are returned (not thrown)
 * so the failed-attempt counter persists in the same transaction.
 */
export const login = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const admin = await getAdmin(ctx);
    if (!admin) {
      return {
        ok: false as const,
        error: "Admin access is not set up yet. Create the password first.",
      };
    }

    const now = Date.now();
    if ((admin.lockedUntil ?? 0) > now) {
      const minutes = Math.ceil(((admin.lockedUntil as number) - now) / 60000);
      return {
        ok: false as const,
        error: `Too many failed attempts. Try again in about ${minutes} minute${
          minutes === 1 ? "" : "s"
        }.`,
      };
    }

    const valid = await verifyPassword(password, admin.salt, admin.passwordHash);
    if (!valid) {
      const failed = admin.failedAttempts + 1;
      if (failed >= MAX_FAILED_LOGINS) {
        await ctx.db.patch(admin._id, {
          failedAttempts: 0,
          lockedUntil: now + LOCKOUT_MS,
        });
        return {
          ok: false as const,
          error: "Too many failed attempts. Sign-in is locked for 15 minutes.",
        };
      }
      await ctx.db.patch(admin._id, { failedAttempts: failed });
      return { ok: false as const, error: "Incorrect password." };
    }

    await ctx.db.patch(admin._id, { failedAttempts: 0, lockedUntil: undefined });
    const fresh = (await ctx.db.get(admin._id))!;
    const token = await createSession(ctx, fresh);
    await recordActivity(ctx, "admin.login", "Administrator signed in");
    return { ok: true as const, token };
  },
});

/** End the current session. */
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return { ok: true as const };
    const admin = await verifySession(ctx, token);
    const tokenHash = await sha256Hex(token);
    const target = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (target) await ctx.db.delete(target._id);
    if (admin) {
      await recordActivity(ctx, "admin.logout", "Administrator signed out");
    }
    return { ok: true as const };
  },
});

/**
 * Change the admin password. Invalidates every existing session and returns
 * a fresh token so the current browser stays signed in.
 */
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { token, currentPassword, newPassword }) => {
    const admin = await requireAdmin(ctx, token);

    const valid = await verifyPassword(
      currentPassword,
      admin.salt,
      admin.passwordHash,
    );
    if (!valid) {
      return { ok: false as const, error: "Your current password is incorrect." };
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return {
        ok: false as const,
        error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }

    const salt = randomHex(16);
    const passwordHash = await hashPassword(newPassword, salt);
    await ctx.db.patch(admin._id, {
      salt,
      passwordHash,
      authVersion: admin.authVersion + 1,
      failedAttempts: 0,
      lockedUntil: undefined,
      updatedAt: Date.now(),
    });
    const fresh = (await ctx.db.get(admin._id))!;
    const newToken = await createSession(ctx, fresh);
    await recordActivity(ctx, "admin.password_change", "Admin password changed");
    return { ok: true as const, token: newToken };
  },
});
