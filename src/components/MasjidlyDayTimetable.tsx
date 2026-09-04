"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import {
  getDateInSheffield,
  formatTo12Hour,
  loadMonthlyPrayerTimes,
} from "@/lib/prayer-times";
import {
  MASJIDLY_MODERN_SKIES,
  mutedTextForTheme,
  textColorForTheme,
} from "@/lib/masjidly-theme";
import { cn } from "@/lib/utils";
import type { Mosque } from "@/types/prayer-times";
import { buildMonthlyTimetableRowsAsync } from "@/features/calendar-export/lib/build-monthly-calendar-events";
import type { MonthlyTimetableRow } from "@/features/calendar-export/types";

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

interface MasjidlyDayTimetableProps {
  mosque: Mosque;
  selectedMonth?: number;
  onSelectedMonthChange?: (month: number) => void;
}

/**
 * Masjidly TimetableView parity: month switcher, horizontal date strip,
 * and a vertical prayer stack for the selected day.
 */
export default function MasjidlyDayTimetable({
  mosque,
  selectedMonth,
  onSelectedMonthChange,
}: MasjidlyDayTimetableProps) {
  const { theme, uses24HourTime } = useMasjidlyTheme();
  const formatTime = (value: string) => uses24HourTime ? value : formatTo12Hour(value);
  const fg = textColorForTheme(theme);
  const fgMuted = mutedTextForTheme(theme);
  const lightFg = MASJIDLY_MODERN_SKIES[theme].lightForeground;

  const [internalMonth, setInternalMonth] = useState(
    () => getDateInSheffield(new Date()).month,
  );
  const activeMonth = selectedMonth ?? internalMonth;
  const setActiveMonth = onSelectedMonthChange ?? setInternalMonth;
  const [currentYear] = useState(() => getDateInSheffield(new Date()).year);
  const [today] = useState(() => {
    const d = getDateInSheffield(new Date());
    return { day: d.day, month: d.month };
  });

  const [rows, setRows] = useState<MonthlyTimetableRow[]>([]);
  const [selectedDay, setSelectedDay] = useState(today.day);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await loadMonthlyPrayerTimes(
          mosque.slug,
          activeMonth,
          currentYear,
        );
        const built = await buildMonthlyTimetableRowsAsync({
          slug: mosque.slug,
          year: currentYear,
          monthlyData: data,
          selectedMonth: activeMonth,
          today,
        });
        if (!mounted) return;
        setRows(built);
        setSelectedDay(activeMonth === today.month && built.some((row) => row.day === today.day)
          ? today.day : (built[0]?.day ?? 1));
        if (built.length === 0) setError("Monthly timetable is not available for this mosque.");
      } catch {
        if (!mounted) return;
        setRows([]);
        setError("Monthly timetable is not available for this mosque.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mosque.slug, activeMonth, currentYear]);

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(
      `[data-day="${selectedDay}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedDay, rows.length]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.day === selectedDay) ?? null,
    [rows, selectedDay],
  );

  const prayerStack = useMemo(() => {
    if (!selectedRow) return [];
    const isFri = new Date(Date.UTC(currentYear, activeMonth - 1, selectedRow.day, 12)).getUTCDay() === 5;
    return [
      {
        id: "fajr",
        name: "Fajr",
        adhan: selectedRow.fajrAdhan,
        iqamah: selectedRow.fajrIqamah,
      },
      {
        id: "sunrise",
        name: "Sunrise",
        adhan: selectedRow.sunrise,
        iqamah: "-",
      },
      {
        id: "dhuhr",
        name: isFri ? "Jummah" : "Dhuhr",
        adhan: selectedRow.dhuhrAdhan,
        iqamah: isFri
          ? selectedRow.jummahIqamah || selectedRow.dhuhrIqamah
          : selectedRow.dhuhrIqamah,
      },
      {
        id: "asr",
        name: "Asr",
        adhan: selectedRow.asrAdhan,
        iqamah: selectedRow.asrIqamah,
      },
      {
        id: "maghrib",
        name: "Maghrib",
        adhan: selectedRow.maghribAdhan,
        iqamah: selectedRow.maghribIqamah,
      },
      {
        id: "isha",
        name: "Isha",
        adhan: selectedRow.ishaAdhan,
        iqamah: selectedRow.ishaIqamah,
      },
    ];
  }, [selectedRow, currentYear, activeMonth]);

  const currentDate = getDateInSheffield(now);
  const viewingToday = currentYear === currentDate.year && activeMonth === currentDate.month && selectedDay === currentDate.day;
  const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Europe/London" }).format(now);
  const nextPrayerId = viewingToday ? prayerStack.find((row) => /^\d{2}:\d{2}$/.test(row.adhan) && row.adhan > clock)?.id : undefined;

  const monthName =
    MONTH_OPTIONS.find((m) => m.value === activeMonth)?.label ?? "Month";

  const date = new Date(Date.UTC(currentYear, activeMonth - 1, selectedDay, 12));
  const selectedDateTitle = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London",
  }).format(date);
  const hijriDate = new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London",
  }).format(date);

  return (
    <section className="mx-auto w-full max-w-xl px-4 pb-8" style={{ color: fg }}>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-light tracking-tight sm:text-xl">
            {selectedDateTitle} · {hijriDate}
          </h2>
          <p className="mt-1 truncate text-sm" style={{ color: fgMuted }}>
            {mosque.name}
          </p>
        </div>
        <Link href="/" aria-label="Close timetable" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-current/10 focus-visible:ring-2 focus-visible:ring-[#47A6FF]">
          <X size={16} aria-hidden />
        </Link>
      </header>

      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setActiveMonth(activeMonth === 1 ? 12 : activeMonth - 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
          style={{ color: fg }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center text-base font-medium sm:text-lg">
          {monthName} {currentYear}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setActiveMonth(activeMonth === 12 ? 1 : activeMonth + 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
          style={{ color: fg }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm" style={{ color: fgMuted }}>
          Loading timetable...
        </p>
      ) : error ? (
        <p className="py-16 text-center text-sm" style={{ color: fgMuted }}>
          {error}
        </p>
      ) : (
        <>
          <div
            ref={stripRef}
            className="mb-8 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {rows.map((row) => {
              const selected = row.day === selectedDay;
              const isTodayRow = row.isToday;
              const weekday = new Intl.DateTimeFormat("en-GB", {
                weekday: "short",
                timeZone: "UTC",
              })
                .format(new Date(Date.UTC(currentYear, activeMonth - 1, row.day, 12, 0, 0)))
                .slice(0, 3)
                .toUpperCase();
              return (
                <button
                  key={row.day}
                  type="button"
                  data-day={row.day}
                  onClick={() => setSelectedDay(row.day)}
                  className={cn(
                    "flex h-[70px] w-12 shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60",
                  )}
                  style={{
                    background: selected
                      ? lightFg
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(29,36,51,0.12)"
                      : "transparent",
                    color: fg,
                  }}
                  aria-pressed={selected}
                >
                  <span
                    className="text-[10px] font-semibold"
                    style={{ opacity: selected ? 1 : 0.4 }}
                  >
                    {weekday}
                  </span>
                  <span
                    className="text-xl"
                    style={{
                      fontWeight: selected ? 500 : 400,
                      opacity: selected ? 1 : 0.5,
                    }}
                  >
                    {row.day}
                  </span>
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{
                      background: isTodayRow ? fg : "transparent",
                    }}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <div
              className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 text-[13px] font-medium"
              style={{ color: fgMuted }}
            >
              <span>Prayer</span>
              <span className="w-20 text-right sm:w-24">Adhan</span>
              <span className="w-20 text-right sm:w-24">Iqamah</span>
            </div>
            {prayerStack.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_auto_auto] items-start gap-3 rounded-2xl px-4 py-4 text-[18px]"
                style={{
                  background: row.id === nextPrayerId ? `${fg}14` : "transparent",
                  opacity: viewingToday && /^\d{2}:\d{2}$/.test(row.adhan) && row.adhan <= clock ? 0.35 : 1,
                }}
                aria-current={row.id === nextPrayerId ? "true" : undefined}
              >
                <span className="min-w-0 font-normal">{row.name}</span>
                <span className="w-20 text-right font-normal tabular-nums opacity-75 sm:w-24">
                  {formatTime(row.adhan || "-")}
                </span>
                <span className="w-20 text-right font-medium tabular-nums sm:w-24">
                  {formatTime(row.iqamah || "-")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
