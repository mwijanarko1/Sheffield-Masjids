import assert from "node:assert/strict";
import test from "node:test";

import { getIqamahTimesForDate, resolveRelativeIqamah } from "@/lib/prayer-times";
import type { IqamahTimeRange } from "@/types/prayer-times";

/**
 * Mosques publish iqamah either as a clock time or as a relative label.
 * A label that is not resolved reaches the UI as literal text, so these
 * cases pin the ones found in real timetable data.
 */

const ADHAN = {
  fajr: "05:14",
  dhuhr: "11:50",
  asr: "14:01",
  maghrib: "16:31",
  isha: "18:25",
};

test("resolves a bare 'After Adhan' label to the adhan time", () => {
  // Published by Al-Huda Academy Sheffield for August maghrib.
  assert.equal(resolveRelativeIqamah("After Adhan", "16:31"), "16:31");
  assert.equal(resolveRelativeIqamah("after adhan", "16:31"), "16:31");
  assert.equal(resolveRelativeIqamah("AFTER ADHAN", "16:31"), "16:31");
  assert.equal(resolveRelativeIqamah("  After Adhan  ", "16:31"), "16:31");
  assert.equal(resolveRelativeIqamah("At Adhan", "16:31"), "16:31");
});

test("resolves 'Adhan+0' to the adhan time", () => {
  assert.equal(resolveRelativeIqamah("Adhan+0", "16:31"), "16:31");
  assert.equal(resolveRelativeIqamah("Adhan+10", "17:25"), "17:35");
  assert.equal(resolveRelativeIqamah("adhan + 5", "05:14"), "05:19");
  assert.equal(resolveRelativeIqamah("10 mins after adhan", "17:25"), "17:35");
});

test("wraps past midnight instead of producing a negative or 25:xx time", () => {
  assert.equal(resolveRelativeIqamah("Adhan+30", "23:45"), "00:15");
});

test("leaves an already-clock value untouched", () => {
  assert.equal(resolveRelativeIqamah("13:00", "11:50"), "13:00");
});

test("leaves an unrecognised label as published rather than inventing a time", () => {
  // A min-max range is a publication format this resolver must not guess at.
  assert.equal(resolveRelativeIqamah("05:20-05:29", "05:12"), "05:20-05:29");
  assert.equal(resolveRelativeIqamah("sunset", "16:31"), "sunset");
});

test("returns the label unchanged when the adhan itself is not a clock time", () => {
  assert.equal(resolveRelativeIqamah("Adhan+5", "sunset"), "Adhan+5");
  assert.equal(resolveRelativeIqamah("After Adhan", ""), "After Adhan");
});

test("getIqamahTimesForDate resolves every field, including maghrib", () => {
  const ranges: IqamahTimeRange[] = [
    {
      date_range: "1-30",
      fajr: "Adhan+0",
      dhuhr: "13:00",
      asr: "Adhan+14",
      maghrib: "After Adhan",
      isha: "Adhan+50",
    },
  ];

  const iqamah = getIqamahTimesForDate(4, ranges, ADHAN);

  assert.deepEqual(iqamah, {
    fajr: "05:14",
    dhuhr: "13:00",
    asr: "14:15",
    maghrib: "16:31",
    isha: "19:15",
    jummah: "",
  });
});
