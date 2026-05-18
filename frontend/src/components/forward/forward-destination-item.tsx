"use client";

import * as React from "react";
import { Hash, Lock, MessageCircle, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar, UserAvatarGroup } from "@/components/user/user-avatar";
import type { ForwardDestination } from "@/lib/forward/forward-store";

// ============================================================================
// Types
// ============================================================================

export interface ForwardDestinationItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSelect"
> {
  /** The destination to display */
  destination: ForwardDestination;
  /** Whether this destination is selected */
  isSelected?: boolean;
  /** Called when the destination is clicked/selected */
  onSelectDestination?: (destination: ForwardDestination) => void;
  /** Show checkbox for multi-select */
  showCheckbox?: boolean;
  /** Show last activity timestamp */
  showActivity?: boolean;
  /** Compact mode for smaller display */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the appropriate icon for a destination type
 */
function getDestinationIcon(
  type: ForwardDestination["type"],
  isPrivate?: boolean,
) {
  switch (type) {
    case "direct":
      return MessageCircle;
    case "group":
      return Users;
    case "channel":
    default:
      return isPrivate ? Lock : Hash;
  }
}

/**
 * Format relative time for last activity
 */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Get display name for destination
 */
function getDestinationDisplayName(destination: ForwardDestination): string {
  if (destination.type === "direct" && destination.members?.length === 1) {
    return destination.members[0].displayName || destination.name;
  }
  return destination.name;
}

// ============================================================================
// Component
// ============================================================================

export const ForwardDestinationItem = React.forwardRef<
  HTMLDivElement,
  ForwardDestinationItemProps
>(
  (
    {
      className,
      destination,
      isSelected = false,
      onSelectDestination,
      showCheckbox = true,
      showActivity = true,
      compact = false,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const Icon = getDestinationIcon(destination.type, destination.isPrivate);
    const displayName = getDestinationDisplayName(destination);
    const relativeTime = formatRelativeTime(destination.lastActivityAt);

    const handleClick = () => {
      if (!disabled && onSelectDestination) {
        onSelectDestination(destination);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (
        (e.key === "Enter" || e.key === " ") &&
        !disabled &&
        onSelectDestination
      ) {
        e.preventDefault();
        onSelectDestination(destination);
      }
    };

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2",
          "cursor-pointer transition-colors",
          "hover:bg-accent focus:bg-accent focus:outline-none",
          isSelected && "bg-accent",
          disabled && "cursor-not-allowed opacity-50",
          compact && "gap-2 py-1.5",
          className,
        )}
        {...props}
      >
        {/* Checkbox or Icon */}
        {showCheckbox ? (
          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
              "transition-colors",
              isSelected
                ? "text-primary-foreground border-primary bg-primary"
                : "border-muted-foreground/30 bg-background",
            )}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </div>
        ) : null}

        {/* Destination Icon/Avatar */}
        {destination.type === "direct" && destination.members?.length === 1 ? (
          <UserAvatar
            user={{
              displayName: destination.members[0].displayName,
              avatarUrl: destination.members[0].avatarUrl,
            }}
            size={compact ? "xs" : "sm"}
            showPresence={false}
          />
        ) : destination.type === "group" && destination.members?.length ? (
          <UserAvatarGroup
            users={destination.members.slice(0, 3).map((m) => ({
              id: m.id,
              displayName: m.displayName,
              avatarUrl: m.avatarUrl,
            }))}
            max={3}
            size="xs"
          />
        ) : (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded",
              "bg-muted text-muted-foreground",
              compact ? "h-6 w-6" : "h-8 w-8",
            )}
          >
            <Icon className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
          </div>
        )}

        {/* Destination Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate font-medium",
                compact ? "text-sm" : "text-sm",
              )}
            >
              {displayName}
            </span>
            {destination.isPrivate && destination.type === "channel" && (
              <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
          </div>

          {/* Member count for group/channel */}
          {!compact && destination.type !== "direct" && destination.members && (
            <span className="text-xs text-muted-foreground">
              {destination.members.length === 1
                ? "1 member"
                : `${destination.members.length}+ members`}
            </span>
          )}
        </div>

        {/* Last Activity */}
        {showActivity && relativeTime && !compact && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {relativeTime}
          </span>
        )}
      </div>
    );
  },
);

ForwardDestinationItem.displayName = "ForwardDestinationItem";

// ============================================================================
// Skeleton
// ============================================================================

export interface ForwardDestinationItemSkeletonProps {
  compact?: boolean;
  showCheckbox?: boolean;
}

export function ForwardDestinationItemSkeleton({
  compact = false,
  showCheckbox = true,
}: ForwardDestinationItemSkeletonProps) {
  return (
    <div
      className={cn(
        "flex animate-pulse items-center gap-3 rounded-lg px-3 py-2",
        compact && "gap-2 py-1.5",
      )}
    >
      {showCheckbox && (
        <div className="h-5 w-5 shrink-0 rounded border bg-muted" />
      )}
      <div
        className={cn(
          "shrink-0 rounded bg-muted",
          compact ? "h-6 w-6" : "h-8 w-8",
        )}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-4 w-24 rounded bg-muted" />
        {!compact && <div className="h-3 w-16 rounded bg-muted" />}
      </div>
      {!compact && <div className="h-3 w-12 rounded bg-muted" />}
    </div>
  );
}

export default ForwardDestinationItem;
