"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hash,
  Lock,
  Volume2,
  VolumeX,
  Star,
  StarOff,
  Settings,
  MoreVertical,
  GripVertical,
} from "lucide-react";
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
import {
  useChannelStore,
  type Channel,
  type ChannelType,
} from "@/stores/channel-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// Types
// ============================================================================

export interface ChannelItemProps {
  channel: Channel;
  isActive?: boolean;
  isDragging?: boolean;
  isDragEnabled?: boolean;
  depth?: number;
  onSelect?: (channel: Channel) => void;
  onContextMenu?: (e: React.MouseEvent, channel: Channel) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getChannelIcon(type: ChannelType, isMuted: boolean) {
  if (isMuted) {
    return <VolumeX className="h-4 w-4 text-muted-foreground" />;
  }
  switch (type) {
    case "private":
      return <Lock className="h-4 w-4 text-muted-foreground" />;
    case "public":
    default:
      return <Hash className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatLastMessage(
  message: string | null,
  maxLength: number = 30,
): string {
  if (!message) return "";
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + "...";
}

// ============================================================================
// Component
// ============================================================================

export const ChannelItem = React.memo(
  function ChannelItem({
    channel,
    isActive: isActiveProp,
    isDragging = false,
    isDragEnabled = false,
    depth = 0,
    onSelect,
    onContextMenu,
  }: ChannelItemProps) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isAdmin = user?.role === "owner" || user?.role === "admin";

    const {
      mutedChannels,
      starredChannels,
      toggleMuteChannel,
      toggleStarChannel,
    } = useChannelStore();

    const isMuted = mutedChannels.has(channel.id);
    const isStarred = starredChannels.has(channel.id);
    const isActive =
      isActiveProp ?? pathname === `/chat/channel/${channel.slug}`;

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu?.(e, channel);
    };

    const handleClick = (e: React.MouseEvent) => {
      if (onSelect) {
        e.preventDefault();
        onSelect(channel);
      }
    };

    const handleMuteToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMuteChannel(channel.id);
    };

    const handleStarToggle = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleStarChannel(channel.id);
    };

    // Determine if this is a DM and get avatar info
    const isDM = channel.type === "direct" || channel.type === "group";
    const dmInitial =
      channel.otherUserName?.charAt(0).toUpperCase() ||
      channel.name.charAt(0).toUpperCase();

    return (
      <div
        className={cn(
          "group relative flex items-center",
          isDragging && "opacity-50",
        )}
        style={{ paddingLeft: `${depth * 12}px` }}
        onContextMenu={handleContextMenu}
      >
        {/* Drag Handle */}
        {isDragEnabled && isAdmin && (
          <div className="cursor-grab p-1 opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        )}

        {/* Channel Link */}
        <Link
          href={`/chat/channel/${channel.slug}`}
          onClick={handleClick}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
            "hover:text-accent-foreground hover:bg-accent",
            isActive && "text-accent-foreground bg-accent font-medium",
            isMuted && "opacity-60",
          )}
        >
          {/* Channel Icon or Avatar */}
          {isDM ? (
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={channel.otherUserAvatar}
                alt={channel.otherUserName}
              />
              <AvatarFallback className="text-[10px]">
                {dmInitial}
              </AvatarFallback>
            </Avatar>
          ) : (
            getChannelIcon(channel.type, isMuted)
          )}

          {/* Channel Name */}
          <span
            className={cn(
              "flex-1 truncate",
              isMuted && "text-muted-foreground",
            )}
          >
            {isDM ? channel.otherUserName || channel.name : channel.name}
          </span>

          {/* Indicators */}
          <div className="flex items-center gap-1">
            {/* Starred indicator */}
            {isStarred && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            )}

            {/* Muted indicator */}
            {isMuted && !isDM && (
              <VolumeX className="h-3 w-3 text-muted-foreground" />
            )}

            {/* Unread count */}
            {channel.lastMessagePreview && !isActive && (
              <Badge
                variant="default"
                className="h-5 min-w-[20px] px-1.5 text-[10px] font-semibold"
              >
                1
              </Badge>
            )}

            {/* Hover actions */}
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleStarToggle}
                className="rounded p-0.5 transition-colors hover:bg-muted"
                title={isStarred ? "Unstar channel" : "Star channel"}
              >
                {isStarred ? (
                  <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Star className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              <button
                onClick={handleMuteToggle}
                className="rounded p-0.5 transition-colors hover:bg-muted"
                title={isMuted ? "Unmute channel" : "Mute channel"}
              >
                {isMuted ? (
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded p-0.5 transition-colors hover:bg-muted"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleStarToggle}>
                    {isStarred ? (
                      <>
                        <StarOff className="mr-2 h-4 w-4" />
                        Unstar channel
                      </>
                    ) : (
                      <>
                        <Star className="mr-2 h-4 w-4" />
                        Star channel
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleMuteToggle}>
                    {isMuted ? (
                      <>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Unmute channel
                      </>
                    ) : (
                      <>
                        <VolumeX className="mr-2 h-4 w-4" />
                        Mute channel
                      </>
                    )}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Channel settings
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Link>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memoization
    // Only re-render if channel data, active state, or drag state changes
    return (
      prevProps.channel.id === nextProps.channel.id &&
      prevProps.channel.name === nextProps.channel.name &&
      prevProps.channel.lastMessagePreview ===
        nextProps.channel.lastMessagePreview &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.isDragging === nextProps.isDragging &&
      prevProps.depth === nextProps.depth
    );
  },
);

ChannelItem.displayName = "ChannelItem";
