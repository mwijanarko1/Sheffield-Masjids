#!/usr/bin/env node
/**
 * Fetch Masjid e Hamza Birmingham timetable from published prayer-times.json.
 * Source: https://masjidhamza.co.uk/prayer-times.json
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
  const [jsonUrl, citySlug, slug] = argv.slice(2);
  const countryIdx = argv.indexOf('--country');
  const country = countryIdx >= 0 ? argv[countryIdx + 1] : 'gb';
  if (!jsonUrl || !citySlug || !slug) {
    console.error('Usage: node scripts/fetch-masjid-hamza-json.mjs <jsonUrl> <citySlug> <slug>');
    process.exit(1);
  }
  return { jsonUrl, citySlug, slug, country };
}

function norm(t) {
  if (!t) return '';
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

async function main() {
  const { jsonUrl, citySlug, slug, country } = parseArgs(process.argv);
  const outDir = mosqueDataFsDir(process.cwd(), slug, { countryCode: country, citySlug });
  mkdirSync(outDir, { recursive: true });

  const res = await fetch(jsonUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const byMonth = Array.from({ length: 12 }, () => []);

  for (const row of data.schedule || []) {
    const [y, m, d] = row.date.split('-').map(Number);
    if (y !== 2026) continue;
    byMonth[m - 1].push({
      date: d,
      fajr: norm(row.fajr?.start),
      shurooq: norm(row.sunrise),
      dhuhr: norm(row.zuhr?.start),
      asr: norm(row.asr?.start),
      maghrib: norm(row.maghrib?.start),
      isha: norm(row.isha?.start),
      fajrIq: norm(row.fajr?.jamat),
      dhuhrIq: norm(row.zuhr?.jamat),
      asrIq: norm(row.asr?.jamat),
      maghribIq: norm(row.maghrib?.jamat) || norm(row.maghrib?.start),
      ishaIq: norm(row.isha?.jamat)
    });
  }

  for (let i = 0; i < 12; i++) {
    const days = byMonth[i].sort((a, b) => a.date - b.date);
    if (days.length === 0) {
      console.error(`SKIP ${MONTH_NAMES[i]}: no days`);
      continue;
    }
    const fri = days.find((d) => {
      const dt = new Date(2026, i, d.date);
      return dt.getDay() === 5;
    });
    const json = {
      month: MONTH_NAMES[i],
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
        fajr: d.fajrIq,
        dhuhr: d.dhuhrIq,
        asr: d.asrIq,
        maghrib: d.maghribIq,
        isha: d.ishaIq
      })),
      jummah_iqamah: fri?.dhuhrIq || days[0].dhuhrIq
    };
    const outPath = `${outDir}/${MONTH_FILES[i]}.json`;
    writeFileSync(outPath, JSON.stringify(json, null, 2));
    console.log(`Wrote ${outPath} (${days.length} days, jummah ${json.jummah_iqamah})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
