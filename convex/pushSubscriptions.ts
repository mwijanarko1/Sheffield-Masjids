import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admin";

const MOSQUE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STALE_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_TOKEN_LEN = 4096;
const MIN_TOKEN_LEN = 32;
// Unauthenticated public registration: bound spam without pretending to stop determined abuse.
const REGISTER_WINDOW_MS = 60_000;
const REGISTER_MAX_PER_WINDOW = 60;
const MAX_SUBSCRIPTIONS = 50_000;

type PreferencePatch = {
  lastSeenAt: number;
  updatedAt: number;
  mosqueSlug?: string;
  iqamahChangeAlertsEnabled?: boolean;
};

function validateMosqueSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 64 || !MOSQUE_SLUG_RE.test(normalized)) {
    throw new Error("Invalid mosqueSlug");
  }
  return normalized;
}

function validateToken(token: string): string {
  const t = token.trim();
  if (t.length < MIN_TOKEN_LEN || t.length > MAX_TOKEN_LEN) {
    throw new Error("Invalid token length");
  }
  // APNs hex or FCM URL-safe base64-ish
  if (!/^[A-Za-z0-9_\-:%.]+$/.test(t)) {
    throw new Error("Invalid token format");
  }
  return t;
}

function validatePlatform(platform: string): "ios" | "android" {
  if (platform !== "ios" && platform !== "android") {
    throw new Error("Invalid platform");
  }
  return platform;
}

async function assertMosqueExists(ctx: { db: any }, mosqueSlug: string): Promise<void> {
  const mosque = await ctx.db
    .query("mosques")
    .withIndex("by_slug", (q: any) => q.eq("slug", mosqueSlug))
    .unique();
  if (!mosque) {
    throw new Error("Unknown mosqueSlug");
  }
}

async function consumeRateLimit(
  ctx: { db: any },
  key: string,
  max: number,
  windowMs: number,
): Promise<void> {
  const now = Date.now();
  const existing = await ctx.db
    .query("rateLimitBuckets")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();

  if (!existing || now - existing.windowStart >= windowMs) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
    } else {
      await ctx.db.insert("rateLimitBuckets", { key, windowStart: now, count: 1 });
    }
    return;
  }

  if (existing.count >= max) {
    throw new Error("Rate limit exceeded");
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

/**
 * Register or refresh a device push token for iqamah-change alerts.
 * Upserts by token. Public (unauthenticated) — rate-limited + validated.
 */
export const register = mutation({
  args: {
    token: v.string(),
    platform: v.string(),
    mosqueSlug: v.string(),
    iqamahChangeAlertsEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, "push.register.global", REGISTER_MAX_PER_WINDOW, REGISTER_WINDOW_MS);

    const token = validateToken(args.token);
    const platform = validatePlatform(args.platform);
    const mosqueSlug = validateMosqueSlug(args.mosqueSlug);
    await assertMosqueExists(ctx, mosqueSlug);

    const now = Date.now();
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        platform,
        mosqueSlug,
        iqamahChangeAlertsEnabled: args.iqamahChangeAlertsEnabled,
        lastSeenAt: now,
        updatedAt: now,
      });
      return { ok: true as const, updated: true as const };
    }

    // Soft cap storage growth from unauthenticated inserts.
    // Approximate: scan is expensive; use a cheap sample via lastSeen index size check
    // by refusing new inserts when a sentinel is set is not available — count via limited collect.
    const sample = await ctx.db.query("pushSubscriptions").take(MAX_SUBSCRIPTIONS);
    if (sample.length >= MAX_SUBSCRIPTIONS) {
      throw new Error("Subscription capacity reached");
    }

    await ctx.db.insert("pushSubscriptions", {
      token,
      platform,
      mosqueSlug,
      iqamahChangeAlertsEnabled: args.iqamahChangeAlertsEnabled,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const, updated: false as const };
  },
});

/**
 * Update mosque / enabled flag for an existing token without re-sending full registration payload.
 */
export const updatePreferences = mutation({
  args: {
    token: v.string(),
    mosqueSlug: v.optional(v.string()),
    iqamahChangeAlertsEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, "push.update.global", REGISTER_MAX_PER_WINDOW, REGISTER_WINDOW_MS);

    const token = validateToken(args.token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!existing) {
      throw new Error("Unknown token");
    }

    const patch: PreferencePatch = {
      lastSeenAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (args.mosqueSlug !== undefined) {
      const mosqueSlug = validateMosqueSlug(args.mosqueSlug);
      await assertMosqueExists(ctx, mosqueSlug);
      patch.mosqueSlug = mosqueSlug;
    }
    if (args.iqamahChangeAlertsEnabled !== undefined) {
      patch.iqamahChangeAlertsEnabled = args.iqamahChangeAlertsEnabled;
    }
    await ctx.db.patch(existing._id, patch);
    return { ok: true as const };
  },
});

/** Disable delivery and remove the subscription for a token. */
export const unregister = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await consumeRateLimit(ctx, "push.unregister.global", REGISTER_MAX_PER_WINDOW, REGISTER_WINDOW_MS);
    const token = validateToken(args.token);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!existing) return { deleted: false as const };
    await ctx.db.delete(existing._id);
    return { deleted: true as const };
  },
});

/** Admin or internal: delete a token permanently rejected by APNs/FCM. */
export const removeToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!existing) return { deleted: false };
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});

export const removeTokenAdmin = mutation({
  args: {
    token: v.string(),
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!existing) return { deleted: false };
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});

/** Prune tokens not refreshed for 180 days. */
export const pruneStale = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 200, 500);
    const cutoff = Date.now() - STALE_MS;
    const stale = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_last_seen")
      .order("asc")
      .take(limit);

    let deleted = 0;
    for (const row of stale) {
      if (row.lastSeenAt >= cutoff) break;
      await ctx.db.delete(row._id);
      deleted++;
    }
    return { deleted };
  },
});

export const pruneStaleAdmin = mutation({
  args: {
    adminSecret: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);
    const limit = Math.min(args.limit ?? 200, 500);
    const cutoff = Date.now() - STALE_MS;
    const stale = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_last_seen")
      .order("asc")
      .take(limit);

    let deleted = 0;
    for (const row of stale) {
      if (row.lastSeenAt >= cutoff) break;
      await ctx.db.delete(row._id);
      deleted++;
    }
    return { deleted };
  },
});

export const listEnabledForMosque = internalMutation({
  args: { mosqueSlug: v.string() },
  handler: async (ctx, args) => {
    const mosqueSlug = validateMosqueSlug(args.mosqueSlug);
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_mosque_enabled", (q) =>
        q.eq("mosqueSlug", mosqueSlug).eq("iqamahChangeAlertsEnabled", true),
      )
      .collect();
    return rows.map((r) => ({
      _id: r._id,
      token: r.token,
      platform: r.platform,
      mosqueSlug: r.mosqueSlug,
    }));
  },
});

/** Debug/admin count — does not expose tokens. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const sample = await ctx.db.query("pushSubscriptions").take(1000);
    return {
      sampleSize: sample.length,
      enabledInSample: sample.filter((s) => s.iqamahChangeAlertsEnabled).length,
    };
  },
});
