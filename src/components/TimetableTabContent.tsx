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
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <MonthlyTimetable mosque={mosque} />
      {isRamadanPeriod && (
        <p className="mt-4 text-center text-sm">
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
