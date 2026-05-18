/**
 * SupergroupHeader - Telegram-style supergroup/channel header
 *
 * Displays header for large groups and channels with:
 * - Group/channel name and member count
 * - Channel icon/avatar
 * - Subscriber count for channels
 * - Admin indicator
 * - Mute/notification settings
 */

"use client";

import * as React from "react";
import {
  Users,
  Volume2,
  VolumeX,
  Search,
  MoreVertical,
  Pin,
  Settings,
  UserPlus,
  Share2,
  Bell,
  BellOff,
  Eye,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Channel } from "@/types/advanced-channels";

// ============================================================================
// Types
// ============================================================================

export interface SupergroupHeaderProps {
  channel: Channel;
  isAdmin?: boolean;
  isMuted?: boolean;
  onSearch?: () => void;
  onInvite?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
  onToggleMute?: () => void;
  onToggleNotifications?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SupergroupHeader({
  channel,
  isAdmin = false,
  isMuted = false,
  onSearch,
  onInvite,
  onShare,
  onSettings,
  onToggleMute,
  onToggleNotifications,
  className,
}: SupergroupHeaderProps) {
  const isSupergroup = channel.subtype === "supergroup";
  const isGigagroup = channel.subtype === "gigagroup";
  const isChannel = channel.type === "public" && channel.isReadonly;
  const isLargeGroup = isSupergroup || isGigagroup;

  // Format member count
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const memberLabel = isChannel ? "subscribers" : "members";

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b bg-background px-4 py-3",
        className,
      )}
    >
      {/* Left: Channel info */}
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={channel.icon} alt={channel.name} />
          <AvatarFallback className="text-sm font-semibold">
            {channel.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Name and info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold">{channel.name}</h2>
            {isLargeGroup && (
              <Badge variant="secondary" className="flex-shrink-0">
                <Users className="mr-1 h-3 w-3" />
                {isSupergroup ? "Supergroup" : "Gigagroup"}
              </Badge>
            )}
            {isChannel && (
              <Badge variant="secondary" className="flex-shrink-0">
                <Radio className="mr-1 h-3 w-3" />
                Channel
              </Badge>
            )}
            {isAdmin && (
              <Badge variant="default" className="flex-shrink-0">
                Admin
              </Badge>
            )}
          </div>

          {/* Member count and status */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatCount(channel.memberCount)} {memberLabel}
            </span>
            {channel.lastMessageAt && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Online: {Math.floor(channel.memberCount * 0.1)}
              </span>
            )}
            {isMuted && (
              <span className="flex items-center gap-1 text-amber-500">
                <VolumeX className="h-3 w-3" />
                Muted
              </span>
            )}
          </div>

          {/* Topic/description */}
          {channel.topic && (
            <p className="truncate text-xs text-muted-foreground">
              {channel.topic}
            </p>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        {onSearch && (
          <Button variant="ghost" size="icon" onClick={onSearch}>
            <Search className="h-4 w-4" />
          </Button>
        )}

        {/* Mute/Unmute */}
        {onToggleMute && (
          <Button variant="ghost" size="icon" onClick={onToggleMute}>
            {isMuted ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {onInvite && (
              <DropdownMenuItem onClick={onInvite}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Members
              </DropdownMenuItem>
            )}
            {onShare && (
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Link
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onToggleNotifications && (
              <DropdownMenuItem onClick={onToggleNotifications}>
                {isMuted ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Enable Notifications
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute Notifications
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Pin className="mr-2 h-4 w-4" />
              View Pinned Messages
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                {onSettings && (
                  <DropdownMenuItem onClick={onSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    Group Settings
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default SupergroupHeader;
