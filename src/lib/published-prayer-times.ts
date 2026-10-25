import { readFile } from "node:fs/promises";
import { join } from "node:path";
import mosquesData from "../../public/data/mosques.json";
import timetableCoverage from "../../public/data/timetable-coverage.json";
import { getMosqueDataFsDir } from "@/lib/mosque-data-path";
import { getBaseUrl } from "@/lib/site";
import type {
  DailyIqamahTimes,
  IqamahTimeRange,
  MonthlyPrayerTimes,
  PrayerTime,
} from "@/types/prayer-times";

const MONTH_FILES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type RamadanData = {
  gregorian_start: string;
  gregorian_end: string;
  prayer_times: Array<PrayerTime & { ramadan_day: number; gregorian: string }>;
  iqamah_times: IqamahTimeRange[];
  jummah_iqamah: string;
};

type MosqueRecord = {
  id: string;
  name: string;
  slug: string;
  address: string;
  citySlug?: string;
  cityName?: string;
  countryCode?: string;
  countryName?: string;
  timezone?: string;
  isHidden?: boolean;
};

export type PublishedMosqueSummary = {
  slug: string;
  name: string;
  city: string;
  country: string;
  address: string;
  url: string;
};

export type PublishedPrayerTimes = {
  mosque: PublishedMosqueSummary;
  date: string;
  timezone: string;
  adhan: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  /**
   * Published iqamah (jamaat) times for the day, or `null` when the mosque's
   * published timetable has adhan times but no iqamah entry for that day
   * (adhan-only months or days). Never filled in or calculated.
   */
  iqamah: DailyIqamahTimes | null;
  source: "published-static-data";
};

export type PublishedLookupError = {
  error: string;
  status: 400 | 404;
};

