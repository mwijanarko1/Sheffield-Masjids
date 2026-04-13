"use client";

import { useEffect, useState } from "react";

import PrayerTimesWidget from "@/components/PrayerTimesWidget";
import { DailyIqamahTimes, DailyPrayerTimes, Mosque } from "@/types/prayer-times";

/** Matches the interactive table: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha (each has `data-prayer-row`). */
const MIN_INTERACTIVE_ROWS = 6;

type PrayerTimesEnhancerProps = {
  staticFallbackId: string;
  hasStaticFallback: boolean;
  initialMosque: Mosque;
  showDropdown?: boolean;
  mosques?: Mosque[];
  initialPrayerTimes?: DailyPrayerTimes | null;
  initialIqamahTimes?: DailyIqamahTimes | null;
  initialAdjustedIqamahTimes?: DailyIqamahTimes | null;
  initialSelectedDate?: string;
};

function queryInteractiveRowCount(): number {
  return document.querySelectorAll("[data-prayer-times-widget='interactive'] [data-prayer-row]").length;
}

export default function PrayerTimesEnhancer({
  staticFallbackId,
  hasStaticFallback,
  ...widgetProps
}: PrayerTimesEnhancerProps) {
  const [canEnhance, setCanEnhance] = useState(false);

  useEffect(() => {
    const supportsModernTailwindColor = typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("color", "color-mix(in oklab, white, black)");

    setCanEnhance(supportsModernTailwindColor);
  }, []);

  useEffect(() => {
    if (!canEnhance || !hasStaticFallback) return;

    let cancelled = false;
    let rafId = 0;
    const timeoutIds: number[] = [];

    const tryHideStatic = (): boolean => {
      if (cancelled) return true;
      const fallback = document.getElementById(staticFallbackId);
      if (!fallback) return false;
      if (queryInteractiveRowCount() < MIN_INTERACTIVE_ROWS) return false;
      fallback.hidden = true;
      return true;
    };

    if (tryHideStatic()) {
      return () => {
        const el = document.getElementById(staticFallbackId);
        if (el) el.hidden = false;
      };
    }

    let rafAttempts = 0;
    const maxRafAttempts = 90;
    const rafLoop = () => {
      if (cancelled || tryHideStatic()) return;
      rafAttempts += 1;
      if (rafAttempts >= maxRafAttempts) return;
      rafId = window.requestAnimationFrame(rafLoop);
    };
    rafId = window.requestAnimationFrame(rafLoop);

    for (const ms of [0, 16, 50, 120, 300, 800]) {
      timeoutIds.push(window.setTimeout(() => {
        if (!cancelled) tryHideStatic();
      }, ms));
    }

    const observer = new MutationObserver(() => {
      if (tryHideStatic()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const observerCap = window.setTimeout(() => observer.disconnect(), 8000);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      timeoutIds.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(observerCap);
      observer.disconnect();
      const el = document.getElementById(staticFallbackId);
      if (el) el.hidden = false;
    };
  }, [canEnhance, hasStaticFallback, staticFallbackId]);

  if (!canEnhance && hasStaticFallback) {
    return null;
  }

  return <PrayerTimesWidget {...widgetProps} />;
}
