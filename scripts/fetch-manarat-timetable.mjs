#!/usr/bin/env node
/**
 * Fetch full-year prayer times from Manarat Foundation HTML timetable pages.
 * Source: https://manaratfoundation.org.uk/prayer-timetable/?month={1..12}
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
    console.error('Usage: node scripts/fetch-manarat-timetable.mjs <baseUrl> <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { baseUrl, citySlug, slug, country };
}

function parseTime(s) {
  const t = String(s).trim().toLowerCase();
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = m[2];
  if (m[3] === 'pm' && h !== 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function parseTable(html) {
  const m = html.match(/<table class="prayer-table">([\s\S]*?)<\/table>/i);
  if (!m) return [];
  const rows = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(m[1])) !== null) {
    const inner = tr[1];
    if (!/<td/i.test(inner)) continue;
    const tds = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(inner)) !== null) {
      tds.push(td[1].replace(/<[^>]+>/g, '').trim());
    }
    if (tds.length < 12) continue;
    const day = parseInt(tds[0], 10);
    if (!Number.isFinite(day)) continue;
    rows.push({
      date: day,
      fajr: parseTime(tds[1]),
      fajrIqamah: parseTime(tds[2]),
      shurooq: parseTime(tds[3]),
      dhuhr: parseTime(tds[4]),
      dhuhrIqamah: parseTime(tds[5]),
      asr: parseTime(tds[6]),
      asrIqamah: parseTime(tds[7]),
      maghrib: parseTime(tds[8]),
      maghribIqamah: parseTime(tds[9]),
      isha: parseTime(tds[10]),
      ishaIqamah: parseTime(tds[11])
    });
  }
  return rows.sort((a, b) => a.date - b.date);
}

function jummahForMonth(monthIndex) {
  // Published: summer 1st 13:40, winter 1st 13:00 (Sep still summer timetable on site)
  return monthIndex >= 3 && monthIndex <= 9 ? '13:40' : '13:00';
}

function toMonthJson(days, monthName, monthIndex) {
  return {
    month: monthName,
    prayer_times: days.map((d) => ({
      date: d.date,
      fajr: d.fajr,
      shurooq: d.shurooq,
      dhuhr: d.dhuhr,
      asr: d.asr,
      maghrib: d.maghrib,
      isha: d.isha
    })),
    iqamah_times: days.map((d) => ({
      date_range: String(d.date),
      fajr: d.fajrIqamah,
      dhuhr: d.dhuhrIqamah,
      asr: d.asrIqamah,
      maghrib: d.maghribIqamah || d.maghrib,
      isha: d.ishaIqamah
    })),
    jummah_iqamah: jummahForMonth(monthIndex)
  };
}

async function main() {
  const { baseUrl, citySlug, slug, country } = parseArgs(process.argv);
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });
  const root = baseUrl.replace(/\/$/, '');

  for (let m = 1; m <= 12; m++) {
    const url = `${root}/prayer-timetable/?month=${m}`;
    console.log(`Fetching ${MONTH_NAMES[m - 1]}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Month ${m}: HTTP ${res.status}`);
    const html = await res.text();
    const days = parseTable(html);
    if (days.length === 0) {
      console.error(`  SKIP ${MONTH_NAMES[m - 1]}: no rows`);
      continue;
    }
    const json = toMonthJson(days, MONTH_NAMES[m - 1], m - 1);
    const outPath = `${outDir}/${MONTH_FILES[m - 1]}.json`;
    writeFileSync(outPath, JSON.stringify(json, null, 2));
    console.log(`  Wrote ${outPath} (${days.length} days, jummah ${json.jummah_iqamah})`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
