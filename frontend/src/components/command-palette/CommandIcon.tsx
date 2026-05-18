"use client";

/**
 * CommandIcon
 *
 * Renders an icon for a command, supporting both Lucide icons and custom icons.
 */

import * as React from "react";
import { type LucideIcon, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CommandIconProps {
  /** Icon component or name */
  icon?: LucideIcon | string;
  /** Icon size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Color override */
  color?: string;
}

// ============================================================================
// Size Mappings
// ============================================================================

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const containerClasses = {
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-8 w-8",
};

// ============================================================================
// Component
// ============================================================================

export function CommandIcon({
  icon,
  size = "md",
  className,
  color,
}: CommandIconProps) {
  const IconComponent = typeof icon === "function" ? icon : null;
  const iconString = typeof icon === "string" ? icon : null;

  // If no icon provided, use default hash icon
  if (!IconComponent && !iconString) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted",
          containerClasses[size],
          className,
        )}
      >
        <Hash
          className={cn(sizeClasses[size], "text-muted-foreground")}
          style={color ? { color } : undefined}
        />
      </div>
    );
  }

  // Render Lucide icon
  if (IconComponent) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted",
          containerClasses[size],
          className,
        )}
      >
        <IconComponent
          className={cn(sizeClasses[size], "text-muted-foreground")}
          style={color ? { color } : undefined}
        />
      </div>
    );
  }

  // Render emoji or string icon
  if (iconString) {
    // Check if it's an emoji (single character or emoji sequence)
    const isEmoji = /\p{Emoji}/u.test(iconString);

    if (isEmoji) {
      return (
        <div
          className={cn(
            "flex items-center justify-center rounded-md bg-muted",
            containerClasses[size],
            className,
          )}
        >
          <span
            className={cn(
              size === "sm"
                ? "text-sm"
                : size === "lg"
                  ? "text-lg"
                  : "text-base",
            )}
          >
            {iconString}
          </span>
        </div>
      );
    }

    // Otherwise render as text abbreviation
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted font-medium text-muted-foreground",
          containerClasses[size],
          size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs",
          className,
        )}
        style={color ? { color } : undefined}
      >
        {iconString.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return null;
}

export default CommandIcon;
