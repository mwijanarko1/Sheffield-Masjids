"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getPrayerTimesForDate,
  getIqamahTimesForSpecificDate,
  getIqamahTime,
  getDSTAdjustmentIqamahDate,
  getDateInSheffield,
  formatDateForDisplay,
  formatTo12Hour,
  isValidTimeForMarkup,
} from "@/lib/prayer-times";
import { DailyPrayerTimes, DailyIqamahTimes, Mosque } from "@/types/prayer-times";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  mosques: Mosque[];
}

export default function ComparePrayerTimes({
  standalone = false,
  mosques,
}: ComparePrayerTimesProps) {
  const [isOpen, setIsOpen] = useState(standalone);
  const [selectedDate, setSelectedDate] = useState(() => {
    const { year, month, day } = getDateInSheffield(new Date());
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  });
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
  }, [isOpen, selectedDate, standalone, mosques]);

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
        return getIqamahTime("maghrib", pt.maghrib, iq);
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
        <div
          id="compare-mosques-table"
          className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-b from-white/10 via-white/5 via-[15%] to-transparent text-white shadow-2xl backdrop-blur-md"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#FFB380]/10 blur-3xl" />

          <div className="relative z-10 px-4 pb-6 pt-6 md:px-8 md:pb-8 md:pt-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:mb-7">
              <div className="text-center sm:text-left">
                <span className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 shadow-sm md:text-xs">
                  Prayer Comparison
                </span>
                <h3 className="text-lg font-bold text-white md:text-2xl">
                  Compare Mosques By Date
                </h3>
              </div>
              <div className="mx-auto flex items-center gap-1.5 sm:mx-0 sm:gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevDay}
                  aria-label="Previous day"
                  className="min-h-11 min-w-11 border border-white/20 bg-white/10 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-md focus-visible:ring-[#FFB380]/40 touch-manipulation"
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
                <span className="min-w-[120px] text-center text-sm font-semibold text-white sm:min-w-[150px] sm:text-base">
                  {formatDateForDisplay(selectedDate)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextDay}
                  aria-label="Next day"
                  className="min-h-11 min-w-11 border border-white/20 bg-white/10 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-md focus-visible:ring-[#FFB380]/40 touch-manipulation"
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

            {mosques.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/70 backdrop-blur-md">
                No mosques available to compare.
              </div>
            ) : isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/70 backdrop-blur-md">
                Loading prayer times…
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                <Table className="min-w-[920px] text-sm text-white sm:text-base">
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="bg-[#0A1128]/80 font-bold uppercase tracking-wider text-white/80 backdrop-blur-md">
                        Prayer
                      </TableHead>
                      {data.map(({ mosque, error }) => (
                        <TableHead
                          key={mosque.id}
                          className="min-w-[130px] text-center text-xs font-bold uppercase tracking-wide text-white sm:text-sm"
                        >
                          <div className="truncate" title={mosque.name}>
                            {mosque.name.replace(/ Sheffield$/, "")}
                          </div>
                          {error && (
                            <span className="mt-0.5 block text-[11px] font-medium text-amber-200">
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
                          <TableCell className="bg-[#0A1128]/80 font-semibold text-white/80 backdrop-blur-md">
                            {prayer}
                          </TableCell>
                        {data.map((mosqueData) => (
                          <TableCell
                            key={mosqueData.mosque.id}
                            className="text-center"
                          >
                            {mosqueData.error ? (
                              <span className="text-white/45">—</span>
                            ) : prayer === "Jummah" ? (
                              <span className="font-mono text-white">
                                {(() => {
                                  const raw = getIqamahDisplay(prayer, mosqueData);
                                  return isValidTimeForMarkup(raw) ? (
                                    <time dateTime={raw}>{formatTo12Hour(raw)}</time>
                                  ) : (
                                    formatTo12Hour(raw)
                                  );
                                })()}
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-white">
                                  {(() => {
                                    const raw = getAdhanDisplay(prayer, mosqueData);
                                    return isValidTimeForMarkup(raw) ? (
                                      <time dateTime={raw}>{formatTo12Hour(raw)}</time>
                                    ) : (
                                      formatTo12Hour(raw)
                                    );
                                  })()}
                                </span>
                                {prayer !== "Sunrise" && (
                                  <span className="font-mono text-xs text-white/65">
                                    {(() => {
                                      const raw = getIqamahDisplay(prayer, mosqueData);
                                      return isValidTimeForMarkup(raw) ? (
                                        <time dateTime={raw}>{formatTo12Hour(raw)}</time>
                                      ) : (
                                        formatTo12Hour(raw)
                                      );
                                    })()}
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
              </div>
            )}

            <div className="mt-3 text-center text-[10px] text-white/70 sm:text-xs">
              Top row: Adhan · Bottom row: Iqamah · Jummah: single time
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
