"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  VolumeX,
  Volume2,
  Star,
  StarOff,
  Archive,
  Trash2,
  Pin,
} from "lucide-react";
import type { DirectMessage } from "@/lib/dm/dm-types";
import {
  generateDMDisplayName,
  getDMAvatarUrls,
  getDMAvatarInitials,
  formatDMTimestamp,
  getOtherParticipants,
} from "@/lib/dm";
import { useDMStore } from "@/stores/dm-store";

// ============================================================================
// Types
// ============================================================================

interface DMItemProps {
  dm: DirectMessage;
  currentUserId: string;
  isActive?: boolean;
  onSelect?: (dm: DirectMessage) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DMItem({
  dm,
  currentUserId,
  isActive = false,
  onSelect,
  className,
}: DMItemProps) {
  const {
    mutedDMs,
    starredDMs,
    toggleMuteDM,
    toggleStarDM,
    archiveDM,
    removeDM,
  } = useDMStore();

  const isMuted = mutedDMs.has(dm.id);
  const isStarred = starredDMs.has(dm.id);

  const displayName = generateDMDisplayName(
    dm.participants,
    currentUserId,
    dm.name,
  );
  const avatarUrls = getDMAvatarUrls(dm, currentUserId);
  const initials = getDMAvatarInitials(dm, currentUserId);
  const timestamp = formatDMTimestamp(dm.lastMessageAt);
  const unreadCount = dm.unreadCount || 0;
  const hasUnread = unreadCount > 0;

  // Get presence indicator for 1:1 DMs
  const otherParticipants = getOtherParticipants(dm, currentUserId);
  const isOnline =
    dm.type === "direct" && otherParticipants[0]?.user.status === "online";

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(dm);
    }
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMuteDM(dm.id);
  };

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStarDM(dm.id);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    archiveDM(dm.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeDM(dm.id);
  };

  return (
    <div className={cn("group relative flex items-center", className)}>
      <Link
        href={`/dm/${dm.id}`}
        onClick={handleClick}
        className={cn(
          "flex flex-1 items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
          "hover:text-accent-foreground hover:bg-accent",
          isActive && "text-accent-foreground bg-accent",
          isMuted && "opacity-60",
        )}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {dm.type === "group" && avatarUrls.length > 1 ? (
            <GroupDMAvatar avatarUrls={avatarUrls} initials={initials} />
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrls[0]} alt={displayName} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          )}
          {/* Online indicator for 1:1 DMs */}
          {dm.type === "direct" && (
            <span
              className={cn(
                "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                isOnline ? "bg-green-500" : "bg-gray-400",
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "truncate font-medium",
                hasUnread && !isMuted && "font-semibold",
                isMuted && "text-muted-foreground",
              )}
            >
              {displayName}
            </span>
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {timestamp}
            </span>
          </div>

          {/* Preview */}
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {dm.lastMessagePreview || "No messages yet"}
            </span>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {isMuted && <VolumeX className="h-3 w-3 text-muted-foreground" />}
              {isStarred && (
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              )}
              {hasUnread && !isMuted && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 px-1.5 text-[10px] font-semibold"
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">DM actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleStar}>
            {isStarred ? (
              <>
                <StarOff className="mr-2 h-4 w-4" />
                Unstar
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                Star
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleMute}>
            {isMuted ? (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Unmute
              </>
            ) : (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Group DM Avatar Component
// ============================================================================

function GroupDMAvatar({
  avatarUrls,
  initials,
}: {
  avatarUrls: string[];
  initials: string;
}) {
  if (avatarUrls.length === 0) {
    return (
      <Avatar className="h-10 w-10">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
    );
  }

  if (avatarUrls.length === 1) {
    return (
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrls[0]} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
    );
  }

  // 2-4 avatars in a grid
  return (
    <div className="relative h-10 w-10">
      {avatarUrls.slice(0, 4).map((url, index) => (
        <Avatar
          key={index}
          className={cn(
            "absolute h-5 w-5 border border-background",
            index === 0 && "left-0 top-0",
            index === 1 && "right-0 top-0",
            index === 2 && "bottom-0 left-0",
            index === 3 && "bottom-0 right-0",
          )}
        >
          <AvatarImage src={url} />
          <AvatarFallback className="text-[8px]">
            {initials.charAt(index) || "?"}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

DMItem.displayName = "DMItem";
