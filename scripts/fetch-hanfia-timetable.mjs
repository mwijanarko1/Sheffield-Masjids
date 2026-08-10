#!/usr/bin/env node
/**
 * Fetch full-year prayer times from Jamia Masjid Hanfia (Bradford),
 * whose homepage embeds a full-year timetable as `const TIMETABLE=[...]`.
 *
 * Each row: { d: "01 Jan 2026", fs, fj, ds, dj, as, aj, ms, mj, is, ij }
 * (fs/fj = fajr start/jamaat, ds/dj = dhuhr, as/aj = asr, ms/mj = maghrib, is/ij = isha)
 *
 * Usage:
 *   node scripts/fetch-hanfia-timetable.mjs <citySlug> <slug>
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
    console.error('Usage: node scripts/fetch-hanfia-timetable.mjs <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { citySlug, slug, country };
}

function toHHMM(s) {
  if (!s) return '';
  const m = /(\d{1,2}):(\d{2})/.exec(String(s));
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

function fetchRows() {
  const html = execFileSync('curl', ['-s', 'https://www.jamiamasjidhanfia.co.uk/'], {
    encoding: 'utf-8', maxBuffer: 30 * 1024 * 1024
  });
  const m = html.match(/const TIMETABLE\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error('TIMETABLE array not found in page');
  return JSON.parse(m[1]);
}

function convertYear(rows) {
  const byMonth = Array.from({ length: 12 }, () => []);
  for (const r of rows) {
    const d = /(\d{2}) ([A-Za-z]+) (\d{4})/.exec(r.d || '');
    if (!d) continue;
    const day = parseInt(d[1], 10);
    const monthIdx = MONTH_NAMES.findIndex((n) => n.startsWith(d[2].toUpperCase()));
    if (monthIdx === -1 || !Number.isFinite(day)) continue;
    byMonth[monthIdx].push({
      date: day,
      fajr: toHHMM(r.fs), shurooq: '', dhuhr: toHHMM(r.ds),
      asr: toHHMM(r.as), maghrib: toHHMM(r.ms), isha: toHHMM(r.is),
      iFajr: toHHMM(r.fj), iDhuhr: toHHMM(r.dj), iAsr: toHHMM(r.aj),
      iMaghrib: toHHMM(r.mj), iIsha: toHHMM(r.ij)
    });
  }
  const months = [];
  for (let mi = 0; mi < 12; mi++) {
    const days = byMonth[mi].sort((a, b) => a.date - b.date);
    const fridays = days.filter((x) => new Date(2026, mi, x.date).getDay() === 5);
    const jummah = fridays[0]?.iDhuhr || days[0]?.iDhuhr || '';
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

  console.log('Fetching Jamia Masjid Hanfia timetable...');
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
