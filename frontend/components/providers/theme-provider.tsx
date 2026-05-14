"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  applyThemeMode,
  detectSystemTheme,
  getStoredThemePreference,
  persistThemePreference,
  resolveThemeMode,
  resolveThemePreferenceFromProfile,
  type ThemeMode,
  type ThemePreference,
} from "@/lib/theme";
import type { ProfilePreferences } from "@/types/api";

type ThemeContextValue = {
  themeMode: ThemeMode;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => ThemeMode;
  syncProfileTheme: (
    preferences: Pick<ProfilePreferences, "dark_mode" | "dark_mode_auto">,
  ) => ThemeMode;
};

const DEFAULT_THEME_CONTEXT: ThemeContextValue = {
  themeMode: "light",
  themePreference: "system",
  setThemePreference: (preference) => resolveThemeMode(preference),
  syncProfileTheme: (preferences) => resolveThemeMode(resolveThemePreferenceFromProfile(preferences)),
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_CONTEXT);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    const storedPreference = getStoredThemePreference() ?? "system";
    const resolvedMode = resolveThemeMode(storedPreference);
    setThemePreferenceState(storedPreference);
    setThemeMode(resolvedMode);
    applyThemeMode(resolvedMode);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (themePreference !== "system") {
        return;
      }

      const nextMode = detectSystemTheme();
      setThemeMode(nextMode);
      applyThemeMode(nextMode);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themePreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      themePreference,
      setThemePreference(nextPreference) {
        const nextMode = resolveThemeMode(nextPreference);
        persistThemePreference(nextPreference);
        setThemePreferenceState(nextPreference);
        setThemeMode(nextMode);
        return nextMode;
      },
      syncProfileTheme(preferences) {
        const nextPreference = resolveThemePreferenceFromProfile(preferences);
        const nextMode = resolveThemeMode(nextPreference);
        persistThemePreference(nextPreference);
        setThemePreferenceState(nextPreference);
        setThemeMode(nextMode);
        return nextMode;
      },
    }),
    [themeMode, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
