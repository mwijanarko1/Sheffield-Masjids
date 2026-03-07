"use client";

import { LAST_TEN_NIGHTS } from "@/lib/last-ten-content";
import { cn } from "@/lib/utils";

interface LastTenNightSwitcherProps {
  selectedNight: number;
  onSelectNight: (night: number) => void;
  getCompletedCount: (night: number) => number;
  totalItems: number;
}

export default function LastTenNightSwitcher({
  selectedNight,
  onSelectNight,
  getCompletedCount,
  totalItems,
}: LastTenNightSwitcherProps) {
  return (
    <div className="space-y-3">
      <div
        className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center"
        role="tablist"
        aria-label="Last ten nights"
      >
        {LAST_TEN_NIGHTS.map((night) => {
          const isActive = night === selectedNight;
          const completed = getCompletedCount(night);

          return (
            <button
              key={night}
              id={`last-ten-tab-${night}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`last-ten-panel-${night}`}
              onClick={() => onSelectNight(night)}
              className={cn(
                "min-h-[44px] shrink-0 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128]",
                isActive
                  ? "border-[#FFB380]/60 bg-[#FFB380]/15 text-white shadow-[0_0_0_1px_rgba(255,179,128,0.18)]"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
              )}
            >
              <span className="block text-sm font-semibold">Night {night}</span>
              <span
                className={cn(
                  "mt-1 block text-xs",
                  isActive ? "text-[#FFD4B3]" : "text-white/55",
                )}
              >
                {completed}/{totalItems} completed
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
