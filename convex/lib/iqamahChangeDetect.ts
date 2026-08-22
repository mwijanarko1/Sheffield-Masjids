/**
 * Pure iqamah change detection for Masjidly push alerts.
 *
 * Canonical iqamah fields (only these trigger alerts):
 * - monthly/ramadan `iqamahTimes[]`: date_range, fajr, dhuhr, asr, maghrib?, isha, jummah?
 * - top-level `jummahIqamah`
 *
 * Explicitly ignored:
 * - adhan/prayer_times fields (including asr_mithl2 — adhan second Mithl, not iqamah)
 * - identical reimports
 * - ranges that only affect dates strictly before "today"
 */

export type IqamahTimeRange = {
  date_range: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib?: string;
  isha: string;
  jummah?: string;
};

export type MonthlyIqamahSnapshot = {
  year: number;
  /** 1–12 */
  monthNumber: number;
  iqamahTimes: IqamahTimeRange[];
  jummahIqamah: string;
};

export type RamadanIqamahSnapshot = {
  gregorianStart: string;
  gregorianEnd: string;
  /** Maps ramadan_day → YYYY-MM-DD when available */
  ramadanDayToGregorian: Record<number, string>;
  iqamahTimes: IqamahTimeRange[];
  jummahIqamah: string;
};

const MONTH_NAME_TO_NUMBER = new Map([
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["may", 5],
  ["june", 6],
  ["july", 7],
  ["august", 8],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
]);

export function monthNameToNumber(month: string): number | null {
  return MONTH_NAME_TO_NUMBER.get(month.trim().toLowerCase()) ?? null;
}

export function parseDateRange(range: string): { start: number; end: number } | null {
  const parts = range.trim().split("-").map((p) => Number(p.trim()));
  if (parts.length === 0 || Number.isNaN(parts[0])) return null;
  if (parts.length === 1 || Number.isNaN(parts[1])) {
    return { start: parts[0], end: parts[0] };
  }
  return { start: parts[0], end: parts[1] };
}

function canonicalizeRange(r: IqamahTimeRange): string {
  return JSON.stringify({
    date_range: r.date_range,
    fajr: r.fajr,
    dhuhr: r.dhuhr,
    asr: r.asr,
    maghrib: r.maghrib ?? null,
    isha: r.isha,
    jummah: r.jummah ?? null,
  });
}

function canonicalizeIqamahPayload(
  iqamahTimes: IqamahTimeRange[],
  jummahIqamah: string,
): string {
  const ranges = [...iqamahTimes]
    .map(canonicalizeRange)
    .sort();
  return JSON.stringify({ ranges, jummahIqamah });
}

