"use client";

import { memo, useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePullToRefresh } from "@/lib/mobile/use-touch";
import { useSafeArea, useVisualViewport } from "@/lib/mobile/use-viewport";
import { useMobileStore } from "@/lib/mobile/mobile-store";

// ============================================================================
// Types
// ============================================================================

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  createdAt: Date;
  isOwn?: boolean;
}

export interface MobileChannelViewProps {
  channelId: string;
  channelName?: string;
  messages: Message[];
  isLoading?: boolean;
  hasMore?: boolean;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  onScrollToBottom?: () => void;
  renderMessage?: (message: Message, index: number) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  renderInput?: () => React.ReactNode;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Full-screen mobile channel view with optimized scrolling
 * Supports pull-to-refresh and infinite scroll
 */
export const MobileChannelView = memo(function MobileChannelView({
  channelId,
  channelName,
  messages,
  isLoading = false,
  hasMore = true,
  onRefresh,
  onLoadMore,
  onScrollToBottom,
  renderMessage,
  renderHeader,
  renderInput,
  className,
}: MobileChannelViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

  const safeArea = useSafeArea();
  const { keyboardVisible, keyboardHeight } = useVisualViewport();
  const { setBottomNavVisible } = useMobileStore();

  // Pull to refresh
  const { state: pullState, handlers: pullHandlers } = usePullToRefresh({
    threshold: 80,
    maxPull: 120,
    onRefresh: async () => {
      if (onRefresh) {
        await onRefresh();
      }
    },
  });

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Check if at bottom
    const atBottom = distanceFromBottom < 100;
    isAtBottomRef.current = atBottom;

    // Show/hide scroll button
    setShowScrollButton(!atBottom && distanceFromBottom > 300);

    // Reset new message count when at bottom
    if (atBottom && newMessageCount > 0) {
      setNewMessageCount(0);
    }

    // Load more when near top
    if (scrollTop < 200 && hasMore && !isLoadingMore && onLoadMore) {
      setIsLoadingMore(true);
      const previousHeight = scrollHeight;

      onLoadMore().finally(() => {
        setIsLoadingMore(false);
        // Maintain scroll position
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const newHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = newHeight - previousHeight;
          }
        });
      });
    }
  }, [hasMore, isLoadingMore, onLoadMore, newMessageCount]);

  // Scroll to bottom
  const scrollToBottom = useCallback(
    (smooth = true) => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
        setNewMessageCount(0);
        onScrollToBottom?.();
      }
    },
    [onScrollToBottom],
  );

  // Auto-scroll on new messages
  useEffect(() => {
    const newMessagesCount = messages.length - prevMessagesLengthRef.current;

    if (newMessagesCount > 0) {
      if (isAtBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom());
      } else {
        setNewMessageCount((prev) => prev + newMessagesCount);
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [channelId]);

  // Hide bottom nav when keyboard is visible
  useEffect(() => {
    setBottomNavVisible(!keyboardVisible);
  }, [keyboardVisible, setBottomNavVisible]);

  return (
    <div
      className={cn("flex h-full flex-col", "bg-background", className)}
      style={{
        paddingBottom: keyboardVisible ? keyboardHeight : 0,
      }}
    >
      {/* Header */}
      {renderHeader?.()}

      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullState.isPulling || pullState.isRefreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: pullState.pullDistance,
              opacity: pullState.progress,
            }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/30 flex items-center justify-center overflow-hidden"
          >
            <div
              className={cn(
                "transition-transform duration-200",
                pullState.isRefreshing && "animate-spin",
              )}
              style={{
                transform: `rotate(${pullState.progress * 360}deg)`,
              }}
            >
              <Loader2 className="h-5 w-5 text-primary" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        {...pullHandlers}
        className={cn(
          "flex-1 overflow-y-auto",
          "overscroll-contain",
          "-webkit-overflow-scrolling: touch",
        )}
      >
        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <EmptyMessages channelName={channelName} />
        )}

        {/* Loading skeleton */}
        {isLoading && messages.length === 0 && <MessagesSkeleton />}

        {/* Messages list */}
        <div className="space-y-1 px-4 py-2">
          {messages.map((message, index) =>
            renderMessage ? (
              renderMessage(message, index)
            ) : (
              <DefaultMessage key={message.id} message={message} />
            ),
          )}
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-24 right-4 z-10"
          >
            <Button
              onClick={() => scrollToBottom()}
              size="sm"
              className="h-10 rounded-full shadow-lg"
            >
              <ArrowDown className="mr-1 h-4 w-4" />
              {newMessageCount > 0 ? (
                <span>{newMessageCount} new</span>
              ) : (
                <span>Latest</span>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {renderInput?.()}
    </div>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface DefaultMessageProps {
  message: Message;
}

const DefaultMessage = memo(function DefaultMessage({
  message,
}: DefaultMessageProps) {
  return (
    <div className={cn("flex gap-3 py-2", message.isOwn && "flex-row-reverse")}>
      {/* Avatar */}
      <div className="h-8 w-8 shrink-0 rounded-full bg-muted">
        {message.userAvatar ? (
          <img
            src={message.userAvatar}
            alt={message.userName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold">
            {message.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2",
          message.isOwn
            ? "text-primary-foreground rounded-br-sm bg-primary"
            : "rounded-bl-sm bg-muted",
        )}
      >
        {!message.isOwn && (
          <p className="mb-0.5 text-xs font-semibold">{message.userName}</p>
        )}
        <p className="whitespace-pre-wrap break-words text-sm">
          {message.content}
        </p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            message.isOwn
              ? "text-primary-foreground/70"
              : "text-muted-foreground",
          )}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
});

interface EmptyMessagesProps {
  channelName?: string;
}

const EmptyMessages = memo(function EmptyMessages({
  channelName,
}: EmptyMessagesProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="bg-primary/10 mb-4 rounded-full p-4">
        <span className="text-4xl">👋</span>
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        Welcome to {channelName || "this channel"}!
      </h3>
      <p className="text-sm text-muted-foreground">
        This is the very beginning of the conversation.
        <br />
        Say something nice!
      </p>
    </div>
  );
});

const MessagesSkeleton = memo(function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={cn("flex gap-3", i % 3 === 0 && "flex-row-reverse")}
        >
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div
            className={cn(
              "space-y-2 rounded-2xl p-3",
              "animate-pulse bg-muted",
              i % 3 === 0 ? "rounded-br-sm" : "rounded-bl-sm",
            )}
            style={{ width: `${40 + Math.random() * 35}%` }}
          >
            <div className="bg-muted-foreground/20 h-3 w-16 rounded" />
            <div className="bg-muted-foreground/20 h-4 w-full rounded" />
            {i % 2 === 0 && (
              <div className="bg-muted-foreground/20 h-4 w-3/4 rounded" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// Utilities
// ============================================================================

function formatTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default MobileChannelView;
