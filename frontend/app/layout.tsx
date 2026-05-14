import type { Metadata } from "next";
import { ReactNode } from "react";

import "@/app/globals.css";
import "sonner/dist/styles.css";
import { AppToastProvider } from "@/components/providers/app-toast-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { LocaleScript } from "@/components/providers/locale-script";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeScript } from "@/components/providers/theme-script";

export const metadata: Metadata = {
  title: "ATOM",
  description: "Panel modular en Next.js para ATOM",
  icons: {
    apple: "/images/favicon-atom.png",
    icon: "/images/favicon-atom.png",
    shortcut: "/images/favicon-atom.png",
  },
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
        <ThemeProvider>
          <LocaleProvider>
            {children}
            <AppToastProvider />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
