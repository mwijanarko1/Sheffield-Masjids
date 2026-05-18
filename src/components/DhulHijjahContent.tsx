"use client";

import { useEffect, useState } from "react";
import LastTenChecklistSection from "@/components/LastTenChecklistSection";
import { GLASS_PANEL_STYLE } from "@/lib/design-surface";
import {
  DHUL_HIJJAH_FIRST_DAY_STARTS_MAY_DATE,
  DHUL_HIJJAH_LAST_BOUNDARY_MAY_DATE,
  DHUL_HIJJAH_TRACKER_YEAR,
} from "@/lib/dhul-hijjah-calendar";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import { getPrayerTimesForDate } from "@/lib/prayer-times";
import { cn } from "@/lib/utils";

const DHUL_HIJJAH_YEAR = DHUL_HIJJAH_TRACKER_YEAR;
const START_DAY = DHUL_HIJJAH_FIRST_DAY_STARTS_MAY_DATE;
const END_DAY = DHUL_HIJJAH_LAST_BOUNDARY_MAY_DATE;
const MONTH_INDEX = 4; // May (0-indexed)

interface Props {
  mosques: Mosque[];
}

function formatTo12Hour(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const ampm = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")}${ampm}`;
}

/** DESIGN.md — micro uppercase column / meta label */
const metaLabelClass =
  "mb-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--theme-text-muted)] sm:text-[10px] sm:tracking-[0.2em]";

/** Mobile stays narrow; tablet/desktop grow with the page shell (max-w-6xl/7xl). */
const DHUL_PAGE_CARD_WRAP =
  "relative z-[1] mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl";

export default function DhulHijjahContent({ mosques }: Props) {
  const { selectedMosque } = usePersistedMosque(mosques);
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<string>("--:--");
  const [endTime, setEndTime] = useState<string>("--:--");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMosque) return;

    let cancelled = false;

    const fetchTimes = async () => {
      try {
        const may17 = new Date(Date.UTC(DHUL_HIJJAH_YEAR, MONTH_INDEX, START_DAY, 11, 0, 0));
        const may27 = new Date(Date.UTC(DHUL_HIJJAH_YEAR, MONTH_INDEX, END_DAY, 11, 0, 0));

        const [may17Times, may27Times] = await Promise.all([
          getPrayerTimesForDate(selectedMosque.slug, may17),
          getPrayerTimesForDate(selectedMosque.slug, may27),
        ]);

        if (cancelled) return;

        setStartTime(may17Times.maghrib);
        setEndTime(may27Times.maghrib);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError("Could not load prayer times for the selected mosque.");
        setLoading(false);
      }
    };

    fetchTimes();
    return () => { cancelled = true; };
  }, [selectedMosque]);

  useEffect(() => {
    if (loading || error || startTime === "--:--" || endTime === "--:--") return;

    function calcProgress() {
      const now = new Date();

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      if (!sh || !eh || sm === undefined || em === undefined) return;

      // May 17 is BST (UTC+1), so subtract 1 from hours for UTC
      const startUtc = Date.UTC(DHUL_HIJJAH_YEAR, MONTH_INDEX, START_DAY, sh - 1, sm, 0);
      const endUtc = Date.UTC(DHUL_HIJJAH_YEAR, MONTH_INDEX, END_DAY, eh - 1, em, 0);

      const total = endUtc - startUtc;
      const elapsed = now.getTime() - startUtc;

      setProgress(Math.min(100, Math.max(0, (elapsed / total) * 100)));
    }

    calcProgress();
    const interval = setInterval(calcProgress, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loading, error, startTime, endTime]);

  const currentDay = Math.min(10, Math.max(1, Math.floor(progress / 10) + 1));
  const isBefore = progress <= 0;
  const isAfter = progress >= 100;
  const showDayGradient = !isBefore && !isAfter;

  return (
    <div className="relative flex flex-col gap-8">
      <header className="relative text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="bg-gradient-to-br from-[var(--theme-on-primary)] via-[var(--theme-highlight-cream)] to-[var(--theme-accent-countdown)] bg-clip-text text-transparent">
            Dhul Hijjah
          </span>
        </h1>
        <p className="mt-2 text-sm text-[var(--theme-text-muted)]">
          The Blessed 10 Days{" "}
          <span className="text-[var(--theme-accent-countdown)]/80" aria-hidden>
            ·
          </span>{" "}
          <span className="font-semibold text-[var(--theme-highlight-cream)]">1447 AH</span>
        </p>
      </header>

      <div className={DHUL_PAGE_CARD_WRAP}>
        <div
          className="relative overflow-hidden rounded-xl ring-1 ring-[rgba(255,179,128,0.28)]"
          style={GLASS_PANEL_STYLE}
        >
          {loading ? (
            <div className="relative flex items-center justify-center py-14">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-[var(--theme-accent-countdown)]" />
            </div>
          ) : error ? (
            <p className="relative px-4 pt-4 text-center text-sm text-red-400">{error}</p>
          ) : (
            <div className="relative px-4 pb-6 pt-5 sm:px-6 md:px-8 lg:px-10">
              <div className="mb-5 text-center">
                <span
                  className={cn(
                    "inline-block font-bold leading-none tracking-tight text-5xl md:text-6xl lg:text-7xl",
                    isBefore && "text-white/85",
                    isAfter && "text-[var(--theme-accent-countdown)]",
                    showDayGradient &&
                      "bg-gradient-to-b from-[var(--theme-on-primary)] to-[var(--theme-accent-countdown)] bg-clip-text text-transparent",
                  )}
                >
                  {isBefore ? "—" : isAfter ? "✓" : currentDay}
                </span>
                <div className="mt-2 text-xs font-medium uppercase tracking-wider text-[var(--theme-accent-countdown)]/80">
                  {isBefore
                    ? "Not started yet"
                    : isAfter
                      ? "All 10 days completed"
                      : `Day ${currentDay} of 10`}
                </div>
              </div>

              <div className="relative h-4 w-full overflow-hidden rounded-full bg-[rgba(10,17,40,0.35)] ring-1 ring-white/10 md:h-5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent-countdown)] to-[var(--theme-accent-countdown-deep)] transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>

              <div className="mt-2 text-center text-sm font-semibold tabular-nums text-[var(--theme-accent-countdown)]">
                {progress.toFixed(1)}% complete
              </div>

              <div className="mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs">
                <div className="min-w-0 text-left text-white/45">
                  <div className={metaLabelClass}>Starts</div>
                  <div className="truncate font-bold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] sm:text-sm">
                    17 May · {formatTo12Hour(startTime)}
                  </div>
                </div>
                <div className="min-w-0 text-right text-white/45">
                  <div className={metaLabelClass}>Ends</div>
                  <div className="truncate font-bold tabular-nums text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] sm:text-sm">
                    27 May · {formatTo12Hour(endTime)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!loading && !error && (
        <div className={DHUL_PAGE_CARD_WRAP}>
          <LastTenChecklistSection
            variant="embedded"
            accent="dhulHijjah"
            dhulHijjahDayContext={{ currentDay, isBefore, isAfter }}
          />
        </div>
      )}
    </div>
  );
}
