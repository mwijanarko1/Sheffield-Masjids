/**
 * Generate Croydon ICT prayer time files from OCR-extracted timetable data.
 * 
 * Run: cd /path/to/project && tsx scripts/generate-croydon-ict.ts
 */
import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const adhan = require("adhan");

const COORDS = new adhan.Coordinates(51.3776, -0.1022);
const OUT_DIR = path.join(
  process.cwd(),
  "public/data/mosques/gb/london/croydon-ict"
);

const MONTH_NAMES = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];
const MONTH_UPPER = [
  "JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER",
];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];
const JUMMAH_IQAMAH = "13:15";

function pad2(n: number): string { return n.toString().padStart(2, "0"); }

function fmt(t: Date): string {
  return t.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

// OCR-extracted data: [gregMonth, gregDay] -> { fajr, fajrJamat, shurooq, dhuhr, dhuhrJamat, asr, asrJamat, maghrib, isha, ishaJamat }
type DayData = {
  fajr: string; fajrJamat: string; shurooq: string;
  dhuhr: string; dhuhrJamat: string;
  asr: string; asrJamat: string;
  maghrib: string;
  isha: string; ishaJamat: string;
};

type PrayerTime = { date: number; fajr: string; shurooq: string; dhuhr: string; asr: string; maghrib: string; isha: string };
type IqamahTime = { date_range: string; fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string };
type MonthResult = { prayerTimes: PrayerTime[]; iqamahTimes: IqamahTime[] };

function fixTime(t: string): string {
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const h = parseInt(m[1]);
  const min = m[2];
  return `${pad2(h)}:${min}`;
}

// Full data from June 2026 image (Dhul Hijjah 1447)
const june2026Data = {
  "2026-05-18": { fajr: "03:16", fajrJamat: "04:00", shurooq: "05:02", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:11", asrJamat: "17:30", maghrib: "20:53", isha: "22:04", ishaJamat: "22:30" },
  "2026-05-19": { fajr: "03:13", fajrJamat: "04:00", shurooq: "05:00", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:12", asrJamat: "17:30", maghrib: "20:55", isha: "22:07", ishaJamat: "22:30" },
  "2026-05-20": { fajr: "03:12", fajrJamat: "04:00", shurooq: "04:59", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:12", asrJamat: "17:30", maghrib: "20:56", isha: "22:08", ishaJamat: "22:30" },
  "2026-05-21": { fajr: "03:10", fajrJamat: "04:00", shurooq: "04:58", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:13", asrJamat: "17:30", maghrib: "20:58", isha: "22:10", ishaJamat: "22:30" },
  "2026-05-22": { fajr: "03:08", fajrJamat: "03:45", shurooq: "04:56", dhuhr: "13:02", dhuhrJamat: "13:15", asr: "17:13", asrJamat: "17:30", maghrib: "20:59", isha: "22:12", ishaJamat: "22:30" },
  "2026-05-23": { fajr: "03:06", fajrJamat: "03:45", shurooq: "04:55", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:14", asrJamat: "17:30", maghrib: "21:00", isha: "22:13", ishaJamat: "22:30" },
  "2026-05-24": { fajr: "03:04", fajrJamat: "03:45", shurooq: "04:54", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:15", asrJamat: "17:30", maghrib: "21:02", isha: "22:15", ishaJamat: "22:30" },
  "2026-05-25": { fajr: "03:02", fajrJamat: "03:45", shurooq: "04:53", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:15", asrJamat: "17:30", maghrib: "21:03", isha: "22:17", ishaJamat: "22:30" },
  "2026-05-26": { fajr: "03:01", fajrJamat: "03:45", shurooq: "04:52", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:16", asrJamat: "17:30", maghrib: "21:04", isha: "22:18", ishaJamat: "22:30" },
  "2026-05-27": { fajr: "02:59", fajrJamat: "03:45", shurooq: "04:51", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:16", asrJamat: "17:30", maghrib: "21:06", isha: "22:20", ishaJamat: "22:30" },
  "2026-05-28": { fajr: "02:58", fajrJamat: "03:45", shurooq: "04:50", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:17", asrJamat: "17:30", maghrib: "21:07", isha: "22:22", ishaJamat: "22:30" },
  "2026-05-29": { fajr: "02:56", fajrJamat: "03:30", shurooq: "04:49", dhuhr: "13:03", dhuhrJamat: "13:15", asr: "17:17", asrJamat: "17:30", maghrib: "21:08", isha: "22:23", ishaJamat: "22:45" },
  "2026-05-30": { fajr: "02:55", fajrJamat: "03:30", shurooq: "04:48", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:18", asrJamat: "17:30", maghrib: "21:09", isha: "22:24", ishaJamat: "22:45" },
  "2026-05-31": { fajr: "02:53", fajrJamat: "03:30", shurooq: "04:47", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:18", asrJamat: "17:30", maghrib: "21:10", isha: "22:26", ishaJamat: "22:45" },
  "2026-06-01": { fajr: "02:52", fajrJamat: "03:30", shurooq: "04:46", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:18", asrJamat: "17:30", maghrib: "21:11", isha: "22:27", ishaJamat: "22:45" },
  "2026-06-02": { fajr: "02:50", fajrJamat: "03:30", shurooq: "04:45", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:19", asrJamat: "17:30", maghrib: "21:12", isha: "22:29", ishaJamat: "22:45" },
  "2026-06-03": { fajr: "02:50", fajrJamat: "03:30", shurooq: "04:45", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:19", asrJamat: "17:30", maghrib: "21:13", isha: "22:30", ishaJamat: "22:45" },
  "2026-06-04": { fajr: "02:48", fajrJamat: "03:30", shurooq: "04:44", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:20", asrJamat: "17:30", maghrib: "21:14", isha: "22:31", ishaJamat: "22:45" },
  "2026-06-05": { fajr: "02:47", fajrJamat: "03:15", shurooq: "04:43", dhuhr: "13:04", dhuhrJamat: "13:15", asr: "17:20", asrJamat: "17:45", maghrib: "21:15", isha: "22:33", ishaJamat: "22:45" },
  "2026-06-06": { fajr: "02:46", fajrJamat: "03:15", shurooq: "04:43", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:21", asrJamat: "17:45", maghrib: "21:16", isha: "22:34", ishaJamat: "22:45" },
  "2026-06-07": { fajr: "02:45", fajrJamat: "03:15", shurooq: "04:42", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:21", asrJamat: "17:45", maghrib: "21:17", isha: "22:35", ishaJamat: "22:45" },
  "2026-06-08": { fajr: "02:44", fajrJamat: "03:15", shurooq: "04:42", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:21", asrJamat: "17:45", maghrib: "21:18", isha: "22:36", ishaJamat: "22:45" },
  "2026-06-09": { fajr: "02:43", fajrJamat: "03:15", shurooq: "04:41", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:22", asrJamat: "17:45", maghrib: "21:19", isha: "22:38", ishaJamat: "22:45" },
  "2026-06-10": { fajr: "02:42", fajrJamat: "03:15", shurooq: "04:41", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:22", asrJamat: "17:45", maghrib: "21:20", isha: "22:39", ishaJamat: "22:45" },
  "2026-06-11": { fajr: "02:42", fajrJamat: "03:15", shurooq: "04:41", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:23", asrJamat: "17:45", maghrib: "21:20", isha: "22:40", ishaJamat: "22:45" },
  "2026-06-12": { fajr: "02:40", fajrJamat: "03:00", shurooq: "04:40", dhuhr: "13:06", dhuhrJamat: "13:15", asr: "17:23", asrJamat: "17:45", maghrib: "21:21", isha: "22:41", ishaJamat: "23:00" },
  "2026-06-13": { fajr: "02:39", fajrJamat: "03:00", shurooq: "04:40", dhuhr: "13:06", dhuhrJamat: "13:30", asr: "17:23", asrJamat: "17:45", maghrib: "21:22", isha: "22:43", ishaJamat: "23:00" },
  "2026-06-14": { fajr: "02:39", fajrJamat: "03:00", shurooq: "04:40", dhuhr: "13:06", dhuhrJamat: "13:30", asr: "17:24", asrJamat: "17:45", maghrib: "21:22", isha: "22:43", ishaJamat: "23:00" },
  "2026-06-15": { fajr: "02:39", fajrJamat: "03:00", shurooq: "04:40", dhuhr: "13:06", dhuhrJamat: "13:30", asr: "17:24", asrJamat: "17:45", maghrib: "21:23", isha: "22:44", ishaJamat: "23:00" },
  "2026-06-16": { fajr: "02:39", fajrJamat: "03:00", shurooq: "04:40", dhuhr: "13:06", dhuhrJamat: "13:30", asr: "17:24", asrJamat: "17:45", maghrib: "21:23", isha: "22:44", ishaJamat: "23:00" },
} satisfies Record<string, DayData>;

// Full data from May 2026 image (Dhul Qadah 1447)
const may2026Data = {
  "2026-04-19": { fajr: "04:21", fajrJamat: "05:00", shurooq: "05:54", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "16:52", asrJamat: "17:15", maghrib: "20:07", isha: "21:21", ishaJamat: "21:30" },
  "2026-04-20": { fajr: "04:19", fajrJamat: "05:00", shurooq: "05:52", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "16:53", asrJamat: "17:15", maghrib: "20:09", isha: "21:23", ishaJamat: "21:30" },
  "2026-04-21": { fajr: "04:15", fajrJamat: "05:00", shurooq: "05:49", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "16:54", asrJamat: "17:15", maghrib: "20:10", isha: "21:24", ishaJamat: "21:30" },
  "2026-04-24": { fajr: "04:08", fajrJamat: "04:45", shurooq: "05:43", dhuhr: "13:04", dhuhrJamat: "13:15", asr: "16:56", asrJamat: "17:15", maghrib: "20:15", isha: "21:28", ishaJamat: "21:45" },
  "2026-04-27": { fajr: "04:01", fajrJamat: "04:45", shurooq: "05:37", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "16:58", asrJamat: "17:15", maghrib: "20:20", isha: "21:32", ishaJamat: "21:45" },
  "2026-04-28": { fajr: "03:59", fajrJamat: "04:45", shurooq: "05:35", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "16:59", asrJamat: "17:15", maghrib: "20:22", isha: "21:34", ishaJamat: "21:45" },
  "2026-04-30": { fajr: "03:55", fajrJamat: "04:45", shurooq: "05:32", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:00", asrJamat: "17:15", maghrib: "20:25", isha: "21:36", ishaJamat: "21:45" },
  "2026-05-02": { fajr: "03:50", fajrJamat: "04:30", shurooq: "05:28", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:01", asrJamat: "17:15", maghrib: "20:29", isha: "21:40", ishaJamat: "22:00" },
  "2026-05-03": { fajr: "03:47", fajrJamat: "04:30", shurooq: "05:26", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:02", asrJamat: "17:15", maghrib: "20:30", isha: "21:41", ishaJamat: "22:00" },
  "2026-05-05": { fajr: "03:42", fajrJamat: "04:30", shurooq: "05:22", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:03", asrJamat: "17:15", maghrib: "20:33", isha: "21:44", ishaJamat: "22:00" },
  "2026-05-06": { fajr: "03:41", fajrJamat: "04:30", shurooq: "05:21", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:04", asrJamat: "17:15", maghrib: "20:35", isha: "21:46", ishaJamat: "22:00" },
  "2026-05-07": { fajr: "03:38", fajrJamat: "04:30", shurooq: "05:19", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:05", asrJamat: "17:15", maghrib: "20:37", isha: "21:48", ishaJamat: "22:00" },
  "2026-05-08": { fajr: "03:36", fajrJamat: "04:15", shurooq: "05:17", dhuhr: "13:02", dhuhrJamat: "13:15", asr: "17:05", asrJamat: "17:30", maghrib: "20:38", isha: "21:49", ishaJamat: "22:15" },
  "2026-05-10": { fajr: "03:32", fajrJamat: "04:15", shurooq: "05:14", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:07", asrJamat: "17:30", maghrib: "20:41", isha: "21:52", ishaJamat: "22:15" },
  "2026-05-12": { fajr: "03:28", fajrJamat: "04:15", shurooq: "05:11", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:08", asrJamat: "17:30", maghrib: "20:44", isha: "21:55", ishaJamat: "22:15" },
  "2026-05-13": { fajr: "03:25", fajrJamat: "04:15", shurooq: "05:09", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:08", asrJamat: "17:30", maghrib: "20:46", isha: "21:56", ishaJamat: "22:15" },
  "2026-05-14": { fajr: "03:23", fajrJamat: "04:15", shurooq: "05:07", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:09", asrJamat: "17:30", maghrib: "20:48", isha: "21:58", ishaJamat: "22:15" },
  "2026-05-15": { fajr: "03:21", fajrJamat: "04:00", shurooq: "05:06", dhuhr: "13:02", dhuhrJamat: "13:15", asr: "17:10", asrJamat: "17:30", maghrib: "20:49", isha: "21:59", ishaJamat: "22:15" },
  "2026-05-16": { fajr: "03:20", fajrJamat: "04:00", shurooq: "05:05", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:10", asrJamat: "17:30", maghrib: "20:51", isha: "22:02", ishaJamat: "22:15" },
} satisfies Record<string, DayData>;

// Full data from May 2025 image (Dhul Qadah 1446)
const may2025Data = {
  "2025-04-29": { fajr: "03:57", fajrJamat: "04:30", shurooq: "05:33", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:00", asrJamat: "17:15", maghrib: "20:24", isha: "21:35", ishaJamat: "21:45" },
  "2025-04-30": { fajr: "03:54", fajrJamat: "04:30", shurooq: "05:31", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:00", asrJamat: "17:15", maghrib: "20:26", isha: "21:37", ishaJamat: "21:45" },
  "2025-05-01": { fajr: "03:51", fajrJamat: "04:30", shurooq: "05:29", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:01", asrJamat: "17:15", maghrib: "20:27", isha: "21:38", ishaJamat: "21:45" },
  "2025-05-02": { fajr: "03:49", fajrJamat: "04:15", shurooq: "05:27", dhuhr: "13:02", dhuhrJamat: "13:15", asr: "17:02", asrJamat: "17:30", maghrib: "20:29", isha: "21:49", ishaJamat: "22:00" },
  "2025-05-03": { fajr: "03:47", fajrJamat: "04:15", shurooq: "05:26", dhuhr: "13:02", dhuhrJamat: "13:30", asr: "17:02", asrJamat: "17:30", maghrib: "20:31", isha: "21:42", ishaJamat: "22:00" },
  "2025-05-04": { fajr: "03:45", fajrJamat: "04:15", shurooq: "05:24", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:03", asrJamat: "17:30", maghrib: "20:32", isha: "21:43", ishaJamat: "22:00" },
  "2025-05-05": { fajr: "03:42", fajrJamat: "04:15", shurooq: "05:22", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:04", asrJamat: "17:30", maghrib: "20:34", isha: "21:45", ishaJamat: "22:00" },
  "2025-05-06": { fajr: "03:40", fajrJamat: "04:15", shurooq: "05:20", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:04", asrJamat: "17:30", maghrib: "20:35", isha: "21:46", ishaJamat: "22:00" },
  "2025-05-07": { fajr: "03:37", fajrJamat: "04:15", shurooq: "05:18", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:05", asrJamat: "17:30", maghrib: "20:37", isha: "21:48", ishaJamat: "22:00" },
  "2025-05-08": { fajr: "03:36", fajrJamat: "04:15", shurooq: "05:17", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:05", asrJamat: "17:30", maghrib: "20:39", isha: "21:50", ishaJamat: "22:00" },
  "2025-05-09": { fajr: "03:33", fajrJamat: "04:00", shurooq: "05:15", dhuhr: "13:03", dhuhrJamat: "13:15", asr: "17:06", asrJamat: "17:30", maghrib: "20:40", isha: "21:51", ishaJamat: "22:15" },
  "2025-05-10": { fajr: "03:31", fajrJamat: "04:00", shurooq: "05:13", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:07", asrJamat: "17:30", maghrib: "20:42", isha: "21:53", ishaJamat: "22:15" },
  "2025-05-11": { fajr: "03:29", fajrJamat: "04:00", shurooq: "05:12", dhuhr: "13:03", dhuhrJamat: "13:30", asr: "17:07", asrJamat: "17:30", maghrib: "20:43", isha: "21:54", ishaJamat: "22:15" },
  "2025-05-12": { fajr: "03:27", fajrJamat: "04:00", shurooq: "05:10", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:08", asrJamat: "17:30", maghrib: "20:45", isha: "21:56", ishaJamat: "22:15" },
  "2025-05-13": { fajr: "03:25", fajrJamat: "04:00", shurooq: "05:09", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:08", asrJamat: "17:30", maghrib: "20:46", isha: "21:56", ishaJamat: "22:15" },
  "2025-05-14": { fajr: "03:23", fajrJamat: "04:00", shurooq: "05:07", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:09", asrJamat: "17:30", maghrib: "20:48", isha: "21:58", ishaJamat: "22:15" },
  "2025-05-15": { fajr: "03:21", fajrJamat: "04:00", shurooq: "05:06", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:10", asrJamat: "17:45", maghrib: "20:49", isha: "21:59", ishaJamat: "22:15" },
  "2025-05-16": { fajr: "03:19", fajrJamat: "03:45", shurooq: "05:04", dhuhr: "13:04", dhuhrJamat: "13:15", asr: "17:10", asrJamat: "17:45", maghrib: "20:51", isha: "22:02", ishaJamat: "22:15" },
  "2025-05-17": { fajr: "03:17", fajrJamat: "03:45", shurooq: "05:03", dhuhr: "13:04", dhuhrJamat: "13:30", asr: "17:11", asrJamat: "17:45", maghrib: "20:52", isha: "22:03", ishaJamat: "22:15" },
  "2025-05-18": { fajr: "03:15", fajrJamat: "03:45", shurooq: "05:01", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:11", asrJamat: "17:45", maghrib: "20:54", isha: "22:05", ishaJamat: "22:15" },
  "2025-05-20": { fajr: "03:12", fajrJamat: "03:45", shurooq: "04:59", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:13", asrJamat: "17:45", maghrib: "20:57", isha: "22:09", ishaJamat: "22:15" },
  "2025-05-21": { fajr: "03:09", fajrJamat: "03:45", shurooq: "04:57", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:13", asrJamat: "17:45", maghrib: "20:58", isha: "22:10", ishaJamat: "22:15" },
  "2025-05-22": { fajr: "03:08", fajrJamat: "03:45", shurooq: "04:56", dhuhr: "13:05", dhuhrJamat: "13:30", asr: "17:14", asrJamat: "17:45", maghrib: "20:59", isha: "22:12", ishaJamat: "22:15" },
  "2025-05-23": { fajr: "03:06", fajrJamat: "03:30", shurooq: "04:55", dhuhr: "13:06", dhuhrJamat: "13:15", asr: "17:14", asrJamat: "17:45", maghrib: "21:01", isha: "22:14", ishaJamat: "22:30" },
  "2025-05-24": { fajr: "03:04", fajrJamat: "03:30", shurooq: "04:54", dhuhr: "13:06", dhuhrJamat: "13:30", asr: "17:15", asrJamat: "17:45", maghrib: "21:02", isha: "22:15", ishaJamat: "22:30" },
  "2025-05-25": { fajr: "03:02", fajrJamat: "03:30", shurooq: "04:53", dhuhr: "13:06", dhuhrJamat: "13:30", asr: "17:15", asrJamat: "17:45", maghrib: "21:03", isha: "22:17", ishaJamat: "22:30" },
  "2025-05-26": { fajr: "03:01", fajrJamat: "03:30", shurooq: "04:52", dhuhr: "13:06", dhuhrJamat: "13:30", asr: "17:16", asrJamat: "17:45", maghrib: "21:05", isha: "22:19", ishaJamat: "22:30" },
  "2025-05-27": { fajr: "02:59", fajrJamat: "03:30", shurooq: "04:51", dhuhr: "13:07", dhuhrJamat: "13:30", asr: "17:16", asrJamat: "17:45", maghrib: "21:06", isha: "22:20", ishaJamat: "22:30" },
  "2025-05-28": { fajr: "02:58", fajrJamat: "03:30", shurooq: "04:50", dhuhr: "13:07", dhuhrJamat: "13:30", asr: "17:17", asrJamat: "17:45", maghrib: "21:07", isha: "22:22", ishaJamat: "22:30" },
} satisfies Record<string, DayData>;

// Merge all OCR data into one map
const ocrData = {
  ...june2026Data,
  ...may2026Data,
  ...may2025Data,
} satisfies Record<string, DayData>;

function addMinutes(timeStr: string, minutes: number): string {
  if (!timeStr) return timeStr;
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad2(Math.floor(total / 60) % 24)}:${pad2(total % 60)}`;
}

function roundToNearest(timeStr: string, nearest: number): string {
  if (!timeStr) return timeStr;
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m;
  const rounded = Math.round(total / nearest) * nearest;
  return `${pad2(Math.floor(rounded / 60) % 24)}:${pad2(rounded % 60)}`;
}

function calculateMonth(params: {
  month: number;
  year: number;
  ocrData: Record<string, DayData>;
}): MonthResult {
  const { month, year, ocrData } = params;
  const days = month === 2 && year === 2024 ? 29 : DAYS_IN_MONTH[month - 1];
  const prayerTimes: PrayerTime[] = [];
  const iqamahTimes: IqamahTime[] = [];

  for (let day = 1; day <= days; day++) {
    const key = `${year}-${pad2(month)}-${pad2(day)}`;
    const ocrEntry = ocrData[key];

    let fajr: string, shurooq: string, dhuhr: string, asr: string, maghrib: string, isha: string;
    let fajrJamat: string, dhuhrJamat: string, asrJamat: string, maghribJamat: string, ishaJamat: string;

    if (ocrEntry) {
      // Use OCR data directly
      fajr = fixTime(ocrEntry.fajr);
      shurooq = fixTime(ocrEntry.shurooq);
      dhuhr = fixTime(ocrEntry.dhuhr);
      asr = fixTime(ocrEntry.asr);
      maghrib = fixTime(ocrEntry.maghrib);
      isha = fixTime(ocrEntry.isha);
      fajrJamat = fixTime(ocrEntry.fajrJamat);
      dhuhrJamat = fixTime(ocrEntry.dhuhrJamat);
      asrJamat = fixTime(ocrEntry.asrJamat);
      maghribJamat = fixTime(ocrEntry.maghrib);
      ishaJamat = fixTime(ocrEntry.ishaJamat);
    } else {
      // Use adhan calculation
      const date = new Date(year, month - 1, day);
      const params = adhan.CalculationMethod.MoonsightingCommittee();
      params.madhab = adhan.Madhab.Shafi;
      const pt = new adhan.PrayerTimes(COORDS, date, params);

      fajr = fmt(pt.fajr);
      shurooq = fmt(pt.sunrise);
      dhuhr = fmt(pt.dhuhr);
      asr = fmt(pt.asr);
      maghrib = fmt(pt.maghrib);
      isha = fmt(pt.isha);

      // Iqamah: estimated based on typical patterns
      fajrJamat = roundToNearest(addMinutes(fajr, 35), 5);
      dhuhrJamat = "13:30";
      asrJamat = roundToNearest(addMinutes(asr, 16), 15);
      maghribJamat = maghrib;
      ishaJamat = roundToNearest(addMinutes(isha, 12), 5);
    }

    prayerTimes.push({
      date: day,
      fajr,
      shurooq,
      dhuhr,
      asr,
      maghrib,
      isha,
    });

    iqamahTimes.push({
      date_range: String(day),
      fajr: fajrJamat,
      dhuhr: dhuhrJamat,
      asr: asrJamat,
      maghrib: maghribJamat,
      isha: ishaJamat,
    });
  }

  return { prayerTimes, iqamahTimes };
}

// Generate all 12 months for 2026
fs.mkdirSync(OUT_DIR, { recursive: true });

for (let m = 1; m <= 12; m++) {
  const { prayerTimes, iqamahTimes } = calculateMonth({
    month: m,
    year: 2026,
    ocrData,
  });

  const monthData = {
    month: MONTH_UPPER[m - 1],
    prayer_times: prayerTimes,
    iqamah_times: iqamahTimes,
    jummah_iqamah: JUMMAH_IQAMAH,
  };

  const filePath = path.join(OUT_DIR, `${MONTH_NAMES[m - 1]}.json`);
  fs.writeFileSync(filePath, JSON.stringify(monthData, null, 2));
  console.log(`✓ ${MONTH_NAMES[m - 1]} (${prayerTimes.length} days)`);
}

// Verify day 23 May 2026
const mayFile = path.join(OUT_DIR, "may.json");
const mayData = JSON.parse(fs.readFileSync(mayFile, "utf-8"));
const pt23 = mayData.prayer_times.find((d: any) => d.date === 23);
const it23 = mayData.iqamah_times.find((d: any) => d.date_range === "23");
console.log(`\nVerification - May 23, 2026:`);
console.log(`  Prayer: ${JSON.stringify(pt23)}`);
console.log(`  Iqamah: ${JSON.stringify(it23)}`);
console.log(`  Match OCR: fajr=${pt23.fajr === "03:06" ? "✓" : "✗"} sunrise=${pt23.shurooq === "04:55" ? "✓" : "✗"} dhuhr=${pt23.dhuhr === "13:02" ? "✓" : "✗"}`);
console.log(`\nDone!`);
