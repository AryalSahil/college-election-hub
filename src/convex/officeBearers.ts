import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getSettings,
  recordActivity,
  requireAdmin,
  resolveSettings,
  verifySession,
} from "./helpers";

// ---------------------------------------------------------------------------
// Office Bearers / Current Winners / Election History
//
// A separate concept from live election results: winning an election never
// automatically lists someone as a current office bearer. The admin curates
// this list — `current: true` rows appear under "Current Office Bearers",
// everything else under "Election History" grouped by `electionYear`
// (free-form, unlimited years).
// ---------------------------------------------------------------------------

async function withPhoto<T extends { photoStorageId?: string }>(
  ctx: { storage: { getUrl(id: string): Promise<string | null> } },
  bearer: T,
) {
  return {
    photoUrl: bearer.photoStorageId
      ? await ctx.storage.getUrl(bearer.photoStorageId)
      : null,
  };
}

function sortBearers<
  T extends { electionYear: string; displayOrder?: number; createdAt: number },
>(all: T[]): T[] {
  return all.sort((a, b) => {
    const yearA = Number(a.electionYear);
    const yearB = Number(b.electionYear);
    if (Number.isFinite(yearA) && Number.isFinite(yearB) && yearA !== yearB) {
      return yearB - yearA;
    }
    const order =
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.createdAt - b.createdAt;
    if (order !== 0) return order;
    return b.electionYear.localeCompare(a.electionYear);
  });
}

const fieldValidator = {
  name: v.string(),
  position: v.string(),
  electionYear: v.string(),
  department: v.optional(v.string()),
  semester: v.optional(v.string()),
  className: v.optional(v.string()),
  photoStorageId: v.optional(v.id("_storage")),
  photoRemoved: v.optional(v.boolean()),
  termStart: v.optional(v.string()),
  termEnd: v.optional(v.string()),
  description: v.optional(v.string()),
  current: v.boolean(),
};

/** Public: everything the `/winners` page renders. */
export const publicWinners = query({
  args: {},
  handler: async (ctx) => {
    const settings = resolveSettings(await getSettings(ctx));
    const logoUrl = settings.logoStorageId
      ? await ctx.storage.getUrl(settings.logoStorageId)
      : null;

    const all = sortBearers([...(await ctx.db.query("officeBearers").collect())]);

    const decorate = async (bearer: (typeof all)[number]) => ({
      id: bearer._id,
      name: bearer.name,
      position: bearer.position,
      ...(await withPhoto(ctx, bearer)),
      department: bearer.department,
      semester: bearer.semester,
      className: bearer.className,
      electionYear: bearer.electionYear,
      termStart: bearer.termStart,
      termEnd: bearer.termEnd,
      description: bearer.description,
      current: bearer.current,
    });

    const current = [];
    for (const bearer of all) {
      if (bearer.current) current.push(await decorate(bearer));
    }

    const years: { year: string; bearers: Awaited<ReturnType<typeof decorate>>[] }[] =
      [];
    const byYear = new Map<string, typeof all>();
    for (const bearer of all) {
      const list = byYear.get(bearer.electionYear) ?? [];
      list.push(bearer);
      byYear.set(bearer.electionYear, list);
    }
    for (const [year, list] of byYear) {
      const bearers = [];
      for (const bearer of list) bearers.push(await decorate(bearer));
      years.push({ year, bearers });
    }

    return {
      enabled: settings.showWinnersPage ?? true,
      branding: { collegeName: settings.collegeName, logoUrl },
      current,
      years,
    };
  },
});

/** Admin: full list for the Office Bearers screen. */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const admin = await verifySession(ctx, token);
    if (!admin) return [];
    const all = sortBearers([...(await ctx.db.query("officeBearers").collect())]);
    return Promise.all(
      all.map(async (bearer) => ({
        id: bearer._id,
        name: bearer.name,
        position: bearer.position,
        electionYear: bearer.electionYear,
        department: bearer.department,
        semester: bearer.semester,
        className: bearer.className,
        photoUrl: bearer.photoStorageId
          ? await ctx.storage.getUrl(bearer.photoStorageId)
          : null,
        photoStorageId: bearer.photoStorageId ?? null,
        termStart: bearer.termStart,
        termEnd: bearer.termEnd,
        description: bearer.description,
        current: bearer.current,
        createdAt: bearer.createdAt,
        updatedAt: bearer.updatedAt,
      })),
    );
  },
});

