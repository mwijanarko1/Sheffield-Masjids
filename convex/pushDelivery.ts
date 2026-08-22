import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { tokenFingerprint } from "./lib/iqamahChangeDetect";

/**
 * Claim or reopen an in-progress publish event for delivery.
 * Returns "skip" when already completed (prevents duplicate alerts).
 */
export const beginDelivery = internalMutation({
  args: {
    mosqueSlug: v.string(),
    publishEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("iqamahChangeAlertsSent")
      .withIndex("by_mosque_event", (q) =>
        q.eq("mosqueSlug", args.mosqueSlug).eq("publishEventId", args.publishEventId),
      )
      .unique();

    if (existing?.status === "completed") {
      return {
        action: "skip" as const,
        deliveredFingerprints: existing.deliveredFingerprints,
      };
    }

    if (existing) {
      return {
        action: "proceed" as const,
        deliveredFingerprints: existing.deliveredFingerprints,
        recordId: existing._id,
      };
    }

    const now = Date.now();
    const recordId = await ctx.db.insert("iqamahChangeAlertsSent", {
      mosqueSlug: args.mosqueSlug,
      publishEventId: args.publishEventId,
      status: "in_progress",
      deliveredFingerprints: [],
      createdAt: now,
      updatedAt: now,
    });
    return {
      action: "proceed" as const,
      deliveredFingerprints: Array<string>(),
      recordId,
    };
  },
});

export const recordDeliveryProgress = internalMutation({
  args: {
    mosqueSlug: v.string(),
    publishEventId: v.string(),
    newFingerprints: v.array(v.string()),
    complete: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("iqamahChangeAlertsSent")
      .withIndex("by_mosque_event", (q) =>
        q.eq("mosqueSlug", args.mosqueSlug).eq("publishEventId", args.publishEventId),
      )
      .unique();
    if (!existing) return { ok: false };

    const merged = Array.from(
      new Set([...existing.deliveredFingerprints, ...args.newFingerprints]),
    );
    const now = Date.now();
    await ctx.db.patch(existing._id, {
      deliveredFingerprints: merged,
      updatedAt: now,
      ...(args.complete
        ? { status: "completed" as const, completedAt: now }
        : { status: "in_progress" as const }),
    });
    return { ok: true, count: merged.length };
  },
});

export const loadMosqueName = internalQuery({
  args: { mosqueSlug: v.string() },
  handler: async (ctx, args) => {
    const mosque = await ctx.db
      .query("mosques")
      .withIndex("by_slug", (q) => q.eq("slug", args.mosqueSlug))
      .unique();
    return mosque?.name ?? args.mosqueSlug;
  },
});

export const loadEnabledSubscribers = internalQuery({
  args: { mosqueSlug: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_mosque_enabled", (q) =>
        q.eq("mosqueSlug", args.mosqueSlug).eq("iqamahChangeAlertsEnabled", true),
      )
      .collect();
    return rows.map((r) => ({
      token: r.token,
      platform: r.platform,
      fingerprint: tokenFingerprint(r.token),
    }));
  },
});

/**
 * Schedule entry-point used by seed mutations after a meaningful iqamah change.
 */
export const scheduleIqamahChangeAlert = internalMutation({
  args: {
    mosqueSlug: v.string(),
    publishEventId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.pushSend.sendIqamahChangeAlerts, {
      mosqueSlug: args.mosqueSlug,
      publishEventId: args.publishEventId,
      attempt: 0,
    });
    return { scheduled: true };
  },
});
