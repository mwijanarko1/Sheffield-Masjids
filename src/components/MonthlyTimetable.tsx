"use client";

import { useEffect, useMemo, useState } from "react";
import { getIqamahTime, getIqamahTimesForDate, getDateInSheffield, loadMonthlyPrayerTimes } from "@/lib/prayer-times";
import { TimeDisplay } from "@/components/TimeDisplay";
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

  return (
    <Card className="overflow-hidden rounded-xl shadow-lg sm:rounded-2xl sm:shadow-xl xl:rounded-3xl bg-gradient-to-b from-white/10 via-white/5 via-[15%] to-transparent backdrop-blur-md border border-white/20 sm:border-2 text-white">
      <CardHeader className="border-b border-white/10 bg-white/5 p-4 sm:p-6">
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
            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[1180px] text-white text-sm sm:text-base">
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
                        row.isToday && todayRowClass,
                      )}
                    >
                      <TableCell className="font-medium">{row.dayLabel}</TableCell>
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

            <div className="grid gap-3 md:hidden">
              {rows.map((row) => (
                <div
                  key={`mobile-${selectedMonth}-${row.day}`}
                  className={cn(
                    "flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur-md",
                    row.isToday && "border-[#FFB380]/45 bg-[#FFB380]/12 ring-1 ring-[#FFB380]/30",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                    <p className="text-sm font-bold tracking-wide text-white">{row.dayLabel}</p>
                    {row.isToday && <span className="rounded-full bg-[#FFB380]/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#FFB380] uppercase">Today</span>}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2.5 text-xs text-white/80">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1 col-span-1">Prayer</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1 text-right col-span-1">Adhan</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1 text-right col-span-1">Iqamah</div>

                    <div className="font-medium text-white">Fajr</div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.fajrAdhan} /></div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.fajrIqamah} /></div>

                    <div className="font-medium text-white">Sunrise</div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.sunrise} /></div>
                    <div className="text-right font-mono tabular-nums text-white/40">—</div>

                    <div className="font-medium text-white">Dhuhr</div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.dhuhrAdhan} /></div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.dhuhrIqamah} /></div>

                    <div className="font-medium text-white">Asr</div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.asrAdhan} /></div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.asrIqamah} /></div>

                    <div className="font-medium text-white">Maghrib</div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.maghribAdhan} /></div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.maghribIqamah} /></div>

                    <div className="font-medium text-white">Isha</div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.ishaAdhan} /></div>
                    <div className="text-right font-mono tabular-nums"><TimeDisplay time={row.ishaIqamah} /></div>

                    <div className="col-span-3 my-1 h-px bg-white/10"></div>

                    <div className="font-medium text-[#FFB380]">Jummah</div>
                    <div className="text-right font-mono tabular-nums text-white/40">—</div>
                    <div className="text-right font-mono tabular-nums text-[#FFB380]"><TimeDisplay time={row.jummahIqamah} /></div>
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
