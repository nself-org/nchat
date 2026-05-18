"use client";

/**
 * DMCommand
 *
 * Specialized command item for direct messages with user avatar and presence.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DMCommandData } from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface DMCommandProps {
  /** DM command data */
  command: DMCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: DMCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Presence Colors
// ============================================================================

const presenceColors: Record<string, string> = {
  online: "bg-green-500",
  away: "bg-amber-500",
  dnd: "bg-red-500",
  offline: "bg-gray-400",
};

// ============================================================================
// Component
// ============================================================================

export function DMCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: DMCommandProps) {
  return (
    <CommandPrimitive.Item
      value={command.id}
      onSelect={() => onSelect?.(command)}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-sm outline-none",
        "aria-selected:text-accent-foreground aria-selected:bg-accent",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "hover:text-accent-foreground hover:bg-accent",
        isSelected && "text-accent-foreground bg-accent",
        className,
      )}
      data-selected={isSelected}
    >
      {/* Avatar with presence */}
      <div className="relative">
        {command.avatarUrl ? (
          <img
            src={command.avatarUrl}
            alt={command.userDisplayName}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Presence indicator */}
        {command.presence && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
              presenceColors[command.presence] || presenceColors.offline,
            )}
          />
        )}
      </div>

      {/* User info */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            {command.userDisplayName}
          </span>
          {command.userName !== command.userDisplayName && (
            <span className="truncate text-xs text-muted-foreground">
              @{command.userName}
            </span>
          )}
        </div>

        {/* Description */}
        {command.description && (
          <p className="truncate text-xs text-muted-foreground">
            {command.description}
          </p>
        )}
      </div>

      {/* Unread badge */}
      {command.unreadCount !== undefined && command.unreadCount > 0 && (
        <span className="text-primary-foreground flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium">
          {command.unreadCount > 99 ? "99+" : command.unreadCount}
        </span>
      )}

      {/* DM icon */}
      <MessageSquare className="h-4 w-4 text-muted-foreground" />
    </CommandPrimitive.Item>
  );
}

export default DMCommand;
