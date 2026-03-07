"use client";

import { useEffect, useState } from "react";
import {
  LAST_TEN_STORAGE_KEY,
  LastTenChecklistState,
  createEmptyLastTenChecklistState,
} from "@/lib/last-ten-content";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeChecklistState(raw: unknown): LastTenChecklistState {
  const nextState = createEmptyLastTenChecklistState();

  if (!isRecord(raw)) {
    return nextState;
  }

  for (const [night, value] of Object.entries(raw)) {
    if (!(night in nextState) || !isRecord(value)) {
      continue;
    }

    nextState[night] = Object.entries(value).reduce<Record<string, boolean>>(
      (items, [itemId, checked]) => {
        if (typeof checked !== "boolean") return items;

        // Migrate old blessings-on-prophet to new split ids
        if (itemId === "blessings-on-prophet" && checked) {
          items["blessings-on-prophet-5"] = true;
          items["blessings-on-prophet-20"] = true;
          items["blessings-on-prophet-100"] = true;
          return items;
        }

        items[itemId] = checked;
        return items;
      },
      {},
    );
  }

  return nextState;
}

export function useLastTenChecklist() {
  const [state, setState] = useState<LastTenChecklistState>(() =>
    createEmptyLastTenChecklistState(),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LAST_TEN_STORAGE_KEY);

      if (stored) {
        setState(sanitizeChecklistState(JSON.parse(stored)));
      }
    } catch {
      setState(createEmptyLastTenChecklistState());
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      window.localStorage.setItem(LAST_TEN_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore persistence failures and keep the in-memory state usable.
    }
  }, [isHydrated, state]);

  const toggleItem = (night: number, itemId: string) => {
    const nightKey = String(night);

    setState((currentState) => {
      const current = currentState[nightKey] ?? {};
      const isChecked = !current[itemId];
      const updates: Record<string, boolean> = { ...current, [itemId]: isChecked };

      // Cascade: checking 100 salawat implies 20 and 5; checking 20 implies 5
      if (isChecked) {
        if (itemId === "blessings-on-prophet-100") {
          updates["blessings-on-prophet-20"] = true;
          updates["blessings-on-prophet-5"] = true;
        } else if (itemId === "blessings-on-prophet-20") {
          updates["blessings-on-prophet-5"] = true;
        }
      }

      return {
        ...currentState,
        [nightKey]: updates,
      };
    });
  };

  return {
    state,
    isHydrated,
    toggleItem,
  };
}
