/**
 * Published prayer times for /api/prayer-times, /api/mcp and the WebMCP
 * get_prayer_times tool.
 *
 * Source of truth: Convex (prayerTimes:getMonthly / prayerTimes:getRamadan),
 * read server-side with CONVEX_URL and CONVEX_READ_SECRET, the same way the
 * mosque pages load data through src/lib/prayer-times.ts. When Convex answers,
 * its answer is final: a month Convex does not have is a 404, even if a repo
 * JSON file exists, so seeding Convex is the only step needed to publish or
 * correct times.
 *
 * Fallback decision: the repository JSON under public/data/mosques stays as a
 * fallback, used only when Convex is not configured (CONVEX_URL unset, for
 * example local dev, tests, or a preview without env vars) or the Convex call
 * fails (network error, outage, rejected secret). Reasons:
 *   - The repo JSON is the seed input, so it is never newer than Convex; at
 *     worst it is a few commits behind while builds for data-only changes are
 *     skipped. A slightly stale timetable during an outage is better than no
 *     timetable at prayer time.
 *   - It keeps the rollout safe: if the new env vars are missing or wrong, the
 *     API keeps answering instead of returning 500s.
 *   - Fallback responses are labelled `source: "published-static-data"`, send
 *     `X-Data-Source: static-fallback`, log a warning and use a shorter CDN
 *     cache, so they are visible and recover quickly once Convex is back.
 * Mosque resolution (slug, name, city, timezone, hidden flag) still uses the
 * bundled public/data/mosques.json registry; registry edits trigger a deploy.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeFunctionReference } from "convex/server";
import { getServerConvex } from "@/lib/convex-server";
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
  /** "convex" normally; "published-static-data" when the repo JSON fallback answered. */
  source: PublishedDataSourceName;
};

export type PublishedDataSourceName = "convex" | "published-static-data";

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

/**
 * Accepted date window: from the first year in timetable-coverage.json to the
 * year after the later of (last covered year, current London year). Anything
 * else is a 400, so the CDN cache key space stays bounded and cannot be
 * bypassed cheaply with arbitrary dates.
 */
export type PublishedDateWindow = { minYear: number; maxYear: number };

export function publishedDateWindow(now = new Date()): PublishedDateWindow {
  const covered = Array.from(publishedMonthlyYears());
  const currentYear = Number(londonDateKey(now).slice(0, 4));
  const minYear = covered.length > 0 ? Math.min(...covered) : currentYear;
  const maxYear = Math.max(currentYear, ...covered) + 1;
  return { minYear, maxYear };
}

export type PublishedDateCheck =
  | { ok: true; date: { key: string; year: number; month: number; day: number } }
  | { ok: false; error: string };

export function validatePublishedDate(value: string | null | undefined, now = new Date()): PublishedDateCheck {
  const date = parsePublishedDate(value);
  if (!date) return { ok: false, error: "Date must be a valid YYYY-MM-DD value." };
  const { minYear, maxYear } = publishedDateWindow(now);
  if (date.year < minYear || date.year > maxYear) {
    return {
      ok: false,
      error: `Date ${date.key} is not available: dates must be between ${minYear}-01-01 and ${maxYear}-12-31.`,
    };
  }
  return { ok: true, date };
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

async function readStaticMonth(directory: string, month: number): Promise<MonthlyPrayerTimes | null> {
  try {
    return await readJson<MonthlyPrayerTimes>(join(directory, `${MONTH_FILES[month - 1]}.json`));
  } catch (error) {
    // SAFETY: Node fs errors are ErrnoException; ENOENT means the month file is missing.
    if (error instanceof Error && isMissingFile(error as NodeJS.ErrnoException)) return null;
    throw error;
  }
}

async function readStaticRamadan(directory: string): Promise<RamadanData | null> {
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

const getMonthlyRef = makeFunctionReference<
  "query",
  { mosqueSlug: string; month: string; year?: number; readSecret?: string },
  MonthlyPrayerTimes | null
>("prayerTimes:getMonthly");

const getRamadanRef = makeFunctionReference<
  "query",
  { mosqueSlug: string; date?: string; readSecret?: string },
  RamadanData | null
>("prayerTimes:getRamadan");

type DayTimetable = { monthly: MonthlyPrayerTimes | null; ramadan: RamadanData | null };

async function loadFromConvex(
  env: Record<string, string | undefined>,
  slug: string,
  date: { key: string; year: number; month: number },
): Promise<DayTimetable | null> {
  const convex = getServerConvex(env);
  if (!convex) return null;
  const [monthly, ramadan] = await Promise.all([
    convex.client.query(getMonthlyRef, {
      mosqueSlug: slug,
      month: MONTH_FILES[date.month - 1],
      year: date.year,
      ...convex.readArgs,
    }),
    convex.client.query(getRamadanRef, { mosqueSlug: slug, date: date.key, ...convex.readArgs }),
  ]);
  return { monthly, ramadan };
}

async function loadFromRepoJson(
  directory: string,
  date: { year: number; month: number },
): Promise<DayTimetable> {
  const [ramadan, monthly] = await Promise.all([
    readStaticRamadan(directory),
    // The repo JSON month files are not year-stamped; only serve them for covered years.
    publishedMonthlyYears().has(date.year) ? readStaticMonth(directory, date.month) : Promise.resolve(null),
  ]);
  return { monthly, ramadan };
}

export async function getPublishedPrayerTimes(args: {
  mosque: string;
  date?: string | null;
  projectRoot?: string;
  env?: Record<string, string | undefined>;
}): Promise<PublishedPrayerTimes | PublishedLookupError> {
  const mosqueInput = args.mosque.trim();
  if (!mosqueInput) {
    return { error: "A valid mosque slug or name is required.", status: 400 };
  }

  const dateCheck = validatePublishedDate(args.date);
  if (!dateCheck.ok) {
    return { error: dateCheck.error, status: 400 };
  }
  const { date } = dateCheck;

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

  let source: PublishedDataSourceName = "convex";
  let timetable: DayTimetable | null = null;
  try {
    timetable = await loadFromConvex(args.env ?? process.env, mosque.slug, date);
  } catch (error) {
    console.warn(
      `Convex prayer-times read failed for ${mosque.slug} on ${date.key}; serving repo JSON fallback.`,
      error,
    );
  }
  if (!timetable) {
    source = "published-static-data";
    timetable = await loadFromRepoJson(directory, date);
  }

  const { monthly, ramadan } = timetable;
  let prayer: PrayerTime | undefined;
  let iqamah: DailyIqamahTimes | null = null;

  if (ramadan && date.key >= ramadan.gregorian_start && date.key <= ramadan.gregorian_end) {
    const day = ramadanDay(ramadan.gregorian_start, date.key);
    prayer = ramadan.prayer_times.find((row) => row.ramadan_day === day);
    iqamah = findIqamah(day, ramadan.iqamah_times ?? [], ramadan.jummah_iqamah);
  } else if (monthly) {
    prayer = monthly.prayer_times.find((row) => row.date === date.day);
    iqamah = findIqamah(date.day, monthly.iqamah_times ?? [], monthly.jummah_iqamah);
  }

  // A published adhan row without an iqamah entry is returned with `iqamah: null`
  // (adhan-only months have an empty iqamah_times list); only a missing adhan
  // row means the day is unavailable.
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
    source,
  };
}

export function isPublishedLookupError(
  value: PublishedPrayerTimes | PublishedLookupError,
): value is PublishedLookupError {
  return "error" in value;
}
