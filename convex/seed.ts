import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin } from "./admin";
import {
  buildRamadanDayMap,
  hasMeaningfulMonthlyIqamahChange,
  hasMeaningfulRamadanIqamahChange,
  monthNameToNumber,
  newPublishEventId,
} from "./lib/iqamahChangeDetect";

const prayerTimeValidator = v.object({
  date: v.number(),
  fajr: v.string(),
  shurooq: v.string(),
  dhuhr: v.string(),
  asr: v.string(),
  asr_mithl2: v.optional(v.string()),
  maghrib: v.string(),
  isha: v.string(),
});

const iqamahTimeRangeValidator = v.object({
  date_range: v.string(),
  fajr: v.string(),
  dhuhr: v.string(),
  asr: v.string(),
  maghrib: v.optional(v.string()),
  isha: v.string(),
  jummah: v.optional(v.string()),
});

const ramadanPrayerTimeValidator = v.object({
  ramadan_day: v.number(),
  gregorian: v.string(),
  fajr: v.string(),
  shurooq: v.string(),
  dhuhr: v.string(),
  asr: v.string(),
  maghrib: v.string(),
  isha: v.string(),
});

async function bumpDataRevision(ctx: any) {
  const now = Date.now();
  const existing = await ctx.db
    .query("dataRevisions")
    .withIndex("by_key", (q: any) => q.eq("key", "global"))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      dataRevision: existing.dataRevision + 1,
      updatedAt: now,
    });
    return;
  }

  await ctx.db.insert("dataRevisions", {
    key: "global",
    dataRevision: 1,
    updatedAt: now,
  });
}

async function scheduleIfNeeded(
  ctx: any,
  mosqueSlug: string,
  publishEventId: string | undefined,
  shouldNotify: boolean,
) {
  if (!shouldNotify) return { iqamahChangeAlertScheduled: false as const };
  const eventId = publishEventId?.trim() || newPublishEventId();
  await ctx.scheduler.runAfter(0, internal.pushSend.sendIqamahChangeAlerts, {
    mosqueSlug,
    publishEventId: eventId,
    attempt: 0,
  });
  return { iqamahChangeAlertScheduled: true as const, publishEventId: eventId };
}

/**
 * Seed monthly prayer times. Idempotent: replaces existing if same mosque/month/year.
 * Detects future iqamah changes and schedules at most one push per publishEventId.
 */
export const seedMonthly = mutation({
  args: {
    mosqueSlug: v.string(),
    month: v.string(),
    year: v.number(),
    monthDisplay: v.string(),
    prayerTimes: v.array(prayerTimeValidator),
    iqamahTimes: v.array(iqamahTimeRangeValidator),
    jummahIqamah: v.string(),
    adminSecret: v.optional(v.string()),
    /** Shared across multi-file seed of one mosque so monthly+ramadan produce one alert. */
    publishEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminSecret, publishEventId, ...data } = args;
    requireAdmin(adminSecret);

    // Input-size guard
    if (data.prayerTimes.length > 31) {
      throw new Error("prayerTimes exceeds maximum of 31 entries");
    }
    if (data.iqamahTimes.length > 31) {
      throw new Error("iqamahTimes exceeds maximum of 31 entries");
    }

    const existing = await ctx.db
      .query("monthlyPrayerTimes")
      .withIndex("by_mosque_month_year", (q) =>
        q
          .eq("mosqueSlug", data.mosqueSlug)
          .eq("month", data.month)
          .eq("year", data.year)
      )
      .unique();

    const monthNumber = monthNameToNumber(data.month) ?? 0;
    const nextSnap = {
      year: data.year,
      monthNumber,
      iqamahTimes: data.iqamahTimes,
      jummahIqamah: data.jummahIqamah,
    };
    const prevSnap =
      existing && monthNumber > 0
        ? {
            year: existing.year,
            monthNumber,
            iqamahTimes: existing.iqamahTimes,
            jummahIqamah: existing.jummahIqamah,
          }
        : null;
    const shouldNotify =
      monthNumber > 0 && hasMeaningfulMonthlyIqamahChange(prevSnap, nextSnap);

    const doc = {
      mosqueSlug: data.mosqueSlug,
      month: data.month,
      year: data.year,
      monthDisplay: data.monthDisplay,
      prayerTimes: data.prayerTimes,
      iqamahTimes: data.iqamahTimes,
      jummahIqamah: data.jummahIqamah,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
      await bumpDataRevision(ctx);
      const alert = await scheduleIfNeeded(ctx, data.mosqueSlug, publishEventId, shouldNotify);
      return { updated: existing._id, ...alert };
    } else {
      const inserted = await ctx.db.insert("monthlyPrayerTimes", doc);
      await bumpDataRevision(ctx);
      // First insert: no alert (avoids bulk seed spam).
      return { inserted, iqamahChangeAlertScheduled: false as const };
    }
  },
});

