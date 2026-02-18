"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getPrayerTimesForDate,
  getIqamahTimesForSpecificDate,
  getIqamahTime,
  getDSTAdjustmentIqamahDate,
  formatDateForDisplay,
  formatTo12Hour,
} from "@/lib/prayer-times";
import { DailyPrayerTimes, DailyIqamahTimes, Mosque } from "@/types/prayer-times";
import mosquesData from "../../public/data/mosques.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mosques = (mosquesData.mosques as Mosque[]).filter(
  (m) => m.id !== "sheffield-grand-mosque"
);

interface MosquePrayerData {
  mosque: Mosque;
  prayerTimes: DailyPrayerTimes | null;
  iqamahTimes: DailyIqamahTimes | null;
  error?: string;
}

const PRAYER_NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha", "Jummah"] as const;

function isSummerPeriod(date: Date): boolean {
  const year = date.getFullYear();
  const may15 = new Date(year, 4, 15);
  const aug15 = new Date(year, 7, 15);
  return date >= may15 && date <= aug15;
}

interface ComparePrayerTimesProps {
  /** When true, always show the table (for dedicated compare page) */
  standalone?: boolean;
}

export default function ComparePrayerTimes({ standalone = false }: ComparePrayerTimesProps) {
  const [isOpen, setIsOpen] = useState(standalone);
  const [selectedDate, setSelectedDate] = useState(
    () => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }))
  );
  const [data, setData] = useState<MosquePrayerData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isSummer = useMemo(() => isSummerPeriod(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!isOpen && !standalone) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setData([]);

      const dstIqamahDate = await getDSTAdjustmentIqamahDate(selectedDate);

      const results = await Promise.all(
        mosques.map(async (mosque) => {
          try {
            let [prayerTimes, iqamahTimes] = await Promise.all([
              getPrayerTimesForDate(mosque.slug, selectedDate),
              getIqamahTimesForSpecificDate(mosque.slug, selectedDate),
            ]);

            if (dstIqamahDate) {
              try {
                const adjustmentDate = new Date(
                  selectedDate.getFullYear(),
                  dstIqamahDate.month - 1,
                  dstIqamahDate.date
                );
                iqamahTimes = await getIqamahTimesForSpecificDate(
                  mosque.slug,
                  adjustmentDate
                );
              } catch {
                // keep original iqamahTimes
              }
            }

            return { mosque, prayerTimes, iqamahTimes };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "";
            return {
              mosque,
              prayerTimes: null,
              iqamahTimes: null,
              error: msg.startsWith("RAMADAN_ONLY:")
                ? "Ramadan only"
                : "No data",
            };
          }
        })
      );

      setData(results);
      setIsLoading(false);
    };

    fetchAll();
  }, [isOpen, selectedDate, standalone]);

  const goToPrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const getIqamahDisplay = (
    prayerKey: string,
    mosqueData: MosquePrayerData
  ): string => {
    if (!mosqueData.prayerTimes || !mosqueData.iqamahTimes) return "—";

    const pt = mosqueData.prayerTimes;
    const iq = mosqueData.iqamahTimes;

    switch (prayerKey) {
      case "Fajr":
        return getIqamahTime("fajr", pt.fajr, iq);
      case "Sunrise":
        return "—";
      case "Dhuhr":
        return getIqamahTime("dhuhr", pt.dhuhr, iq);
      case "Asr":
        return getIqamahTime("asr", pt.asr, iq);
      case "Maghrib":
        return pt.maghrib;
      case "Isha":
        if (isSummer) return "After Maghrib";
        return getIqamahTime("isha", pt.isha, iq, pt.maghrib);
      case "Jummah":
        return iq.jummah || "—";
      default:
        return "—";
    }
  };

  const getAdhanDisplay = (
    prayerKey: string,
    mosqueData: MosquePrayerData
  ): string => {
    if (!mosqueData.prayerTimes) return "—";
    const pt = mosqueData.prayerTimes;
    switch (prayerKey) {
      case "Fajr":
        return pt.fajr;
      case "Sunrise":
        return pt.sunrise;
      case "Dhuhr":
        return pt.dhuhr;
      case "Asr":
        return pt.asr;
      case "Maghrib":
        return pt.maghrib;
      case "Isha":
        return pt.isha;
      case "Jummah":
        return "—";
      default:
        return "—";
    }
  };

  return (
    <section className="space-y-4">
      {!standalone && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full sm:w-auto"
          aria-expanded={isOpen}
          aria-controls="compare-mosques-table"
        >
          {isOpen ? "Hide comparison" : "Compare mosques"}
        </Button>
      )}

      {(isOpen || standalone) && (
        <Card
          id="compare-mosques-table"
          className="overflow-hidden rounded-xl border border-white/40 bg-gradient-to-b from-[var(--theme-primary)] via-[var(--theme-primary)] via-[15%] to-[var(--theme-accent)] text-white shadow-lg sm:rounded-2xl sm:border-2 sm:border-white/60 sm:shadow-xl xl:rounded-3xl"
        >
          <CardHeader className="border-b border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <h3 className="text-lg font-bold text-white">
                Prayer times comparison
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevDay}
                  aria-label="Previous day"
                  className="border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </Button>
                <span className="min-w-[140px] text-center font-medium text-white">
                  {formatDateForDisplay(selectedDate)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextDay}
                  aria-label="Next day"
                  className="border border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-white/70">Loading prayer times…</div>
            ) : (
              <Table className="min-w-[920px] text-white">
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="md:sticky md:left-0 md:z-20 md:bg-[var(--theme-primary)] md:backdrop-blur-md">
                      Prayer
                    </TableHead>
                    {data.map(({ mosque, error }) => (
                      <TableHead
                        key={mosque.id}
                        className="min-w-[130px] text-center text-white"
                      >
                        <div className="truncate" title={mosque.name}>
                          {mosque.name.replace(/ Sheffield$/, "")}
                        </div>
                        {error && (
                          <span className="mt-0.5 block text-xs font-normal text-amber-200">
                            {error}
                          </span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PRAYER_NAMES.map((prayer) => (
                    <TableRow key={prayer} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white/80 md:sticky md:left-0 md:z-10 md:bg-[var(--theme-primary)] md:backdrop-blur-md">
                        {prayer}
                      </TableCell>
                      {data.map((mosqueData) => (
                        <TableCell
                          key={mosqueData.mosque.id}
                          className="text-center"
                        >
                          {mosqueData.error ? (
                            <span className="text-white/50">—</span>
                          ) : prayer === "Jummah" ? (
                            <span className="font-mono text-white">
                              {formatTo12Hour(getIqamahDisplay(prayer, mosqueData))}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-white">
                                {formatTo12Hour(getAdhanDisplay(prayer, mosqueData))}
                              </span>
                              {prayer !== "Sunrise" && (
                                <span className="font-mono text-xs text-white/65">
                                  {formatTo12Hour(getIqamahDisplay(prayer, mosqueData))}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          <CardFooter className="border-t border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
            Top row: Adhan · Bottom row: Iqamah · Jummah: single time
          </CardFooter>
        </Card>
      )}
    </section>
  );
}
