import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Validators for prayer time structures (matches existing JSON shape)
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

export default defineSchema({
  mosques: defineTable({
    id: v.string(),
    name: v.string(),
    address: v.string(),
    lat: v.number(),
    lng: v.number(),
    slug: v.string(),
    website: v.optional(v.string()),
    isHidden: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_mosque_id", ["id"]),

  monthlyPrayerTimes: defineTable({
    mosqueSlug: v.string(),
    month: v.string(), // "january", "february", etc.
    year: v.number(),
    monthDisplay: v.string(), // "JANUARY", "FEBRUARY", etc.
    prayerTimes: v.array(prayerTimeValidator),
    iqamahTimes: v.array(iqamahTimeRangeValidator),
    jummahIqamah: v.string(),
  })
    .index("by_mosque_month_year", ["mosqueSlug", "month", "year"]),

  ramadanTimetables: defineTable({
    mosqueSlug: v.string(),
    month: v.string(),
    gregorianStart: v.string(),
    gregorianEnd: v.string(),
    prayerTimes: v.array(ramadanPrayerTimeValidator),
    iqamahTimes: v.array(iqamahTimeRangeValidator),
    jummahIqamah: v.string(),
  })
    .index("by_mosque", ["mosqueSlug"])
    .index("by_mosque_and_start", ["mosqueSlug", "gregorianStart"]),

  /** Single-row UK BST start/end dates (same shape as public/docs/dst-start-end.json). */
  ukDstCalendar: defineTable({
    key: v.literal("singleton"),
    ukDstDates: v.array(
      v.object({
        year: v.number(),
        start_date: v.string(),
        end_date: v.string(),
      }),
    ),
  }).index("by_key", ["key"]),
});
