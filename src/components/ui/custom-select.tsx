"use client";

import { GlassSelect, type GlassSelectOption } from "@/components/ui/glass-select";

interface CustomSelectProps {
  options: GlassSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  /** When false, selected label shows full text without truncation (kept for API parity). */
  truncateLabel?: boolean;
  /** When true, dropdown centers on the trigger. */
  listFitsContent?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  className,
  ariaLabel = "Select",
  listFitsContent = false,
}: CustomSelectProps) {
  return (
    <GlassSelect
      options={options}
      value={value}
      onChange={onChange}
      className={className}
      ariaLabel={ariaLabel}
      contentAlign={listFitsContent ? "center" : "start"}
      searchPlaceholder="Search…"
    />
  );
}
