import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getIqamahTimesForDate,
  isCombinedWithMaghribIqamahLabel,
  isSummerIshaPeriod,
  resolveIshaIqamahForDisplay,
} from "./prayer-times";
import type { IqamahTimeRange } from "@/types/prayer-times";

const leedsMayIqamah: IqamahTimeRange[] = [
  { date_range: "1-2", fajr: "04:45", dhuhr: "13:30", asr: "18:00", maghrib: "Adhan+5", isha: "22:15" },
  { date_range: "3-9", fajr: "04:30", dhuhr: "13:30", asr: "18:00", maghrib: "Adhan+5", isha: "22:15" },
  { date_range: "10-16", fajr: "04:15", dhuhr: "13:30", asr: "18:30", maghrib: "Adhan+5", isha: "After Maghrib" },
  { date_range: "17-31", fajr: "04:00", dhuhr: "13:30", asr: "18:30", maghrib: "Adhan+5", isha: "After Maghrib" },
];

const leedsAugustIqamah: IqamahTimeRange[] = [
  { date_range: "1-8", fajr: "04:30", dhuhr: "13:30", asr: "18:30", maghrib: "Adhan+5", isha: "After Maghrib" },
  { date_range: "9-15", fajr: "04:45", dhuhr: "13:30", asr: "18:30", maghrib: "Adhan+5", isha: "After Maghrib" },
  { date_range: "16-22", fajr: "05:00", dhuhr: "13:30", asr: "18:30", maghrib: "Adhan+5", isha: "22:00" },
  { date_range: "23-31", fajr: "05:15", dhuhr: "13:30", asr: "18:30", maghrib: "Adhan+5", isha: "21:45" },
];

test("isCombinedWithMaghribIqamahLabel recognises Leeds timetable wording", () => {
  assert.equal(isCombinedWithMaghribIqamahLabel("Combined with Maghrib"), true);
  assert.equal(isCombinedWithMaghribIqamahLabel("Straight after Maghrib"), true);
  assert.equal(isCombinedWithMaghribIqamahLabel("22:00"), false);
});

test("Leeds May 9 is not combined; May 10 is After Maghrib (per published bands)", () => {
  assert.equal(getIqamahTimesForDate(9, leedsMayIqamah).isha, "22:15");
  assert.equal(getIqamahTimesForDate(10, leedsMayIqamah).isha, "After Maghrib");
});

test("Leeds August 15 After Maghrib; August 16 separate iqamah time", () => {
  assert.equal(getIqamahTimesForDate(15, leedsAugustIqamah).isha, "After Maghrib");
  assert.equal(getIqamahTimesForDate(16, leedsAugustIqamah).isha, "22:00");
});

test("resolveIshaIqamahForDisplay passes through After Maghrib from JSON", () => {
  const may10 = new Date(2026, 4, 10);
  const iqamah = getIqamahTimesForDate(10, leedsMayIqamah);
  assert.equal(
    resolveIshaIqamahForDisplay("leeds-grand-mosque", may10, "22:30", iqamah, "21:00"),
    "After Maghrib",
  );
});

test("legacy Combined with Maghrib label still maps to After Maghrib in display", () => {
  const legacyIqamah = { ...getIqamahTimesForDate(10, leedsMayIqamah), isha: "Combined with Maghrib" };
  assert.equal(
    resolveIshaIqamahForDisplay("leeds-grand-mosque", new Date(2026, 4, 10), "22:30", legacyIqamah, "21:00"),
    "After Maghrib",
  );
});

test("MWHS summer window differs from Leeds combined start", () => {
  const may10 = new Date(2026, 4, 10);
  const may15 = new Date(2026, 4, 15);
  assert.equal(isSummerIshaPeriod(may10), false);
  assert.equal(isSummerIshaPeriod(may15), true);
  const iqamahMay10 = getIqamahTimesForDate(10, leedsMayIqamah);
  assert.equal(
    resolveIshaIqamahForDisplay("leeds-grand-mosque", may10, "22:00", iqamahMay10, "21:00"),
    "After Maghrib",
  );
});
