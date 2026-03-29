import test from "node:test";
import assert from "node:assert/strict";

import type { PrayerTime } from "@/types/prayer-times";
import {
  detectMarchSummerStartDayInTable,
  detectOctoberWinterStartDayInTable,
  resolveTimetableDayForUkEmbeddedDst,
} from "@/lib/prayer-times";

test("resolveTimetableDayForUkEmbeddedDst: table summer starts 1 day late (Grand March)", () => {
  const max = 31;
  assert.equal(
    resolveTimetableDayForUkEmbeddedDst({
      calendarDay: 29,
      transitionDayInTable: 30,
      ukTransitionDay: 29,
      maxTableDay: max,
    }),
    30,
  );
  assert.equal(
    resolveTimetableDayForUkEmbeddedDst({
      calendarDay: 28,
      transitionDayInTable: 30,
      ukTransitionDay: 29,
      maxTableDay: max,
    }),
    28,
  );
});

test("resolveTimetableDayForUkEmbeddedDst: table summer starts 1 day early (Al Huda March)", () => {
  const max = 31;
  assert.equal(
    resolveTimetableDayForUkEmbeddedDst({
      calendarDay: 28,
      transitionDayInTable: 28,
      ukTransitionDay: 29,
      maxTableDay: max,
    }),
    27,
  );
  // Only the single mismatch day (28) is remapped; 29 is already correct in the file for UK 29.
  assert.equal(
    resolveTimetableDayForUkEmbeddedDst({
      calendarDay: 29,
      transitionDayInTable: 28,
      ukTransitionDay: 29,
      maxTableDay: max,
    }),
    29,
  );
});

test("resolveTimetableDayForUkEmbeddedDst: October winter 1 day late in table", () => {
  const max = 31;
  assert.equal(
    resolveTimetableDayForUkEmbeddedDst({
      calendarDay: 25,
      transitionDayInTable: 26,
      ukTransitionDay: 25,
      maxTableDay: max,
    }),
    26,
  );
});

test("detectMarchSummerStartDayInTable finds largest forward dhuhr jump", () => {
  const rows: PrayerTime[] = [
    { date: 28, fajr: "04:25", shurooq: "05:47", dhuhr: "12:11", asr: "15:38", maghrib: "18:36", isha: "20:01" },
    { date: 29, fajr: "04:22", shurooq: "05:44", dhuhr: "12:11", asr: "15:39", maghrib: "18:38", isha: "20:02" },
    { date: 30, fajr: "05:19", shurooq: "06:42", dhuhr: "13:10", asr: "16:40", maghrib: "19:40", isha: "21:03" },
  ];
  assert.equal(detectMarchSummerStartDayInTable(rows), 30);
});

test("detectOctoberWinterStartDayInTable finds largest backward dhuhr jump", () => {
  const rows: PrayerTime[] = [
    { date: 24, fajr: "06:02", shurooq: "07:47", dhuhr: "12:50", asr: "15:18", maghrib: "17:53", isha: "19:39" },
    { date: 25, fajr: "06:03", shurooq: "07:48", dhuhr: "12:50", asr: "15:17", maghrib: "17:51", isha: "19:38" },
    { date: 26, fajr: "05:04", shurooq: "06:50", dhuhr: "11:50", asr: "14:15", maghrib: "16:49", isha: "18:36" },
  ];
  assert.equal(detectOctoberWinterStartDayInTable(rows), 26);
});
