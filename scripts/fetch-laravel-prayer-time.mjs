#!/usr/bin/env node
/**
 * Fetch full-year prayer times from a Laravel multi-tenant prayer-times platform
 * (used by several Oldham mosques). Each site exposes a POST /api/prayer-time
 * endpoint authenticated with a static bearer token embedded in the page HTML.
 *
 * Source: POST {baseUrl}/api/prayer-time
 *   headers: Authorization: Bearer <token>, Content-Type: application/json
 *   body: {"month":N,"year":2026}
 * Response: { data: { web: [{ date, fajr:{begin,jamah,sunrise}, zuhr:{begin,jamah},
 *   asr:{...}, maghrib:{...}, isha:{...} }, ...] } }
 *
 * Usage:
 *   node scripts/fetch-laravel-prayer-time.mjs <baseUrl> <token> <citySlug> <slug>
 *   node scripts/fetch-laravel-prayer-time.mjs https://mmic.org.uk ZXlK... oldham madina-masjid-and-islamic-centre
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
  const [baseUrl, token, citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!baseUrl || !token || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-laravel-prayer-time.mjs <baseUrl> <token> <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { baseUrl, token, citySlug, slug, country };
}

function toHHMM(s) {
  if (!s || s === '') return '';
  const m = /(\d{1,2}):(\d{2})/.exec(String(s));
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Laravel platform times are 12h without suffix: fajr/sunrise are AM, all other prayers are PM. */
function parse12hNoSuffix(s, pm) {
  const t = String(s || '').trim().toLowerCase();
  // Some entries carry two jamaat times "12:30/1:15" — take the first.
  const first = t.split('/')[0].trim();
  const m12 = first.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    if (m12[3] === 'pm' && h !== 12) h += 12;
    if (m12[3] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m12[2]}`;
  }
  const m = first.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  if (pm) {
    if (h !== 12) h += 12; // 1-11 PM
  } else {
    if (h === 12) h = 0; // 12 AM
  }
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

async function fetchMonth(baseUrl, token, monthNum, year) {
  const res = await fetch(`${baseUrl}/api/prayer-time`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ month: monthNum, year })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for month ${monthNum}`);
  return res.json();
}

function convertMonth(json, monthName) {
  const web = json.data?.web || json.data || [];
  const prayerTimes = [];
  const iqamahTimes = [];
  let jummah = '';

  for (const d of web) {
    const date = parseInt(d.date, 10);
    if (!Number.isFinite(date)) continue;
    const f = d.fajr || {};
    const z = d.zuhr || {};
    const a = d.asr || {};
    const mg = d.maghrib || {};
    const is = d.isha || {};

    if (!jummah && z.jamah) jummah = parse12hNoSuffix(z.jamah, true);

    prayerTimes.push({
      date,
      fajr: parse12hNoSuffix(f.begin, false),
      shurooq: parse12hNoSuffix(f.sunrise || f.shurooq, false),
      dhuhr: parse12hNoSuffix(z.begin, true),
      asr: parse12hNoSuffix(a.begin, true),
      maghrib: parse12hNoSuffix(mg.begin, true),
      isha: parse12hNoSuffix(is.begin, true)
    });
    iqamahTimes.push({
      date_range: String(date),
      fajr: parse12hNoSuffix(f.jamah, false),
      dhuhr: parse12hNoSuffix(z.jamah, true),
      asr: parse12hNoSuffix(a.jamah, true),
      maghrib: parse12hNoSuffix(mg.jamah, true) || parse12hNoSuffix(mg.begin, true),
      isha: parse12hNoSuffix(is.jamah, true)
    });
  }

  return { month: monthName, prayer_times: prayerTimes, iqamah_times: iqamahTimes, jummah_iqamah: jummah };
}

async function main() {
  const { baseUrl, token, citySlug, slug, country } = parseArgs(process.argv);
  const year = 2026;
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  for (let m = 1; m <= 12; m++) {
    console.log(`Fetching ${MONTH_NAMES[m - 1]}...`);
    let json;
    try {
      json = await fetchMonth(baseUrl, token, m, year);
    } catch (err) {
      console.error(`  SKIP ${MONTH_NAMES[m - 1]}: ${err.message}`);
      continue;
    }
    const converted = convertMonth(json, MONTH_NAMES[m - 1]);
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