export const removeMonthly = mutation({
  args: {
    mosqueSlug: v.string(),
    month: v.string(),
    year: v.number(),
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminSecret, ...key } = args;
    requireAdmin(adminSecret);

    const existing = await ctx.db
      .query("monthlyPrayerTimes")
      .withIndex("by_mosque_month_year", (q) =>
        q
          .eq("mosqueSlug", key.mosqueSlug)
          .eq("month", key.month)
          .eq("year", key.year)
      )
      .unique();

    if (!existing) return { deleted: false, reason: "not_found" };

    await ctx.db.delete(existing._id);
    await bumpDataRevision(ctx);
    return { deleted: true };
  },
});

/**
 * Seed Ramadan timetable. Idempotent: replaces existing if same mosque and gregorian range.
 */
export const seedRamadan = mutation({
  args: {
    mosqueSlug: v.string(),
    month: v.string(),
    gregorianStart: v.string(),
    gregorianEnd: v.string(),
    prayerTimes: v.array(ramadanPrayerTimeValidator),
    iqamahTimes: v.array(iqamahTimeRangeValidator),
    jummahIqamah: v.string(),
    adminSecret: v.optional(v.string()),
    publishEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminSecret, publishEventId, ...data } = args;
    requireAdmin(adminSecret);

    // Input-size guards
    if (data.prayerTimes.length > 30) {
      throw new Error("prayerTimes exceeds maximum of 30 entries for Ramadan");
    }
    if (data.iqamahTimes.length > 30) {
      throw new Error("iqamahTimes exceeds maximum of 30 entries for Ramadan");
    }

    const existing = await ctx.db
      .query("ramadanTimetables")
      .withIndex("by_mosque_and_start", (q) =>
        q.eq("mosqueSlug", data.mosqueSlug).eq("gregorianStart", data.gregorianStart)
      )
      .unique();

    const nextSnap = {
      gregorianStart: data.gregorianStart,
      gregorianEnd: data.gregorianEnd,
      ramadanDayToGregorian: buildRamadanDayMap(data.prayerTimes),
      iqamahTimes: data.iqamahTimes,
      jummahIqamah: data.jummahIqamah,
    };
    const prevSnap = existing
      ? {
          gregorianStart: existing.gregorianStart,
          gregorianEnd: existing.gregorianEnd,
          ramadanDayToGregorian: buildRamadanDayMap(existing.prayerTimes),
          iqamahTimes: existing.iqamahTimes,
          jummahIqamah: existing.jummahIqamah,
        }
      : null;
    const shouldNotify = hasMeaningfulRamadanIqamahChange(prevSnap, nextSnap);

    const doc = {
      mosqueSlug: data.mosqueSlug,
      month: data.month,
      gregorianStart: data.gregorianStart,
      gregorianEnd: data.gregorianEnd,
      prayerTimes: data.prayerTimes,
      iqamahTimes: data.iqamahTimes,
      jummahIqamah: data.jummahIqamah,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
      await bumpDataRevision(ctx);
      const alert = await scheduleIfNeeded(ctx, data.mosqueSlug, publishEventId, shouldNotify);
      return { updated: existing._id, ...alert };
    } else {
      const inserted = await ctx.db.insert("ramadanTimetables", doc);
      await bumpDataRevision(ctx);
      return { inserted, iqamahChangeAlertScheduled: false as const };
    }
  },
});

const ukDstYearValidator = v.object({
  year: v.number(),
  start_date: v.string(),
  end_date: v.string(),
});

/**
 * Upsert UK DST calendar (from public/docs/dst-start-end.json). Idempotent.
 */
export const seedUkDstCalendar = mutation({
  args: {
    ukDstDates: v.array(ukDstYearValidator),
    adminSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { adminSecret, ...data } = args;
    requireAdmin(adminSecret);

    // Input-size guard: enough for the bundled 2025–2100 DST file.
    if (data.ukDstDates.length > 100) {
      throw new Error("ukDstDates exceeds maximum of 100 entries");
    }

    const existing = await ctx.db
      .query("ukDstCalendar")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ukDstDates: data.ukDstDates, updatedAt: Date.now() });
      await bumpDataRevision(ctx);
      return { updated: existing._id };
    }

    const inserted = await ctx.db.insert("ukDstCalendar", {
      key: "singleton",
      ukDstDates: data.ukDstDates,
      updatedAt: Date.now(),
    });
    await bumpDataRevision(ctx);
    return { inserted };
  },
});
