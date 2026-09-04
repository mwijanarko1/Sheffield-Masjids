/**
 * Visual tokens mirrored from Masjidly iOS `HomeDesign.swift` (classic sky set).
 * Source: Masjidly - Official Masjid Prayer Times/Features/Home/HomeDesign.swift
 */

import type { CSSProperties } from "react";

export type MasjidlyTimeTheme =
  | "fajr"
  | "sunrise"
  | "dhuhr"
  | "asr"
  | "maghrib"
  | "isha"
  | "tahajjud";

export const MASJIDLY_COLORS = {
  primary: "#1D2433",
  secondary: "#9095A1",
  accent: "#47A6FF",
  accentDeep: "#2E8DFF",
  glassBorder: "#F0F0F0",
  softBg: "#F8F9FB",
} as const;

/** Classic sky gradients + horizon glow (center 50% 82%). */
export const MASJIDLY_CLASSIC_SKIES = {
  fajr: {
    sky: "linear-gradient(180deg, #020326 0%, #06114F 33%, #0B1E6D 66%, #3B2A5A 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(240, 138, 75, 0.35) 0%, transparent 70%)",
    lightForeground: true,
  },
  sunrise: {
    sky: "linear-gradient(180deg, #6B7280 0%, #C084FC 33%, #FB923C 66%, #F59E0B 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(254, 240, 138, 0.40) 0%, transparent 70%)",
    lightForeground: false,
  },
  dhuhr: {
    sky: "linear-gradient(180deg, #E0F2FE 0%, #7DD3FC 50%, #38BDF8 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(56, 189, 248, 0.20) 0%, transparent 70%)",
    lightForeground: false,
  },
  asr: {
    sky: "linear-gradient(180deg, #93C5FD 0%, #FDE68A 50%, #FDBA74 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(214, 179, 138, 0.35) 0%, transparent 70%)",
    lightForeground: false,
  },
  maghrib: {
    sky: "linear-gradient(180deg, #6D3FA9 0%, #A855F7 33%, #F472B6 66%, #FB7185 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(245, 158, 11, 0.35) 0%, transparent 70%)",
    lightForeground: true,
  },
  isha: {
    sky: "linear-gradient(180deg, #000000 0%, #020617 40%, #0F172A 100%)",
    glow: "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(15, 23, 42, 0.30) 0%, transparent 70%)",
    lightForeground: true,
  },
  tahajjud: {
    sky: "linear-gradient(180deg, #000000 0%, #01030A 50%, #020617 100%)",
    glow: "none",
    lightForeground: true,
  },
} satisfies Record<MasjidlyTimeTheme, { sky: string; glow: string; lightForeground: boolean }>;

export const MASJIDLY_MODERN_SKIES = {
  fajr: { sky: "linear-gradient(180deg, #103783 0%, #8752A3 100%)", glow: "none", lightForeground: true },
  sunrise: { sky: "linear-gradient(180deg, #07C8F9 0%, #B597F6 100%)", glow: "none", lightForeground: false },
  dhuhr: { sky: "linear-gradient(180deg, #EBF4F5 0%, #60EFFF 100%)", glow: "none", lightForeground: false },
  asr: { sky: "linear-gradient(180deg, #60EFFF 0%, #F3F98A 100%)", glow: "none", lightForeground: false },
  maghrib: { sky: "linear-gradient(180deg, #F2D7D9 0%, #E786A7 100%)", glow: "none", lightForeground: false },
  isha: { sky: "linear-gradient(180deg, #000328 0%, #00458E 100%)", glow: "none", lightForeground: true },
  tahajjud: MASJIDLY_CLASSIC_SKIES.tahajjud,
} satisfies Record<MasjidlyTimeTheme, { sky: string; glow: string; lightForeground: boolean }>;

const PRAYER_TO_THEME = {
  fajr: "fajr",
  sunrise: "sunrise",
  shurooq: "sunrise",
  dhuhr: "dhuhr",
  jummah: "dhuhr",
  asr: "asr",
  maghrib: "maghrib",
  isha: "isha",
} satisfies Record<string, MasjidlyTimeTheme>;

export function themeFromPrayerName(
  name: string | null | undefined,
): MasjidlyTimeTheme {
  if (!name) return "isha";
  const key = name.trim().toLowerCase();
  return Object.entries(PRAYER_TO_THEME).find(([prayer]) => prayer === key)?.[1] ?? "isha";
}

export function textColorForTheme(theme: MasjidlyTimeTheme): string {
  return MASJIDLY_MODERN_SKIES[theme].lightForeground
    ? "#FFFFFF"
    : "#111111";
}

export function mutedTextForTheme(theme: MasjidlyTimeTheme): string {
  return MASJIDLY_MODERN_SKIES[theme].lightForeground
    ? "rgba(255,255,255,0.72)"
    : MASJIDLY_COLORS.secondary;
}

/** Glass panel that reads on both light and dark Masjidly skies. */
export function glassPanelStyle(lightForeground: boolean): CSSProperties {
  if (lightForeground) {
    return {
      background: "rgba(255, 255, 255, 0.14)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      boxShadow:
        "inset 0 1px 1px rgba(255, 255, 255, 0.22), 0 8px 28px rgba(0, 0, 0, 0.22)",
      border: "1px solid rgba(255, 255, 255, 0.22)",
    };
  }
  return {
    background: "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    boxShadow:
      "inset 0 1px 1px rgba(255, 255, 255, 0.65), 0 8px 24px rgba(29, 36, 51, 0.08)",
    border: "1px solid rgba(240, 240, 240, 0.95)",
  };
}

export function activePrayerRowStyle(lightForeground: boolean): CSSProperties {
  return {
    background: lightForeground
      ? "linear-gradient(135deg, rgba(71, 166, 255, 0.55) 0%, rgba(46, 141, 255, 0.42) 100%)"
      : "linear-gradient(180deg, #47A6FF 0%, #2E8DFF 100%)",
    backdropFilter: "blur(16px) saturate(160%)",
    WebkitBackdropFilter: "blur(16px) saturate(160%)",
    boxShadow: lightForeground
      ? "0 0 28px -4px rgba(71, 166, 255, 0.45), inset 0 1px 1px rgba(255,255,255,0.35)"
      : "0 12px 28px rgba(71, 166, 255, 0.35)",
    border: lightForeground
      ? "1px solid rgba(71, 166, 255, 0.55)"
      : "1px solid rgba(46, 141, 255, 0.4)",
    color: "#FFFFFF",
  };
}
