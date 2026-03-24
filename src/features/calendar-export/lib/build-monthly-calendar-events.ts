import { getIqamahTime, getIqamahTimesForDate } from "@/lib/prayer-times";
import type { MonthlyPrayerTimes } from "@/types/prayer-times";
import type {
  CalendarEventInput,
  CalendarEventKind,
  CalendarExportMode,
  MonthlyCalendarExportRequest,
  MonthlyTimetableRow,
} from "@/features/calendar-export/types";

interface BuildMonthlyTimetableRowsOptions {
  monthlyData: MonthlyPrayerTimes;
  selectedMonth: number;
  today: { day: number; month: number };
}

const PRAYER_LABELS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

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

function buildEvent(
  request: MonthlyCalendarExportRequest,
  day: number,
  prayer: (typeof PRAYER_LABELS)[number],
  kind: CalendarEventKind,
  time: string,
): CalendarEventInput {
  const start = createWallClockDate(request.year, request.month, day, time);
  const durationMinutes = kind === "adhan" ? 1 : 15;
  const title = `${prayer} ${kind === "adhan" ? "Adhan" : "Iqamah"} - ${request.mosque.name}`;
  const description = [
    `${prayer} ${kind} for ${request.mosque.name}`,
    "Sheffield Masjids monthly timetable export",
    `Month: ${request.monthLabel} ${request.year}`,
  ].join("\n");

  return {
    uid: `${request.mosque.slug}-${request.year}-${String(request.month).padStart(2, "0")}-${String(day).padStart(2, "0")}-${prayer.toLowerCase()}-${kind}@sheffieldmasjids`,
    title,
    description,
    location: request.mosque.address?.trim() || request.mosque.name,
    start,
    end: addMinutes(start, durationMinutes),
    allDay: false,
    kind,
  };
}

export function buildMonthlyTimetableRows({
  monthlyData,
  selectedMonth,
  today,
}: BuildMonthlyTimetableRowsOptions): MonthlyTimetableRow[] {
  return monthlyData.prayer_times.map((day) => {
    let iqamahTimes;
    try {
      iqamahTimes = getIqamahTimesForDate(day.date, monthlyData.iqamah_times);
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

    return {
      day: day.date,
      dayLabel: formatDayLabel(day.date, selectedMonth),
      isToday: selectedMonth === today.month && day.date === today.day,
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
    };
  });
}

export function buildMonthlyCalendarEvents(
  request: MonthlyCalendarExportRequest,
): CalendarEventInput[] {
  const rows = buildMonthlyTimetableRows({
    monthlyData: request.monthlyData,
    selectedMonth: request.month,
    today: { day: -1, month: -1 },
  });

  const events: CalendarEventInput[] = [];

  for (const row of rows) {
    const prayerEntries = [
      { prayer: "Fajr" as const, adhan: row.fajrAdhan, iqamah: row.fajrIqamah },
      { prayer: "Dhuhr" as const, adhan: row.dhuhrAdhan, iqamah: row.dhuhrIqamah },
      { prayer: "Asr" as const, adhan: row.asrAdhan, iqamah: row.asrIqamah },
      { prayer: "Maghrib" as const, adhan: row.maghribAdhan, iqamah: row.maghribIqamah },
      { prayer: "Isha" as const, adhan: row.ishaAdhan, iqamah: row.ishaIqamah },
    ];

    for (const entry of prayerEntries) {
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
