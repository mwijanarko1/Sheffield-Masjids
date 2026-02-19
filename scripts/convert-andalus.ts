/**
 * Convert Andalus prayer timetable from complete JSON to monthly format.
 * Place source file at project root: andalus_prayer_timetable_2025_complete.json
 * (or update srcPath below). Output: public/data/mosques/andalus-community-centre/{month}.json
 *
 * Run: npx tsx scripts/convert-andalus.ts
 */

import * as fs from "fs";
import * as path from "path";

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function normalizeTime(t: string, isMidday = false): string {
  if (!t || !t.includes(":")) return t;
  let [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  if (h >= 1 && h <= 2 && isMidday) h += 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + mins;
  if (total < 0) total += 1440;
  total = total % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

interface AndalusDay {
  date: string;
  month: string;
  day: number;
  fajr_azan: string;
  fajr_iqama: string;
  dhuhr_azan: string;
  dhuhr_iqama: string;
  asr: string;
  maghrib: string;
  isha: string;
  friday_prayer: string;
}

interface MonthlyPayload {
  month: string;
  prayer_times: { date: number; fajr: string; shurooq: string; dhuhr: string; asr: string; maghrib: string; isha: string }[];
  iqamah_times: { date_range: string; fajr: string; dhuhr: string; asr: string; maghrib?: string; isha: string }[];
  jummah_iqamah: string;
}

function buildIqamahRanges(days: AndalusDay[]): { date_range: string; fajr: string; dhuhr: string; asr: string; maghrib?: string; isha: string }[] {
  const ranges: { start: number; end: number; fajr: string; dhuhr: string }[] = [];
  let current = { start: days[0].day, end: days[0].day, fajr: normalizeTime(days[0].fajr_iqama, false), dhuhr: normalizeTime(days[0].dhuhr_iqama, true) };

  for (let i = 1; i < days.length; i++) {
    const d = days[i];
    const f = normalizeTime(d.fajr_iqama, false);
    const dh = normalizeTime(d.dhuhr_iqama, true);
    if (f === current.fajr && dh === current.dhuhr && d.day === current.end + 1) {
      current.end = d.day;
    } else {
      ranges.push({ ...current });
      current = { start: d.day, end: d.day, fajr: f, dhuhr: dh };
    }
  }
  ranges.push(current);

  return ranges.map((r) => ({
    date_range: r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`,
    fajr: r.fajr,
    dhuhr: r.dhuhr,
    asr: "Entry Time",
    maghrib: "sunset",
    isha: "Entry Time",
  }));
}

function main() {
  const srcPath = path.join(process.cwd(), "andalus_prayer_timetable_2025_complete.json");
  const outDir = path.join(process.cwd(), "public", "data", "mosques", "andalus-community-centre");

  if (!fs.existsSync(srcPath)) {
    console.error("Source file not found:", srcPath);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const raw = fs.readFileSync(srcPath, "utf-8");
  const data = JSON.parse(raw) as { timetable: AndalusDay[] };
  const timetable = data.timetable;

  for (let monthNum = 1; monthNum <= 12; monthNum++) {
    const monthName = MONTH_NAMES[monthNum - 1];
    const days = timetable.filter((d) => {
      const [, m] = d.date.split("-").map(Number);
      return m === monthNum;
    });

    if (days.length === 0) {
      console.warn(`No data for ${monthName}`);
      continue;
    }

    const prayer_times = days.map((d) => {
      const fajr = normalizeTime(d.fajr_azan, false);
      const dhuhr = normalizeTime(d.dhuhr_azan, true);
      const shurooq = addMinutes(fajr, 125);
      return {
        date: d.day,
        fajr,
        shurooq,
        dhuhr,
        asr: normalizeTime(d.asr, true),
        maghrib: normalizeTime(d.maghrib, true),
        isha: normalizeTime(d.isha, true),
      };
    });

    const iqamah_times = buildIqamahRanges(days);
    const monthJummah = normalizeTime(days[0].friday_prayer, true);

    const payload: MonthlyPayload = {
      month: monthName.toUpperCase(),
      prayer_times,
      iqamah_times,
      jummah_iqamah: monthJummah,
    };

    const outPath = path.join(outDir, `${monthName}.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
    console.log(`  ✓ ${monthName}.json (${days.length} days, ${iqamah_times.length} iqamah ranges)`);
  }

  console.log("\nDone. Andalus Community Centre timetable written to", outDir);
}

main();
