/**
 * useReadReceipts Hook
 *
 * Manages read tracking including marking messages as read,
 * subscribing to read receipts, and tracking who has read what.
 */

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { emit, on, off, isConnected } from "../client";
import {
  SocketEvents,
  type ReadReceiptEvent,
  type ReadChannelEvent,
  type ReadMessageEvent,
} from "../events";

// Throttle read updates (max once per second)
const READ_UPDATE_THROTTLE = 1000;

// Batch read updates (wait 100ms to batch multiple reads)
const READ_BATCH_DELAY = 100;

export interface ReadReceipt {
  userId: string;
  messageId: string;
  readAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface UseReadReceiptsOptions {
  /**
   * Channel ID to track read receipts in
   */
  channelId: string;

  /**
   * Thread ID if tracking in a thread
   */
  threadId?: string;

  /**
   * Current user ID
   */
  userId?: string;

  /**
   * Callback when read receipts change
   */
  onReadReceiptChange?: (receipts: Map<string, ReadReceipt[]>) => void;
}

export interface UseReadReceiptsReturn {
  /**
   * Map of message IDs to their read receipts
   */
  readReceipts: Map<string, ReadReceipt[]>;

  /**
   * Get read receipts for a specific message
   */
  getMessageReaders: (messageId: string) => ReadReceipt[];

  /**
   * Check if a specific user has read a message
   */
  hasUserRead: (messageId: string, userId: string) => boolean;

  /**
   * Mark a message as read
   */
  markAsRead: (messageId: string) => void;

  /**
   * Mark multiple messages as read
   */
  markManyAsRead: (messageIds: string[]) => void;

  /**
   * Last read message ID for current user
   */
  lastReadMessageId: string | null;

  /**
   * Count of users who have read a message
   */
  getReadCount: (messageId: string) => number;
}

/**
 * Hook for managing read receipts
 */
export function useReadReceipts(
  options: UseReadReceiptsOptions,
): UseReadReceiptsReturn {
  const { channelId, threadId, userId, onReadReceiptChange } = options;

  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt[]>>(
    new Map(),
  );
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(
    null,
  );

  // Refs for batching and throttling
  const lastEmitRef = useRef<number>(0);
  const pendingReadsRef = useRef<Set<string>>(new Set());
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onReadReceiptChangeRef = useRef(onReadReceiptChange);

  useEffect(() => {
    onReadReceiptChangeRef.current = onReadReceiptChange;
  }, [onReadReceiptChange]);

  // Flush pending reads
  const flushPendingReads = useCallback(() => {
    if (pendingReadsRef.current.size === 0) return;
    if (!isConnected()) return;

    const now = Date.now();
    if (now - lastEmitRef.current < READ_UPDATE_THROTTLE) {
      // Reschedule
      batchTimeoutRef.current = setTimeout(
        flushPendingReads,
        READ_UPDATE_THROTTLE,
      );
      return;
    }

    const messageIds = Array.from(pendingReadsRef.current);
    pendingReadsRef.current.clear();

    // Emit read update for the latest message (server will mark all previous as read)
    const latestMessageId = messageIds[messageIds.length - 1];
    emit(SocketEvents.READ_UPDATE, {
      channelId,
      threadId,
      messageId: latestMessageId,
    });

    lastEmitRef.current = now;
    setLastReadMessageId(latestMessageId);
  }, [channelId, threadId]);

  // Mark a message as read
  const markAsRead = useCallback(
    (messageId: string) => {
      pendingReadsRef.current.add(messageId);

      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Schedule batch flush
      batchTimeoutRef.current = setTimeout(flushPendingReads, READ_BATCH_DELAY);
    },
    [flushPendingReads],
  );

  // Mark multiple messages as read
  const markManyAsRead = useCallback(
    (messageIds: string[]) => {
      messageIds.forEach((id) => pendingReadsRef.current.add(id));

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(flushPendingReads, READ_BATCH_DELAY);
    },
    [flushPendingReads],
  );

  // Get read receipts for a message
  const getMessageReaders = useCallback(
    (messageId: string): ReadReceipt[] => {
      return readReceipts.get(messageId) || [];
    },
    [readReceipts],
  );

  // Check if a user has read a message
  const hasUserRead = useCallback(
    (messageId: string, targetUserId: string): boolean => {
      const receipts = readReceipts.get(messageId);
      return receipts?.some((r) => r.userId === targetUserId) ?? false;
    },
    [readReceipts],
  );

  // Get read count for a message
  const getReadCount = useCallback(
    (messageId: string): number => {
      return readReceipts.get(messageId)?.length ?? 0;
    },
    [readReceipts],
  );

  // Handle incoming read receipt events
  useEffect(() => {
    if (!channelId) return;

    const handleReadUpdate = (event: ReadReceiptEvent) => {
      // Check if this is for our channel/thread
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      // Ignore own reads
      if (event.userId === userId) return;

      setReadReceipts((prev) => {
        const next = new Map(prev);
        const existing = next.get(event.messageId) || [];

        // Check if already has this user's receipt
        if (existing.some((r) => r.userId === event.userId)) {
          return prev;
        }

        const newReceipt: ReadReceipt = {
          userId: event.userId,
          messageId: event.messageId,
          readAt: event.readAt,
          user: event.user,
        };

        next.set(event.messageId, [...existing, newReceipt]);
        onReadReceiptChangeRef.current?.(next);
        return next;
      });
    };

    const handleReadChannel = (event: ReadChannelEvent) => {
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      setReadReceipts((prev) => {
        const next = new Map(prev);

        event.readers.forEach((reader) => {
          // Skip own reads
          if (reader.userId === userId) return;

          const existing = next.get(reader.messageId) || [];
          if (existing.some((r) => r.userId === reader.userId)) return;

          const newReceipt: ReadReceipt = {
            userId: reader.userId,
            messageId: reader.messageId,
            readAt: reader.readAt,
          };

          next.set(reader.messageId, [...existing, newReceipt]);
        });

        onReadReceiptChangeRef.current?.(next);
        return next;
      });
    };

    const handleReadMessage = (event: ReadMessageEvent) => {
      setReadReceipts((prev) => {
        const next = new Map(prev);
        const newReaders: ReadReceipt[] = event.readers
          .filter((r) => r.userId !== userId)
          .map((r) => ({
            userId: r.userId,
            messageId: event.messageId,
            readAt: r.readAt,
            user: r.user,
          }));

        next.set(event.messageId, newReaders);
        onReadReceiptChangeRef.current?.(next);
        return next;
      });
    };

    on(SocketEvents.READ_UPDATE, handleReadUpdate);
    on(SocketEvents.READ_CHANNEL, handleReadChannel);
    on(SocketEvents.READ_MESSAGE, handleReadMessage);

    return () => {
      off(SocketEvents.READ_UPDATE, handleReadUpdate);
      off(SocketEvents.READ_CHANNEL, handleReadChannel);
      off(SocketEvents.READ_MESSAGE, handleReadMessage);
    };
  }, [channelId, threadId, userId]);

  // Reset on channel change
  useEffect(() => {
    setReadReceipts(new Map());
    setLastReadMessageId(null);
    pendingReadsRef.current.clear();
  }, [channelId, threadId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      // Flush any pending reads
      if (pendingReadsRef.current.size > 0 && isConnected()) {
        const latestMessageId = Array.from(pendingReadsRef.current).pop();
        if (latestMessageId) {
          emit(SocketEvents.READ_UPDATE, {
            channelId,
            threadId,
            messageId: latestMessageId,
          });
        }
      }
    };
  }, [channelId, threadId]);

