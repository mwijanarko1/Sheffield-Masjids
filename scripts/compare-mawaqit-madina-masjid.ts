/**
 * Fetch prayer times from mawaqit.net for Madina Masjid Sheffield and compare
 * with local JSON files. Show detailed iqamah comparison.
 *
 * Run: npx tsx scripts/compare-mawaqit-madina-masjid.ts
 */

import * as fs from "fs";
import * as path from "path";

const MAWAQIT_URL = "https://mawaqit.net/en/madina-masjid-sheffield-sheffield-s8-0zu-united-kingdom";
const MOSQUE_DIR = "public/data/mosques/madina-masjid-sheffield";

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const MONTH_NAMES_UPPER = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

// Mawaqit uses objects with day numbers as keys for each month
type MawaqitMonthData = { [day: string]: string[] };

interface MawaqitConfData {
  calendar: MawaqitMonthData[];
  iqamaCalendar: MawaqitMonthData[];
  jumua: string;
  shuruq: string;
  times: string[];
}

interface LocalPrayerTime {
  date: number;
  fajr: string;
  shurooq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface LocalIqamahTime {
  date_range: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface LocalMonthData {
  month: string;
  prayer_times: LocalPrayerTime[];
  iqamah_times: LocalIqamahTime[];
  jummah_iqamah: string;
}

function formatTimeFromMawaqit(time: string): string {
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  return `${hours}:${minutes}`;
}

async function fetchMawaqitData(): Promise<MawaqitConfData> {
  console.log("Fetching data from mawaqit.net...");
  
  const response = await fetch(MAWAQIT_URL);
  const html = await response.text();
  
  const confDataMatch = html.match(/let confData = ({[^;]+});/);
  if (!confDataMatch) {
    throw new Error("Could not find confData in mawaqit.net response");
  }
  
  const confData: MawaqitConfData = JSON.parse(confDataMatch[1]);
  console.log(`  ✓ Found calendar data for ${confData.calendar.length} months`);
  console.log(`  ✓ Found iqamaCalendar data for ${confData.iqamaCalendar.length} months`);
  console.log(`  ✓ Jumu'ah time: ${confData.jumua}`);
  
  return confData;
}

function loadLocalMonthData(month: string): LocalMonthData | null {
  const filePath = path.join(process.cwd(), MOSQUE_DIR, `${month}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function getLocalIqamahForDay(localData: LocalMonthData, day: number): LocalIqamahTime | null {
  for (const iqamah of localData.iqamah_times) {
    const parts = iqamah.date_range.split("-").map(n => parseInt(n.trim()));
    const start = parts[0];
    const end = parts.length > 1 ? parts[1] : start;
    
    if (day >= start && day <= end) {
      return iqamah;
    }
  }
  return null;
}

function getDaysInMonth(monthData: MawaqitMonthData): number {
  return Object.keys(monthData).length;
}

function compareIqamahDetailed(
  monthIndex: number,
  localData: LocalMonthData,
  mawaqitIqamaCalendar: MawaqitMonthData
): void {
  const monthName = MONTH_NAMES_UPPER[monthIndex];
  const daysCount = getDaysInMonth(mawaqitIqamaCalendar);
  
  console.log(`\n${monthName} Iqamah Times Comparison:`);
  console.log("Day | Local Fajr | Mawaqit Fajr | Local Dhuhr | Mawaqit Dhuhr | Local Asr | Mawaqit Asr | Local Maghrib | Mawaqit Maghrib | Local Isha | Mawaqit Isha");
  console.log("-".repeat(140));
  
  // Show first 5 days and a few in the middle
  const daysToShow = [1, 2, 3, 4, 5, 15, 20, 25, daysCount];
  
  for (const day of daysToShow) {
    if (day > daysCount) continue;
    
    const mawaqitTimes = mawaqitIqamaCalendar[day.toString()];
    const localIqamah = getLocalIqamahForDay(localData, day);
    
    if (!localIqamah) {
      console.log(`${day} | No local iqamah data`);
      continue;
    }
    
    if (!mawaqitTimes) {
      console.log(`${day} | No mawaqit iqamah data`);
      continue;
    }
    
    // Mawaqit order: fajr, dhuhr, asr, maghrib, isha
    const mFajr = formatTimeFromMawaqit(mawaqitTimes[0]);
    const mDhuhr = formatTimeFromMawaqit(mawaqitTimes[1]);
    const mAsr = formatTimeFromMawaqit(mawaqitTimes[2]);
    const mMaghrib = mawaqitTimes[3]; // May be "sunset"
    const mIsha = formatTimeFromMawaqit(mawaqitTimes[4]);
    
    const lFajr = localIqamah.fajr;
    const lDhuhr = localIqamah.dhuhr;
    const lAsr = localIqamah.asr;
    const lMaghrib = localIqamah.maghrib;
    const lIsha = localIqamah.isha;
    
    // Highlight differences
    const fajrDiff = lFajr !== mFajr ? "⚠️" : "";
    const dhuhrDiff = lDhuhr !== mDhuhr ? "⚠️" : "";
    const asrDiff = lAsr !== mAsr ? "⚠️" : "";
    const maghribDiff = lMaghrib !== mMaghrib ? "⚠️" : "";
    const ishaDiff = lIsha !== mIsha ? "⚠️" : "";
    
    console.log(
      `${day.toString().padStart(3)} | ` +
      `${lFajr.padEnd(11)} | ${mFajr.padEnd(12)}${fajrDiff} | ` +
      `${lDhuhr.padEnd(11)} | ${mDhuhr.padEnd(13)}${dhuhrDiff} | ` +
      `${lAsr.padEnd(9)} | ${mAsr.padEnd(11)}${asrDiff} | ` +
      `${lMaghrib.padEnd(13)} | ${mMaghrib.padEnd(15)}${maghribDiff} | ` +
      `${lIsha.padEnd(10)} | ${mIsha.padEnd(11)}${ishaDiff}`
    );
  }
}

function countIqamahDifferences(
  localData: LocalMonthData,
  mawaqitIqamaCalendar: MawaqitMonthData
): number {
  let differences = 0;
  
  for (const [dayStr, mawaqitTimes] of Object.entries(mawaqitIqamaCalendar)) {
    const day = parseInt(dayStr);
    const localIqamah = getLocalIqamahForDay(localData, day);
    
    if (!localIqamah) continue;
    
    const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
    
    for (let i = 0; i < prayers.length; i++) {
      const mawaqitValue = i === 3 ? mawaqitTimes[3] : formatTimeFromMawaqit(mawaqitTimes[i]);
      const localValue = localIqamah[prayers[i]];
      
      if (mawaqitValue !== localValue) {
        differences++;
      }
    }
  }
  
  return differences;
}

async function main() {
  console.log("=== Mawaqit.net vs Local JSON Comparison for Madina Masjid Sheffield ===\n");
  
  const mawaqitData = await fetchMawaqitData();
  
  // Compare iqamah times in detail
  console.log("\n=== Iqamah Times Detailed Comparison ===");
  
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthName = MONTH_NAMES[monthIndex];
    const localData = loadLocalMonthData(monthName);
    
    if (!localData) {
      console.log(`\n${MONTH_NAMES_UPPER[monthIndex]}: No local file`);
      continue;
    }
    
    const mawaqitIqamaCalendar = mawaqitData.iqamaCalendar[monthIndex];
    
    if (!mawaqitIqamaCalendar) {
      console.log(`\n${MONTH_NAMES_UPPER[monthIndex]}: No mawaqit data`);
      continue;
    }
    
    compareIqamahDetailed(monthIndex, localData, mawaqitIqamaCalendar);
  }
  
  // Summary of iqamah differences
  console.log("\n\n=== Summary of Iqamah Differences ===");
  
  let totalDifferences = 0;
  
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthName = MONTH_NAMES[monthIndex];
    const localData = loadLocalMonthData(monthName);
    
    if (!localData) continue;
    
    const mawaqitIqamaCalendar = mawaqitData.iqamaCalendar[monthIndex];
    if (!mawaqitIqamaCalendar) continue;
    
    const monthDifferences = countIqamahDifferences(localData, mawaqitIqamaCalendar);
    
    if (monthDifferences > 0) {
      console.log(`${MONTH_NAMES_UPPER[monthIndex]}: ${monthDifferences} differences`);
      totalDifferences += monthDifferences;
    }
  }
  
  if (totalDifferences === 0) {
    console.log("✓ All iqamah times match!");
  } else {
    console.log(`\nTotal differences found: ${totalDifferences}`);
  }
  
  // Jummah comparison
  console.log("\n=== Jumu'ah Time ===");
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const localData = loadLocalMonthData(MONTH_NAMES[monthIndex]);
    if (localData) {
      console.log(`Local: ${localData.jummah_iqamah}, Mawaqit: ${mawaqitData.jumua}`);
      break;
    }
  }
}

main().catch(console.error);
