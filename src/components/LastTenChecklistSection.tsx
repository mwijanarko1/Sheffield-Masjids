"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import LastTenChecklist from "@/components/LastTenChecklist";
import LastTenNightStrip from "@/components/LastTenNightStrip";
import LastTenWelcomeModal from "@/components/LastTenWelcomeModal";
import NightCountdown from "@/components/NightCountdown";
import { useLastTenChecklist } from "@/hooks/use-last-ten-checklist";
import {
  type Difficulty,
  DIFFICULTY_TABS,
  DHUL_HIJJAH_CHECKLIST_DAYS,
  type DhulHijjahDayChecklistContext,
  getCurrentRamadanNight,
  getInitialDhulHijjahChecklistDay,
  getItemsByDifficulty,
  isItemEffectivelyChecked,
  LAST_TEN_ITEM_IDS_HIDDEN_ON_DHUL_HIJJAH,
  LAST_TEN_NIGHTS,
} from "@/lib/last-ten-content";
import { formatDhulIslamicDayMaghribSpan } from "@/lib/dhul-hijjah-calendar";
import { GLASS_PANEL_STYLE } from "@/lib/design-surface";
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
  if (currentNight !== null && (LAST_TEN_NIGHTS as readonly number[]).includes(currentNight)) {
    return currentNight;
  }
  return LAST_TEN_NIGHTS[0];
}

export type LastTenChecklistSectionVariant = "page" | "embedded";

/** Warm gradient shell when embedded on the Dhul Hijjah page; Ramadan page stays default. */
export type LastTenChecklistAccent = "default" | "dhulHijjah";

interface LastTenChecklistSectionProps {
  variant?: LastTenChecklistSectionVariant;
  className?: string;
  accent?: LastTenChecklistAccent;
  /**
   * When set (with embedded Dhul Hijjah page), the strip uses Islamic days 1–10, copy says “Day”,
   * and Ramadan night countdown is hidden. Storage keys "1"…"10" are separate from Ramadan nights 18–30.
   */
  dhulHijjahDayContext?: DhulHijjahDayChecklistContext;
}

