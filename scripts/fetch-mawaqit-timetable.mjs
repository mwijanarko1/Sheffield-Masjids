#!/usr/bin/env node
/**
 * Fetch full-year prayer times from a Mawaqit mosque page (embedded confData JSON).
 *
 * Source: https://mawaqit.net/en/{slug} — the HTML contains `let confData = {...}` with:
 *   - `calendar`      : 12 month arrays; each day = [fajr, sunrise, dhuhr, asr, maghrib, isha] (adhan)
 *   - `iqamaCalendar` : 12 month arrays; each day = [fajr, dhuhr, asr, maghrib, isha] (iqamah)
 *   - `jumua`         : Jumu'ah iqamah time
 * Iqamah values may be relative offsets like "+25" (minutes after adhan) — resolved.
 *
 * Usage:
 *   node scripts/fetch-mawaqit-timetable.mjs <mawaqitUrl> <citySlug> <slug> [--country gb]
 *   node scripts/fetch-mawaqit-timetable.mjs https://mawaqit.net/en/masjid-e-bilaal-nottingham-ng7-2et-united-kingdom nottingham masjid-e-bilaal
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
  const [url, citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!url || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-mawaqit-timetable.mjs <mawaqitUrl> <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { url, citySlug, slug, country };
}

async function fetchConfData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  // confData is a single-line JSON object; capture from `{` up to the matching closing `};`
  const start = html.indexOf('confData = ');
  if (start === -1) throw new Error('confData JSON not found in page');
  const objStart = html.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = objStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error('confData JSON parse: unbalanced braces');
  return JSON.parse(html.slice(objStart, end));
}

function toHHMM(s) {
  if (!s || s === '' || s === '+0' || s === '-0') return '';
  const t = String(s).trim();
  const rel = /^([+-])(\d{1,2})$/.exec(t);
  if (rel) {
    // Relative offset: caller resolves against adhan; here we return as-is marker
    return t;
  }
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Resolve an iqamah entry that may be "+N" minutes after the corresponding adhan time. */
function resolveIqamah(value, adhanTime) {
  const t = String(value || '').trim();
  const rel = /^\+(\d{1,2})$/.exec(t);
  if (rel && adhanTime) {
    const [h, min] = adhanTime.split(':').map(Number);
    const total = h * 60 + min + parseInt(rel[1], 10);
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  return toHHMM(value);
}

function daysInMonth(monthNum, year) {
  return new Date(year, monthNum, 0).getDate();
}

function convertYear(confData, year) {
  const calendar = confData.calendar || [];
  const iqamaCalendar = confData.iqamaCalendar || [];
  const jummah = confData.jumua || '';

  const months = [];
  for (let mi = 0; mi < 12; mi++) {
    const monthName = MONTH_NAMES[mi];
    const adhanByDay = calendar[mi] || {};
    const iqamaByDay = iqamaCalendar[mi] || {};
    const nDays = daysInMonth(mi + 1, year);

    const prayerTimes = [];
    const iqamahTimes = [];
    let monthJummah = '';

    for (let d = 1; d <= nDays; d++) {
      const adhan = adhanByDay[String(d)] || adhanByDay[d] || [];
      const iqama = iqamaByDay[String(d)] || iqamaByDay[d] || [];
      // adhan: [fajr, sunrise, dhuhr, asr, maghrib, isha]
      const fajr = toHHMM(adhan[0]);
      const shurooq = toHHMM(adhan[1]);
      const dhuhr = toHHMM(adhan[2]);
      const asr = toHHMM(adhan[3]);
      const maghrib = toHHMM(adhan[4]);
      const isha = toHHMM(adhan[5]);

      prayerTimes.push({ date: d, fajr, shurooq, dhuhr, asr, maghrib, isha });

      // iqama: [fajr, dhuhr, asr, maghrib, isha]
      const iFajr = resolveIqamah(iqama[0], fajr);
      const iDhuhr = resolveIqamah(iqama[1], dhuhr);
      const iAsr = resolveIqamah(iqama[2], asr);
      const iMaghrib = resolveIqamah(iqama[3], maghrib);
      const iIsha = resolveIqamah(iqama[4], isha);

      iqamahTimes.push({
        date_range: String(d),
        fajr: iFajr,
        dhuhr: iDhuhr,
        asr: iAsr,
        maghrib: iMaghrib,
        isha: iIsha
      });

      if (!monthJummah && jummah) monthJummah = jummah;
    }

    months.push({
      month: monthName,
      prayer_times: prayerTimes,
      iqamah_times: iqamahTimes,
      jummah_iqamah: monthJummah
    });
  }
  return months;
}

async function main() {
  const { url, citySlug, slug, country } = parseArgs(process.argv);
  const year = 2026;
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  console.log(`Fetching ${url}...`);
  const confData = await fetchConfData(url);
  const months = convertYear(confData, year);

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
