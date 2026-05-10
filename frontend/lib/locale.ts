"use client";

import type { ProfilePreferences } from "@/types/api";

export const LEGACY_LOCALE_STORAGE_KEY = "atom-locale";
export const LOCALE_PREFERENCE_STORAGE_KEY = "atom-locale-preference";

export type AppLocale = "en" | "es";
export type LocalePreference = AppLocale | "auto";

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

function normalizeLocalePreference(value: string | null): LocalePreference | null {
  if (value === "auto" || value === "es" || value === "en") {
    return value;
  }

  return null;
}

export function getStoredLocalePreference(): LocalePreference | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedPreference = normalizeLocalePreference(
    window.localStorage.getItem(LOCALE_PREFERENCE_STORAGE_KEY),
  );
  if (storedPreference) {
    return storedPreference;
  }

  return normalizeLocalePreference(window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY));
}

export function resolveLocale(preference: LocalePreference): AppLocale {
  return preference === "auto" ? detectBrowserLocale() : preference;
}

export function applyLocale(locale: AppLocale) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
}

export function persistLocalePreference(preference: LocalePreference) {
  const locale = resolveLocale(preference);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, preference);
    if (preference === "auto") {
      window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(LEGACY_LOCALE_STORAGE_KEY, preference);
    }
  }

  applyLocale(locale);
  return locale;
}

export function resolveLocalePreferenceFromProfile(
  preferences: Pick<ProfilePreferences, "interface_language" | "interface_language_auto">,
): LocalePreference {
  if (preferences.interface_language_auto) {
    return "auto";
  }

  return preferences.interface_language;
}
