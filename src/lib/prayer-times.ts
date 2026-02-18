import { MonthlyPrayerTimes, DailyPrayerTimes, DailyIqamahTimes, IqamahTimeRange, PrayerTime } from '@/types/prayer-times';

interface DSTDateRange {
  year: number;
  start_date: string;
  end_date: string;
}

interface DSTDatesData {
  uk_dst_dates: DSTDateRange[];
}

// Cache for DST dates
let dstDatesCache: DSTDateRange[] | null = null;

/**
 * Load DST dates from JSON file
 */
async function loadDSTDates(): Promise<DSTDateRange[]> {
  if (dstDatesCache) {
    return dstDatesCache;
  }

  try {
    // For client-side usage
    if (typeof window !== 'undefined') {
      const response = await fetch('/docs/dst-start-end.json');
      if (!response.ok) {
        throw new Error(`Failed to load DST dates: ${response.status}`);
      }
      const data: DSTDatesData = await response.json();
      dstDatesCache = data.uk_dst_dates;
      return dstDatesCache;
    }

    // For server-side usage (Node.js)
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'docs', 'dst-start-end.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data: DSTDatesData = JSON.parse(fileContent);
    dstDatesCache = data.uk_dst_dates;
    return dstDatesCache;
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

type RamadanLoadResult =
  | { data: RamadanData; inRange: true }
  | { data: RamadanData; inRange: false }
  | null;

/**
 * Load Ramadan prayer times. Returns data + whether the date falls within Ramadan.
 * When inRange is false, the mosque has a Ramadan calendar but the date is outside it.
 */
async function loadRamadanData(slug: string, date: Date): Promise<RamadanLoadResult> {
  try {
    const response = await fetch(`/data/mosques/${slug}/ramadan.json`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.gregorian_start || !data.gregorian_end) return null;

    const start = new Date(data.gregorian_start);
    const end = new Date(data.gregorian_end);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (dateOnly >= start && dateOnly <= end) {
      return { data, inRange: true };
    }
    return { data, inRange: false };
  } catch {
    return null;
  }
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
  const exact = prayerTimes.find(day => day.ramadan_day === ramadanDay);
  if (exact) return exact;

  const sorted = [...prayerTimes].sort((a, b) => a.ramadan_day - b.ramadan_day);
  const prevOrEqual = sorted.filter(s => s.ramadan_day <= ramadanDay);
  return prevOrEqual.length > 0 ? prevOrEqual[prevOrEqual.length - 1] : sorted[0];
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
  const exact = prayerTimes.find(day => day.date === dayOfMonth);
  if (exact) return exact;

  const sorted = [...prayerTimes].sort((a, b) => a.date - b.date);
  const prevOrEqual = sorted.filter(s => s.date <= dayOfMonth);
  return prevOrEqual.length > 0 ? prevOrEqual[prevOrEqual.length - 1] : sorted[0];
}

/**
 * Load monthly prayer times from JSON file
 */
export async function loadMonthlyPrayerTimes(slug: string, month: number, year: number = 2024): Promise<MonthlyPrayerTimes> {
  const monthFile = MONTH_FILES[month];

  if (!monthFile) {
    throw new Error(`Invalid month: ${month}`);
  }

  try {
    // Fetch from mosque-specific directory
    const publicUrl = `/data/mosques/${slug}/${monthFile}.json`;
    const response = await fetch(publicUrl);

    if (!response.ok) {
      throw new Error(`Failed to load prayer times for ${monthFile}. Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error loading prayer times for ${monthFile}:`, error);
    throw error;
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
    maghrib: "sunset", // Maghrib Iqamah is same as Adhan time
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
      const monthlyData = await loadMonthlyPrayerTimes(slug, month);
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
      const monthlyData = await loadMonthlyPrayerTimes(slug, month);
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
      const monthlyData = await loadMonthlyPrayerTimes(slug, month);
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
      const monthlyData = await loadMonthlyPrayerTimes(slug, month);
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
    const prayerTime = new Date(now);
    prayerTime.setHours(parseInt(hours), parseInt(minutes), 0);
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
      return resolveRelativeIqamah(iqamahTimes.asr, adhanTime);
    case 'maghrib':
      // Maghrib Iqamah is same as Adhan time
      return adhanTime;
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
  if (!dstDatesCache) {
    return false;
  }

  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();
  const yearData = dstDatesCache.find(d => d.year === checkYear);

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
  if (!dstDatesCache) return false;
  
  const checkDate = date || new Date();
  const checkYear = checkDate.getFullYear();
  const checkMonth = checkDate.getMonth() + 1; // 1-12

  const yearData = dstDatesCache.find(d => d.year === checkYear);
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
