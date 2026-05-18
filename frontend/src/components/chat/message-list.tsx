"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useMessageStore } from "@/stores/message-store";
import { MessageItem, MessageGroup } from "./message-item";
import { MessageSkeleton } from "./message-skeleton";
import { MessageEmpty } from "./message-empty";
import { DateSeparator, NewMessagesSeparator } from "./message-system";
import { TypingIndicator, InlineTypingIndicator } from "./typing-indicator";
import type { Message, MessageListItem, TypingUser } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

interface MessageListProps {
  channelId: string;
  channelName?: string;
  channelType?: "public" | "private" | "dm" | "group-dm";
  messages: Message[];
  isLoading?: boolean;
  hasMore?: boolean;
  typingUsers?: TypingUser[];
  lastReadAt?: Date;
  highlightedMessageId?: string;
  onLoadMore?: () => void | Promise<void>;
  onReply?: (message: Message) => void;
  onThread?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onMarkAsRead?: () => void;
  className?: string;
}

export interface MessageListRef {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollToMessage: (messageId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const MESSAGE_GROUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const ESTIMATED_MESSAGE_HEIGHT = 72;
const OVERSCAN = 5;

// ============================================================================
// Component
// ============================================================================

/**
 * Virtualized message list component
 * Uses TanStack Virtual for efficient rendering of large message lists
 */
export const MessageList = forwardRef<MessageListRef, MessageListProps>(
  function MessageList(
    {
      channelId,
      channelName = "general",
      channelType = "public",
      messages,
      isLoading = false,
      hasMore = true,
      typingUsers = [],
      lastReadAt,
      highlightedMessageId,
      onLoadMore,
      onReply,
      onThread,
      onEdit,
      onDelete,
      onReact,
      onRemoveReaction,
      onPin,
      onUnpin,
      onMarkAsRead,
      className,
    },
    ref,
  ) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const isAtBottomRef = useRef(true);
    const previousMessagesLengthRef = useRef(messages.length);

    // Process messages into display items with grouping and separators
    const displayItems = useMemo(() => {
      return processMessages(messages, lastReadAt);
    }, [messages, lastReadAt]);

    // Virtual list setup
    const virtualizer = useVirtualizer({
      count: displayItems.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => {
        const item = displayItems[index];
        if (item.type === "date-separator") return 48;
        if (item.type === "unread-indicator") return 40;
        if (item.type === "new-messages-indicator") return 40;
        if (item.type === "message" && item.isGrouped) return 28;
        return ESTIMATED_MESSAGE_HEIGHT;
      },
      overscan: OVERSCAN,
      getItemKey: (index) => {
        const item = displayItems[index];
        if (item.type === "date-separator")
          return `date-${item.date.toISOString()}`;
        if (item.type === "unread-indicator") return "unread-indicator";
        if (item.type === "new-messages-indicator")
          return "new-messages-indicator";
        return item.message.id;
      },
    });

    const virtualItems = virtualizer.getVirtualItems();

    // Scroll to bottom
    const scrollToBottom = useCallback(
      (behavior: ScrollBehavior = "smooth") => {
        if (parentRef.current) {
          parentRef.current.scrollTo({
            top: parentRef.current.scrollHeight,
            behavior,
          });
        }
      },
      [],
    );

    // Scroll to specific message
    const scrollToMessage = useCallback(
      (messageId: string) => {
        const index = displayItems.findIndex(
          (item) => item.type === "message" && item.message.id === messageId,
        );
        if (index !== -1) {
          virtualizer.scrollToIndex(index, {
            align: "center",
            behavior: "smooth",
          });
        }
      },
      [displayItems, virtualizer],
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      scrollToBottom,
      scrollToMessage,
    }));

