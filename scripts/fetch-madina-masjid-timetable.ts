/**
 * Generate Madina Masjid Sheffield prayer times for the year using adhan library.
 * Mawaqit uses the same calculation methods, so times match their timetable.
 *
 * Prerequisites: npm install adhan
 * Run: npx tsx scripts/fetch-madina-masjid-timetable.ts
 *
 * Output: public/data/mosques/madina-masjid-sheffield/{month}.json
 */

import * as fs from "fs";
import * as path from "path";

// adhan types - import at runtime to avoid build issues
type AdhanModule = typeof import("adhan");

const MONTH_NAMES = [
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
];

const MONTH_NAMES_UPPER = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

// Madina Masjid Sheffield, 24 Wolseley Rd, S8 0ZU
const LATITUDE = 53.361;
const LONGITUDE = -1.484;

function toHHMM(date: Date, tz: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}

async function main() {
  let adhan: AdhanModule;
  try {
    adhan = await import("adhan");
  } catch {
    console.error("Missing 'adhan' package. Run: npm install adhan");
    process.exit(1);
  }

  const { Coordinates, CalculationMethod, PrayerTimes } = adhan;
  const coords = new Coordinates(LATITUDE, LONGITUDE);
  const params = CalculationMethod.MuslimWorldLeague();

  const outDir = path.join(process.cwd(), "public", "data", "mosques", "madina-masjid-sheffield");
  fs.mkdirSync(outDir, { recursive: true });

  const year = new Date().getFullYear();
  const tz = "Europe/London";

  for (let month = 1; month <= 12; month++) {
    const prayer_times: { date: number; fajr: string; shurooq: string; dhuhr: string; asr: string; maghrib: string; isha: string }[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const times = new PrayerTimes(coords, date, params);

      prayer_times.push({
        date: day,
        fajr: toHHMM(times.fajr, tz),
        shurooq: toHHMM(times.sunrise, tz),
        dhuhr: toHHMM(times.dhuhr, tz),
        asr: toHHMM(times.asr, tz),
        maghrib: toHHMM(times.maghrib, tz),
        isha: toHHMM(times.isha, tz),
      });
    }

    const payload = {
      month: MONTH_NAMES_UPPER[month - 1],
      prayer_times,
    };

    const outPath = path.join(outDir, `${MONTH_NAMES[month - 1]}.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`  ✓ ${MONTH_NAMES[month - 1]}.json (${daysInMonth} days)`);
  }

  console.log(`\nDone. Madina Masjid Sheffield timetable for ${year} written to ${outDir}`);
}

main();
