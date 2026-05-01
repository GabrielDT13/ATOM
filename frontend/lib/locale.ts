"use client";

import type { ProfilePreferences } from "@/types/api";

export const LOCALE_STORAGE_KEY = "atom-locale";

export type AppLocale = "en" | "es";

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const language = String(navigator.language || navigator.languages?.[0] || "")
    .trim()
    .toLowerCase();

  if (language.startsWith("es")) {
    return "es";
  }

  if (language.startsWith("en")) {
    return "en";
  }

  return "en";
}

export function getStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return value === "es" || value === "en" ? value : null;
}

export function applyLocale(locale: AppLocale) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
}

export function persistLocale(locale: AppLocale) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }

  applyLocale(locale);
}

export function resolveLocaleFromProfile(
  preferences: Pick<ProfilePreferences, "interface_language" | "interface_language_auto">,
): AppLocale {
  if (preferences.interface_language_auto) {
    return detectBrowserLocale();
  }

  return preferences.interface_language;
}
