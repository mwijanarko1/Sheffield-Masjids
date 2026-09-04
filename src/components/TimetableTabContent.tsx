"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import { isDateInRamadanPeriod } from "@/lib/prayer-times";
import MasjidlyDayTimetable from "@/components/MasjidlyDayTimetable";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import { mutedTextForTheme, textColorForTheme } from "@/lib/masjidly-theme";

interface TimetableTabContentProps {
  mosques: Mosque[];
}

export default function TimetableTabContent({ mosques }: TimetableTabContentProps) {
  const { selectedMosque, isHydrated } = usePersistedMosque(mosques);
  const mosque = selectedMosque;
  const { theme } = useMasjidlyTheme();
  const fg = textColorForTheme(theme);
  const fgMuted = mutedTextForTheme(theme);
  const [isRamadanPeriod, setIsRamadanPeriod] = useState(false);

  useEffect(() => {
    if (!isHydrated || !mosque) return;

    let isMounted = true;
    const check = async () => {
      try {
        const inRange = await isDateInRamadanPeriod(mosque.slug, new Date());
        if (isMounted) setIsRamadanPeriod(inRange);
      } catch {
        if (isMounted) setIsRamadanPeriod(false);
      }
    };
    check();
    return () => {
      isMounted = false;
    };
  }, [isHydrated, mosque]);

  if (!isHydrated || !mosque) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <p
          className="rounded-2xl border border-white/25 bg-white/18 p-4 text-sm backdrop-blur-md"
          style={{ color: fgMuted }}
        >
          Loading your saved mosque...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col px-2 pt-4 sm:px-6 sm:pt-8" style={{ color: fg }}>
      <h1 className="sr-only">Timetable</h1>
      <MasjidlyDayTimetable mosque={mosque} />

      {isRamadanPeriod && (
        <p className="mt-4 text-center text-sm">
          <Link
            href={`/mosques/${mosque.slug}/ramadan-timetable`}
            className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded"
            style={{ color: "#2E8DFF" }}
          >
            View Ramadan timetable
          </Link>
        </p>
      )}
    </div>
  );
}
