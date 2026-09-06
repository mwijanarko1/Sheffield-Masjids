#!/usr/bin/env node
/**
 * Fetch full-year prayer times from Al-Medinah Mosque Brighton (Laravel tenant).
 * Zuhr *begin* can be before noon (e.g. 11:55) — generic fetch-laravel +12 breaks December.
 *
 * Usage: node scripts/fetch-al-medinah-timetable.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { mosqueDataFsDir } from './lib/mosque-data-path.mjs';

const TOKEN =
  'ZXlKMGVYQWlPaUpLVjFRaUxDSmhiR2NpT2lKSVV6STFOaUo5LmV5SnBjM01pT2lKb2RIUndjem92TDJGc2JXVmthVzVoYUM1amJ5NTFheTl3Y21GNVpYSXRkR2x0WlhNaUxDSnBZWFFpT2pFM09EZzJOVFl4TWpnc0ltVjRjQ0k2TVRjNE9USTJNRGt5T0N3aWJtSm1Jam94TnpnNE5qVTJNVEk0TENKcWRHa2lPaUp2UTI1SFdVTXdlblZ1UlZCM1JFUTNJaXdpYzNWaUlqb2lNU0lzSW5CeWRpSTZJakkyWmpkak9XWXpaRFUxTnpCaU5EWXpZek15WVRKbE5UbGpNMlk1TURBNFlURXhPR1F4WkRZaWZRLmd6dXFiclY5Zld5Mmp0QWRaOVRPRmNfdjhyXzNNcHdhUTRCT1ExTEpJejA=';
const BASE = 'https://almedinah.co.uk';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];
const MONTH_FILES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

/** 12h without suffix: AM prayers keep morning hours; afternoon prayers add 12 when hour 1–7. */
function parseTime(s, kind) {
  const first = String(s || '').trim().split('/')[0].trim();
  const m12 = first.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2];
    if (m12[3].toLowerCase() === 'pm' && h !== 12) h += 12;
    if (m12[3].toLowerCase() === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  const m = first.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = m[2];
  if (kind === 'fajr' || kind === 'sunrise') {
    if (h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  if (kind === 'zuhr_begin') {
    if (h >= 1 && h <= 7) h += 12;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  if (h >= 1 && h <= 7) h += 12;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function isPlaceholderRow(d) {
  const z = d.zuhr?.begin || '';
  return /^9:01$/.test(z) || /^10:01$/.test(z);
}

async function fetchMonth(monthNum, year) {
  const res = await fetch(`${BASE}/api/prayer-time`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ month: monthNum, year })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} month ${monthNum}`);
  return res.json();
}

function convertMonth(json, monthName) {
  const web = json.data?.web || [];
  const prayerTimes = [];
  const iqamahTimes = [];
  let jummah = '';

  for (const d of web) {
    if (isPlaceholderRow(d)) continue;
    const date = parseInt(d.date, 10);
    if (!Number.isFinite(date)) continue;
    const f = d.fajr || {};
    const z = d.zuhr || {};
    const a = d.asr || {};
    const mg = d.maghrib || {};
    const is = d.isha || {};

    if (!jummah && z.jamah) jummah = parseTime(z.jamah, 'zuhr_begin');

    prayerTimes.push({
      date,
      fajr: parseTime(f.begin, 'fajr'),
      shurooq: parseTime(f.sunrise, 'sunrise'),
      dhuhr: parseTime(z.begin, 'zuhr_begin'),
      asr: parseTime(a.begin, 'asr'),
      maghrib: parseTime(mg.begin, 'maghrib'),
      isha: parseTime(is.begin, 'isha')
    });
    iqamahTimes.push({
      date_range: String(date),
      fajr: parseTime(f.jamah, 'fajr'),
      dhuhr: parseTime(z.jamah, 'zuhr_begin'),
      asr: parseTime(a.jamah, 'asr'),
      maghrib: parseTime(mg.jamah, 'maghrib'),
      isha: parseTime(is.jamah, 'isha')
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
  const outDir = mosqueDataFsDir(process.cwd(), 'al-medinah-mosque', {
    countryCode: 'gb',
    citySlug: 'brighton'
  });
  mkdirSync(outDir, { recursive: true });
  const year = 2026;

  for (let mi = 0; mi < 12; mi++) {
    console.log(`Fetching ${MONTH_NAMES[mi]}...`);
    const json = await fetchMonth(mi + 1, year);
    const monthJson = convertMonth(json, MONTH_NAMES[mi]);
    const outPath = `${outDir}/${MONTH_FILES[mi]}.json`;
    writeFileSync(outPath, JSON.stringify(monthJson, null, 2));
    console.log(
      `  Wrote ${outPath} (${monthJson.prayer_times.length} days, jummah ${monthJson.jummah_iqamah})`
    );
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
