#!/usr/bin/env node
/**
 * Fetch full-year prayer times from Masjid-e-Umar (Leeds, Beeston),
 * whose site publishes a full-year JSON of Unix timestamps.
 *
 * Source: https://masjideumar.co.uk/timetables.json
 * Each row: { date: "26/12/2025", fajr, sunrise, duhr, asr, maghrib, isha,
 *   duhr_b, asr_b, isha_b, juma, ... } — all times are Unix seconds (UTC),
 *   converted to Europe/London local HH:MM. *_b = jamaat (iqamah).
 *
 * Usage:
 *   node scripts/fetch-masjideumar-timetable.mjs <citySlug> <slug>
 */
import { writeFileSync, mkdirSync } from 'fs';
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
  const [citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!citySlug || !slug) {
    console.error('Usage: node scripts/fetch-masjideumar-timetable.mjs <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { citySlug, slug, country };
}

/** Unix seconds (UTC) -> Europe/London HH:MM. */
function epochToHHMM(sec) {
  if (!sec) return '';
  const d = new Date(parseInt(sec, 10) * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  // The API stores times as local-time-looks-like-UTC (epoch of the local wall time).
  // To get the published HH:MM we can render in UTC; London offset is baked in by the publisher.
  return `${hh}:${mm}`;
}

/** Fajr adhan: use subah_sadiq when plausible (pre-dawn), else the fajr jamaat value. */
function pickFajrAdhan(r) {
  const sadiq = r.subah_sadiq ? parseInt(r.subah_sadiq, 10) * 1000 : 0;
  const sadiqHour = sadiq ? new Date(sadiq).getUTCHours() : -1;
  if (sadiqHour >= 2 && sadiqHour < 6) return r.subah_sadiq;
  return r.fajr;
}

function fetchRows() {
  const out = execFileSync('curl', ['-s', 'https://masjideumar.co.uk/timetables.json'], {
    encoding: 'utf-8', maxBuffer: 30 * 1024 * 1024
  });
  return JSON.parse(out);
}

function convertYear(rows) {
  const byMonth = Array.from({ length: 12 }, () => []);
  for (const r of rows) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(r.date || '').trim());
    if (!m) continue;
    const day = parseInt(m[1], 10);
    const monthIdx = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    if (year !== 2026 || monthIdx < 0 || monthIdx > 11 || !Number.isFinite(day)) continue;
    byMonth[monthIdx].push({
      date: day,
      // *_b fields are the adhan (begins); plain fields are the jamaat (iqamah),
      // except maghrib which is one time. subah_sadiq is the fajr adhan but the
      // source uses a 00:24 placeholder May-Aug — fall back to the fajr jamaat
      // (which is the real fajr time those months) as the adhan.
      fajr: epochToHHMM(pickFajrAdhan(r)),
      shurooq: epochToHHMM(r.sunrise),
      dhuhr: epochToHHMM(r.duhr_b),
      asr: epochToHHMM(r.asr_b),
      maghrib: epochToHHMM(r.maghrib),
      isha: epochToHHMM(r.isha_b),
      iFajr: epochToHHMM(r.fajr),
      iDhuhr: epochToHHMM(r.duhr),
      iAsr: epochToHHMM(r.asr),
      iMaghrib: epochToHHMM(r.maghrib),
      iIsha: epochToHHMM(r.isha),
      jummah: epochToHHMM(r.juma)
    });
  }
  const months = [];
  for (let mi = 0; mi < 12; mi++) {
    const days = byMonth[mi].sort((a, b) => a.date - b.date);
    const jummah = days.find((x) => x.jummah)?.jummah || days[0]?.iDhuhr || '';
    months.push({
      month: MONTH_NAMES[mi],
      prayer_times: days.map(({ date, fajr, shurooq, dhuhr, asr, maghrib, isha }) => ({
        date, fajr, shurooq, dhuhr, asr, maghrib, isha
      })),
      iqamah_times: days.map(({ date, iFajr, iDhuhr, iAsr, iMaghrib, iIsha }) => ({
        date_range: String(date), fajr: iFajr, dhuhr: iDhuhr, asr: iAsr,
        maghrib: iMaghrib, isha: iIsha
      })),
      jummah_iqamah: jummah
    });
  }
  return months;
}

async function main() {
  const { citySlug, slug, country } = parseArgs(process.argv);
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  console.log('Fetching Masjid-e-Umar Leeds timetable...');
  const rows = fetchRows();
  console.log(`  ${rows.length} rows`);
  const months = convertYear(rows);
  for (let i = 0; i < 12; i++) {
    const outPath = `${outDir}/${MONTH_FILES[i]}.json`;
    writeFileSync(outPath, JSON.stringify(months[i], null, 2));
    console.log(`  Wrote ${outPath} (${months[i].prayer_times.length} days, jummah ${months[i].jummah_iqamah})`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
