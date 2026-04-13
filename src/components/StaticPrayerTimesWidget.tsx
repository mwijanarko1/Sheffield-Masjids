import Link from "next/link";

import {
  formatDateForDisplay,
  formatTo12Hour,
  getDisplayedPrayerTimes,
  getIqamahTime,
  isValidTimeForMarkup,
} from "@/lib/prayer-times";
import { DailyIqamahTimes, DailyPrayerTimes, Mosque } from "@/types/prayer-times";

type StaticPrayerTimesWidgetProps = {
  mosque: Mosque;
  prayerTimes: DailyPrayerTimes;
  iqamahTimes: DailyIqamahTimes;
  selectedDate: Date;
};

function displayTime(value: string): string {
  if (!value || value === "-" || value === "--:--") return "--:--";
  if (isValidTimeForMarkup(value)) return formatTo12Hour(value);
  return formatTo12Hour(value);
}

export default function StaticPrayerTimesWidget({
  mosque,
  prayerTimes,
  iqamahTimes,
  selectedDate,
}: StaticPrayerTimesWidgetProps) {
  const displayedPrayerTimes = getDisplayedPrayerTimes(prayerTimes, selectedDate, mosque.slug);
  const rows = [
    { id: "fajr", label: "Fajr", adhan: displayedPrayerTimes.fajr, iqamah: getIqamahTime("fajr", displayedPrayerTimes.fajr, iqamahTimes) },
    { id: "sunrise", label: "Sunrise", adhan: displayedPrayerTimes.sunrise, iqamah: "--:--" },
    { id: "dhuhr", label: "Dhuhr", adhan: displayedPrayerTimes.dhuhr, iqamah: getIqamahTime("dhuhr", displayedPrayerTimes.dhuhr, iqamahTimes) },
    { id: "asr", label: "Asr", adhan: displayedPrayerTimes.asr, iqamah: getIqamahTime("asr", displayedPrayerTimes.asr, iqamahTimes) },
    { id: "maghrib", label: "Maghrib", adhan: displayedPrayerTimes.maghrib, iqamah: getIqamahTime("maghrib", displayedPrayerTimes.maghrib, iqamahTimes) },
    { id: "isha", label: "Isha", adhan: displayedPrayerTimes.isha, iqamah: getIqamahTime("isha", displayedPrayerTimes.isha, iqamahTimes, displayedPrayerTimes.maghrib) },
  ];

  const frameStyle = {
    background: "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04) 15%, rgba(255,255,255,0))",
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
  };
  const rowStyle = {
    background: "linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(255,255,255,0.06)",
    color: "#ffffff",
    minHeight: "44px",
  };
  const mutedTextStyle = {
    color: "rgba(255, 255, 255, 0.72)",
  };

  return (
    <div
      className="overflow-hidden rounded-xl shadow-lg sm:rounded-2xl sm:shadow-xl xl:rounded-3xl bg-gradient-to-b from-white/10 via-white/5 via-[15%] to-transparent backdrop-blur-md border border-white/20 sm:border-2"
      style={frameStyle}
    >
      <div className="relative p-3 text-white/80 sm:p-6 xl:p-8" style={mutedTextStyle}>
        <div className="text-center text-white" style={{ color: "#ffffff" }}>
          <h2 className="flex-1 min-w-0 text-center text-sm font-bold sm:text-base md:text-lg xl:text-xl">
            Prayer Times for <span className="font-bold">{formatDateForDisplay(selectedDate)}</span>
          </h2>
        </div>
      </div>

      <div className="p-3 sm:p-6 md:p-8 xl:p-10">
        <div className="mb-3 grid grid-cols-3 items-center border-b border-white/10 px-4 pb-2 sm:mb-4 sm:px-6 xl:px-8">
          <div className="text-left text-[10px] font-bold uppercase tracking-widest sm:text-xs" style={mutedTextStyle}>
            Adhan
          </div>
          <div className="text-center text-[10px] font-bold uppercase tracking-widest sm:text-xs" style={mutedTextStyle}>
            Prayer
          </div>
          <div className="text-right text-[10px] font-bold uppercase tracking-widest sm:text-xs" style={mutedTextStyle}>
            Iqamah
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:gap-3 xl:gap-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="relative grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-center px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-2.5 rounded-xl overflow-hidden"
              style={rowStyle}
            >
              <span className="relative z-10 min-w-0 text-[12px] sm:text-xs md:text-sm font-medium tabular-nums truncate">
                {displayTime(row.adhan)}
              </span>
              <span className="relative z-10 min-w-0 text-center text-[12px] sm:text-xs md:text-sm tracking-wide font-medium truncate">
                {row.label}
              </span>
              <span className="relative z-10 min-w-0 text-right text-[12px] sm:text-xs md:text-sm font-bold tracking-tight tabular-nums truncate">
                {displayTime(row.iqamah)}
              </span>
            </div>
          ))}
        </div>

        <Link
          href={`/mosques/${mosque.slug}/timetable`}
          className="block w-full min-h-[44px] rounded-md border border-white/20 px-4 py-3 text-center font-semibold text-white"
          style={{ background: "rgba(255, 255, 255, 0.1)" }}
        >
          View full month timetable
        </Link>
      </div>
    </div>
  );
}
