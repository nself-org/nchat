/**
 * ThreadView Component
 *
 * Complete thread view with:
 * - Parent message display
 * - Thread replies
 * - Reply composer
 * - Thread participants
 * - Thread actions (follow/unfollow, notifications, etc.)
 * - Infinite scroll for pagination
 * - Real-time updates
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Users,
  Bell,
  BellOff,
  X,
  MoreVertical,
  ChevronLeft,
  Loader2,
  ArrowUp,
  Archive,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageItem, CompactMessageItem } from "./message-item";
import { MessageInput } from "./message-input";
import { ThreadSummaryPanel } from "./ThreadSummaryPanel";
import {
  useThread,
  type ThreadMessage as HookThreadMessage,
  type ThreadParticipant,
} from "@/hooks/use-thread";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Message } from "@/types/message";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadViewProps {
  /** Thread ID to display */
  threadId: string;
  /** Callback when thread is closed */
  onClose?: () => void;
  /** Whether to show in standalone mode (full screen) */
  standalone?: boolean;
  /** Whether to use compact header */
  compactHeader?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThreadView({
  threadId,
  onClose,
  standalone = false,
  compactHeader = false,
  className,
}: ThreadViewProps) {
  const { user } = useAuth();
  const { config } = useAppConfig();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Use thread hook
  const {
    thread,
    parentMessage,
    messages,
    participants,
    totalCount,
    hasMore,
    loading,
    loadingMessages,
    error,
    sendReply,
    loadMore,
    markAsRead,
    joinThread,
    leaveThread,
    toggleNotifications,
    isParticipant,
    hasUnread,
    unreadCount,
  } = useThread({
    threadId,
    limit: 50,
    autoSubscribe: true,
  });

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [threadId]); // Only on mount or threadId change

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show scroll to bottom button if scrolled up
    setShowScrollToBottom(distanceFromBottom > 200);

    // Load more when scrolling to top
    if (scrollTop < 100 && hasMore && !loadingMessages) {
      loadMore();
    }
  }, [hasMore, loadingMessages, loadMore]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Handle sending a reply
  const handleSendReply = useCallback(
    async (content: string) => {
      try {
        await sendReply(content);
        scrollToBottom();
      } catch (err) {
        logger.error("Failed to send reply:", err);
      }
    },
    [sendReply, scrollToBottom],
  );

  // Handle follow/unfollow
  const handleToggleFollow = useCallback(async () => {
    try {
      if (isParticipant) {
        await leaveThread();
      } else {
        await joinThread();
      }
    } catch (err) {
      logger.error("Failed to toggle follow:", err);
    }
  }, [isParticipant, joinThread, leaveThread]);

  // Handle notification toggle
  const handleToggleNotifications = useCallback(async () => {
    if (!thread) return;

    try {
      const currentState =
        participants.find((p) => p.user_id === user?.id)
          ?.notifications_enabled ?? true;
      await toggleNotifications(!currentState);
    } catch (err) {
      logger.error("Failed to toggle notifications:", err);
    }
  }, [thread, participants, user?.id, toggleNotifications]);

  // Convert hook messages to component messages
  const componentMessages = messages.map((msg: HookThreadMessage) => ({
    id: msg.id,
    channelId: msg.channel_id,
    content: msg.content,
    type: msg.type as Message["type"],
    userId: msg.user_id,
    user: {
      id: msg.user.id,
      username: msg.user.username,
      displayName: msg.user.display_name,
      avatarUrl: msg.user.avatar_url,
      status: msg.user.status as Message["user"]["status"],
    },
    createdAt: new Date(msg.created_at),
    updatedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
    isEdited: msg.is_edited,
    editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
    attachments: msg.attachments?.map((att: any) => ({
      id: att.id,
      type: (att.file_type || "file") as
        | "image"
        | "video"
        | "audio"
        | "file"
        | "link",
      url: att.file_url,
      name: att.file_name,
      size: att.file_size,
      mimeType: att.file_type,
      width: att.width,
      height: att.height,
      thumbnailUrl: att.thumbnail_url,
    })),
    reactions: msg.reactions?.map((r: any) => ({
      emoji: r.emoji,
      count: 1,
      users: [
        {
          id: r.user.id,
          username: r.user.username,
          displayName: r.user.display_name,
          avatarUrl: r.user.avatar_url,
        },
      ],
      hasReacted: r.user_id === user?.id,
    })),
    isPinned: msg.is_pinned,
    isDeleted: msg.is_deleted,
  }));

  // Get notification status for current user
  const notificationsEnabled =
    participants.find((p) => p.user_id === user?.id)?.notifications_enabled ??
    true;

  // Loading state
  if (loading && !thread) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn("flex h-full items-center justify-center p-8", className)}
      >
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Failed to load thread</p>
          <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  // No thread state
  if (!thread || !parentMessage) {
    return (
      <div
        className={cn("flex h-full items-center justify-center p-8", className)}
      >
        <div className="text-center">
          <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Thread not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b px-4",
          compactHeader ? "py-2" : "py-3",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {standalone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "truncate font-semibold",
                compactHeader && "text-sm",
              )}
            >
              Thread
            </span>
            <Badge variant="secondary" className="shrink-0">
              {totalCount} {totalCount === 1 ? "reply" : "replies"}
            </Badge>
            {hasUnread && (
              <Badge variant="destructive" className="shrink-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Participants dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Users className="h-4 w-4" />
                <span className="ml-1.5">{participants.length}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5 text-sm font-semibold">
                Participants ({participants.length})
              </div>
              <Separator />
              <div className="max-h-64 overflow-y-auto">
                {participants.map((participant: ThreadParticipant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 px-2 py-1.5"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={participant.user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {participant.user.display_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">
                      {participant.user.display_name}
                    </span>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleFollow}>
                {isParticipant ? "Unfollow thread" : "Follow thread"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleNotifications}>
                {notificationsEnabled ? (
                  <>
                    <BellOff className="mr-2 h-4 w-4" />
                    Mute notifications
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Enable notifications
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowSummary(!showSummary)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {showSummary ? "Hide" : "Show"} AI Summary
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={markAsRead} disabled={!hasUnread}>
                Mark as read
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!standalone && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* AI Summary Panel */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b"
          >
            <ThreadSummaryPanel
              messages={componentMessages.map((msg) => ({
                id: msg.id,
                userId: msg.userId,
                userName: msg.user.displayName,
                content: msg.content,
                createdAt: msg.createdAt.toISOString(),
              }))}
              threadId={threadId}
              autoGenerate={false}
              className="border-0"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parent message */}
      <div className="bg-muted/30 border-b p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={parentMessage.user.avatar_url} />
            <AvatarFallback>
              {parentMessage.user.display_name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-sm font-semibold">
                {parentMessage.user.display_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(parentMessage.created_at), "MMM d, h:mm a")}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{parentMessage.content}</p>
          </div>
        </div>
      </div>

      {/* Thread messages */}
      <ScrollArea
        ref={scrollRef}
        className="relative flex-1"
        onScroll={handleScroll}
      >
        {loadingMessages && hasMore && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="space-y-1 p-4">
          <AnimatePresence initial={false}>
            {componentMessages.map((message, index) => (
              <CompactMessageItem
                key={message.id}
                message={message}
                isGrouped={
                  index > 0 &&
                  componentMessages[index - 1].userId === message.userId
                }
                showAvatar={
                  index === 0 ||
                  componentMessages[index - 1].userId !== message.userId
                }
              />
            ))}
          </AnimatePresence>

          {messages.length === 0 && !loadingMessages && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No replies yet. Be the first to reply!
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-20 right-8 z-10"
          >
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply input */}
      <div className="border-t p-4">
        <MessageInput
          channelId={threadId}
          onSend={handleSendReply}
          placeholder={`Reply to thread...`}
          disabled={loadingMessages || !!thread.is_locked}
        />
        {thread.is_locked && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>This thread is locked</span>
          </div>
        )}
      </div>
    </div>
  );
}
