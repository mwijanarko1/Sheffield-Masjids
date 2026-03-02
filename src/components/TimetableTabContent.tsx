"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import { isDateInRamadanPeriod } from "@/lib/prayer-times";
import MonthlyTimetable from "@/components/MonthlyTimetable";

interface TimetableTabContentProps {
  mosques: Mosque[];
}

export default function TimetableTabContent({ mosques }: TimetableTabContentProps) {
  const { selectedMosque } = usePersistedMosque(mosques);
  const mosque = selectedMosque ?? mosques[0];
  const [isRamadanPeriod, setIsRamadanPeriod] = useState(false);

  useEffect(() => {
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
  }, [mosque.slug]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-10 lg:px-8 xl:max-w-7xl">
      <h2 className="mb-2 sm:mb-3 text-base sm:text-lg font-bold text-white">
        Timetable
      </h2>
      <p className="mb-4 sm:mb-6 text-sm text-white/80">
        {mosque.name}
      </p>
      <MonthlyTimetable mosque={mosque} />
      {isRamadanPeriod && (
        <p className="mt-4 text-sm">
          <Link
            href={`/mosques/${mosque.slug}/ramadan-timetable`}
            className="text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] rounded"
          >
            View Ramadan timetable
          </Link>
        </p>
      )}
    </div>
  );
}
