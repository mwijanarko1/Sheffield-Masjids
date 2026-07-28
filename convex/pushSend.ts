"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  deliverToSubscribers,
  partitionDeliveryOutcomes,
  type IqamahChangePushPayload,
} from "./lib/pushTransport";
import { createProductionTransport } from "./pushProviders";

/**
 * Deliver iqamah-change alerts (Node action: JWT + fetch to APNs/FCM).
 */
export const sendIqamahChangeAlerts = internalAction({
  args: {
    mosqueSlug: v.string(),
    publishEventId: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(internal.pushDelivery.beginDelivery, {
      mosqueSlug: args.mosqueSlug,
      publishEventId: args.publishEventId,
    });
    if (claim.action === "skip") {
      return { skipped: true, reason: "already_completed" };
    }

    const mosqueName = await ctx.runQuery(internal.pushDelivery.loadMosqueName, {
      mosqueSlug: args.mosqueSlug,
    });
    const subscribers = await ctx.runQuery(internal.pushDelivery.loadEnabledSubscribers, {
      mosqueSlug: args.mosqueSlug,
    });

    const payload: IqamahChangePushPayload = {
      kind: "iqamah_times_changed",
      mosqueSlug: args.mosqueSlug,
      publishEventId: args.publishEventId,
      mosqueName,
    };

    const transport = createProductionTransport();
    const already = new Set(claim.deliveredFingerprints);
    const outcomes = await deliverToSubscribers(transport, subscribers, already, payload);
    const { succeeded, temporary, permanent } = partitionDeliveryOutcomes(outcomes);

    for (const p of permanent) {
      await ctx.runMutation(internal.pushSubscriptions.removeToken, { token: p.token });
    }

    const newFingerprints = succeeded.map((s) => s.fingerprint);
    const hasTemporary = temporary.length > 0;
    const maxAttempts = 5;
    const shouldRetry = hasTemporary && args.attempt < maxAttempts;

    await ctx.runMutation(internal.pushDelivery.recordDeliveryProgress, {
      mosqueSlug: args.mosqueSlug,
      publishEventId: args.publishEventId,
      newFingerprints,
      complete: !shouldRetry,
    });

    if (shouldRetry) {
      const delayMs = Math.min(60_000 * Math.pow(2, args.attempt), 15 * 60_000);
      await ctx.scheduler.runAfter(delayMs, internal.pushSend.sendIqamahChangeAlerts, {
        mosqueSlug: args.mosqueSlug,
        publishEventId: args.publishEventId,
        attempt: args.attempt + 1,
      });
    }

    return {
      skipped: false,
      sent: succeeded.length,
      temporary: temporary.length,
      permanentRemoved: permanent.length,
      retryScheduled: shouldRetry,
    };
  },
});
