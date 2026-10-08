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
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { PublicPage } from "./schema";

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
// Image upload validation (logo + candidate photos)
// ---------------------------------------------------------------------------

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export type ImageKind = "logo" | "candidate" | "favicon" | "winner";

/** Favicon-specific rules (smaller than general images). */
export const FAVICON_MAX_BYTES = 512 * 1024; // 512 KB
export const FAVICON_ACCEPTED_TYPES = "image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,image/svg+xml";

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** Identify the real file type from magic bytes — never trust the client. */
export function sniffImageType(
  bytes: Uint8Array,
): "png" | "jpeg" | "webp" | "svg" | "ico" | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  // ICO: ICONDIR header — 00 00 01 00 (reserved, type=icon, count>=1).
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return "ico";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8) // "WEBP"
  ) {
    return "webp";
  }
  const head = new TextDecoder()
    .decode(bytes.subarray(0, Math.min(bytes.length, 512)))
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (head.startsWith("<") && /<svg[\s>]/i.test(head)) return "svg";
  return null;
}

export const IMAGE_MIN_DIMENSION = 32;
export const IMAGE_MAX_DIMENSION = 8000;

function be16(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

function be32(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  );
}

function le16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function le24(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}

function le32(data: Uint8Array, offset: number): number {
  return (
    (data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)) >>>
    0
  );
}

/**
 * Read the true pixel dimensions straight from the image headers (PNG IHDR,
 * JPEG SOF, WebP VP8/VP8L/VP8X). No decoding needed, and it works in both
 * the browser and the Convex runtime. Returns null when unparseable.
 */
