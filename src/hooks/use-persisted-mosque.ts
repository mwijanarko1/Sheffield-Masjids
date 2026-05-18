import { useCallback, useEffect, useMemo, useState } from "react";
import { Mosque } from "@/types/prayer-times";
import { getDefaultHomeMosque } from "@/lib/home-prayer-defaults";

const SELECTED_MOSQUE_STORAGE_KEY = "selected-mosque-id";
const SELECTED_CITY_STORAGE_KEY = "selected-city-slug";
const DEFAULT_CITY_SLUG = "sheffield";

type CityOption = { id: string; name: string };

function buildCityOptions(mosques: Mosque[]): CityOption[] {
  const bySlug = new Map<string, string>();
  for (const m of mosques) {
    if (!bySlug.has(m.citySlug)) {
      bySlug.set(m.citySlug, m.cityName);
    }
  }
  return Array.from(bySlug.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function pickDefaultCitySlug(cityOptions: CityOption[]): string {
  if (cityOptions.length === 0) return DEFAULT_CITY_SLUG;
  const sheff = cityOptions.find((c) => c.id === DEFAULT_CITY_SLUG);
  return sheff ? sheff.id : cityOptions[0].id;
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

function readStoredCitySlug(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCitySlug(citySlug: string): void {
  try {
    window.localStorage.setItem(SELECTED_CITY_STORAGE_KEY, citySlug);
  } catch {
    // Same as mosque persistence
  }
}

function mosquesInCity(mosques: Mosque[], citySlug: string): Mosque[] {
  return mosques.filter((m) => m.citySlug === citySlug);
}

export function usePersistedMosque(mosques: Mosque[], initialMosque?: Mosque | null) {
  const [selectedCitySlug, setSelectedCitySlugState] = useState(
    () => initialMosque?.citySlug ?? mosques[0]?.citySlug ?? DEFAULT_CITY_SLUG,
  );
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(
    initialMosque ?? getDefaultHomeMosque(mosques),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const cityOptions = useMemo(() => buildCityOptions(mosques), [mosques]);

  const mosquesInSelectedCity = useMemo(
    () => mosquesInCity(mosques, selectedCitySlug),
    [mosques, selectedCitySlug],
  );

  const setSelectedCitySlug = useCallback(
    (citySlug: string) => {
      setSelectedCitySlugState(citySlug);
      const nextList = mosquesInCity(mosques, citySlug);
      setSelectedMosque(getDefaultHomeMosque(nextList));
    },
    [mosques],
  );

  useEffect(() => {
    if (mosques.length === 0) {
      setSelectedMosque(null);
      setIsHydrated(true);
      return;
    }

    const cities = buildCityOptions(mosques);
    const storedCity = readStoredCitySlug();
    const citySlug =
      storedCity && cities.some((c) => c.id === storedCity)
        ? storedCity
        : pickDefaultCitySlug(cities);

    setSelectedCitySlugState(citySlug);

    const inCity = mosquesInCity(mosques, citySlug);
    const storedMosqueId = readStoredMosqueId();

    if (storedMosqueId) {
      const storedMosque = inCity.find((m) => m.id === storedMosqueId);
      if (storedMosque) {
        setSelectedMosque(storedMosque);
        setIsHydrated(true);
        return;
      }
    }

    setSelectedMosque((current) => {
      if (current && current.citySlug === citySlug) {
        const updated = inCity.find((m) => m.id === current.id);
        if (updated) return updated;
      }
      return getDefaultHomeMosque(inCity);
    });
    setIsHydrated(true);
  }, [mosques]);

  useEffect(() => {
    if (!isHydrated || !selectedMosque) return;
    writeStoredMosqueId(selectedMosque.id);
  }, [isHydrated, selectedMosque]);

  useEffect(() => {
    if (!isHydrated) return;
    writeStoredCitySlug(selectedCitySlug);
  }, [isHydrated, selectedCitySlug]);

  return {
    selectedMosque,
    setSelectedMosque,
    isHydrated,
    cityOptions,
    selectedCitySlug,
    setSelectedCitySlug,
    mosquesInSelectedCity,
  };
}
