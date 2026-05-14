"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  applyLocale,
  detectBrowserLocale,
  getStoredLocalePreference,
  persistLocalePreference,
  resolveLocale,
  resolveLocalePreferenceFromProfile,
  type AppLocale,
  type LocalePreference,
} from "@/lib/locale";
import type { ProfilePreferences } from "@/types/api";

type LocaleContextValue = {
  locale: AppLocale;
  localePreference: LocalePreference;
  setLocale: (locale: AppLocale) => void;
  setLocalePreference: (preference: LocalePreference) => AppLocale;
  syncProfileLocale: (
    preferences: Pick<ProfilePreferences, "interface_language" | "interface_language_auto">,
  ) => AppLocale;
};

const DEFAULT_LOCALE_CONTEXT: LocaleContextValue = {
  locale: "es",
  localePreference: "auto",
  setLocale: () => undefined,
  setLocalePreference: (preference) => resolveLocale(preference),
  syncProfileLocale: (preferences) => resolveLocale(resolveLocalePreferenceFromProfile(preferences)),
};

const LocaleContext = createContext<LocaleContextValue>(DEFAULT_LOCALE_CONTEXT);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("es");
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>("auto");

  useEffect(() => {
    const storedPreference = getStoredLocalePreference() ?? "auto";
    const resolvedLocale = resolveLocale(storedPreference);
    setLocalePreferenceState(storedPreference);
    setLocaleState(resolvedLocale);
    applyLocale(resolvedLocale);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleLanguageChange = () => {
      if (localePreference !== "auto") {
        return;
      }

      const nextLocale = detectBrowserLocale();
      setLocaleState(nextLocale);
      applyLocale(nextLocale);
    };

    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, [localePreference]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      localePreference,
      setLocale(nextLocale) {
        setLocalePreferenceState(nextLocale);
        setLocaleState(nextLocale);
        persistLocalePreference(nextLocale);
      },
      setLocalePreference(nextPreference) {
        const nextLocale = persistLocalePreference(nextPreference);
        setLocalePreferenceState(nextPreference);
        setLocaleState(nextLocale);
        return nextLocale;
      },
      syncProfileLocale(preferences) {
        const nextPreference = resolveLocalePreferenceFromProfile(preferences);
        const nextLocale = persistLocalePreference(nextPreference);
        setLocalePreferenceState(nextPreference);
        setLocaleState(nextLocale);
        return nextLocale;
      },
    }),
    [locale, localePreference],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
