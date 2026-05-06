import type { Metadata } from "next";
import { ReactNode } from "react";

import "@/app/globals.css";
import "sonner/dist/styles.css";
import { AppToastProvider } from "@/components/providers/app-toast-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { LocaleScript } from "@/components/providers/locale-script";
import { ThemeScript } from "@/components/providers/theme-script";
import { ThemeSyncProvider } from "@/components/providers/theme-sync-provider";

export const metadata: Metadata = {
  title: "ATOM",
  description: "Panel modular en Next.js para ATOM",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <LocaleScript />
        <ThemeScript />
      </head>
      <body className="app-shell">
        <LocaleProvider>
          <ThemeSyncProvider />
          {children}
          <AppToastProvider />
        </LocaleProvider>
      </body>
    </html>
  );
}
