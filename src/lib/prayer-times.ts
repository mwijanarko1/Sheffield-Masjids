import { MonthlyPrayerTimes, DailyPrayerTimes, DailyIqamahTimes, IqamahTimeRange, PrayerTime } from '@/types/prayer-times';

// Convex client for prayer times (when NEXT_PUBLIC_CONVEX_URL is set)
let convexClient: InstanceType<typeof import('convex/browser').ConvexHttpClient> | null = null;
let convexClientUrl: string | null = null;

const PRAYER_TIMES_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_MONTHLY_CACHE_ENTRIES = 180;
const MAX_RAMADAN_CACHE_ENTRIES = 45;
const FETCH_TIMEOUT_MS = 6_000;
const FETCH_RETRY_ATTEMPTS = 3;
const FETCH_RETRY_BACKOFF_MS = 250;
const FETCH_RETRY_MAX_BACKOFF_MS = 4_000;
const MOSQUE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type TimedCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

function createTimedEntry<T>(value: T): TimedCacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + PRAYER_TIMES_CACHE_TTL_MS,
  };
}

function normalizeMosqueSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 64 || !MOSQUE_SLUG_RE.test(normalized)) {
    const snippet = slug.slice(0, 80);
    throw new Error(`Invalid mosque slug: "${snippet}"`);
  }
  return normalized;
}

function getValidCacheEntry<T>(cache: Map<string, TimedCacheEntry<T>>, key: string): TimedCacheEntry<T> | null {
  const cachedEntry = cache.get(key);
  if (!cachedEntry) {
    return null;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  // Bump to most-recently-used so eviction is LRU rather than insertion-order FIFO.
  cache.delete(key);
  cache.set(key, cachedEntry);
  return cachedEntry;
}

function setBoundedCacheEntry<T>(
  cache: Map<string, TimedCacheEntry<T>>,
  key: string,
  value: TimedCacheEntry<T>,
  maxEntries: number,
): void {
  if (cache.has(key)) {
    cache.delete(key);
  }

  cache.set(key, value);

  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    cache.delete(oldestKey);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number): number {
  const exponentialDelay = Math.min(
    FETCH_RETRY_BACKOFF_MS * 2 ** (attempt - 1),
    FETCH_RETRY_MAX_BACKOFF_MS,
  );
  const jitter = Math.floor(Math.random() * 150);
  return exponentialDelay + jitter;
}

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isRetriableFetchError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  return error instanceof TypeError;
}

async function fetchWithTimeout(input: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(input: string, attempts = FETCH_RETRY_ATTEMPTS): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchWithTimeout(input);

      if (!response.ok && isRetriableStatus(response.status) && attempt < attempts) {
        await wait(getRetryDelayMs(attempt));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts && isRetriableFetchError(error)) {
        await wait(getRetryDelayMs(attempt));
        continue;
      }
      throw error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(`Failed to fetch ${input}`);
}

function getCurrentYearInSheffield(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" })).getFullYear();
}

async function getConvexClient(): Promise<InstanceType<typeof import('convex/browser').ConvexHttpClient> | null> {
  const url = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_CONVEX_URL : undefined;
  if (!url) {
    convexClient = null;
    convexClientUrl = null;
    return null;
  }

  if (convexClient && convexClientUrl === url) {
    return convexClient;
  }

  try {
    const { ConvexHttpClient } = await import('convex/browser');
    convexClient = new ConvexHttpClient(url);
    convexClientUrl = url;
  } catch {
    convexClient = null;
    convexClientUrl = null;
    return null;
  }

  return convexClient;
}

interface DSTDateRange {
  year: number;
  start_date: string;
  end_date: string;
}

interface DSTDatesData {
  uk_dst_dates: DSTDateRange[];
}

// Cache for DST dates
let dstDatesCache: TimedCacheEntry<DSTDateRange[]> | null = null;
const monthlyPrayerTimesCache = new Map<string, TimedCacheEntry<MonthlyPrayerTimes>>();
const monthlyPrayerTimesInFlight = new Map<string, Promise<MonthlyPrayerTimes>>();

/**
 * Load DST dates from JSON file
 */
