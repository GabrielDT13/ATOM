"use client";

import type { ProfilePreferences } from "@/types/api";

export const LEGACY_THEME_STORAGE_KEY = "atom-theme";
export const THEME_PREFERENCE_STORAGE_KEY = "atom-theme-preference";

export type ThemeMode = "dark" | "light";
export type ThemePreference = ThemeMode | "system";

export function detectSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function normalizeThemePreference(value: string | null): ThemePreference | null {
  if (value === "system" || value === "dark" || value === "light") {
    return value;
  }

  return null;
}

export function getStoredThemePreference(): ThemePreference | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedPreference = normalizeThemePreference(
    window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY),
  );
  if (storedPreference) {
    return storedPreference;
  }

  return normalizeThemePreference(window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY));
}

export function resolveThemeMode(preference: ThemePreference): ThemeMode {
  return preference === "system" ? detectSystemTheme() : preference;
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function persistThemePreference(preference: ThemePreference) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
    if (preference === "system") {
      window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(LEGACY_THEME_STORAGE_KEY, preference);
    }
  }

  applyThemeMode(resolveThemeMode(preference));
}

export function resolveThemePreferenceFromProfile(
  preferences: Pick<ProfilePreferences, "dark_mode" | "dark_mode_auto">,
): ThemePreference {
  if (preferences.dark_mode_auto) {
    return "system";
  }

  return preferences.dark_mode ? "dark" : "light";
}
