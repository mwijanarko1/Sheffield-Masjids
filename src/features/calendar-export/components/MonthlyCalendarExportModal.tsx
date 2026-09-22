"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Link, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GlassSelect } from "@/components/ui/glass-select";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import {
  MASJIDLY_MODERN_SKIES,
  glassPanelStyle,
  mutedTextForTheme,
  textColorForTheme,
} from "@/lib/masjidly-theme";
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
  const { theme } = useMasjidlyTheme();
  const sky = MASJIDLY_MODERN_SKIES[theme];
  const lightFg = sky.lightForeground;
  const fg = textColorForTheme(theme);
  const fgMuted = mutedTextForTheme(theme);
  const surface = glassPanelStyle(lightFg);

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

  const mosqueOptions = useMemo(
    () => mosquesInSelectedCity.map((m) => ({ id: m.id, name: m.name })),
    [mosquesInSelectedCity],
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

  const providerBtnClass =
    "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold " +
    "transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={triggerClassName}
          style={{ ...surface, color: fg }}
          aria-label="Subscribe to prayer times"
        >
          <CalendarDays style={{ color: fg }} />
          <span style={{ color: fg }}>Add to Calendar</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-[2rem] border p-0 font-sans text-[var(--theme-fg)] shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:w-full"
        style={{
          background: sky.sky,
          color: fg,
          borderColor: lightFg ? "rgba(255,255,255,0.28)" : "rgba(29,36,51,0.18)",
        }}
      >
        <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7" style={{ color: fg }}>
          <DialogClose
            aria-label="Close"
            className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
            style={{ ...surface, color: fg }}
          >
            <X size={19} strokeWidth={2} aria-hidden style={{ color: fg }} />
          </DialogClose>

          <DialogHeader className="space-y-1 pr-10 text-left">
            <DialogTitle
              className="text-xl font-semibold tracking-tight sm:text-2xl !text-[var(--theme-fg)]"
              style={{ color: fg }}
            >
              Subscribe to prayer times
            </DialogTitle>
            <p className="text-sm font-medium" style={{ color: fgMuted }}>
              {selectedMosque.name}
            </p>
          </DialogHeader>

          <div className="mt-5 flex flex-col gap-2.5" style={{ color: fg }}>
            <GlassSelect
              options={cityOptions}
              value={selectedCitySlug}
              onChange={handleCityChange}
              ariaLabel="Select city"
              placeholder="Select city"
              searchPlaceholder="Search cities…"
            />
            <GlassSelect
              options={mosqueOptions}
              value={selectedMosqueId}
              onChange={setSelectedMosqueId}
              ariaLabel="Select mosque"
              placeholder="Select mosque"
              searchPlaceholder="Search mosques…"
            />
            <div className="flex gap-2">
              <GlassSelect
                className="min-w-0 flex-1"
                options={[
                  { id: "month", name: `${monthLabel} only` },
                  { id: "year", name: "Full year" },
                ]}
                value={range}
                onChange={(value) => {
                  if (value === "month" || value === "year") setRange(value);
                }}
                ariaLabel="Select date range"
              />
              <GlassSelect
                className="min-w-0 flex-1"
                options={[
                  { id: "iqamah", name: "Iqamah" },
                  { id: "adhan", name: "Adhan" },
                  { id: "both", name: "Adhan + Iqamah" },
                ]}
                value={mode}
                onChange={(value) => {
                  if (value === "adhan" || value === "iqamah" || value === "both") {
                    setMode(value);
                  }
                }}
                ariaLabel="Select prayer time mode"
              />
            </div>

            {error && (
              <p className="text-xs font-medium" style={{ color: fg }}>
                {error}
              </p>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => handleSubscribe("google")}
              className={providerBtnClass}
              style={{ ...surface, color: fg }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3 2.3c1.8-1.7 2.8-4.2 2.8-7.1 0-.7-.1-1.4-.2-2H12z" />
                <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3-2.3c-.8.6-2 .9-3.6.9-2.8 0-5.2-1.9-6.1-4.4l-3.1 2.4C4.3 19.6 7.9 22 12 22z" />
                <path fill="#4A90E2" d="M5.9 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7L2.8 7.9C2.3 9 2 10 2 12s.3 3 .8 4.1l3.1-2.4z" />
                <path fill="#FBBC05" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 7.9 2 4.3 4.4 2.8 7.9l3.1 2.4c.9-2.5 3.3-4.4 6.1-4.4z" />
              </svg>
              <span style={{ color: fg }}>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubscribe("apple")}
              className={providerBtnClass}
              style={{ ...surface, color: fg }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true" style={{ color: fg }}>
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.897-1.455 2.338-1.273 3.714 1.338.104 2.715-.69 3.56-1.702" />
              </svg>
              <span style={{ color: fg }}>Apple</span>
            </button>
            <button
              type="button"
              onClick={() => handleSubscribe("ics")}
              className={providerBtnClass}
              style={{ ...surface, color: fg }}
            >
              <Link className="h-4 w-4 shrink-0" style={{ color: fg }} />
              <span style={{ color: fg }}>{copiedFeedUrl ? "Copied!" : "Copy URL"}</span>
            </button>
          </div>

          <p
            className="mt-3 text-center text-xs font-semibold"
            style={{
              color: lightFg ? "rgba(255,255,255,0.92)" : "rgba(17,17,17,0.82)",
            }}
          >
            Feed refreshes automatically. No app required.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