async function loadDSTDates(): Promise<DSTDateRange[]> {
  if (dstDatesCache && dstDatesCache.expiresAt > Date.now()) {
    return dstDatesCache.value;
  }

  try {
    // For client-side usage
    if (typeof window !== 'undefined') {
      const response = await fetchWithRetry('/docs/dst-start-end.json');
      if (!response.ok) {
        throw new Error(`Failed to load DST dates: ${response.status}`);
      }
      const data: DSTDatesData = await response.json();
      dstDatesCache = createTimedEntry(data.uk_dst_dates);
      return dstDatesCache.value;
    }

    // For server-side usage (Node.js)
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'docs', 'dst-start-end.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data: DSTDatesData = JSON.parse(fileContent);
    dstDatesCache = createTimedEntry(data.uk_dst_dates);
    return dstDatesCache.value;
  } catch (error) {
    console.error('Error loading DST dates:', error);
    // Fallback to empty array if file can't be loaded
    return [];
  }
}

// Ramadan data structure (optional per-mosque)
interface RamadanData {
  month: string;
  gregorian_start: string;
  gregorian_end: string;
  prayer_times: { ramadan_day: number; gregorian: string; fajr: string; shurooq: string; dhuhr: string; asr: string; maghrib: string; isha: string }[];
  iqamah_times: IqamahTimeRange[];
  jummah_iqamah: string;
}

const ramadanDataCache = new Map<string, TimedCacheEntry<RamadanData | null>>();
const ramadanDataInFlight = new Map<string, Promise<RamadanData | null>>();

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateToLocalDay(value: string): Date | null {
  const exactIso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exactIso) {
    const [, y, m, d] = exactIso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateOnly(parsed);
}

type RamadanLoadResult =
  | { data: RamadanData; inRange: true }
  | { data: RamadanData; inRange: false }
  | null;

/** Load Ramadan timetable for a mosque (Convex or static JSON). Exported for RamadanTimetable. */
export async function loadRamadanCalendar(slug: string): Promise<RamadanData | null> {
  const safeSlug = normalizeMosqueSlug(slug);
  const cachedEntry = getValidCacheEntry(ramadanDataCache, safeSlug);
  if (cachedEntry) {
    return cachedEntry.value;
  }

  const inFlight = ramadanDataInFlight.get(safeSlug);
  if (inFlight) {
    return inFlight;
  }

  const loadPromise = (async (): Promise<RamadanData | null> => {
    try {
      const client = await getConvexClient();
      if (client) {
        try {
          const { api } = await import('../../convex/_generated/api');
          const data = await client.query(api.prayerTimes.getRamadan, { mosqueSlug: safeSlug });
          setBoundedCacheEntry(
            ramadanDataCache,
            safeSlug,
            createTimedEntry(data),
            MAX_RAMADAN_CACHE_ENTRIES,
          );
          return data;
        } catch (error) {
          console.warn('Convex Ramadan query failed, falling back to static JSON.', error);
        }
      }

      const response = await fetchWithRetry(`/data/mosques/${safeSlug}/ramadan.json`);
      if (!response.ok) {
        setBoundedCacheEntry(
          ramadanDataCache,
          safeSlug,
          createTimedEntry(null),
          MAX_RAMADAN_CACHE_ENTRIES,
        );
        return null;
      }

      const data: RamadanData = await response.json();
      if (!data.gregorian_start || !data.gregorian_end) {
        setBoundedCacheEntry(
          ramadanDataCache,
          safeSlug,
          createTimedEntry(null),
          MAX_RAMADAN_CACHE_ENTRIES,
        );
        return null;
      }

      setBoundedCacheEntry(
        ramadanDataCache,
        safeSlug,
        createTimedEntry(data),
        MAX_RAMADAN_CACHE_ENTRIES,
      );
      return data;
    } catch (error) {
      console.warn(`Error loading Ramadan data for "${safeSlug}".`, error);
      setBoundedCacheEntry(
        ramadanDataCache,
        safeSlug,
        createTimedEntry(null),
        MAX_RAMADAN_CACHE_ENTRIES,
      );
      return null;
    }
  })();

  ramadanDataInFlight.set(safeSlug, loadPromise);

  try {
    return await loadPromise;
  } finally {
    ramadanDataInFlight.delete(safeSlug);
  }
}

