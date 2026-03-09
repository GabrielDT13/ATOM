import type { Metadata } from "next";
import { ReactNode } from "react";

import "@/app/globals.css";
import { AppToastProvider } from "@/components/providers/app-toast-provider";

export const metadata: Metadata = {
  title: "ATOM",
  description: "Panel modular en Next.js para ATOM",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className="app-shell">
        {children}
        <AppToastProvider />
      </body>
    </html>
  );
}
