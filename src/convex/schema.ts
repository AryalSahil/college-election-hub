import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

/** Which single page the public `/` route renders. One value at a time. */
export const publicPageValidator = v.union(
  v.literal("voting"),
  v.literal("results"),
  v.literal("notifications"),
  v.literal("none"),
);
export type PublicPage = Infer<typeof publicPageValidator>;

/** Voting lifecycle controlled from the admin Voting screen. */
export const votingStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("open"),
  v.literal("paused"),
  v.literal("closed"),
);
export type VotingStatus = Infer<typeof votingStatusValidator>;

/** Election lifecycle shown on the admin dashboard. */
export const electionStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed"),
);
export type ElectionStatus = Infer<typeof electionStatusValidator>;

/**
 * Sentinel choice id for "NOTA — None of the Above".
 * NOTA is never stored as a candidate row; it is appended to every post
 * automatically so administrators cannot create duplicate NOTA candidates.
 */
export const NOTA = "NOTA" as const;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ------------------------------------------------------------------
    // College election application tables
    // ------------------------------------------------------------------

    // One row controls the whole public experience (single source of truth,
    // so contradictory combinations like "voting + results" are impossible).
    settings: defineTable({
      key: v.string(), // always "global"
      activePublicPage: publicPageValidator,
      maintenanceMode: v.boolean(),
      resultsVisibility: v.boolean(),
      votingStatus: votingStatusValidator,
      updatedAt: v.number(),
      // College branding (admin-configurable).
      collegeName: v.optional(v.string()),
      logoStorageId: v.optional(v.id("_storage")),
      // Optional one-time voter-code system (off by default).
      voterCodesEnabled: v.optional(v.boolean()),
      // Voting status applied by "Start Fresh Election".
      resetVotingStatus: v.optional(votingStatusValidator),
      // Whether the public /winners page is exposed (nav + direct access).
      showWinnersPage: v.optional(v.boolean()),
      // Optional custom favicon (admin-configurable from Branding).
      faviconStorageId: v.optional(v.id("_storage")),
    }).index("by_key", ["key"]),

    // The single election for this deployment.
    elections: defineTable({
      name: v.string(),
      year: v.string(),
      status: electionStatusValidator,
      description: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),

    // Election posts (offices), ordered by displayOrder.
    posts: defineTable({
      electionId: v.id("elections"),
      name: v.string(),
      description: v.optional(v.string()),
      displayOrder: v.number(),
      active: v.boolean(),
    }).index("by_election", ["electionId"]),

    // Candidates. NOTA is NOT a row in this table — it is virtual.
    candidates: defineTable({
      postId: v.id("posts"),
      name: v.string(),
      photoUrl: v.optional(v.string()),
      photoStorageId: v.optional(v.id("_storage")),
      department: v.optional(v.string()),
      semester: v.optional(v.string()),
      class: v.optional(v.string()),
      symbol: v.optional(v.string()),
      description: v.optional(v.string()),
      active: v.boolean(),
    }).index("by_post", ["postId"]),

    // One row per selection on a submitted ballot. All rows for a ballot are
    // written in a single mutation, so a partial ballot can never exist.
    // voterToken is reserved for the future one-time voter-code system.
    votes: defineTable({
      electionId: v.id("elections"),
      postId: v.id("posts"),
      candidateId: v.union(v.id("candidates"), v.literal(NOTA)),
      ballotId: v.string(),
      voterToken: v.optional(v.string()),
    })
      .index("by_election", ["electionId"])
      .index("by_post", ["postId"]),

    // Admin-managed announcements shown on the public Notifications page.
    notifications: defineTable({
      electionId: v.id("elections"),
      title: v.string(),
      content: v.string(),
      published: v.boolean(),
      scheduledFor: v.optional(v.number()),
      updatedAt: v.number(),
    }).index("by_election", ["electionId"]),

    // The single administrator account (password is stored only as a salted
    // hash and is never returned by any query).
    admins: defineTable({
      key: v.string(), // always "admin"
      passwordHash: v.string(),
      salt: v.string(),
      authVersion: v.number(),
      failedAttempts: v.number(),
      lockedUntil: v.optional(v.number()),
      updatedAt: v.number(),
    }).index("by_key", ["key"]),

    // Server-issued session tokens (only the SHA-256 hash is stored).
    adminSessions: defineTable({
      tokenHash: v.string(),
      authVersion: v.number(),
      expiresAt: v.number(),
      createdAt: v.number(),
    }).index("by_token", ["tokenHash"]),

    // Audit trail of important admin operations.
    activityLogs: defineTable({
      action: v.string(),
      detail: v.string(),
      createdAt: v.number(),
    }),

    // Optional one-time voter codes (enabled from Admin → Voting).
    voterCodes: defineTable({
      electionId: v.id("elections"),
      code: v.string(),
      used: v.boolean(),
      usedAt: v.optional(v.number()),
      ballotId: v.optional(v.string()),
    })
      .index("by_code", ["code"])
      .index("by_election", ["electionId"]),

    // ------------------------------------------------------------------
    // Office bearers / election history
    // ------------------------------------------------------------------

    //
    // Winners are decoupled from live election results: an election result
    // never automatically promotes a candidate to "current office bearer".
    // The admin curates this table — `current: true` rows appear under
    // "Current Office Bearers" on /winners, everything else under
    // "Election History" grouped by `electionYear` (free-form, unlimited).
    //
    // `position` is stored as a name (not a post id) so history can survive
    // posts being renamed or deleted in later elections.
    //
    officeBearers: defineTable({
      name: v.string(),
      position: v.string(),
      electionYear: v.string(),
      department: v.optional(v.string()),
      semester: v.optional(v.string()),
      className: v.optional(v.string()),
      photoStorageId: v.optional(v.id("_storage")),
      termStart: v.optional(v.string()),
      termEnd: v.optional(v.string()),
      description: v.optional(v.string()),
      current: v.boolean(),
      displayOrder: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_current", ["current"])
      .index("by_year", ["electionYear"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
