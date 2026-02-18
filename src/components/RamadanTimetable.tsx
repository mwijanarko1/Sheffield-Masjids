"use client";

import { useEffect, useMemo, useState } from "react";
import { formatTo12Hour, getIqamahTime, getIqamahTimesForDate } from "@/lib/prayer-times";
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
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
        const response = await fetch(`/data/mosques/${mosque.slug}/ramadan.json`);
        if (!response.ok) {
          throw new Error("missing");
        }
        const data = await response.json();
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

  return (
    <Card className="overflow-hidden rounded-xl shadow-lg sm:rounded-2xl sm:shadow-xl xl:rounded-3xl bg-gradient-to-b from-[var(--theme-primary)] via-[var(--theme-primary)] via-[15%] to-[var(--theme-accent)] border border-white/40 sm:border-2 sm:border-white/60 text-white">
      <CardHeader className="border-b border-white/10 bg-white/5">
        <CardTitle className="text-white">Ramadan timetable</CardTitle>
        <CardDescription className="text-white/70">
          {ramadanData?.month ?? "Ramadan"} schedule for {mosque.name}.
        </CardDescription>
        {ramadanData?.taraweeh && (
          <p className="text-xs text-white/70">{ramadanData.taraweeh}</p>
        )}
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
            <div>
              <Table className="min-w-[1320px] text-white">
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
                        row.isToday && "border-sky-200/40 bg-sky-300/20 hover:bg-sky-300/25",
                      )}
                    >
                      <TableCell className="font-medium">Day {row.day}</TableCell>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
