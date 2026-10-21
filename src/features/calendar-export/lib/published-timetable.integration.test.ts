import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/prayer-times/route";
import { buildMonthlyCalendarEvents, buildMonthlyTimetableRowsAsync } from "@/features/calendar-export/lib/build-monthly-calendar-events";
import { buildIcsCalendar } from "@/features/calendar-export/lib/ics";
import { getIqamahTimesForSpecificDate, getPrayerTimesForDate } from "@/lib/prayer-times";
import type { MonthlyPrayerTimes, Mosque } from "@/types/prayer-times";

// Integration uses bundled JSON, the real timetable loader, export builder, and ICS serializer.
// Browser-only coverage cannot cheaply exercise both transition months for several source schedules.
test("published mosque times survive loading, monthly display, and ICS export without DST corrections", async (t) => {
  process.env.NEXT_PUBLIC_CONVEX_URL = "";
  const registry: { mosques: Mosque[] } = JSON.parse(await readFile("public/data/mosques.json", "utf8"));

  for (const slug of ["sheffield-grand-mosque", "madina-masjid-sheffield", "darululoom-siddiqia-masjid", "muslim-welfare-house", "masjid-risalah"]) {
    const mosque = registry.mosques.find((entry) => entry.slug === slug);
    assert.ok(mosque);
    for (const [month, monthName] of [[3, "march"], [5, "may"], [7, "july"], [8, "august"], [10, "october"]] as const) {
      await t.test(`${slug} ${monthName}`, async () => {
        const monthlyData: MonthlyPrayerTimes = JSON.parse(await readFile(
          `public/data/mosques/gb/sheffield/${slug}/${monthName}.json`, "utf8",
        ));
        const rows = await buildMonthlyTimetableRowsAsync({
          slug, year: 2026, monthlyData, selectedMonth: month, today: { day: -1, month: -1 },
        });
        const events = await buildMonthlyCalendarEvents({
          mosque, month, year: 2026, monthLabel: monthName, monthlyData, mode: "both",
        });
        const ics = buildIcsCalendar(events, new Date("2026-01-01T00:00:00Z"));
        assert.ok(ics.includes("X-WR-TIMEZONE:Europe/London"));

        for (const source of monthlyData.prayer_times.filter((entry) => entry.date >= 24)) {
          const key = `2026-${String(month).padStart(2, "0")}-${String(source.date).padStart(2, "0")}`;
          const loaded = await getPrayerTimesForDate(slug, new Date(`${key}T12:00:00Z`));
          const displayed = rows.find((row) => row.day === source.date);
          assert.ok(displayed);
          for (const [field, displayField] of [["fajr", "fajrAdhan"], ["dhuhr", "dhuhrAdhan"], ["asr", "asrAdhan"], ["maghrib", "maghribAdhan"], ["isha", "ishaAdhan"]] as const) {
            assert.equal(loaded[field], source[field], `${key} loaded ${field}`);
            assert.equal(displayed[displayField], source[field], `${key} monthly ${field}`);
            const event = events.find((entry) => entry.uid === `${slug}-${key}-${field}-adhan@sheffieldmasjids`);
            assert.ok(event, `${key} exported ${field}`);
            assert.equal(event.start.toISOString().slice(11, 16), source[field], `${key} calendar ${field}`);
            assert.ok(ics.includes(`DTSTART;TZID=Europe/London:${key.replaceAll("-", "")}T${source[field].replace(":", "")}00`));
          }
          assert.equal(loaded.sunrise, source.shurooq, `${key} loaded sunrise`);
          assert.equal(displayed.sunrise, source.shurooq, `${key} monthly sunrise`);
          const iqamah = monthlyData.iqamah_times.find((entry) => {
            const [start, end = start] = entry.date_range.split("-").map(Number);
            return source.date >= start && source.date <= end;
          });
          assert.ok(iqamah);
          const loadedIqamah = await getIqamahTimesForSpecificDate(slug, new Date(`${key}T12:00:00Z`));
          for (const field of ["fajr", "dhuhr", "asr", "isha"] as const) {
            assert.equal(loadedIqamah[field], iqamah[field], `${key} loaded ${field} jamaat`);
          }
          assert.equal(loadedIqamah.maghrib, iqamah.maghrib ?? "-", `${key} loaded Maghrib jamaat`);
          assert.equal(displayed.fajrIqamah, iqamah.fajr, `${key} published Fajr jamaat`);
          assert.equal(displayed.dhuhrIqamah, iqamah.dhuhr, `${key} published Dhuhr jamaat`);
          assert.equal(displayed.asrIqamah, iqamah.asr, `${key} published Asr jamaat`);
          assert.equal(displayed.ishaIqamah, iqamah.isha, `${key} published Isha jamaat`);
          assert.equal(displayed.maghribIqamah, iqamah.maghrib ?? "-", `${key} published Maghrib jamaat`);
          for (const field of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
            const publishedValue = iqamah[field] ?? "-";
            const event = events.find((entry) => entry.uid === `${slug}-${key}-${field}-iqamah@sheffieldmasjids`);
            if (/^\d{1,2}:\d{2}$/.test(publishedValue)) {
              assert.ok(event, `${key} exported published ${field} jamaat`);
              assert.equal(event.start.toISOString().slice(11, 16), publishedValue.padStart(5, "0"));
            } else {
              assert.equal(event, undefined, `${key} must not invent a clock for ${publishedValue}`);
            }
          }
        }
      });
    }
  }
});

test("the prayer API does not invent a Maghrib iqamah when the published range omits it", async () => {
  const response = await GET(new NextRequest(
    "https://www.sheffieldmasjids.com/api/prayer-times?mosque=masjid-al-huda-sheffield&date=2026-08-24",
    { headers: { "x-forwarded-for": `source-integration-${crypto.randomUUID()}` } },
  ));
  const body = await response.text();
  assert.equal(response.status, 200, body.slice(0, 160));
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.equal(JSON.parse(body).iqamah.maghrib, "-");
});
