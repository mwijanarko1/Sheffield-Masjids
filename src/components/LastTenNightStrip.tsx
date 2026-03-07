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
            className="relative w-full shrink-0"
            style={{
                background:
                    "linear-gradient(180deg, rgba(10,17,40,0.95) 0%, rgba(10,17,40,0.8) 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
        >
            <div
                ref={scrollRef}
                className="flex gap-1 overflow-x-auto px-3 py-2.5 scrollbar-none sm:gap-1.5 sm:px-4 sm:py-3 sm:justify-center"
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
                                "transition-all duration-200 ease-out",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A1128]",
                                isActive
                                    ? "bg-[#FFB380]/18 text-white shadow-[0_0_12px_rgba(255,179,128,0.15)]"
                                    : isToday
                                        ? "bg-[#FFB380]/8 text-white/80 ring-1 ring-[#FFB380]/40"
                                        : "text-white/60 hover:bg-white/8 active:bg-white/12",
                            )}
                        >
                            {/* Active indicator dot at top */}
                            {isActive && (
                                <span
                                    aria-hidden
                                    className="absolute top-1 left-1/2 -translate-x-1/2 h-[3px] w-4 rounded-full bg-[#FFB380]"
                                />
                            )}

                            {/* "Today" dot — visible when not the active tab */}
                            {isToday && !isActive && (
                                <span
                                    aria-hidden
                                    className="absolute top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-[#FFB380]"
                                />
                            )}

                            <span className={cn(
                                "text-[11px] font-medium tracking-wide sm:text-xs",
                                isActive ? "text-[#FFD4B3]" : isToday ? "text-[#FFD4B3]/90" : "text-white/45",
                            )}>
                                {night}
                            </span>

                            {/* Progress indicator */}
                            {isComplete ? (
                                <span className="mt-0.5 text-[10px] text-emerald-400">✓</span>
                            ) : hasProgress ? (
                                <span className="mt-0.5 text-[10px] text-[#FFB380]/80">
                                    {completed}
                                </span>
                            ) : (
                                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-white/15" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
