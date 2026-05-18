"use client";

/**
 * ChannelCommand
 *
 * Specialized command item for channels with channel-specific UI.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Hash, Lock, Users, Star, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChannelCommandData } from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface ChannelCommandProps {
  /** Channel command data */
  command: ChannelCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: ChannelCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: ChannelCommandProps) {
  const isPrivate = command.channelType === "private";
  const Icon = isPrivate ? Lock : Hash;

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
      {/* Channel icon */}
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md",
          command.isStarred ? "bg-amber-500/10" : "bg-muted",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            command.isStarred
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        />
      </div>

      {/* Channel info */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{command.channelName}</span>

          {/* Status badges */}
          {command.isStarred && (
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
          )}
          {command.isMuted && (
            <BellOff className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        {/* Description or member count */}
        {command.memberCount !== undefined && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {command.memberCount}{" "}
            {command.memberCount === 1 ? "member" : "members"}
          </p>
        )}
      </div>

      {/* Unread badge */}
      {command.unreadCount !== undefined && command.unreadCount > 0 && (
        <span
          className={cn(
            "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium",
            command.isMuted
              ? "bg-muted text-muted-foreground"
              : "text-primary-foreground bg-primary",
          )}
        >
          {command.unreadCount > 99 ? "99+" : command.unreadCount}
        </span>
      )}
    </CommandPrimitive.Item>
  );
}

export default ChannelCommand;
