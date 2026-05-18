/**
 * Fixed Gregorian mapping for the in-app Dhul Hijjah tracker (Europe/London, 1447 AH / 2026).
 * Day 1 begins at maghrib on 17 May; day 10 ends at maghrib on 27 May.
 */

export const DHUL_HIJJAH_TRACKER_YEAR = 2026;

/** Gregorian May calendar date of maghrib that begins 1 Dhul Hijjah. */
export const DHUL_HIJJAH_FIRST_DAY_STARTS_MAY_DATE = 17;

/** Gregorian May date of maghrib that ends 10 Dhul Hijjah (start of 11 Dhul Hijjah). */
export const DHUL_HIJJAH_LAST_BOUNDARY_MAY_DATE = 27;

/** Ordinal day in English (e.g. 18 → "18th") for strip labels. */
function formatMayOrdinalDay(mayDay: number): string {
  const n = mayDay % 100;
  if (n >= 11 && n <= 13) return `${mayDay}th`;
  switch (mayDay % 10) {
    case 1:
      return `${mayDay}st`;
    case 2:
      return `${mayDay}nd`;
    case 3:
      return `${mayDay}rd`;
    default:
      return `${mayDay}th`;
  }
}

/**
 * Islamic day `day` (1–10): closing Gregorian evening (maghrib that ends the Islamic day), e.g. `"18th May"`.
 */
export function formatDhulIslamicDayMaghribSpan(day: number): string {
  if (!Number.isInteger(day) || day < 1 || day > 10) return "";
  const endMay = DHUL_HIJJAH_FIRST_DAY_STARTS_MAY_DATE + day;
  return `${formatMayOrdinalDay(endMay)} May`;
}
