"use client";

import React, { useEffect, useState, useMemo } from "react";

const SHEFFIELD_TZ = "Europe/London";

/**
 * Full-bleed, time-of-day gradient + stars. Renders behind all page content
 * so the same dynamic background appears on every route.
 */
export default function DynamicBackground() {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const bgClass = useMemo(() => {
        const hourStr = currentTime.toLocaleTimeString("en-GB", {
            timeZone: SHEFFIELD_TZ,
            hour: "2-digit",
            hour12: false,
        });
        const hour = parseInt(hourStr, 10);

        if (hour >= 5 && hour < 7) {
            return "bg-gradient-to-b from-[#2e3159] via-[#8e5c77] to-[#f4935e]";
        }
        if (hour >= 7 && hour < 11) {
            return "bg-gradient-to-b from-[#5698d6] via-[#3a75b8] to-[#1e528e]";
        }
        if (hour >= 11 && hour < 13) {
            return "bg-gradient-to-b from-[#1ca3ec] via-[#1081cc] to-[#0459a3]";
        }
        if (hour >= 13 && hour < 17) {
            return "bg-gradient-to-b from-[#3876b5] via-[#2a5d96] to-[#1a4168]";
        }
        if (hour >= 17 && hour < 19) {
            return "bg-gradient-to-b from-[#233568] via-[#8b3d6a] to-[#fd7534]";
        }
        return "bg-gradient-to-b from-[#0A1128] via-[#121c38] to-[#1A2642]";
    }, [currentTime]);

    return (
        <>
            {/* Full-bleed background - extends to screen edges (iPhone bezels, notch) */}
            <div
                className={`fixed inset-0 z-0 pointer-events-none transition-colors duration-1000 ${bgClass}`}
                style={{
                    top: "calc(-1 * env(safe-area-inset-top, 0px))",
                    left: "calc(-1 * env(safe-area-inset-left, 0px))",
                    right: "calc(-1 * env(safe-area-inset-right, 0px))",
                    bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
                }}
                aria-hidden
            />
            {/* Stars - deterministic positions to avoid hydration mismatch */}
            <div className="fixed inset-0 top-0 left-0 w-full h-1/2 pointer-events-none z-0">
                {[...Array(15)].map((_, i) => {
                    const top = ((i * 31 + 7) % 97) + 1;
                    const left = ((i * 17 + 13) % 97) + 1;
                    const opacity = 0.2 + ((i * 11 + 3) % 80) / 100;
                    return (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white/60 rounded-full"
                            style={{
                                top: `${top}%`,
                                left: `${left}%`,
                                opacity,
                            }}
                        />
                    );
                })}
            </div>
        </>
    );
}
