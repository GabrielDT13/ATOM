import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";

import "@/app/globals.css";
import { AppToastProvider } from "@/components/providers/app-toast-provider";

export const metadata: Metadata = {
  title: "ATOM",
  description: "Panel modular en Next.js para ATOM",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
});

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className={spaceGrotesk.className}>
        {children}
        <AppToastProvider />
      </body>
    </html>
  );
}
