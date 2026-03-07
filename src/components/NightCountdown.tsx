"use client";

import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { getCurrentRamadanNight, RAMADAN_START_DATE } from "@/lib/last-ten-content";

/**
 * Hardcoded Ramadan prayer boundaries for Sheffield (Masjid Umar data).
 * Key = Ramadan day, value = { maghrib, nextFajr }.
 * "nextFajr" is the fajr of the following Gregorian day.
 */
const NIGHT_BOUNDARIES: Record<number, { maghrib: string; nextFajr: string }> = {
    1: { maghrib: "17:25", nextFajr: "05:40" },
    2: { maghrib: "17:27", nextFajr: "05:38" },
    3: { maghrib: "17:29", nextFajr: "05:36" },
    4: { maghrib: "17:31", nextFajr: "05:34" },
    5: { maghrib: "17:33", nextFajr: "05:32" },
    6: { maghrib: "17:35", nextFajr: "05:29" },
    7: { maghrib: "17:37", nextFajr: "05:27" },
    8: { maghrib: "17:38", nextFajr: "05:25" },
    9: { maghrib: "17:40", nextFajr: "05:23" },
    10: { maghrib: "17:42", nextFajr: "05:21" },
    11: { maghrib: "17:44", nextFajr: "05:19" },
    12: { maghrib: "17:47", nextFajr: "05:17" },
    13: { maghrib: "17:49", nextFajr: "05:14" },
    14: { maghrib: "17:50", nextFajr: "05:12" },
    15: { maghrib: "17:52", nextFajr: "05:10" },
    16: { maghrib: "17:54", nextFajr: "05:08" },
    17: { maghrib: "17:56", nextFajr: "05:05" },
    18: { maghrib: "17:58", nextFajr: "05:03" },
    19: { maghrib: "18:00", nextFajr: "05:01" },
    20: { maghrib: "18:02", nextFajr: "04:59" },
    21: { maghrib: "18:04", nextFajr: "04:56" },
    22: { maghrib: "18:05", nextFajr: "04:54" },
    23: { maghrib: "18:07", nextFajr: "04:52" },
    24: { maghrib: "18:09", nextFajr: "04:49" },
    25: { maghrib: "18:11", nextFajr: "04:47" },
    26: { maghrib: "18:13", nextFajr: "04:45" },
    27: { maghrib: "18:15", nextFajr: "04:42" },
    28: { maghrib: "18:17", nextFajr: "04:40" },
    29: { maghrib: "18:18", nextFajr: "04:38" },
    30: { maghrib: "18:20", nextFajr: "04:38" },
};

function parseHHMM(time: string): { h: number; m: number } {
    const [h, m] = time.split(":").map(Number);
    return { h, m };
}

interface CountdownState {
    hours: number;
    minutes: number;
    seconds: number;
    isNight: boolean;
    label: string;
}

function computeCountdown(): CountdownState | null {
    const ramadanDay = getCurrentRamadanNight();
    if (!ramadanDay) return null;

    const boundaries = NIGHT_BOUNDARIES[ramadanDay];
    if (!boundaries) return null;

    const now = new Date();

    const { h: magH, m: magM } = parseHHMM(boundaries.maghrib);
    const { h: fajH, m: fajM } = parseHHMM(boundaries.nextFajr);

    // Build today's maghrib timestamp
    const maghribToday = new Date(now);
    maghribToday.setHours(magH, magM, 0, 0);

    // Build tomorrow's fajr timestamp
    const fajrTomorrow = new Date(now);
    fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
    fajrTomorrow.setHours(fajH, fajM, 0, 0);

    const nowMs = now.getTime();

    if (nowMs < maghribToday.getTime()) {
        // Before maghrib — show countdown to maghrib (night hasn't started)
        const diffMs = maghribToday.getTime() - nowMs;
        const totalSec = Math.floor(diffMs / 1000);
        return {
            hours: Math.floor(totalSec / 3600),
            minutes: Math.floor((totalSec % 3600) / 60),
            seconds: totalSec % 60,
            isNight: false,
            label: "Night starts in",
        };
    }

    if (nowMs >= maghribToday.getTime() && nowMs < fajrTomorrow.getTime()) {
        // During the night — show countdown to fajr (night ends)
        const diffMs = fajrTomorrow.getTime() - nowMs;
        const totalSec = Math.floor(diffMs / 1000);
        return {
            hours: Math.floor(totalSec / 3600),
            minutes: Math.floor((totalSec % 3600) / 60),
            seconds: totalSec % 60,
            isNight: true,
            label: "Night ends in",
        };
    }

    return null;
}

export default function NightCountdown() {
    const [countdown, setCountdown] = useState<CountdownState | null>(null);

    useEffect(() => {
        // Initial computation
        setCountdown(computeCountdown());

        // Update every second
        const interval = setInterval(() => {
            setCountdown(computeCountdown());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (!countdown) return null;

    const pad = (n: number) => String(n).padStart(2, "0");

    return (
        <div
            className="flex items-center justify-center gap-2 px-4 py-2 shrink-0"
            style={{
                background: "linear-gradient(180deg, rgba(10,17,40,0.8) 0%, rgba(10,17,40,0.4) 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
        >
            <Moon
                className={`h-3.5 w-3.5 ${countdown.isNight ? "text-[#FFB380]" : "text-white/40"}`}
                strokeWidth={2}
            />
            <span className="text-xs text-white/50">
                {countdown.label}
            </span>
            <span
                className={`font-mono text-sm font-semibold tabular-nums ${countdown.isNight ? "text-[#FFD4B3]" : "text-white/70"
                    }`}
            >
                {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
        </div>
    );
}
