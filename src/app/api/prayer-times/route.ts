import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import mosquesData from "../../../../public/data/mosques.json";
import { getMosqueDataFsDir } from "@/lib/mosque-data-path";
import { checkRequestRateLimit } from "@/lib/request-rate-limit";
import type { DailyIqamahTimes, IqamahTimeRange, MonthlyPrayerTimes, PrayerTime } from "@/types/prayer-times";

export const runtime = "nodejs";

const MONTH_FILES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

type RamadanData = {
  gregorian_start: string;
  gregorian_end: string;
  prayer_times: Array<PrayerTime & { ramadan_day: number; gregorian: string }>;
  iqamah_times: IqamahTimeRange[];
  jummah_iqamah: string;
};

function londonDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function parseDate(value: string | null): { key: string; year: number; month: number; day: number } | null {
  const key = value ?? londonDate();
  if (!DATE_RE.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) return null;
  return { key, year, month, day };
}

function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

function rateHeaders(remaining: number, resetAt: number) {
  return {
    "RateLimit-Limit": String(RATE_LIMIT),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}

function findIqamah(day: number, ranges: IqamahTimeRange[], jummah: string): DailyIqamahTimes | null {
  const row = ranges.find(({ date_range }) => {
    const [start, end = start] = date_range.split("-").map(Number);
    return day >= start && day <= end;
  });
  if (!row) return null;
  return {
    fajr: row.fajr,
    dhuhr: row.dhuhr,
    asr: row.asr,
    maghrib: row.maghrib || "sunset",
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
    if (error instanceof Error && isMissingFile(error)) return null;
    throw error;
  }
}

function ramadanDay(start: string, date: string): number {
  return Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const rate = checkRequestRateLimit(clientKey(request), RATE_LIMIT, RATE_WINDOW_MS);
  const headers = rateHeaders(rate.remaining, rate.resetAt);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in one minute." },
      { status: 429, headers: { ...headers, "Retry-After": "60" } },
    );
  }

  const slug = request.nextUrl.searchParams.get("mosque")?.trim().toLowerCase();
  const date = parseDate(request.nextUrl.searchParams.get("date"));
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "A valid mosque slug is required." }, { status: 400, headers });
  }
  if (!date) {
    return NextResponse.json({ error: "Date must be a valid YYYY-MM-DD value." }, { status: 400, headers });
  }

  const mosque = mosquesData.mosques.find((item) => item.slug === slug && !item.isHidden);
  if (!mosque) {
    return NextResponse.json({ error: "Mosque not found." }, { status: 404, headers });
  }

  try {
    const directory = getMosqueDataFsDir(process.cwd(), slug, mosque);
    const ramadan = await readRamadan(directory);
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

    if (!prayer || !iqamah) {
      return NextResponse.json({ error: "Prayer times are not available for this date." }, { status: 404, headers });
    }

    return NextResponse.json({
      mosque: {
        slug: mosque.slug,
        name: mosque.name,
        city: mosque.cityName,
        country: mosque.countryName,
        address: mosque.address,
        url: `/mosques/${mosque.slug}`,
      },
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
    }, {
      headers: {
        ...headers,
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    if (error instanceof Error && isMissingFile(error)) {
      return NextResponse.json({ error: "Prayer times are not available for this date." }, { status: 404, headers });
    }
    console.error("Static prayer-times API failed", error);
    return NextResponse.json({ error: "Unable to load prayer times." }, { status: 500, headers });
  }
}
