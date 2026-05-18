/**
 * useUnread Hook
 *
 * React hook for tracking and managing unread messages in channels.
 * Integrates with UnreadTracker for persistence and real-time updates.
 *
 * Features:
 * - Automatic unread calculation from messages
 * - Real-time sync across components and tabs
 * - Mark as read/unread actions
 * - First unread message detection
 * - Auto mark-as-read on scroll
 * - Integration with notification store
 */

"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useNotificationStore } from "@/stores/notification-store";
import {
  getUnreadTracker,
  type UnreadPosition,
} from "@/lib/messaging/unread-tracker";
import type { Message } from "@/types/message";

import { logger } from "@/lib/logger";

/**
 * Use a ref to hold the latest value, avoiding stale closures in callbacks
 * without adding the value to dependency arrays.
 */
function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// ============================================================================
// Types
// ============================================================================

export interface UseUnreadOptions {
  /** Channel ID to track */
  channelId: string;
  /** Messages in the channel */
  messages?: Message[];
  /** Auto-mark as read when scrolled to bottom */
  autoMarkRead?: boolean;
  /** Debounce time for auto mark-as-read (ms) */
  autoMarkReadDelay?: number;
}

export interface UnreadInfo {
  /** Total unread count */
  unreadCount: number;
  /** Unread mentions count */
  mentionCount: number;
  /** First unread message ID */
  firstUnreadMessageId?: string;
  /** Last read position */
  lastReadPosition?: UnreadPosition;
  /** Whether there are any unread messages */
  hasUnread: boolean;
  /** Whether there are any unread mentions */
  hasMentions: boolean;
}

