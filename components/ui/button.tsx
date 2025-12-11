"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "ghost" | "outline";
type Size = "md" | "sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const baseStyles =
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:outline-neutral-900",
  ghost: "bg-transparent text-neutral-900 hover:bg-neutral-100",
  outline:
    "border border-neutral-300 text-neutral-900 hover:bg-neutral-100 focus-visible:outline-neutral-900",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";
