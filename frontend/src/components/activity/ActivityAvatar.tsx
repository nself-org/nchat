"use client";

/**
 * ActivityAvatar Component
 *
 * Displays user avatar(s) for an activity
 */

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type {
  ActivityAvatarProps,
  ActivityActor,
} from "@/lib/activity/activity-types";

// Size classes
const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

const overlapClasses = {
  sm: "-ml-2",
  md: "-ml-3",
  lg: "-ml-4",
};

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a color based on a string (for consistent avatar colors)
 */
function stringToColor(str: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Single avatar component
 */
function SingleAvatar({
  actor,
  size,
  className,
}: {
  actor: ActivityActor;
  size: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = getInitials(actor.displayName);
  const colorClass = stringToColor(actor.id);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {actor.avatarUrl ? (
        <AvatarImage src={actor.avatarUrl} alt={actor.displayName} />
      ) : null}
      <AvatarFallback className={cn(colorClass, "font-medium text-white")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Overflow indicator for additional actors
 */
function OverflowIndicator({
  count,
  size,
  className,
}: {
  count: number;
  size: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground",
        sizeClasses[size],
        className,
      )}
    >
      +{count > 99 ? "99" : count}
    </div>
  );
}

export function ActivityAvatar({
  actor,
  actors,
  size = "md",
  showOverflow = true,
  maxVisible = 3,
  className,
}: ActivityAvatarProps) {
  // Single actor mode
  if (!actors) {
    return <SingleAvatar actor={actor} size={size} className={className} />;
  }

  // Multiple actors mode
  const visibleActors = actors.actors.slice(0, maxVisible);
  const overflowCount = actors.totalCount - maxVisible;

  return (
    <div className={cn("flex items-center", className)}>
      {visibleActors.map((actorItem, index) => (
        <SingleAvatar
          key={actorItem.id}
          actor={actorItem}
          size={size}
          className={cn(
            index > 0 && overlapClasses[size],
            "border-2 border-background",
          )}
        />
      ))}
      {showOverflow && overflowCount > 0 && (
        <OverflowIndicator
          count={overflowCount}
          size={size}
          className={overlapClasses[size]}
        />
      )}
    </div>
  );
}

export default ActivityAvatar;