function isDateWithinRamadanRange(date: Date, ramadanData: RamadanData): boolean {
  const start = parseDateToLocalDay(ramadanData.gregorian_start);
  const end = parseDateToLocalDay(ramadanData.gregorian_end);
  if (!start || !end) return false;

  const dateOnly = toDateOnly(date);
  return dateOnly >= start && dateOnly <= end;
}

/**
 * Load Ramadan prayer times. Returns data + whether the date falls within Ramadan.
 * When inRange is false, the mosque has a Ramadan calendar but the date is outside it.
 */
async function loadRamadanData(slug: string, date: Date): Promise<RamadanLoadResult> {
  const data = await loadRamadanCalendar(slug);
  if (!data) return null;
  return { data, inRange: isDateWithinRamadanRange(date, data) };
}

export async function isDateInRamadanPeriod(slug: string, date: Date): Promise<boolean> {
  const data = await loadRamadanCalendar(slug);
  if (!data) return false;
  return isDateWithinRamadanRange(date, data);
}

/**
 * Format Ramadan date range for display (e.g. "19 Feb – 19 Mar 2025")
 */
function formatRamadanDateRange(gregorianStart: string, gregorianEnd: string): string {
  const start = new Date(gregorianStart);
  const end = new Date(gregorianEnd);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Get Ramadan day (1-30) for a date within the Ramadan period
 */
function getRamadanDay(date: Date, ramadanData: RamadanData): number {
  const start = new Date(ramadanData.gregorian_start);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = dateOnly.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(30, Math.max(1, diffDays + 1));
}

/**
 * Find prayer times for a Ramadan day, supporting sparse data (e.g. days 1, 10, 20, 30)
 */
function findRamadanDayData(prayerTimes: { ramadan_day: number; [key: string]: unknown }[], ramadanDay: number): { ramadan_day: number; [key: string]: unknown } | undefined {
  let closestPrevious: { ramadan_day: number; [key: string]: unknown } | undefined;
  let earliest: { ramadan_day: number; [key: string]: unknown } | undefined;

  for (const day of prayerTimes) {
    if (!earliest || day.ramadan_day < earliest.ramadan_day) {
      earliest = day;
    }

    if (day.ramadan_day === ramadanDay) {
      return day;
    }

    if (day.ramadan_day <= ramadanDay && (!closestPrevious || day.ramadan_day > closestPrevious.ramadan_day)) {
      closestPrevious = day;
    }
  }

  return closestPrevious ?? earliest;
}

// Month names mapping
const MONTH_FILES: Record<number, string> = {
  1: 'january',
  2: 'february',
  3: 'march',
  4: 'april',
  5: 'may',
  6: 'june',
  7: 'july',
  8: 'august',
  9: 'september',
  10: 'october',
  11: 'november',
  12: 'december'
};

/**
 * Find prayer times for a date, supporting both full (daily) and sparse (sample dates) monthly data.
 * For sparse data (e.g. dates 1, 15, 31), uses the closest previous sample or first sample.
 */
function findDayData(prayerTimes: PrayerTime[], dayOfMonth: number): PrayerTime | undefined {
  let closestPrevious: PrayerTime | undefined;
  let earliest: PrayerTime | undefined;

  for (const day of prayerTimes) {
    if (!earliest || day.date < earliest.date) {
      earliest = day;
    }

    if (day.date === dayOfMonth) {
      return day;
    }

    if (day.date <= dayOfMonth && (!closestPrevious || day.date > closestPrevious.date)) {
      closestPrevious = day;
    }
  }

  return closestPrevious ?? earliest;
}

/**
 * Load monthly prayer times from JSON file
 */
export async function loadMonthlyPrayerTimes(
  slug: string,
  month: number,
  year: number = getCurrentYearInSheffield(),
): Promise<MonthlyPrayerTimes> {
  const safeSlug = normalizeMosqueSlug(slug);
  const monthFile = MONTH_FILES[month];

  if (!monthFile) {
    throw new Error(`Invalid month: ${month}`);
  }

  const cacheKey = `${safeSlug}:${monthFile}:${year}`;
  const cachedEntry = getValidCacheEntry(monthlyPrayerTimesCache, cacheKey);
  if (cachedEntry) {
    return cachedEntry.value;
  }

  const inFlight = monthlyPrayerTimesInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const loadPromise = (async (): Promise<MonthlyPrayerTimes> => {
    try {
      const client = await getConvexClient();
      if (client) {
        try {
          const { api } = await import('../../convex/_generated/api');
          const data = await client.query(api.prayerTimes.getMonthly, {
            mosqueSlug: safeSlug,
            month: monthFile,
            year,
          });
          if (data) {
            setBoundedCacheEntry(
              monthlyPrayerTimesCache,
              cacheKey,
              createTimedEntry(data),
              MAX_MONTHLY_CACHE_ENTRIES,
            );
            return data;
          }
        } catch (error) {
          console.warn('Convex monthly query failed, falling back to static JSON.', error);
        }
      }

      const publicUrl = `/data/mosques/${safeSlug}/${monthFile}.json`;
      const response = await fetchWithRetry(publicUrl);

      if (!response.ok) {
        throw new Error(`Failed to load prayer times for ${monthFile}. Status: ${response.status}`);
      }

      const data: MonthlyPrayerTimes = await response.json();
      setBoundedCacheEntry(
        monthlyPrayerTimesCache,
        cacheKey,
        createTimedEntry(data),
        MAX_MONTHLY_CACHE_ENTRIES,
      );
      return data;
    } catch (error) {
      console.error(`Error loading prayer times for ${monthFile}:`, error);
      throw error;
    }
  })();

  monthlyPrayerTimesInFlight.set(cacheKey, loadPromise);

  try {
    return await loadPromise;
  } finally {
    monthlyPrayerTimesInFlight.delete(cacheKey);
  }
}

/**
 * Get Iqamah times for a specific date
 */
export function getIqamahTimesForDate(date: number, iqamahRanges: IqamahTimeRange[]): DailyIqamahTimes {
  // Find the appropriate date range (supports "1-21", "22-29", "30" formats)
  const range = iqamahRanges.find(range => {
    const parts = range.date_range.split('-').map(Number);
    const start = parts[0];
    const end = parts[1];
    if (isNaN(end)) return date === start; // Single date e.g. "30"
    return date >= start && date <= end;
  });

  if (!range) {
    throw new Error(`No Iqamah times found for date: ${date}`);
  }

  return {
    fajr: range.fajr,
    dhuhr: range.dhuhr,
    asr: range.asr,
    maghrib: range.maghrib || "sunset", // Use maghrib iqamah from data, fallback to adhan time
    isha: range.isha, // This will be "Entry Time" for summer months
    jummah: "" // Will be set separately
  };
}

/**
 * Get today's prayer times with Iqamah times (based on Sheffield UK time)
 */
export async function getTodaysPrayerTimes(slug: string): Promise<DailyPrayerTimes> {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const month = today.getMonth() + 1;
  const date = today.getDate();

  try {
    const ramadanResult = await loadRamadanData(slug, today);
    if (ramadanResult?.inRange) {
      const ramadanDay = getRamadanDay(today, ramadanResult.data);
      const dayData = findRamadanDayData(ramadanResult.data.prayer_times, ramadanDay);
      if (dayData) {
        return {
          date: today.toISOString().split('T')[0],
          fajr: dayData.fajr as string,
          sunrise: dayData.shurooq as string,
          dhuhr: dayData.dhuhr as string,
          asr: dayData.asr as string,
          maghrib: dayData.maghrib as string,
          isha: dayData.isha as string
        };
      }
    }

    try {
      const monthlyData = await loadMonthlyPrayerTimes(slug, month, today.getFullYear());
      const dayData = findDayData(monthlyData.prayer_times, date);

      if (!dayData) {
        throw new Error(`Prayer times not found for date: ${date}`);
      }

      return {
        date: today.toISOString().split('T')[0],
        fajr: dayData.fajr,
        sunrise: dayData.shurooq,
        dhuhr: dayData.dhuhr,
        asr: dayData.asr,
        maghrib: dayData.maghrib,
        isha: dayData.isha
      };
    } catch (monthlyError) {
      if (ramadanResult && !ramadanResult.inRange) {
        throw new Error(`RAMADAN_ONLY:${formatRamadanDateRange(ramadanResult.data.gregorian_start, ramadanResult.data.gregorian_end)}`);
      }
      throw monthlyError;
    }
  } catch (error) {
    console.error('Error getting today\'s prayer times:', error);
    throw error;
  }
}

/**
 * Get today's Iqamah times (based on Sheffield UK time)
 */
export async function getTodaysIqamahTimes(slug: string): Promise<DailyIqamahTimes> {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const month = today.getMonth() + 1;
  const date = today.getDate();

  try {
    const ramadanResult = await loadRamadanData(slug, today);
    if (ramadanResult?.inRange) {
      const ramadanDay = getRamadanDay(today, ramadanResult.data);
      const iqamahTimes = getIqamahTimesForDate(ramadanDay, ramadanResult.data.iqamah_times);
      return {
        ...iqamahTimes,
        jummah: ramadanResult.data.jummah_iqamah
      };
    }

    try {
      const monthlyData = await loadMonthlyPrayerTimes(slug, month, today.getFullYear());
      const iqamahTimes = getIqamahTimesForDate(date, monthlyData.iqamah_times);

      return {
        ...iqamahTimes,
        jummah: monthlyData.jummah_iqamah
      };
    } catch (monthlyError) {
      if (ramadanResult && !ramadanResult.inRange) {
        throw new Error(`RAMADAN_ONLY:${formatRamadanDateRange(ramadanResult.data.gregorian_start, ramadanResult.data.gregorian_end)}`);
      }
      throw monthlyError;
    }
  } catch (error) {
    console.error('Error getting today\'s Iqamah times:', error);
    throw error;
  }
}

/**
 * Get prayer times for a specific date
 */
export async function getPrayerTimesForDate(slug: string, date: Date): Promise<DailyPrayerTimes> {
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  try {
    const ramadanResult = await loadRamadanData(slug, date);
    if (ramadanResult?.inRange) {
      const ramadanDay = getRamadanDay(date, ramadanResult.data);
      const dayData = findRamadanDayData(ramadanResult.data.prayer_times, ramadanDay);
      if (dayData) {
        return {
          date: date.toISOString().split('T')[0],
          fajr: dayData.fajr as string,
          sunrise: dayData.shurooq as string,
          dhuhr: dayData.dhuhr as string,
          asr: dayData.asr as string,
          maghrib: dayData.maghrib as string,
          isha: dayData.isha as string
        };
      }
    }

    try {
      const monthlyData = await loadMonthlyPrayerTimes(slug, month, date.getFullYear());
      const dayData = findDayData(monthlyData.prayer_times, dayOfMonth);

      if (!dayData) {
        throw new Error(`Prayer times not found for date: ${dayOfMonth}`);
      }

      return {
        date: date.toISOString().split('T')[0],
        fajr: dayData.fajr,
        sunrise: dayData.shurooq,
        dhuhr: dayData.dhuhr,
        asr: dayData.asr,
        maghrib: dayData.maghrib,
        isha: dayData.isha
      };
    } catch (monthlyError) {
      if (ramadanResult && !ramadanResult.inRange) {
        throw new Error(`RAMADAN_ONLY:${formatRamadanDateRange(ramadanResult.data.gregorian_start, ramadanResult.data.gregorian_end)}`);
      }
      throw monthlyError;
    }
  } catch (error) {
    console.error(`Error getting prayer times for date ${date.toDateString()}:`, error);
    throw error;
  }
}

/**
 * Get Iqamah times for a specific date
 */
export async function getIqamahTimesForSpecificDate(slug: string, date: Date): Promise<DailyIqamahTimes> {
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();

  try {
    const ramadanResult = await loadRamadanData(slug, date);
    if (ramadanResult?.inRange) {
      const ramadanDay = getRamadanDay(date, ramadanResult.data);
      const iqamahTimes = getIqamahTimesForDate(ramadanDay, ramadanResult.data.iqamah_times);
      return {
        ...iqamahTimes,
        jummah: ramadanResult.data.jummah_iqamah
      };
    }

    try {
      const monthlyData = await loadMonthlyPrayerTimes(slug, month, date.getFullYear());
      const iqamahTimes = getIqamahTimesForDate(dayOfMonth, monthlyData.iqamah_times);

      return {
        ...iqamahTimes,
        jummah: monthlyData.jummah_iqamah
      };
    } catch (monthlyError) {
      if (ramadanResult && !ramadanResult.inRange) {
        throw new Error(`RAMADAN_ONLY:${formatRamadanDateRange(ramadanResult.data.gregorian_start, ramadanResult.data.gregorian_end)}`);
      }
      throw monthlyError;
    }
  } catch (error) {
    console.error(`Error getting Iqamah times for date ${date.toDateString()}:`, error);
    throw error;
  }
}

/**
 * Get current prayer based on current time in Sheffield UK
 */
export function getCurrentPrayer(prayerTimes: DailyPrayerTimes): string | null {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  const times = prayers.map(prayer => {
    const timeVal = prayerTimes[prayer as keyof DailyPrayerTimes];
    if (!timeVal) return { prayer, time: new Date(0) };
    const [hours, minutes] = timeVal.split(':');
    const parsedHours = parseInt(hours, 10);
    const parsedMinutes = parseInt(minutes, 10);
    if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) {
      return { prayer, time: new Date(0) };
    }
    const prayerTime = new Date(now);
    prayerTime.setHours(parsedHours, parsedMinutes, 0);
    return { prayer, time: prayerTime };
  });

  const currentPrayerTime = times.reduce<{ prayer: string; time: Date } | null>((prev, curr) => {
    if (curr.time <= now && (!prev || prev.time < curr.time)) {
      return curr;
    }
    return prev;
  }, null);

  return currentPrayerTime?.prayer || null;
}

