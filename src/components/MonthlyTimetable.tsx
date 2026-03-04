"use client";

import { useEffect, useMemo, useState } from "react";
import { getIqamahTime, getIqamahTimesForDate, getDateInSheffield, loadMonthlyPrayerTimes } from "@/lib/prayer-times";
import { TimeDisplay } from "@/components/TimeDisplay";
import { cn } from "@/lib/utils";
import { MonthlyPrayerTimes, Mosque } from "@/types/prayer-times";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthlyTimetableProps {
  mosque: Mosque;
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
];

function getCurrentMonthInSheffield(): number {
  return getDateInSheffield(new Date()).month;
}

function getTodayInSheffield() {
  const { month, day } = getDateInSheffield(new Date());
  return { day, month };
}

function formatDayLabel(dayOfMonth: number, month: number): string {
  const monthName = MONTH_OPTIONS.find((option) => option.value === month)?.label ?? "";
  return `${dayOfMonth} ${monthName.slice(0, 3)}`;
}

type TimetableRow = {
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
};

export default function MonthlyTimetable({ mosque }: MonthlyTimetableProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthInSheffield);
  const [monthlyData, setMonthlyData] = useState<MonthlyPrayerTimes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => getTodayInSheffield(), []);
  const currentYear = useMemo(() => getDateInSheffield(new Date()).year, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await loadMonthlyPrayerTimes(mosque.slug, selectedMonth);
        if (!isMounted) return;
        setMonthlyData(data);
      } catch {
        if (!isMounted) return;
        setMonthlyData(null);
        setError("Monthly timetable is not available for this mosque in the selected month.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [mosque.slug, selectedMonth]);

  const rows = useMemo<TimetableRow[]>(() => {
    if (!monthlyData) return [];

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
  }, [monthlyData, selectedMonth, today.day, today.month]);

  const todayRowClass =
    "border-[#FFB380]/45 bg-[#FFB380]/12 hover:bg-[#FFB380]/18";

  const goToPreviousMonth = () => {
    setSelectedMonth((month) => (month === 1 ? 12 : month - 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((month) => (month === 12 ? 1 : month + 1));
  };

  const selectedMonthName =
    MONTH_OPTIONS.find((option) => option.value === selectedMonth)?.label ?? "Month";

  return (
    <section
      className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-b from-white/10 via-white/5 via-[15%] to-transparent text-white shadow-2xl backdrop-blur-md"
      aria-label="Monthly prayer timetable"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#FFB380]/10 blur-3xl" />

      <div className="relative z-10 px-4 pb-6 pt-6 md:px-8 md:pb-8 md:pt-8">
        <div className="mb-5 flex items-center justify-between gap-3 md:mb-7">
          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380]/40 touch-manipulation"
          >
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <span className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 shadow-sm md:text-xs">
              Prayer Schedule
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
              {selectedMonthName} {currentYear}
            </h2>
            <p className="mt-1 text-xs text-white/70 md:text-sm">
              Adhan and iqamah schedule for {mosque.name}
            </p>
          </div>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380]/40 touch-manipulation"
          >
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isLoading && (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 backdrop-blur-md">
            Loading timetable…
          </p>
        )}

        {!isLoading && error && (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 backdrop-blur-md">
            {error}
          </p>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <Table className="min-w-[1180px] text-sm text-white md:text-base">
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="w-[120px] font-bold uppercase tracking-wider text-white/80">Date</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Fajr Adhan</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Fajr Iqamah</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Sunrise</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Dhuhr Adhan</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Dhuhr Iqamah</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Asr Adhan</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Asr Iqamah</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Maghrib Adhan</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Maghrib Iqamah</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Isha Adhan</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Isha Iqamah</TableHead>
                  <TableHead className="font-bold uppercase tracking-wider text-white/80">Jummah Iqamah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={`${selectedMonth}-${row.day}`}
                    className={cn(
                      "border-white/10 transition-colors hover:bg-white/5",
                      row.isToday && todayRowClass,
                    )}
                  >
                    <TableCell className="font-semibold text-white">{row.dayLabel}</TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.fajrAdhan} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.fajrIqamah} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.sunrise} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.dhuhrAdhan} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.dhuhrIqamah} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.asrAdhan} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.asrIqamah} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.maghribAdhan} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.maghribIqamah} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.ishaAdhan} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.ishaIqamah} className="font-mono tabular-nums" /></TableCell>
                    <TableCell className="font-mono tabular-nums"><TimeDisplay time={row.jummahIqamah} className="font-mono tabular-nums" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
