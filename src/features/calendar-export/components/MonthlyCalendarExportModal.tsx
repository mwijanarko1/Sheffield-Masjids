"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  mosques?: Mosque[];
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

const RANGE_OPTIONS = [
  { value: "month", label: "One month" },
  { value: "year", label: "All year" },
] as const;

type CalendarExportRange = (typeof RANGE_OPTIONS)[number]["value"];

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.8-1.7 2.8-4.2 2.8-7.1 0-.7-.1-1.4-.2-2H12z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 5-0.9 6.6-2.5l-3-2.3c-.8.6-2 .9-3.6.9-2.8 0-5.2-1.9-6.1-4.4l-3.1 2.4C4.3 19.6 7.9 22 12 22z"
    />
    <path
      fill="#4A90E2"
      d="M5.9 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7L2.8 7.9C2.3 9 2 10 2 12s.3 3 .8 4.1l3.1-2.4z"
    />
    <path
      fill="#FBBC05"
      d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 7.9 2 4.3 4.4 2.8 7.9l3.1 2.4c.9-2.5 3.3-4.4 6.1-4.4z"
    />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M16.7 12.5c0-2 1.6-3 1.6-3-.9-1.3-2.2-1.5-2.7-1.5-1.1-.1-2.1.7-2.7.7s-1.4-.7-2.3-.7c-1.2 0-2.4.7-3.1 1.8-1.3 2.1-.3 5.2.9 6.9.6.8 1.2 1.7 2.1 1.7.9 0 1.2-.6 2.3-.6 1.1 0 1.4.6 2.3.6 1 0 1.6-.9 2.2-1.8.6-.9.9-1.9.9-2-.1 0-1.5-.6-1.5-3.1z" />
    <path d="M14.9 6.7c.5-.6.8-1.4.7-2.2-.8 0-1.7.5-2.3 1.1-.5.5-.9 1.3-.8 2.1.9.1 1.8-.4 2.4-1z" />
  </svg>
);

export default function MonthlyCalendarExportModal({
  mosque,
  mosques,
  month,
  year,
  monthLabel,
  triggerClassName,
}: MonthlyCalendarExportModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CalendarExportMode>("iqamah");
  const [range, setRange] = useState<CalendarExportRange>("month");
  const [selectedMosqueId, setSelectedMosqueId] = useState(mosque.id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMode = MODE_OPTIONS.find((option) => option.value === mode);
  const selectedRange = RANGE_OPTIONS.find((option) => option.value === range);
  const mosqueOptions = mosques && mosques.length > 0 ? mosques : [mosque];
  const selectedMosque =
    mosqueOptions.find((option) => option.id === selectedMosqueId) ?? mosque;
  const rangeSelectOptions = RANGE_OPTIONS.map((option) => ({ id: option.value, name: option.label }));
  const modeSelectOptions = MODE_OPTIONS.map((option) => ({ id: option.value, name: option.label }));

  const handleDownload = async (provider: CalendarProvider) => {
    setIsLoading(true);
    setError(null);

    try {
      const monthsToExport = range === "year"
        ? Array.from({ length: 12 }, (_, index) => index + 1)
        : [month];

      const monthlyPayloads = await Promise.all(
        monthsToExport.map(async (monthValue) => {
          const monthlyData = await loadMonthlyPrayerTimes(selectedMosque.slug, monthValue, year);
          const monthName = new Date(Date.UTC(year, monthValue - 1, 1)).toLocaleString("en-GB", {
            month: "long",
            timeZone: "UTC",
          });

          return await buildMonthlyCalendarEvents({
            mosque: selectedMosque,
            month: monthValue,
            year,
            monthLabel: monthName,
            monthlyData,
            mode,
          });
        }),
      );

      const events = monthlyPayloads.flat();

      if (events.length === 0) {
        throw new Error("No exportable prayer times were available for the selected month.");
      }

      const contents = buildIcsCalendar(events);
      const filename = createCalendarFilename(
        selectedMosque.slug,
        range === "year" ? "full-year" : monthLabel,
        year,
        mode,
      );
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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedMosqueId(mosque.id);
      setRange("month");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={triggerClassName}
          aria-label={`Add ${monthLabel} ${year} prayer times to calendar`}
        >
          <CalendarDays />
          Add to Calendar
        </Button>
      </DialogTrigger>

      <DialogContent
        className="top-[calc(50%-3.75rem)] max-h-[calc(100dvh-6.75rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto px-4 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-4 text-white sm:top-1/2 sm:max-h-[85dvh] sm:px-5 sm:pt-6"
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-lg sm:text-xl">Calendar Export</DialogTitle>
          <div className="space-y-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 sm:p-3">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/90">
                Mosque
              </label>
              <CustomSelect
                options={mosqueOptions}
                value={selectedMosqueId}
                onChange={setSelectedMosqueId}
                aria-label="Select mosque for calendar export"
                truncateLabel
                listFitsContent
                className="[&_button]:h-9 [&_button]:rounded-xl [&_button]:bg-[#0A1128]/70 [&_button]:text-xs sm:[&_button]:text-sm"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90 sm:text-sm sm:normal-case sm:tracking-normal">
              Export range
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 sm:p-3.5">
              <CustomSelect
                options={rangeSelectOptions}
                value={range}
                onChange={(value) => setRange(value as CalendarExportRange)}
                aria-label="Choose export range"
                truncateLabel={false}
                className="[&_button]:h-9 [&_button]:rounded-xl [&_button]:bg-[#0A1128]/70 [&_button]:text-xs sm:[&_button]:text-sm"
              />
              {selectedRange ? (
                <p className="mt-2 text-xs text-white/60 sm:mt-2.5 sm:text-sm">
                  {selectedRange.value === "year"
                    ? `Export all months for ${year} in one calendar file.`
                    : `Export ${monthLabel} ${year} only.`}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90 sm:text-sm sm:normal-case sm:tracking-normal">
              Export type
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 sm:p-3.5">
              <CustomSelect
                options={modeSelectOptions}
                value={mode}
                onChange={(value) => setMode(value as CalendarExportMode)}
                aria-label="Choose export mode"
                truncateLabel={false}
                className="[&_button]:h-9 [&_button]:rounded-xl [&_button]:bg-[#0A1128]/70 [&_button]:text-xs sm:[&_button]:text-sm"
              />
              {selectedMode ? (
                <p className="mt-2 text-xs text-white/60 sm:mt-2.5 sm:text-sm">{selectedMode.description}</p>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-[#FFB380]/30 bg-[#FFB380]/10 px-3 py-2 text-xs text-[#FFD2B0] sm:px-4 sm:py-3 sm:text-sm">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="mt-4 !grid !grid-cols-2 gap-2 sm:mt-6 sm:flex sm:gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDownload("google")}
            disabled={isLoading}
            className="h-9 w-full text-xs sm:h-10 sm:w-auto sm:text-sm"
          >
            <GoogleIcon className="h-4 w-4" />
            {isLoading ? "Preparing…" : "Google Calendar"}
          </Button>
          <Button
            type="button"
            onClick={() => handleDownload("apple")}
            disabled={isLoading}
            className="h-9 w-full text-xs sm:h-10 sm:w-auto sm:text-sm"
          >
            <AppleIcon className="h-4 w-4" />
            {isLoading ? "Preparing…" : "Apple / ICS Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
