import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get monthly prayer times for a mosque.
 * Returns data in the same shape as the static JSON for compatibility with lib/prayer-times.
 */
export const getMonthly = query({
  args: {
    mosqueSlug: v.string(),
    month: v.string(),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const year = args.year ?? new Date().getFullYear();
    const doc = await ctx.db
      .query("monthlyPrayerTimes")
      .withIndex("by_mosque_month_year", (q) =>
        q
          .eq("mosqueSlug", args.mosqueSlug)
          .eq("month", args.month)
          .eq("year", year)
      )
      .unique();

    if (!doc) return null;

    return {
      month: doc.monthDisplay,
      prayer_times: doc.prayerTimes,
      iqamah_times: doc.iqamahTimes,
      jummah_iqamah: doc.jummahIqamah,
    };
  },
});

/**
 * Get Ramadan timetable for a mosque.
 * Returns the most recent Ramadan (by gregorian start) that covers the given date, or latest if no date.
 * Returns data in the same shape as the static JSON for compatibility with lib/prayer-times.
 */
export const getRamadan = query({
  args: {
    mosqueSlug: v.string(),
    date: v.optional(v.string()), // ISO date string YYYY-MM-DD to find Ramadan covering this date
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("ramadanTimetables")
      .withIndex("by_mosque", (q) => q.eq("mosqueSlug", args.mosqueSlug))
      .collect();

    if (docs.length === 0) return null;

    if (args.date) {
      const target = new Date(args.date);
      const covering = docs.find((d) => {
        const start = new Date(d.gregorianStart);
        const end = new Date(d.gregorianEnd);
        return target >= start && target <= end;
      });
      if (covering) {
        return {
          month: covering.month,
          gregorian_start: covering.gregorianStart,
          gregorian_end: covering.gregorianEnd,
          prayer_times: covering.prayerTimes,
          iqamah_times: covering.iqamahTimes,
          jummah_iqamah: covering.jummahIqamah,
        };
      }
    }

    // No date or not in range: return most recent (latest gregorian start)
    const latest = docs.sort(
      (a, b) =>
        new Date(b.gregorianStart).getTime() -
        new Date(a.gregorianStart).getTime()
    )[0];

    return {
      month: latest.month,
      gregorian_start: latest.gregorianStart,
      gregorian_end: latest.gregorianEnd,
      prayer_times: latest.prayerTimes,
      iqamah_times: latest.iqamahTimes,
      jummah_iqamah: latest.jummahIqamah,
    };
  },
});
