"use client";

import { useMemo, useState } from "react";
import LastTenChecklist from "@/components/LastTenChecklist";
import LastTenNightStrip from "@/components/LastTenNightStrip";
import LastTenWelcomeModal from "@/components/LastTenWelcomeModal";
import NightCountdown from "@/components/NightCountdown";
import { useLastTenChecklist } from "@/hooks/use-last-ten-checklist";
import {
  type Difficulty,
  DIFFICULTY_TABS,
  getCurrentRamadanNight,
  getItemsByDifficulty,
  isItemEffectivelyChecked,
  LAST_TEN_NIGHTS,
} from "@/lib/last-ten-content";
import { cn } from "@/lib/utils";

function countCompletedItems(items: Record<string, boolean>, itemIds: string[]) {
  return itemIds.reduce(
    (total, itemId) =>
      total + (isItemEffectivelyChecked(itemId, items) ? 1 : 0),
    0,
  );
}

function getInitialNight(): number {
  const currentNight = getCurrentRamadanNight();
  // If today falls within one of the listed nights, select it; otherwise default to the first
  if (currentNight !== null && (LAST_TEN_NIGHTS as readonly number[]).includes(currentNight)) {
    return currentNight;
  }
  return LAST_TEN_NIGHTS[0];
}

export default function LastTenNightsPage() {
  const [selectedNight, setSelectedNight] = useState<number>(getInitialNight);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("easy");
  const { state, isHydrated, toggleItem } = useLastTenChecklist();

  const filteredItems = useMemo(
    () => getItemsByDifficulty(selectedDifficulty),
    [selectedDifficulty],
  );
  const filteredItemIds = useMemo(
    () => filteredItems.map((item) => item.id),
    [filteredItems],
  );
  const totalItems = filteredItems.length;
  const selectedNightItems = state[String(selectedNight)] ?? {};

  const currentNightCompleted = countCompletedItems(selectedNightItems, filteredItemIds);
  const currentRamadanNight = getCurrentRamadanNight();

  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Ramadan Checklist</h1>
      {/* First-time welcome modal */}
      <LastTenWelcomeModal />

      {/* Night strip — horizontal scrollable bar */}
      <LastTenNightStrip
        selectedNight={selectedNight}
        onSelectNight={setSelectedNight}
        getCompletedCount={(night) =>
          countCompletedItems(state[String(night)] ?? {}, filteredItemIds)
        }
        totalItems={totalItems}
        currentNight={currentRamadanNight}
      />

      {/* Night countdown */}
      <NightCountdown />

      {/* Difficulty tabs */}
      <div
        className="flex shrink-0 items-center justify-center gap-2 px-4 py-2"
        style={{
          background: "linear-gradient(rgba(10, 17, 40, 0.8) 0%, rgba(10, 17, 40, 0.4) 100%)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {DIFFICULTY_TABS.map((difficulty) => {
          const count = getItemsByDifficulty(difficulty).length;
          const isActive = selectedDifficulty === difficulty;
          return (
            <button
              key={difficulty}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${difficulty} difficulty, ${count} items`}
              onClick={() => setSelectedDifficulty(difficulty)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128]",
                isActive
                  ? "bg-[#FFB380] text-[#0A1128]"
                  : "border border-white/20 bg-transparent text-white/40 hover:border-white/30 hover:text-white/60",
              )}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              <span className="ml-1.5 text-xs opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Progress summary pill */}
      <div className="px-4 pt-3 pb-1 sm:px-6">
        <div className="flex items-center gap-2">
          <p className="text-sm text-white/60">
            Night {selectedNight}
          </p>
          <span className="text-sm font-semibold text-[#FFD4B3]">
            {currentNightCompleted}/{totalItems}
          </span>
          {!isHydrated && (
            <span className="text-xs text-white/40">Loading…</span>
          )}
        </div>
      </div>

      {/* Action point list */}
      <div className="flex-1 overflow-auto px-4 pb-[100px] sm:px-6">
        <LastTenChecklist
          night={selectedNight}
          difficulty={selectedDifficulty}
          items={filteredItems}
          checkedItems={selectedNightItems}
          onToggleItem={(itemId) => toggleItem(selectedNight, itemId)}
        />
      </div>
    </div>
  );
}
