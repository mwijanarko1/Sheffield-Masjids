"use client";

import { usePathname } from "next/navigation";
import React, { useEffect } from "react";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import {
  MASJIDLY_MODERN_SKIES,
  mutedTextForTheme,
  textColorForTheme,
} from "@/lib/masjidly-theme";

/** Legacy class kept for MasjidlyHomePopup night fallback. */
export const NIGHT_GRADIENT =
  "bg-gradient-to-b from-[#020326] via-[#06114F] to-[#3B2A5A]";

/**
 * Full-bleed Masjidly atmospheric sky (classic set from HomeDesign.swift).
 * Hidden on /masjidly/* so marketing pages keep their own chrome.
 */
export default function DynamicBackground() {
  const pathname = usePathname();
  const { theme } = useMasjidlyTheme();

  useEffect(() => {
    if (pathname?.startsWith("/masjidly")) return;
    const root = document.documentElement;
    const lightFg = MASJIDLY_MODERN_SKIES[theme].lightForeground;
    root.style.setProperty("--theme-sky", MASJIDLY_MODERN_SKIES[theme].sky);
    root.style.setProperty("--theme-edge", MASJIDLY_MODERN_SKIES[theme].sky.match(/#[0-9a-f]{6}/i)![0]);
    root.style.setProperty("--theme-fg", textColorForTheme(theme));
    root.style.setProperty("--theme-fg-muted", mutedTextForTheme(theme));
    root.style.setProperty("--theme-text-muted", mutedTextForTheme(theme));
    root.dataset.masjidlyTheme = theme;
    root.dataset.masjidlyFg = lightFg ? "light" : "dark";
    return () => {
      root.style.removeProperty("--theme-sky");
      root.style.removeProperty("--theme-edge");
    };
  }, [theme, pathname]);

  if (pathname?.startsWith("/masjidly")) return null;

  const active = MASJIDLY_MODERN_SKIES[theme];

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        top: "calc(-1 * env(safe-area-inset-top, 0px))",
        left: "calc(-1 * env(safe-area-inset-left, 0px))",
        right: "calc(-1 * env(safe-area-inset-right, 0px))",
        bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
      }}
      aria-hidden
    >
      <div
        className="fixed inset-x-0 bottom-0 h-1"
        style={{ backgroundColor: active.sky.match(/#[0-9a-f]{6}/gi)!.at(-1) }}
      />
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-in-out"
        style={{ background: active.sky }}
      />
      {active.glow !== "none" ? (
        <div
          className="absolute inset-0 transition-[background] duration-700 ease-in-out"
          style={{ background: active.glow }}
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 45%)",
          mixBlendMode: "plus-lighter",
        }}
      />
    </div>
  );
}
