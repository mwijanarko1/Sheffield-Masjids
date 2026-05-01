import { useEffect, useState } from "react";
import { Mosque } from "@/types/prayer-times";
import { DEFAULT_HOME_MOSQUE_SLUG } from "@/lib/home-prayer-defaults";

const SELECTED_MOSQUE_STORAGE_KEY = "selected-mosque-id";

function getDefaultMosque(mosques: Mosque[]): Mosque | null {
  if (mosques.length === 0) return null;
  return mosques.find((m) => m.slug === DEFAULT_HOME_MOSQUE_SLUG) ?? mosques[0];
}

function readStoredMosqueId(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_MOSQUE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredMosqueId(mosqueId: string): void {
  try {
    window.localStorage.setItem(SELECTED_MOSQUE_STORAGE_KEY, mosqueId);
  } catch {
    // Old or locked-down WebKit can deny localStorage. Prayer times should still render.
  }
}

export function usePersistedMosque(mosques: Mosque[], initialMosque?: Mosque | null) {
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(
    initialMosque ?? getDefaultMosque(mosques),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (mosques.length === 0) {
      setSelectedMosque(null);
      setIsHydrated(true);
      return;
    }

    const storedMosqueId = readStoredMosqueId();

    if (storedMosqueId) {
      const storedMosque = mosques.find((mosque) => mosque.id === storedMosqueId);
      if (storedMosque) {
        setSelectedMosque(storedMosque);
        setIsHydrated(true);
        return;
      }
    }

    setSelectedMosque((current) => {
      if (current) {
        const updated = mosques.find((mosque) => mosque.id === current.id);
        if (updated) return updated;
      }
      return getDefaultMosque(mosques);
    });
    setIsHydrated(true);
  }, [mosques]);

  useEffect(() => {
    if (!isHydrated || !selectedMosque) return;
    writeStoredMosqueId(selectedMosque.id);
  }, [isHydrated, selectedMosque]);

  return { selectedMosque, setSelectedMosque, isHydrated };
}
