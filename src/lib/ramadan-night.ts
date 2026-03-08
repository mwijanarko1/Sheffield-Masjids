const SHEFFIELD_TIMEZONE = "Europe/London";

/** Canonical Ramadan 1447 start date (Gregorian, Sheffield local date). */
export const RAMADAN_START_DATE = "2026-02-18";

/**
 * Hardcoded Ramadan night boundaries for Sheffield (Masjid Umar data).
 * Key = Ramadan day, value = { maghrib, nextFajr }.
 * `nextFajr` is the fajr of the following Gregorian day.
 */
export const NIGHT_BOUNDARIES: Readonly<
  Record<number, { maghrib: string; nextFajr: string }>
> = {
  1: { maghrib: "17:25", nextFajr: "05:40" },
  2: { maghrib: "17:27", nextFajr: "05:38" },
  3: { maghrib: "17:29", nextFajr: "05:36" },
  4: { maghrib: "17:31", nextFajr: "05:34" },
  5: { maghrib: "17:33", nextFajr: "05:32" },
  6: { maghrib: "17:35", nextFajr: "05:29" },
  7: { maghrib: "17:37", nextFajr: "05:27" },
  8: { maghrib: "17:38", nextFajr: "05:25" },
  9: { maghrib: "17:40", nextFajr: "05:23" },
  10: { maghrib: "17:42", nextFajr: "05:21" },
  11: { maghrib: "17:44", nextFajr: "05:19" },
  12: { maghrib: "17:47", nextFajr: "05:17" },
  13: { maghrib: "17:49", nextFajr: "05:14" },
  14: { maghrib: "17:50", nextFajr: "05:12" },
  15: { maghrib: "17:52", nextFajr: "05:10" },
  16: { maghrib: "17:54", nextFajr: "05:08" },
  17: { maghrib: "17:56", nextFajr: "05:05" },
  18: { maghrib: "17:58", nextFajr: "05:03" },
  19: { maghrib: "18:00", nextFajr: "05:01" },
  20: { maghrib: "18:02", nextFajr: "04:59" },
  21: { maghrib: "18:04", nextFajr: "04:56" },
  22: { maghrib: "18:05", nextFajr: "04:54" },
  23: { maghrib: "18:07", nextFajr: "04:52" },
  24: { maghrib: "18:09", nextFajr: "04:49" },
  25: { maghrib: "18:11", nextFajr: "04:47" },
  26: { maghrib: "18:13", nextFajr: "04:45" },
  27: { maghrib: "18:15", nextFajr: "04:42" },
  28: { maghrib: "18:17", nextFajr: "04:40" },
  29: { maghrib: "18:18", nextFajr: "04:38" },
  30: { maghrib: "18:20", nextFajr: "04:38" },
};

interface SheffieldDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface RamadanNightCountdownState {
  currentNight: number;
  hours: number;
  minutes: number;
  seconds: number;
  isNight: boolean;
  label: string;
}

function getSheffieldDateTimeParts(now: Date): SheffieldDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHEFFIELD_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function parseDateOnly(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function getRamadanDayForSheffieldDate(now: Date): number | null {
  const sheffield = getSheffieldDateTimeParts(now);
  const start = parseDateOnly(RAMADAN_START_DATE);

  const sheffieldNoonUtc = Date.UTC(
    sheffield.year,
    sheffield.month - 1,
    sheffield.day,
    12,
    0,
    0,
    0,
  );
  const startNoonUtc = Date.UTC(
    start.year,
    start.month - 1,
    start.day,
    12,
    0,
    0,
    0,
  );

  const diffDays = Math.floor(
    (sheffieldNoonUtc - startNoonUtc) / (1000 * 60 * 60 * 24),
  );
  const ramadanDay = diffDays + 1;

  if (ramadanDay < 1 || ramadanDay > 30) {
    return null;
  }

  return ramadanDay;
}

function parseTimeToSeconds(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60;
}

function toCountdownState(
  diffSeconds: number,
  currentNight: number,
  isNight: boolean,
  label: string,
): RamadanNightCountdownState {
  return {
    currentNight,
    hours: Math.floor(diffSeconds / 3600),
    minutes: Math.floor((diffSeconds % 3600) / 60),
    seconds: diffSeconds % 60,
    isNight,
    label,
  };
}

export function getCurrentRamadanNight(now: Date = new Date()): number | null {
  const ramadanDay = getRamadanDayForSheffieldDate(now);
  if (!ramadanDay) {
    return null;
  }

  const currentSeconds = (() => {
    const { hour, minute, second } = getSheffieldDateTimeParts(now);
    return hour * 3600 + minute * 60 + second;
  })();

  const previousNight = NIGHT_BOUNDARIES[ramadanDay - 1];
  if (previousNight && currentSeconds < parseTimeToSeconds(previousNight.nextFajr)) {
    return ramadanDay - 1;
  }

  return ramadanDay;
}

export function getRamadanNightCountdown(
  now: Date = new Date(),
): RamadanNightCountdownState | null {
  const ramadanDay = getRamadanDayForSheffieldDate(now);
  if (!ramadanDay) {
    return null;
  }

  const { hour, minute, second } = getSheffieldDateTimeParts(now);
  const currentSeconds = hour * 3600 + minute * 60 + second;
  const previousNight = NIGHT_BOUNDARIES[ramadanDay - 1];
  const tonight = NIGHT_BOUNDARIES[ramadanDay];

  if (!tonight) {
    return null;
  }

  if (previousNight) {
    const todayFajrSeconds = parseTimeToSeconds(previousNight.nextFajr);
    if (currentSeconds < todayFajrSeconds) {
      return toCountdownState(
        todayFajrSeconds - currentSeconds,
        ramadanDay - 1,
        true,
        "Night ends in",
      );
    }
  }

  const maghribSeconds = parseTimeToSeconds(tonight.maghrib);
  if (currentSeconds < maghribSeconds) {
    return toCountdownState(
      maghribSeconds - currentSeconds,
      ramadanDay,
      false,
      "Night starts in",
    );
  }

  const nextFajrSeconds = parseTimeToSeconds(tonight.nextFajr);
  return toCountdownState(
    24 * 3600 - currentSeconds + nextFajrSeconds,
    ramadanDay,
    true,
    "Night ends in",
  );
}
