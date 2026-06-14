import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./admin";

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

/**
 * Seed monthly prayer times. Idempotent: replaces existing if same mosque/month/year.
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
  },
  handler: async (ctx, args) => {
    const { adminSecret, ...data } = args;
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

    const doc = {
      mosqueSlug: data.mosqueSlug,
      month: data.month,
      year: data.year,
      monthDisplay: data.monthDisplay,
      prayerTimes: data.prayerTimes,
      iqamahTimes: data.iqamahTimes,
      jummahIqamah: data.jummahIqamah,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return { updated: existing._id };
    } else {
      return { inserted: await ctx.db.insert("monthlyPrayerTimes", doc) };
    }
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
  },
  handler: async (ctx, args) => {
    const { adminSecret, ...data } = args;
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

    const doc = {
      mosqueSlug: data.mosqueSlug,
      month: data.month,
      gregorianStart: data.gregorianStart,
      gregorianEnd: data.gregorianEnd,
      prayerTimes: data.prayerTimes,
      iqamahTimes: data.iqamahTimes,
      jummahIqamah: data.jummahIqamah,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return { updated: existing._id };
    } else {
      return { inserted: await ctx.db.insert("ramadanTimetables", doc) };
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

    // Input-size guard: ~50 years of DST dates is more than enough
    if (data.ukDstDates.length > 50) {
      throw new Error("ukDstDates exceeds maximum of 50 entries");
    }

    const existing = await ctx.db
      .query("ukDstCalendar")
      .withIndex("by_key", (q) => q.eq("key", "singleton"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { ukDstDates: data.ukDstDates });
      return { updated: existing._id };
    }

    return {
      inserted: await ctx.db.insert("ukDstCalendar", {
        key: "singleton",
        ukDstDates: data.ukDstDates,
      }),
    };
  },
});
