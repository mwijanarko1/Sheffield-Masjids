#!/usr/bin/env node
/**
 * Converts docs/masjid-huda.md to masjid-al-huda-sheffield monthly JSON files.
 * Doc format: DATE FAJR_START FAJR_IQAAMAH SUNRISE DHUHUR_START DHUHUR_IQAAMAH ASR_START ASR_IQAAMAH MAGHRIB_START MAGHRIB_IQAAMAH ISHAA_START ISHAA_IQAAMAH JUMMAH
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOC_PATH = path.join(__dirname, '../docs/masjid-huda.md');
const OUTPUT_DIR = path.join(__dirname, '../public/data/mosques/masjid-al-huda-sheffield');

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function parseLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 13) return null;
  const [dateStr, fajr, fajrIq, sunrise, dhuhr, dhuhrIq, asr, asrIq, maghrib, maghribIq, isha, ishaIq, jummah] = parts;
  const [day, monthAbbr] = dateStr.split('-');
  const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const month = monthMap[monthAbbr];
  if (month === undefined) return null;
  return {
    date: parseInt(day, 10),
    month,
    fajr,
    fajrIqamah: fajrIq,
    shurooq: sunrise,
    dhuhr: dhuhr,
    dhuhrIqamah: dhuhrIq,
    asr,
    asrIqamah: asrIq,
    maghrib,
    maghribIqamah: maghribIq,
    isha,
    ishaIqamah: ishaIq,
    jummah
  };
}

function buildIqamahRanges(rows) {
  const ranges = [];
  let current = null;
  for (const row of rows) {
    const ishaVal = row.ishaIqamah === row.isha ? 'Entry Time' : row.ishaIqamah;
    const key = `${row.fajrIqamah}-${row.dhuhrIqamah}-${row.asrIqamah}-${ishaVal}`;
    if (!current || current.key !== key) {
      current = {
        key,
        start: row.date,
        fajr: row.fajrIqamah,
        dhuhr: row.dhuhrIqamah,
        asr: row.asrIqamah,
        isha: ishaVal,
        jummah: row.jummah
      };
      ranges.push(current);
    }
    current.end = row.date;
  }
  return ranges.map(r => ({
    date_range: r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`,
    fajr: r.fajr,
    dhuhr: r.dhuhr,
    asr: r.asr,
    isha: r.isha
  }));
}

function getJummahForMonth(rows) {
  return rows[0]?.jummah || '12:30';
}

function main() {
  const content = fs.readFileSync(DOC_PATH, 'utf-8');
  const lines = content.split('\n').slice(1);
  const allRows = [];
  for (const line of lines) {
    const row = parseLine(line);
    if (row) allRows.push(row);
  }

  const byMonth = {};
  for (const row of allRows) {
    if (!byMonth[row.month]) byMonth[row.month] = [];
    byMonth[row.month].push(row);
  }

  for (let m = 0; m < 12; m++) {
    const rows = byMonth[m] || [];
    if (rows.length === 0) continue;

    const prayer_times = rows
      .map(r => ({
        date: r.date,
        fajr: r.fajr,
        shurooq: r.shurooq,
        dhuhr: r.dhuhr,
        asr: r.asr,
        maghrib: r.maghrib,
        isha: r.isha
      }))
      .sort((a, b) => a.date - b.date);

    const iqamah_times = buildIqamahRanges(rows);
    const jummah_iqamah = getJummahForMonth(rows);

    const monthName = MONTH_NAMES[m].toUpperCase();
    const output = {
      month: monthName,
      prayer_times,
      iqamah_times,
      jummah_iqamah
    };

    const outPath = path.join(OUTPUT_DIR, `${MONTH_NAMES[m]}.json`);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
    console.log(`Wrote ${MONTH_NAMES[m]}.json`);
  }
}

main();
