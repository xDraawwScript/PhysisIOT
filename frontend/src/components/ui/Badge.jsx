import React from "react";
import { Slot } from "@radix-ui/react-slot";

const VARIANT_STYLES = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90",
  destructive:
    "border-transparent bg-destructive text-white hover:bg-destructive/90",
  outline:
    "text-foreground hover:bg-accent hover:text-accent-foreground",
};
export default function Badge({
  className = "",
  variant = "default",
  asChild = false,
  ...props
}) {
  const Component = asChild ? Slot : "span";
  const variantClasses =
    VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  return (
    <Component
      data-slot="badge"
      className={`
        inline-flex items-center justify-center rounded-md border
        px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0
        overflow-hidden gap-1
        ${variantClasses}
        ${className}
      `}
      {...props}
    />
  );
}
