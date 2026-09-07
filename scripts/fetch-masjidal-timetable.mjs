#!/usr/bin/env node
/**
 * Fetch full-year prayer times from masjidal.com range API.
 *
 * Source: https://masjidal.com/api/v1/time/range?masjid_id={id}&masjid_detail=yes&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD
 * Response: data.salah[] (adhan) + data.iqamah[] (jamaat) keyed by date string.
 *
 * Usage:
 *   node scripts/fetch-masjidal-timetable.mjs <masjidId> <citySlug> <slug> [--country gb]
 *   node scripts/fetch-masjidal-timetable.mjs z0AWYBKj scarborough scarborough-islamic-centre
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
  const [masjidId, citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!masjidId || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-masjidal-timetable.mjs <masjidId> <citySlug> <slug> [--country gb]');
    process.exit(1);
  }
  return { masjidId, citySlug, slug, country };
}

function toHHMM(s) {
  const t = String(s || '').trim();
  const m12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    if (m12[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m12[2]}`;
  }
  const m24 = t.match(/(\d{1,2}):(\d{2})/);
  return m24 ? `${m24[1].padStart(2, '0')}:${m24[2]}` : '';
}

function parseDateLabel(label) {
  const m = /([A-Za-z]+),\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})/.exec(String(label));
  if (!m) return null;
  const monthMap = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
  };
  const mo = monthMap[m[2].slice(0, 3).toLowerCase()];
  const day = parseInt(m[3], 10);
  const year = parseInt(m[4], 10);
  if (!mo || !day || !year) return null;
  return { year, month: mo, day };
}

function daysInMonth(monthNum, year) {
  return new Date(year, monthNum, 0).getDate();
}

function convertYear(json, year) {
  const salah = json.data?.salah || [];
  const iqamah = json.data?.iqamah || [];
  const iqByDate = new Map(iqamah.map((row) => [row.date, row]));
  const byMonth = Array.from({ length: 12 }, () => ({}));
  let jummah = '';

  for (const row of salah) {
    const parsed = parseDateLabel(row.date);
    if (!parsed || parsed.year !== year) continue;
    const iq = iqByDate.get(row.date) || {};
    if (!jummah && iq.jummah1) jummah = toHHMM(iq.jummah1);
    byMonth[parsed.month - 1][parsed.day] = {
      fajr: toHHMM(row.fajr),
      shurooq: toHHMM(row.sunrise),
      dhuhr: toHHMM(row.zuhr),
      asr: toHHMM(row.asr),
      maghrib: toHHMM(row.maghrib),
      isha: toHHMM(row.isha),
      iFajr: toHHMM(iq.fajr),
      iDhuhr: toHHMM(iq.zuhr),
      iAsr: toHHMM(iq.asr),
      iMaghrib: toHHMM(iq.maghrib) || toHHMM(row.maghrib),
      iIsha: toHHMM(iq.isha)
    };
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

async function fetchYear(masjidId, year) {
  const url = `https://masjidal.com/api/v1/time/range?masjid_id=${encodeURIComponent(masjidId)}&masjid_detail=yes&from_date=${year}-01-01&to_date=${year}-12-31`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const { masjidId, citySlug, slug, country } = parseArgs(process.argv);
  const year = 2026;
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  console.log(`Fetching masjidal timings for ${masjidId}...`);
  const json = await fetchYear(masjidId, year);
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
