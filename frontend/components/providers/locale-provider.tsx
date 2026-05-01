"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  applyLocale,
  detectBrowserLocale,
  getStoredLocale,
  persistLocale,
  resolveLocaleFromProfile,
  type AppLocale,
} from "@/lib/locale";
import type { ProfilePreferences } from "@/types/api";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  syncProfileLocale: (
    preferences: Pick<ProfilePreferences, "interface_language" | "interface_language_auto">,
  ) => AppLocale;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");

  useEffect(() => {
    const resolved = getStoredLocale() ?? detectBrowserLocale();
    setLocaleState(resolved);
    applyLocale(resolved);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
        persistLocale(nextLocale);
      },
      syncProfileLocale(preferences) {
        const nextLocale = resolveLocaleFromProfile(preferences);
        setLocaleState(nextLocale);
        persistLocale(nextLocale);
        return nextLocale;
      },
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
