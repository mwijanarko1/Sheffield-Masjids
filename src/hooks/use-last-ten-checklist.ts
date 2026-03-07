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
        if (typeof checked === "boolean") {
          items[itemId] = checked;
        }

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

    setState((currentState) => ({
      ...currentState,
      [nightKey]: {
        ...currentState[nightKey],
        [itemId]: !currentState[nightKey]?.[itemId],
      },
    }));
  };

  return {
    state,
    isHydrated,
    toggleItem,
  };
}
