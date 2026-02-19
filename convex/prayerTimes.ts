import { query } from "./_generated/server";
import { v } from "convex/values";

const MOSQUE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_MONTHS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

function validateMosqueSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 64 || !MOSQUE_SLUG_RE.test(normalized)) {
    throw new Error("Invalid mosqueSlug");
  }
  return normalized;
}

function validateMonth(month: string): string {
  const normalized = month.trim().toLowerCase();
  if (!VALID_MONTHS.has(normalized)) {
    throw new Error("Invalid month");
  }
  return normalized;
}

function validateYear(year: number): number {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Invalid year");
  }
  return year;
}

function parseOptionalDate(date?: string): Date | null {
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format");
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parsed;
}

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
    const mosqueSlug = validateMosqueSlug(args.mosqueSlug);
    const month = validateMonth(args.month);
    const year = validateYear(args.year ?? new Date().getFullYear());

    const doc = await ctx.db
      .query("monthlyPrayerTimes")
      .withIndex("by_mosque_month_year", (q) =>
        q
          .eq("mosqueSlug", mosqueSlug)
          .eq("month", month)
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
    const mosqueSlug = validateMosqueSlug(args.mosqueSlug);
    const targetDate = parseOptionalDate(args.date);

    const docs = await ctx.db
      .query("ramadanTimetables")
      .withIndex("by_mosque", (q) => q.eq("mosqueSlug", mosqueSlug))
      .collect();

    if (docs.length === 0) return null;

    if (targetDate) {
      const covering = docs.find((d) => {
        const start = new Date(d.gregorianStart);
        const end = new Date(d.gregorianEnd);
        return targetDate >= start && targetDate <= end;
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
