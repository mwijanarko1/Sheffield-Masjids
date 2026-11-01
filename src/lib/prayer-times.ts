import { MonthlyPrayerTimes, DailyPrayerTimes, DailyIqamahTimes, IqamahTimeRange, PrayerTime } from '@/types/prayer-times';
import {
  getMosqueDataFsDir,
  getMosqueMonthlyJsonUrl,
  getMosqueRamadanJsonUrl,
  resolveMosqueLocationForSlug,
  type MosqueLocation,
} from '@/lib/mosque-data-path';
import timetableCoverage from '../../public/data/timetable-coverage.json';

// Data path
// ---------
// Server (RSC, route handlers): Convex via src/lib/convex-server.ts, using the
// server-only CONVEX_URL and CONVEX_READ_SECRET. When Convex answers, its answer
// is final: a month it does not have is unavailable, not a reason to read repo
// JSON. Repo JSON on disk is the fallback only when Convex is not configured or
// the call fails, and only for years in timetable-coverage.json (the month files
// are not year-stamped).
// Browser (client components): our own /api/timetable route, which runs the
// server path above. The browser never receives the Convex URL and never calls
// Convex directly. The public /data JSON is the fallback if that route fails
// (not when it answers 404), under the same year rule.

const PRAYER_TIMES_CACHE_TTL_MS = 10 * 60 * 1000;
// Matches the 60s s-maxage on static-fallback responses so recovery is not delayed.
const STATIC_FALLBACK_CACHE_TTL_MS = 60 * 1000;
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

type SheffieldDate = {
  year: number;
  month: number;
  day: number;
};

function parseTrustedJson<T>(source: string): T {
  // SAFETY: Callers only use bundled or same-origin JSON governed by the named return contract.
  return JSON.parse(source) as T;
}

function createTimedEntry<T>(value: T, ttlMs: number = PRAYER_TIMES_CACHE_TTL_MS): TimedCacheEntry<T> {
  return {
    value,
    expiresAt: Date.now() + ttlMs,
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

function isRetriableFetchError(cause: unknown): boolean {
  if (cause instanceof DOMException && cause.name === 'AbortError') {
    return true;
  }
  return cause instanceof TypeError;
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

const SHEFFIELD_TZ = 'Europe/London';

/** Calendar date in Sheffield (Europe/London). Use for lookups, not for moment-in-time. */
export function getDateInSheffield(date: Date): SheffieldDate {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: SHEFFIELD_TZ, year: 'numeric', month: 'numeric', day: 'numeric' });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 0);
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? 0);
  return { year, month, day };
}

function getCurrentYearInSheffield(): number {
  return getDateInSheffield(new Date()).year;
}

type ServerConvexHandle = NonNullable<ReturnType<typeof import('@/lib/convex-server').getServerConvex>>;

async function getConvexForServer(): Promise<ServerConvexHandle | null> {
  if (typeof window !== 'undefined') return null;
  try {
    const { getServerConvex } = await import('@/lib/convex-server');
    return getServerConvex();
  } catch {
    return null;
  }
}

function timetableApiUrl(params: Record<string, string>): string {
  return `/api/timetable?${new URLSearchParams(params).toString()}`;
}

/** "static-fallback" means repo JSON answered instead of Convex. */
export type MonthlyDataSource = 'convex' | 'static-fallback';
export type MonthlyLoadResult = { data: MonthlyPrayerTimes; source: MonthlyDataSource };

const monthlyPrayerTimesCache = new Map<string, TimedCacheEntry<MonthlyLoadResult>>();
const monthlyPrayerTimesInFlight = new Map<string, Promise<MonthlyLoadResult>>();

