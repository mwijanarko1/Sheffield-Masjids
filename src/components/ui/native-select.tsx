import * as React from "react";

import { cn } from "@/lib/utils";

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-[var(--theme-border-subtle,rgba(255,255,255,0.22))] bg-white/18 px-3 py-2 text-sm text-[var(--theme-fg,#fff)] backdrop-blur-md shadow-sm ring-offset-transparent placeholder:text-[var(--theme-fg-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#47A6FF]/60 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-[var(--theme-edge,#0A1128)] [&>option]:text-[var(--theme-fg,#fff)]",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  );
});
NativeSelect.displayName = "NativeSelect";

const NativeSelectOption = React.forwardRef<
  HTMLOptionElement,
  React.ComponentProps<"option">
>(({ ...props }, ref) => {
  return <option ref={ref} {...props} />;
});
NativeSelectOption.displayName = "NativeSelectOption";

const NativeSelectOptGroup = React.forwardRef<
  HTMLOptGroupElement,
  React.ComponentProps<"optgroup">
>(({ ...props }, ref) => {
  return <optgroup ref={ref} {...props} />;
});
NativeSelectOptGroup.displayName = "NativeSelectOptGroup";

export { NativeSelect, NativeSelectOption, NativeSelectOptGroup };
