"use client";

export const THEME_STORAGE_KEY = "atom-theme";

export type ThemeMode = "dark" | "light";

function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === "dark" || value === "light" ? value : null;
}

export function resolveThemeMode(): ThemeMode {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function persistThemeMode(mode: ThemeMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
  applyThemeMode(mode);
}

export function persistDarkModePreference(enabled: boolean) {
  persistThemeMode(enabled ? "dark" : "light");
}

export function syncThemeFromSystem() {
  if (getStoredTheme() !== null) {
    applyThemeMode(resolveThemeMode());
    return;
  }

  applyThemeMode(getSystemTheme());
}
