/**
 * MentionPopover Component
 *
 * Popover that appears when hovering over a mention,
 * showing user profile preview or channel info.
 */

"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getInitials,
  getPresenceColor,
  getPresenceLabel,
} from "@/stores/user-store";
import type {
  MentionableUser,
  MentionableChannel,
  SpecialMentionType,
} from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface MentionPopoverProps {
  /** Children that trigger the popover */
  children: React.ReactNode;
  /** Whether the popover is controlled */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Delay before showing popover (ms) */
  hoverDelay?: number;
  /** Popover content */
  content: React.ReactNode;
  /** Side of the trigger to show popover */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment of the popover */
  align?: "start" | "center" | "end";
  /** Additional class for content */
  className?: string;
}

// ============================================================================
// Base Popover Component
// ============================================================================

export function MentionPopover({
  children,
  open,
  onOpenChange,
  hoverDelay = 300,
  content,
  side = "top",
  align = "center",
  className,
}: MentionPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const controlled = open !== undefined;

  const handleMouseEnter = useCallback(() => {
    const timeout = setTimeout(() => {
      if (!controlled) {
        setIsOpen(true);
      }
      onOpenChange?.(true);
    }, hoverDelay);
    setHoverTimeout(timeout);
  }, [controlled, hoverDelay, onOpenChange]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (!controlled) {
      setIsOpen(false);
    }
    onOpenChange?.(false);
  }, [controlled, hoverTimeout, onOpenChange]);

  const actualOpen = controlled ? open : isOpen;

  return (
    <Popover
      open={actualOpen}
      onOpenChange={controlled ? onOpenChange : setIsOpen}
    >
      <PopoverTrigger asChild>
        <span
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="inline"
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn("w-auto p-0", className)}
        onMouseEnter={() => {
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
          }
        }}
        onMouseLeave={handleMouseLeave}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// User Mention Popover Content
// ============================================================================

export interface UserMentionPopoverContentProps {
  user: MentionableUser;
  onViewProfile?: () => void;
  onSendMessage?: () => void;
  className?: string;
}

export function UserMentionPopoverContent({
  user,
  onViewProfile,
  onSendMessage,
  className,
}: UserMentionPopoverContentProps) {
  const presenceColor = user.presence
    ? getPresenceColor(user.presence)
    : "#6B7280";
  const presenceLabel = user.presence
    ? getPresenceLabel(user.presence)
    : "Unknown";

  return (
    <div className={cn("w-64 p-4", className)}>
      {/* Header with avatar */}
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            )}
            <AvatarFallback className="text-sm">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          {user.presence && (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-popover"
              style={{ backgroundColor: presenceColor }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold">{user.displayName}</h4>
          <p className="truncate text-xs text-muted-foreground">
            @{user.username}
          </p>
          {user.presence && (
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: presenceColor }}
              />
              <span className="text-xs text-muted-foreground">
                {presenceLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Role */}
      {user.role && (
        <div className="mt-3">
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
            {user.role}
          </span>
        </div>
      )}

      {/* Actions */}
      {(onViewProfile || onSendMessage) && (
        <div className="mt-4 flex gap-2">
          {onViewProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewProfile}
              className="flex-1"
            >
              View Profile
            </Button>
          )}
          {onSendMessage && (
            <Button
              variant="default"
              size="sm"
              onClick={onSendMessage}
              className="flex-1"
            >
              Message
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// User Mention Popover (Combined)
// ============================================================================

export interface UserMentionWithPopoverProps {
  user: MentionableUser;
  isCurrentUser?: boolean;
  onViewProfile?: () => void;
  onSendMessage?: () => void;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function UserMentionWithPopover({
  user,
  isCurrentUser = false,
  onViewProfile,
  onSendMessage,
  onClick,
  className,
  children,
}: UserMentionWithPopoverProps) {
  return (
    <MentionPopover
      content={
        <UserMentionPopoverContent
          user={user}
          onViewProfile={onViewProfile}
          onSendMessage={!isCurrentUser ? onSendMessage : undefined}
        />
      }
    >
      <span
        className={cn(
          "mention mention-user inline-flex items-center rounded px-1.5 py-0.5 text-sm",
          "bg-primary/10 hover:bg-primary/20 cursor-pointer text-primary transition-colors",
          isCurrentUser && "bg-primary/20 font-semibold",
          className,
        )}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
        role="button"
        tabIndex={0}
      >
        {children || `@${user.displayName}`}
      </span>
    </MentionPopover>
  );
}

// ============================================================================
// Channel Mention Popover Content
// ============================================================================

export interface ChannelMentionPopoverContentProps {
  channel: MentionableChannel;
  memberCount?: number;
  onJoin?: () => void;
  onNavigate?: () => void;
  className?: string;
}

export function ChannelMentionPopoverContent({
  channel,
  memberCount,
  onJoin,
  onNavigate,
  className,
}: ChannelMentionPopoverContentProps) {
  const typeIcons: Record<string, React.ReactNode> = {
    public: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
        />
      </svg>
    ),
    private: (
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  };

  return (
    <div className={cn("w-64 p-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {typeIcons[channel.type] || typeIcons.public}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold">{channel.name}</h4>
          <p className="text-xs text-muted-foreground">
            {channel.type === "private" ? "Private channel" : "Public channel"}
          </p>
          {memberCount !== undefined && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {channel.description && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
          {channel.description}
        </p>
      )}

      {/* Actions */}
      {(onJoin || onNavigate) && (
        <div className="mt-4 flex gap-2">
          {onNavigate && (
            <Button
              variant="default"
              size="sm"
              onClick={onNavigate}
              className="flex-1"
            >
              Open Channel
            </Button>
          )}
          {onJoin && (
            <Button
              variant="outline"
              size="sm"
              onClick={onJoin}
              className="flex-1"
            >
              Join
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Group Mention Popover Content
// ============================================================================

export interface GroupMentionPopoverContentProps {
  type: SpecialMentionType;
  memberCount?: number;
  onlineCount?: number;
  className?: string;
}

export function GroupMentionPopoverContent({
  type,
  memberCount,
  onlineCount,
  className,
}: GroupMentionPopoverContentProps) {
  const config: Record<
    SpecialMentionType,
    { title: string; description: string; icon: React.ReactNode }
  > = {
    everyone: {
      title: "@everyone",
      description: `Notifies all ${memberCount || ""} members in the workspace`,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    here: {
      title: "@here",
      description: `Notifies ${onlineCount || "online"} members who are currently online`,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
          />
        </svg>
      ),
    },
    channel: {
      title: "@channel",
      description: `Notifies all ${memberCount || ""} members in this channel`,
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
          />
        </svg>
      ),
    },
  };

  const { title, description, icon } = config[type];

  return (
    <div className={cn("w-64 p-4", className)}>
      <div className="flex items-start gap-3">
        <div className="bg-warning/10 text-warning flex h-10 w-10 items-center justify-center rounded-md">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-warning text-sm font-semibold">{title}</h4>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="bg-warning/5 border-warning/10 mt-3 rounded-md border p-2">
        <p className="text-warning/80 text-xs">
          Use this mention sparingly as it will notify many people.
        </p>
      </div>
    </div>
  );
}

export default MentionPopover;
