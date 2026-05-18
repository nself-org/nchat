"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const mentionBadgeVariants = cva(
  "inline-flex items-center justify-center font-semibold rounded-full text-white bg-destructive",
  {
    variants: {
      size: {
        sm: "min-w-[16px] h-4 px-1 text-[10px]",
        md: "min-w-[20px] h-5 px-1.5 text-xs",
        lg: "min-w-[24px] h-6 px-2 text-sm",
      },
      animate: {
        true: "animate-pulse",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      animate: false,
    },
  },
);

export interface MentionBadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof mentionBadgeVariants> {
  /**
   * The mention count to display
   */
  count: number;

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
 * MentionBadge - Displays a red badge with mention count
 *
 * Used to indicate the number of unread mentions in a channel or conversation.
 * Commonly displayed next to channel names in the sidebar.
 */
export function MentionBadge({
  count,
  max = 99,
  size,
  animate,
  showZero = false,
  className,
  ...props
}: MentionBadgeProps) {
  // Don't render if count is 0 and showZero is false
  if (count <= 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={cn(mentionBadgeVariants({ size, animate }), className)}
      aria-label={`${count} unread ${count === 1 ? "mention" : "mentions"}`}
      {...props}
    >
      {displayCount}
    </span>
  );
}

MentionBadge.displayName = "MentionBadge";

export default MentionBadge;
