"use client";

import React from "react";
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

interface MasjidlyGradientProps {
  prayerTimes?: DailyPrayerTimes | null;
}

/**
 * Masjidly static atmospheric gradient — always maghrib theme.
 * Uses exact DESIGN.md color codes with smooth 2s CSS transitions.
 */
export default function MasjidlyGradient({ prayerTimes: _prayerTimes }: MasjidlyGradientProps) {
  const active = THEMES["maghrib"];

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
