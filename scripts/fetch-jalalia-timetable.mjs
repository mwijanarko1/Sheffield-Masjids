#!/usr/bin/env node
/**
 * Fetch full-year prayer times from the Jalalia Jaame Mosque (Rochdale)
 * public JSON timetable API.
 *
 * Source: https://jalaliajaamemosque.org/api/public/timetable/month?year=2026&month={1..12}
 * Each entry: { date: "2026-01-01", fajrStart: "1970-01-01T06:43:00.000Z",
 *   fajrJamat, sunrise, zuhrStart, zhurJamat, asrStart, asrJamat, magrib,
 *   ishaStart, ishaJamat }: UTC time-of-day on a 1970-01-01 base. Convert
 *   onto the row's calendar date in Europe/London (BST in summer).
 * Jummah 1+2: settings key jummah-times ("1.30pm & 2.15pm" becomes "13:30 / 14:15").
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

const LONDON_TZ = 'Europe/London';

/** "1970-01-01T03:52:00.000Z" + "2026-09-08" -> "04:52" (BST). Winter stays GMT. */
function toHHMM(iso, dateStr) {
  if (!iso) return '';
  const m = /T(\d{2}):(\d{2})/.exec(String(iso));
  if (!m || !dateStr) return '';
  const utc = new Date(`${dateStr}T${m[1]}:${m[2]}:00.000Z`);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(utc);
  const hh = parts.find((p) => p.type === 'hour')?.value;
  const mm = parts.find((p) => p.type === 'minute')?.value;
  return hh && mm ? `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}` : '';
}

function isFriday(dateStr) {
  const [y, mo, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).getUTCDay() === 5;
}

/** "Jummah: 1.30pm & 2.15pm" -> "13:30 / 14:15" */
function parseJummahSetting(value) {
  const times = [];
  const re = /(\d{1,2})[.:](\d{2})\s*(am|pm)/gi;
  let m;
  while ((m = re.exec(String(value || '')))) {
    let h = parseInt(m[1], 10);
    const ap = m[3].toLowerCase();
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    times.push(`${String(h).padStart(2, '0')}:${m[2]}`);
  }
  return times.join(' / ');
}

function assertLondonConversion() {
  const summer = toHHMM('1970-01-01T03:52:00.000Z', '2026-09-08');
  if (summer !== '04:52') throw new Error(`BST convert failed: ${summer}`);
  const winter = toHHMM('1970-01-01T06:43:00.000Z', '2026-01-01');
  if (winter !== '06:43') throw new Error(`GMT convert failed: ${winter}`);
  const jummah = parseJummahSetting('Jummah: 1.30pm & 2.15pm');
  if (jummah !== '13:30 / 14:15') throw new Error(`Jummah parse failed: ${jummah}`);
}

async function fetchJummahSetting() {
  const url = 'https://jalaliajaamemosque.org/api/public/settings';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for settings`);
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows.find((r) => r.key === 'jummah-times') : null;
  return parseJummahSetting(row?.value);
}

async function fetchMonth(monthNum, year) {
  const url = `https://jalaliajaamemosque.org/api/public/timetable/month?year=${year}&month=${monthNum}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for month ${monthNum}`);
  return res.json();
}

function convertMonth(entries, monthName, jummahFromSettings) {
  const prayerTimes = [];
  const iqamahTimes = [];
  let jummah = jummahFromSettings || '';

  for (const e of entries) {
    const d = /-(\d{2})$/.exec(e.date || '');
    const date = d ? parseInt(d[1], 10) : NaN;
    if (!Number.isFinite(date)) continue;
    const dateStr = e.date;
    if (!jummah && isFriday(dateStr) && e.zhurJamat) jummah = toHHMM(e.zhurJamat, dateStr);

    prayerTimes.push({
      date,
      fajr: toHHMM(e.fajrStart, dateStr),
      shurooq: toHHMM(e.sunrise, dateStr),
      dhuhr: toHHMM(e.zuhrStart, dateStr),
      asr: toHHMM(e.asrStart, dateStr),
      maghrib: toHHMM(e.magrib, dateStr),
      isha: toHHMM(e.ishaStart, dateStr)
    });
    iqamahTimes.push({
      date_range: String(date),
      fajr: toHHMM(e.fajrJamat, dateStr),
      dhuhr: toHHMM(e.zhurJamat, dateStr),
      asr: toHHMM(e.asrJamat, dateStr),
      maghrib: toHHMM(e.magrib, dateStr) || '',
      isha: toHHMM(e.ishaJamat, dateStr)
    });
  }

  return { month: monthName, prayer_times: prayerTimes, iqamah_times: iqamahTimes, jummah_iqamah: jummah };
}

async function main() {
  assertLondonConversion();
  const { citySlug, slug, country } = parseArgs(process.argv);
  const year = 2026;
  const jummahFromSettings = await fetchJummahSetting();
  if (!jummahFromSettings) console.error('No jummah-times setting; falling back to Friday zuhr jamat');
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
    const converted = convertMonth(entries, MONTH_NAMES[m - 1], jummahFromSettings);
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
