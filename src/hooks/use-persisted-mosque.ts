import { useEffect, useState } from "react";
import { Mosque } from "@/types/prayer-times";

const SELECTED_MOSQUE_STORAGE_KEY = "selected-mosque-id";

export function usePersistedMosque(mosques: Mosque[]) {
  const [selectedMosque, setSelectedMosque] = useState<Mosque>(mosques[0]);

  useEffect(() => {
    const storedMosqueId = window.localStorage.getItem(
      SELECTED_MOSQUE_STORAGE_KEY
    );

    if (!storedMosqueId) return;

    const storedMosque = mosques.find((mosque) => mosque.id === storedMosqueId);
    if (storedMosque) {
      setSelectedMosque(storedMosque);
    }
  }, [mosques]);

  useEffect(() => {
    window.localStorage.setItem(
      SELECTED_MOSQUE_STORAGE_KEY,
      selectedMosque.id
    );
  }, [selectedMosque]);

  return { selectedMosque, setSelectedMosque };
}
