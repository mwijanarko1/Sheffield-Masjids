#!/usr/bin/env node
/**
 * Fetch prayer times from BD5 Masjid (Amanahfy / Next.js site).
 * SSR embeds one month in __NEXT_DATA__ on /prayer-times (current month only).
 *
 * Usage:
 *   node scripts/fetch-bd5-masjid-timetable.mjs
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

function parse12h(s) {
  const t = String(s || '').trim();
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

async function fetchPrayerTimes() {
  const res = await fetch('https://www.bd5masjid.com/prayer-times');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('__NEXT_DATA__ not found');
  const data = JSON.parse(m[1]);
  const pt = data?.props?.pageProps?.prayerTimes;
  if (!pt?.times?.length) throw new Error('prayerTimes missing in pageProps');
  return pt;
}

function toMonthJson(pt) {
  const monthIdx = Number(pt.monthOfYear);
  if (!Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    throw new Error(`Unexpected monthOfYear: ${pt.monthOfYear}`);
  }
  const prayerTimes = [];
  const iqamahTimes = [];
  let jummah = '';
  for (const row of pt.times) {
    const date = parseInt(row.date, 10);
    prayerTimes.push({
      date,
      fajr: parse12h(row.fajrStart),
      shurooq: parse12h(row.sunrise),
      dhuhr: parse12h(row.zuhrStart),
      asr: parse12h(row.asrStart || row.asr),
      maghrib: parse12h(row.maghribStart),
      isha: parse12h(row.ishaStart || row.isha)
    });
    iqamahTimes.push({
      date_range: String(date),
      fajr: parse12h(row.fajr),
      dhuhr: parse12h(row.zuhr),
      asr: parse12h(row.asr),
      maghrib: parse12h(row.maghrib),
      isha: parse12h(row.isha)
    });
  }
  if (Array.isArray(pt.jummah) && pt.jummah[0]) {
    jummah = parse12h(pt.jummah[0]);
  }
  return {
    month: MONTH_NAMES[monthIdx],
    prayer_times: prayerTimes,
    iqamah_times: iqamahTimes,
    jummah_iqamah: jummah
  };
}

async function main() {
  const citySlug = 'bradford';
  const slug = 'bd5-masjid';
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: 'gb', citySlug });
  mkdirSync(outDir, { recursive: true });

  const pt = await fetchPrayerTimes();
  const monthJson = toMonthJson(pt);
  const file = MONTH_FILES[pt.monthOfYear];
  if (!file) throw new Error(`No file for monthOfYear ${pt.monthOfYear}`);
  const outPath = `${outDir}/${file}.json`;
  writeFileSync(outPath, JSON.stringify(monthJson, null, 2));
  console.log(`Wrote ${outPath} (${monthJson.prayer_times.length} days, jummah ${monthJson.jummah_iqamah})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
