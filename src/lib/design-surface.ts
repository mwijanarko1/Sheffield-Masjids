import type { CSSProperties } from "react";
import { glassPanelStyle } from "@/lib/masjidly-theme";

/**
 * Default frosted glass panel aligned with Masjidly HomeDesign glass
 * (light-on-dark sky). Prefer `glassPanelStyle(lightForeground)` when the
 * active sky theme is known.
 */
export const GLASS_PANEL_STYLE: CSSProperties = glassPanelStyle(true);
