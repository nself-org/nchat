"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus as PresenceStatusType,
  type CustomStatus,
  getPresenceLabel,
  getPresenceColor,
  formatDurationRemaining,
  isStatusExpired,
} from "@/lib/presence/presence-types";
import { PresenceIndicator } from "./PresenceIndicator";
import { Clock, X } from "lucide-react";

// ============================================================================
// Variants
// ============================================================================

const presenceStatusVariants = cva("flex items-center gap-2", {
  variants: {
    variant: {
      /**
       * Compact: Just the indicator dot and status text
       */
      compact: "text-xs",
      /**
       * Full: Indicator, status text, and custom status
       */
      full: "text-sm",
      /**
       * Inline: For use in user lists
       */
      inline: "text-xs text-muted-foreground",
    },
    align: {
      left: "justify-start",
      center: "justify-center",
      right: "justify-end",
    },
  },
  defaultVariants: {
    variant: "compact",
    align: "left",
  },
});

// ============================================================================
// Types
// ============================================================================

export interface PresenceStatusProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof presenceStatusVariants> {
  /**
   * The presence status
   */
  status: PresenceStatusType;

  /**
   * Custom status (emoji + text)
   */
  customStatus?: CustomStatus;

  /**
   * Whether to show the presence indicator dot
   * @default true
   */
  showIndicator?: boolean;

  /**
   * Whether to show the status label (Online, Away, etc.)
   * @default true
   */
  showLabel?: boolean;

  /**
   * Whether to show the expiration time for custom status
   * @default true
   */
  showExpiration?: boolean;

  /**
   * Whether this is the current user's status (enables clear button)
   * @default false
   */
  isOwn?: boolean;

  /**
   * Callback when clear button is clicked
   */
  onClear?: () => void;
}

// ============================================================================
// Component
// ============================================================================

const PresenceStatus = React.forwardRef<HTMLDivElement, PresenceStatusProps>(
  (
    {
      className,
      status,
      customStatus,
      variant,
      align,
      showIndicator = true,
      showLabel = true,
      showExpiration = true,
      isOwn = false,
      onClear,
      ...props
    },
    ref,
  ) => {
    const label = getPresenceLabel(status);
    const hasCustomStatus =
      customStatus &&
      (customStatus.emoji || customStatus.text) &&
      !isStatusExpired(customStatus);
    const hasExpiration = hasCustomStatus && customStatus?.expiresAt;

    return (
      <div
        ref={ref}
        className={cn(presenceStatusVariants({ variant, align }), className)}
        {...props}
      >
        {/* Presence indicator dot */}
        {showIndicator && (
          <PresenceIndicator
            status={status}
            size={variant === "full" ? "md" : "sm"}
            position="inline"
            animate={variant === "full"}
          />
        )}

        {/* Status content */}
        <div className="flex min-w-0 flex-col">
          {/* Main status line */}
          <div className="flex items-center gap-1.5">
            {/* Status label */}
            {showLabel && !hasCustomStatus && (
              <span className="text-muted-foreground">{label}</span>
            )}

            {/* Custom status */}
            {hasCustomStatus && (
              <div className="flex min-w-0 items-center gap-1">
                {customStatus?.emoji && (
                  <span
                    className="flex-shrink-0"
                    role="img"
                    aria-label="status emoji"
                  >
                    {customStatus.emoji}
                  </span>
                )}
                {customStatus?.text && (
                  <span className="truncate">{customStatus.text}</span>
                )}
              </div>
            )}

            {/* Expiration time */}
            {showExpiration && hasExpiration && (
              <span className="flex flex-shrink-0 items-center gap-0.5 text-xs text-muted-foreground opacity-60">
                <Clock className="h-3 w-3" />
                {formatDurationRemaining(customStatus!.expiresAt)}
              </span>
            )}

            {/* Clear button */}
            {isOwn && hasCustomStatus && onClear && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="hover:bg-muted/80 flex-shrink-0 rounded p-0.5 transition-colors"
                aria-label="Clear status"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Secondary line: Show status label when custom status is present */}
          {variant === "full" && hasCustomStatus && showLabel && (
            <span className="text-xs text-muted-foreground">{label}</span>
          )}
        </div>
      </div>
    );
  },
);

PresenceStatus.displayName = "PresenceStatus";

// ============================================================================
// Compact Status Badge
// ============================================================================

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: PresenceStatusType;
  customStatus?: CustomStatus;
  maxLength?: number;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, customStatus, maxLength = 20, ...props }, ref) => {
    const hasCustomStatus =
      customStatus &&
      (customStatus.emoji || customStatus.text) &&
      !isStatusExpired(customStatus);

    if (!hasCustomStatus) {
      return null;
    }

    const displayText = customStatus?.text
      ? customStatus.text.length > maxLength
        ? `${customStatus.text.slice(0, maxLength)}...`
        : customStatus.text
      : null;

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground",
          className,
        )}
        {...props}
      >
        {customStatus?.emoji && <span>{customStatus.emoji}</span>}
        {displayText && <span className="truncate">{displayText}</span>}
      </span>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

export { PresenceStatus, presenceStatusVariants, StatusBadge };
