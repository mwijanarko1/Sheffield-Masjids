"use client";

import { useEffect, useMemo, useState } from "react";
import { getIqamahTime, getIqamahTimesForDate, loadMonthlyPrayerTimes, formatTo12Hour } from "@/lib/prayer-times";
import { cn } from "@/lib/utils";
import { MonthlyPrayerTimes, Mosque } from "@/types/prayer-times";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
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
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  return now.getMonth() + 1;
}

function getTodayInSheffield() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
  };
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

  return (
    <Card className="overflow-hidden rounded-xl shadow-lg sm:rounded-2xl sm:shadow-xl xl:rounded-3xl bg-gradient-to-b from-[var(--theme-primary)] via-[var(--theme-primary)] via-[15%] to-[var(--theme-accent)] border border-white/40 sm:border-2 sm:border-white/60 text-white">
      <CardHeader className="border-b border-white/10 bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-white">Full month timetable</CardTitle>
            <CardDescription className="text-white/70">
              Adhan and iqamah schedule for {mosque.name}.
            </CardDescription>
          </div>
          <CustomSelect
            options={MONTH_OPTIONS.map(m => ({ id: String(m.value), name: m.label }))}
            value={String(selectedMonth)}
            onChange={(value) => setSelectedMonth(Number(value))}
            className="w-full sm:w-48"
            ariaLabel="Select month"
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        {isLoading && (
          <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Loading timetable…
          </p>
        )}

        {!isLoading && error && (
          <p className="rounded-md border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            {error}
          </p>
        )}

        {!isLoading && !error && rows.length > 0 && (
          <>
            <div className="hidden md:block">
              <Table className="min-w-[1180px] text-white">
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="w-[120px] text-white/80">Date</TableHead>
                    <TableHead className="text-white/80">Fajr Adhan</TableHead>
                    <TableHead className="text-white/80">Fajr Iqamah</TableHead>
                    <TableHead className="text-white/80">Sunrise</TableHead>
                    <TableHead className="text-white/80">Dhuhr Adhan</TableHead>
                    <TableHead className="text-white/80">Dhuhr Iqamah</TableHead>
                    <TableHead className="text-white/80">Asr Adhan</TableHead>
                    <TableHead className="text-white/80">Asr Iqamah</TableHead>
                    <TableHead className="text-white/80">Maghrib Adhan</TableHead>
                    <TableHead className="text-white/80">Maghrib Iqamah</TableHead>
                    <TableHead className="text-white/80">Isha Adhan</TableHead>
                    <TableHead className="text-white/80">Isha Iqamah</TableHead>
                    <TableHead className="text-white/80">Jummah Iqamah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={`${selectedMonth}-${row.day}`}
                      className={cn(
                        "border-white/10 hover:bg-white/5",
                        row.isToday && "border-sky-200/40 bg-sky-300/20 hover:bg-sky-300/25",
                      )}
                    >
                      <TableCell className="font-medium">{row.dayLabel}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.fajrAdhan)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.fajrIqamah)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.sunrise)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.dhuhrAdhan)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.dhuhrIqamah)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.asrAdhan)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.asrIqamah)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.maghribAdhan)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.maghribIqamah)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.ishaAdhan)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.ishaIqamah)}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatTo12Hour(row.jummahIqamah)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {rows.map((row) => (
                <div
                  key={`mobile-${selectedMonth}-${row.day}`}
                  className={cn(
                    "rounded-md border border-white/10 bg-white/5 p-4",
                    row.isToday && "border-sky-200/50 bg-sky-300/20",
                  )}
                >
                  <p className="mb-3 text-sm font-semibold text-white">{row.dayLabel}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
                    <span>Fajr Adhan</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.fajrAdhan)}</span>
                    <span>Fajr Iqamah</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.fajrIqamah)}</span>
                    <span>Sunrise</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.sunrise)}</span>
                    <span>Dhuhr Adhan</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.dhuhrAdhan)}</span>
                    <span>Dhuhr Iqamah</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.dhuhrIqamah)}</span>
                    <span>Asr Adhan</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.asrAdhan)}</span>
                    <span>Asr Iqamah</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.asrIqamah)}</span>
                    <span>Maghrib Adhan</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.maghribAdhan)}</span>
                    <span>Maghrib Iqamah</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.maghribIqamah)}</span>
                    <span>Isha Adhan</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.ishaAdhan)}</span>
                    <span>Isha Iqamah</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.ishaIqamah)}</span>
                    <span>Jummah Iqamah</span>
                    <span className="font-mono tabular-nums text-right">{formatTo12Hour(row.jummahIqamah)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