export function londonDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function parsePublishedDate(
  value: string | null | undefined,
): { key: string; year: number; month: number; day: number } | null {
  const key = value?.trim() || londonDateKey();
  if (!DATE_RE.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return { key, year, month, day };
}

function publicMosques(): MosqueRecord[] {
  return (mosquesData.mosques ?? []).filter((mosque) => !mosque.isHidden);
}

export function listPublishedMosques(): MosqueRecord[] {
  return publicMosques();
}

export function findPublishedMosque(slugOrName: string): MosqueRecord | null {
  const needle = slugOrName.trim().toLowerCase();
  if (!needle) return null;

  const mosques = publicMosques();
  if (SLUG_RE.test(needle)) {
    const bySlug = mosques.find(
      (mosque) => mosque.slug === needle || mosque.id === needle,
    );
    if (bySlug) return bySlug;
  }

  const exactName = mosques.find((mosque) => mosque.name.toLowerCase() === needle);
  if (exactName) return exactName;

  const partial = mosques.filter((mosque) => mosque.name.toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : null;
}

function summarizeMosque(mosque: MosqueRecord): PublishedMosqueSummary {
  return {
    slug: mosque.slug,
    name: mosque.name,
    city: mosque.cityName || "Sheffield",
    country: mosque.countryName || "United Kingdom",
    address: mosque.address,
    url: `${getBaseUrl()}/mosques/${mosque.slug}`,
  };
}

function findIqamah(
  day: number,
  ranges: IqamahTimeRange[],
  jummah: string,
): DailyIqamahTimes | null {
  const row = ranges.find(({ date_range }) => {
    const [start, end = start] = date_range.split("-").map(Number);
    return day >= start && day <= end;
  });
  if (!row) return null;
  return {
    fajr: row.fajr,
    dhuhr: row.dhuhr,
    asr: row.asr,
    maghrib: row.maghrib ?? "-",
    isha: row.isha,
    jummah: row.jummah?.trim() || jummah,
  };
}

async function readJson<T>(path: string): Promise<T> {
  // SAFETY: Mosque timetable files are trusted, repository-owned JSON validated by project checks.
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function isMissingFile(error: NodeJS.ErrnoException): boolean {
  return error.code === "ENOENT";
}

async function readMonth(directory: string, month: number): Promise<MonthlyPrayerTimes> {
  return readJson<MonthlyPrayerTimes>(join(directory, `${MONTH_FILES[month - 1]}.json`));
}

async function readRamadan(directory: string): Promise<RamadanData | null> {
  try {
    return await readJson<RamadanData>(join(directory, "ramadan.json"));
  } catch (error) {
    // SAFETY: Node fs errors are ErrnoException; ENOENT means no Ramadan file for this mosque.
    if (error instanceof Error && isMissingFile(error as NodeJS.ErrnoException)) {
      return null;
    }
    throw error;
  }
}

function ramadanDay(start: string, date: string): number {
  return (
    Math.floor(
      (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
    ) + 1
  );
}

function publishedMonthlyYears(): Set<number> {
  const years = new Set<number>();
  for (const year of timetableCoverage.years ?? []) {
    if (Number.isInteger(year)) years.add(year);
  }
  return years;
}

function isYearCovered(year: number, ramadan: RamadanData | null): boolean {
  if (publishedMonthlyYears().has(year)) return true;
  if (!ramadan) return false;
  const startYear = Number(ramadan.gregorian_start.slice(0, 4));
  const endYear = Number(ramadan.gregorian_end.slice(0, 4));
  return year >= startYear && year <= endYear;
}

export async function getPublishedPrayerTimes(args: {
  mosque: string;
  date?: string | null;
  projectRoot?: string;
}): Promise<PublishedPrayerTimes | PublishedLookupError> {
  const mosqueInput = args.mosque.trim();
  if (!mosqueInput) {
    return { error: "A valid mosque slug or name is required.", status: 400 };
  }

  const date = parsePublishedDate(args.date);
  if (!date) {
    return { error: "Date must be a valid YYYY-MM-DD value.", status: 400 };
  }

  const mosque = findPublishedMosque(mosqueInput);
  if (!mosque) {
    return {
      error: `mosque not found for "${mosqueInput}". Use search_mosques first.`,
      status: 404,
    };
  }

  const directory = getMosqueDataFsDir(args.projectRoot ?? process.cwd(), mosque.slug, {
    countryCode: mosque.countryCode || "GB",
    citySlug: mosque.citySlug || "sheffield",
  });

  try {
    const ramadan = await readRamadan(directory);
    if (!isYearCovered(date.year, ramadan)) {
      return {
        error: `Prayer times are not available for ${mosque.slug} in ${date.year}.`,
        status: 404,
      };
    }

    let prayer: PrayerTime | undefined;
    let iqamah: DailyIqamahTimes | null = null;

    if (ramadan && date.key >= ramadan.gregorian_start && date.key <= ramadan.gregorian_end) {
      const day = ramadanDay(ramadan.gregorian_start, date.key);
      prayer = ramadan.prayer_times.find((row) => row.ramadan_day === day);
      iqamah = findIqamah(day, ramadan.iqamah_times, ramadan.jummah_iqamah);
    } else {
      const monthly = await readMonth(directory, date.month);
      prayer = monthly.prayer_times.find((row) => row.date === date.day);
      iqamah = findIqamah(date.day, monthly.iqamah_times, monthly.jummah_iqamah);
    }

    // A published adhan row without an iqamah entry is returned with `iqamah: null`;
    // only a missing adhan row means the day is unavailable.
    if (!prayer) {
      return {
        error: `Prayer times are not available for ${mosque.slug} on ${date.key}.`,
        status: 404,
      };
    }

    return {
      mosque: summarizeMosque(mosque),
      date: date.key,
      timezone: mosque.timezone || "Europe/London",
      adhan: {
        fajr: prayer.fajr,
        sunrise: prayer.shurooq,
        dhuhr: prayer.dhuhr,
        asr: prayer.asr,
        maghrib: prayer.maghrib,
        isha: prayer.isha,
      },
      iqamah,
      source: "published-static-data",
    };
  } catch (error) {
    // SAFETY: Node fs errors are ErrnoException; ENOENT means the month file is missing.
    if (error instanceof Error && isMissingFile(error as NodeJS.ErrnoException)) {
      return {
        error: `Prayer times are not available for ${mosque.slug} on ${date.key}.`,
        status: 404,
      };
    }
    throw error;
  }
}

export function isPublishedLookupError(
  value: PublishedPrayerTimes | PublishedLookupError,
): value is PublishedLookupError {
  return "error" in value;
}
