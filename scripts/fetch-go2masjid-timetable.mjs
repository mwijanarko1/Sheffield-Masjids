#!/usr/bin/env node
/**
 * Fetch full-year prayer times from go2masjid.com papi API.
 *
 * Source: https://go2masjid.com/api/papi/loc_getfavmasjid.php?lat=0&lon=0&dist=1&mlim=1&slim=365&mid={mid}
 *
 * Usage:
 *   node scripts/fetch-go2masjid-timetable.mjs <mid> <citySlug> <slug> [--country gb]
 *   node scripts/fetch-go2masjid-timetable.mjs wals_298_ walsall masjid-al-aqsa-walsall
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
  const [mid, citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!mid || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-go2masjid-timetable.mjs <mid> <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { mid, citySlug, slug, country };
}

function toHHMM(s) {
  if (!s) return '';
  const m = /(\d{1,2}):(\d{2})/.exec(String(s));
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

function daysInMonth(monthNum, year) {
  return new Date(year, monthNum, 0).getDate();
}

function convertYear(salats, year) {
  const byMonth = Array.from({ length: 12 }, () => ({}));
  let jummah = '';

  for (const row of salats) {
    const date = String(row.salatdate || '');
    if (!date.startsWith(String(year))) continue;
    const [, mo, day] = date.split('-').map(Number);
    if (!mo || !day) continue;
    const slot = {
      fajr: toHHMM(row.fajarstart),
      shurooq: toHHMM(row.sunrise),
      dhuhr: toHHMM(row.zuhrstart),
      asr: toHHMM(row.asarstart),
      maghrib: toHHMM(row.maghrib),
      isha: toHHMM(row.eshastart),
      iFajr: toHHMM(row.fajarjamat),
      iDhuhr: toHHMM(row.zuhrjamat),
      iAsr: toHHMM(row.asarjamat),
      iMaghrib: toHHMM(row.maghrib),
      iIsha: toHHMM(row.eshajamat)
    };
    if (!jummah && row.jumma) jummah = toHHMM(row.jumma);
    byMonth[mo - 1][day] = slot;
  }

  const months = [];
  for (let mi = 0; mi < 12; mi++) {
    const nDays = daysInMonth(mi + 1, year);
    const prayerTimes = [];
    const iqamahTimes = [];
    for (let d = 1; d <= nDays; d++) {
      const slot = byMonth[mi][d];
      if (!slot) continue;
      prayerTimes.push({
        date: d,
        fajr: slot.fajr,
        shurooq: slot.shurooq,
        dhuhr: slot.dhuhr,
        asr: slot.asr,
        maghrib: slot.maghrib,
        isha: slot.isha
      });
      iqamahTimes.push({
        date_range: String(d),
        fajr: slot.iFajr,
        dhuhr: slot.iDhuhr,
        asr: slot.iAsr,
        maghrib: slot.iMaghrib,
        isha: slot.iIsha
      });
    }
    months.push({
      month: MONTH_NAMES[mi],
      prayer_times: prayerTimes,
      iqamah_times: iqamahTimes,
      jummah_iqamah: jummah
    });
  }
  return months;
}

async function fetchYear(mid) {
  const url = `https://go2masjid.com/api/papi/loc_getfavmasjid.php?lat=0&lon=0&dist=1&mlim=1&slim=365&mid=${encodeURIComponent(mid)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const masjid = Array.isArray(json) ? json[0] : json;
  if (!masjid?.salats?.length) throw new Error('No salats in response');
  return masjid;
}

async function main() {
  const { mid, citySlug, slug, country } = parseArgs(process.argv);
  const year = 2026;
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  console.log(`Fetching go2masjid timings for ${mid}...`);
  const masjid = await fetchYear(mid);
  console.log(`  ${masjid.masjidname}: ${masjid.salats.length} days`);
  const months = convertYear(masjid.salats, year);

  for (let i = 0; i < 12; i++) {
    const n = months[i].prayer_times.length;
    if (!n) {
      console.log(`  Skip ${MONTH_FILES[i]}.json (0 days — go2masjid rolling window)`);
      continue;
    }
    const outPath = `${outDir}/${MONTH_FILES[i]}.json`;
    writeFileSync(outPath, JSON.stringify(months[i], null, 2));
    console.log(`  Wrote ${outPath} (${n} days, jummah ${months[i].jummah_iqamah})`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
