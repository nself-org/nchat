"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadPreviewParticipant {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
}

export interface ThreadPreviewData {
  id: string;
  replyCount: number;
  lastReplyAt: string;
  participants: ThreadPreviewParticipant[];
  lastReplyContent?: string;
  lastReplyUser?: ThreadPreviewParticipant;
}

export interface ThreadPreviewProps {
  /** Thread data to display */
  thread: ThreadPreviewData;
  /** Maximum number of avatars to show */
  maxAvatars?: number;
  /** Handler for opening the thread */
  onClick?: () => void;
  /** Whether the user has unread messages in this thread */
  hasUnread?: boolean;
  /** Additional class name */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatRelativeTime = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "";
  }
};

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const sizeConfig = {
  sm: {
    container: "gap-1.5 text-xs",
    avatar: "h-4 w-4",
    avatarText: "text-[8px]",
    avatarOverlap: "-ml-1",
    icon: "h-3.5 w-3.5",
    overflow: "h-4 w-4 text-[8px]",
  },
  md: {
    container: "gap-2 text-sm",
    avatar: "h-5 w-5",
    avatarText: "text-[10px]",
    avatarOverlap: "-ml-1.5",
    icon: "h-4 w-4",
    overflow: "h-5 w-5 text-[10px]",
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function ThreadPreview({
  thread,
  maxAvatars = 3,
  onClick,
  hasUnread = false,
  className,
  size = "md",
}: ThreadPreviewProps) {
  const config = sizeConfig[size];

  const { replyCount, lastReplyAt, participants } = thread;
  const visibleParticipants = participants.slice(0, maxAvatars);
  const overflowCount = Math.max(0, participants.length - maxAvatars);

  // Don't render if no replies
  if (replyCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center rounded-md",
          "px-2 py-1",
          "bg-muted/50 hover:bg-muted",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          hasUnread && "ring-primary/50 ring-1",
          config.container,
          className,
        )}
      >
        {/* Stacked avatars */}
        <div className="flex items-center">
          {visibleParticipants.map((participant, index) => (
            <Tooltip key={participant.id}>
              <TooltipTrigger asChild>
                <Avatar
                  className={cn(
                    config.avatar,
                    "border border-background ring-0",
                    index > 0 && config.avatarOverlap,
                  )}
                >
                  <AvatarImage
                    src={participant.avatar_url}
                    alt={participant.display_name || participant.username}
                  />
                  <AvatarFallback className={config.avatarText}>
                    {getInitials(
                      participant.display_name || participant.username,
                    )}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {participant.display_name || participant.username}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    config.overflow,
                    config.avatarOverlap,
                    "flex items-center justify-center",
                    "rounded-full border border-background",
                    "bg-muted font-medium text-muted-foreground",
                  )}
                >
                  +{overflowCount}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {participants
                  .slice(maxAvatars)
                  .map((p) => p.display_name || p.username)
                  .join(", ")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Reply count and time */}
        <span
          className={cn(
            "text-primary hover:underline",
            hasUnread && "font-semibold",
          )}
        >
          {replyCount} {replyCount === 1 ? "reply" : "replies"}
        </span>

        {lastReplyAt && (
          <span className="text-muted-foreground">
            {formatRelativeTime(lastReplyAt)}
          </span>
        )}

        {/* Unread indicator */}
        {hasUnread && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
      </button>
    </TooltipProvider>
  );
}

// ============================================================================
// COMPACT VARIANT (Icon only)
// ============================================================================

export interface ThreadPreviewCompactProps {
  replyCount: number;
  onClick?: () => void;
  hasUnread?: boolean;
  className?: string;
}

export function ThreadPreviewCompact({
  replyCount,
  onClick,
  hasUnread = false,
  className,
}: ThreadPreviewCompactProps) {
  if (replyCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1",
              "rounded px-1.5 py-0.5",
              "text-xs text-muted-foreground",
              "hover:bg-muted hover:text-foreground",
              "transition-colors",
              hasUnread && "font-medium text-primary",
              className,
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{replyCount}</span>
            {hasUnread && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {replyCount} {replyCount === 1 ? "reply" : "replies"} in thread
          {hasUnread && " (unread)"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// EXPANDED VARIANT (Full preview with last message)
// ============================================================================

export interface ThreadPreviewExpandedProps extends ThreadPreviewProps {
  /** Whether to show the last reply content */
  showLastReply?: boolean;
}

export function ThreadPreviewExpanded({
  thread,
  maxAvatars = 4,
  onClick,
  hasUnread = false,
  showLastReply = true,
  className,
}: ThreadPreviewExpandedProps) {
  const {
    replyCount,
    lastReplyAt,
    participants,
    lastReplyContent,
    lastReplyUser,
  } = thread;
  const visibleParticipants = participants.slice(0, maxAvatars);
  const overflowCount = Math.max(0, participants.length - maxAvatars);

  if (replyCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-lg text-left",
          "px-3 py-2",
          "border border-transparent",
          "hover:bg-muted/50 hover:border-border",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          hasUnread && "bg-primary/5 border-primary/20",
          className,
        )}
      >
        {/* Header row */}
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Avatars */}
            <div className="flex items-center">
              {visibleParticipants.map((participant, index) => (
                <Avatar
                  key={participant.id}
                  className={cn(
                    "h-5 w-5 border border-background",
                    index > 0 && "-ml-1.5",
                  )}
                >
                  <AvatarImage
                    src={participant.avatar_url}
                    alt={participant.display_name || participant.username}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(
                      participant.display_name || participant.username,
                    )}
                  </AvatarFallback>
                </Avatar>
              ))}
              {overflowCount > 0 && (
                <div className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[10px] font-medium text-muted-foreground">
                  +{overflowCount}
                </div>
              )}
            </div>

            {/* Reply count */}
            <span
              className={cn(
                "text-sm font-medium text-primary",
                hasUnread && "font-semibold",
              )}
            >
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>

            {hasUnread && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            )}
          </div>

          {/* Timestamp */}
          {lastReplyAt && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Last reply {formatRelativeTime(lastReplyAt)}
            </span>
          )}
        </div>

        {/* Last reply preview */}
        {showLastReply && lastReplyContent && lastReplyUser && (
          <div className="ml-[calc(theme(spacing.5)*0.5+theme(spacing.1))] flex items-start gap-2">
            <div className="line-clamp-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {lastReplyUser.display_name || lastReplyUser.username}:
              </span>{" "}
              {lastReplyContent}
            </div>
          </div>
        )}
      </button>
    </TooltipProvider>
  );
}

// ============================================================================
// START THREAD BUTTON (for messages without threads)
// ============================================================================

export interface StartThreadButtonProps {
  onClick?: () => void;
  className?: string;
}

export function StartThreadButton({
  onClick,
  className,
}: StartThreadButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "inline-flex items-center gap-1",
              "rounded px-1.5 py-0.5",
              "text-xs text-muted-foreground",
              "hover:bg-muted hover:text-foreground",
              "opacity-0 group-hover:opacity-100",
              "transition-all",
              className,
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Reply</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>Reply in thread</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ThreadPreview;
