#!/usr/bin/env node
/**
 * Fetches Masjid Sunnah Sheffield prayer times from the mosque WordPress AJAX
 * timetable (the REST `filter=month` endpoint returns April for every month).
 *
 * Source: https://masjidsunnahsheffield.co.uk/wp-admin/admin-ajax.php?action=get_monthly_timetable&month=N
 * (HTML table: Fajr / Zuhr / Asr / Maghrib / Isha — begins + iqamah per prayer.)
 */

import { writeFileSync, mkdirSync } from 'fs';

const AJAX_URL =
  'https://masjidsunnahsheffield.co.uk/wp-admin/admin-ajax.php?action=get_monthly_timetable';
const OUTPUT_DIR = 'public/data/mosques/masjid-sunnah-sheffield';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

function stripTdInner(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** "5:21 am" | "1:10 pm" | "10:02 pm" -> HH:MM (24h) */
function parse12hToHHMM(s) {
  const t = s.trim().toLowerCase();
  const m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
  if (!m) return '00:00';
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = m[3];
  if (ap === 'pm' && h !== 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function toHHMM(timeStr) {
  if (!timeStr) return '00:00';
  const parts = String(timeStr).split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

/**
 * Each data row: Date, Day, Fajr beg/iq, Sunrise, Zuhr beg/iq, Asr beg/iq, Maghrib beg/iq, Isha beg/iq
 * -> 13 cells
 */
function parseTimetableHtml(html, monthNum) {
  const rows = [];
  const trRe = /<tr[^>]*>\s*([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRe.exec(html)) !== null) {
    const inner = trMatch[1];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdMatch;
    while ((tdMatch = tdRe.exec(inner)) !== null) {
      tds.push(stripTdInner(tdMatch[1]));
    }
    if (tds.length < 13) continue;
    const dayNum = parseInt(/^(\d+)/.exec(tds[0])?.[1] ?? '', 10);
    if (!Number.isFinite(dayNum)) continue;
    const yearFromCell = /(20\d{2})/.exec(tds[0])?.[1];

    rows.push({
      date: dayNum,
      yearFromCell,
      weekday: tds[1],
      fajr: parse12hToHHMM(tds[2]),
      shurooq: parse12hToHHMM(tds[4]),
      dhuhr: parse12hToHHMM(tds[5]),
      asr: parse12hToHHMM(tds[7]),
      maghrib: parse12hToHHMM(tds[9]),
      isha: parse12hToHHMM(tds[11]),
      fajr_jamah: parse12hToHHMM(tds[3]),
      zuhr_jamah: parse12hToHHMM(tds[6]),
      asr_jamah: parse12hToHHMM(tds[8]),
      isha_jamah: parse12hToHHMM(tds[12])
    });
  }

  rows.sort((a, b) => a.date - b.date);

  const pad = String(monthNum).padStart(2, '0');
  const year =
    rows[0]?.yearFromCell && /^\d{4}$/.test(rows[0].yearFromCell)
      ? rows[0].yearFromCell
      : String(new Date().getFullYear());
  return rows.map((r) => {
    const { yearFromCell: _y, ...rest } = r;
    return {
      ...rest,
      d_date: `${year}-${pad}-${String(r.date).padStart(2, '0')}`
    };
  });
}

async function fetchMonthHtml(month) {
  const url = `${AJAX_URL}&month=${month}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Month ${month}: HTTP ${res.status}`);
  return res.text();
}

function groupIqamahRanges(days) {
  const ranges = [];
  let rangeStart = null;
  let prevKey = null;
  let prevData = null;

  for (const day of days) {
    const key = `${day.fajr_jamah}|${day.zuhr_jamah}|${day.asr_jamah}|${day.isha_jamah}`;
    if (prevKey !== null && key !== prevKey) {
      const endDate = day.date - 1;
      ranges.push({
        date_range: rangeStart === endDate ? `${rangeStart}` : `${rangeStart}-${endDate}`,
        fajr: toHHMM(prevData.fajr_jamah),
        dhuhr: toHHMM(prevData.zuhr_jamah),
        asr: toHHMM(prevData.asr_jamah),
        isha: toHHMM(prevData.isha_jamah)
      });
      rangeStart = day.date;
    } else if (prevKey === null) {
      rangeStart = day.date;
    }
    prevKey = key;
    prevData = day;
  }
  if (prevData) {
    ranges.push({
      date_range: rangeStart === prevData.date ? `${rangeStart}` : `${rangeStart}-${prevData.date}`,
      fajr: toHHMM(prevData.fajr_jamah),
      dhuhr: toHHMM(prevData.zuhr_jamah),
      asr: toHHMM(prevData.asr_jamah),
      isha: toHHMM(prevData.isha_jamah)
    });
  }
  return ranges;
}

function firstFridayZuhrJamah(days) {
  const fri = days.find((d) => d.weekday.toLowerCase() === 'friday');
  return fri?.zuhr_jamah ?? null;
}

function convertToProjectFormat(days, monthName) {
  const iqamahRanges = groupIqamahRanges(
    days.map((d) => ({
      date: d.date,
      fajr_jamah: d.fajr_jamah,
      zuhr_jamah: d.zuhr_jamah,
      asr_jamah: d.asr_jamah,
      isha_jamah: d.isha_jamah
    }))
  );

  const jummah = firstFridayZuhrJamah(days) || days[0]?.zuhr_jamah;

  return {
    month: monthName,
    prayer_times: days.map(({ date, fajr, shurooq, dhuhr, asr, maghrib, isha }) => ({
      date,
      fajr,
      shurooq,
      dhuhr,
      asr,
      maghrib,
      isha
    })),
    iqamah_times: iqamahRanges.map(({ date_range, fajr, dhuhr, asr, isha }) => ({
      date_range,
      fajr,
      dhuhr,
      asr,
      isha
    })),
    jummah_iqamah: toHHMM(jummah) || '12:45'
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const monthFiles = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  for (let m = 1; m <= 12; m++) {
    console.log(`Fetching ${MONTH_NAMES[m - 1]}...`);
    const html = await fetchMonthHtml(m);
    const days = parseTimetableHtml(html, m);
    if (days.length === 0) {
      throw new Error(`No timetable rows parsed for month ${m}`);
    }
    const converted = convertToProjectFormat(days, MONTH_NAMES[m - 1]);
    const outPath = `${OUTPUT_DIR}/${monthFiles[m - 1]}.json`;
    writeFileSync(outPath, JSON.stringify(converted, null, 0));
    console.log(`  Wrote ${outPath} (${days.length} days)`);
  }

  console.log('\nDone. Masjid Sunnah Sheffield timetable saved (admin-ajax HTML).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
