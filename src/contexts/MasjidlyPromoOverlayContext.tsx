"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type MasjidlyPromoOverlayContextValue = {
  promoOpen: boolean;
  setPromoOpen: Dispatch<SetStateAction<boolean>>;
};

const MasjidlyPromoOverlayContext = createContext<MasjidlyPromoOverlayContextValue | null>(null);

export function MasjidlyPromoOverlayProvider({ children }: { children: ReactNode }) {
  const [promoOpen, setPromoOpen] = useState(false);
  const value = useMemo(() => ({ promoOpen, setPromoOpen }), [promoOpen]);

  return (
    <MasjidlyPromoOverlayContext.Provider value={value}>{children}</MasjidlyPromoOverlayContext.Provider>
  );
}

/** Null when used outside `MasjidlyPromoOverlayProvider` (e.g. Storybook). */
export function useMasjidlyPromoOverlay() {
  return useContext(MasjidlyPromoOverlayContext);
}
