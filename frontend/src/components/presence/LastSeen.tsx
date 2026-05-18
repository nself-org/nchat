"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type PresenceStatus,
  formatLastSeen,
  isVisibleOnline,
  getPresenceLabel,
} from "@/lib/presence/presence-types";
import { PresenceIndicator } from "./PresenceIndicator";

// ============================================================================
// Types
// ============================================================================

export interface LastSeenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * When the user was last seen
   */
  lastSeenAt?: Date | string;

  /**
   * User's current status
   */
  status?: PresenceStatus;

  /**
   * Whether to show "Online" for online users instead of last seen
   * @default true
   */
  showOnlineStatus?: boolean;

  /**
   * Prefix text
   * @default 'Last seen'
   */
  prefix?: string;

  /**
   * Whether to show the presence indicator
   * @default false
   */
  showIndicator?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LastSeen({
  lastSeenAt,
  status = "offline",
  showOnlineStatus = true,
  prefix = "Last seen",
  showIndicator = false,
  className,
  ...props
}: LastSeenProps) {
  // If user is online and we want to show that
  if (showOnlineStatus && isVisibleOnline(status)) {
    const statusLabel = getPresenceLabel(status);

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className,
        )}
        {...props}
      >
        {showIndicator && (
          <PresenceIndicator status={status} size="xs" position="inline" />
        )}
        <span>{statusLabel}</span>
      </span>
    );
  }

  // Show last seen time
  const formattedTime = formatLastSeen(lastSeenAt);

  return (
    <span className={cn("text-xs text-muted-foreground", className)} {...props}>
      {showIndicator && (
        <PresenceIndicator
          status="offline"
          size="xs"
          position="inline"
          className="mr-1.5"
        />
      )}
      {prefix} {formattedTime}
    </span>
  );
}

// ============================================================================
// Last Seen Badge
// ============================================================================

export interface LastSeenBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  lastSeenAt?: Date | string;
  status?: PresenceStatus;
}

export function LastSeenBadge({
  lastSeenAt,
  status = "offline",
  className,
  ...props
}: LastSeenBadgeProps) {
  // Online status
  if (isVisibleOnline(status)) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
          "bg-green-500/10 text-xs text-green-600",
          className,
        )}
        {...props}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Online
      </span>
    );
  }

  // Offline with last seen
  if (lastSeenAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
          "bg-muted text-xs text-muted-foreground",
          className,
        )}
        {...props}
      >
        {formatLastSeen(lastSeenAt)}
      </span>
    );
  }

  // Offline, no last seen
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
        "bg-muted text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      Offline
    </span>
  );
}

// ============================================================================
// Last Active
// ============================================================================

export interface LastActiveProps {
  lastSeenAt?: Date | string;
  status?: PresenceStatus;
  className?: string;
}

export function LastActive({ lastSeenAt, status, className }: LastActiveProps) {
  if (status && isVisibleOnline(status)) {
    return (
      <span className={cn("text-xs text-green-600", className)}>
        Active now
      </span>
    );
  }

  if (!lastSeenAt) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Not available
      </span>
    );
  }

  const date =
    typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  // Active within last 5 minutes
  if (diffMins < 5) {
    return (
      <span className={cn("text-xs text-green-600", className)}>
        Active just now
      </span>
    );
  }

  // Active within last hour
  if (diffMins < 60) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Active {diffMins}m ago
      </span>
    );
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      Active {formatLastSeen(lastSeenAt)}
    </span>
  );
}

// ============================================================================
// Relative Time Display
// ============================================================================

export interface RelativeTimeProps {
  date: Date | string;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const formatted = formatLastSeen(date);

  return (
    <time
      dateTime={typeof date === "string" ? date : date.toISOString()}
      className={cn("text-xs text-muted-foreground", className)}
    >
      {formatted}
    </time>
  );
}

export default LastSeen;
