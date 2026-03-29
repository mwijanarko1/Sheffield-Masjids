import { getIqamahTime, getIqamahTimesForDate, resolveMonthlyDayDisplay } from "@/lib/prayer-times";
import type { MonthlyPrayerTimes } from "@/types/prayer-times";
import type {
  CalendarEventInput,
  CalendarEventKind,
  MonthlyCalendarExportRequest,
  MonthlyTimetableRow,
} from "@/features/calendar-export/types";

interface BuildMonthlyTimetableRowsOptions {
  slug: string;
  year: number;
  monthlyData: MonthlyPrayerTimes;
  selectedMonth: number;
  today: { day: number; month: number };
}

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

function formatDayLabel(dayOfMonth: number, month: number): string {
  const monthName = MONTH_OPTIONS.find((option) => option.value === month)?.label ?? "";
  return `${dayOfMonth} ${monthName.slice(0, 3)}`;
}

function isConcreteCalendarTime(value: string): boolean {
  return !["", "-", "—", "--:--", "After Maghrib"].includes(value);
}

function createWallClockDate(year: number, month: number, day: number, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function prayerUidSegment(prayer: string): string {
  return prayer.toLowerCase().replace(/\s+/g, "");
}

function buildEvent(
  request: MonthlyCalendarExportRequest,
  day: number,
  prayer: string,
  kind: CalendarEventKind,
  time: string,
): CalendarEventInput {
  const start = createWallClockDate(request.year, request.month, day, time);
  const durationMinutes = kind === "adhan" ? 1 : 15;
  const label = prayer === "Sunrise" ? "Sunrise (Shuruq)" : prayer;
  const title = `${label} ${kind === "adhan" ? "Adhan" : "Iqamah"} - ${request.mosque.name}`;
  const description = [
    `${label} ${kind} for ${request.mosque.name}`,
    "Sheffield Masjids monthly timetable export",
    `Month: ${request.monthLabel} ${request.year}`,
  ].join("\n");

  const seg = prayerUidSegment(prayer);

  return {
    uid: `${request.mosque.slug}-${request.year}-${String(request.month).padStart(2, "0")}-${String(day).padStart(2, "0")}-${seg}-${kind}@sheffieldmasjids`,
    title,
    description,
    location: request.mosque.address?.trim() || request.mosque.name,
    start,
    end: addMinutes(start, durationMinutes),
    allDay: false,
    kind,
  };
}

/**
 * One row per calendar day in the monthly JSON, with March/October embedded-DST row realignment
 * (adhān, shuruq, and iqāmah range day) for mosques that need it.
 */
export async function buildMonthlyTimetableRowsAsync({
  slug,
  year,
  monthlyData,
  selectedMonth,
  today,
}: BuildMonthlyTimetableRowsOptions): Promise<MonthlyTimetableRow[]> {
  const uniqueDays = [...new Set(monthlyData.prayer_times.map((p) => p.date))].sort((a, b) => a - b);
  const rows: MonthlyTimetableRow[] = [];

  for (const d of uniqueDays) {
    const resolved = await resolveMonthlyDayDisplay(slug, year, selectedMonth, d, monthlyData);
    if (!resolved) continue;

    const { adhan: day, iqamahLookupDay } = resolved;

    let iqamahTimes;
    try {
      iqamahTimes = getIqamahTimesForDate(iqamahLookupDay, monthlyData.iqamah_times);
    } catch {
      iqamahTimes = {
        fajr: "-",
        dhuhr: "-",
        asr: "-",
        maghrib: "-",
        isha: "-",
        jummah: monthlyData.jummah_iqamah,
      };
    }

    rows.push({
      day: d,
      dayLabel: formatDayLabel(d, selectedMonth),
      isToday: selectedMonth === today.month && d === today.day,
      fajrAdhan: day.fajr,
      fajrIqamah: getIqamahTime("fajr", day.fajr, iqamahTimes),
      sunrise: day.shurooq,
      dhuhrAdhan: day.dhuhr,
      dhuhrIqamah: getIqamahTime("dhuhr", day.dhuhr, iqamahTimes),
      asrAdhan: day.asr,
      asrIqamah: getIqamahTime("asr", day.asr, iqamahTimes),
      maghribAdhan: day.maghrib,
      maghribIqamah: getIqamahTime("maghrib", day.maghrib, iqamahTimes),
      ishaAdhan: day.isha,
      ishaIqamah: getIqamahTime("isha", day.isha, iqamahTimes, day.maghrib),
      jummahIqamah: monthlyData.jummah_iqamah || "—",
    });
  }

  return rows;
}

export async function buildMonthlyCalendarEvents(
  request: MonthlyCalendarExportRequest,
): Promise<CalendarEventInput[]> {
  const rows = await buildMonthlyTimetableRowsAsync({
    slug: request.mosque.slug,
    year: request.year,
    monthlyData: request.monthlyData,
    selectedMonth: request.month,
    today: { day: -1, month: -1 },
  });

  const events: CalendarEventInput[] = [];

  for (const row of rows) {
    const fajrEntry = {
      prayer: "Fajr" as const,
      adhan: row.fajrAdhan,
      iqamah: row.fajrIqamah,
    };
    if ((request.mode === "adhan" || request.mode === "both") && isConcreteCalendarTime(fajrEntry.adhan)) {
      events.push(buildEvent(request, row.day, fajrEntry.prayer, "adhan", fajrEntry.adhan));
    }
    if ((request.mode === "iqamah" || request.mode === "both") && isConcreteCalendarTime(fajrEntry.iqamah)) {
      events.push(buildEvent(request, row.day, fajrEntry.prayer, "iqamah", fajrEntry.iqamah));
    }

    if ((request.mode === "adhan" || request.mode === "both") && isConcreteCalendarTime(row.sunrise)) {
      events.push(buildEvent(request, row.day, "Sunrise", "adhan", row.sunrise));
    }

    const rest = [
      { prayer: "Dhuhr" as const, adhan: row.dhuhrAdhan, iqamah: row.dhuhrIqamah },
      { prayer: "Asr" as const, adhan: row.asrAdhan, iqamah: row.asrIqamah },
      { prayer: "Maghrib" as const, adhan: row.maghribAdhan, iqamah: row.maghribIqamah },
      { prayer: "Isha" as const, adhan: row.ishaAdhan, iqamah: row.ishaIqamah },
    ];

    for (const entry of rest) {
      if ((request.mode === "adhan" || request.mode === "both") && isConcreteCalendarTime(entry.adhan)) {
        events.push(buildEvent(request, row.day, entry.prayer, "adhan", entry.adhan));
      }

      if ((request.mode === "iqamah" || request.mode === "both") && isConcreteCalendarTime(entry.iqamah)) {
        events.push(buildEvent(request, row.day, entry.prayer, "iqamah", entry.iqamah));
      }
    }
  }

  return events;
}
