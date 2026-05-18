import type { CSSProperties } from "react";

/**
 * Frosted glass panel — docs/DESIGN.md (Elevation & Depth) and AppHomePage summary strip.
 * Tokens: navy glass tint, blur(20px) saturate(180%), inset highlight, soft outer shadow.
 */
export const GLASS_PANEL_STYLE: CSSProperties = {
  background: "rgba(10, 17, 40, 0.25)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  boxShadow:
    "inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.3)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
};
