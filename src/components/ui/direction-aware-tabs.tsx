"use client";

import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
    useLayoutEffect,
} from "react";
import { cn } from "@/lib/utils";

export interface DirectionAwareTabItem {
    id: string | number;
    label: React.ReactNode;
    icon?: React.ReactNode;
    href?: string;
    /** Called when this tab is selected. */
    onSelect?: (id: string | number) => void;
}

interface DirectionAwareTabsProps {
    tabs: DirectionAwareTabItem[];
    activeId: string | number;
    onTabChange?: (id: string | number, direction: "left" | "right") => void;
    className?: string;
    /** Render prop for each tab item (icon + label). */
    renderTab?: (
        tab: DirectionAwareTabItem,
        isActive: boolean
    ) => React.ReactNode;
    /** Glass pill colour override for active tab. */
    activePillStyle?: React.CSSProperties;
}

/**
 * Direction-aware tab bar.
 *
 * Renders a container with a sliding liquid-glass indicator pill that moves
 * left or right depending on the direction of tab change. Each tab item is
 * wrapped in a `<button>` (or delegates to the caller via `onTabChange`).
 */
export function DirectionAwareTabs({
    tabs,
    activeId,
    onTabChange,
    className,
    renderTab,
    activePillStyle,
}: DirectionAwareTabsProps) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const pillRef = useRef<HTMLSpanElement>(null);

    // Track pill geometry: { left, width }
    const [pillRect, setPillRect] = useState<{ left: number; width: number }>({
        left: 0,
        width: 0,
    });

    // Whether the pill has been placed at least once (skip transition on first paint)
    const [ready, setReady] = useState(false);
    const [direction, setDirection] = useState<"left" | "right">("right");

    const activeIndex = tabs.findIndex((t) => t.id === activeId);
    const prevIndexRef = useRef(activeIndex);

    // Recompute pill position whenever active tab or container dimensions change
    const updatePill = useCallback(() => {
        const el = tabRefs.current[activeIndex];
        if (!el) return;
        const parent = el.offsetParent as HTMLElement | null;
        if (!parent) return;
        setPillRect({ left: el.offsetLeft, width: el.offsetWidth });
    }, [activeIndex]);

    // Use layout effect to position pill synchronously before paint
    useLayoutEffect(() => {
        updatePill();
    }, [updatePill]);

    // Mark ready after first paint so further changes get the CSS transition
    useEffect(() => {
        const raf = requestAnimationFrame(() => setReady(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    // Track direction whenever active tab changes
    useEffect(() => {
        const prev = prevIndexRef.current;
        if (prev !== activeIndex) {
            setDirection(activeIndex > prev ? "right" : "left");
            prevIndexRef.current = activeIndex;
        }
    }, [activeIndex]);

    // Re-measure on window resize
    useEffect(() => {
        const onResize = () => updatePill();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [updatePill]);

    function handleTabClick(tab: DirectionAwareTabItem, index: number) {
        const prev = prevIndexRef.current;
        const dir: "left" | "right" = index > prev ? "right" : "left";
        tab.onSelect?.(tab.id);
        onTabChange?.(tab.id, dir);
    }

    return (
        <div
            className={cn("relative flex items-center", className)}
            role="tablist"
            aria-orientation="horizontal"
        >
            {/* Sliding liquid-glass pill */}
            <span
                ref={pillRef}
                aria-hidden="true"
                className="absolute top-0 bottom-0 rounded-md pointer-events-none"
                style={{
                    left: pillRect.left,
                    width: pillRect.width,
                    // Only animate after first placement to avoid flash on mount
                    transition: ready
                        ? "left 320ms cubic-bezier(0.34, 1.20, 0.64, 1), width 240ms cubic-bezier(0.34, 1.20, 0.64, 1)"
                        : "none",
                    // Liquid glass
                    background:
                        "linear-gradient(160deg, rgba(255,179,128,0.22) 0%, rgba(255,120,60,0.10) 100%)",
                    boxShadow:
                        "inset 0 1px 0 rgba(255,200,160,0.35), 0 0 14px rgba(255,140,60,0.22), 0 0 0 1px rgba(255,179,128,0.30)",
                    ...activePillStyle,
                }}
            />

            {/* Tab buttons */}
            {tabs.map((tab, index) => {
                const isActive = tab.id === activeId;
                return (
                    <button
                        key={tab.id}
                        ref={(el) => {
                            tabRefs.current[index] = el;
                        }}
                        role="tab"
                        aria-selected={isActive}
                        aria-label={typeof tab.label === "string" ? tab.label : undefined}
                        onClick={() => handleTabClick(tab, index)}
                        className={cn(
                            "relative z-10 flex flex-col items-center justify-center gap-1 sm:gap-1.5",
                            "flex-1 min-h-[48px] px-3 sm:px-5 rounded-md",
                            "transition-colors duration-300 touch-manipulation cursor-pointer",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380]/60",
                            !isActive && "hover:bg-white/5 active:scale-95"
                        )}
                    >
                        {renderTab ? (
                            renderTab(tab, isActive)
                        ) : (
                            <>
                                {tab.icon && (
                                    <span
                                        className={cn(
                                            "w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300",
                                            isActive
                                                ? "text-[#FFB380] drop-shadow-[0_0_10px_rgba(255,179,128,0.60)]"
                                                : "text-white/45"
                                        )}
                                    >
                                        {tab.icon}
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        "text-[9px] sm:text-[10px] tracking-wide transition-all duration-300",
                                        isActive
                                            ? "font-semibold text-[#FFB380] drop-shadow-[0_0_6px_rgba(255,179,128,0.45)]"
                                            : "font-medium text-white/40"
                                    )}
                                >
                                    {tab.label}
                                </span>
                            </>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
