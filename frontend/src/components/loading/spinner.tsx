"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const spinnerVariants = cva(
  "animate-spin rounded-full border-2 border-current border-t-transparent",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
      color: {
        default: "text-primary",
        muted: "text-muted-foreground",
        white: "text-white",
        current: "text-current",
      },
    },
    defaultVariants: {
      size: "md",
      color: "default",
    },
  },
);

export interface SpinnerProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof spinnerVariants> {
  /** Optional text to display next to the spinner */
  text?: string;
  /** Position of text relative to spinner */
  textPosition?: "right" | "bottom";
}

/**
 * Reusable loading spinner component
 * Supports multiple sizes and colors with optional text
 */
export function Spinner({
  size,
  color,
  text,
  textPosition = "right",
  className,
  ...props
}: SpinnerProps) {
  const spinner = (
    <div
      className={cn(spinnerVariants({ size, color }), className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );

  if (!text) {
    return spinner;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        textPosition === "bottom" && "flex-col",
      )}
    >
      {spinner}
      <span
        className={cn(
          "text-sm text-muted-foreground",
          size === "sm" && "text-xs",
          size === "xl" && "text-base",
        )}
      >
        {text}
      </span>
    </div>
  );
}

/**
 * Centered spinner for use in containers
 */
export function CenteredSpinner({
  size = "lg",
  color,
  text,
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <Spinner
        size={size}
        color={color}
        text={text}
        textPosition="bottom"
        {...props}
      />
    </div>
  );
}

/**
 * Inline spinner for buttons and small spaces
 */
export function InlineSpinner({
  size = "sm",
  color = "current",
  className,
  ...props
}: Omit<SpinnerProps, "text" | "textPosition">) {
  return <Spinner size={size} color={color} className={className} {...props} />;
}
