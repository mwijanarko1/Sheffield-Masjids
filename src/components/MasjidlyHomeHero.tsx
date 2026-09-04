"use client";

import Link from "next/link";
import { useRef } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import PrayerSunPhaseIcon from "@/components/PrayerSunPhaseIcon";
import type { MasjidlyTimeTheme } from "@/lib/masjidly-theme";

export type HeroPrayerItem = {
  id: string;
  label: string;
  letter: string;
  adhan: string;
  iqamah: string | null;
  theme: MasjidlyTimeTheme;
};

interface MasjidlyHomeHeroProps {
  fg: string;
  fgMuted: string;
  skyTheme: MasjidlyTimeTheme;
  gregorianDate: string;
  hijriDate: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  prayers: HeroPrayerItem[];
  selectedIndex: number;
  onSelectPrayer: (index: number) => void;
  showCountdown: boolean;
  onToggleCountdown: () => void;
  countdownLabel: string | null;
  countdownClock: string | null;
  isToday: boolean;
  selectedDate: string;
  onDateChange: (value: string) => void;
  onToday: () => void;
  showIqamahTime: boolean;
  formatTime: (hhmm: string) => string;
}

function circleBtnClass(fg: string) {
  return {
    color: fg,
    background: "rgba(255,255,255,0.18)",
  } as const;
}

export default function MasjidlyHomeHero({
  fg,
  fgMuted,
  skyTheme,
  gregorianDate,
  hijriDate,
  onPrevDay,
  onNextDay,
  prayers,
  selectedIndex,
  onSelectPrayer,
  showCountdown,
  onToggleCountdown,
  countdownLabel,
  countdownClock,
  isToday,
  selectedDate,
  onDateChange,
  onToday,
  showIqamahTime,
  formatTime,
}: MasjidlyHomeHeroProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const selected = prayers[selectedIndex] ?? prayers[0];
  const iqamahLine =
    showIqamahTime && selected && selected.id !== "sunrise" && selected.iqamah && selected.iqamah !== "-"
      ? `Iqamah: ${formatTime(selected.iqamah)}`
      : null;

  return (
    <div
      className="relative flex min-h-[100dvh] w-full flex-col font-sans"
      style={{ color: fg }}
    >
      {/* Top chrome: calendar | date | settings (Masjidly HomeTopChrome) */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-6">
        <Link
          href="/timetable"
          aria-label="Open timetable"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
          style={circleBtnClass(fg)}
        >
          <CalendarRange size={20} strokeWidth={1.8} aria-hidden />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPrevDay}
            aria-label="Previous day"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full opacity-55 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
            style={{ color: fg }}
          >
            <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
          </button>
          <label className="relative min-w-0 rounded-full border border-current/10 bg-white/18 px-3 py-2 text-center focus-within:ring-2 focus-within:ring-[#47A6FF]/60">
            <div
              className="truncate text-[13px] font-semibold tracking-[0.08em]"
              style={{ color: fgMuted }}
            >
              {gregorianDate}
            </div>
            <div
              className="truncate text-[10px] font-medium tracking-[0.08em]"
              style={{ color: fg, opacity: 0.4 }}
            >
              {hijriDate}
            </div>
            <input
              type="date"
              aria-label="Choose prayer date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          <button
            type="button"
            onClick={onNextDay}
            aria-label="Next day"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full opacity-55 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
            style={{ color: fg }}
          >
            <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <Link
          href="/settings"
          aria-label="Open settings"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
          style={circleBtnClass(fg)}
        >
          <Settings size={20} strokeWidth={1.8} aria-hidden />
        </Link>
      </div>

      {/* Hero (Masjidly MinimalistPrayerPage) */}
      <div
        className="relative z-10 flex flex-1 touch-pan-y flex-col items-center px-5 pb-32 pt-10 sm:pt-14"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchCancel={() => { touchStart.current = null; }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const touch = event.changedTouches[0];
          touchStart.current = null;
          if (!start || !touch) return;
          const horizontal = touch.clientX - start.x;
          const vertical = touch.clientY - start.y;
          if (Math.abs(horizontal) <= 56 || Math.abs(horizontal) <= Math.abs(vertical)) return;
          if (horizontal > 0) onPrevDay();
          else onNextDay();
        }}
      >
        {!isToday && (
          <button type="button" onClick={onToday} className="absolute top-1 rounded-full bg-white/18 px-4 py-1 text-xs focus-visible:ring-2 focus-visible:ring-[#47A6FF]">
            Back to today
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCountdown}
          className="relative mb-10 flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
          aria-label={
            showCountdown
              ? "Hide countdown"
              : isToday
                ? "Show countdown"
                : "Prayer icon"
          }
          disabled={!isToday}
        >
          <span
            className="absolute inset-1 rounded-full"
            style={{
              border: `1px solid ${fg}${showCountdown ? "6B" : "3D"}`,
              boxShadow: `inset 0 0 0 3px transparent, inset 0 0 0 4px ${fg}14`,
            }}
            aria-hidden
          />
          {showCountdown && countdownClock ? (
            <span className="flex flex-col items-center gap-1 px-2 text-center">
              {countdownLabel ? (
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: fgMuted }}>
                  {countdownLabel}
                </span>
              ) : null}
              <span className="text-xl font-light tabular-nums tracking-tight">{countdownClock}</span>
            </span>
          ) : (
            <PrayerSunPhaseIcon theme={skyTheme} color={fg} className={skyTheme === "sunrise" || skyTheme === "maghrib" || skyTheme === "tahajjud" ? "-translate-y-1.5" : undefined} />
          )}
        </button>

        <div className="flex w-full max-w-lg flex-col items-center gap-1.5 text-center">
          <div
            className="w-full text-[clamp(3.25rem,14vw,5.5rem)] font-light leading-none tracking-[-0.02em]"
            style={{ textShadow: `0 5px 10px ${fg}1A` }}
          >
            {selected?.adhan ? formatTime(selected.adhan) : "-"}
          </div>
          {iqamahLine ? (
            <div
              className="max-w-[20rem] text-[clamp(1rem,4vw,1.625rem)] font-normal tracking-[0.02em]"
              style={{ color: fg, opacity: 0.78 }}
            >
              {iqamahLine}
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-6 pb-2 pt-16">
          <div className="text-[clamp(1.75rem,6vw,2.25rem)] font-normal tracking-[-0.01em]">
            {selected?.label ?? ""}
          </div>

          {/* Letter picker */}
          <div
            className="flex w-full max-w-md items-center justify-center gap-3 overflow-x-auto px-2 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Prayers"
          >
            {prayers.map((prayer, index) => {
              const selectedPrayer = index === selectedIndex;
              return (
                <button
                  key={prayer.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedPrayer}
                  aria-label={prayer.label}
                  onClick={() => onSelectPrayer(index)}
                  className="min-h-9 min-w-7 px-1 text-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
                  style={{
                    color: fg,
                    opacity: selectedPrayer ? 1 : 0.38,
                    fontWeight: selectedPrayer ? 600 : 400,
                  }}
                >
                  {prayer.letter}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
