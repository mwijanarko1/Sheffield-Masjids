import { useEffect, useState } from "react";
import { Mosque } from "@/types/prayer-times";

const SELECTED_MOSQUE_STORAGE_KEY = "selected-mosque-id";

export function usePersistedMosque(mosques: Mosque[]) {
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(
    mosques[0] ?? null
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
      return mosques[0];
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
