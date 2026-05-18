"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const unreadBadgeVariants = cva("rounded-full bg-primary", {
  variants: {
    size: {
      sm: "w-2 h-2",
      md: "w-2.5 h-2.5",
      lg: "w-3 h-3",
    },
    variant: {
      dot: "",
      count:
        "inline-flex items-center justify-center font-medium text-primary-foreground min-w-[18px] h-[18px] px-1 text-[10px]",
    },
  },
  compoundVariants: [
    {
      variant: "count",
      size: "sm",
      className: "min-w-[16px] h-4 text-[9px]",
    },
    {
      variant: "count",
      size: "lg",
      className: "min-w-[22px] h-[22px] text-xs",
    },
  ],
  defaultVariants: {
    size: "md",
    variant: "dot",
  },
});

export interface UnreadBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof unreadBadgeVariants>, "variant"> {
  /**
   * The unread count to display. If provided and > 0, shows count.
   * If not provided or 0, shows a dot.
   */
  count?: number;

  /**
   * Whether to show as a simple dot instead of count
   * @default auto-detected based on count
   */
  showDot?: boolean;

  /**
   * Maximum count to display before showing "max+"
   * @default 99
   */
  max?: number;

  /**
   * Whether to show the badge when count is 0
   * @default false
   */
  showZero?: boolean;
}

/**
 * UnreadBadge - Simple unread indicator
 *
 * Can display as either:
 * - A simple colored dot (for channel indicators)
 * - A numbered badge (for specific counts)
 */
export function UnreadBadge({
  count,
  showDot,
  size,
  max = 99,
  showZero = false,
  className,
  ...props
}: UnreadBadgeProps) {
  // Determine whether to show dot or count
  const isDot =
    showDot === true ||
    (showDot === undefined && (count === undefined || count === 0));
  const hasUnread = count !== undefined && count > 0;

  // Don't render if no unread and not showing zero
  if (!isDot && !hasUnread && !showZero) {
    return null;
  }

  // If showing dot, just render the dot
  if (isDot && hasUnread) {
    return (
      <span
        className={cn(unreadBadgeVariants({ size, variant: "dot" }), className)}
        aria-label="Unread messages"
        {...props}
      />
    );
  }

  // If count is provided and we're not forcing dot
  if (!isDot && (hasUnread || showZero)) {
    const displayCount = count! > max ? `${max}+` : count!.toString();

    return (
      <span
        className={cn(
          unreadBadgeVariants({ size, variant: "count" }),
          className,
        )}
        aria-label={`${count} unread ${count === 1 ? "message" : "messages"}`}
        {...props}
      >
        {displayCount}
      </span>
    );
  }

  // Show dot by default if there's any indication of unread
  if (isDot) {
    return (
      <span
        className={cn(unreadBadgeVariants({ size, variant: "dot" }), className)}
        aria-hidden="true"
        {...props}
      />
    );
  }

  return null;
}

UnreadBadge.displayName = "UnreadBadge";

export default UnreadBadge;
