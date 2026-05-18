"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  UserPresence,
  PresenceStatus,
} from "@/lib/presence/presence-types";
import {
  getPresenceLabel,
  isActiveStatus,
} from "@/lib/presence/presence-types";
import { PresenceIndicator } from "./PresenceIndicator";
import { CustomStatus as CustomStatusDisplay } from "./CustomStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

export interface OnlineUserItem {
  id: string;
  displayName: string;
  avatarUrl?: string;
  status: PresenceStatus;
  customStatus?: {
    emoji?: string;
    text?: string;
    expiresAt?: Date | null;
  };
  lastSeenAt?: Date;
}

export interface OnlineUsersProps {
  /**
   * List of users to display
   */
  users: OnlineUserItem[];

  /**
   * Callback when a user is clicked
   */
  onUserClick?: (userId: string) => void;

  /**
   * Whether to show offline users
   * @default false
   */
  showOffline?: boolean;

  /**
   * Maximum height of the list
   */
  maxHeight?: string | number;

  /**
   * Additional class names
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function OnlineUsers({
  users,
  onUserClick,
  showOffline = false,
  maxHeight = "300px",
  className,
}: OnlineUsersProps) {
  // Filter and sort users
  const filteredUsers = React.useMemo(() => {
    let result = users;

    if (!showOffline) {
      result = result.filter((u) => isActiveStatus(u.status));
    }

    // Sort: online first, then away, then dnd, then offline
    const statusOrder: Record<PresenceStatus, number> = {
      online: 0,
      away: 1,
      dnd: 2,
      invisible: 3,
      offline: 4,
    };

    return result.sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status];
      if (orderDiff !== 0) return orderDiff;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [users, showOffline]);

  // Group by status
  const grouped = React.useMemo(() => {
    const groups: Record<string, OnlineUserItem[]> = {};

    filteredUsers.forEach((user) => {
      const key = user.status === "online" ? "online" : user.status;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(user);
    });

    return groups;
  }, [filteredUsers]);

  if (filteredUsers.length === 0) {
    return (
      <div
        className={cn(
          "p-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No users online
      </div>
    );
  }

  return (
    <ScrollArea style={{ maxHeight }} className={cn("w-full", className)}>
      <div className="space-y-4 p-2">
        {Object.entries(grouped).map(([status, groupUsers]) => (
          <div key={status}>
            {/* Group header */}
            <div className="px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {getPresenceLabel(status as PresenceStatus)} — {groupUsers.length}
            </div>

            {/* User list */}
            <div className="space-y-0.5">
              {groupUsers.map((user) => (
                <OnlineUserListItem
                  key={user.id}
                  user={user}
                  onClick={() => onUserClick?.(user.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// Online User List Item
// ============================================================================

interface OnlineUserListItemProps {
  user: OnlineUserItem;
  onClick?: () => void;
}

function OnlineUserListItem({ user, onClick }: OnlineUserListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-1.5",
        "hover:bg-muted/50 text-left transition-colors",
      )}
    >
      {/* Avatar with presence indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          <AvatarFallback className="text-xs">
            {user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <PresenceIndicator
          status={user.status}
          size="sm"
          position="bottom-right"
        />
      </div>

      {/* User info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{user.displayName}</div>
        {user.customStatus &&
          (user.customStatus.emoji || user.customStatus.text) && (
            <CustomStatusDisplay
              status={user.customStatus}
              size="sm"
              showExpiration={false}
            />
          )}
      </div>
    </button>
  );
}

// ============================================================================
// Online Users Count
// ============================================================================

export interface OnlineUsersCountProps {
  count: number;
  className?: string;
}

export function OnlineUsersCount({ count, className }: OnlineUsersCountProps) {
  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      {count} {count === 1 ? "member" : "members"} online
    </span>
  );
}

// ============================================================================
// Online Users Avatars (stacked)
// ============================================================================

export interface OnlineUsersAvatarsProps {
  users: OnlineUserItem[];
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
  onUserClick?: (userId: string) => void;
  className?: string;
}

export function OnlineUsersAvatars({
  users,
  maxDisplay = 5,
  size = "md",
  onUserClick,
  className,
}: OnlineUsersAvatarsProps) {
  const displayedUsers = users.slice(0, maxDisplay);
  const remainingCount = Math.max(0, users.length - maxDisplay);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const indicatorSizes = {
    sm: "xs" as const,
    md: "sm" as const,
    lg: "md" as const,
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center -space-x-2", className)}>
        {displayedUsers.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onUserClick?.(user.id)}
                className="relative rounded-full border-2 border-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Avatar className={sizeClasses[size]}>
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  <AvatarFallback className="text-xs">
                    {user.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <PresenceIndicator
                  status={user.status}
                  size={indicatorSizes[size]}
                  position="bottom-right"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {user.displayName}
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <div
            className={cn(
              "flex items-center justify-center rounded-full",
              "border-2 border-background bg-muted text-xs font-medium",
              sizeClasses[size],
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Compact Online Users
// ============================================================================

export interface CompactOnlineUsersProps {
  users: OnlineUserItem[];
  maxDisplay?: number;
  showCount?: boolean;
  className?: string;
}

export function CompactOnlineUsers({
  users,
  maxDisplay = 3,
  showCount = true,
  className,
}: CompactOnlineUsersProps) {
  const onlineUsers = users.filter((u) => isActiveStatus(u.status));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <OnlineUsersAvatars users={onlineUsers.slice(0, maxDisplay)} size="sm" />
      {showCount && (
        <span className="text-xs text-muted-foreground">
          {onlineUsers.length} online
        </span>
      )}
    </div>
  );
}

export default OnlineUsers;
