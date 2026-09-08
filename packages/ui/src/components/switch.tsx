"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "../lib/utils";

const Switch = ({ className, ...props }: SwitchPrimitive.Root.Props) => (
  <SwitchPrimitive.Root
    className={cn(
      "inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary",
      className,
    )}
    data-slot="switch"
    {...props}
  >
    <SwitchPrimitive.Thumb className="size-5 rounded-full bg-background transition-transform data-checked:translate-x-5" />
  </SwitchPrimitive.Root>
);

export { Switch };
