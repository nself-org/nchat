/**
 * useUnreadCounts Hook
 *
 * Provides unread count tracking functionality:
 * - Per-channel unread counts
 * - Total unread count
 * - Mention counts
 * - Mark channel as read
 * - Subscribe to real-time updates
 */

"use client";

import { useCallback, useMemo } from "react";
import {
  useNotificationStore,
  type UnreadCounts,
} from "@/stores/notification-store";

export interface ChannelUnreadInfo {
  unread: number;
  mentions: number;
  hasUnread: boolean;
  hasMentions: boolean;
}

export interface UseUnreadCountsOptions {
  /**
   * Channel ID to get specific channel counts
   */
  channelId?: string;
}

export interface UseUnreadCountsReturn {
  // Counts
  totalUnread: number;
  totalMentions: number;
  directMessagesUnread: number;
  threadsUnread: number;
  hasUnread: boolean;
  hasMentions: boolean;

  // Channel-specific
  channelUnread: ChannelUnreadInfo;
  getChannelUnread: (channelId: string) => ChannelUnreadInfo;
  allChannelUnreads: Record<string, ChannelUnreadInfo>;

  // Actions
  markChannelAsRead: (channelId: string) => void;
  incrementUnread: (channelId: string, isMention?: boolean) => void;
  decrementUnread: (channelId: string, isMention?: boolean) => void;
  resetAllUnread: () => void;
  setUnreadCounts: (counts: UnreadCounts) => void;
}

export function useUnreadCounts(
  options: UseUnreadCountsOptions = {},
): UseUnreadCountsReturn {
  const { channelId } = options;

  // Store selectors
  const unreadCounts = useNotificationStore((state) => state.unreadCounts);
  const markChannelAsReadAction = useNotificationStore(
    (state) => state.markChannelAsRead,
  );
  const incrementUnreadCount = useNotificationStore(
    (state) => state.incrementUnreadCount,
  );
  const decrementUnreadCount = useNotificationStore(
    (state) => state.decrementUnreadCount,
  );
  const resetChannelUnread = useNotificationStore(
    (state) => state.resetChannelUnread,
  );
  const setUnreadCountsAction = useNotificationStore(
    (state) => state.setUnreadCounts,
  );
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  // Derived values
  const totalUnread = unreadCounts.total;
  const totalMentions = unreadCounts.mentions;
  const directMessagesUnread = unreadCounts.directMessages;
  const threadsUnread = unreadCounts.threads;
  const hasUnread = totalUnread > 0;
  const hasMentions = totalMentions > 0;

  // Get channel unread info
  const getChannelUnread = useCallback(
    (id: string): ChannelUnreadInfo => {
      const counts = unreadCounts.byChannel[id] || { unread: 0, mentions: 0 };
      return {
        unread: counts.unread,
        mentions: counts.mentions,
        hasUnread: counts.unread > 0,
        hasMentions: counts.mentions > 0,
      };
    },
    [unreadCounts.byChannel],
  );

  // Current channel unread (if channelId provided)
  const channelUnread = useMemo((): ChannelUnreadInfo => {
    if (!channelId) {
      return { unread: 0, mentions: 0, hasUnread: false, hasMentions: false };
    }
    return getChannelUnread(channelId);
  }, [channelId, getChannelUnread]);

  // All channel unreads transformed to ChannelUnreadInfo
  const allChannelUnreads = useMemo(() => {
    const result: Record<string, ChannelUnreadInfo> = {};
    for (const [id, counts] of Object.entries(unreadCounts.byChannel)) {
      result[id] = {
        unread: counts.unread,
        mentions: counts.mentions,
        hasUnread: counts.unread > 0,
        hasMentions: counts.mentions > 0,
      };
    }
    return result;
  }, [unreadCounts.byChannel]);

  // Actions
  const markChannelAsRead = useCallback(
    (id: string) => {
      markChannelAsReadAction(id);
    },
    [markChannelAsReadAction],
  );

  const incrementUnread = useCallback(
    (id: string, isMention = false) => {
      incrementUnreadCount(id, isMention);
    },
    [incrementUnreadCount],
  );

  const decrementUnread = useCallback(
    (id: string, isMention = false) => {
      decrementUnreadCount(id, isMention);
    },
    [decrementUnreadCount],
  );

  const resetAllUnread = useCallback(() => {
    // Reset all channel unreads
    Object.keys(unreadCounts.byChannel).forEach((id) => {
      resetChannelUnread(id);
    });
    // Mark all notifications as read
    markAllAsRead();
  }, [unreadCounts.byChannel, resetChannelUnread, markAllAsRead]);

  const setUnreadCounts = useCallback(
    (counts: UnreadCounts) => {
      setUnreadCountsAction(counts);
    },
    [setUnreadCountsAction],
  );

  return {
    // Counts
    totalUnread,
    totalMentions,
    directMessagesUnread,
    threadsUnread,
    hasUnread,
    hasMentions,

    // Channel-specific
    channelUnread,
    getChannelUnread,
    allChannelUnreads,

    // Actions
    markChannelAsRead,
    incrementUnread,
    decrementUnread,
    resetAllUnread,
    setUnreadCounts,
  };
}

/**
 * Convenience hook for a specific channel's unread counts
 */
export function useChannelUnread(channelId: string) {
  const { channelUnread, markChannelAsRead, incrementUnread, decrementUnread } =
    useUnreadCounts({
      channelId,
    });

  const markAsRead = useCallback(() => {
    markChannelAsRead(channelId);
  }, [markChannelAsRead, channelId]);

  const increment = useCallback(
    (isMention = false) => {
      incrementUnread(channelId, isMention);
    },
    [incrementUnread, channelId],
  );

  const decrement = useCallback(
    (isMention = false) => {
      decrementUnread(channelId, isMention);
    },
    [decrementUnread, channelId],
  );

  return {
    ...channelUnread,
    markAsRead,
    increment,
    decrement,
  };
}

export default useUnreadCounts;
