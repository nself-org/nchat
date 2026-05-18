"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatarGroup } from "@/components/user/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Hash,
  Lock,
  Megaphone,
  Search,
  Pin,
  Users,
  Settings,
  Phone,
  Video,
  Star,
  Bell,
  BellOff,
  MoreVertical,
  ChevronDown,
  Info,
} from "lucide-react";
import type { Channel } from "@/stores/channel-store";
import type { UserProfile } from "@/stores/user-store";

// ============================================================================
// Types
// ============================================================================

interface ChannelHeaderProps {
  channel?: Channel | null;
  loading?: boolean;
  members?: Pick<UserProfile, "id" | "avatarUrl" | "displayName">[];
  isMuted?: boolean;
  isStarred?: boolean;
  onToggleMute?: () => void;
  onToggleStar?: () => void;
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
  onOpenPinnedMessages?: () => void;
  onOpenMemberList?: () => void;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
  className?: string;
}

// ============================================================================
// Helper: Get channel icon
// ============================================================================

function ChannelIcon({
  type,
  name,
  className,
}: {
  type: Channel["type"];
  name: string;
  className?: string;
}) {
  if (name === "announcements") {
    return <Megaphone className={cn("h-5 w-5", className)} />;
  }
  if (type === "private") {
    return <Lock className={cn("h-5 w-5", className)} />;
  }
  return <Hash className={cn("h-5 w-5", className)} />;
}

// ============================================================================
// Channel Header Loading Skeleton
// ============================================================================

function ChannelHeaderSkeleton() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-px bg-border" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </header>
  );
}

// ============================================================================
// Channel Header Component
// ============================================================================

export function ChannelHeader({
  channel,
  loading = false,
  members = [],
  isMuted = false,
  isStarred = false,
  onToggleMute,
  onToggleStar,
  onOpenSettings,
  onOpenSearch,
  onOpenPinnedMessages,
  onOpenMemberList,
  onStartCall,
  onStartVideoCall,
  className,
}: ChannelHeaderProps) {
  if (loading || !channel) {
    return <ChannelHeaderSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <header
        className={cn(
          "flex h-14 items-center justify-between border-b bg-background px-4",
          className,
        )}
      >
        {/* Left Section: Channel Info */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Channel Icon */}
          <ChannelIcon
            type={channel.type}
            name={channel.name}
            className="flex-shrink-0 text-muted-foreground"
          />

          {/* Channel Name with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="-ml-1 flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-accent">
                <h1 className="truncate text-lg font-semibold">
                  {channel.name}
                </h1>
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={onOpenSettings}>
                <Info className="mr-2 h-4 w-4" />
                Channel details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenMemberList}>
                <Users className="mr-2 h-4 w-4" />
                View members ({channel.memberCount})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleMute}>
                {isMuted ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Unmute channel
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute channel
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStar}>
                <Star
                  className={cn(
                    "mr-2 h-4 w-4",
                    isStarred && "fill-yellow-500 text-yellow-500",
                  )}
                />
                {isStarred ? "Unstar channel" : "Star channel"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Channel settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Topic */}
          {channel.topic && (
            <>
              <div className="h-4 w-px flex-shrink-0 bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="max-w-[300px] cursor-help truncate text-sm text-muted-foreground">
                    {channel.topic}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  <p className="text-sm">{channel.topic}</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Right Section: Actions */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {/* Member Avatars */}
          {members.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenMemberList}
                  className="mr-2 flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
                >
                  <UserAvatarGroup
                    users={members}
                    max={3}
                    size="xs"
                    onOverflowClick={onOpenMemberList}
                  />
                  <span className="text-sm text-muted-foreground">
                    {channel.memberCount}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>View members</TooltipContent>
            </Tooltip>
          )}

          {/* Pinned Messages */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenPinnedMessages}
              >
                <Pin className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pinned messages</TooltipContent>
          </Tooltip>

          {/* Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search in channel</TooltipContent>
          </Tooltip>

          {/* Voice Call */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onStartCall}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start voice call</TooltipContent>
          </Tooltip>

          {/* Video Call */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onStartVideoCall}
              >
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start video call</TooltipContent>
          </Tooltip>

          {/* More Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onToggleStar}>
                <Star
                  className={cn(
                    "mr-2 h-4 w-4",
                    isStarred && "fill-yellow-500 text-yellow-500",
                  )}
                />
                {isStarred ? "Unstar" : "Star"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleMute}>
                {isMuted ? (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Unmute
                  </>
                ) : (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSettings}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}

// ============================================================================
// Channel Header for Direct Messages
// ============================================================================

interface DMHeaderProps {
  user?: UserProfile | null;
  loading?: boolean;
  onOpenProfile?: () => void;
  onStartCall?: () => void;
  onStartVideoCall?: () => void;
  className?: string;
}

export function DMHeader({
  user,
  loading = false,
  onOpenProfile,
  onStartCall,
  onStartVideoCall,
  className,
}: DMHeaderProps) {
  if (loading || !user) {
    return <ChannelHeaderSkeleton />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <header
        className={cn(
          "flex h-14 items-center justify-between border-b bg-background px-4",
          className,
        )}
      >
        {/* Left Section: User Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenProfile}
            className="-ml-2 flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-accent"
          >
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  user.displayName.charAt(0).toUpperCase()
                )}
              </div>
              {/* Presence indicator */}
              <div
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                  user.presence === "online" && "bg-green-500",
                  user.presence === "away" && "bg-yellow-500",
                  user.presence === "dnd" && "bg-red-500",
                  user.presence === "offline" && "bg-gray-400",
                )}
              />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-semibold">{user.displayName}</h1>
              {user.customStatus?.text && (
                <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                  {user.customStatus.emoji} {user.customStatus.text}
                </p>
              )}
            </div>
          </button>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onStartCall}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start voice call</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onStartVideoCall}
              >
                <Video className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start video call</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenProfile}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View profile</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}

export { ChannelHeaderSkeleton };
