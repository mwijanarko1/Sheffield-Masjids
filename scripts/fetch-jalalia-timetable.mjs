#!/usr/bin/env node
/**
 * Fetch full-year prayer times from the Jalalia Jaame Mosque (Rochdale)
 * public JSON timetable API.
 *
 * Source: https://jalaliajaamemosque.org/api/public/timetable/month?year=2026&month={1..12}
 * Each entry: { date: "2026-01-01", fajrStart: "1970-01-01T06:43:00.000Z",
 *   fajrJamat, sunrise, zuhrStart, zhurJamat, asrStart, asrJamat, magrib,
 *   ishaStart, ishaJamat } — time-of-day carried on a 1970-01-01 base.
 *
 * Usage:
 *   node scripts/fetch-jalalia-timetable.mjs <citySlug> <slug>
 */
import { writeFileSync, mkdirSync } from 'fs';
import { mosqueDataFsDir } from './lib/mosque-data-path.mjs';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];
const MONTH_FILES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

function parseArgs(argv) {
  const [citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!citySlug || !slug) {
    console.error('Usage: node scripts/fetch-jalalia-timetable.mjs <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { citySlug, slug, country };
}

/** "1970-01-01T06:43:00.000Z" -> "06:43" */
function toHHMM(iso) {
  if (!iso) return '';
  const m = /T(\d{2}):(\d{2})/.exec(String(iso));
  return m ? `${m[1]}:${m[2]}` : '';
}

async function fetchMonth(monthNum, year) {
  const url = `https://jalaliajaamemosque.org/api/public/timetable/month?year=${year}&month=${monthNum}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for month ${monthNum}`);
  return res.json();
}

function convertMonth(entries, monthName) {
  const prayerTimes = [];
  const iqamahTimes = [];
  let jummah = '';

  for (const e of entries) {
    const d = /-(\d{2})$/.exec(e.date || '');
    const date = d ? parseInt(d[1], 10) : NaN;
    if (!Number.isFinite(date)) continue;
    if (!jummah && e.zhurJamat) jummah = toHHMM(e.zhurJamat);

    prayerTimes.push({
      date,
      fajr: toHHMM(e.fajrStart),
      shurooq: toHHMM(e.sunrise),
      dhuhr: toHHMM(e.zuhrStart),
      asr: toHHMM(e.asrStart),
      maghrib: toHHMM(e.magrib),
      isha: toHHMM(e.ishaStart)
    });
    iqamahTimes.push({
      date_range: String(date),
      fajr: toHHMM(e.fajrJamat),
      dhuhr: toHHMM(e.zhurJamat),
      asr: toHHMM(e.asrJamat),
      maghrib: toHHMM(e.magrib) || '',
      isha: toHHMM(e.ishaJamat)
    });
  }

  return { month: monthName, prayer_times: prayerTimes, iqamah_times: iqamahTimes, jummah_iqamah: jummah };
}

async function main() {
  const { citySlug, slug, country } = parseArgs(process.argv);
  const year = 2026;
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  for (let m = 1; m <= 12; m++) {
    console.log(`Fetching ${MONTH_NAMES[m - 1]}...`);
    let entries;
    try {
      entries = await fetchMonth(m, year);
    } catch (err) {
      console.error(`  SKIP ${MONTH_NAMES[m - 1]}: ${err.message}`);
      continue;
    }
    const converted = convertMonth(entries, MONTH_NAMES[m - 1]);
    const outPath = `${outDir}/${MONTH_FILES[m - 1]}.json`;
    writeFileSync(outPath, JSON.stringify(converted, null, 2));
    console.log(`  Wrote ${outPath} (${converted.prayer_times.length} days, jummah ${converted.jummah_iqamah})`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
