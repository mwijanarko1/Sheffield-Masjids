import * as React from "react";

import { cn } from "@/lib/utils";

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-white/20 bg-[#0A1128]/40 px-3 py-2 text-sm text-white backdrop-blur-sm shadow-sm ring-offset-transparent placeholder:text-white/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFB380] disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-[#0A1128] [&>option]:text-white",
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
