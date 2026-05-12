import React from "react";
import { Comfortaa } from "next/font/google";
import MasjidlyGradient from "./MasjidlyGradient";

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-comfortaa",
  display: "swap",
});

interface MasjidlyLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared wrapper for all /masjidly/* pages.
 * Provides the atmospheric gradient, Comfortaa typography, and safe-area padding.
 */
export default function MasjidlyLayout({ children }: MasjidlyLayoutProps) {
  return (
    <div
      className={`${comfortaa.variable} font-[var(--font-comfortaa)] relative min-h-[100dvh] w-full overflow-x-hidden text-white`}
    >
      <MasjidlyGradient />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
