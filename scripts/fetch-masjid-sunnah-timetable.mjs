#!/usr/bin/env node
/**
 * Fetches Masjid Sunnah Sheffield prayer times from their website API
 * and converts to project JSON format.
 *
 * API: https://masjidsunnahsheffield.co.uk/wp-json/dpt/v1/prayertime?filter=month&month=N&year=Y
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const BASE_URL = 'https://masjidsunnahsheffield.co.uk/wp-json/dpt/v1/prayertime';
const OUTPUT_DIR = 'public/data/mosques/masjid-sunnah-sheffield';

const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

function toHHMM(timeStr) {
  if (!timeStr) return '00:00';
  const parts = timeStr.split(':');
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
}

function fetchMonth(month, year = 2026) {
  const url = `${BASE_URL}?filter=month&month=${month}&year=${year}`;
  const result = execSync(`curl -s "${url}"`, { encoding: 'utf-8' });
  const parsed = JSON.parse(result);
  return Array.isArray(parsed[0]) ? parsed[0] : parsed;
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

function convertToProjectFormat(apiDays, monthName) {
  const days = apiDays.map((d) => {
    const dateStr = d.d_date;
    const date = parseInt(dateStr.split('-')[2], 10);
    return {
      date,
      fajr: toHHMM(d.fajr_begins),
      shurooq: toHHMM(d.sunrise),
      dhuhr: toHHMM(d.zuhr_begins),
      asr: toHHMM(d.asr_mithl_1),
      maghrib: toHHMM(d.maghrib_begins),
      isha: toHHMM(d.isha_begins),
      fajr_jamah: d.fajr_jamah,
      zuhr_jamah: d.zuhr_jamah,
      asr_jamah: d.asr_jamah,
      isha_jamah: d.isha_jamah
    };
  });

  const iqamahRanges = groupIqamahRanges(
    days.map((d) => ({
      date: d.date,
      fajr_jamah: d.fajr_jamah,
      zuhr_jamah: d.zuhr_jamah,
      asr_jamah: d.asr_jamah,
      isha_jamah: d.isha_jamah
    }))
  );

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
    jummah_iqamah: toHHMM(days[0]?.zuhr_jamah) || '12:45'
  };
}

function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const monthFiles = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  for (let m = 1; m <= 12; m++) {
    console.log(`Fetching ${MONTH_NAMES[m - 1]}...`);
    const apiDays = fetchMonth(m);
    const converted = convertToProjectFormat(apiDays, MONTH_NAMES[m - 1]);
    const outPath = `${OUTPUT_DIR}/${monthFiles[m - 1]}.json`;
    writeFileSync(outPath, JSON.stringify(converted, null, 0));
    console.log(`  Wrote ${outPath}`);
  }

  console.log('\nDone. Masjid Sunnah Sheffield timetable saved.');
}

main();