export function readImageDimensions(
  data: Uint8Array,
  type: "png" | "jpeg" | "webp" | "ico",
): { width: number; height: number } | null {
  if (type === "ico") {
    // ICONDIR (6 bytes) + ICONDIRENTRY: width/height at offset 6/7 (0 = 256).
    if (data.length < 6) return null;
    const width = data[6] || 256;
    const height = data[7] || 256;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (type === "png") {
    if (data.length < 24) return null;
    // IHDR must be the first chunk: bytes 12..16 hold the chunk type.
    if (data[12] !== 0x49 || data[13] !== 0x48 || data[14] !== 0x44 || data[15] !== 0x52) {
      return null;
    }
    const width = be32(data, 16);
    const height = be32(data, 20);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (type === "jpeg") {
    let offset = 2; // skip SOI
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = data[offset + 1];
      // Standalone markers without a length field.
      if (
        marker === 0x01 ||
        marker === 0xd8 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        offset += 2;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) return null; // EOI / SOS
      const length = be16(data, offset + 2);
      if (length < 2) return null;
      const isSof =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isSof) {
        const height = be16(data, offset + 5);
        const width = be16(data, offset + 7);
        return width > 0 && height > 0 ? { width, height } : null;
      }
      offset += 2 + length;
    }
    return null;
  }

  // WebP: "RIFF....WEBP" then a chunk at offset 12.
  if (data.length < 30) return null;
  const fourcc = String.fromCharCode(
    data[12],
    data[13],
    data[14],
    data[15],
  );
  if (fourcc === "VP8 ") {
    // Lossy: 3-byte frame tag, sync code 9D 01 2A, then 14-bit dims.
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) {
      return null;
    }
    const width = le16(data, 26) & 0x3fff;
    const height = le16(data, 28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (fourcc === "VP8L") {
    if (data[20] !== 0x2f) return null;
    const bits = le32(data, 21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >>> 14) & 0x3fff) + 1;
    return { width, height };
  }
  if (fourcc === "VP8X") {
    const width = le24(data, 24) + 1;
    const height = le24(data, 27) + 1;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}

/**
 * Validate an uploaded image server-side: size, real type (magic bytes),
 * pixel dimensions, and for SVG a conservative script/active-content scan.
 * SVGs are only ever rendered through <img>, which does not execute scripts,
 * but we still reject active content before storing.
 */
export function validateImageUpload(
  bytes: ArrayBuffer,
  kind: ImageKind,
): { contentType: string } {
  const data = new Uint8Array(bytes);
  if (data.byteLength === 0) {
    throw new Error("The uploaded file is empty.");
  }
  const kindLabels: Record<ImageKind, string> = {
    logo: "Logo",
    candidate: "Candidate photo",
    favicon: "Favicon",
    winner: "Winner photo",
  };
  const maxBytes = kind === "favicon" ? FAVICON_MAX_BYTES : IMAGE_MAX_BYTES;
  if (data.byteLength > maxBytes) {
    throw new Error(
      `${kindLabels[kind]} is too large. Maximum size is ${
        maxBytes >= 1024 * 1024
          ? `${maxBytes / (1024 * 1024)} MB`
          : `${maxBytes / 1024} KB`
      }.`,
    );
  }

  const type = sniffImageType(data);
  if (!type) {
    throw new Error("Unsupported file type. Use PNG, JPG, WebP, or SVG.");
  }
  if (type === "ico" && kind !== "favicon") {
    throw new Error("ICO files are only supported for favicons.");
  }
  const label = kindLabels[kind];
  if (type !== "svg") {
    const dimensions = readImageDimensions(data, type);
    if (!dimensions) {
      throw new Error(
        "Could not read the image dimensions. Re-export the image and try again.",
      );
    }
    const { width, height } = dimensions;
    const minDimension = kind === "favicon" ? 16 : IMAGE_MIN_DIMENSION;
    if (width < minDimension || height < minDimension) {
      throw new Error(
        `${label} must be at least ${minDimension}×${minDimension} pixels.`,
      );
    }
    if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
      throw new Error(
        `${label} must be no larger than ${IMAGE_MAX_DIMENSION}×${IMAGE_MAX_DIMENSION} pixels.`,
      );
    }
  }
  if (type === "svg") {
    const text = new TextDecoder().decode(data);
    const dangerous = [
      /<script/i,
      /<foreignObject/i,
      /<iframe/i,
      /<embed/i,
      /<use[^>]+href\s*=\s*["']?\s*(https?:|\/\/|data:)/i,
      /\son[a-z]+\s*=/i,
      /javascript\s*:/i,
      /href\s*=\s*["']\s*data:/i,
    ];
    for (const pattern of dangerous) {
      if (pattern.test(text)) {
        throw new Error("This SVG contains active content and was rejected.");
      }
    }
    if (data.byteLength > 512 * 1024) {
      throw new Error("SVG files must be smaller than 512 KB.");
    }
    return { contentType: "image/svg+xml" };
  }
  return { contentType: type === "ico" ? "image/x-icon" : `image/${type}` };
}

/** Build the Blob stored in Convex file storage (the Supabase Storage equivalent). */
export function imageBlob(bytes: ArrayBuffer, contentType: string): Blob {
  return new Blob([bytes], { type: contentType });
}

/** Resolve a candidate's photo: uploaded file first, then legacy external URL. */
export async function resolveCandidatePhoto(
  ctx: ReadCtx,
  candidate: Doc<"candidates">,
): Promise<string | undefined> {
  if (candidate.photoStorageId) {
    return (await ctx.storage.getUrl(candidate.photoStorageId)) ?? undefined;
  }
  return candidate.photoUrl ?? undefined;
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
  collegeName: string;
  logoStorageId?: Id<"_storage">;
  voterCodesEnabled: boolean;
  resetVotingStatus: "not_started" | "open" | "paused" | "closed";
  showWinnersPage: boolean;
  faviconStorageId?: Id<"_storage">;
};

export const DEFAULT_SETTINGS: ResolvedSettings = {
  activePublicPage: "none",
  maintenanceMode: false,
  resultsVisibility: false,
  votingStatus: "not_started",
  collegeName: "Pragjyotish College",
  voterCodesEnabled: false,
  resetVotingStatus: "not_started",
  showWinnersPage: true,
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
    collegeName: doc.collegeName || DEFAULT_SETTINGS.collegeName,
    logoStorageId: doc.logoStorageId,
    voterCodesEnabled: doc.voterCodesEnabled ?? false,
    resetVotingStatus: doc.resetVotingStatus ?? "not_started",
    showWinnersPage: doc.showWinnersPage ?? true,
    faviconStorageId: doc.faviconStorageId,
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
