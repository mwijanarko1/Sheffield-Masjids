#!/usr/bin/env node
/**
 * Fetch full-year prayer times from a WordPress "Daily Prayer Time for Mosques"
 * (DPT) plugin admin-ajax endpoint.
 *
 * Source: {baseUrl}/wp-admin/admin-ajax.php?action=get_monthly_timetable&month={1..12}
 * (HTML table: per prayer Begins + Iqamah/Jamaat columns.)
 *
 * Usage:
 *   node scripts/fetch-dpt-timetable.mjs <adminAjaxBase> <citySlug> <slug> [--country gb]
 *   node scripts/fetch-dpt-timetable.mjs https://islamiccentrenottingham.org/wp-admin/admin-ajax.php nottingham islamic-centre-nottingham
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
  const [baseUrl, citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!baseUrl || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-dpt-timetable.mjs <adminAjaxBase> <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  const sep = baseUrl.includes('?') ? '&' : '?';
  return { baseUrl, citySlug, slug, country, sep };
}

function stripTdInner(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** "5:21 am" | "1:10 pm" | "06:37" (already 24h) -> HH:MM (24h) */
function parseTime(s) {
  const t = String(s).trim().toLowerCase();
  const m12 = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2];
    if (m12[3] === 'pm' && h !== 12) h += 12;
    if (m12[3] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  const m24 = t.match(/(\d{1,2}):(\d{2})/);
  if (m24) return `${m24[1].padStart(2, '0')}:${m24[2]}`;
  return '';
}

/**
 * Parse the DPT monthly table. Columns:
 * Date, Day, Fajr Begins, Fajr Iqamah, Sunrise, Zuhr Begins, Zuhr Iqamah,
 * Asr Begins, Asr Iqamah, Maghrib Begins, Maghrib Iqamah, Isha Begins, Isha Iqamah
 * -> 13 cells. Some tables lack maghrib iqamah (12 cells) — handled.
 */
function parseTimetableHtml(html) {
  const rows = [];
  const trRe = /<tr[^>]*>\s*([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(html)) !== null) {
    const inner = trMatch[1];
    if (!/<td/i.test(inner)) continue;
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    while ((tdMatch = tdRe.exec(inner)) !== null) tds.push(stripTdInner(tdMatch[1]));
    // Date formats seen in the wild: "1 January 2026", "1-11-2026", "Sun 1-11-2026",
    // "1 Rajab 1448", "Sun 1-11-2026 22 Jumādā al-Ula 1448" (hijri leaks into cell)
    let dayNum = parseInt(/^(\d{1,2})[-\s]/.exec(tds[0] || '')?.[1] ?? '', 10);
    if (!Number.isFinite(dayNum)) {
      const m2 = /^\w+\s+(\d{1,2})[-\s]/.exec(tds[0] || '');
      dayNum = m2 ? parseInt(m2[1], 10) : NaN;
    }
    if (!Number.isFinite(dayNum)) continue;
    const weekday = (tds[1] || '').trim();

    const fajr = parseTime(tds[2]);
    const fajrIqamah = parseTime(tds[3]);
    const shurooq = parseTime(tds[4]);
    const dhuhr = parseTime(tds[5]);
    const dhuhrIqamah = parseTime(tds[6]);
    const asr = parseTime(tds[7]);
    const asrIqamah = parseTime(tds[8]);
    const maghrib = parseTime(tds[9]);
    const maghribIqamah = parseTime(tds[10]);
    const isha = parseTime(tds[11]);
    const ishaIqamah = parseTime(tds[12]);

    rows.push({ date: dayNum, weekday, fajr, fajrIqamah, shurooq, dhuhr, dhuhrIqamah, asr, asrIqamah, maghrib, maghribIqamah, isha, ishaIqamah });
  }
  rows.sort((a, b) => a.date - b.date);
  return rows;
}

function convertToProjectFormat(days, monthName) {
  const prayerTimes = days.map((d) => ({
    date: d.date,
    fajr: d.fajr,
    shurooq: d.shurooq,
    dhuhr: d.dhuhr,
    asr: d.asr,
    maghrib: d.maghrib,
    isha: d.isha
  }));

  const iqamahTimes = days.map((d) => ({
    date_range: String(d.date),
    fajr: d.fajrIqamah,
    dhuhr: d.dhuhrIqamah,
    asr: d.asrIqamah,
    maghrib: d.maghribIqamah || d.maghrib,
    isha: d.ishaIqamah
  }));

  const fri = days.find((d) => /fri/i.test(d.weekday));
  const jummah = fri?.dhuhrIqamah || days[0]?.dhuhrIqamah || '';

  return {
    month: monthName,
    prayer_times: prayerTimes,
    iqamah_times: iqamahTimes,
    jummah_iqamah: jummah
  };
}

async function fetchMonthHtml(baseUrl, sep, month) {
  const url = `${baseUrl}${sep}action=get_monthly_timetable&month=${month}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Month ${month}: HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const { baseUrl, citySlug, slug, country, sep } = parseArgs(process.argv);
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  for (let m = 1; m <= 12; m++) {
    console.log(`Fetching ${MONTH_NAMES[m - 1]}...`);
    let html;
    try {
      html = await fetchMonthHtml(baseUrl, sep, m);
    } catch (err) {
      console.error(`  SKIP ${MONTH_NAMES[m - 1]}: ${err.message}`);
      continue;
    }
    const days = parseTimetableHtml(html);
    if (days.length === 0) {
      console.error(`  SKIP ${MONTH_NAMES[m - 1]}: no rows parsed`);
      continue;
    }
    const converted = convertToProjectFormat(days, MONTH_NAMES[m - 1]);
    const outPath = `${outDir}/${MONTH_FILES[m - 1]}.json`;
    writeFileSync(outPath, JSON.stringify(converted, null, 2));
    console.log(`  Wrote ${outPath} (${days.length} days, jummah ${converted.jummah_iqamah})`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
