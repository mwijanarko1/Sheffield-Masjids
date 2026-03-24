import type { MonthlyPrayerTimes, Mosque } from "@/types/prayer-times";

export type CalendarExportMode = "adhan" | "iqamah" | "both";

export type CalendarProvider = "apple" | "google" | "ics";

export type CalendarEventKind = "adhan" | "iqamah";

export interface CalendarEventInput {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  allDay: false;
  kind: CalendarEventKind;
}

export interface MonthlyCalendarExportRequest {
  mosque: Mosque;
  month: number;
  year: number;
  monthLabel: string;
  monthlyData: MonthlyPrayerTimes;
  mode: CalendarExportMode;
}

export interface MonthlyTimetableRow {
  day: number;
  dayLabel: string;
  isToday: boolean;
  fajrAdhan: string;
  fajrIqamah: string;
  sunrise: string;
  dhuhrAdhan: string;
  dhuhrIqamah: string;
  asrAdhan: string;
  asrIqamah: string;
  maghribAdhan: string;
  maghribIqamah: string;
  ishaAdhan: string;
  ishaIqamah: string;
  jummahIqamah: string;
}
