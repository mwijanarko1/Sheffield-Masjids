"use client";

import { useId, useMemo, useState } from "react";
import { CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { loadMonthlyPrayerTimes } from "@/lib/prayer-times";
import type { Mosque } from "@/types/prayer-times";
import { buildMonthlyCalendarEvents } from "@/features/calendar-export/lib/build-monthly-calendar-events";
import { downloadCalendarFile } from "@/features/calendar-export/lib/download-calendar-file";
import { buildIcsCalendar, createCalendarFilename } from "@/features/calendar-export/lib/ics";
import type {
  CalendarExportMode,
  CalendarProvider,
} from "@/features/calendar-export/types";

interface MonthlyCalendarExportModalProps {
  mosque: Mosque;
  month: number;
  year: number;
  monthLabel: string;
  triggerClassName?: string;
}

const MODE_OPTIONS: { value: CalendarExportMode; label: string; description: string }[] = [
  {
    value: "adhan",
    label: "Adhan Only",
    description: "Add each prayer's adhan time for the selected month.",
  },
  {
    value: "iqamah",
    label: "Iqamah Only",
    description: "Add each prayer's iqamah time for the selected month.",
  },
  {
    value: "both",
    label: "Adhan + Iqamah",
    description: "Add both adhan and iqamah events for the selected month.",
  },
];

export default function MonthlyCalendarExportModal({
  mosque,
  month,
  year,
  monthLabel,
  triggerClassName,
}: MonthlyCalendarExportModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CalendarExportMode>("iqamah");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modeGroupId = useId();

  const modalDescription = useMemo(
    () => `${mosque.name} • ${monthLabel} ${year}`,
    [monthLabel, mosque.name, year],
  );

  const handleDownload = async (provider: CalendarProvider) => {
    setIsLoading(true);
    setError(null);

    try {
      const monthlyData = await loadMonthlyPrayerTimes(mosque.slug, month, year);
      const events = buildMonthlyCalendarEvents({
        mosque,
        month,
        year,
        monthLabel,
        monthlyData,
        mode,
      });

      if (events.length === 0) {
        throw new Error("No exportable prayer times were available for the selected month.");
      }

      const contents = buildIcsCalendar(events);
      const filename = createCalendarFilename(mosque.slug, monthLabel, year, mode);
      downloadCalendarFile(contents, filename);

      if (provider === "google") {
        // Google imports the same ICS file for whole-month exports in v1.
      }

      setOpen(false);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to generate the calendar export right now.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className={triggerClassName}
          aria-label={`Add ${monthLabel} ${year} prayer times to calendar`}
        >
          <CalendarDays />
          Add to Calendar
        </Button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="max-h-[88dvh] rounded-t-[2rem] border-white/10 bg-[#091227]/96 px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 text-white sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:border"
      >
        <SheetHeader className="space-y-2 text-left">
          <SheetTitle className="text-xl">Add Month to Calendar</SheetTitle>
          <SheetDescription className="text-sm text-white/65">
            {modalDescription}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div
            className="space-y-3"
            role="radiogroup"
            aria-labelledby={modeGroupId}
          >
            <p id={modeGroupId} className="text-sm font-semibold text-white/90">
              Choose What to Export
            </p>

            {MODE_OPTIONS.map((option) => {
              const checked = mode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onClick={() => setMode(option.value)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#091227] ${
                    checked
                      ? "border-[#FFB380]/60 bg-[#FFB380]/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{option.label}</p>
                      <p className="mt-1 text-sm text-white/60">{option.description}</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                        checked
                          ? "border-[#FFB380] bg-[#FFB380]/15"
                          : "border-white/25"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          checked ? "bg-[#FFB380]" : "bg-transparent"
                        }`}
                      />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white/90">Google Calendar</p>
            <p className="mt-1 text-sm text-white/60">
              Monthly exports download an .ics file that can be imported into Google Calendar.
            </p>
          </div>

          {error ? (
            <p className="rounded-2xl border border-[#FFB380]/30 bg-[#FFB380]/10 px-4 py-3 text-sm text-[#FFD2B0]">
              {error}
            </p>
          ) : null}
        </div>

        <SheetFooter className="mt-8 gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDownload("google")}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Download />
            {isLoading ? "Preparing…" : "Google Calendar"}
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("apple")}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Download />
            {isLoading ? "Preparing…" : "Apple / ICS Download"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
