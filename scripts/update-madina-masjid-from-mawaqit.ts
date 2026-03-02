/**
 * Update Madina Masjid Sheffield JSON files with iqamah times from mawaqit.net
 * 
 * This script fetches the official iqamah times from mawaqit.net and updates
 * the local JSON files. The adhan times already match perfectly.
 *
 * Run: npx tsx scripts/update-madina-masjid-from-mawaqit.ts
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

function groupIqamahTimes(mawaqitIqamaCalendar: MawaqitMonthData): LocalIqamahTime[] {
  // Group consecutive days with same iqamah times
  const days = Object.keys(mawaqitIqamaCalendar)
    .map(k => parseInt(k))
    .sort((a, b) => a - b);
  
  const groups: LocalIqamahTime[] = [];
  let currentGroup: { start: number; end: number; times: string[] } | null = null;
  
  for (const day of days) {
    const times = mawaqitIqamaCalendar[day.toString()];
    const timesKey = times.join(",");
    
    if (currentGroup === null) {
      currentGroup = { start: day, end: day, times };
    } else if (currentGroup.times.join(",") === timesKey) {
      currentGroup.end = day;
    } else {
      // Save current group and start new one
      groups.push({
        date_range: currentGroup.start === currentGroup.end 
          ? `${currentGroup.start}` 
          : `${currentGroup.start}-${currentGroup.end}`,
        fajr: formatTimeFromMawaqit(currentGroup.times[0]),
        dhuhr: formatTimeFromMawaqit(currentGroup.times[1]),
        asr: formatTimeFromMawaqit(currentGroup.times[2]),
        maghrib: currentGroup.times[3], // Keep as-is (may be "sunset" or a time)
        isha: formatTimeFromMawaqit(currentGroup.times[4])
      });
      currentGroup = { start: day, end: day, times };
    }
  }
  
  // Don't forget the last group
  if (currentGroup !== null) {
    groups.push({
      date_range: currentGroup.start === currentGroup.end 
        ? `${currentGroup.start}` 
        : `${currentGroup.start}-${currentGroup.end}`,
      fajr: formatTimeFromMawaqit(currentGroup.times[0]),
      dhuhr: formatTimeFromMawaqit(currentGroup.times[1]),
      asr: formatTimeFromMawaqit(currentGroup.times[2]),
      maghrib: currentGroup.times[3],
      isha: formatTimeFromMawaqit(currentGroup.times[4])
    });
  }
  
  return groups;
}

function updateMonthFile(
  month: string,
  localData: LocalMonthData,
  mawaqitIqamaCalendar: MawaqitMonthData,
  jumua: string
): void {
  const filePath = path.join(process.cwd(), MOSQUE_DIR, `${month}.json`);
  
  // Update iqamah times with grouped data from mawaqit
  localData.iqamah_times = groupIqamahTimes(mawaqitIqamaCalendar);
  
  // Update jummah time
  localData.jummah_iqamah = jumua;
  
  // Write file
  fs.writeFileSync(filePath, JSON.stringify(localData, null, 2) + "\n");
}

async function main() {
  console.log("=== Update Madina Masjid Sheffield from Mawaqit.net ===\n");
  
  const mawaqitData = await fetchMawaqitData();
  
  console.log("\n=== Updating Local Files ===");
  
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthName = MONTH_NAMES[monthIndex];
    const localData = loadLocalMonthData(monthName);
    
    if (!localData) {
      console.log(`  ⚠ No local file for ${MONTH_NAMES_UPPER[monthIndex]}`);
      continue;
    }
    
    const mawaqitIqamaCalendar = mawaqitData.iqamaCalendar[monthIndex];
    
    if (!mawaqitIqamaCalendar) {
      console.log(`  ⚠ No mawaqit data for ${MONTH_NAMES_UPPER[monthIndex]}`);
      continue;
    }
    
    // Count iqamah groups
    const groups = groupIqamahTimes(mawaqitIqamaCalendar);
    
    updateMonthFile(monthName, localData, mawaqitIqamaCalendar, mawaqitData.jumua);
    console.log(`  ✓ Updated ${monthName}.json (${groups.length} iqamah groups)`);
  }
  
  console.log("\n✓ Done! All files have been updated with official iqamah times from mawaqit.net");
}

main().catch(console.error);
