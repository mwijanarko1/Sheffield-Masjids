import { mutation } from "./_generated/server";
import { v } from "convex/values";

const prayerTimeValidator = v.object({
  date: v.number(),
  fajr: v.string(),
  shurooq: v.string(),
  dhuhr: v.string(),
  asr: v.string(),
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("monthlyPrayerTimes")
      .withIndex("by_mosque_month_year", (q) =>
        q
          .eq("mosqueSlug", args.mosqueSlug)
          .eq("month", args.month)
          .eq("year", args.year)
      )
      .unique();

    const doc = {
      mosqueSlug: args.mosqueSlug,
      month: args.month,
      year: args.year,
      monthDisplay: args.monthDisplay,
      prayerTimes: args.prayerTimes,
      iqamahTimes: args.iqamahTimes,
      jummahIqamah: args.jummahIqamah,
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ramadanTimetables")
      .withIndex("by_mosque_and_start", (q) =>
        q.eq("mosqueSlug", args.mosqueSlug).eq("gregorianStart", args.gregorianStart)
      )
      .unique();

    const doc = {
      mosqueSlug: args.mosqueSlug,
      month: args.month,
      gregorianStart: args.gregorianStart,
      gregorianEnd: args.gregorianEnd,
      prayerTimes: args.prayerTimes,
      iqamahTimes: args.iqamahTimes,
      jummahIqamah: args.jummahIqamah,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
      return { updated: existing._id };
    } else {
      return { inserted: await ctx.db.insert("ramadanTimetables", doc) };
    }
  },
});
