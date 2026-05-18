"use client";

import { useRef, useEffect } from "react";
import { LAST_TEN_NIGHTS } from "@/lib/last-ten-content";
import { cn } from "@/lib/utils";

export type LastTenNightStripAccent = "default" | "dhulHijjah";

interface LastTenNightStripProps {
    selectedNight: number;
    onSelectNight: (night: number) => void;
    getCompletedCount: (night: number) => number;
    totalItems: number;
    /** Ramadan mode: current night 1–30 for “today” tab hint. Ignored when `stripSlots` is set. */
    currentNight: number | null;
    accent?: LastTenNightStripAccent;
    /** When set (e.g. Dhul Hijjah days 1–10), these tab values are shown instead of last Ramadan nights. */
    stripSlots?: readonly number[];
    /** Slot to mark as current (e.g. today’s Dhul Hijjah day). Used when `stripSlots` is set. */
    activeSlot?: number | null;
    tablistAriaLabel?: string;
    /** When set (e.g. Dhul Hijjah), second line under the slot number — usually Gregorian maghrib span. */
    slotShortLabel?: (slot: number) => string;
}

export default function LastTenNightStrip({
    selectedNight,
    onSelectNight,
    getCompletedCount,
    totalItems,
    currentNight,
    accent = "default",
    stripSlots,
    activeSlot,
    tablistAriaLabel,
    slotShortLabel,
}: LastTenNightStripProps) {
    const dhul = accent === "dhulHijjah";
    const slots = stripSlots ?? LAST_TEN_NIGHTS;
    const highlight: number | null = stripSlots != null ? activeSlot ?? null : currentNight;
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
            className={cn(
                "relative min-w-0 w-full shrink-0 backdrop-blur-[20px] saturate-[180%] border-b",
                dhul
                    ? "border-[rgba(255,179,128,0.12)] bg-[rgba(10,17,40,0.92)]"
                    : "border-white/5 bg-[rgba(10,17,40,0.8)]",
            )}
        >
            {!dhul && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-4 right-4 h-px"
                    style={{
                        background:
                            "linear-gradient(110deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)",
                    }}
                />
            )}

            {/* Scrollport separate from the flex row: `justify-center` + `overflow-x-auto` on one node
                clips scroll range in some layouts; `min-w-0` lets flex ancestors shrink so overflow works. */}
            <div
                ref={scrollRef}
                className="min-w-0 w-full overflow-x-auto overflow-y-hidden overscroll-x-contain py-2.5 touch-pan-x [-webkit-overflow-scrolling:touch] scrollbar-none sm:py-3"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <div
                    className={cn(
                        "flex w-max gap-1 px-3 sm:gap-2 sm:px-4",
                        stripSlots == null && "sm:mx-auto",
                    )}
                    role="tablist"
                    aria-label={tablistAriaLabel ?? (stripSlots != null ? "Dhul Hijjah days" : "Ramadan nights")}
                >
                {slots.map((slot) => {
                    const isActive = slot === selectedNight;
                    const isToday = highlight !== null && slot === highlight;
                    const completed = getCompletedCount(slot);
                    const isComplete = completed === totalItems;
                    const hasProgress = completed > 0 && !isComplete;
                    const shortLabel = slotShortLabel?.(slot);
                    const tabLabel =
                        shortLabel != null && shortLabel !== ""
                            ? `Day ${slot}, ${shortLabel}`
                            : stripSlots != null
                              ? `Day ${slot}`
                              : `Night ${slot}`;

                    return (
                        <button
                            key={slot}
                            ref={(el) => {
                                if (el) buttonRefs.current.set(slot, el);
                            }}
                            id={`last-ten-tab-${slot}`}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`last-ten-panel-${slot}`}
                            aria-current={isToday ? "date" : undefined}
                            aria-label={tabLabel}
                            title={shortLabel ?? undefined}
                            onClick={() => onSelectNight(slot)}
                            className={cn(
                                "relative flex shrink-0 flex-col items-center justify-center rounded-xl px-2 py-2 sm:px-2.5",
                                shortLabel
                                    ? "min-h-[58px] min-w-[3.25rem] sm:min-h-[62px] sm:min-w-[3.5rem]"
                                    : "min-h-[52px] min-w-[52px] sm:min-h-[56px] sm:min-w-[58px]",
                                "transition-all duration-300 ease-out",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)]",
                                isActive
                                    ? dhul
                                        ? "bg-[color-mix(in_srgb,var(--theme-accent-countdown)_24%,rgba(10,17,40,0.65))] text-white ring-1 ring-[rgba(255,179,128,0.42)]"
                                        : "bg-[var(--theme-accent-countdown)]/20 text-white shadow-[0_0_20px_-5px_rgba(255,179,128,0.3)] ring-1 ring-[var(--theme-accent-countdown)]/40"
                                    : isToday
                                        ? "bg-white/5 text-white/90 ring-1 ring-white/20"
                                        : "text-white/40 hover:bg-white/8 active:bg-white/12",
                            )}
                        >
                            {/* Active indicator bar at top */}
                            {isActive && (
                                <span
                                    aria-hidden
                                    className={cn(
                                        "absolute top-1.5 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full",
                                        dhul
                                            ? "bg-gradient-to-r from-[var(--theme-accent-countdown)] to-[var(--theme-accent-countdown-deep)]"
                                            : "bg-[var(--theme-accent-countdown)]",
                                    )}
                                />
                            )}

                            {/* "Today" hint — visible when not the active tab */}
                            {isToday && !isActive && (
                                <span
                                    aria-hidden
                                    className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white/40"
                                />
                            )}

                            {shortLabel ? (
                                <span className="flex flex-col items-center gap-0.5 text-center">
                                    <span
                                        className={cn(
                                            "text-[9px] font-bold tabular-nums leading-tight sm:text-[10px]",
                                            isActive
                                                ? "text-white/95"
                                                : isToday
                                                  ? "text-white/85"
                                                  : "text-white/45",
                                        )}
                                    >
                                        {shortLabel}
                                    </span>
                                    <span
                                        className={cn(
                                            "text-[10px] font-black tracking-tight sm:text-[11px]",
                                            isActive
                                                ? dhul
                                                    ? "text-[var(--theme-highlight-cream)]"
                                                    : "text-[var(--theme-accent-countdown)]"
                                                : isToday
                                                  ? "text-white/90"
                                                  : "text-white/30",
                                        )}
                                    >
                                        {slot}
                                    </span>
                                </span>
                            ) : (
                                <span
                                    className={cn(
                                        "text-[11px] font-black tracking-tight sm:text-xs",
                                        isActive
                                            ? dhul
                                                ? "text-[var(--theme-highlight-cream)]"
                                                : "text-[var(--theme-accent-countdown)]"
                                            : isToday
                                              ? "text-white/90"
                                              : "text-white/30",
                                    )}
                                >
                                    {slot}
                                </span>
                            )}

                            {/* Progress indicator */}
                            {isComplete ? (
                                <span
                                    className={cn(
                                        "mt-0.5 text-[10px] font-bold text-[var(--theme-accent-countdown)]",
                                        !dhul && "drop-shadow-[0_0_8px_rgba(255,179,128,0.35)]",
                                    )}
                                >
                                    ✓
                                </span>
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
        </div>
    );
}