    // Handle scroll events
    const handleScroll = useCallback(() => {
      if (!parentRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Check if at bottom (within 100px)
      const atBottom = distanceFromBottom < 100;
      isAtBottomRef.current = atBottom;
      setShowScrollToBottom(!atBottom && distanceFromBottom > 200);

      // Mark as read when scrolled to bottom
      if (atBottom && newMessageCount > 0) {
        setNewMessageCount(0);
        onMarkAsRead?.();
      }

      // Load more when near top
      if (scrollTop < 200 && hasMore && !isLoadingMore && onLoadMore) {
        setIsLoadingMore(true);
        const previousHeight = scrollHeight;

        Promise.resolve(onLoadMore()).finally(() => {
          setIsLoadingMore(false);
          // Maintain scroll position after loading older messages
          requestAnimationFrame(() => {
            if (parentRef.current) {
              const newHeight = parentRef.current.scrollHeight;
              parentRef.current.scrollTop = newHeight - previousHeight;
            }
          });
        });
      }
    }, [hasMore, isLoadingMore, onLoadMore, onMarkAsRead, newMessageCount]);

    // Auto-scroll when new messages arrive (if at bottom)
    useEffect(() => {
      if (messages.length > previousMessagesLengthRef.current) {
        const newMessages = messages.length - previousMessagesLengthRef.current;

        if (isAtBottomRef.current) {
          // Auto-scroll to show new messages
          requestAnimationFrame(() => {
            scrollToBottom("smooth");
          });
        } else {
          // Show new message indicator
          setNewMessageCount((prev) => prev + newMessages);
        }
      }

      previousMessagesLengthRef.current = messages.length;
    }, [messages.length, scrollToBottom]);

    // Initial scroll to bottom
    useEffect(() => {
      if (!isLoading && messages.length > 0) {
        requestAnimationFrame(() => {
          scrollToBottom("instant");
        });
      }
    }, [channelId]); // Only on channel change

    // Scroll to highlighted message
    useEffect(() => {
      if (highlightedMessageId) {
        scrollToMessage(highlightedMessageId);
      }
    }, [highlightedMessageId, scrollToMessage]);

    // Loading state
    if (isLoading && messages.length === 0) {
      return <MessageSkeleton count={8} className={className} />;
    }

    // Empty state
    if (!isLoading && messages.length === 0) {
      return (
        <div className={cn("flex h-full flex-col", className)}>
          <div className="flex-1" />
          <MessageEmpty channelName={channelName} channelType={channelType} />
        </div>
      );
    }

    return (
      <div className={cn("relative flex h-full flex-col", className)}>
        {/* Scroll container */}
        <div
          ref={parentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {/* Loading indicator for older messages */}
          {(isLoadingMore || (hasMore && virtualItems[0]?.index === 0)) && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Virtual list container */}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualItem) => {
              const item = displayItems[virtualItem.index];

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {item.type === "date-separator" ? (
                    <DateSeparator date={item.date} />
                  ) : item.type === "unread-indicator" ? (
                    <NewMessagesSeparator count={item.count} />
                  ) : item.type === "new-messages-indicator" ? (
                    <NewMessagesSeparator count={item.count} />
                  ) : item.type === "message" ? (
                    <MessageItem
                      message={item.message}
                      isGrouped={item.isGrouped}
                      showAvatar={item.showAvatar}
                      isHighlighted={item.message.id === highlightedMessageId}
                      onReply={onReply}
                      onThread={onThread}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReact={onReact}
                      onRemoveReaction={onRemoveReaction}
                      onPin={onPin}
                      onUnpin={onUnpin}
                      onScrollToMessage={scrollToMessage}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <InlineTypingIndicator users={typingUsers} className="px-4 py-2" />
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollToBottom && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
            >
              <Button
                onClick={() => {
                  scrollToBottom();
                  setNewMessageCount(0);
                }}
                className="rounded-full shadow-lg"
                size="sm"
              >
                <ChevronDown className="mr-1 h-4 w-4" />
                {newMessageCount > 0
                  ? `${newMessageCount} new message${newMessageCount > 1 ? "s" : ""}`
                  : "Scroll to bottom"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Process messages into display items with grouping and separators
 */
function processMessages(
  messages: Message[],
  lastReadAt?: Date,
): MessageListItem[] {
  if (messages.length === 0) return [];

  const items: MessageListItem[] = [];
  let lastDate: string | null = null;
  let lastUserId: string | null = null;
  let lastMessageTime: number | null = null;
  let unreadIndicatorAdded = false;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const messageDate = new Date(message.createdAt);
    const dateKey = messageDate.toDateString();

    // Add date separator if new day
    if (dateKey !== lastDate) {
      items.push({
        type: "date-separator",
        date: messageDate,
        label: formatDateLabel(messageDate),
      });
      lastDate = dateKey;
      lastUserId = null;
      lastMessageTime = null;
    }

    // Add unread indicator
    if (!unreadIndicatorAdded && lastReadAt && messageDate > lastReadAt) {
      // Count unread messages
      const unreadCount = messages.slice(i).length;
      items.push({
        type: "unread-indicator",
        count: unreadCount,
        since: lastReadAt,
      });
      unreadIndicatorAdded = true;
    }

    // Determine if message should be grouped
    const shouldGroup =
      message.userId === lastUserId &&
      lastMessageTime !== null &&
      messageDate.getTime() - lastMessageTime < MESSAGE_GROUP_THRESHOLD_MS &&
      message.type === "text" &&
      !message.replyTo;

    items.push({
      type: "message",
      message,
      isGrouped: shouldGroup,
      showAvatar: !shouldGroup,
    });

    lastUserId = message.userId;
    lastMessageTime = messageDate.getTime();
  }

  return items;
}

/**
 * Format date for separator label
 */
function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Simple non-virtualized message list for small lists (e.g., thread panel)
 */
export function SimpleMessageList({
  messages,
  onReply,
  onThread,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  onPin,
  onUnpin,
  className,
}: Omit<MessageListProps, "channelId" | "onLoadMore" | "onMarkAsRead">) {
  const displayItems = useMemo(() => processMessages(messages), [messages]);

  return (
    <div className={cn("space-y-1", className)}>
      {displayItems.map((item, index) => {
        if (item.type === "date-separator") {
          return <DateSeparator key={`date-${index}`} date={item.date} />;
        }

        if (item.type === "unread-indicator") {
          return <NewMessagesSeparator key="unread" count={item.count} />;
        }

        if (item.type === "new-messages-indicator") {
          return <NewMessagesSeparator key="new-messages" count={item.count} />;
        }

        if (item.type !== "message") {
          return null;
        }

        return (
          <MessageItem
            key={item.message.id}
            message={item.message}
            isGrouped={item.isGrouped}
            showAvatar={item.showAvatar}
            isCompact
            onReply={onReply}
            onThread={onThread}
            onEdit={onEdit}
            onDelete={onDelete}
            onReact={onReact}
            onRemoveReaction={onRemoveReaction}
            onPin={onPin}
            onUnpin={onUnpin}
          />
        );
      })}
    </div>
  );
}
