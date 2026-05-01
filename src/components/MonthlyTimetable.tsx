"use client";

import { useEffect, useState } from "react";
import { getDateInSheffield, loadMonthlyPrayerTimes } from "@/lib/prayer-times";
import { TimeDisplay } from "@/components/TimeDisplay";
import { cn } from "@/lib/utils";
import { MonthlyPrayerTimes, Mosque } from "@/types/prayer-times";
import { buildMonthlyTimetableRowsAsync } from "@/features/calendar-export/lib/build-monthly-calendar-events";
import type { MonthlyTimetableRow } from "@/features/calendar-export/types";
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
  selectedMonth?: number;
  onSelectedMonthChange?: (month: number) => void;
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

function getTodayInSheffield() {
  const { month, day } = getDateInSheffield(new Date());
  return { day, month };
}

export default function MonthlyTimetable({
  mosque,
  selectedMonth,
  onSelectedMonthChange,
}: MonthlyTimetableProps) {
  const [internalSelectedMonth, setInternalSelectedMonth] = useState(getDateInSheffield(new Date()).month);
  const [monthlyData, setMonthlyData] = useState<MonthlyPrayerTimes | null>(null);
  const [rows, setRows] = useState<MonthlyTimetableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today] = useState(() => getTodayInSheffield());
  const [currentYear] = useState(() => getDateInSheffield(new Date()).year);
  const activeMonth = selectedMonth ?? internalSelectedMonth;
  const setActiveMonth = onSelectedMonthChange ?? setInternalSelectedMonth;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await loadMonthlyPrayerTimes(mosque.slug, activeMonth, currentYear);
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
  }, [mosque.slug, activeMonth, currentYear]);

  useEffect(() => {
    if (!monthlyData) {
      setRows([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const built = await buildMonthlyTimetableRowsAsync({
        slug: mosque.slug,
        year: currentYear,
        monthlyData,
        selectedMonth: activeMonth,
        today,
      });
      if (!cancelled) setRows(built);
    })();

    return () => {
      cancelled = true;
    };
  }, [monthlyData, mosque.slug, currentYear, activeMonth, today.day, today.month]);

  const todayRowClass =
    "relative after:absolute after:inset-0 after:z-0 after:bg-gradient-to-r after:from-[var(--theme-accent-countdown)]/30 after:to-[var(--theme-accent-countdown-deep)]/20 after:pointer-events-none";

  const goToPreviousMonth = () => {
    setActiveMonth(activeMonth === 1 ? 12 : activeMonth - 1);
  };

  const goToNextMonth = () => {
    setActiveMonth(activeMonth === 12 ? 1 : activeMonth + 1);
  };

  const selectedMonthName =
    MONTH_OPTIONS.find((option) => option.value === activeMonth)?.label ?? "Month";

  return (
    <section
      className="relative mx-auto max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-[rgba(10,17,40,0.25)] text-white shadow-2xl backdrop-blur-[20px] saturate-[180%]"
      aria-label="Monthly prayer timetable"
    >
      {/* Specular top edge shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <div className="relative z-10 px-4 pb-6 pt-6 md:px-6 md:pb-8 md:pt-8">
        <div className="mb-6 flex items-center justify-between gap-3 md:mb-8">
          <button
            type="button"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] touch-manipulation"
          >
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <span className="mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)] shadow-sm">
              Monthly Schedule
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
              {selectedMonthName} {currentYear}
            </h2>
            <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
              {mosque.name}
            </p>
          </div>

          <button
            type="button"
            onClick={goToNextMonth}
            aria-label="Next month"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] touch-manipulation"
          >
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-white/5 bg-white/5 p-12 text-center text-[var(--theme-text-muted)] animate-pulse">
            Loading timetable…
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-xl border border-white/5 bg-white/5 p-12 text-center text-[var(--theme-text-muted)]">
            {error}
          </div>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
            <Table className="min-w-[1000px] text-sm text-white md:text-base">
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-white/5">
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Date</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Fajr</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Sunrise</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Dhuhr</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Asr</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Maghrib</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Isha</TableHead>
                  <TableHead className="h-10 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Jummah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={`${activeMonth}-${row.day}`}
                    className={cn(
                      "border-white/5 transition-colors hover:bg-white/5 h-12",
                      row.isToday && todayRowClass,
                    )}
                  >
                    <TableCell className="relative z-10 font-bold text-white/90">{row.dayLabel}</TableCell>
                    <TableCell className="relative z-10 font-mono tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <TimeDisplay time={row.fajrAdhan} className="text-white/90" />
                        <TimeDisplay time={row.fajrIqamah} className="text-[10px] text-white/50" />
                      </div>
                    </TableCell>
                    <TableCell className="relative z-10 font-mono tabular-nums">
                      <TimeDisplay time={row.sunrise} className="text-white/60" />
                    </TableCell>
                    <TableCell className="relative z-10 font-mono tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <TimeDisplay time={row.dhuhrAdhan} className="text-white/90" />
                        <TimeDisplay time={row.dhuhrIqamah} className="text-[10px] text-white/50" />
                      </div>
                    </TableCell>
                    <TableCell className="relative z-10 font-mono tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <TimeDisplay time={row.asrAdhan} className="text-white/90" />
                        <TimeDisplay time={row.asrIqamah} className="text-[10px] text-white/50" />
                      </div>
                    </TableCell>
                    <TableCell className="relative z-10 font-mono tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <TimeDisplay time={row.maghribAdhan} className="text-white/90" />
                        <TimeDisplay time={row.maghribIqamah} className="text-[10px] text-white/50" />
                      </div>
                    </TableCell>
                    <TableCell className="relative z-10 font-mono tabular-nums">
                      <div className="flex flex-col gap-0.5">
                        <TimeDisplay time={row.ishaAdhan} className="text-white/90" />
                        <TimeDisplay time={row.ishaIqamah} className="text-[10px] text-white/50" />
                      </div>
                    </TableCell>
                    <TableCell className="relative z-10 font-mono tabular-nums">
                      <TimeDisplay time={row.jummahIqamah} className="font-bold text-[var(--theme-accent-countdown)]" />
                    </TableCell>
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
