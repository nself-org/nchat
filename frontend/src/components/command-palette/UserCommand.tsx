"use client";

/**
 * UserCommand
 *
 * Specialized command item for users with profile info and presence.
 */

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { User, Shield, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserCommandData } from "@/lib/command-palette/command-types";

// ============================================================================
// Types
// ============================================================================

export interface UserCommandProps {
  /** User command data */
  command: UserCommandData;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Click handler */
  onSelect?: (command: UserCommandData) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Role Configuration
// ============================================================================

const roleConfig: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  owner: { icon: Crown, color: "text-amber-500", label: "Owner" },
  admin: { icon: Shield, color: "text-red-500", label: "Admin" },
  moderator: { icon: Star, color: "text-purple-500", label: "Moderator" },
  member: { icon: User, color: "text-blue-500", label: "Member" },
  guest: { icon: User, color: "text-gray-500", label: "Guest" },
};

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

export function UserCommand({
  command,
  isSelected = false,
  onSelect,
  className,
}: UserCommandProps) {
  const role = command.role || "member";
  const roleInfo = roleConfig[role] || roleConfig.member;
  const RoleIcon = roleInfo.icon;

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
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
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

          {/* Role badge */}
          {role !== "member" && role !== "guest" && (
            <span
              className={cn(
                "flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium",
                "bg-muted",
                roleInfo.color,
              )}
            >
              <RoleIcon className="h-2.5 w-2.5" />
              {roleInfo.label}
            </span>
          )}
        </div>

        {/* Username */}
        {command.userName !== command.userDisplayName && (
          <p className="truncate text-xs text-muted-foreground">
            @{command.userName}
          </p>
        )}
      </div>

      {/* View profile indicator */}
      <span className="text-xs text-muted-foreground">View profile</span>
    </CommandPrimitive.Item>
  );
}

export default UserCommand;
