"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import {
  getRamadanNightCountdown,
  type RamadanNightCountdownState,
} from "@/lib/ramadan-night";

export default function NightCountdown() {
  const [countdown, setCountdown] = useState<RamadanNightCountdownState | null>(null);

  useEffect(() => {
    setCountdown(getRamadanNightCountdown());

    const interval = setInterval(() => {
      setCountdown(getRamadanNightCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!countdown) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="flex shrink-0 items-center justify-center gap-2 px-4 py-2"
      style={{
        background:
          "linear-gradient(180deg, rgba(10,17,40,0.8) 0%, rgba(10,17,40,0.4) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <Moon
        className={`h-3.5 w-3.5 ${countdown.isNight ? "text-[#FFB380]" : "text-white/40"}`}
        strokeWidth={2}
      />
      <span className="text-xs text-white/50">{countdown.label}</span>
      <span
        className={`font-mono text-sm font-semibold tabular-nums ${
          countdown.isNight ? "text-[#FFD4B3]" : "text-white/70"
        }`}
      >
        {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
      </span>
    </div>
  );
}
