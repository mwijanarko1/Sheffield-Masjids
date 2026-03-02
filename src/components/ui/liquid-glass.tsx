"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const BLUR_MAP = {
  sm: "12px",
  md: "20px",
  lg: "28px",
  xl: "36px",
} as const;

const GLOW_MAP = {
  none: "none",
  xs: "0 0 8px rgba(255,255,255,0.08)",
  sm: "0 0 14px rgba(255,179,128,0.22), 0 0 24px rgba(255,140,60,0.12)",
  md: "0 0 20px rgba(255,179,128,0.28), 0 0 36px rgba(255,140,60,0.16)",
  lg: "0 0 28px rgba(255,179,128,0.32), 0 0 48px rgba(255,140,60,0.20)",
  xl: "0 0 36px rgba(255,179,128,0.38), 0 0 60px rgba(255,140,60,0.24)",
  "2xl": "0 0 48px rgba(255,179,128,0.42), 0 0 80px rgba(255,140,60,0.28)",
} as const;

const SHADOW_MAP = {
  none: "none",
  xs: "inset 0 1px 0 rgba(255,255,255,0.12)",
  sm:
    "inset 0 1px 0 rgba(255,200,160,0.35), inset 0 -1px 0 rgba(0,0,0,0.12)",
  md:
    "inset 0 1px 0 rgba(255,200,160,0.40), inset 0 -1px 0 rgba(0,0,0,0.18)",
  lg:
    "inset 0 2px 0 rgba(255,200,160,0.45), inset 0 -2px 0 rgba(0,0,0,0.22)",
  xl:
    "inset 0 2px 0 rgba(255,200,160,0.50), inset 0 -2px 0 rgba(0,0,0,0.28)",
  "2xl":
    "inset 0 3px 0 rgba(255,200,160,0.55), inset 0 -3px 0 rgba(0,0,0,0.32)",
} as const;

type BlurIntensity = keyof typeof BLUR_MAP;
type GlowIntensity = keyof typeof GLOW_MAP;
type ShadowIntensity = keyof typeof SHADOW_MAP;

export interface LiquidGlassCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Backdrop blur strength */
  blurIntensity?: BlurIntensity;
  /** Custom border radius */
  borderRadius?: string;
  /** Outer glow effect */
  glowIntensity?: GlowIntensity;
  /** Inner shadow depth */
  shadowIntensity?: ShadowIntensity;
  /** Enable drag with elastic bounce-back */
  draggable?: boolean;
}

const LiquidGlassCard = React.forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  (
    {
      className,
      blurIntensity = "sm",
      borderRadius = "12px",
      glowIntensity = "sm",
      shadowIntensity = "sm",
      draggable = false,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const blur = BLUR_MAP[blurIntensity];
    const glow = GLOW_MAP[glowIntensity];
    const shadow = SHADOW_MAP[shadowIntensity];

    const combinedStyle: React.CSSProperties = {
      background:
        "linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.06) 100%)",
      backdropFilter: `blur(${blur}) saturate(180%)`,
      WebkitBackdropFilter: `blur(${blur}) saturate(180%)`,
      borderRadius,
      boxShadow:
        glow !== "none" && shadow !== "none"
          ? `${shadow}, ${glow}, 0 0 0 1px rgba(255,179,128,0.20)`
          : glow !== "none"
            ? `${glow}, 0 0 0 1px rgba(255,179,128,0.20)`
            : shadow !== "none"
              ? `${shadow}, 0 0 0 1px rgba(255,179,128,0.15)`
              : "0 0 0 1px rgba(255,179,128,0.15)",
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          draggable && "cursor-grab active:cursor-grabbing",
          className
        )}
        style={combinedStyle}
        {...props}
      >
        {/* Top specular shimmer */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.50) 30%, rgba(255,255,255,0.70) 50%, rgba(255,255,255,0.50) 70%, transparent)",
          }}
        />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

LiquidGlassCard.displayName = "LiquidGlassCard";

export { LiquidGlassCard };
