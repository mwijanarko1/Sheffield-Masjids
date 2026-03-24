import test from "node:test";
import assert from "node:assert/strict";
import { buildMonthlyCalendarEvents } from "@/features/calendar-export/lib/build-monthly-calendar-events";
import type { MonthlyCalendarExportRequest } from "@/features/calendar-export/types";

const baseRequest: Omit<MonthlyCalendarExportRequest, "mode"> = {
  mosque: {
    id: "1",
    name: "Test Masjid",
    address: "1 Test Street, Sheffield",
    lat: 53.3811,
    lng: -1.4701,
    slug: "test-masjid",
  },
  month: 4,
  year: 2026,
  monthLabel: "April",
  monthlyData: {
    month: "APRIL",
    prayer_times: [
      {
        date: 1,
        fajr: "05:14",
        shurooq: "06:37",
        dhuhr: "13:10",
        asr: "16:42",
        maghrib: "19:44",
        isha: "21:07",
      },
    ],
    iqamah_times: [
      {
        date_range: "1-30",
        fajr: "05:45",
        dhuhr: "13:30",
        asr: "17:00",
        maghrib: "-",
        isha: "After Maghrib",
      },
    ],
    jummah_iqamah: "12:30",
  },
};

test("buildMonthlyCalendarEvents exports only adhan events in adhan mode", () => {
  const events = buildMonthlyCalendarEvents({ ...baseRequest, mode: "adhan" });

  assert.equal(events.length, 5);
  assert(events.every((event) => event.kind === "adhan"));
  assert.equal(events[0]?.title, "Fajr Adhan - Test Masjid");
  assert.equal(events[0]?.start.toISOString(), "2026-04-01T05:14:00.000Z");
  assert.equal(events[0]?.end.toISOString(), "2026-04-01T05:15:00.000Z");
});

test("buildMonthlyCalendarEvents exports only concrete iqamah events in iqamah mode", () => {
  const events = buildMonthlyCalendarEvents({ ...baseRequest, mode: "iqamah" });

  assert.equal(events.length, 3);
  assert(events.every((event) => event.kind === "iqamah"));
  assert.deepEqual(
    events.map((event) => event.title),
    [
      "Fajr Iqamah - Test Masjid",
      "Dhuhr Iqamah - Test Masjid",
      "Asr Iqamah - Test Masjid",
    ],
  );
  assert.equal(events[0]?.end.toISOString(), "2026-04-01T06:00:00.000Z");
});

test("buildMonthlyCalendarEvents exports both adhan and iqamah without placeholders", () => {
  const events = buildMonthlyCalendarEvents({ ...baseRequest, mode: "both" });

  assert.equal(events.length, 8);
  assert(!events.some((event) => event.title.includes("Isha Iqamah")));
  assert(!events.some((event) => event.title.includes("Maghrib Iqamah")));
  assert.equal(
    events.find((event) => event.kind === "adhan")?.uid,
    "test-masjid-2026-04-01-fajr-adhan@sheffieldmasjids",
  );
  assert.equal(events[0]?.description, "Fajr adhan for Test Masjid\nSheffield Masjids monthly timetable export\nMonth: April 2026");
});
