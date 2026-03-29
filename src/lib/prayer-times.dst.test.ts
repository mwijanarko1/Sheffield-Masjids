import test from "node:test";
import assert from "node:assert/strict";

import { getDisplayedPrayerTimes } from "@/lib/prayer-times";
import type { DailyPrayerTimes } from "@/types/prayer-times";

const basePrayerTimes: DailyPrayerTimes = {
  date: "2026-03-29",
  fajr: "04:22",
  sunrise: "05:44",
  dhuhr: "12:11",
  asr: "15:39",
  maghrib: "18:38",
  isha: "20:02",
};

function sheffieldDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

test("getDisplayedPrayerTimes leaves March dates before the 2026 DST change untouched", () => {
  const displayed = getDisplayedPrayerTimes(basePrayerTimes, sheffieldDate(2026, 3, 28));

  assert.deepEqual(displayed, basePrayerTimes);
});

test("getDisplayedPrayerTimes applies the March 29 2026 DST adjustment to displayed prayer times", () => {
  const displayed = getDisplayedPrayerTimes(basePrayerTimes, sheffieldDate(2026, 3, 29));

  assert.deepEqual(displayed, {
    ...basePrayerTimes,
    fajr: "05:22",
    sunrise: "06:44",
    dhuhr: "13:11",
    asr: "16:39",
    maghrib: "19:38",
    isha: "21:02",
  });
});

test("getDisplayedPrayerTimes keeps the March DST display adjustment active through the end-of-month window", () => {
  const displayed = getDisplayedPrayerTimes(basePrayerTimes, sheffieldDate(2026, 3, 30));

  assert.deepEqual(displayed, {
    ...basePrayerTimes,
    fajr: "05:22",
    sunrise: "06:44",
    dhuhr: "13:11",
    asr: "16:39",
    maghrib: "19:38",
    isha: "21:02",
  });
});

test("getDisplayedPrayerTimes skips DST when mosque timetable already uses UK civil time (Masjid Al Huda)", () => {
  const displayed = getDisplayedPrayerTimes(
    basePrayerTimes,
    sheffieldDate(2026, 3, 30),
    "masjid-al-huda-sheffield",
  );

  assert.deepEqual(displayed, basePrayerTimes);
});

test("getDisplayedPrayerTimes skips DST when mosque timetable already uses UK civil time (Sheffield Grand Mosque)", () => {
  const displayed = getDisplayedPrayerTimes(
    basePrayerTimes,
    sheffieldDate(2026, 3, 30),
    "sheffield-grand-mosque",
  );

  assert.deepEqual(displayed, basePrayerTimes);
});
