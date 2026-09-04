"use client";

import type { MasjidlyTimeTheme } from "@/lib/masjidly-theme";

function starPath(x: number, y: number, size: number): string {
  const c = size / 4;
  return `M${x} ${y - size} Q${x + c} ${y - c} ${x + size} ${y} Q${x + c} ${y + c} ${x} ${y + size} Q${x - c} ${y + c} ${x - size} ${y} Q${x - c} ${y - c} ${x} ${y - size} Z`;
}

/**
 * Line-art sun/moon icons mirrored from Masjidly `PrayerSunPhaseIcon`
 * (iOS HomeUIComponents / Android PrayerSunPhaseIcon.kt). 100x88 viewBox.
 */
export default function PrayerSunPhaseIcon({
  theme,
  color = "currentColor",
  className,
}: {
  theme: MasjidlyTimeTheme;
  color?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 88" width="100" height="88" className={className} aria-hidden
      fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2">
      {theme === "fajr" && (
        <g strokeWidth="1.8">
          <path d="M34 53.68 H66" />
          <path d={starPath(50, 39.68, 6)} />
        </g>
      )}
      {theme === "sunrise" && (
        <g>
          <path d="M18 58.08 H82 M36 58.08 A14 14 0 0 1 64 58.08" />
          {[-135, -90, -45].map((degrees) => {
            const angle = degrees * Math.PI / 180;
            return <line key={degrees} x1={50 + Math.cos(angle) * 20} y1={58.08 + Math.sin(angle) * 20}
              x2={50 + Math.cos(angle) * 28} y2={58.08 + Math.sin(angle) * 28} />;
          })}
        </g>
      )}
      {theme === "dhuhr" && (
        <g>
          <circle cx="50" cy="44" r="12" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((degrees) => {
            const angle = degrees * Math.PI / 180;
            return <line key={degrees} x1={50 + Math.cos(angle) * 18} y1={44 + Math.sin(angle) * 18}
              x2={50 + Math.cos(angle) * 26} y2={44 + Math.sin(angle) * 26} />;
          })}
        </g>
      )}
      {theme === "asr" && (
        <g>
          <path d="M40 32.6 V46.6" />
          <path d="M40 46.6 L68 54.6" strokeWidth="1.8" />
        </g>
      )}
      {theme === "maghrib" && (
        <g>
          <path d="M18 57.2 H82 M36 57.2 A14 14 0 0 1 64 57.2" />
          <path d="M50 31.2 V39.2 M47 36.2 L50 39.2 L53 36.2" strokeWidth="1.8" />
        </g>
      )}
      {(theme === "isha" || theme === "tahajjud") && (
        <g>
          <path d={starPath(46, 44, 8)} />
          <path d={starPath(62, 38, 4)} strokeWidth="1.8" />
          <path d={starPath(60, 52, 3)} strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}
