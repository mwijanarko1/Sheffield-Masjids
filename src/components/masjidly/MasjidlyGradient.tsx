import React from "react";

/**
 * Masjidly's atmospheric gradient — Maghrib sunset theme.
 * Full-bleed layered gradient with a warm radial horizon glow.
 */
export default function MasjidlyGradient() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      {/* Base sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #6D3FA9 0%, #A855F7 35%, #F472B6 70%, #FB7185 100%)",
        }}
      />
      {/* Radial horizon glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 82%, rgba(245, 158, 11, 0.35) 0%, transparent 70%)",
        }}
      />
      {/* Subtle top vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 60% at 50% 0%, rgba(0,0,0,0.25) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
