import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireReadSecret } from "./lib/readAccess";
import { evaluateBucket } from "./lib/rateLimitBuckets";

const KEY_RE = /^api:[a-z0-9-]{1,32}:[A-Za-z0-9_-]{8,128}$/;
const MAX_LIMIT = 10_000;
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
const PRUNE_BATCH = 20;

/**
 * Shared per-client rate limit for the public Next.js API routes
 * (/api/prayer-times, /api/mcp, /api/timetable). Only the Next.js server calls
 * this; it authenticates with CONVEX_READ_SECRET. Keys are an HMAC of the
 * client IP computed on the web server, so raw IPs are never stored.
 *
 * Writes only to `rateLimitBuckets`, under the `api:` key prefix, and prunes a
 * few expired `api:` buckets per call so the table does not grow without bound.
 */
export const consume = mutation({
  args: {
    readSecret: v.string(),
    key: v.string(),
    limit: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    requireReadSecret(args.readSecret);
    if (!KEY_RE.test(args.key)) throw new Error("Invalid rate limit key");
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > MAX_LIMIT) {
      throw new Error("Invalid rate limit");
    }
    if (!Number.isInteger(args.windowMs) || args.windowMs < 1_000 || args.windowMs > MAX_WINDOW_MS) {
      throw new Error("Invalid rate limit window");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const decision = evaluateBucket(existing, now, args.limit, args.windowMs);
    if (decision.next) {
      if (existing) {
        await ctx.db.patch(existing._id, decision.next);
      } else {
        await ctx.db.insert("rateLimitBuckets", { key: args.key, ...decision.next });
      }
    }

    const stale = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_window_start", (q) => q.lt("windowStart", now - MAX_WINDOW_MS))
      .take(PRUNE_BATCH);
    for (const row of stale) {
      if (row.key.startsWith("api:") && row.key !== args.key) await ctx.db.delete(row._id);
    }

    return { allowed: decision.allowed, remaining: decision.remaining, resetAt: decision.resetAt };
  },
});
