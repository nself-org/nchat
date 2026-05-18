"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  memo,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Message } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface VirtualMessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  isOffline?: boolean;
  onLoadMore?: () => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
  renderMessage: (message: Message, index: number) => React.ReactNode;
  renderDateSeparator?: (date: Date) => React.ReactNode;
  estimatedMessageHeight?: number;
  overscan?: number;
  threshold?: number;
  className?: string;
  onScrollToBottom?: () => void;
  showScrollButton?: boolean;
}

export interface VirtualMessageListRef {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollToTop: (behavior?: ScrollBehavior) => void;
  scrollToIndex: (index: number, options?: ScrollToOptions) => void;
}

interface ScrollToOptions {
  align?: "start" | "center" | "end" | "auto";
  behavior?: ScrollBehavior;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ESTIMATED_HEIGHT = 72;
const DEFAULT_OVERSCAN = 5;
const DEFAULT_THRESHOLD = 200;
const SCROLL_BUTTON_THRESHOLD = 300;

// ============================================================================
// Component
// ============================================================================

/**
 * High-performance virtualized message list for mobile
 *
 * Features:
 * - Virtual scrolling with @tanstack/react-virtual
 * - Smooth 60fps scrolling
 * - Dynamic row heights
 * - Pull-to-refresh support
 * - Infinite scroll
 * - Auto-scroll to bottom for new messages
 * - Scroll-to-top button
 * - Offline indicator
 * - Loading states
 *
 * @example
 * ```tsx
 * <VirtualMessageList
 *   messages={messages}
 *   isLoading={isLoading}
 *   hasMore={hasMore}
 *   onLoadMore={loadOlderMessages}
 *   renderMessage={(msg) => <MessageItem message={msg} />}
 * />
 * ```
 */
export const VirtualMessageList = forwardRef<
  VirtualMessageListRef,
  VirtualMessageListProps
>(function VirtualMessageList(
  {
    messages,
    isLoading = false,
    isLoadingMore = false,
    hasMore = false,
    isOffline = false,
    onLoadMore,
    onRefresh,
    renderMessage,
    renderDateSeparator,
    estimatedMessageHeight = DEFAULT_ESTIMATED_HEIGHT,
    overscan = DEFAULT_OVERSCAN,
    threshold = DEFAULT_THRESHOLD,
    className,
    onScrollToBottom,
    showScrollButton = true,
  },
  ref,
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const isAtBottomRef = useRef(true);
  const previousMessagesLengthRef = useRef(messages.length);
  const touchStartY = useRef(0);

  // Process messages with date separators
  const displayItems = useMemo(() => {
    return processMessagesWithDates(messages, renderDateSeparator);
  }, [messages, renderDateSeparator]);

  // Virtual list setup
  const virtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = displayItems[index];
      return item.type === "separator" ? 48 : estimatedMessageHeight;
    },
    overscan,
    getItemKey: (index) => {
      const item = displayItems[index];
      return item.type === "separator"
        ? `sep-${item.date.toISOString()}`
        : item.message.id;
    },
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (parentRef.current) {
      parentRef.current.scrollTo({
        top: parentRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // Scroll to top
  const scrollToTop = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (parentRef.current) {
      parentRef.current.scrollTo({
        top: 0,
        behavior,
      });
    }
  }, []);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number, options: ScrollToOptions = {}) => {
      const { align = "center", behavior = "smooth" } = options;
      virtualizer.scrollToIndex(index, {
        align,
        behavior: behavior as "auto" | "smooth" | undefined,
      });
    },
    [virtualizer],
  );

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom,
    scrollToTop,
    scrollToIndex,
  }));

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const distanceFromTop = scrollTop;

    // Check if at bottom
    const atBottom = distanceFromBottom < 100;
    isAtBottomRef.current = atBottom;

    // Show/hide scroll to bottom button
    if (showScrollButton) {
      setShowScrollToBottom(
        !atBottom && distanceFromBottom > SCROLL_BUTTON_THRESHOLD,
      );
    }

    // Reset new message count when at bottom
    if (atBottom && newMessageCount > 0) {
      setNewMessageCount(0);
      onScrollToBottom?.();
    }

    // Load more when near top
    if (
      distanceFromTop < threshold &&
      hasMore &&
      !isLoadingMore &&
      onLoadMore
    ) {
      const previousHeight = scrollHeight;
      const previousScrollTop = scrollTop;

      Promise.resolve(onLoadMore()).finally(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (parentRef.current) {
            const newHeight = parentRef.current.scrollHeight;
            const heightDiff = newHeight - previousHeight;
            parentRef.current.scrollTop = previousScrollTop + heightDiff;
          }
        });
      });
    }
  }, [
    hasMore,
    isLoadingMore,
    onLoadMore,
    onScrollToBottom,
    newMessageCount,
    threshold,
    showScrollButton,
  ]);

  // Pull to refresh handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (parentRef.current && parentRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!onRefresh || isRefreshing) return;

      if (parentRef.current && parentRef.current.scrollTop === 0) {
        const touchY = e.touches[0].clientY;
        const distance = touchY - touchStartY.current;

        if (distance > 0) {
          setPullDistance(Math.min(distance, 120));

          // Prevent default scroll when pulling down
          if (distance > 10) {
            e.preventDefault();
          }
        }
      }
    },
    [onRefresh, isRefreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 80 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      Promise.resolve(onRefresh()).finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  }, [pullDistance, onRefresh, isRefreshing]);

  // Auto-scroll when new messages arrive (if at bottom)
  useEffect(() => {
    const newMessagesAdded =
      messages.length - previousMessagesLengthRef.current;

    if (newMessagesAdded > 0) {
      if (isAtBottomRef.current) {
        // Auto-scroll to show new messages
        requestAnimationFrame(() => {
          scrollToBottom("smooth");
        });
      } else {
        // Show new message indicator
        setNewMessageCount((prev) => prev + newMessagesAdded);
      }
    }

    previousMessagesLengthRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && messages.length > 0 && displayItems.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom("instant");
      });
    }
  }, []); // Only on mount

  return (
    <div className={cn("relative flex h-full flex-col", className)}>
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center py-2"
            style={{ height: pullDistance }}
          >
            <motion.div
              animate={{
                rotate: isRefreshing ? 360 : pullDistance > 80 ? 180 : 0,
              }}
              transition={{
                duration: isRefreshing ? 1 : 0.3,
                repeat: isRefreshing ? Infinity : 0,
              }}
            >
              <Loader2 className="h-5 w-5 text-primary" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-destructive/10 flex items-center gap-2 px-4 py-2 text-sm text-destructive">
          <WifiOff className="h-4 w-4" />
          <span>
            You are offline. Messages will be sent when connection is restored.
          </span>
        </div>
      )}

      {/* Scroll container */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto overscroll-y-contain"
        style={{
          // Hardware acceleration for smooth scrolling
          willChange: "transform",
          transform: "translateZ(0)",
          WebkitOverflowScrolling: "touch",
        }}
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
                {item.type === "separator"
                  ? renderDateSeparator?.(item.date)
                  : renderMessage(item.message, virtualItem.index)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
          >
            <Button
              onClick={() => {
                scrollToBottom();
                setNewMessageCount(0);
              }}
              className="h-11 touch-manipulation rounded-full shadow-lg"
              size="sm"
            >
              <ChevronDown className="mr-1 h-4 w-4" />
              {newMessageCount > 0
                ? `${newMessageCount} new${newMessageCount > 1 ? "" : ""}`
                : "Jump to latest"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// Helper Functions
// ============================================================================

type DisplayItem =
  | { type: "message"; message: Message }
  | { type: "separator"; date: Date };

function processMessagesWithDates(
  messages: Message[],
  renderDateSeparator?: (date: Date) => React.ReactNode,
): DisplayItem[] {
  if (!renderDateSeparator || messages.length === 0) {
    return messages.map((message) => ({ type: "message", message }));
  }

  const items: DisplayItem[] = [];
  let lastDate: string | null = null;

  for (const message of messages) {
    const messageDate = new Date(message.createdAt);
    const dateKey = messageDate.toDateString();

    // Add date separator if new day
    if (dateKey !== lastDate) {
      items.push({
        type: "separator",
        date: messageDate,
      });
      lastDate = dateKey;
    }

    items.push({
      type: "message",
      message,
    });
  }

  return items;
}

// ============================================================================
// Memoized Message Wrapper
// ============================================================================

interface VirtualMessageItemProps {
  message: Message;
  index: number;
  renderMessage: (message: Message, index: number) => React.ReactNode;
}

/**
 * Memoized wrapper for virtual list items
 * Prevents unnecessary re-renders
 */
export const VirtualMessageItem = memo(
  function VirtualMessageItem({
    message,
    index,
    renderMessage,
  }: VirtualMessageItemProps) {
    return <>{renderMessage(message, index)}</>;
  },
  (prev, next) => {
    // Only re-render if message or index changes
    return prev.message.id === next.message.id && prev.index === next.index;
  },
);

export default VirtualMessageList;