function assertStaticYearCovered(year: number): void {
  if (!timetableCoverage.years.includes(year)) {
    throw new Error(`No static timetable for ${year}.`);
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

type RamadanLoadResult =
  | { data: RamadanData; inRange: true }
  | { data: RamadanData; inRange: false }
  | null;

function mightBeRamadanDate(date: Date): boolean {
  const { month } = getDateInSheffield(date);
  return month >= 1 && month <= 4;
}

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
      const convex = await getConvexForServer();
      if (convex) {
        try {
          const { api } = await import('../../convex/_generated/api');
          const data = await convex.client.query(api.prayerTimes.getRamadan, {
            mosqueSlug: safeSlug,
            ...convex.readArgs,
          });
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

      if (typeof window !== 'undefined') {
        try {
          const apiResponse = await fetchWithRetry(timetableApiUrl({ mosque: safeSlug, ramadan: '1' }));
          if (apiResponse.ok) {
            const payload = parseTrustedJson<{ ramadan: RamadanData | null }>(await apiResponse.text());
            setBoundedCacheEntry(
              ramadanDataCache,
              safeSlug,
              createTimedEntry(payload.ramadan),
              MAX_RAMADAN_CACHE_ENTRIES,
            );
            return payload.ramadan;
          }
        } catch (error) {
          console.warn('Timetable API Ramadan request failed, falling back to static JSON.', error);
        }
      }

      const location = resolveMosqueLocationForSlug(safeSlug);
      const response = await fetchWithRetry(getMosqueRamadanJsonUrl(location, safeSlug));
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
  const { year, month, day } = getDateInSheffield(date);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return dateStr >= ramadanData.gregorian_start && dateStr <= ramadanData.gregorian_end;
}

/**
 * Load Ramadan prayer times. Returns data + whether the date falls within Ramadan.
 * When inRange is false, the mosque has a Ramadan calendar but the date is outside it.
 */
async function loadRamadanData(slug: string, date: Date): Promise<RamadanLoadResult> {
  if (!mightBeRamadanDate(date)) return null;
  const data = await loadRamadanCalendar(slug);
  if (!data) return null;
  return { data, inRange: isDateWithinRamadanRange(date, data) };
}

export async function isDateInRamadanPeriod(slug: string, date: Date): Promise<boolean> {
  if (!mightBeRamadanDate(date)) return false;
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
 * Get Ramadan day (1-30) for a date within the Ramadan period (uses Sheffield date).
 */
function getRamadanDay(date: Date, ramadanData: RamadanData): number {
  const { year, month, day } = getDateInSheffield(date);
  const start = new Date(ramadanData.gregorian_start + 'T12:00:00.000Z');
  const dateAtNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const diffMs = dateAtNoon.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(30, Math.max(1, diffDays + 1));
}

/**
 * Find prayer times for a Ramadan day, supporting sparse data (e.g. days 1, 10, 20, 30)
 */
type RamadanPrayerTime = RamadanData["prayer_times"][number];

function findRamadanDayData(prayerTimes: RamadanPrayerTime[], ramadanDay: number): RamadanPrayerTime | undefined {
  let closestPrevious: RamadanPrayerTime | undefined;
  let earliest: RamadanPrayerTime | undefined;

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
const MONTH_FILES = new Map<number, string>([
  [1, 'january'],
  [2, 'february'],
  [3, 'march'],
  [4, 'april'],
  [5, 'may'],
  [6, 'june'],
  [7, 'july'],
  [8, 'august'],
  [9, 'september'],
  [10, 'october'],
  [11, 'november'],
  [12, 'december'],
] as const);

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
 * Load monthly prayer times, with whether Convex or the repo JSON fallback answered.
 */
export async function loadMonthlyPrayerTimesWithSource(
  slug: string,
  month: number,
  year: number = getCurrentYearInSheffield(),
  location?: MosqueLocation,
): Promise<MonthlyLoadResult> {
  const safeSlug = normalizeMosqueSlug(slug);
  const mosqueLocation = location ?? resolveMosqueLocationForSlug(safeSlug);
  const monthFile = MONTH_FILES.get(month);

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

  const cacheResult = (result: MonthlyLoadResult): MonthlyLoadResult => {
    setBoundedCacheEntry(
      monthlyPrayerTimesCache,
      cacheKey,
      createTimedEntry(result, result.source === 'static-fallback' ? STATIC_FALLBACK_CACHE_TTL_MS : undefined),
      MAX_MONTHLY_CACHE_ENTRIES,
    );
    return result;
  };

  const loadPromise = (async (): Promise<MonthlyLoadResult> => {
    try {
      const convex = await getConvexForServer();
      let convexHasNoMonth = false;
      if (convex) {
        try {
          const { api } = await import('../../convex/_generated/api');
          const data = await convex.client.query(api.prayerTimes.getMonthly, {
            mosqueSlug: safeSlug,
            month: monthFile,
            year,
            ...convex.readArgs,
          });
          if (data) {
            return cacheResult({ data, source: 'convex' });
          }
          convexHasNoMonth = true;
        } catch (error) {
          console.warn('Convex monthly query failed, falling back to static JSON.', error);
        }
      }

      if (convexHasNoMonth) {
        throw new Error(`Prayer times for ${monthFile} ${year} are not published.`);
      }

      if (typeof window === 'undefined') {
        assertStaticYearCovered(year);
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(getMosqueDataFsDir(process.cwd(), safeSlug, mosqueLocation), `${monthFile}.json`);
        const data = parseTrustedJson<MonthlyPrayerTimes>(await fs.readFile(filePath, 'utf-8'));
        return cacheResult({ data, source: 'static-fallback' });
      }

      let apiHasNoMonth = false;
      try {
        const apiResponse = await fetchWithRetry(
          timetableApiUrl({ mosque: safeSlug, month: String(month), year: String(year) }),
        );
        if (apiResponse.ok) {
          const payload = parseTrustedJson<{ monthly: MonthlyPrayerTimes }>(await apiResponse.text());
          return cacheResult({
            data: payload.monthly,
            source: apiResponse.headers.get('X-Data-Source') === 'static-fallback' ? 'static-fallback' : 'convex',
          });
        }
        apiHasNoMonth = apiResponse.status === 404;
      } catch (error) {
        console.warn('Timetable API monthly request failed, falling back to static JSON.', error);
      }

      if (apiHasNoMonth) {
        throw new Error(`Prayer times for ${monthFile} ${year} are not available.`);
      }
      assertStaticYearCovered(year);
      const publicUrl = getMosqueMonthlyJsonUrl(mosqueLocation, safeSlug, monthFile);
      const response = await fetchWithRetry(publicUrl);

      if (!response.ok) {
        throw new Error(`Failed to load prayer times for ${monthFile}. Status: ${response.status}`);
      }

      return cacheResult({
        data: parseTrustedJson<MonthlyPrayerTimes>(await response.text()),
        source: 'static-fallback',
      });
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
 * Load monthly prayer times from Convex, or the covered-year repo JSON fallback.
 */
export async function loadMonthlyPrayerTimes(
  ...args: Parameters<typeof loadMonthlyPrayerTimesWithSource>
): Promise<MonthlyPrayerTimes> {
  return (await loadMonthlyPrayerTimesWithSource(...args)).data;
}

type AdhanTimesForIqamah = Pick<PrayerTime, 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'>;

/**
 * Resolve a relative iqamah label ("Adhan+5", "10 mins after adhan") to a clock time.
 * Any other value, or a non-clock adhan, is returned unchanged.
 */
export function resolveRelativeIqamah(iqamah: string | undefined, adhan: string | undefined): string {
  const value = iqamah?.trim() ?? '';
  if (!adhan || !isValidTimeForMarkup(adhan)) return iqamah ?? '';

  const minutesText =
    value.match(/^adhan\s*\+\s*(\d+)\s*(?:mins?|minutes?)?$/i)?.[1] ??
    value.match(/^(\d+)\s*(?:mins?|minutes?)\s*after\s*adhan$/i)?.[1];
  if (minutesText === undefined) return iqamah ?? '';

  const [hours, minutes] = adhan.trim().split(':').map(Number);
  const total = (((hours * 60 + minutes + Number(minutesText)) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Get Iqamah times for a specific date. Pass that day's adhan times to resolve relative labels like "Adhan+5".
 */
export function getIqamahTimesForDate(
  date: number,
  iqamahRanges: IqamahTimeRange[],
  adhan?: AdhanTimesForIqamah,
): DailyIqamahTimes {
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
    fajr: resolveRelativeIqamah(range.fajr, adhan?.fajr),
    dhuhr: resolveRelativeIqamah(range.dhuhr, adhan?.dhuhr),
    asr: resolveRelativeIqamah(range.asr, adhan?.asr),
    maghrib: resolveRelativeIqamah(range.maghrib ?? "-", adhan?.maghrib),
    isha: resolveRelativeIqamah(range.isha, adhan?.isha),
    jummah: range.jummah?.trim() ?? "",
  };
}

/**
 * Get today's prayer times with Iqamah times (based on Sheffield UK time)
 */
export async function getTodaysPrayerTimes(slug: string): Promise<DailyPrayerTimes> {
  const { year, month, day } = getDateInSheffield(new Date());
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const today = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  try {
    const ramadanResult = await loadRamadanData(slug, today);
    if (ramadanResult?.inRange) {
      const ramadanDay = getRamadanDay(today, ramadanResult.data);
      const dayData = findRamadanDayData(ramadanResult.data.prayer_times, ramadanDay);
      if (dayData) {
        return {
          date: dateStr,
          fajr: dayData.fajr,
          sunrise: dayData.shurooq,
          dhuhr: dayData.dhuhr,
          asr: dayData.asr,
          maghrib: dayData.maghrib,
          isha: dayData.isha
        };
      }
    }

    try {
      const monthlyData = await loadMonthlyPrayerTimes(slug, month, year);
      const adhan = findDayData(monthlyData.prayer_times, day);
      if (!adhan) {
        throw new Error(`Prayer times not found for date: ${day}`);
      }

      return {
        date: dateStr,
        fajr: adhan.fajr,
        sunrise: adhan.shurooq,
        dhuhr: adhan.dhuhr,
        asr: adhan.asr,
        maghrib: adhan.maghrib,
        isha: adhan.isha
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
 * Get today's Iqamah times (Sheffield calendar).
 */
export async function getTodaysIqamahTimes(slug: string): Promise<DailyIqamahTimes> {
  const { year, month, day } = getDateInSheffield(new Date());
  const today = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return getIqamahTimesForSpecificDate(slug, today);
}

/**
 * Get prayer times for a specific date (date interpreted in Sheffield).
 */
export async function getPrayerTimesForDate(slug: string, date: Date): Promise<DailyPrayerTimes> {
  const { year, month, day } = getDateInSheffield(date);
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dateAtNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  try {
    const ramadanResult = await loadRamadanData(slug, dateAtNoon);
    if (ramadanResult?.inRange) {
      const ramadanDay = getRamadanDay(dateAtNoon, ramadanResult.data);
      const dayData = findRamadanDayData(ramadanResult.data.prayer_times, ramadanDay);
      if (dayData) {
        return {
          date: dateStr,
          fajr: dayData.fajr,
          sunrise: dayData.shurooq,
          dhuhr: dayData.dhuhr,
          asr: dayData.asr,
          maghrib: dayData.maghrib,
          isha: dayData.isha
        };
      }
    }

    try {
      const monthlyData = await loadMonthlyPrayerTimes(slug, month, year);
      const adhan = findDayData(monthlyData.prayer_times, day);
      if (!adhan) {
        throw new Error(`Prayer times not found for date: ${day}`);
      }

      return {
        date: dateStr,
        fajr: adhan.fajr,
        sunrise: adhan.shurooq,
        dhuhr: adhan.dhuhr,
        asr: adhan.asr,
        maghrib: adhan.maghrib,
        isha: adhan.isha
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
 * Get Iqamah times for a specific date (date interpreted in Sheffield).
 */
export async function getIqamahTimesForSpecificDate(slug: string, date: Date): Promise<DailyIqamahTimes> {
  const { year, month, day } = getDateInSheffield(date);
  const dateAtNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

  try {
    const ramadanResult = await loadRamadanData(slug, dateAtNoon);
    if (ramadanResult?.inRange) {
      const ramadanDay = getRamadanDay(dateAtNoon, ramadanResult.data);
      const iqamahTimes = getIqamahTimesForDate(
        ramadanDay,
        ramadanResult.data.iqamah_times,
        findRamadanDayData(ramadanResult.data.prayer_times, ramadanDay),
      );
      return {
        ...iqamahTimes,
        jummah: iqamahTimes.jummah?.trim()
          ? iqamahTimes.jummah
          : ramadanResult.data.jummah_iqamah,
      };
    }

    try {
      const monthlyData = await loadMonthlyPrayerTimes(slug, month, year);
      const adhanDay = findDayData(monthlyData.prayer_times, day);
      if (!adhanDay) {
        throw new Error(`No Iqamah times found for date: ${day}`);
      }
      // Adhan-only month: the mosque published no iqamah, so show adhan with no iqamah line.
      if (monthlyData.iqamah_times.length === 0) {
        return {
          fajr: "-",
          dhuhr: "-",
          asr: "-",
          maghrib: "-",
          isha: "-",
          jummah: monthlyData.jummah_iqamah,
        };
      }
      const iqamahTimes = getIqamahTimesForDate(day, monthlyData.iqamah_times, adhanDay);

      return {
        ...iqamahTimes,
        jummah: iqamahTimes.jummah?.trim()
          ? iqamahTimes.jummah
          : monthlyData.jummah_iqamah,
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
  const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  const times = prayers.map(prayer => {
    const timeVal = prayerTimes[prayer];
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

export interface NextPrayerCountdownResult {
  nextPrayer: { name: string; time: string };
  countdown: { hours: number; minutes: number; seconds: number };
  isIqamah: boolean;
  isJummah?: boolean;
}

/**
 * Get next prayer/iqamah and countdown (MWHS-style).
 * First checks Adhan; if passed, checks Iqamah. Returns countdown with seconds.
 */
export function getNextPrayerAndCountdown(
  prayerTimes: DailyPrayerTimes,
  iqamahTimes: DailyIqamahTimes,
  options?: { selectedDate?: Date }
): NextPrayerCountdownResult {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const checkDate = options?.selectedDate ?? now;
  const isFriday = checkDate.getDay() === 5;

  const prayers: { name: string; adhanTime: string; iqamahTime: string }[] = [
    {
      name: "Fajr",
      adhanTime: prayerTimes.fajr,
      iqamahTime: iqamahTimes.fajr,
    },
    {
      name: isFriday ? "Jummah" : "Dhuhr",
      adhanTime: prayerTimes.dhuhr,
      iqamahTime: isFriday
        ? (iqamahTimes.jummah || "-")
        : iqamahTimes.dhuhr,
    },
    {
      name: "Asr",
      adhanTime: prayerTimes.asr,
      iqamahTime: iqamahTimes.asr,
    },
    {
      name: "Maghrib",
      adhanTime: prayerTimes.maghrib,
      iqamahTime: iqamahTimes.maghrib,
    },
    {
      name: "Isha",
      adhanTime: prayerTimes.isha,
      iqamahTime: iqamahTimes.isha,
    },
  ];

  for (const prayer of prayers) {
    const isJummah = prayer.name === "Jummah";

    if (!isJummah && isValidTimeForMarkup(prayer.adhanTime)) {
      const [adhanHours, adhanMinutes] = prayer.adhanTime.split(":").map(Number);
      const adhanTime = new Date(now);
      adhanTime.setHours(adhanHours, adhanMinutes, 0, 0);

      if (adhanTime > now) {
        const timeDiff = adhanTime.getTime() - now.getTime();
        return {
          nextPrayer: { name: prayer.name, time: prayer.adhanTime },
          countdown: {
            hours: Math.floor(timeDiff / (1000 * 60 * 60)),
            minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((timeDiff % (1000 * 60)) / 1000),
          },
          isIqamah: false,
        };
      }
    }

    if (
      isValidTimeForMarkup(prayer.iqamahTime) &&
      prayer.iqamahTime !== prayer.adhanTime
    ) {
      const [iqamahHours, iqamahMinutes] = prayer.iqamahTime.split(":").map(Number);
      const iqamahTime = new Date(now);
      iqamahTime.setHours(iqamahHours, iqamahMinutes, 0, 0);

      if (iqamahTime > now) {
        const timeDiff = iqamahTime.getTime() - now.getTime();
        return {
          nextPrayer: { name: prayer.name, time: prayer.iqamahTime },
          countdown: {
            hours: Math.floor(timeDiff / (1000 * 60 * 60)),
            minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((timeDiff % (1000 * 60)) / 1000),
          },
          isIqamah: true,
          isJummah: isJummah || undefined,
        };
      }
    }
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hours, minutes] = prayers[0].adhanTime.split(":").map(Number);
  tomorrow.setHours(hours, minutes, 0, 0);

  const timeDiff = tomorrow.getTime() - now.getTime();
  return {
    nextPrayer: { name: "Fajr", time: prayers[0].adhanTime },
    countdown: {
      hours: Math.floor(timeDiff / (1000 * 60 * 60)),
      minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((timeDiff % (1000 * 60)) / 1000),
    },
    isIqamah: false,
  };
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

const SHEFFIELD_DISPLAY_TZ = 'Europe/London';

/**
 * Format date for display (Sheffield/UK timezone)
 */
export function formatDateForDisplay(date: Date, timeZone: string = SHEFFIELD_DISPLAY_TZ): string {
  const dayNames = new Map([
    ['Monday', 'Mon'],
    ['Tuesday', 'Tues'],
    ['Wednesday', 'Wed'],
    ['Thursday', 'Thurs'],
    ['Friday', 'Fri'],
    ['Saturday', 'Sat'],
    ['Sunday', 'Sun'],
  ]);

  const opts: Intl.DateTimeFormatOptions = { timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';

  const shortDay = dayNames.get(weekday) || weekday;
  return `${shortDay} ${day} ${month} ${year}`;
}

/**
 * True only for a published HH:MM clock time. Any other timetable value is a label
 * (e.g. "Entry Time", "Adhan+5") that is shown as published and never scheduled.
 */
export function isValidTimeForMarkup(timeString: string): boolean {
  if (!timeString) return false;
  const match = timeString.trim().match(/^(\d{1,2}):(\d{2})$/);
  return match !== null && Number(match[1]) < 24 && Number(match[2]) < 60;
}

/**
 * Format a 24-hour time string (HH:MM) to 12-hour format (h:mm am/pm); labels pass through unchanged.
 */
export function formatTo12Hour(timeString: string): string {
  if (!isValidTimeForMarkup(timeString)) return timeString;

  const [hours, minutes] = timeString.trim().split(':').map(Number);
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')}${ampm}`;
}
