#!/usr/bin/env node
/**
 * Fetch full-year prayer times from the MasjidBox landing/athany JSON API
 * (7-day chunks). Used by mosques whose data lives on MasjidBox.
 *
 * Source: https://api.masjidbox.com/1.0/masjidbox/landing/athany/{slug}?get=at&days=7&begin={YYYY-MM-DD}
 *   header: apikey: <key>
 * Response entries carry date, fajr/sunrise/dhuhr/asr/maghrib/isha times
 * (ISO datetimes) and an iqamah block with per-prayer jamaat times.
 *
 * Usage:
 *   node scripts/fetch-masjidbox-timetable.mjs <slug> <apikey> <citySlug> <mosqueSlug>
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
  const [slug, apikey, citySlug, mosqueSlug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!slug || !apikey || !citySlug || !mosqueSlug) {
    console.error('Usage: node scripts/fetch-masjidbox-timetable.mjs <slug> <apikey> <citySlug> <mosqueSlug> [--country gb]');
    process.exit(1);
  }
  return { slug, apikey, citySlug, mosqueSlug, country };
}

/** "2026-08-09T03:55:00.000Z" or "03:55" -> "03:55" (keep local wall time as given) */
function toHHMM(iso) {
  if (!iso) return '';
  const m = /(\d{2}):(\d{2})/.exec(String(iso));
  return m ? `${m[1]}:${m[2]}` : '';
}

async function fetchChunk(slug, apikey, beginDate) {
  const url = `https://api.masjidbox.com/1.0/masjidbox/landing/athany/${slug}?get=at&days=7&begin=${beginDate}`;
  const res = await fetch(url, { headers: { apikey } });
  if (!res.ok) throw new Error(`HTTP ${res.status} at ${beginDate}`);
  return res.json();
}

function convertYear(daysByDate, year) {
  const months = [];
  for (let mi = 0; mi < 12; mi++) {
    const nDays = new Date(year, mi + 1, 0).getDate();
    const prayerTimes = [];
    const iqamahTimes = [];
    let jummah = '';
    for (let d = 1; d <= nDays; d++) {
      const key = `${year}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const slot = daysByDate.get(key);
      if (!slot) continue;
      if (!jummah && slot.jummah) jummah = slot.jummah;
      prayerTimes.push({
        date: d,
        fajr: slot.fajr,
        shurooq: slot.sunrise,
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

async function main() {
  const { slug, apikey, citySlug, mosqueSlug, country } = parseArgs(process.argv);
  const year = 2026;
  const outDir = mosqueDataFsDir(process.cwd(), mosqueSlug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  const daysByDate = new Map();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  let cursor = new Date(start);

  while (cursor <= end) {
    const begin = cursor.toISOString().slice(0, 10);
    console.log(`Fetching chunk from ${begin}...`);
    let json;
    try {
      json = await fetchChunk(slug, apikey, begin);
    } catch (err) {
      console.error(`  ${err.message}`);
      break;
    }
    const list = Array.isArray(json) ? json : json.timetable || json.data || json.days || [];
    let added = 0;
    for (const item of list) {
      const raw = item.date || item.day || '';
      const d = typeof raw === 'string' ? raw.slice(0, 10) : '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      if (!d.startsWith(String(year))) continue;
      const f = item.fajr, z = item.dhuhr, a = item.asr, mg = item.maghrib, is = item.isha;
      const iq = item.iqamah || item.jamaah || {};
      daysByDate.set(d, {
        fajr: toHHMM(typeof f === 'string' ? f : f?.time || f?.begins),
        sunrise: toHHMM(typeof item.sunrise === 'string' ? item.sunrise : item.sunrise?.time),
        dhuhr: toHHMM(typeof z === 'string' ? z : z?.time || z?.begins),
        asr: toHHMM(typeof a === 'string' ? a : a?.time || a?.begins),
        maghrib: toHHMM(typeof mg === 'string' ? mg : mg?.time || mg?.begins),
        isha: toHHMM(typeof is === 'string' ? is : is?.time || is?.begins),
        iFajr: toHHMM(iq.fajr), iDhuhr: toHHMM(iq.dhuhr),
        iAsr: toHHMM(iq.asr), iMaghrib: toHHMM(iq.maghrib), iIsha: toHHMM(iq.isha),
        jummah: toHHMM(iq.jumuah || iq.jummah)
      });
      added++;
    }
    console.log(`  +${added} days`);
    cursor = new Date(cursor.getTime() + 7 * 86400000);
  }

  const months = convertYear(daysByDate, year);
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