function addMinutesToTime(time: string, minutesToAdd: number): string | null {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const totalMinutes = (((hours * 60 + minutes + minutesToAdd) % 1440) + 1440) % 1440;
  const nextHours = Math.floor(totalMinutes / 60);
  const nextMinutes = totalMinutes % 60;

  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

function resolveRelativeIqamah(iqamahValue: string, adhanTime: string): string {
  const value = iqamahValue.trim();

  const adhanPlusMatch = value.match(/^adhan\s*\+\s*(\d+)\s*(?:mins?|minutes?)?$/i);
  const afterAdhanMatch = value.match(/^(\d+)\s*(?:mins?|minutes?)\s*after\s*adhan$/i);
  const minutesString = adhanPlusMatch?.[1] ?? afterAdhanMatch?.[1];

  if (!minutesString) return iqamahValue;

  const parsed = Number.parseInt(minutesString, 10);
  if (!Number.isFinite(parsed)) return iqamahValue;

  return addMinutesToTime(adhanTime, parsed) ?? iqamahValue;
}

/**
 * Get Iqamah time for a specific prayer using mosque's schedule
 * @param maghribAdhan - Optional Maghrib adhan time, needed when Isha is "Straight after Maghrib"
 */
export function getIqamahTime(prayer: string, adhanTime: string, iqamahTimes: DailyIqamahTimes, maghribAdhan?: string): string {
  const prayerLower = prayer.toLowerCase();

  switch (prayerLower) {
    case 'fajr':
      // "Various" means time varies - use adhan time as fallback for display/countdown
      return resolveRelativeIqamah(iqamahTimes.fajr === "Various" ? adhanTime : iqamahTimes.fajr, adhanTime);
    case 'dhuhr':
      return resolveRelativeIqamah(iqamahTimes.dhuhr, adhanTime);
    case 'asr':
      if ((iqamahTimes.asr?.trim() ?? '').toLowerCase() === 'entry time') return adhanTime;
      return resolveRelativeIqamah(iqamahTimes.asr, adhanTime);
    case 'maghrib':
      // Use the specified iqamah time, fallback to adhan time if not specified
      return resolveRelativeIqamah(iqamahTimes.maghrib === "sunset" ? adhanTime : iqamahTimes.maghrib, adhanTime);
    case 'isha':
      // "Straight after Maghrib" = Iqamah at Maghrib time; "Entry Time" = Iqamah at Isha adhan
      if (iqamahTimes.isha === "Straight after Maghrib" && maghribAdhan) return maghribAdhan;
      if (iqamahTimes.isha === "Entry Time") return adhanTime;
      if (iqamahTimes.isha === "Straight after Maghrib") return adhanTime; // Fallback if no maghrib
      return resolveRelativeIqamah(iqamahTimes.isha, adhanTime);
    case 'jummah':
      return iqamahTimes.jummah;
    default:
      return '-';
  }
}

/**
 * Get Jummah time for today
 */
export async function getJummahTime(slug: string): Promise<string> {
  try {
    const iqamahTimes = await getTodaysIqamahTimes(slug);
    return iqamahTimes.jummah;
  } catch (error) {
    console.error('Error getting Jummah time:', error);
    throw error;
  }
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: Date): string {
  const dayNames: Record<string, string> = {
    'Monday': 'Mon',
    'Tuesday': 'Tues',
    'Wednesday': 'Wed',
    'Thursday': 'Thurs',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };

  const longDay = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const shortDay = dayNames[longDay] || longDay;

  const restOfDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `${shortDay} ${restOfDate}`;
}

/**
 * Get DST settings (Placeholder for this project as we don't use Firebase)
 */
export async function getDSTSettingsFromFirestore(): Promise<{ enabled: boolean; customTimes: Record<string, string> } | null> {
  return null;
}

/**
 * Check if we're currently in DST period using accurate UK DST dates
 */
export async function isInDSTPeriod(date?: Date): Promise<boolean> {
  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();

  try {
    const dstDates = await loadDSTDates();
    const yearData = dstDates.find(d => d.year === checkYear);

    if (!yearData) {
      console.warn(`No DST data found for year ${checkYear}`);
      return false;
    }

    const startDate = new Date(yearData.start_date);
    const endDate = new Date(yearData.end_date);

    // DST is in effect from start_date (inclusive) to end_date (exclusive)
    return checkDate >= startDate && checkDate < endDate;
  } catch (error) {
    console.error('Error checking DST period:', error);
    return false;
  }
}

/**
 * Legacy function for backward compatibility - now uses async version
 */
export function isInDSTPeriodSync(date?: Date): boolean {
  if (!dstDatesCache || dstDatesCache.expiresAt <= Date.now()) {
    return false;
  }

  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();
  const yearData = dstDatesCache.value.find(d => d.year === checkYear);

  if (!yearData) {
    return false;
  }

  const startDate = new Date(yearData.start_date);
  const endDate = new Date(yearData.end_date);

  return checkDate >= startDate && checkDate < endDate;
}

/**
 * Subtract 1 hour from a time string (HH:MM format)
 */
export function subtractOneHour(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  let newHours = hours - 1;

  if (newHours < 0) {
    newHours = 23;
  }

  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Add 1 hour to a time string (HH:MM format)
 */
export function addOneHour(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  let newHours = hours + 1;

  if (newHours >= 24) {
    newHours = 0;
  }

  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Check if we're in a DST adjustment period (from DST change date until end of month)
 */
export async function isInDSTAdjustmentPeriod(date?: Date): Promise<boolean> {
  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();
  const checkMonth = checkDate.getMonth() + 1; // 1-12

  try {
    const dstDates = await loadDSTDates();
    const yearData = dstDates.find(d => d.year === checkYear);

    if (!yearData) {
      return false;
    }

    const startDate = new Date(yearData.start_date);
    const endDate = new Date(yearData.end_date);

    if (checkMonth === 10) {
      const endDateDay = endDate.getDate();
      return checkDate.getDate() >= endDateDay && checkMonth === 10;
    }

    if (checkMonth === 3) {
      const startDateDay = startDate.getDate();
      return checkDate.getDate() >= startDateDay && checkMonth === 3;
    }

    return false;
  } catch (error) {
    console.error('Error checking DST adjustment period:', error);
    return false;
  }
}

/**
 * Check if we're in a DST adjustment period (from DST change date until end of month) - synchronous version
 */
export function isInDSTAdjustmentPeriodSync(date?: Date): boolean {
  if (!dstDatesCache || dstDatesCache.expiresAt <= Date.now()) return false;
  
  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();
  const checkMonth = checkDate.getMonth() + 1; // 1-12

  const yearData = dstDatesCache.value.find(d => d.year === checkYear);
  if (!yearData) return false;

  const startDate = new Date(yearData.start_date);
  const endDate = new Date(yearData.end_date);

  if (checkMonth === 10) {
    return checkDate.getDate() >= endDate.getDate() && checkMonth === 10;
  }

  if (checkMonth === 3) {
    return checkDate.getDate() >= startDate.getDate() && checkMonth === 3;
  }

  return false;
}

/**
 * Get DST transition type for a given date
 */
export async function getDSTTransitionType(date?: Date): Promise<'start' | 'end' | null> {
  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();

  try {
    const dstDates = await loadDSTDates();
    const yearData = dstDates.find(d => d.year === checkYear);

    if (!yearData) return null;

    const startDate = new Date(yearData.start_date);
    const endDate = new Date(yearData.end_date);

    if (checkDate.toDateString() === startDate.toDateString()) return 'start';
    if (checkDate.toDateString() === endDate.toDateString()) return 'end';

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Adjust prayer time based on DST transition period
 */
export async function adjustPrayerTimeForDST(timeString: string, date?: Date): Promise<string> {
  const transitionType = await getDSTTransitionType(date);

  if (transitionType === 'end') {
    return subtractOneHour(timeString);
  } else if (transitionType === 'start') {
    return addOneHour(timeString);
  }

  return timeString;
}

/**
 * Legacy synchronous version for backward compatibility
 */
export function adjustPrayerTimeForDSTSync(timeString: string, date?: Date): string {
  // We don't have enough info here for a true sync version if cache is empty
  return timeString;
}

/**
 * Get the Iqamah date mapping for DST adjustment periods
 */
export async function getDSTAdjustmentIqamahDate(date?: Date): Promise<{ month: number; date: number } | null> {
  const checkDate = date || new Date();
  const checkMonth = checkDate.getMonth() + 1; 
  const checkDay = checkDate.getDate();

  const inAdjustmentPeriod = await isInDSTAdjustmentPeriod(checkDate);
  if (!inAdjustmentPeriod) return null;

  const dstDates = await loadDSTDates();
  const yearData = dstDates.find(d => d.year === checkDate.getFullYear());
  if (!yearData) return null;

  const dstStartDate = new Date(yearData.start_date);
  const dstEndDate = new Date(yearData.end_date);

  if (checkMonth === 10) {
    const dayOffset = checkDay - dstEndDate.getDate();
    if (dayOffset >= 0 && dayOffset <= 5) {
      return { month: 11, date: dayOffset + 1 };
    }
  }

  if (checkMonth === 3) {
    const dayOffset = checkDay - dstStartDate.getDate();
    if (dayOffset >= 0 && dayOffset <= 1) {
      return { month: 4, date: dayOffset + 1 };
    }
  }

  return null;
}

/**
 * Returns true if the string is a valid HH:MM or H:MM time for semantic <time> markup.
 */
export function isValidTimeForMarkup(timeString: string): boolean {
  if (!timeString || timeString === '-' || timeString === '--:--' || timeString === 'Various' || timeString === 'Straight after Maghrib' || timeString === 'Entry Time' || timeString === 'After Maghrib') {
    return false;
  }
  const [hours, minutes] = timeString.split(':').map(Number);
  return !isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
}

/**
 * Format a 24-hour time string (HH:MM) to 12-hour format (h:mm AM/PM)
 */
export function formatTo12Hour(timeString: string): string {
  if (!timeString || timeString === '-' || timeString === '--:--' || timeString === 'Various' || timeString === 'Straight after Maghrib' || timeString === 'Entry Time' || timeString === 'After Maghrib') {
    return timeString;
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeString;

  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${displayHours}:${displayMinutes}${ampm}`;
}
