"use client";

import * as React from "react";
import { useRef, useEffect, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  ThreadMessage,
  ThreadAttachment,
  ThreadReaction,
} from "@/hooks/use-thread";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadMessageListProps {
  /** Array of messages to display */
  messages: ThreadMessage[];
  /** Whether messages are loading */
  loading?: boolean;
  /** Whether more messages are being loaded */
  loadingMore?: boolean;
  /** Whether there are more messages to load */
  hasMore?: boolean;
  /** Current user ID for highlighting own messages */
  currentUserId?: string;
  /** Handler for loading more messages */
  onLoadMore?: () => void;
  /** Handler for message reaction */
  onReaction?: (messageId: string, emoji: string) => void;
  /** Handler for message click */
  onMessageClick?: (message: ThreadMessage) => void;
  /** Additional class name */
  className?: string;
  /** Estimated height of each message item */
  estimateSize?: number;
  /** Gap between messages */
  gap?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatMessageDate = (date: Date): string => {
  if (isToday(date)) {
    return format(date, "h:mm a");
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d, h:mm a");
};

const formatDateSeparator = (date: Date): string => {
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "EEEE, MMMM d, yyyy");
};

const getInitials = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// ============================================================================
// MESSAGE ITEM COMPONENT
// ============================================================================

interface MessageItemProps {
  message: ThreadMessage;
  isOwnMessage: boolean;
  showAvatar: boolean;
  showName: boolean;
  onReaction?: (emoji: string) => void;
}

function MessageItem({
  message,
  isOwnMessage,
  showAvatar,
  showName,
  onReaction,
}: MessageItemProps) {
  const messageDate = new Date(message.created_at);

  return (
    <div
      className={cn(
        "hover:bg-muted/50 group flex items-start gap-3 px-4 py-1 transition-colors",
        isOwnMessage && "bg-primary/5",
      )}
    >
      {/* Avatar column */}
      <div className="w-8 shrink-0">
        {showAvatar ? (
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={message.user.avatar_url}
              alt={message.user.display_name || message.user.username}
            />
            <AvatarFallback className="text-xs">
              {getInitials(message.user.display_name || message.user.username)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        {/* Name and timestamp */}
        {showName && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className="truncate text-sm font-semibold">
              {message.user.display_name || message.user.username}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default text-xs text-muted-foreground">
                  {format(messageDate, "h:mm a")}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {format(messageDate, "EEEE, MMMM d, yyyy h:mm:ss a")}
              </TooltipContent>
            </Tooltip>
            {message.is_edited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}

        {/* Message content */}
        <div className="whitespace-pre-wrap break-words text-sm">
          {message.content}
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <AttachmentPreview key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {groupReactions(message.reactions).map(
              ({ emoji, count, users }) => (
                <Tooltip key={emoji}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="hover:bg-muted/80 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-xs transition-colors"
                      onClick={() => onReaction?.(emoji)}
                    >
                      <span>{emoji}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{users.join(", ")}</TooltipContent>
                </Tooltip>
              ),
            )}
          </div>
        )}
      </div>

      {/* Timestamp for non-header messages */}
      {!showName && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 cursor-default text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {format(messageDate, "h:mm")}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {format(messageDate, "EEEE, MMMM d, yyyy h:mm:ss a")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ============================================================================
// ATTACHMENT PREVIEW COMPONENT
// ============================================================================

interface AttachmentPreviewProps {
  attachment: ThreadAttachment;
}

function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const isImage = attachment.file_type.startsWith("image/");
  const isVideo = attachment.file_type.startsWith("video/");
  const isAudio = attachment.file_type.startsWith("audio/");

  if (isImage) {
    return (
      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-xs overflow-hidden rounded-lg border transition-opacity hover:opacity-90"
      >
        <img
          src={attachment.thumbnail_url || attachment.file_url}
          alt={attachment.file_name}
          className="max-h-48 object-contain"
          loading="lazy"
        />
      </a>
    );
  }

  if (isVideo) {
    return (
      <video
        src={attachment.file_url}
        controls
        className="max-h-48 max-w-xs rounded-lg border"
        preload="metadata"
      >
        <track kind="captions" src="" label="Captions" default />
      </video>
    );
  }

  if (isAudio) {
    return (
      <audio
        src={attachment.file_url}
        controls
        className="w-full max-w-xs"
        preload="metadata"
      >
        <track kind="captions" src="" label="Captions" default />
      </audio>
    );
  }

  // Generic file attachment
  return (
    <a
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:bg-muted/80 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
    </a>
  );
}

// ============================================================================
// HELPER COMPONENTS & FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  users: string[];
}

function groupReactions(reactions: ThreadReaction[]): GroupedReaction[] {
  const grouped = reactions.reduce<Record<string, GroupedReaction>>(
    (acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].users.push(
        reaction.user.display_name || reaction.user.username,
      );
      return acc;
    },
    {},
  );

  return Object.values(grouped).sort((a, b) => b.count - a.count);
}

// ============================================================================
// DATE SEPARATOR COMPONENT
// ============================================================================

interface DateSeparatorProps {
  date: Date;
}

function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">
        {formatDateSeparator(date)}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThreadMessageList({
  messages,
  loading = false,
  loadingMore = false,
  hasMore = false,
  currentUserId,
  onLoadMore,
  onReaction,
  onMessageClick,
  className,
  estimateSize = 80,
  gap = 0,
}: ThreadMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // Group messages with date separators
  const items = useMemo(() => {
    const result: Array<
      | { type: "date"; date: Date }
      | { type: "message"; message: ThreadMessage; showHeader: boolean }
    > = [];
    let lastDate: Date | null = null;
    let lastUserId: string | null = null;
    let lastMessageTime: Date | null = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.created_at);

      // Add date separator if day changed
      if (!lastDate || !isSameDay(messageDate, lastDate)) {
        result.push({ type: "date", date: messageDate });
        lastUserId = null; // Reset user grouping on new day
      }

      // Determine if we should show header (avatar + name)
      // Show header if: different user, or more than 5 minutes since last message
      const timeDiff = lastMessageTime
        ? (messageDate.getTime() - lastMessageTime.getTime()) / 1000 / 60
        : Infinity;

      const showHeader = lastUserId !== message.user_id || timeDiff > 5;

      result.push({ type: "message", message, showHeader });

      lastDate = messageDate;
      lastUserId = message.user_id;
      lastMessageTime = messageDate;
    });

    return result;
  }, [messages]);

  // Virtual list
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      if (item.type === "date") return 40;
      return item.showHeader ? estimateSize : 32;
    },
    gap,
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      // New message added, scroll to bottom
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Infinite scroll - load more when scrolled to top
  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasMore || loadingMore || !onLoadMore) return;

    const { scrollTop } = parentRef.current;
    if (scrollTop < 100) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Empty state
  if (!loading && messages.length === 0) {
    return (
      <div
        className={cn("flex flex-1 items-center justify-center p-8", className)}
      >
        <p className="text-center text-sm text-muted-foreground">
          No replies yet. Be the first to reply!
        </p>
      </div>
    );
  }

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div ref={parentRef} className={cn("flex-1 overflow-auto", className)}>
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Load more button */}
        {hasMore && !loadingMore && onLoadMore && (
          <div className="flex justify-center py-2">
            <Button variant="ghost" size="sm" onClick={onLoadMore}>
              Load older messages
            </Button>
          </div>
        )}

        {/* Virtualized list */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index];

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === "date" ? (
                  <DateSeparator date={item.date} />
                ) : (
                  <MessageItem
                    message={item.message}
                    isOwnMessage={item.message.user_id === currentUserId}
                    showAvatar={item.showHeader}
                    showName={item.showHeader}
                    onReaction={
                      onReaction
                        ? (emoji) => onReaction(item.message.id, emoji)
                        : undefined
                    }
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom anchor for auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </TooltipProvider>
  );
}

export default ThreadMessageList;
