#!/usr/bin/env node
/**
 * Fetch full-year prayer times from a my-masjid.com timingscreen API.
 *
 * Source: https://time.my-masjid.com/api/TimingsInfoScreen/GetMasjidMultipleTimings?GuidId={guid}
 * JSON: model.salahTimings[] — each entry has a date, and per-prayer salahTime + iqamahTime.
 *
 * Usage:
 *   node scripts/fetch-my-masjid-timetable.mjs <guid> <citySlug> <slug> [--country gb]
 *   node scripts/fetch-my-masjid-timetable.mjs c131327c-ffda-4b50-9877-7608239a2bf6 west-bromwich sandwell-grand-masjid
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
  const [guid, citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!guid || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-my-masjid-timetable.mjs <guid> <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { guid, citySlug, slug, country };
}

async function fetchTimings(guid) {
  const url = `https://time.my-masjid.com/api/TimingsInfoScreen/GetMasjidMultipleTimings?GuidId=${guid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toHHMM(s) {
  if (!s || s === '0' || s === '') return '';
  const m = /(\d{1,2}):(\d{2})/.exec(String(s));
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/** Normalize a 12h string like "1:15 PM" / "12:05 AM" / already "13:05" to HH:MM. */
function toHHMM12(s) {
  const t = String(s || '').trim();
  const m12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    if (m12[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m12[2]}`;
  }
  return toHHMM(t);
}

function daysInMonth(monthNum, year) {
  return new Date(year, monthNum, 0).getDate();
}

function convertYear(json, year) {
  const timings = json.model?.salahTimings || json.salahTimings || [];
  const byMonth = Array.from({ length: 12 }, () => ({}));
  let jummah = '';
  if (json.model?.jumahSalahIqamahTimings) {
    const jt = Array.isArray(json.model.jumahSalahIqamahTimings)
      ? json.model.jumahSalahIqamahTimings[0]
      : json.model.jumahSalahIqamahTimings;
    jummah = toHHMM12(jt?.iqamahTime || jt?.salahTime || '');
  }

  for (const t of timings) {
    const mo = parseInt(t.month, 10);
    const d = parseInt(t.day, 10);
    if (!Number.isFinite(mo) || !Number.isFinite(d)) continue;
    const pick = (prayers) => (Array.isArray(prayers) ? prayers[0] : prayers) || {};

    const f = pick(t.fajr);
    const z = pick(t.zuhr);
    const a = pick(t.asr);
    const mg = pick(t.maghrib);
    const is = pick(t.isha);

    const slot = {
      fajr: toHHMM12(f.salahTime), dhuhr: toHHMM12(z.salahTime),
      asr: toHHMM12(a.salahTime), maghrib: toHHMM12(mg.salahTime),
      isha: toHHMM12(is.salahTime),
      iFajr: toHHMM12(f.iqamahTime), iDhuhr: toHHMM12(z.iqamahTime),
      iAsr: toHHMM12(a.iqamahTime), iMaghrib: toHHMM12(mg.iqamahTime),
      iIsha: toHHMM12(is.iqamahTime)
    };
    if (slot.fajr) byMonth[mo - 1][d] = slot;
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
        shurooq: '',
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
        maghrib: slot.iMaghrib || slot.maghrib,
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
  const { guid, citySlug, slug, country } = parseArgs(process.argv);
  const year = 2026;
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  console.log(`Fetching timings for ${guid}...`);
  const json = await fetchTimings(guid);
  const months = convertYear(json, year);

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
