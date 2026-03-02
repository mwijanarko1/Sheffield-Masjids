import { useEffect, useState } from "react";
import { Mosque } from "@/types/prayer-times";

const SELECTED_MOSQUE_STORAGE_KEY = "selected-mosque-id";
const DEFAULT_MOSQUE_SLUG = "muslim-welfare-house";

function getDefaultMosque(mosques: Mosque[]): Mosque | null {
  if (mosques.length === 0) return null;
  return mosques.find((m) => m.slug === DEFAULT_MOSQUE_SLUG) ?? mosques[0];
}

export function usePersistedMosque(mosques: Mosque[]) {
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(
    () => getDefaultMosque(mosques)
  );

  useEffect(() => {
    if (mosques.length === 0) {
      setSelectedMosque(null);
      return;
    }

    const storedMosqueId = window.localStorage.getItem(
      SELECTED_MOSQUE_STORAGE_KEY
    );

    if (storedMosqueId) {
      const storedMosque = mosques.find((mosque) => mosque.id === storedMosqueId);
      if (storedMosque) {
        setSelectedMosque(storedMosque);
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
  }, [mosques]);

  useEffect(() => {
    if (!selectedMosque) return;
    window.localStorage.setItem(
      SELECTED_MOSQUE_STORAGE_KEY,
      selectedMosque.id
    );
  }, [selectedMosque]);

  return { selectedMosque, setSelectedMosque };
}
