"use client";

import { useRef, useEffect } from "react";
import { LAST_TEN_NIGHTS } from "@/lib/last-ten-content";
import { cn } from "@/lib/utils";

interface LastTenNightStripProps {
    selectedNight: number;
    onSelectNight: (night: number) => void;
    getCompletedCount: (night: number) => number;
    totalItems: number;
    /** The current Ramadan night (1–30) to highlight as "today". */
    currentNight: number | null;
}

export default function LastTenNightStrip({
    selectedNight,
    onSelectNight,
    getCompletedCount,
    totalItems,
    currentNight,
}: LastTenNightStripProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    // Scroll the selected night into view
    useEffect(() => {
        const btn = buttonRefs.current.get(selectedNight);
        if (btn && scrollRef.current) {
            const container = scrollRef.current;
            const btnRect = btn.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            if (btnRect.left < containerRect.left || btnRect.right > containerRect.right) {
                btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
        }
    }, [selectedNight]);

    return (
        <div
            className="relative w-full shrink-0 backdrop-blur-[20px] saturate-[180%] bg-[rgba(10,17,40,0.8)] border-b border-white/5"
        >
            {/* Specular top edge shimmer */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />
            
            <div
                ref={scrollRef}
                className="flex gap-1 overflow-x-auto px-3 py-2.5 scrollbar-none sm:gap-2 sm:px-4 sm:py-3 sm:justify-center"
                role="tablist"
                aria-label="Ramadan nights"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {LAST_TEN_NIGHTS.map((night) => {
                    const isActive = night === selectedNight;
                    const isToday = night === currentNight;
                    const completed = getCompletedCount(night);
                    const isComplete = completed === totalItems;
                    const hasProgress = completed > 0 && !isComplete;

                    return (
                        <button
                            key={night}
                            ref={(el) => {
                                if (el) buttonRefs.current.set(night, el);
                            }}
                            id={`last-ten-tab-${night}`}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`last-ten-panel-${night}`}
                            aria-current={isToday ? "date" : undefined}
                            onClick={() => onSelectNight(night)}
                            className={cn(
                                "relative flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-2 min-w-[52px] min-h-[52px] sm:min-w-[58px] sm:min-h-[56px]",
                                "transition-all duration-300 ease-out",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)]",
                                isActive
                                    ? "bg-[var(--theme-accent-countdown)]/20 text-white shadow-[0_0_20px_-5px_rgba(255,179,128,0.3)] ring-1 ring-[var(--theme-accent-countdown)]/40"
                                    : isToday
                                        ? "bg-white/5 text-white/90 ring-1 ring-white/20"
                                        : "text-white/40 hover:bg-white/8 active:bg-white/12",
                            )}
                        >
                            {/* Active indicator bar at top */}
                            {isActive && (
                                <span
                                    aria-hidden
                                    className="absolute top-1.5 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-[var(--theme-accent-countdown)]"
                                />
                            )}

                            {/* "Today" hint — visible when not the active tab */}
                            {isToday && !isActive && (
                                <span
                                    aria-hidden
                                    className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white/40"
                                />
                            )}

                            <span className={cn(
                                "text-[11px] font-black tracking-tight sm:text-xs",
                                isActive ? "text-[var(--theme-accent-countdown)]" : isToday ? "text-white/90" : "text-white/30",
                            )}>
                                {night}
                            </span>

                            {/* Progress indicator */}
                            {isComplete ? (
                                <span className="mt-0.5 text-[10px] text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] font-bold">✓</span>
                            ) : hasProgress ? (
                                <span className="mt-0.5 text-[10px] font-black text-[var(--theme-accent-countdown)]">
                                    {completed}
                                </span>
                            ) : (
                                <div className="mt-1 h-0.5 w-3 rounded-full bg-white/10" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
