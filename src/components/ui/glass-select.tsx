"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import {
  glassPanelStyle,
  MASJIDLY_MODERN_SKIES,
  mutedTextForTheme,
  textColorForTheme,
} from "@/lib/masjidly-theme";

export type GlassSelectOption = { id: string; name: string };

export interface GlassSelectProps {
  options: GlassSelectOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  /** Shown when `value` is missing or not in `options` */
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  /** Popper alignment vs trigger. */
  contentAlign?: "start" | "center" | "end";
  searchPlaceholder?: string;
  /** Hide search when the list is shorter than this. Default 5. */
  searchMinOptions?: number;
}

function filterOptions(options: GlassSelectOption[], query: string): GlassSelectOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (opt) =>
      opt.name.toLowerCase().includes(q) ||
      opt.id.toLowerCase().includes(q),
  );
}

export function GlassSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  contentAlign = "start",
  searchPlaceholder = "Search…",
  searchMinOptions = 5,
}: GlassSelectProps) {
  const { theme } = useMasjidlyTheme();
  const lightFg = MASJIDLY_MODERN_SKIES[theme].lightForeground;
  const fg = textColorForTheme(theme);
  const fgMuted = mutedTextForTheme(theme);
  const surface = glassPanelStyle(lightFg);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [panelPos, setPanelPos] = React.useState({ top: 0, left: 0, width: 0 });

  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const resolved =
    value !== undefined && value !== "" && options.some((o) => o.id === value)
      ? value
      : undefined;
  const selected = options.find((o) => o.id === resolved);
  const filtered = React.useMemo(() => filterOptions(options, query), [options, query]);
  const showSearch = options.length >= searchMinOptions;

  const updatePosition = React.useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.max(rect.width, 12 * 16);
    let left = rect.left;
    if (contentAlign === "center") {
      left = rect.left + rect.width / 2 - width / 2;
    } else if (contentAlign === "end") {
      left = rect.right - width;
    }
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    const maxH = 20 * 16;
    const top =
      below + maxH > window.innerHeight - 8 && rect.top > maxH
        ? Math.max(8, rect.top - maxH - 6)
        : below;
    setPanelPos({ top, left, width });
  }, [contentAlign]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition, filtered.length]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const hoverBg = lightFg ? "rgba(255,255,255,0.14)" : "rgba(29,36,51,0.08)";
  const selectedBg = lightFg ? "rgba(71,166,255,0.35)" : "rgba(71,166,255,0.18)";

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            "fixed z-[300] overflow-hidden rounded-xl shadow-lg",
            contentClassName,
          )}
          style={{
            top: panelPos.top,
            left: panelPos.left,
            width: panelPos.width,
            maxHeight: "min(20rem, calc(100dvh - 1rem))",
            color: fg,
            ...surface,
          }}
        >
          {showSearch ? (
            <div
              className="flex items-center gap-2 border-b px-3"
              style={{ borderColor: lightFg ? "rgba(255,255,255,0.18)" : "rgba(29,36,51,0.12)" }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: fgMuted }} aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:opacity-70"
                style={{ color: fg }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          ) : null}

          <ul className="max-h-60 overflow-y-auto overscroll-contain p-1" role="presentation">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm" style={{ color: fgMuted }}>
                No matches.
              </li>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.id === resolved;
                return (
                  <li key={opt.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60"
                      style={{
                        color: fg,
                        background: isSelected ? selectedBg : "transparent",
                      }}
                      onMouseEnter={(event) => {
                        if (!isSelected) event.currentTarget.style.background = hoverBg;
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = isSelected ? selectedBg : "transparent";
                      }}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className="h-4 w-4 shrink-0"
                        style={{ color: fg, opacity: isSelected ? 1 : 0 }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 whitespace-normal break-words">{opt.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={cn("relative w-full min-w-0", className)} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium shadow-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          triggerClassName,
        )}
        style={{ ...surface, color: fg }}
      >
        <span className="min-w-0 flex-1 truncate text-left" style={{ color: fg }}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
          style={{ color: fg, opacity: 0.75 }}
          aria-hidden
        />
      </button>
      {panel}
    </div>
  );
}
