"use client";

import { useEffect, useMemo, useState } from "react";
import { getIqamahTime, getIqamahTimesForDate, getDateInSheffield } from "@/lib/prayer-times";
import { TimeDisplay } from "@/components/TimeDisplay";
import { cn } from "@/lib/utils";
import { IqamahTimeRange, Mosque } from "@/types/prayer-times";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RamadanTimetableProps {
  mosque: Mosque;
}

interface RamadanPrayerTime {
  ramadan_day: number;
  gregorian: string;
  fajr: string;
  shurooq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface RamadanTimetableData {
  month: string;
  gregorian_start: string;
  gregorian_end: string;
  prayer_times: RamadanPrayerTime[];
  iqamah_times: IqamahTimeRange[];
  jummah_iqamah: string;
  taraweeh?: string;
}

type RamadanRow = {
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

function findRamadanDayData(prayerTimes: RamadanPrayerTime[], day: number): RamadanPrayerTime | undefined {
  const exact = prayerTimes.find((row) => row.ramadan_day === day);
  if (exact) return exact;

  const sorted = [...prayerTimes].sort((a, b) => a.ramadan_day - b.ramadan_day);
  const previousOrEqual = sorted.filter((row) => row.ramadan_day <= day);
  return previousOrEqual.length > 0 ? previousOrEqual[previousOrEqual.length - 1] : sorted[0];
}

function formatGregorianLabel(start: Date, day: number): string {
  const d = new Date(start);
  d.setDate(start.getDate() + day - 1);
  if (Number.isNaN(d.getTime())) return `Day ${day}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getTodayInSheffieldKey(): string {
  const { year, month, day } = getDateInSheffield(new Date());
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getRamadanDateKey(gregorianStart: string, day: number): string | null {
  const [year, month, date] = gregorianStart.split("-").map(Number);
  if (!year || !month || !date) return null;
  const rowDate = new Date(Date.UTC(year, month - 1, date + day - 1));
  return rowDate.toISOString().slice(0, 10);
}

export default function RamadanTimetable({ mosque }: RamadanTimetableProps) {
  const [ramadanData, setRamadanData] = useState<RamadanTimetableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todayKey = useMemo(() => getTodayInSheffieldKey(), []);

  useEffect(() => {
    let isMounted = true;

    const loadRamadanData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { loadRamadanCalendar } = await import("@/lib/prayer-times");
        const data = await loadRamadanCalendar(mosque.slug);
        if (!isMounted) return;
        setRamadanData(data);
      } catch {
        if (!isMounted) return;
        setRamadanData(null);
        setError("Ramadan timetable is not available for this mosque.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRamadanData();

    return () => {
      isMounted = false;
    };
  }, [mosque.slug]);

  const rows = useMemo<RamadanRow[]>(() => {
    if (!ramadanData) return [];

    const startDate = new Date(ramadanData.gregorian_start);
    const endDate = new Date(ramadanData.gregorian_end);
    const dayMs = 1000 * 60 * 60 * 24;
    const rangeLength = Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1;
    const totalDays = Number.isFinite(rangeLength) && rangeLength > 0 ? rangeLength : 30;

    return Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const prayerTimes = findRamadanDayData(ramadanData.prayer_times, day);
      if (!prayerTimes) return null;

      let iqamahTimes;
      try {
        iqamahTimes = getIqamahTimesForDate(day, ramadanData.iqamah_times);
      } catch {
        iqamahTimes = {
          fajr: "-",
          dhuhr: "-",
          asr: "-",
          maghrib: "-",
          isha: "-",
          jummah: ramadanData.jummah_iqamah,
        };
      }

      return {
        isToday: getRamadanDateKey(ramadanData.gregorian_start, day) === todayKey,
        day,
        dayLabel: formatGregorianLabel(startDate, day),
        fajrAdhan: prayerTimes.fajr,
        fajrIqamah: getIqamahTime("fajr", prayerTimes.fajr, iqamahTimes),
        sunrise: prayerTimes.shurooq,
        dhuhrAdhan: prayerTimes.dhuhr,
        dhuhrIqamah: getIqamahTime("dhuhr", prayerTimes.dhuhr, iqamahTimes),
        asrAdhan: prayerTimes.asr,
        asrIqamah: getIqamahTime("asr", prayerTimes.asr, iqamahTimes),
        maghribAdhan: prayerTimes.maghrib,
        maghribIqamah: getIqamahTime("maghrib", prayerTimes.maghrib, iqamahTimes),
        ishaAdhan: prayerTimes.isha,
        ishaIqamah: getIqamahTime("isha", prayerTimes.isha, iqamahTimes, prayerTimes.maghrib),
        jummahIqamah: ramadanData.jummah_iqamah || "—",
      };
    }).filter((row): row is RamadanRow => row !== null);
  }, [ramadanData, todayKey]);

  const todayRowClass =
    "border-[#FFB380]/45 bg-[#FFB380]/12 hover:bg-[#FFB380]/18";

  return (
    <Card className="overflow-hidden rounded-xl border border-white/40 bg-gradient-to-b from-white/10 via-white/5 via-[15%] to-transparent text-white shadow-lg backdrop-blur-md sm:rounded-2xl sm:border-2 sm:border-white/60 sm:shadow-xl xl:rounded-3xl">
      <CardHeader className="border-b border-white/10 bg-white/5 p-4 sm:p-6">
        <CardTitle className="text-white">Ramadan timetable</CardTitle>
        <CardDescription className="text-white/70">
          {ramadanData?.month ?? "Ramadan"} schedule for {mosque.name}.
        </CardDescription>
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
            <div className="overflow-x-auto">
              <Table className="min-w-[1320px] text-white text-sm sm:text-base">
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="w-[120px] text-white/80">Day</TableHead>
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
                      key={`ramadan-${row.day}`}
                      className={cn(
                        "border-white/10 hover:bg-white/5",
                        row.isToday && todayRowClass,
                      )}
                    >
                      <TableCell className="font-medium">Day {row.day}</TableCell>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
