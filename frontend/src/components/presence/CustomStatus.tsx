"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type CustomStatus as CustomStatusType,
  formatDurationRemaining,
  isStatusExpired,
} from "@/lib/presence/presence-types";
import { Clock, X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface CustomStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The custom status to display
   */
  status: CustomStatusType | undefined;

  /**
   * Whether to show the expiration time
   * @default true
   */
  showExpiration?: boolean;

  /**
   * Whether to show a clear button
   * @default false
   */
  showClear?: boolean;

  /**
   * Callback when clear is clicked
   */
  onClear?: () => void;

  /**
   * Size variant
   * @default 'default'
   */
  size?: "sm" | "default" | "lg";

  /**
   * Maximum text length before truncation
   * @default 50
   */
  maxLength?: number;
}

// ============================================================================
// Component
// ============================================================================

export function CustomStatus({
  status,
  showExpiration = true,
  showClear = false,
  onClear,
  size = "default",
  maxLength = 50,
  className,
  ...props
}: CustomStatusProps) {
  // Don't render if no status or expired
  if (!status || (!status.emoji && !status.text)) {
    return null;
  }

  if (isStatusExpired(status)) {
    return null;
  }

  const hasExpiration = status.expiresAt;
  const displayText = status.text
    ? status.text.length > maxLength
      ? `${status.text.slice(0, maxLength)}...`
      : status.text
    : null;

  const sizeClasses = {
    sm: "text-xs gap-1",
    default: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const emojiSizeClasses = {
    sm: "text-sm",
    default: "text-base",
    lg: "text-lg",
  };

  return (
    <div
      className={cn(
        "flex items-center text-muted-foreground",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {/* Emoji */}
      {status.emoji && (
        <span
          className={cn("flex-shrink-0", emojiSizeClasses[size])}
          role="img"
          aria-label="status emoji"
        >
          {status.emoji}
        </span>
      )}

      {/* Text */}
      {displayText && <span className="truncate">{displayText}</span>}

      {/* Expiration */}
      {showExpiration && hasExpiration && (
        <span className="flex flex-shrink-0 items-center gap-0.5 text-xs opacity-60">
          <Clock className="h-3 w-3" />
          {formatDurationRemaining(status.expiresAt)}
        </span>
      )}

      {/* Clear button */}
      {showClear && onClear && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="hover:bg-muted/80 flex-shrink-0 rounded p-0.5 transition-colors"
          aria-label="Clear status"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Custom Status Badge
// ============================================================================

export interface CustomStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: CustomStatusType | undefined;
  maxLength?: number;
}

export function CustomStatusBadge({
  status,
  maxLength = 20,
  className,
  ...props
}: CustomStatusBadgeProps) {
  if (!status || (!status.emoji && !status.text)) {
    return null;
  }

  if (isStatusExpired(status)) {
    return null;
  }

  const displayText = status.text
    ? status.text.length > maxLength
      ? `${status.text.slice(0, maxLength)}...`
      : status.text
    : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
        "bg-muted text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      {status.emoji && <span>{status.emoji}</span>}
      {displayText && <span className="truncate">{displayText}</span>}
    </span>
  );
}

// ============================================================================
// Custom Status Preview
// ============================================================================

export interface CustomStatusPreviewProps {
  emoji?: string;
  text?: string;
  expiresAt?: Date | null;
  className?: string;
}

export function CustomStatusPreview({
  emoji,
  text,
  expiresAt,
  className,
}: CustomStatusPreviewProps) {
  if (!emoji && !text) {
    return (
      <div className={cn("text-sm italic text-muted-foreground", className)}>
        No status set
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-muted/50 flex items-center gap-2 rounded-md px-3 py-2",
        className,
      )}
    >
      {emoji && (
        <span className="text-lg" role="img" aria-label="status emoji">
          {emoji}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-sm">{text || "No message"}</span>
        {expiresAt && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Clears in {formatDurationRemaining(expiresAt)}</span>
          </div>
        )}
        {!expiresAt && text && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            Does not expire
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomStatus;
