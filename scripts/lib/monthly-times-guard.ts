/**
 * Seed-time plausibility guard for monthly prayer-time files.
 *
 * Catches two failure modes that reached production Convex before:
 *  - 12-hour sources without AM/PM where Dhuhr was forced to PM (11:49 -> 23:49),
 *    or an afternoon Dhuhr left unconverted (1:07 -> 01:07).
 *  - Rows where every adhan (or every jamaat) is the same clock time, e.g. all 01:00,
 *    which is what a blank/epoch-zero value looks like after formatting in Europe/London.
 *
 * Validation only: it never rewrites or computes a time.
 */

export const DHUHR_ADHAN_MIN = "10:00";
export const DHUHR_ADHAN_MAX = "15:00";

const ADHAN_FIELDS = ["fajr", "shurooq", "dhuhr", "asr", "maghrib", "isha"] as const;
const IQAMAH_FIELDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

type Row = Record<string, unknown>;
export type MonthlyTimesInput = {
  prayer_times: Row[];
  iqamah_times: Row[];
};

function toMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

const MIN_DHUHR = toMinutes(DHUHR_ADHAN_MIN)!;
const MAX_DHUHR = toMinutes(DHUHR_ADHAN_MAX)!;

/** Returns human-readable issues; an empty array means the month looks plausible. */
export function findSuspiciousMonthlyTimes(data: MonthlyTimesInput): string[] {
  const issues: string[] = [];

  for (const row of data.prayer_times) {
    const day = String(row.date);
    const dhuhr = toMinutes(row.dhuhr);
    if (dhuhr !== null && (dhuhr < MIN_DHUHR || dhuhr > MAX_DHUHR)) {
      issues.push(`day ${day}: dhuhr adhan ${String(row.dhuhr)} outside ${DHUHR_ADHAN_MIN}-${DHUHR_ADHAN_MAX}`);
    }
    const adhan = ADHAN_FIELDS.map((f) => toMinutes(row[f]));
    if (adhan.every((v) => v !== null) && new Set(adhan).size === 1) {
      issues.push(`day ${day}: all adhan times identical (${String(row.fajr)})`);
    }
  }

  for (const row of data.iqamah_times) {
    const values = IQAMAH_FIELDS.map((f) => toMinutes(row[f]));
    if (values.every((v) => v !== null) && new Set(values).size === 1) {
      issues.push(`iqamah ${String(row.date_range)}: all jamaat times identical (${String(row.fajr)})`);
    }
  }

  return issues;
}
