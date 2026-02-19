/**
 * Update SGM JSON files with official adhan times from docs/sgm-adhan.md
 * Run: npx tsx scripts/update-sgm-adhan.ts
 */

import * as fs from "fs";
import * as path from "path";

const SGM_ADHAN = path.join(process.cwd(), "docs", "sgm-adhan.md");
const SGM_DIR = path.join(process.cwd(), "public", "data", "mosques", "sheffield-grand-mosque");

interface AdhanRow {
  date: number;
  month: number;
  year: number;
  fajr: string;
  shurooq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

function parseSgmAdhan(): AdhanRow[] {
  const content = fs.readFileSync(SGM_ADHAN, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const rows: AdhanRow[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parts = line.split(/\t/);
    if (parts.length < 8) continue;
    const dateStr = parts[0].trim();
    const [d, m, y] = dateStr.split("/").map(Number);
    if (!d || !m || !y) continue;

    const key = `${y}-${m}-${d}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      date: d,
      month: m,
      year: y,
      fajr: parts[2].trim(),
      shurooq: parts[3].trim(),
      dhuhr: parts[4].trim(),
      asr: parts[5].trim(),
      maghrib: parts[6].trim(),
      isha: parts[7].trim(),
    });
  }
  return rows;
}

const MONTH_NAMES: Record<number, string> = {
  1: "january", 2: "february", 3: "march", 4: "april", 5: "may", 6: "june",
  7: "july", 8: "august", 9: "september", 10: "october", 11: "november", 12: "december",
};

function main() {
  const allRows = parseSgmAdhan();
  const byMonth = new Map<number, AdhanRow[]>();
  for (const r of allRows) {
    if (!byMonth.has(r.month)) byMonth.set(r.month, []);
    byMonth.get(r.month)!.push(r);
  }

  for (let m = 1; m <= 12; m++) {
    const monthRows = byMonth.get(m) ?? [];
    const filePath = path.join(SGM_DIR, `${MONTH_NAMES[m]}.json`);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    if (monthRows.length > 0) {
      data.prayer_times = monthRows
        .sort((a, b) => a.date - b.date)
        .map((r) => ({
          date: r.date,
          fajr: r.fajr,
          shurooq: r.shurooq,
          dhuhr: r.dhuhr,
          asr: r.asr,
          maghrib: r.maghrib,
          isha: r.isha,
        }));
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated ${MONTH_NAMES[m]}.json (${monthRows.length} days)`);
    } else {
      console.log(`Skipped ${MONTH_NAMES[m]}.json (no data in sgm-adhan.md)`);
    }
  }

  const ramadanPath = path.join(SGM_DIR, "ramadan.json");
  if (fs.existsSync(ramadanPath)) {
    const ramadanData = JSON.parse(fs.readFileSync(ramadanPath, "utf-8"));
    const ramadanStart = new Date(ramadanData.gregorian_start);
    const ramadanEnd = new Date(ramadanData.gregorian_end);
    const dayMs = 24 * 60 * 60 * 1000;
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const rows: { ramadan_day: number; gregorian: string; fajr: string; shurooq: string; dhuhr: string; asr: string; maghrib: string; isha: string }[] = [];

    for (let d = new Date(ramadanStart); d <= ramadanEnd; d.setTime(d.getTime() + dayMs)) {
      const date = d.getDate();
      const month = d.getMonth() + 1;
      const row = allRows.find((r) => r.date === date && r.month === month);
      if (row) {
        const ramadanDay = Math.floor((d.getTime() - ramadanStart.getTime()) / dayMs) + 1;
        rows.push({
          ramadan_day: ramadanDay,
          gregorian: `${monthNames[month - 1]} ${date}`,
          fajr: row.fajr,
          shurooq: row.shurooq,
          dhuhr: row.dhuhr,
          asr: row.asr,
          maghrib: row.maghrib,
          isha: row.isha,
        });
      }
    }
    ramadanData.prayer_times = rows;
    fs.writeFileSync(ramadanPath, JSON.stringify(ramadanData, null, 2));
    console.log(`Updated ramadan.json (${rows.length} days)`);
  }

  console.log("\nDone.");
}

main();
