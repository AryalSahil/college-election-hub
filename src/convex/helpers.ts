/**
 * Shared server-side helpers for the election backend.
 *
 * Security model (version 1, single administrator):
 * - The admin password is stored only as a salted, stretched SHA-256 hash.
 *   No query ever returns the hash or the salt.
 * - Login issues a random session token; only its SHA-256 hash is persisted.
 * - Every admin mutation calls `requireAdmin` and validates server-side.
 * - Failed logins are rate-limited with a temporary lockout.
 */
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Doc } from "./_generated/dataModel";
import { NOTA, type PublicPage } from "./schema";

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
/** Contexts that may read (queries and mutations). */
export type ReadCtx = QueryCtx | MutationCtx;

export const SETTINGS_KEY = "global";
export const ADMIN_KEY = "admin";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const MAX_FAILED_LOGINS = 10;
export const LOCKOUT_MS = 1000 * 60 * 15; // 15 minutes
export const MIN_PASSWORD_LENGTH = 8;
export const NOTA_LABEL = "NOTA — None of the Above";

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

export function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return toHex(new Uint8Array(digest));
}

/**
 * Salted, lightly stretched hash. The salt prevents rainbow tables and the
 * stretch raises the cost of a brute-force attempt, while staying fast on
 * Convex's runtime.
 */
export async function hashPassword(
  password: string,
  saltHex: string,
): Promise<string> {
  let acc = `${saltHex}:${password}`;
  for (let round = 0; round < 10; round++) {
    acc = `${saltHex}:${await sha256Hex(acc)}`;
  }
  return acc;
}

/** Constant-time comparison of two hex digests. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  expectedHash: string,
): Promise<boolean> {
  const candidate = await hashPassword(password, saltHex);
  return safeEqual(candidate, expectedHash);
}

export function isNotaName(name: string): boolean {
  return /^nota\b/iu.test(name.trim());
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export type SettingsDoc = Doc<"settings">;
export type ResolvedSettings = {
  activePublicPage: PublicPage;
  maintenanceMode: boolean;
  resultsVisibility: boolean;
  votingStatus: "not_started" | "open" | "paused" | "closed";
};

export const DEFAULT_SETTINGS: ResolvedSettings = {
  activePublicPage: "none",
  maintenanceMode: false,
  resultsVisibility: false,
  votingStatus: "not_started",
};

export async function getSettings(
  ctx: ReadCtx,
): Promise<SettingsDoc | null> {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
    .unique();
}

export function resolveSettings(doc: SettingsDoc | null): ResolvedSettings {
  if (!doc) return DEFAULT_SETTINGS;
  return {
    activePublicPage: doc.activePublicPage,
    maintenanceMode: doc.maintenanceMode,
    resultsVisibility: doc.resultsVisibility,
    votingStatus: doc.votingStatus,
  };
}

/**
 * Page priority from the spec:
 *   1. Maintenance overrides everything.
 *   2-4. Exactly one of voting / results / notifications can be active
 *        (activePublicPage is a single value, so conflicting combinations
 *        are impossible by construction).
 *   5. "none" renders the No Page Available screen.
 */
export function computePublicPage(
  settings: ResolvedSettings,
): PublicPage | "maintenance" {
  if (settings.maintenanceMode) return "maintenance";
  return settings.activePublicPage;
}

export async function getOrCreateSettings(
  ctx: MutationCtx,
): Promise<SettingsDoc> {
  const existing = await getSettings(ctx);
  if (existing) return existing;
  const id = await ctx.db.insert("settings", {
    key: SETTINGS_KEY,
    ...DEFAULT_SETTINGS,
    updatedAt: Date.now(),
  });
  return (await ctx.db.get(id))!;
}

// ---------------------------------------------------------------------------
// Election
// ---------------------------------------------------------------------------

export async function getActiveElection(
  ctx: ReadCtx,
): Promise<Doc<"elections"> | null> {
  return await ctx.db.query("elections").order("desc").first();
}

export async function ensureElection(ctx: MutationCtx): Promise<Doc<"elections">> {
  const existing = await getActiveElection(ctx);
  if (existing) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("elections", {
    name: "Pragjyotish College Election",
    year: String(new Date().getFullYear()),
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });
  return (await ctx.db.get(id))!;
}

// ---------------------------------------------------------------------------
// Admin authentication
// ---------------------------------------------------------------------------

export async function getAdmin(ctx: ReadCtx): Promise<Doc<"admins"> | null> {
  return await ctx.db
    .query("admins")
    .withIndex("by_key", (q) => q.eq("key", ADMIN_KEY))
    .unique();
}

/**
 * Validate a session token. Returns the admin for a live session, or null.
 * Queries must treat null as "not authorized" (return no data); mutations
 * must throw.
 */
export async function verifySession(
  ctx: ReadCtx,
  token: string,
): Promise<Doc<"admins"> | null> {
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session) return null;
  if (session.expiresAt <= Date.now()) return null;
  // There is exactly one administrator account.
  const admin = await getAdmin(ctx);
  if (!admin) return null;
  if (admin.authVersion !== session.authVersion) return null;
  if ((admin.lockedUntil ?? 0) > Date.now()) return null;
  return admin;
}

/** Throwing guard used by every admin mutation. */
export async function requireAdmin(
  ctx: MutationCtx,
  token: string,
): Promise<Doc<"admins">> {
  const admin = await verifySession(ctx, token);
  if (!admin) {
    throw new Error("Your admin session is invalid or has expired. Please sign in again.");
  }
  return admin;
}

/** Create a fresh session and return the plaintext token (shown once). */
export async function createSession(
  ctx: MutationCtx,
  admin: Doc<"admins">,
): Promise<string> {
  const token = randomHex(32);
  await ctx.db.insert("adminSessions", {
    tokenHash: await sha256Hex(token),
    authVersion: admin.authVersion,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: Date.now(),
  });
  return token;
}

// ---------------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------------

export async function recordActivity(
  ctx: MutationCtx,
  action: string,
  detail: string,
): Promise<void> {
  await ctx.db.insert("activityLogs", {
    action,
    detail,
    createdAt: Date.now(),
  });
}
