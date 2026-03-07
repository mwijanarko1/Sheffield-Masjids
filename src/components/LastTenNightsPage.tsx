"use client";

import { useMemo, useState } from "react";
import LastTenChecklist from "@/components/LastTenChecklist";
import LastTenNightStrip from "@/components/LastTenNightStrip";
import LastTenWelcomeModal from "@/components/LastTenWelcomeModal";
import NightCountdown from "@/components/NightCountdown";
import { useLastTenChecklist } from "@/hooks/use-last-ten-checklist";
import {
  getCurrentRamadanNight,
  LAST_TEN_ITEMS,
  LAST_TEN_NIGHTS,
} from "@/lib/last-ten-content";

function countCompletedItems(items: Record<string, boolean>, itemIds: string[]) {
  return itemIds.reduce((total, itemId) => total + (items[itemId] ? 1 : 0), 0);
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
  const { state, isHydrated, toggleItem } = useLastTenChecklist();
  const itemIds = useMemo(() => LAST_TEN_ITEMS.map((item) => item.id), []);
  const totalItems = LAST_TEN_ITEMS.length;
  const selectedNightItems = state[String(selectedNight)] ?? {};

  const currentNightCompleted = countCompletedItems(selectedNightItems, itemIds);
  const currentRamadanNight = getCurrentRamadanNight();

  return (
    <div className="flex h-full flex-col">
      {/* First-time welcome modal */}
      <LastTenWelcomeModal />

      {/* Night strip — horizontal scrollable bar */}
      <LastTenNightStrip
        selectedNight={selectedNight}
        onSelectNight={setSelectedNight}
        getCompletedCount={(night) =>
          countCompletedItems(state[String(night)] ?? {}, itemIds)
        }
        totalItems={totalItems}
        currentNight={currentRamadanNight}
      />

      {/* Night countdown */}
      <NightCountdown />

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
          items={LAST_TEN_ITEMS}
          checkedItems={selectedNightItems}
          onToggleItem={(itemId) => toggleItem(selectedNight, itemId)}
        />
      </div>
    </div>
  );
}
