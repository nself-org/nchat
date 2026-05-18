"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type ActivityType,
  type CustomStatus,
  PRESET_ACTIVITIES,
  getPresetActivity,
  formatDurationRemaining,
} from "@/lib/presence/presence-types";
import { Clock } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ActivityStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The activity type
   */
  activity?: ActivityType;

  /**
   * Custom status (if activity is custom)
   */
  customStatus?: CustomStatus;

  /**
   * Whether to show the icon/emoji
   * @default true
   */
  showIcon?: boolean;

  /**
   * Whether to show the expiration time
   * @default true
   */
  showExpiration?: boolean;

  /**
   * Size variant
   * @default 'default'
   */
  size?: "sm" | "default" | "lg";
}

// ============================================================================
// Component
// ============================================================================

export function ActivityStatus({
  activity,
  customStatus,
  showIcon = true,
  showExpiration = true,
  size = "default",
  className,
  ...props
}: ActivityStatusProps) {
  // Get preset activity details
  const preset = activity ? getPresetActivity(activity) : null;

  // Determine what to display
  const emoji = customStatus?.emoji ?? preset?.emoji;
  const text = customStatus?.text ?? preset?.text;
  const expiresAt = customStatus?.expiresAt;

  // Don't render if nothing to show
  if (!emoji && !text) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs gap-1",
    default: "text-sm gap-1.5",
    lg: "text-base gap-2",
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
      {showIcon && emoji && (
        <span className="flex-shrink-0" role="img" aria-label="activity">
          {emoji}
        </span>
      )}

      {text && <span className="truncate">{text}</span>}

      {showExpiration && expiresAt && (
        <span className="flex flex-shrink-0 items-center gap-0.5 text-xs opacity-60">
          <Clock className="h-3 w-3" />
          {formatDurationRemaining(expiresAt)}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Activity List Item
// ============================================================================

export interface ActivityListItemProps {
  activity: (typeof PRESET_ACTIVITIES)[0];
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ActivityListItem({
  activity,
  isSelected,
  onClick,
  className,
}: ActivityListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
        "hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted",
        className,
      )}
    >
      <span className="flex-shrink-0 text-lg">{activity.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{activity.text}</div>
        {activity.defaultDuration &&
          activity.defaultDuration !== "indefinite" && (
            <div className="text-xs text-muted-foreground">
              Default: {activity.defaultDuration}
            </div>
          )}
      </div>
    </button>
  );
}

// ============================================================================
// Activity Grid
// ============================================================================

export interface ActivityGridProps {
  selectedActivity?: ActivityType;
  onSelect: (activity: ActivityType) => void;
  className?: string;
}

export function ActivityGrid({
  selectedActivity,
  onSelect,
  className,
}: ActivityGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-1", className)}>
      {PRESET_ACTIVITIES.filter((a) => a.type !== "custom").map((activity) => (
        <button
          key={activity.type}
          onClick={() => onSelect(activity.type)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-2 text-left",
            "hover:bg-muted/50 transition-colors",
            selectedActivity === activity.type && "bg-muted ring-1 ring-ring",
          )}
        >
          <span className="text-lg">{activity.emoji}</span>
          <span className="truncate text-sm">{activity.text}</span>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Activity Badge
// ============================================================================

export interface ActivityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  activity?: ActivityType;
  customStatus?: CustomStatus;
  maxLength?: number;
}

export function ActivityBadge({
  activity,
  customStatus,
  maxLength = 20,
  className,
  ...props
}: ActivityBadgeProps) {
  const preset = activity ? getPresetActivity(activity) : null;
  const emoji = customStatus?.emoji ?? preset?.emoji;
  const text = customStatus?.text ?? preset?.text;

  if (!emoji && !text) {
    return null;
  }

  const displayText = text
    ? text.length > maxLength
      ? `${text.slice(0, maxLength)}...`
      : text
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
      {emoji && <span>{emoji}</span>}
      {displayText && <span className="truncate">{displayText}</span>}
    </span>
  );
}

// ============================================================================
// All Activities List
// ============================================================================

export interface AllActivitiesProps {
  selectedActivity?: ActivityType;
  onSelect: (activity: ActivityType) => void;
  className?: string;
}

export function AllActivities({
  selectedActivity,
  onSelect,
  className,
}: AllActivitiesProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {PRESET_ACTIVITIES.map((activity) => (
        <ActivityListItem
          key={activity.type}
          activity={activity}
          isSelected={selectedActivity === activity.type}
          onClick={() => onSelect(activity.type)}
        />
      ))}
    </div>
  );
}

export default ActivityStatus;
