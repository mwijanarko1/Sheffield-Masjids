"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  /** Popper alignment vs trigger (Radix `align`). Use `center` to center the panel on the button. */
  contentAlign?: "start" | "center" | "end";
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
}: GlassSelectProps) {
  const resolved =
    value !== undefined && value !== "" && options.some((o) => o.id === value)
      ? value
      : undefined;

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Select value={resolved} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn("w-full", triggerClassName)} aria-label={ariaLabel}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align={contentAlign}
          className={contentClassName}
        >
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id} className="whitespace-normal break-words">
              {opt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
