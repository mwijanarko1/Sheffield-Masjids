"use client";

import React, { useEffect, useState } from "react";
import type { DailyPrayerTimes } from "@/types/prayer-times";

/**
 * Exact color values from Masjidly DESIGN.md.
 * Each theme: 3-layer base linear sky + radial horizon glow (center: 50% 82%).
 */
const THEMES = {
  fajr: {
    sky: "linear-gradient(180deg, #020326 0%, #06114F 33%, #0B1E6D 66%, #3B2A5A 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(240, 138, 75, 0.35) 0%, transparent 70%)",
  },
  sunrise: {
    sky: "linear-gradient(180deg, #6B7280 0%, #C084FC 33%, #FB923C 66%, #F59E0B 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(254, 240, 138, 0.40) 0%, transparent 70%)",
  },
  dhuhr: {
    sky: "linear-gradient(180deg, #E0F2FE 0%, #7DD3FC 50%, #38BDF8 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(56, 189, 248, 0.20) 0%, transparent 70%)",
  },
  asr: {
    sky: "linear-gradient(180deg, #93C5FD 0%, #FDE68A 50%, #FDBA74 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(214, 179, 138, 0.35) 0%, transparent 70%)",
  },
  maghrib: {
    sky: "linear-gradient(180deg, #6D3FA9 0%, #A855F7 33%, #F472B6 66%, #FB7185 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(245, 158, 11, 0.35) 0%, transparent 70%)",
  },
  isha: {
    sky: "linear-gradient(180deg, #000000 0%, #020617 40%, #0F172A 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(15, 23, 42, 0.30) 0%, transparent 70%)",
  },
  tahajjud: {
    sky: "linear-gradient(180deg, #000000 0%, #01030A 50%, #020617 100%)",
    glow: "none",
  },
};

type PrayerTheme = keyof typeof THEMES;

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

function getThemeFromPrayerTimes(prayerTimes: DailyPrayerTimes): PrayerTheme {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentTime = hour + minute / 60;

  const fajr = parseTime(prayerTimes.fajr);
  const sunrise = parseTime(prayerTimes.sunrise);
  const dhuhr = parseTime(prayerTimes.dhuhr);
  const asr = parseTime(prayerTimes.asr);
  const maghrib = parseTime(prayerTimes.maghrib);
  const isha = parseTime(prayerTimes.isha);

  // Tahajjud: after midnight until Fajr, and after Isha until midnight
  if (currentTime < fajr) return "tahajjud";
  if (currentTime >= fajr && currentTime < sunrise) return "fajr";
  if (currentTime >= sunrise && currentTime < dhuhr - 0.5) return "sunrise";
  if (currentTime >= dhuhr - 0.5 && currentTime < asr) return "dhuhr";
  if (currentTime >= asr && currentTime < maghrib) return "asr";
  if (currentTime >= maghrib && currentTime < isha) return "maghrib";
  if (currentTime >= isha) return "isha";

  return "isha";
}

/** Fallback seasonal estimates when no prayer data is available. */
function getThemeFromEstimates(): PrayerTheme {
  const now = new Date();
  const month = now.getMonth();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const t = hour + minute / 60;

  const seasons: Record<number, { fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number }> = {
    0:  { fajr: 6.0, sunrise: 8.0,  dhuhr: 12.2, asr: 14.0, maghrib: 16.2, isha: 18.0 },
    1:  { fajr: 5.5, sunrise: 7.3,  dhuhr: 12.3, asr: 14.5, maghrib: 17.0, isha: 18.5 },
    2:  { fajr: 4.8, sunrise: 6.3,  dhuhr: 12.3, asr: 15.2, maghrib: 18.2, isha: 19.5 },
    3:  { fajr: 3.8, sunrise: 5.5,  dhuhr: 13.0, asr: 16.0, maghrib: 20.0, isha: 21.0 },
    4:  { fajr: 3.0, sunrise: 4.8,  dhuhr: 13.0, asr: 16.8, maghrib: 21.0, isha: 22.0 },
    5:  { fajr: 2.8, sunrise: 4.3,  dhuhr: 13.1, asr: 17.2, maghrib: 21.5, isha: 22.5 },
    6:  { fajr: 3.2, sunrise: 4.8,  dhuhr: 13.1, asr: 17.0, maghrib: 21.2, isha: 22.2 },
    7:  { fajr: 4.0, sunrise: 5.5,  dhuhr: 13.0, asr: 16.5, maghrib: 20.3, isha: 21.3 },
    8:  { fajr: 5.0, sunrise: 6.3,  dhuhr: 12.8, asr: 15.5, maghrib: 19.0, isha: 20.3 },
    9:  { fajr: 5.8, sunrise: 7.2,  dhuhr: 12.5, asr: 14.5, maghrib: 17.5, isha: 19.0 },
    10: { fajr: 6.2, sunrise: 7.7,  dhuhr: 12.2, asr: 14.0, maghrib: 16.2, isha: 18.0 },
    11: { fajr: 6.3, sunrise: 8.0,  dhuhr: 12.1, asr: 13.5, maghrib: 15.8, isha: 17.5 },
  };

  const s = seasons[month];
  if (t < s.fajr) return "tahajjud";
  if (t >= s.fajr && t < s.sunrise) return "fajr";
  if (t >= s.sunrise && t < s.dhuhr - 0.5) return "sunrise";
  if (t >= s.dhuhr - 0.5 && t < s.asr) return "dhuhr";
  if (t >= s.asr && t < s.maghrib) return "asr";
  if (t >= s.maghrib && t < s.isha) return "maghrib";
  return "isha";
}

interface MasjidlyGradientProps {
  prayerTimes?: DailyPrayerTimes | null;
}

/**
 * Masjidly time-adaptive atmospheric gradient.
 * Uses exact DESIGN.md color codes with smooth 2s CSS transitions.
 * When prayerTimes are provided, syncs to actual Sheffield mosque timings.
 */
export default function MasjidlyGradient({ prayerTimes }: MasjidlyGradientProps) {
  const [theme, setTheme] = useState<PrayerTheme>("maghrib");

  useEffect(() => {
    const resolveTheme = () => {
      if (prayerTimes) {
        setTheme(getThemeFromPrayerTimes(prayerTimes));
      } else {
        setTheme(getThemeFromEstimates());
      }
    };

    resolveTheme();
    const interval = setInterval(resolveTheme, 300_000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  const active = THEMES[theme];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <div
        className="absolute inset-0 transition-[background] duration-[2000ms] ease-in-out"
        style={{ background: active.sky }}
      />
      {active.glow !== "none" && (
        <div
          className="absolute inset-0 transition-[background] duration-[2000ms] ease-in-out"
          style={{ background: active.glow }}
        />
      )}
    </div>
  );
}
