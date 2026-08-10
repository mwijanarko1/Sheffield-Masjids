#!/usr/bin/env node
/**
 * Fetch full-year prayer times from the masjid247 / mymasjid CDN JSON API.
 *
 * Source: https://cdn.masjid247.com/jsonfiles/timetables/{masjidId}/{year}/{month}.json.gz
 * (gzip JSON with per-day `beg*` adhan + `jam*` iqamah fields + jummah).
 *
 * Usage:
 *   node scripts/fetch-masjid247-timetable.mjs <masjidId> <citySlug> <slug> [--year 2026] [--country gb]
 *   node scripts/fetch-masjid247-timetable.mjs 2076 preston jamea-masjid
 */
import { writeFileSync, mkdirSync } from 'fs';
import { gunzipSync } from 'zlib';
import { execFileSync } from 'child_process';
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
  const [masjidId, citySlug, slug] = argv.slice(2);
  const yearIdx = argv.indexOf('--year');
  const countryIdx = argv.indexOf('--country');
  const year = yearIdx >= 0 ? argv[yearIdx + 1] : '2026';
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!masjidId || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-masjid247-timetable.mjs <masjidId> <citySlug> <slug> [--year 2026] [--country gb]');
    process.exit(1);
  }
  return { masjidId, citySlug, slug, year, country };
}

async function fetchMonthJson(masjidId, year, monthNum) {
  const url = `https://cdn.masjid247.com/jsonfiles/timetables/${masjidId}/${year}/${monthNum}.json.gz`;
  // curl --compressed transparently decompresses the gzip body; the result is plain JSON text.
  const buf = execFileSync('curl', ['-sSL', '--compressed', url], { maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(buf.toString('utf-8').replace(/^\uFEFF/, ''));
}

function toHHMM(s) {
  if (!s || s === '' || s === '0') return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(String(s));
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/**
 * Convert a month JSON (days[]) to the project monthly format.
 * Note: maghrib adhan is often empty ("") in masjid247 data — the
 * jamMaghrib value then carries the actual maghrib time; we fall back to it.
 */
function convertMonth(monthJson, monthName) {
  const days = monthJson.days || [];
  const prayerTimes = [];
  const iqamahTimes = [];
  let jummah = '';

  for (const d of days) {
    const date = parseInt(d.date, 10);
    if (!Number.isFinite(date)) continue;

    const maghrib = toHHMM(d.begMaghrib) || toHHMM(d.jamMaghrib);
    // jummah1 may hold a real time (e.g. "12:40") or text ("Jamea") meaning
    // "Jumu'ah held at the main masjid" — only treat real times as the jummah value.
    const jummahTime = toHHMM(d.jummah1) || toHHMM(d.jummah2);
    if (!jummah && jummahTime) jummah = jummahTime;
    const isTextJummah = /^[A-Za-z]/.test(String(d.jummah1 || ''));
    const jamDhuhr = /^\d{1,2}:\d{2}/.test(String(d.jamDhuhr || '')) ? toHHMM(d.jamDhuhr) : (jummahTime || '');

    prayerTimes.push({
      date,
      fajr: toHHMM(d.begFajr),
      shurooq: toHHMM(d.sunrise),
      dhuhr: toHHMM(d.begDhuhr),
      asr: toHHMM(d.begAsar),
      maghrib,
      isha: toHHMM(d.begEsha)
    });

    iqamahTimes.push({
      date_range: String(date),
      fajr: toHHMM(d.jamFajr),
      dhuhr: jamDhuhr,
      asr: toHHMM(d.jamAsar),
      maghrib: toHHMM(d.jamMaghrib),
      isha: toHHMM(d.jamEsha)
    });
  }

  return {
    month: monthName,
    prayer_times: prayerTimes,
    iqamah_times: iqamahTimes,
    jummah_iqamah: jummah
  };
}

async function main() {
  const { masjidId, citySlug, slug, year, country } = parseArgs(process.argv);
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  for (let m = 1; m <= 12; m++) {
    console.log(`Fetching ${MONTH_NAMES[m - 1]}...`);
    let monthJson;
    try {
      monthJson = await fetchMonthJson(masjidId, year, m);
    } catch (err) {
      console.error(`  SKIP ${MONTH_NAMES[m - 1]}: ${err.message}`);
      continue;
    }
    const converted = convertMonth(monthJson, MONTH_NAMES[m - 1]);
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
