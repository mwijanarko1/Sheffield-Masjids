import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRamadanDayMap,
  hasMeaningfulMonthlyIqamahChange,
  hasMeaningfulRamadanIqamahChange,
  parseDateRange,
  todayYmdUTC,
  type IqamahTimeRange,
  type MonthlyIqamahSnapshot,
  type RamadanIqamahSnapshot,
} from "./iqamahChangeDetect";

const baseRanges: IqamahTimeRange[] = [
  {
    date_range: "1-15",
    fajr: "05:30",
    dhuhr: "13:15",
    asr: "17:00",
    maghrib: "20:00",
    isha: "21:30",
  },
  {
    date_range: "16-31",
    fajr: "05:45",
    dhuhr: "13:15",
    asr: "17:00",
    maghrib: "20:00",
    isha: "21:30",
  },
];

function monthly(
  year: number,
  monthNumber: number,
  iqamahTimes: IqamahTimeRange[],
  jummahIqamah = "13:30",
): MonthlyIqamahSnapshot {
  return { year, monthNumber, iqamahTimes, jummahIqamah };
}

// Fixed "today": 2026-07-10
const NOW = Date.UTC(2026, 6, 10, 12, 0, 0);

test("todayYmdUTC formats UTC date", () => {
  assert.equal(todayYmdUTC(NOW), "2026-07-10");
});

test("parseDateRange supports single and range", () => {
  assert.deepEqual(parseDateRange("30"), { start: 30, end: 30 });
  assert.deepEqual(parseDateRange("1-15"), { start: 1, end: 15 });
});

test("identical monthly import → no notification", () => {
  const snap = monthly(2026, 7, baseRanges);
  assert.equal(hasMeaningfulMonthlyIqamahChange(snap, snap, NOW), false);
});

test("first insert (prev null) → no notification", () => {
  const snap = monthly(2026, 7, baseRanges);
  assert.equal(hasMeaningfulMonthlyIqamahChange(null, snap, NOW), false);
});

test("adhan-only change is outside this detector (iqamah identical)", () => {
  // Detector only sees iqamah snapshots; identical iqamah → false.
  const a = monthly(2026, 7, baseRanges);
  const b = monthly(2026, 7, baseRanges);
  assert.equal(hasMeaningfulMonthlyIqamahChange(a, b, NOW), false);
});

test("future iqamah change → notification", () => {
  const prev = monthly(2026, 7, baseRanges);
  const nextRanges = baseRanges.map((r) =>
    r.date_range === "16-31" ? { ...r, isha: "22:00" } : r,
  );
  const next = monthly(2026, 7, nextRanges);
  assert.equal(hasMeaningfulMonthlyIqamahChange(prev, next, NOW), true);
});

test("past-only iqamah change → no notification", () => {
  const prev = monthly(2026, 7, baseRanges);
  const nextRanges = baseRanges.map((r) =>
    r.date_range === "1-15" ? { ...r, isha: "22:00" } : r,
  );
  // today is day 10; range 1-15 still includes today → this WOULD notify.
  // Use a fully past month instead.
  const pastPrev = monthly(2026, 5, baseRanges);
  const pastNext = monthly(
    2026,
    5,
    baseRanges.map((r) => ({ ...r, isha: "22:00" })),
  );
  assert.equal(hasMeaningfulMonthlyIqamahChange(pastPrev, pastNext, NOW), false);
});

test("past-only within current month (range fully before today) → no notification", () => {
  const prev: MonthlyIqamahSnapshot = monthly(2026, 7, [
    {
      date_range: "1-5",
      fajr: "05:30",
      dhuhr: "13:15",
      asr: "17:00",
      isha: "21:30",
    },
    {
      date_range: "6-31",
      fajr: "05:45",
      dhuhr: "13:15",
      asr: "17:00",
      isha: "21:30",
    },
  ]);
  const next: MonthlyIqamahSnapshot = monthly(2026, 7, [
    {
      date_range: "1-5",
      fajr: "05:30",
      dhuhr: "13:15",
      asr: "17:00",
      isha: "22:00", // only past days 1-5 changed; today is 10
    },
    {
      date_range: "6-31",
      fajr: "05:45",
      dhuhr: "13:15",
      asr: "17:00",
      isha: "21:30",
    },
  ]);
  assert.equal(hasMeaningfulMonthlyIqamahChange(prev, next, NOW), false);
});

test("multiple prayer fields changed still one boolean true", () => {
  const prev = monthly(2026, 7, baseRanges);
  const next = monthly(
    2026,
    7,
    baseRanges.map((r) => ({ ...r, fajr: "06:00", isha: "22:10" })),
  );
  assert.equal(hasMeaningfulMonthlyIqamahChange(prev, next, NOW), true);
});

test("jummahIqamah change in current month → notification", () => {
  const prev = monthly(2026, 7, baseRanges, "13:30");
  const next = monthly(2026, 7, baseRanges, "13:45");
  assert.equal(hasMeaningfulMonthlyIqamahChange(prev, next, NOW), true);
});

test("ramadan future iqamah change → notification", () => {
  const dayMap = buildRamadanDayMap([
    { ramadan_day: 1, gregorian: "2026-02-18" },
    { ramadan_day: 15, gregorian: "2026-03-04" },
    { ramadan_day: 30, gregorian: "2026-03-19" },
  ]);
  const ranges: IqamahTimeRange[] = [
    {
      date_range: "1-15",
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "16:00",
      isha: "20:00",
    },
    {
      date_range: "16-30",
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "16:00",
      isha: "20:15",
    },
  ];
  // Use a "now" during Ramadan
  const ramadanNow = Date.UTC(2026, 2, 5, 12, 0, 0); // 2026-03-05
  const prev: RamadanIqamahSnapshot = {
    gregorianStart: "2026-02-18",
    gregorianEnd: "2026-03-19",
    ramadanDayToGregorian: dayMap,
    iqamahTimes: ranges,
    jummahIqamah: "13:30",
  };
  const next: RamadanIqamahSnapshot = {
    ...prev,
    iqamahTimes: ranges.map((r) =>
      r.date_range === "16-30" ? { ...r, isha: "20:45" } : r,
    ),
  };
  assert.equal(hasMeaningfulRamadanIqamahChange(prev, next, ramadanNow), true);
});

test("ramadan fully past → no notification", () => {
  const dayMap = buildRamadanDayMap([
    { ramadan_day: 1, gregorian: "2025-03-01" },
    { ramadan_day: 30, gregorian: "2025-03-30" },
  ]);
  const ranges: IqamahTimeRange[] = [
    {
      date_range: "1-30",
      fajr: "05:00",
      dhuhr: "13:00",
      asr: "16:00",
      isha: "20:00",
    },
  ];
  const prev: RamadanIqamahSnapshot = {
    gregorianStart: "2025-03-01",
    gregorianEnd: "2025-03-30",
    ramadanDayToGregorian: dayMap,
    iqamahTimes: ranges,
    jummahIqamah: "13:30",
  };
  const next: RamadanIqamahSnapshot = {
    ...prev,
    iqamahTimes: [{ ...ranges[0], isha: "21:00" }],
  };
  assert.equal(hasMeaningfulRamadanIqamahChange(prev, next, NOW), false);
});
