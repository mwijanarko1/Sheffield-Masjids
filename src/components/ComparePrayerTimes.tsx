"use client";

import { useState, useEffect } from "react";
import {
  getPrayerTimesForDate,
  getIqamahTimesForSpecificDateWithDstMapping,
  getIqamahTime,
  getDateInSheffield,
  getDisplayedPrayerTimes,
  formatDateForDisplay,
  formatTo12Hour,
  isValidTimeForMarkup,
  resolveIshaIqamahForDisplay,
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

  useEffect(() => {
    if (!isOpen && !standalone) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setData([]);

      const results = await Promise.all(
        mosques.map(async (mosque) => {
          try {
            const [prayerTimes, iqamahTimes] = await Promise.all([
              getPrayerTimesForDate(mosque.slug, selectedDate),
              getIqamahTimesForSpecificDateWithDstMapping(mosque.slug, selectedDate),
            ]);

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

    const pt = getDisplayedPrayerTimes(mosqueData.prayerTimes, selectedDate, mosqueData.mosque.slug);
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
        return resolveIshaIqamahForDisplay(
          mosqueData.mosque.slug,
          selectedDate,
          pt.isha,
          iq,
          pt.maghrib,
        );
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
    const pt = getDisplayedPrayerTimes(mosqueData.prayerTimes, selectedDate, mosqueData.mosque.slug);
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
    <section className="space-y-6">
      {!standalone && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full sm:w-auto h-12 rounded-xl bg-[var(--theme-accent-countdown)] text-[var(--theme-bg)] font-bold hover:bg-[var(--theme-accent-countdown-deep)] transition-colors shadow-lg"
          aria-expanded={isOpen}
          aria-controls="compare-mosques-table"
        >
          {isOpen ? "Hide Comparison" : "Compare Mosques"}
        </Button>
      )}

      {(isOpen || standalone) && (
        <div
          id="compare-mosques-table"
          className="relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(10,17,40,0.25)] text-white shadow-2xl backdrop-blur-[20px] saturate-[180%]"
        >
          {/* Specular top edge shimmer */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />

          <div className="relative z-10 px-4 pb-6 pt-6 md:px-6 md:pb-8 md:pt-8">
            <div className="mb-6 flex flex-col items-center gap-4 text-center md:mb-8 md:flex-row md:flex-wrap md:items-center md:justify-between md:text-left">
              <div className="w-full text-center md:w-auto md:text-left">
                <span className="mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)] shadow-sm">
                  Prayer Comparison
                </span>
                {standalone ? (
                  <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    Mosque Comparison
                  </h1>
                ) : (
                  <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                    Mosque Comparison
                  </h2>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3 bg-white/5 rounded-full p-1.5 border border-white/10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevDay}
                  aria-label="Previous day"
                  className="min-h-10 min-w-10 rounded-full border border-white/10 bg-white/5 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/10 focus-visible:ring-[var(--theme-ring-focus)] touch-manipulation"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </Button>
                <span className="min-w-[140px] text-center text-sm font-bold tracking-tight text-white/90 sm:min-w-[160px]">
                  {formatDateForDisplay(selectedDate)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextDay}
                  aria-label="Next day"
                  className="min-h-10 min-w-10 rounded-full border border-white/10 bg-white/5 text-white shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/10 focus-visible:ring-[var(--theme-ring-focus)] touch-manipulation"
                >
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </div>
            </div>

            {mosques.length === 0 ? (
              <div className="rounded-xl border border-white/5 bg-white/5 p-12 text-center text-[var(--theme-text-muted)]">
                No mosques available to compare.
              </div>
            ) : isLoading ? (
              <div className="rounded-xl border border-white/5 bg-white/5 p-12 text-center text-[var(--theme-text-muted)] animate-pulse">
                Loading prayer times…
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
                <Table className="min-w-[920px] text-sm text-white sm:text-base">
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-white/5">
                      <TableHead className="h-12 w-[120px] bg-[var(--theme-bg)]/80 font-bold uppercase tracking-wider text-[var(--theme-text-muted)] backdrop-blur-md">
                        Prayer
                      </TableHead>
                      {data.map(({ mosque, error }) => (
                        <TableHead
                          key={mosque.id}
                          className="h-12 min-w-[140px] text-center text-xs font-black uppercase tracking-wide text-white sm:text-sm"
                        >
                          <div className="truncate px-2" title={mosque.name}>
                            {mosque.name.replace(/ Sheffield$/, "")}
                          </div>
                          {error && (
                            <span className="mt-0.5 block text-[10px] font-bold text-[var(--theme-accent-countdown)] animate-pulse">
                              {error}
                            </span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PRAYER_NAMES.map((prayer) => (
                      <TableRow key={prayer} className="border-white/5 hover:bg-white/5 h-16">
                          <TableCell className="bg-[var(--theme-bg)]/80 font-black text-white/80 backdrop-blur-md">
                            {prayer}
                          </TableCell>
                        {data.map((mosqueData) => (
                          <TableCell
                            key={mosqueData.mosque.id}
                            className="text-center"
                          >
                            {mosqueData.error ? (
                              <span className="text-white/20">—</span>
                            ) : prayer === "Jummah" ? (
                              <span className="font-mono text-base font-bold text-[var(--theme-accent-countdown)]">
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
                                <span className="font-mono text-base font-bold text-white">
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
                                  <span className="font-mono text-[11px] font-medium text-white/40">
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

            <div className="mt-4 text-center text-[10px] text-[var(--theme-text-muted)] font-bold uppercase tracking-widest opacity-60">
              Top: Adhan · Bottom: Iqamah · Jummah: single time
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