export interface UseUnreadReturn extends UnreadInfo {
  /** Mark messages up to a specific message as read */
  markAsRead: (messageId: string) => void;
  /** Mark the channel as fully read (latest message) */
  markChannelAsRead: () => void;
  /** Mark a message as unread (mark from this point) */
  markAsUnread: (messageId: string) => void;
  /** Reset all unread state for this channel */
  resetUnread: () => void;
  /** Check if a specific message is unread */
  isMessageUnread: (message: Message) => boolean;
  /** Recalculate unread counts from messages */
  recalculate: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useUnread(options: UseUnreadOptions): UseUnreadReturn {
  const {
    channelId,
    messages = [],
    autoMarkRead = false,
    autoMarkReadDelay = 1000,
  } = options;

  const { user } = useAuth();
  const tracker = getUnreadTracker();
  const notificationStore = useNotificationStore();
  const notificationStoreRef = useLatestRef(notificationStore);
  const messagesRef = useLatestRef(messages);

  // Local state for unread info
  const [unreadInfo, setUnreadInfo] = useState<UnreadInfo>(() => {
    const position = tracker.getLastReadPosition(channelId);
    const cached = tracker.getCachedUnread(channelId);

    return {
      unreadCount: cached.unreadCount,
      mentionCount: cached.mentionCount,
      lastReadPosition: position,
      hasUnread: cached.unreadCount > 0,
      hasMentions: cached.mentionCount > 0,
    };
  });

  const autoMarkReadTimerRef = useRef<NodeJS.Timeout>(undefined);

  // ========================================================================
  // Initialize tracker
  // ========================================================================

  useEffect(() => {
    if (user?.id) {
      tracker.initialize(user.id);
    }
  }, [user?.id, tracker]);

  // ========================================================================
  // Recalculate unread when messages change
  // ========================================================================

  // Use a stable recalculate that reads messages from a ref to avoid
  // infinite render loops when callers pass a new messages array reference
  // on every render.
  const recalculate = useCallback(() => {
    const currentMessages = messagesRef.current;
    if (!user?.id || currentMessages.length === 0) {
      setUnreadInfo((prev) => {
        const position = tracker.getLastReadPosition(channelId);
        // Bail out if nothing changed to avoid unnecessary re-renders
        if (
          prev.unreadCount === 0 &&
          prev.mentionCount === 0 &&
          !prev.hasUnread &&
          !prev.hasMentions &&
          prev.lastReadPosition === position
        ) {
          return prev;
        }
        return {
          unreadCount: 0,
          mentionCount: 0,
          lastReadPosition: position,
          hasUnread: false,
          hasMentions: false,
        };
      });
      return;
    }

    const result = tracker.calculateUnread(channelId, currentMessages, user.id);
    const position = tracker.getLastReadPosition(channelId);

    setUnreadInfo((prev) => {
      // Bail out if nothing changed to avoid unnecessary re-renders
      if (
        prev.unreadCount === result.unreadCount &&
        prev.mentionCount === result.mentionCount &&
        prev.firstUnreadMessageId === result.firstUnreadMessageId &&
        prev.lastReadPosition === position
      ) {
        return prev;
      }
      return {
        unreadCount: result.unreadCount,
        mentionCount: result.mentionCount,
        firstUnreadMessageId: result.firstUnreadMessageId,
        lastReadPosition: position,
        hasUnread: result.unreadCount > 0,
        hasMentions: result.mentionCount > 0,
      };
    });

    // Sync with notification store (use ref to avoid dependency cycle)
    const store = notificationStoreRef.current;
    if (
      result.unreadCount !== store.unreadCounts.byChannel[channelId]?.unread
    ) {
      store.setUnreadCounts({
        ...store.unreadCounts,
        byChannel: {
          ...store.unreadCounts.byChannel,
          [channelId]: {
            unread: result.unreadCount,
            mentions: result.mentionCount,
          },
        },
      });
    }
    // messages is accessed via messagesRef, not directly, to keep recalculate stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id, tracker, notificationStoreRef, messagesRef]);

  // Derive a stable key from messages to trigger recalculation only when
  // the actual message list content changes, not just the array reference.
  const messagesKey = useMemo(
    () => messages.map((m) => m.id).join(","),
    [messages],
  );

  useEffect(() => {
    recalculate();
  }, [recalculate, messagesKey]);

  // ========================================================================
  // Subscribe to tracker changes
  // ========================================================================

  useEffect(() => {
    const unsubscribe = tracker.subscribe(channelId, () => {
      recalculate();
    });

    return unsubscribe;
  }, [channelId, tracker, recalculate]);

  // ========================================================================
  // Mark as read actions
  // ========================================================================

  const markAsRead = useCallback(
    (messageId: string) => {
      const currentMessages = messagesRef.current;
      const message = currentMessages.find((m) => m.id === messageId);
      if (!message) {
        logger.warn(`Message ${messageId} not found when marking as read`);
        return;
      }

      tracker.markAsRead(channelId, messageId, new Date(message.createdAt));
      notificationStoreRef.current.markChannelAsRead(channelId);

      // Recalculate immediately
      recalculate();
    },
    [channelId, tracker, notificationStoreRef, messagesRef, recalculate],
  );

  const markChannelAsRead = useCallback(() => {
    const currentMessages = messagesRef.current;
    if (currentMessages.length === 0) return;

    const latestMessage = currentMessages[currentMessages.length - 1];
    tracker.markAsRead(
      channelId,
      latestMessage.id,
      new Date(latestMessage.createdAt),
    );
    notificationStoreRef.current.markChannelAsRead(channelId);

    // Recalculate immediately
    recalculate();
  }, [channelId, tracker, notificationStoreRef, messagesRef, recalculate]);

  const markAsUnread = useCallback(
    (messageId: string) => {
      const currentMessages = messagesRef.current;
      const message = currentMessages.find((m) => m.id === messageId);
      if (!message) {
        logger.warn(`Message ${messageId} not found when marking as unread`);
        return;
      }

      tracker.markAsUnread(channelId, messageId, new Date(message.createdAt));

      // Recalculate immediately
      recalculate();
    },
    [channelId, tracker, messagesRef, recalculate],
  );

  const resetUnread = useCallback(() => {
    tracker.resetChannel(channelId);
    notificationStoreRef.current.resetChannelUnread(channelId);

    // Recalculate immediately
    recalculate();
  }, [channelId, tracker, notificationStoreRef, recalculate]);

  // ========================================================================
  // Auto mark as read
  // ========================================================================

  const messageCount = messages.length;
  useEffect(() => {
    if (!autoMarkRead || messageCount === 0) return;

    // Clear existing timer
    if (autoMarkReadTimerRef.current) {
      clearTimeout(autoMarkReadTimerRef.current);
    }

    // Set new timer to mark as read after delay
    autoMarkReadTimerRef.current = setTimeout(() => {
      markChannelAsRead();
    }, autoMarkReadDelay);

    return () => {
      if (autoMarkReadTimerRef.current) {
        clearTimeout(autoMarkReadTimerRef.current);
      }
    };
  }, [autoMarkRead, autoMarkReadDelay, markChannelAsRead, messageCount]);

  // ========================================================================
  // Helper functions
  // ========================================================================

  const isMessageUnread = useCallback(
    (message: Message): boolean => {
      if (!user?.id) return false;
      return tracker.isMessageUnread(channelId, message, user.id);
    },
    [channelId, user?.id, tracker],
  );

  // ========================================================================
  // Return
  // ========================================================================

  return {
    ...unreadInfo,
    markAsRead,
    markChannelAsRead,
    markAsUnread,
    resetUnread,
    isMessageUnread,
    recalculate,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for tracking unread across all channels
 */
export function useAllUnread() {
  const tracker = getUnreadTracker();
  const notificationStore = useNotificationStore();
  const [allStates, setAllStates] = useState(() =>
    tracker.getAllChannelStates(),
  );

  useEffect(() => {
    const unsubscribe = tracker.subscribeAll(() => {
      setAllStates(tracker.getAllChannelStates());
    });

    return unsubscribe;
  }, [tracker]);

  const totalUnread = useMemo(() => {
    return Object.values(allStates).reduce(
      (sum, state) => sum + state.unreadCount,
      0,
    );
  }, [allStates]);

  const totalMentions = useMemo(() => {
    return Object.values(allStates).reduce(
      (sum, state) => sum + state.mentionCount,
      0,
    );
  }, [allStates]);

  const markAllAsRead = useCallback(() => {
    Object.keys(allStates).forEach((channelId) => {
      tracker.resetChannel(channelId);
    });
    notificationStore.markAllAsRead();
  }, [allStates, tracker, notificationStore]);

  return {
    allStates,
    totalUnread,
    totalMentions,
    markAllAsRead,
  };
}

/**
 * Hook for finding next/previous unread channel
 */
export function useUnreadNavigation(currentChannelId?: string) {
  const { allStates } = useAllUnread();

  const unreadChannels = useMemo(() => {
    return Object.entries(allStates)
      .filter(([_, state]) => state.unreadCount > 0)
      .map(([channelId]) => channelId)
      .sort();
  }, [allStates]);

  const mentionChannels = useMemo(() => {
    return Object.entries(allStates)
      .filter(([_, state]) => state.mentionCount > 0)
      .map(([channelId]) => channelId)
      .sort();
  }, [allStates]);

  const getNextUnreadChannel = useCallback(
    (onlyMentions = false): string | null => {
      const channels = onlyMentions ? mentionChannels : unreadChannels;
      if (channels.length === 0) return null;

      if (!currentChannelId) {
        return channels[0];
      }

      const currentIndex = channels.indexOf(currentChannelId);
      if (currentIndex === -1) {
        return channels[0];
      }

      const nextIndex = (currentIndex + 1) % channels.length;
      return channels[nextIndex];
    },
    [currentChannelId, unreadChannels, mentionChannels],
  );

  const getPreviousUnreadChannel = useCallback(
    (onlyMentions = false): string | null => {
      const channels = onlyMentions ? mentionChannels : unreadChannels;
      if (channels.length === 0) return null;

      if (!currentChannelId) {
        return channels[channels.length - 1];
      }

      const currentIndex = channels.indexOf(currentChannelId);
      if (currentIndex === -1) {
        return channels[channels.length - 1];
      }

      const prevIndex =
        currentIndex === 0 ? channels.length - 1 : currentIndex - 1;
      return channels[prevIndex];
    },
    [currentChannelId, unreadChannels, mentionChannels],
  );

  return {
    unreadChannels,
    mentionChannels,
    hasUnreadChannels: unreadChannels.length > 0,
    hasMentionChannels: mentionChannels.length > 0,
    getNextUnreadChannel,
    getPreviousUnreadChannel,
  };
}

export default useUnread;
