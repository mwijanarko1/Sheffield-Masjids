import * as React from "react";

import { cn } from "@/lib/utils";

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-background [&>option]:text-foreground",
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
