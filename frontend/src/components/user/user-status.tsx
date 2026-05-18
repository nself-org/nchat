"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { type CustomStatus } from "@/stores/user-store";
import { Clock, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// Variants
// ============================================================================

const userStatusVariants = cva(
  "flex items-center gap-1.5 text-muted-foreground",
  {
    variants: {
      variant: {
        compact: "text-xs",
        full: "text-sm",
      },
    },
    defaultVariants: {
      variant: "compact",
    },
  },
);

// ============================================================================
// Types
// ============================================================================

export interface UserStatusProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof userStatusVariants> {
  status: CustomStatus | undefined;
  showClearTime?: boolean;
  onClear?: () => void;
  editable?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const UserStatus = React.forwardRef<HTMLDivElement, UserStatusProps>(
  (
    {
      className,
      status,
      variant,
      showClearTime = true,
      onClear,
      editable = false,
      ...props
    },
    ref,
  ) => {
    if (!status || (!status.emoji && !status.text)) {
      return null;
    }

    const hasExpiry =
      status.expiresAt && new Date(status.expiresAt) > new Date();

    return (
      <div
        ref={ref}
        className={cn(userStatusVariants({ variant }), className)}
        {...props}
      >
        {/* Status emoji */}
        {status.emoji && (
          <span
            className="flex-shrink-0 text-base"
            role="img"
            aria-label="status emoji"
          >
            {status.emoji}
          </span>
        )}

        {/* Status text */}
        {status.text && <span className="truncate">{status.text}</span>}

        {/* Expiry time */}
        {showClearTime && hasExpiry && (
          <span className="flex items-center gap-0.5 text-xs opacity-60">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(status.expiresAt!), {
              addSuffix: false,
            })}
          </span>
        )}

        {/* Clear button */}
        {editable && onClear && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="ml-1 rounded p-0.5 transition-colors hover:bg-muted"
            aria-label="Clear status"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  },
);
UserStatus.displayName = "UserStatus";

// ============================================================================
// UserStatusBadge - A badge-style variant for inline display
// ============================================================================

export interface UserStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: CustomStatus | undefined;
  maxLength?: number;
}

const UserStatusBadge = React.forwardRef<HTMLSpanElement, UserStatusBadgeProps>(
  ({ className, status, maxLength = 20, ...props }, ref) => {
    if (!status || (!status.emoji && !status.text)) {
      return null;
    }

    const displayText = status.text
      ? status.text.length > maxLength
        ? `${status.text.slice(0, maxLength)}...`
        : status.text
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
        {status.emoji && <span>{status.emoji}</span>}
        {displayText && <span className="truncate">{displayText}</span>}
      </span>
    );
  },
);
UserStatusBadge.displayName = "UserStatusBadge";

export { UserStatus, UserStatusBadge, userStatusVariants };
