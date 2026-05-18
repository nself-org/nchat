"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  X,
  Bell,
  BellOff,
  MoreHorizontal,
  MessageSquare,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ThreadParticipants } from "./thread-participants";
import type {
  Thread,
  ThreadMessage,
  ThreadParticipant,
} from "@/hooks/use-thread";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadHeaderProps {
  /** The thread object */
  thread: Thread | null;
  /** The parent message of the thread */
  parentMessage: ThreadMessage | null;
  /** Thread participants */
  participants: ThreadParticipant[];
  /** Total reply count */
  replyCount: number;
  /** Whether the current user is a participant */
  isParticipant: boolean;
  /** Whether notifications are enabled */
  notificationsEnabled?: boolean;
  /** Handler for close button */
  onClose: () => void;
  /** Handler for joining thread */
  onJoin?: () => void;
  /** Handler for leaving thread */
  onLeave?: () => void;
  /** Handler for toggling notifications */
  onToggleNotifications?: (enabled: boolean) => void;
  /** Handler for viewing all participants */
  onViewParticipants?: () => void;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ThreadHeader({
  thread,
  parentMessage,
  participants,
  replyCount,
  isParticipant,
  notificationsEnabled = true,
  onClose,
  onJoin,
  onLeave,
  onToggleNotifications,
  onViewParticipants,
  className,
}: ThreadHeaderProps) {
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + "...";
  };

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col border-b bg-background", className)}>
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold">Thread</h2>
            {replyCount > 0 && (
              <span className="text-sm text-muted-foreground">
                ({replyCount} {replyCount === 1 ? "reply" : "replies"})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Notification toggle */}
            {isParticipant && onToggleNotifications && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onToggleNotifications(!notificationsEnabled)}
                  >
                    {notificationsEnabled ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {notificationsEnabled ? "Mute thread" : "Unmute thread"}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {notificationsEnabled
                    ? "Turn off notifications"
                    : "Turn on notifications"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Thread options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onViewParticipants && (
                  <DropdownMenuItem onClick={onViewParticipants}>
                    <Users className="mr-2 h-4 w-4" />
                    View all participants
                  </DropdownMenuItem>
                )}
                {isParticipant && onToggleNotifications && (
                  <DropdownMenuItem
                    onClick={() => onToggleNotifications(!notificationsEnabled)}
                  >
                    {notificationsEnabled ? (
                      <>
                        <BellOff className="mr-2 h-4 w-4" />
                        Mute thread
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" />
                        Unmute thread
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {isParticipant && onLeave ? (
                  <DropdownMenuItem
                    onClick={onLeave}
                    className="text-destructive focus:text-destructive"
                  >
                    Leave thread
                  </DropdownMenuItem>
                ) : onJoin ? (
                  <DropdownMenuItem onClick={onJoin}>
                    Follow thread
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close thread</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Close thread</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator />

        {/* Parent message preview */}
        {parentMessage && (
          <div className="bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage
                  src={parentMessage.user.avatar_url}
                  alt={
                    parentMessage.user.display_name ||
                    parentMessage.user.username
                  }
                />
                <AvatarFallback className="text-xs">
                  {getInitials(
                    parentMessage.user.display_name ||
                      parentMessage.user.username,
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold">
                    {parentMessage.user.display_name ||
                      parentMessage.user.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(
                      new Date(parentMessage.created_at),
                      "MMM d, h:mm a",
                    )}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {truncateContent(parentMessage.content)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Participants row */}
        {participants.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <ThreadParticipants
                  participants={participants}
                  size="sm"
                  maxVisible={5}
                  onClick={onViewParticipants}
                />
                <span className="text-xs text-muted-foreground">
                  {participants.length}{" "}
                  {participants.length === 1 ? "participant" : "participants"}
                </span>
              </div>

              {/* Join button for non-participants */}
              {!isParticipant && onJoin && (
                <Button variant="outline" size="sm" onClick={onJoin}>
                  Follow thread
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// COMPACT HEADER (for smaller screens)
// ============================================================================

export interface ThreadHeaderCompactProps {
  replyCount: number;
  participantCount: number;
  onClose: () => void;
  className?: string;
}

export function ThreadHeaderCompact({
  replyCount,
  participantCount,
  onClose,
  className,
}: ThreadHeaderCompactProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Thread</span>
        <span className="text-xs text-muted-foreground">
          {replyCount} {replyCount === 1 ? "reply" : "replies"} &middot;{" "}
          {participantCount} {participantCount === 1 ? "person" : "people"}
        </span>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    </div>
  );
}

export default ThreadHeader;
