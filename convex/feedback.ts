import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admin";
import {
  consumeAttempt as consumeAttemptRule,
  readIntakeConfig,
  submitReport as submitReportRule,
  type IntakeRepo,
  type StoredFeedbackReport,
} from "./lib/feedbackIntake";

const MAX_LIST = 100;

const reportValidator = v.object({
  schemaVersion: v.literal(1),
  category: v.union(
    v.literal("request_error"),
    v.literal("documentation"),
    v.literal("unexpected_response"),
    v.literal("missing_data"),
  ),
  summary: v.string(),
  request: v.object({
    method: v.union(v.literal("GET"), v.literal("HEAD")),
    path: v.string(),
    query: v.array(v.object({ key: v.string(), value: v.string() })),
  }),
  response: v.optional(
    v.object({
      status: v.number(),
      contentType: v.optional(v.string()),
      bodyExcerpt: v.optional(v.string()),
    }),
  ),
  expected: v.string(),
  actual: v.string(),
  reproduction: v.array(v.string()),
  agent: v.optional(v.object({ name: v.string(), version: v.optional(v.string()) })),
});

/**
 * The public intake path is only reachable by the Next.js server. A dedicated
 * secret keeps the broader ADMIN_SECRET out of the web runtime. Fails closed.
 */
function requireIntakeSecret(provided: string): void {
  const configured = (process.env.FEEDBACK_INTAKE_SECRET ?? "").trim();
  if (!configured) {
    throw new Error("Feedback intake secret is not configured on this Convex deployment");
  }
  const candidate = provided.trim();
  let diff = candidate.length ^ configured.length;
  for (let i = 0; i < configured.length; i += 1) {
    diff |= (candidate.charCodeAt(i) || 0) ^ configured.charCodeAt(i);
  }
  if (diff !== 0) throw new Error("Invalid feedback intake secret");
}

function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function convexRepo(ctx: MutationCtx): IntakeRepo {
  return {
    async recentAttempts(scope, since, limit) {
      const rows = await ctx.db
        .query("feedbackAttempts")
        .withIndex("by_scope_at", (q) => q.eq("scope", scope).gt("at", since))
        .order("desc")
        .take(limit);
      return rows.map((row) => row.at);
    },
    async insertAttempts(scopes, at) {
      for (const scope of scopes) await ctx.db.insert("feedbackAttempts", { scope, at });
    },
    async deleteAttemptsBefore(cutoff, max) {
      const rows = await ctx.db
        .query("feedbackAttempts")
        .withIndex("by_at", (q) => q.lt("at", cutoff))
        .take(max);
      for (const row of rows) await ctx.db.delete(row._id);
    },
    async countReports(cap) {
      const rows = await ctx.db.query("feedbackReports").take(cap);
      return rows.length;
    },
    async findReportByFingerprint(fingerprint, now) {
      const row = await ctx.db
        .query("feedbackReports")
        .withIndex("by_fingerprint", (q) => q.eq("fingerprint", fingerprint))
        .first();
      return row && row.expiresAt > now ? row._id : null;
    },
    async insertReport(report: StoredFeedbackReport) {
      return await ctx.db.insert("feedbackReports", report);
    },
    async deleteExpiredReports(now, max) {
      const rows = await ctx.db
        .query("feedbackReports")
        .withIndex("by_expires", (q) => q.lt("expiresAt", now))
        .take(max);
      for (const row of rows) await ctx.db.delete(row._id);
    },
    async incrementCounter(key, now) {
      const counterKey = `${dayKey(now)}:${key}`;
      const existing = await ctx.db
        .query("feedbackCounters")
        .withIndex("by_key", (q) => q.eq("key", counterKey))
        .unique();
      if (existing) await ctx.db.patch(existing._id, { count: existing.count + 1 });
      else await ctx.db.insert("feedbackCounters", { key: counterKey, count: 1 });
    },
  };
}

/** Charge one intake attempt before the request body is read. */
export const consumeAttempt = mutation({
  args: { intakeSecret: v.string(), clientKey: v.string() },
  handler: async (ctx, args) => {
    requireIntakeSecret(args.intakeSecret);
    return await consumeAttemptRule(
      convexRepo(ctx),
      { clientKey: args.clientKey },
      Date.now(),
      readIntakeConfig(process.env),
    );
  },
});

export const submit = mutation({
  args: {
    intakeSecret: v.string(),
    clientKey: v.string(),
    fingerprint: v.string(),
    report: reportValidator,
  },
  handler: async (ctx, args) => {
    requireIntakeSecret(args.intakeSecret);
    return await submitReportRule(
      convexRepo(ctx),
      { report: args.report, fingerprint: args.fingerprint, clientKey: args.clientKey },
      Date.now(),
      readIntakeConfig(process.env),
    );
  },
});

/** Count a request rejected after it passed the limiter (bad type, size, schema). */
export const recordRejection = mutation({
  args: { intakeSecret: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    requireIntakeSecret(args.intakeSecret);
    const reason = args.reason.replace(/[^a-z_]/g, "").slice(0, 32) || "unknown";
    await convexRepo(ctx).incrementCounter(`rejected_${reason}`, Date.now());
  },
});

/** Maintainer review. Reports are never readable through the public API. */
export const listReports = query({
  args: { adminSecret: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 25), 1), MAX_LIST);
    return await ctx.db.query("feedbackReports").withIndex("by_created").order("desc").take(limit);
  },
});

export const counters = query({
  args: { adminSecret: v.string(), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);
    const days = Math.min(Math.max(Math.floor(args.days ?? 7), 1), 30);
    const since = dayKey(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    const rows = await ctx.db.query("feedbackCounters").take(1000);
    return rows
      .filter((row) => row.key.slice(0, 10) >= since)
      .map(({ key, count }) => ({ key, count }));
  },
});

export const deleteReport = mutation({
  args: { adminSecret: v.string(), reportId: v.id("feedbackReports") },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);
    await ctx.db.delete(args.reportId);
    return { ok: true as const };
  },
});

export const pruneExpired = mutation({
  args: { adminSecret: v.string() },
  handler: async (ctx, args) => {
    requireAdmin(args.adminSecret);
    const repo = convexRepo(ctx);
    const now = Date.now();
    await repo.deleteExpiredReports(now, 200);
    await repo.deleteAttemptsBefore(now - 24 * 60 * 60 * 1000, 200);
    return { ok: true as const };
  },
});
