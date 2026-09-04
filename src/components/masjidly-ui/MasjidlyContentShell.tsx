"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import {
  MASJIDLY_MODERN_SKIES,
  mutedTextForTheme,
  textColorForTheme,
} from "@/lib/masjidly-theme";

/**
 * Shared chrome for About / Contact / Privacy / Terms (Masjidly settings-adjacent pages).
 */
export default function MasjidlyContentShell({
  title,
  backHref = "/",
  backLabel = "Back to prayer times",
  children,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  const { theme } = useMasjidlyTheme();
  const fg = textColorForTheme(theme);
  const fgMuted = mutedTextForTheme(theme);
  const lightFg = MASJIDLY_MODERN_SKIES[theme].lightForeground;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12" style={{ color: fg }}>
      <Link
        href={backHref}
        className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
        style={{ color: fgMuted, opacity: 0.85 }}
      >
        <span aria-hidden>←</span> {backLabel}
      </Link>

      <article
        className="rounded-[22px] p-6 shadow-xl sm:p-10"
        style={{
          background: lightFg
            ? "rgba(255,255,255,0.12)"
            : "rgba(255,255,255,0.72)",
          border: lightFg
            ? "1px solid rgba(255,255,255,0.18)"
            : "1px solid rgba(240,240,240,0.95)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <h1 className="text-3xl font-light tracking-tight sm:text-5xl">{title}</h1>
        <div
          className="mt-8 space-y-6 text-base leading-8 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_nav]:flex [&_nav]:flex-wrap [&_nav]:gap-4 [&_nav]:pt-2 [&_nav]:text-sm [&_nav]:font-semibold [&_section]:space-y-3"
          style={{ color: fg, opacity: 0.86 }}
        >
          {children}
        </div>
      </article>
    </div>
  );
}
