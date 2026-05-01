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
        className="flex shrink-0 items-center justify-center gap-2 px-4 py-3 sm:py-4 backdrop-blur-[20px] saturate-[180%] bg-[rgba(10,17,40,0.4)] border-b border-white/5"
      >
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
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
                  "relative rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all duration-300",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)]",
                  isActive
                    ? "text-[var(--theme-bg)] bg-[var(--theme-accent-countdown)] shadow-lg"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5",
                )}
              >
                {difficulty}
                <span className={cn("ml-1.5 text-[10px] opacity-60", isActive ? "text-[var(--theme-bg)]" : "")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress summary pill */}
      <div className="px-4 pt-6 pb-2 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-text-muted)] mb-0.5">
              Current Progress
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">Night {selectedNight}</h2>
              <span className="inline-flex items-center rounded-full bg-[var(--theme-accent-countdown)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--theme-accent-countdown)] border border-[var(--theme-accent-countdown)]/20">
                {currentNightCompleted}/{totalItems}
              </span>
            </div>
          </div>
          {!isHydrated && (
            <span className="text-xs text-white/40 animate-pulse">Synchronising…</span>
          )}
        </div>
      </div>

      {/* Action point list */}
      <div className="flex-1 overflow-auto px-4 pb-[100px] pt-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <LastTenChecklist
            night={selectedNight}
            difficulty={selectedDifficulty}
            items={filteredItems}
            checkedItems={selectedNightItems}
            onToggleItem={(itemId) => toggleItem(selectedNight, itemId)}
          />
        </div>
      </div>
    </div>
  );
}
