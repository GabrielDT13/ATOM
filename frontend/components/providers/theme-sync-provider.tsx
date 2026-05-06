"use client";

import { useEffect } from "react";

import { applyThemeMode, getStoredTheme, syncThemeFromSystem } from "@/lib/theme";

export function ThemeSyncProvider() {
  useEffect(() => {
    syncThemeFromSystem();

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const storedTheme = getStoredTheme();
      if (storedTheme) {
        applyThemeMode(storedTheme);
        return;
      }
      syncThemeFromSystem();
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return null;
}