  return {
    readReceipts,
    getMessageReaders,
    hasUserRead,
    markAsRead,
    markManyAsRead,
    lastReadMessageId,
    getReadCount,
  };
}

/**
 * Hook for tracking unread messages in a channel
 */
export interface UseUnreadMessagesOptions {
  channelId: string;
  threadId?: string;
  userId?: string;
  lastReadMessageId?: string;
}

export function useUnreadMessages(options: UseUnreadMessagesOptions): {
  unreadCount: number;
  firstUnreadMessageId: string | null;
  setLastReadMessageId: (messageId: string) => void;
  resetUnread: () => void;
} {
  const {
    channelId,
    threadId,
    userId,
    lastReadMessageId: initialLastRead,
  } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<
    string | null
  >(null);
  const [lastReadMessageId, setLastReadMessageIdState] = useState<
    string | null
  >(initialLastRead ?? null);

  // Track new messages after last read
  useEffect(() => {
    if (!channelId) return;

    const handleNewMessage = (event: {
      id: string;
      channelId: string;
      threadId?: string;
      userId: string;
    }) => {
      // Check if this is for our channel/thread
      if (event.channelId !== channelId) return;
      if (threadId && event.threadId !== threadId) return;
      if (!threadId && event.threadId) return;

      // Ignore own messages
      if (event.userId === userId) return;

      // Increment unread count
      setUnreadCount((prev) => prev + 1);

      // Set first unread if not set
      setFirstUnreadMessageId((prev) => prev ?? event.id);
    };

    on(SocketEvents.MESSAGE_NEW, handleNewMessage);

    return () => {
      off(SocketEvents.MESSAGE_NEW, handleNewMessage);
    };
  }, [channelId, threadId, userId]);

  // Update last read and reset unread
  const setLastReadMessageId = useCallback((messageId: string) => {
    setLastReadMessageIdState(messageId);
    setUnreadCount(0);
    setFirstUnreadMessageId(null);
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
    setFirstUnreadMessageId(null);
  }, []);

  // Reset on channel change
  useEffect(() => {
    setUnreadCount(0);
    setFirstUnreadMessageId(null);
  }, [channelId, threadId]);

  return {
    unreadCount,
    firstUnreadMessageId,
    setLastReadMessageId,
    resetUnread,
  };
}

/**
 * Hook for intersection observer-based auto-read
 */
export function useAutoRead(
  messageId: string | undefined,
  markAsRead: (messageId: string) => void,
  options: { threshold?: number; rootMargin?: string } = {},
): (element: HTMLElement | null) => void {
  const { threshold = 0.5, rootMargin = "0px" } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasReadRef = useRef(false);

  const setRef = useCallback(
    (element: HTMLElement | null) => {
      // Clean up previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!element || !messageId || hasReadRef.current) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasReadRef.current) {
              hasReadRef.current = true;
              markAsRead(messageId);
              observerRef.current?.disconnect();
            }
          });
        },
        { threshold, rootMargin },
      );

      observerRef.current.observe(element);
    },
    [messageId, markAsRead, threshold, rootMargin],
  );

  // Reset has read when message changes
  useEffect(() => {
    hasReadRef.current = false;
  }, [messageId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return setRef;
}

export default useReadReceipts;
