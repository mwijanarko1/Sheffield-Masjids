"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import { getDateInSheffield, isDateInRamadanPeriod } from "@/lib/prayer-times";
import MonthlyTimetable from "@/components/MonthlyTimetable";
import MonthlyCalendarExportModal from "@/features/calendar-export/components/MonthlyCalendarExportModal";

interface TimetableTabContentProps {
  mosques: Mosque[];
}

export default function TimetableTabContent({ mosques }: TimetableTabContentProps) {
  const { selectedMosque, isHydrated } = usePersistedMosque(mosques);
  const mosque = selectedMosque;
  const [isRamadanPeriod, setIsRamadanPeriod] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => getDateInSheffield(new Date()).month);
  const currentYear = getDateInSheffield(new Date()).year;

  const monthLabel =
    [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][selectedMonth - 1] ?? "Month";

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
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 backdrop-blur-md">
          Loading your saved mosque...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-8 flex flex-col items-center gap-4 text-center md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:text-left">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl drop-shadow-sm">
            Timetable
          </h1>
          <p className="mt-1 text-sm text-[var(--theme-text-muted)]">
            Explore the monthly prayer schedule for your mosque.
          </p>
        </div>
        <div className="flex w-full shrink-0 justify-center md:w-auto md:justify-end">
          <MonthlyCalendarExportModal
            mosque={mosque}
            mosques={mosques}
            month={selectedMonth}
            year={currentYear}
            monthLabel={monthLabel}
            triggerClassName="min-h-11 rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] shadow-lg"
          />
        </div>
      </div>
      <MonthlyTimetable
        mosque={mosque}
        selectedMonth={selectedMonth}
        onSelectedMonthChange={setSelectedMonth}
      />
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