function clean(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function validateYear(year: string) {
  if (!/^\d{4}$/.test(year)) {
    throw new Error("Election year must be a 4-digit year, e.g. 2026.");
  }
}

/** Admin: add an office bearer or past winner. */
export const add = mutation({
  args: { token: v.string(), ...fieldValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const name = args.name.trim();
    const position = args.position.trim();
    const year = args.electionYear.trim();
    if (!name) throw new Error("Full name is required.");
    if (name.length > 80) throw new Error("Name is too long.");
    if (!position) throw new Error("Position is required.");
    if (position.length > 80) throw new Error("Position is too long.");
    validateYear(year);

    const now = Date.now();
    const id = await ctx.db.insert("officeBearers", {
      name,
      position,
      electionYear: year,
      department: clean(args.department, 80),
      semester: clean(args.semester, 40),
      className: clean(args.className, 40),
      photoStorageId: args.photoStorageId,
      termStart: clean(args.termStart, 40),
      termEnd: clean(args.termEnd, 40),
      description: clean(args.description, 600),
      current: args.current,
      createdAt: now,
      updatedAt: now,
    });
    await recordActivity(
      ctx,
      args.current ? "office_bearer.add" : "winner.add",
      `${args.current ? "Added office bearer" : "Added past winner"}: ${name} — ${position} (${year})`,
    );
    return { ok: true as const, id };
  },
});

/** Admin: edit an office bearer (all fields, including photo replace/remove). */
export const update = mutation({
  args: { token: v.string(), id: v.id("officeBearers"), ...fieldValidator },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Office bearer not found.");

    const name = args.name.trim();
    const position = args.position.trim();
    const year = args.electionYear.trim();
    if (!name) throw new Error("Full name is required.");
    if (name.length > 80) throw new Error("Name is too long.");
    if (!position) throw new Error("Position is required.");
    if (position.length > 80) throw new Error("Position is too long.");
    validateYear(year);

    let photoStorageId = existing.photoStorageId;
    if (args.photoStorageId && args.photoStorageId !== existing.photoStorageId) {
      // Replace: drop the old file so unused files do not accumulate.
      if (existing.photoStorageId) {
        await ctx.storage.delete(existing.photoStorageId);
      }
      photoStorageId = args.photoStorageId;
    } else if (args.photoRemoved) {
      if (existing.photoStorageId) {
        await ctx.storage.delete(existing.photoStorageId);
      }
      photoStorageId = undefined;
    }

    await ctx.db.patch(args.id, {
      name,
      position,
      electionYear: year,
      department: clean(args.department, 80),
      semester: clean(args.semester, 40),
      className: clean(args.className, 40),
      photoStorageId,
      termStart: clean(args.termStart, 40),
      termEnd: clean(args.termEnd, 40),
      description: clean(args.description, 600),
      current: args.current,
      updatedAt: Date.now(),
    });
    await recordActivity(
      ctx,
      "office_bearer.update",
      `Updated ${existing.current ? "office bearer" : "past winner"}: ${name} — ${position} (${year})`,
    );
    return { ok: true as const };
  },
});

/** Admin: toggle whether someone is currently serving. */
export const setServing = mutation({
  args: { token: v.string(), id: v.id("officeBearers"), current: v.boolean() },
  handler: async (ctx, { token, id, current }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Office bearer not found.");
    if (existing.current === current) return { ok: true as const };
    await ctx.db.patch(id, { current, updatedAt: Date.now() });
    await recordActivity(
      ctx,
      current ? "office_bearer.add" : "office_bearer.remove",
      current
        ? `Marked as currently serving: ${existing.name} — ${existing.position}`
        : `Removed from current office: ${existing.name} — ${existing.position} (kept in history)`,
    );
    return { ok: true as const };
  },
});

/** Admin: delete an office bearer / past winner entirely. */
export const remove = mutation({
  args: { token: v.string(), id: v.id("officeBearers") },
  handler: async (ctx, { token, id }) => {
    await requireAdmin(ctx, token);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Office bearer not found.");
    if (existing.photoStorageId) {
      await ctx.storage.delete(existing.photoStorageId);
    }
    await ctx.db.delete(id);
    await recordActivity(
      ctx,
      existing.current ? "office_bearer.remove" : "winner.delete",
      `${existing.current ? "Removed current office bearer" : "Deleted past winner"}: ${existing.name} — ${existing.position} (${existing.electionYear})`,
    );
    return { ok: true as const };
  },
});
