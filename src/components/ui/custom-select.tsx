"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  /** When false, selected label shows full text without truncation */
  truncateLabel?: boolean;
  /** When true, dropdown widens to fit option names and list items show full text */
  listFitsContent?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  className,
  ariaLabel,
  truncateLabel = true,
  listFitsContent = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useLayoutEffect(() => {
    if (isOpen && listFitsContent && buttonRef.current && typeof document !== "undefined") {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
  }, [isOpen, listFitsContent]);

  const listContent = (
    <ul className="max-h-60 overflow-auto py-1" role="listbox" tabIndex={-1}>
      {options.map((option) => (
        <li
          key={option.id}
          onClick={() => {
            onChange(option.id);
            setIsOpen(false);
          }}
          className={cn(
            "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-white/10 hover:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
            option.id === value && "bg-white/10 text-white"
          )}
          role="option"
          aria-selected={option.id === value}
        >
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            {option.id === value && (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <span className={(truncateLabel && !listFitsContent) ? "truncate" : "whitespace-nowrap"}>{option.name}</span>
        </li>
      ))}
    </ul>
  );

  const dropdownPanelClass = cn(
    "z-50 overflow-hidden rounded-md border border-white/20 bg-[#0A1128]/95 backdrop-blur-md text-white shadow-md animate-in fade-in-0 zoom-in-95",
    (truncateLabel && !listFitsContent) ? "w-full" : "min-w-full w-max max-w-[min(100vw,28rem)]"
  );

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-white/20 bg-[#0A1128]/40 px-3 py-2 text-sm text-white shadow-sm ring-offset-transparent placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className={cn("flex-1 min-w-0 text-center", truncateLabel ? "truncate" : "break-words")}>{selectedOption?.name || "Select…"}</span>
        <svg
          className={cn("h-4 w-4 shrink-0 opacity-50 transition-transform duration-200", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        (listFitsContent && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={dropdownRef}
                className={cn(dropdownPanelClass, "fixed")}
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  transform: "translateX(-50%)",
                }}
              >
                {listContent}
              </div>,
              document.body
            )
          : (
            <div
              className={cn(
                dropdownPanelClass,
                "absolute top-full mt-1",
                (truncateLabel && !listFitsContent) ? "w-full" : "left-1/2 -translate-x-1/2"
              )}
            >
              {listContent}
            </div>
          ))}
    </div>
  );
}