export default function LastTenChecklistSection({
  variant = "page",
  className,
  accent = "default",
  dhulHijjahDayContext,
}: LastTenChecklistSectionProps) {
  const embedded = variant === "embedded";
  const dhulAccent = accent === "dhulHijjah";
  const isDhulDayMode = dhulHijjahDayContext != null;
  const framedDhul = embedded && dhulAccent && isDhulDayMode;

  const [selectedPeriod, setSelectedPeriod] = useState<number>(() =>
    dhulHijjahDayContext != null
      ? getInitialDhulHijjahChecklistDay(dhulHijjahDayContext)
      : getInitialNight(),
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("easy");
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const { state, isHydrated, toggleItem } = useLastTenChecklist();

  useEffect(() => {
    if (!isDhulDayMode || !dhulHijjahDayContext) return;
    if (selectedPeriod >= 1 && selectedPeriod <= 10) return;
    setSelectedPeriod(getInitialDhulHijjahChecklistDay(dhulHijjahDayContext));
  }, [isDhulDayMode, dhulHijjahDayContext, selectedPeriod]);

  const effectiveSelectedPeriod = useMemo(() => {
    if (!isDhulDayMode) return selectedPeriod;
    if (selectedPeriod >= 1 && selectedPeriod <= 10) return selectedPeriod;
    if (dhulHijjahDayContext) return getInitialDhulHijjahChecklistDay(dhulHijjahDayContext);
    return 1;
  }, [isDhulDayMode, selectedPeriod, dhulHijjahDayContext]);

  const filteredItems = useMemo(() => {
    const base = getItemsByDifficulty(selectedDifficulty);
    if (!isDhulDayMode) return base;
    return base.filter((item) => !LAST_TEN_ITEM_IDS_HIDDEN_ON_DHUL_HIJJAH.has(item.id));
  }, [selectedDifficulty, isDhulDayMode]);
  const filteredItemIds = useMemo(
    () => filteredItems.map((item) => item.id),
    [filteredItems],
  );
  const totalItems = filteredItems.length;
  const selectedSlotItems = state[String(effectiveSelectedPeriod)] ?? {};

  const currentSlotCompleted = countCompletedItems(selectedSlotItems, filteredItemIds);
  const currentRamadanNight = getCurrentRamadanNight();

  const highlightDhulSlot =
    isDhulDayMode &&
    dhulHijjahDayContext &&
    !dhulHijjahDayContext.isBefore &&
    !dhulHijjahDayContext.isAfter
      ? dhulHijjahDayContext.currentDay
      : null;

  const sectionInner = (
    <>
      <LastTenNightStrip
        selectedNight={effectiveSelectedPeriod}
        onSelectNight={setSelectedPeriod}
        getCompletedCount={(slot) =>
          countCompletedItems(state[String(slot)] ?? {}, filteredItemIds)
        }
        totalItems={totalItems}
        currentNight={currentRamadanNight}
        accent={dhulAccent ? "dhulHijjah" : "default"}
        stripSlots={isDhulDayMode ? DHUL_HIJJAH_CHECKLIST_DAYS : undefined}
        activeSlot={isDhulDayMode ? highlightDhulSlot : undefined}
        tablistAriaLabel={isDhulDayMode ? "Dhul Hijjah days" : undefined}
        slotShortLabel={
          isDhulDayMode ? (slot) => formatDhulIslamicDayMaghribSpan(slot) : undefined
        }
      />

      {!isDhulDayMode && <NightCountdown accent={dhulAccent ? "dhulHijjah" : "default"} />}

      <div
        className={cn(
          "flex shrink-0 items-center justify-center gap-2 border-b border-white/5 px-4 py-3 backdrop-blur-[20px] saturate-[180%] sm:py-4",
          framedDhul && "md:px-6 lg:px-8",
          dhulAccent ? "bg-[rgba(10,17,40,0.35)]" : "bg-[rgba(10,17,40,0.4)]",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-xl border p-1",
            dhulAccent
              ? "border-[rgba(255,179,128,0.22)] bg-[rgba(10,17,40,0.3)]"
              : "border-white/10 bg-white/5",
          )}
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
                  "relative rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest transition-all duration-300",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)]",
                  isActive
                    ? dhulAccent
                      ? "bg-gradient-to-r from-[var(--theme-accent-countdown)] to-[var(--theme-accent-countdown-deep)] text-[var(--theme-bg)] shadow-lg shadow-[rgba(255,133,56,0.22)]"
                      : "bg-[var(--theme-accent-countdown)] text-[var(--theme-bg)] shadow-lg"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70",
                )}
              >
                {difficulty}
                <span
                  className={cn(
                    "ml-1.5 text-[10px] opacity-60",
                    isActive && "text-[var(--theme-bg)]",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "pt-6 pb-2",
          embedded
            ? cn("px-3 sm:px-4", framedDhul && "md:px-6 lg:px-8")
            : "px-4 sm:px-6",
        )}
      >
        <div
          className={cn(
            "flex items-center",
            framedDhul ? "flex-col items-center justify-center gap-2 text-center" : "justify-between",
          )}
        >
          <div
            className={cn(
              "min-w-0 flex flex-col",
              framedDhul ? "w-full items-center" : "flex-1",
            )}
          >
            <span
              className={cn(
                "mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em]",
                dhulAccent ? "text-[var(--theme-accent-countdown)]/90" : "text-[var(--theme-text-muted)]",
              )}
            >
              {isDhulDayMode ? "Selected day" : "Current Progress"}
            </span>
            <div
              className={cn(
                "flex flex-wrap items-baseline gap-x-2 gap-y-1",
                framedDhul && "justify-center",
              )}
            >
              <h2
              className={cn(
                "font-black text-white",
                framedDhul ? "text-xl md:text-2xl lg:text-3xl" : "text-xl",
              )}
            >
                {isDhulDayMode ? `Day ${effectiveSelectedPeriod}` : `Night ${effectiveSelectedPeriod}`}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
                  dhulAccent
                    ? "border-[rgba(255,179,128,0.35)] bg-gradient-to-r from-[color-mix(in_srgb,var(--theme-accent-countdown)_22%,transparent)] to-[color-mix(in_srgb,var(--theme-accent-countdown-deep)_18%,transparent)] text-[var(--theme-highlight-cream)]"
                    : "border-[var(--theme-accent-countdown)]/20 bg-[var(--theme-accent-countdown)]/10 text-[var(--theme-accent-countdown)]",
                )}
              >
                {currentSlotCompleted}/{totalItems}
              </span>
            </div>
          </div>
          {!isHydrated && (
            <span className="shrink-0 text-xs text-white/40 animate-pulse">Synchronising…</span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "px-4 pt-4 sm:px-6",
          framedDhul && "md:px-8 lg:px-10",
          embedded ? "pb-8" : "min-h-0 flex-1 overflow-auto pb-[100px]",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full",
            framedDhul ? "max-w-none" : "max-w-2xl",
          )}
        >
          <LastTenChecklist
            night={effectiveSelectedPeriod}
            difficulty={selectedDifficulty}
            items={filteredItems}
            checkedItems={selectedSlotItems}
            onToggleItem={(itemId) => toggleItem(effectiveSelectedPeriod, itemId)}
          />
        </div>
      </div>
    </>
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        embedded ? "w-full" : "min-h-0 flex-1 overflow-auto pb-[100px]",
        className,
      )}
    >
      {!isDhulDayMode && <LastTenWelcomeModal />}

      {framedDhul ? (
        <div
          className="relative min-w-0 w-full overflow-hidden rounded-xl ring-1 ring-[rgba(255,179,128,0.28)]"
          style={GLASS_PANEL_STYLE}
        >
          {sectionInner}
        </div>
      ) : (
        sectionInner
      )}

      {framedDhul ? (
        <div className="mt-4 w-full min-w-0">
          <button
            type="button"
            onClick={() => setDisclaimerOpen((o) => !o)}
            aria-expanded={disclaimerOpen}
            aria-controls="dhul-checklist-disclaimer"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
              "border-[rgba(255,179,128,0.28)] bg-[rgba(10,17,40,0.4)] text-[var(--theme-accent-countdown)]/95",
              "hover:bg-[rgba(10,17,40,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)]",
            )}
          >
            Disclaimer
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 opacity-80 transition-transform", disclaimerOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          <div
            id="dhul-checklist-disclaimer"
            aria-hidden={!disclaimerOpen}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
              disclaimerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <p className="pt-2 text-center text-xs leading-relaxed text-[var(--theme-text-muted)]">
                These reminders are suggestions only. None of the acts listed here is fard (obligatory) upon you.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