/** YYYY-MM-DD in UTC for a calendar date. */
export function ymdUTC(year: number, month1to12: number, day: number): string {
  const m = String(month1to12).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function todayYmdUTC(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  return ymdUTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function rangeIntersectsTodayOrFutureMonthly(
  year: number,
  monthNumber: number,
  range: IqamahTimeRange,
  todayYmd: string,
): boolean {
  const parsed = parseDateRange(range.date_range);
  if (!parsed) {
    // Unknown format — treat as potentially relevant.
    return true;
  }
  // Any day in [start, end] on this calendar month/year >= today?
  for (let day = parsed.start; day <= parsed.end; day++) {
    if (day < 1 || day > 31) continue;
    const ymd = ymdUTC(year, monthNumber, day);
    if (ymd >= todayYmd) return true;
  }
  return false;
}

function rangeIntersectsTodayOrFutureRamadan(
  range: IqamahTimeRange,
  ramadanDayToGregorian: Record<number, string>,
  gregorianStart: string,
  gregorianEnd: string,
  todayYmd: string,
): boolean {
  if (gregorianEnd < todayYmd) return false;
  if (gregorianStart >= todayYmd) return true;

  const parsed = parseDateRange(range.date_range);
  if (!parsed) return true;

  for (let day = parsed.start; day <= parsed.end; day++) {
    const g = ramadanDayToGregorian[day];
    if (g && g >= todayYmd) return true;
  }

  // If we cannot map days, fall back to whole timetable still covering today+.
  if (Object.keys(ramadanDayToGregorian).length === 0) {
    return gregorianEnd >= todayYmd;
  }
  return false;
}

type ChangedRanges = {
  prevOnly: IqamahTimeRange[];
  nextOnly: IqamahTimeRange[];
  bothChanged: boolean;
};

function changedRanges(
  prev: IqamahTimeRange[],
  next: IqamahTimeRange[],
): ChangedRanges {
  const prevMap = new Map(prev.map((r) => [r.date_range, r]));
  const nextMap = new Map(next.map((r) => [r.date_range, r]));
  const prevOnly: IqamahTimeRange[] = [];
  const nextOnly: IqamahTimeRange[] = [];

  for (const [key, r] of prevMap) {
    const n = nextMap.get(key);
    if (!n) {
      prevOnly.push(r);
    } else if (canonicalizeRange(r) !== canonicalizeRange(n)) {
      prevOnly.push(r);
      nextOnly.push(n);
    }
  }
  for (const [key, r] of nextMap) {
    if (!prevMap.has(key)) nextOnly.push(r);
  }

  return {
    prevOnly,
    nextOnly,
    bothChanged: prevOnly.length > 0 || nextOnly.length > 0,
  };
}

/**
 * Returns true when future (or today) iqamah values changed between snapshots.
 * First insert (prev null) does not notify — avoids bulk seed spam.
 */
export function hasMeaningfulMonthlyIqamahChange(
  prev: MonthlyIqamahSnapshot | null,
  next: MonthlyIqamahSnapshot,
  nowMs: number = Date.now(),
): boolean {
  if (!prev) return false;

  const before = canonicalizeIqamahPayload(prev.iqamahTimes, prev.jummahIqamah);
  const after = canonicalizeIqamahPayload(next.iqamahTimes, next.jummahIqamah);
  if (before === after) return false;

  const today = todayYmdUTC(nowMs);
  const monthEnd = ymdUTC(next.year, next.monthNumber, 31);
  // Entire month already past → no alert.
  // (Using day 31 is fine for comparison; past months fail monthEnd < today.)
  const monthStart = ymdUTC(next.year, next.monthNumber, 1);
  if (monthEnd < today && ymdUTC(next.year, next.monthNumber, 28) < today) {
    // Safer: if last possible day of month is before today.
    const lastDay = new Date(Date.UTC(next.year, next.monthNumber, 0)).getUTCDate();
    if (ymdUTC(next.year, next.monthNumber, lastDay) < today) return false;
  }
  void monthStart;

  const { prevOnly, nextOnly } = changedRanges(prev.iqamahTimes, next.iqamahTimes);
  const relevantRanges = [...prevOnly, ...nextOnly];
  for (const r of relevantRanges) {
    if (
      rangeIntersectsTodayOrFutureMonthly(
        next.year,
        next.monthNumber,
        r,
        today,
      )
    ) {
      return true;
    }
  }

  if (prev.jummahIqamah !== next.jummahIqamah) {
    const lastDay = new Date(Date.UTC(next.year, next.monthNumber, 0)).getUTCDate();
    if (ymdUTC(next.year, next.monthNumber, lastDay) >= today) return true;
  }

  // Range list identical keys but values changed only in past — already handled.
  // Structural full replace without overlapping date_range keys:
  if (relevantRanges.length === 0 && before !== after) {
    // Sorted canonicalize differed only via jummah handled above; otherwise full dump compare miss.
    // Treat as change if month still has today/future days.
    const lastDay = new Date(Date.UTC(next.year, next.monthNumber, 0)).getUTCDate();
    return ymdUTC(next.year, next.monthNumber, lastDay) >= today;
  }

  return false;
}

export function hasMeaningfulRamadanIqamahChange(
  prev: RamadanIqamahSnapshot | null,
  next: RamadanIqamahSnapshot,
  nowMs: number = Date.now(),
): boolean {
  if (!prev) return false;

  const before = canonicalizeIqamahPayload(prev.iqamahTimes, prev.jummahIqamah);
  const after = canonicalizeIqamahPayload(next.iqamahTimes, next.jummahIqamah);
  if (before === after) return false;

  const today = todayYmdUTC(nowMs);
  if (next.gregorianEnd < today) return false;

  const { prevOnly, nextOnly } = changedRanges(prev.iqamahTimes, next.iqamahTimes);
  const relevantRanges = [...prevOnly, ...nextOnly];
  for (const r of relevantRanges) {
    if (
      rangeIntersectsTodayOrFutureRamadan(
        r,
        next.ramadanDayToGregorian,
        next.gregorianStart,
        next.gregorianEnd,
        today,
      )
    ) {
      return true;
    }
  }

  if (prev.jummahIqamah !== next.jummahIqamah) {
    return next.gregorianEnd >= today;
  }

  if (relevantRanges.length === 0 && before !== after) {
    return next.gregorianEnd >= today;
  }

  return false;
}

type RamadanDayMap = Record<number, string>;

export function buildRamadanDayMap(
  prayerTimes: Array<{ ramadan_day: number; gregorian: string }>,
) {
  const map: RamadanDayMap = {};
  for (const row of prayerTimes) {
    map[row.ramadan_day] = row.gregorian;
  }
  return map;
}

export function newPublishEventId(): string {
  // Convex mutations have no crypto.randomUUID guarantee in all runtimes; use timestamp+random.
  return `pub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function tokenFingerprint(token: string): string {
  // Non-cryptographic short id for dedupe lists (not for security).
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
