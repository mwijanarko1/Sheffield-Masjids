"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Link } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Mosque } from "@/types/prayer-times";
import type { CalendarExportMode, CalendarProvider } from "@/features/calendar-export/types";

interface MonthlyCalendarExportModalProps {
  mosque: Mosque;
  mosques?: Mosque[];
  month: number;
  year: number;
  monthLabel: string;
  triggerClassName?: string;
}

type CalendarExportRange = "month" | "year";

type CityOption = { id: string; name: string };

function buildCityOptions(mosques: Mosque[]): CityOption[] {
  const bySlug = new Map<string, string>();
  for (const m of mosques) {
    if (!bySlug.has(m.citySlug)) {
      bySlug.set(m.citySlug, m.cityName);
    }
  }
  return Array.from(bySlug.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mosquesInCity(mosques: Mosque[], citySlug: string): Mosque[] {
  return mosques.filter((m) => m.citySlug === citySlug);
}

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
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allMosques = mosques && mosques.length > 0 ? mosques : [mosque];
  const cityOptions = useMemo(() => buildCityOptions(allMosques), [allMosques]);
  const [selectedCitySlug, setSelectedCitySlug] = useState(
    () => mosque.citySlug ?? cityOptions[0]?.id ?? "sheffield",
  );

  const mosquesInSelectedCity = useMemo(
    () => mosquesInCity(allMosques, selectedCitySlug),
    [allMosques, selectedCitySlug],
  );

  const [selectedMosqueId, setSelectedMosqueId] = useState(mosque.id);
  const selectedMosque =
    mosquesInSelectedCity.find((m) => m.id === selectedMosqueId) ?? mosquesInSelectedCity[0] ?? mosque;

  const handleCityChange = (citySlug: string) => {
    setSelectedCitySlug(citySlug);
    const inCity = mosquesInCity(allMosques, citySlug);
    if (inCity.length > 0) {
      setSelectedMosqueId(inCity[0].id);
    }
  };

  const buildFeedUrl = (): string => {
    const url = new URL("/api/calendar-feed", window.location.origin);
    url.searchParams.set("mosque", selectedMosque.slug);
    url.searchParams.set("mode", mode);
    url.searchParams.set("range", range);
    url.searchParams.set("year", String(year));
    if (range === "month") url.searchParams.set("month", String(month));
    return url.toString();
  };

  const handleSubscribe = async (provider: CalendarProvider) => {
    setError(null);
    const feedUrl = buildFeedUrl();

    try {
      navigator.clipboard?.writeText(feedUrl).catch(() => undefined);
    } catch {
      // clipboard not available
    }

    if (provider === "google") {
      window.open(
        `https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(feedUrl)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setOpen(false);
    } else if (provider === "apple") {
      window.location.href = feedUrl.replace(/^https?:\/\//, "webcal://");
      setOpen(false);
    } else {
      setCopiedFeedUrl(true);
      setTimeout(() => setCopiedFeedUrl(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName} aria-label="Subscribe to prayer times">
          <CalendarDays />
          Add to Calendar
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-0 bg-gradient-to-b from-[#0A1128] to-[#141b3d] p-5 text-white shadow-2xl sm:w-full">
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle className="text-base font-bold">
            Subscribe to prayer times
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          <Select value={selectedCitySlug} onValueChange={handleCityChange}>
            <SelectTrigger className="h-9 rounded-xl border-white/10 bg-white/10 px-3 text-xs font-normal text-white/90 shadow-none backdrop-blur-none sm:text-sm">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 bg-[#0A1128] text-white shadow-xl">
              {cityOptions.map((c) => (
                <SelectItem key={c.id} value={c.id} className="py-1.5 text-xs sm:text-sm">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMosqueId} onValueChange={setSelectedMosqueId}>
            <SelectTrigger className="h-9 rounded-xl border-white/10 bg-white/10 px-3 text-xs font-normal text-white/90 shadow-none backdrop-blur-none sm:text-sm">
              <SelectValue placeholder="Select mosque" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 bg-[#0A1128] text-white shadow-xl">
              {mosquesInSelectedCity.map((m) => (
                <SelectItem key={m.id} value={m.id} className="py-1.5 text-xs sm:text-sm">
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Select value={range} onValueChange={(value) => {
              if (value === "month" || value === "year") setRange(value);
            }}>
              <SelectTrigger className="h-9 flex-1 rounded-xl border-white/10 bg-white/10 px-3 text-xs font-normal text-white/90 shadow-none backdrop-blur-none sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 bg-[#0A1128] text-white shadow-xl">
                <SelectItem value="month" className="py-1.5 text-xs sm:text-sm">{monthLabel} only</SelectItem>
                <SelectItem value="year" className="py-1.5 text-xs sm:text-sm">Full year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={mode} onValueChange={(value) => {
              if (value === "adhan" || value === "iqamah" || value === "both") setMode(value);
            }}>
              <SelectTrigger className="h-9 flex-1 rounded-xl border-white/10 bg-white/10 px-3 text-xs font-normal text-white/90 shadow-none backdrop-blur-none sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-white/10 bg-[#0A1128] text-white shadow-xl">
                <SelectItem value="iqamah" className="py-1.5 text-xs sm:text-sm">Iqamah</SelectItem>
                <SelectItem value="adhan" className="py-1.5 text-xs sm:text-sm">Adhan</SelectItem>
                <SelectItem value="both" className="py-1.5 text-xs sm:text-sm">Adhan + Iqamah</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-[#FFB380]">{error}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => handleSubscribe("google")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.8-1.7 2.8-4.2 2.8-7.1 0-.7-.1-1.4-.2-2H12z" />
              <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3-2.3c-.8.6-2 .9-3.6.9-2.8 0-5.2-1.9-6.1-4.4l-3.1 2.4C4.3 19.6 7.9 22 12 22z" />
              <path fill="#4A90E2" d="M5.9 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7L2.8 7.9C2.3 9 2 10 2 12s.3 3 .8 4.1l3.1-2.4z" />
              <path fill="#FBBC05" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 7.9 2 4.3 4.4 2.8 7.9l3.1 2.4c.9-2.5 3.3-4.4 6.1-4.4z" />
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => handleSubscribe("apple")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.897-1.455 2.338-1.273 3.714 1.338.104 2.715-.69 3.56-1.702" />
            </svg>
            Apple
          </button>
          <button
            type="button"
            onClick={() => handleSubscribe("ics")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
          >
            <Link className="h-4 w-4" />
            {copiedFeedUrl ? "Copied!" : "Copy URL"}
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] text-white/30">
          Feed refreshes automatically. No app required.
        </p>
      </DialogContent>
    </Dialog>
  );
}
