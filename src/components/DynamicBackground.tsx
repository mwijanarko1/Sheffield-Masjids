"use client";

import React from "react";

const NIGHT_GRADIENT =
    "bg-gradient-to-b from-[#0A1128] via-[#121c38] to-[#1A2642]";

/**
 * Full-bleed night gradient + stars. Renders behind all page content
 * so the same background appears on every route.
 */
export default function DynamicBackground() {
    return (
        <>
            {/* Full-bleed background - extends to screen edges (iPhone bezels, notch) */}
            <div
                className={`fixed inset-0 z-0 pointer-events-none ${NIGHT_GRADIENT}`}
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
