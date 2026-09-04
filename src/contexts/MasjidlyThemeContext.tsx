"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MASJIDLY_MODERN_SKIES,
  mutedTextForTheme,
  textColorForTheme,
  type MasjidlyTimeTheme,
} from "@/lib/masjidly-theme";

export type MasjidlyThemeMode = "dynamic" | "fixed";

const THEME_MODE_KEY = "masjidly-theme-mode";
const FIXED_THEME_KEY = "masjidly-fixed-theme";
const USES_24H_KEY = "masjidly-uses-24h";
const SHOW_IQAMAH_KEY = "masjidly-show-iqamah";

interface MasjidlyThemeContextValue {
  /** Resolved sky currently painted behind the app. */
  theme: MasjidlyTimeTheme;
  /** Home/timetable call this for dynamic sky. Ignored when mode is fixed. */
  setTheme: (theme: MasjidlyTimeTheme) => void;
  themeMode: MasjidlyThemeMode;
  setThemeMode: (mode: MasjidlyThemeMode) => void;
  fixedTheme: MasjidlyTimeTheme;
  setFixedTheme: (theme: MasjidlyTimeTheme) => void;
  uses24HourTime: boolean;
  setUses24HourTime: (value: boolean) => void;
  showIqamahTime: boolean;
  setShowIqamahTime: (value: boolean) => void;
}

const MasjidlyThemeContext = createContext<MasjidlyThemeContextValue | null>(
  null,
);

function applyThemeCssVars(theme: MasjidlyTimeTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const lightFg = MASJIDLY_MODERN_SKIES[theme].lightForeground;
  root.style.setProperty("--theme-fg", textColorForTheme(theme));
  root.style.setProperty("--theme-fg-muted", mutedTextForTheme(theme));
  root.style.setProperty("--theme-text-muted", mutedTextForTheme(theme));
  root.style.setProperty(
    "--theme-border-subtle",
    lightFg ? "rgba(255, 255, 255, 0.22)" : "rgba(29, 36, 51, 0.12)",
  );
  root.dataset.masjidlyTheme = theme;
  root.dataset.masjidlyFg = lightFg ? "light" : "dark";
}

function readMode(): MasjidlyThemeMode {
  try {
    return window.localStorage.getItem(THEME_MODE_KEY) === "fixed"
      ? "fixed"
      : "dynamic";
  } catch {
    return "dynamic";
  }
}

function isMasjidlyTimeTheme(value: string): value is MasjidlyTimeTheme {
  return Object.hasOwn(MASJIDLY_MODERN_SKIES, value);
}

function readFixedTheme(): MasjidlyTimeTheme {
  try {
    const raw = window.localStorage.getItem(FIXED_THEME_KEY);
    if (raw && isMasjidlyTimeTheme(raw)) return raw;
  } catch {
    // ignore
  }
  return "maghrib";
}

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === "1";
  } catch {
    return fallback;
  }
}

export function MasjidlyThemeProvider({
  children,
  initialTheme = "isha",
}: {
  children: React.ReactNode;
  initialTheme?: MasjidlyTimeTheme;
}) {
  const [dynamicTheme, setDynamicTheme] =
    useState<MasjidlyTimeTheme>(initialTheme);
  const [themeMode, setThemeModeState] =
    useState<MasjidlyThemeMode>("dynamic");
  const [fixedTheme, setFixedThemeState] =
    useState<MasjidlyTimeTheme>("maghrib");
  const [uses24HourTime, setUses24HourTimeState] = useState(false);
  const [showIqamahTime, setShowIqamahTimeState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setThemeModeState(readMode());
    setFixedThemeState(readFixedTheme());
    setUses24HourTimeState(readBoolean(USES_24H_KEY, false));
    setShowIqamahTimeState(readBoolean(SHOW_IQAMAH_KEY, true));
    setHydrated(true);
  }, []);

  const theme = themeMode === "fixed" ? fixedTheme : dynamicTheme;

  useEffect(() => {
    applyThemeCssVars(theme);
  }, [theme]);

  const setTheme = useCallback((next: MasjidlyTimeTheme) => {
    setDynamicTheme(next);
  }, []);

  const setThemeMode = useCallback((mode: MasjidlyThemeMode) => {
    setThemeModeState(mode);
    try {
      window.localStorage.setItem(THEME_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const setFixedTheme = useCallback((next: MasjidlyTimeTheme) => {
    setFixedThemeState(next);
    try {
      window.localStorage.setItem(FIXED_THEME_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const setUses24HourTime = useCallback((value: boolean) => {
    setUses24HourTimeState(value);
    try {
      window.localStorage.setItem(USES_24H_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const setShowIqamahTime = useCallback((value: boolean) => {
    setShowIqamahTimeState(value);
    try {
      window.localStorage.setItem(SHOW_IQAMAH_KEY, value ? "1" : "0");
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      themeMode: hydrated ? themeMode : "dynamic",
      setThemeMode,
      fixedTheme,
      setFixedTheme,
      uses24HourTime: hydrated ? uses24HourTime : false,
      setUses24HourTime,
      showIqamahTime: hydrated ? showIqamahTime : true,
      setShowIqamahTime,
    }),
    [
      theme,
      setTheme,
      themeMode,
      setThemeMode,
      fixedTheme,
      setFixedTheme,
      uses24HourTime,
      setUses24HourTime,
      showIqamahTime,
      setShowIqamahTime,
      hydrated,
    ],
  );

  return (
    <MasjidlyThemeContext.Provider value={value}>
      {children}
    </MasjidlyThemeContext.Provider>
  );
}

export function useMasjidlyTheme(): MasjidlyThemeContextValue {
  const ctx = useContext(MasjidlyThemeContext);
  if (!ctx) {
    return {
      theme: "isha",
      setTheme: (_theme: MasjidlyTimeTheme) => {},
      themeMode: "dynamic",
      setThemeMode: (_mode: MasjidlyThemeMode) => {},
      fixedTheme: "maghrib",
      setFixedTheme: (_theme: MasjidlyTimeTheme) => {},
      uses24HourTime: false,
      setUses24HourTime: (_value: boolean) => {},
      showIqamahTime: true,
      setShowIqamahTime: (_value: boolean) => {},
    };
  }
  return ctx;
}
