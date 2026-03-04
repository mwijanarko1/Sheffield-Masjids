/**
 * Convert various Ramadan timetable formats to canonical schema.
 * Reads from public/ (loose files), writes to public/data/mosques/[slug]/ramadan.json
 *
 * Run: bun scripts/convert-ramadan-timetables.ts
 */

import * as fs from "fs";
import * as path from "path";

const PUBLIC = path.join(process.cwd(), "public");
const MOSQUES_DIR = path.join(PUBLIC, "data", "mosques");

type PrayerTime = {
  ramadan_day: number;
  gregorian: string;
  fajr: string;
  shurooq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

type IqamahRange = {
  date_range: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib?: string;
  isha: string;
};

type CanonicalRamadan = {
  month: string;
  gregorian_start: string;
  gregorian_end: string;
  prayer_times: PrayerTime[];
  iqamah_times: IqamahRange[];
  jummah_iqamah: string;
};

function normalizeTime(t: string): string {
  if (!t || typeof t !== "string") return "12:00";
  const cleaned = t.replace(/\s*(AM|PM)\s*/gi, "").trim();
  let [h, m] = cleaned.split(/[:\s]/).map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) h = 12;
  if (Number.isNaN(m)) m = 0;
  if (h >= 1 && h <= 7 && !t.toLowerCase().includes("am") && !t.toLowerCase().includes("pm")) {
    if (["dhuhr", "zuhr", "zohar", "asar", "asr", "isha"].some((p) => t.includes(p))) {
      if (h < 8) h += 12;
    }
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function to24hr(t: string, preferPM = false): string {
  if (!t || typeof t !== "string") return "12:00";
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return normalizeTime(t);
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10) || 0;
  const ampm = m[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  else if (ampm === "AM" && h === 12) h = 0;
  else if (!ampm && preferPM && h >= 1 && h <= 7) h += 12;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function gregorianFromDay(day: number, startFeb18: boolean): string {
  if (startFeb18) {
    if (day <= 11) return `Feb ${17 + day}`;
    return `Mar ${day - 11}`;
  }
  if (day <= 10) return `Feb ${18 + day}`;
  if (day <= 28) return `Mar ${day - 10}`;
  return `Mar ${day - 10}`;
}

const MADINA_REF = JSON.parse(
  fs.readFileSync(path.join(MOSQUES_DIR, "madina-masjid-sheffield", "ramadan.json"), "utf-8")
) as CanonicalRamadan;

function getMadinaPrayer(ramadanDay: number): PrayerTime | undefined {
  return MADINA_REF.prayer_times.find((p) => p.ramadan_day === ramadanDay);
}

function buildIqamahFromDaily(
  days: { ramadan_day: number; fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string }[]
): IqamahRange[] {
  const ranges: { start: number; end: number; fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }[] = [];
  let current: (typeof ranges)[0] | null = null;

  for (const d of days) {
    const fajr = d.fajr ? to24hr(d.fajr) : "05:30";
    const dhuhr = d.dhuhr ? to24hr(d.dhuhr, true) : "13:00";
    const asr = d.asr ? to24hr(d.asr, true) : "16:00";
    const maghrib = d.maghrib ? to24hr(d.maghrib, true) : "sunset";
    const isha = d.isha ? to24hr(d.isha, true) : "19:30";

    if (current && current.fajr === fajr && current.dhuhr === dhuhr && current.asr === asr && current.isha === isha && d.ramadan_day === current.end + 1) {
      current.end = d.ramadan_day;
    } else {
      if (current) ranges.push(current);
      current = { start: d.ramadan_day, end: d.ramadan_day, fajr, dhuhr, asr, maghrib, isha };
    }
  }
  if (current) ranges.push(current);

  return ranges.map((r) => ({
    date_range: r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`,
    fajr: r.fajr,
    dhuhr: r.dhuhr,
    asr: r.asr,
    maghrib: r.maghrib,
    isha: r.isha,
  }));
}

function buildIqamahFromMonthly(
  days: { date: number; fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string }[]
): IqamahRange[] {
  const ranges: { start: number; end: number; fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }[] = [];
  let current: (typeof ranges)[0] | null = null;

  for (const d of days) {
    const fajr = d.fajr && d.fajr !== "sunset" ? to24hr(d.fajr) : "05:30";
    const dhuhr = d.dhuhr && d.dhuhr !== "sunset" ? to24hr(d.dhuhr, true) : "13:00";
    const asr = d.asr && d.asr !== "sunset" ? to24hr(d.asr, true) : "16:00";
    const maghrib = d.maghrib === "sunset" ? "sunset" : d.maghrib ? to24hr(d.maghrib, true) : "sunset";
    const isha = d.isha && d.isha !== "sunset" ? to24hr(d.isha, true) : "19:30";

    if (current && current.fajr === fajr && current.dhuhr === dhuhr && current.asr === asr && current.isha === isha && d.date === current.end + 1) {
      current.end = d.date;
    } else {
      if (current) ranges.push(current);
      current = { start: d.date, end: d.date, fajr, dhuhr, asr, maghrib, isha };
    }
  }
  if (current) ranges.push(current);

  return ranges.map((r) => ({
    date_range: r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`,
    fajr: r.fajr,
    dhuhr: r.dhuhr,
    asr: r.asr,
    maghrib: r.maghrib,
    isha: r.isha,
  }));
}

const CONVERSIONS: Array<{
  slug: string;
  src: string;
  startFeb18?: boolean;
  convert: (raw: unknown) => CanonicalRamadan;
}> = [
  {
    slug: "al-rahman-mosque",
    src: "ramadan_1447AH_2026_alrahman_mosque.json",
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ day: number; date: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string }> };
      const timetable = d.timetable;
      const prayer_times: PrayerTime[] = timetable.map((row) => ({
        ramadan_day: row.day,
        gregorian: row.date.replace(/^0/, ""),
        fajr: to24hr(row.fajr),
        shurooq: to24hr(row.sunrise),
        dhuhr: to24hr(row.dhuhr, true),
        asr: to24hr(row.asr, true),
        maghrib: to24hr(row.maghrib, true),
        isha: to24hr(row.isha, true),
      }));
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({ ramadan_day: r.day, fajr: undefined, dhuhr: "13:00", asr: "16:00", maghrib: r.maghrib, isha: "19:30" }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-19",
        gregorian_end: "2026-03-20",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "darululoom-siddiqia-masjid",
    src: "ramadan_1447AH_2026_darululoom_siddiqia_masjid.json",
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ day: number; date: string; sehri_ends: string; sunrise: string; fajr: string; zuhr: string; asr: string; maghrib: string; isha: string }> };
      const timetable = d.timetable;
      const prayer_times: PrayerTime[] = timetable.map((row) => {
        const ref = getMadinaPrayer(row.day);
        return {
          ramadan_day: row.day,
          gregorian: row.date.replace(/^0/, ""),
          fajr: to24hr(row.sehri_ends),
          shurooq: to24hr(row.sunrise),
          dhuhr: ref?.dhuhr ?? "12:20",
          asr: ref?.asr ?? "15:00",
          maghrib: to24hr(row.maghrib, true),
          isha: ref?.isha ?? "19:30",
        };
      });
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({ ramadan_day: r.day, fajr: r.fajr, dhuhr: r.zuhr, asr: r.asr, maghrib: r.maghrib, isha: r.isha }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-19",
        gregorian_end: "2026-03-20",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "jamia-masjid-ghausia",
    src: "ramadan_1447AH_2026_jamia_masjid_ghausia.json",
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ day: number; date: string; sehri_ends: string; fajr: string; zuhr: string; asr: string; maghrib: string; isha: string }> };
      const timetable = d.timetable;
      const prayer_times: PrayerTime[] = timetable.map((row) => {
        const ref = getMadinaPrayer(row.day);
        return {
          ramadan_day: row.day,
          gregorian: row.date.replace(/^0/, ""),
          fajr: to24hr(row.sehri_ends),
          shurooq: ref?.shurooq ?? "07:15",
          dhuhr: ref?.dhuhr ?? "12:20",
          asr: ref?.asr ?? "15:00",
          maghrib: to24hr(row.maghrib, true),
          isha: ref?.isha ?? "19:30",
        };
      });
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({ ramadan_day: r.day, fajr: r.fajr, dhuhr: r.zuhr, asr: r.asr, maghrib: r.maghrib, isha: r.isha }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-19",
        gregorian_end: "2026-03-20",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "al-shafeey-centre",
    src: "ramadhan_1447AH_2026_alshafeey_sheffield_full.json",
    startFeb18: true,
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ day: number; date: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string; fajr_jamaat?: string; dhuhr_jamaat?: string; asr_jamaat?: string; maghrib_jamaat?: string; isha_jamaat?: string }> };
      const timetable = d.timetable;
      const prayer_times: PrayerTime[] = timetable.map((row) => ({
        ramadan_day: row.day,
        gregorian: row.date.replace(/-/g, " ").replace(/^0/, ""),
        fajr: to24hr(row.fajr),
        shurooq: to24hr(row.sunrise),
        dhuhr: to24hr(row.dhuhr, true),
        asr: to24hr(row.asr, true),
        maghrib: to24hr(row.maghrib, true),
        isha: to24hr(row.isha, true),
      }));
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({
          ramadan_day: r.day,
          fajr: r.fajr_jamaat?.replace(/Khutbah\s*/i, "") ?? r.fajr,
          dhuhr: r.dhuhr_jamaat?.replace(/Khutbah\s*/i, "") ?? "13:00",
          asr: r.asr_jamaat ?? "15:15",
          maghrib: r.maghrib_jamaat ?? r.maghrib,
          isha: r.isha_jamaat ?? "20:00",
        }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-18",
        gregorian_end: "2026-03-19",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "quba-mosque",
    src: "Quba_Mosque_Ramadan_2026.json",
    startFeb18: true,
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ ramadan_day: number; date: number; day: string; fajr: string; shuruq: string; dhuhr: string; asr: string; maghrib: string; isha: string }> };
      const timetable = d.timetable;
      const febDays = (d: number) => (d <= 11 ? `Feb ${17 + d}` : `Mar ${d - 11}`);
      const prayer_times: PrayerTime[] = timetable.map((row) => ({
        ramadan_day: row.ramadan_day,
        gregorian: febDays(row.ramadan_day),
        fajr: to24hr(row.fajr),
        shurooq: to24hr(row.shuruq),
        dhuhr: to24hr(row.dhuhr, true),
        asr: row.asr.length <= 4 && parseInt(row.asr, 10) < 8 ? to24hr(row.asr, true) : to24hr(row.asr),
        maghrib: to24hr(row.maghrib, true),
        isha: to24hr(row.isha, true),
      }));
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({ ramadan_day: r.ramadan_day, fajr: r.fajr, dhuhr: r.dhuhr, asr: r.asr, maghrib: r.maghrib, isha: r.isha }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-18",
        gregorian_end: "2026-03-19",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "masjid-umar-sheffield",
    src: "Ramadhan_2026_Masjid_Umar_Sheffield.json",
    startFeb18: true,
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ date: number; day: string; fajr: { begins: string; iqamah: string; sunrise: string }; dhuhr: { begins: string; iqamah: string }; asr: { begins: string; iqamah: string; sunset: string }; maghrib: { begins: string }; isha: { begins: string; iqamah: string } }> };
      const timetable = d.timetable;
      const getGreg = (i: number) => (i <= 10 ? `Feb ${18 + i}` : `Mar ${i - 10}`);
      const prayer_times: PrayerTime[] = timetable.map((row, i) => ({
        ramadan_day: i + 1,
        gregorian: getGreg(i),
        fajr: to24hr(row.fajr.begins),
        shurooq: to24hr(row.fajr.sunrise),
        dhuhr: to24hr(row.dhuhr.begins, true),
        asr: to24hr(row.asr.begins, true),
        maghrib: to24hr(row.maghrib.begins, true),
        isha: to24hr(row.isha.begins, true),
      }));
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((row, i) => ({
          ramadan_day: i + 1,
          fajr: row.fajr.iqamah,
          dhuhr: row.dhuhr.iqamah,
          asr: row.asr.iqamah,
          maghrib: row.maghrib.begins,
          isha: row.isha.iqamah,
        }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-18",
        gregorian_end: "2026-03-19",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "masjid-sunnah-sheffield",
    src: "ramadan_1447AH_2026_sheffield_full.json",
    startFeb18: true,
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ day: number; date: number; fajr_entry: string; fajr_jamaah: string; sunrise: string; dhuhr_entry: string; dhuhr_jamaah: string; asr_entry: string; asr_jamaah: string; maghrib: string; isha_entry: string; isha_jamaah: string }> };
      const timetable = d.timetable;
      const getGreg = (day: number) => (day <= 11 ? `Feb ${17 + day}` : `Mar ${day - 11}`);
      const prayer_times: PrayerTime[] = timetable.map((row) => ({
        ramadan_day: row.day,
        gregorian: getGreg(row.day),
        fajr: to24hr(row.fajr_entry),
        shurooq: to24hr(row.sunrise),
        dhuhr: to24hr(row.dhuhr_entry, true),
        asr: to24hr(row.asr_entry, true),
        maghrib: to24hr(row.maghrib, true),
        isha: to24hr(row.isha_entry, true),
      }));
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({
          ramadan_day: r.day,
          fajr: r.fajr_jamaah,
          dhuhr: r.dhuhr_jamaah,
          asr: r.asr_jamaah,
          maghrib: r.maghrib,
          isha: r.isha_jamaah,
        }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-18",
        gregorian_end: "2026-03-19",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "12:45",
      };
    },
  },
  {
    slug: "castle-asian-community-centre",
    src: "ramadan_1447AH_2026_castle_asian_community_centre.json",
    startFeb18: true,
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ day: number; date: string; sehri: string; iftar: string }> };
      const timetable = d.timetable;
      const prayer_times: PrayerTime[] = timetable.map((row) => {
        const ref = getMadinaPrayer(row.day);
        return {
          ramadan_day: row.day,
          gregorian: row.date.replace(/^0/, ""),
          fajr: to24hr(row.sehri),
          shurooq: ref?.shurooq ?? "07:15",
          dhuhr: ref?.dhuhr ?? "12:20",
          asr: ref?.asr ?? "15:00",
          maghrib: to24hr(row.iftar, true),
          isha: ref?.isha ?? "19:30",
        };
      });
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({ ramadan_day: r.day, maghrib: r.iftar }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-18",
        gregorian_end: "2026-03-19",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "noor-al-hadi-mosque",
    src: "ramadan_1447AH_2026_noor_al_hadi_mosque.json",
    startFeb18: true,
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ day: number; date: string; sehri_ends: string; fajr_start: string; iftar: string }> };
      const timetable = d.timetable;
      const prayer_times: PrayerTime[] = timetable.map((row) => {
        const ref = getMadinaPrayer(row.day);
        return {
          ramadan_day: row.day,
          gregorian: row.date.replace(/^0/, ""),
          fajr: to24hr(row.sehri_ends),
          shurooq: ref?.shurooq ?? "07:15",
          dhuhr: ref?.dhuhr ?? "12:20",
          asr: ref?.asr ?? "15:00",
          maghrib: to24hr(row.iftar, true),
          isha: ref?.isha ?? "19:30",
        };
      });
      const iqamah_times = buildIqamahFromDaily(
        timetable.map((r) => ({ ramadan_day: r.day, fajr: r.fajr_start, maghrib: r.iftar }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-18",
        gregorian_end: "2026-03-19",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "high-hazels-community-centre",
    src: "High_Hazels_Community_Centre.json",
    startFeb18: true,
    convert: (raw: unknown) => {
      const d = raw as { days: Array<{ ramadhan_day: number | null; date: string; suhur_end: string; iftar_start: string; fajr: string; zohar: string; asar: string; maghrib: string; isha: string }> };
      const days = d.days.filter((x) => x.ramadhan_day != null && x.ramadhan_day <= 30);
      const prayer_times: PrayerTime[] = days.map((row) => {
        const rd = row.ramadhan_day!;
        const ref = getMadinaPrayer(rd);
        const maghrib = row.maghrib.length <= 5 && parseInt(row.maghrib, 10) < 8 ? to24hr(row.maghrib, true) : to24hr(row.maghrib);
        const isha = row.isha !== "-" ? (parseInt(row.isha, 10) < 8 ? to24hr(row.isha, true) : to24hr(row.isha)) : (ref?.isha ?? "19:30");
        const dhuhr = row.zohar !== "-" ? to24hr(row.zohar, true) : (ref?.dhuhr ?? "12:20");
        const asr = row.asar !== "-" ? to24hr(row.asar, true) : (ref?.asr ?? "16:00");
        return {
          ramadan_day: rd,
          gregorian: gregorianFromDay(rd, true),
          fajr: to24hr(row.suhur_end),
          shurooq: ref?.shurooq ?? "07:15",
          dhuhr,
          asr,
          maghrib,
          isha,
        };
      });
      const iqamah_times = buildIqamahFromDaily(
        days.map((row) => ({
          ramadan_day: row.ramadhan_day!,
          fajr: row.fajr,
          dhuhr: row.zohar !== "-" ? row.zohar : "13:00",
          asr: row.asar !== "-" ? row.asar : "16:00",
          maghrib: row.maghrib,
          isha: row.isha !== "-" ? row.isha : "19:30",
        }))
      );
      return {
        month: "RAMADAN 2026/1447",
        gregorian_start: "2026-02-18",
        gregorian_end: "2026-03-19",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "13:00",
      };
    },
  },
];

const MONTHLY_CONVERSIONS: Array<{
  slug: string;
  src: string;
  monthFile: string;
  convert: (raw: unknown) => { month: string; prayer_times: { date: number; fajr: string; shurooq: string; dhuhr: string; asr: string; maghrib: string; isha: string }[]; iqamah_times: IqamahRange[]; jummah_iqamah: string };
}> = [
  {
    slug: "al-huda-academy",
    src: "AlHuda_Academy_Full_February_2026.json",
    monthFile: "february",
    convert: (raw: unknown) => {
      const d = raw as { timetable: Array<{ date: string; fajr: { start: string; jamaat: string }; sunrise: string; zuhr: { start: string; jamaat: string }; asr: { start: string; jamaat: string }; maghrib: { start: string }; isha: { start: string; jamaat: string } }> };
      const days = d.timetable.filter((r) => r.date.includes("Feb"));
      const prayer_times = days.map((row) => {
        const dateNum = parseInt(row.date.split(" ")[0], 10);
        return {
          date: dateNum,
          fajr: to24hr(row.fajr.start),
          shurooq: to24hr(row.sunrise),
          dhuhr: to24hr(row.zuhr.start, true),
          asr: to24hr(row.asr.start, true),
          maghrib: to24hr(row.maghrib.start, true),
          isha: to24hr(row.isha.start, true),
        };
      });
      const iqamahInput = days.map((row) => {
        const dateNum = parseInt(row.date.split(" ")[0], 10);
        return {
          date: dateNum,
          fajr: row.fajr.jamaat,
          dhuhr: row.zuhr.jamaat,
          asr: row.asr.jamaat,
          maghrib: "sunset",
          isha: row.isha.jamaat,
        };
      });
      return {
        month: "FEBRUARY",
        prayer_times,
        iqamah_times: buildIqamahFromMonthly(iqamahInput),
        jummah_iqamah: "13:00",
      };
    },
  },
  {
    slug: "firth-park-cultural-centre",
    src: "firth_park_cultural_centre.json",
    monthFile: "february",
    convert: (raw: unknown) => {
      const d = raw as { daily_times: Array<{ date: string; fajr_entry: string; fajr_iqamah: string; sunrise: string; dhuhr_entry: string; dhuhr_iqamah: string; asr_entry: string; asr_iqamah: string; maghrib_entry: string; maghrib_iqamah: string; isha_entry: string; isha_iqamah: string }> };
      const days = d.daily_times.filter((r) => {
        const m = r.date.match(/(\d+)/);
        return m && parseInt(m[1], 10) <= 28;
      });
      const prayer_times = days.map((row) => {
        const dateNum = parseInt(row.date.match(/(\d+)/)?.[1] ?? "1", 10);
        return {
          date: dateNum,
          fajr: to24hr(row.fajr_entry),
          shurooq: to24hr(row.sunrise),
          dhuhr: to24hr(row.dhuhr_entry, true),
          asr: to24hr(row.asr_entry, true),
          maghrib: to24hr(row.maghrib_entry, true),
          isha: to24hr(row.isha_entry, true),
        };
      });
      const iqamahInput = days.map((row) => {
        const dateNum = parseInt(row.date.match(/(\d+)/)?.[1] ?? "1", 10);
        return {
          date: dateNum,
          fajr: row.fajr_iqamah,
          dhuhr: row.dhuhr_iqamah,
          asr: row.asr_iqamah,
          maghrib: row.maghrib_iqamah,
          isha: row.isha_iqamah,
        };
      });
      const iqamah_times = buildIqamahFromMonthly(iqamahInput);
      return {
        month: "FEBRUARY",
        prayer_times,
        iqamah_times,
        jummah_iqamah: "12:30",
      };
    },
  },
];

function main() {
  for (const { slug, src, convert } of CONVERSIONS) {
    const srcPath = path.join(PUBLIC, src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  ⚠ Skip ${slug}: ${src} not found`);
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
    const out = convert(raw);
    const outDir = path.join(MOSQUES_DIR, slug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "ramadan.json");
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`  ✓ ${slug} ramadan → ${outPath}`);
  }

  for (const { slug, src, monthFile, convert } of MONTHLY_CONVERSIONS) {
    const srcPath = path.join(PUBLIC, src);
    if (!fs.existsSync(srcPath)) {
      console.warn(`  ⚠ Skip ${slug} ${monthFile}: ${src} not found`);
      continue;
    }
    const raw = JSON.parse(fs.readFileSync(srcPath, "utf-8"));
    const out = convert(raw);
    const outDir = path.join(MOSQUES_DIR, slug);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${monthFile}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`  ✓ ${slug} ${monthFile} → ${outPath}`);
  }

  console.log("\nDone. Run: bun scripts/seed-convex.ts");
}

main();
