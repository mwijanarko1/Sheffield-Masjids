"use client";

import React from "react";

interface JummahWidgetProps {
  jummahTime: string;
  isActive?: boolean;
  /** Compact variant for mobile/app display */
  compact?: boolean;
  className?: string;
}

export default function JummahWidget({ jummahTime, isActive, compact, className }: JummahWidgetProps) {
  const displayTime = jummahTime && jummahTime !== "-" && jummahTime !== "—" ? jummahTime : "—";

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-500 w-full ${
        compact ? "py-3 sm:py-3.5 md:py-4 px-4 sm:px-5 md:px-6" : "py-4 sm:py-5 px-4 sm:px-6"
      } ${className ?? ""}`}
      style={{
        background: isActive
          ? "linear-gradient(145deg, rgba(255,179,128,0.18) 0%, rgba(255,120,60,0.08) 60%, rgba(255,200,150,0.04) 100%)"
          : "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        boxShadow: isActive
          ? "inset 0 1px 0 rgba(255,210,170,0.25), 0 0 0 1px rgba(255,179,128,0.2)"
          : "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      {/* Specular top edge shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-4 right-4 h-px"
        style={{
          background: isActive
            ? "linear-gradient(90deg, transparent, rgba(255,210,160,0.4) 40%, rgba(255,255,255,0.5) 50%, rgba(255,210,160,0.4) 60%, transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent)",
        }}
      />

      <div className="relative z-10 text-center [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(0,0,0,0.35)]">
        <div
          className={`font-serif italic font-bold capitalize mb-1 ${
            compact ? "text-sm sm:text-base md:text-lg" : "text-base sm:text-lg"
          } ${isActive ? "text-white" : "text-white/95"}`}
        >
          Jummah prayer
        </div>
        <div
          className={`font-sans font-extrabold tracking-tighter tabular-nums ${
            compact ? "text-xl sm:text-2xl md:text-3xl" : "text-3xl sm:text-4xl"
          } ${isActive ? "text-white" : "text-white"}`}
        >
          {displayTime}
        </div>
      </div>
    </div>
  );
}
