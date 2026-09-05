import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ios-pressable inline-flex items-center justify-center gap-2 whitespace-nowrap text-[17px] font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-[var(--accent-fg)] active:opacity-80",
        secondary:
          "bg-[var(--surface-3)] text-[var(--accent)] active:opacity-80",
        outline:
          "border border-[var(--separator)] bg-[var(--surface)] text-[var(--accent)]",
        ghost: "text-[var(--accent)] active:opacity-50",
        danger: "bg-[var(--danger)] text-white active:opacity-80",
      },
      size: {
        default: "h-12 rounded-[var(--radius)] px-5",
        sm: "h-9 rounded-[var(--radius-sm)] px-3 text-[15px]",
        lg: "h-14 rounded-[var(--radius-lg)] px-6 text-[17px]",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  ),
);
Button.displayName = "Button";
