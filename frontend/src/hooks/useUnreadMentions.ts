/**
 * useUnreadMentions Hook
 *
 * Hook for managing unread mentions state and notifications.
 *
 * @example
 * ```typescript
 * const {
 *   unreadCount,
 *   unreadMentions,
 *   markAsRead,
 *   markAllAsRead,
 * } = useUnreadMentions({ userId })
 * ```
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useMentionStore } from "@/lib/mentions/mention-store";
import {
  showMentionNotification,
  playMentionSound,
  shouldDeduplicateNotification,
  createMentionDeduplicationKey,
  updateDocumentTitleWithMentions,
} from "@/lib/mentions/mention-notifications";
import type {
  MentionNotification,
  MentionPreferences,
  MentionType,
} from "@/lib/mentions/mention-types";
import { DEFAULT_MENTION_PREFERENCES } from "@/lib/mentions/mention-types";

// ============================================================================
// Types
// ============================================================================

export interface UseUnreadMentionsOptions {
  /** Current user ID */
  userId?: string;
  /** User's mention preferences */
  preferences?: MentionPreferences;
  /** Whether to show desktop notifications */
  enableDesktopNotifications?: boolean;
  /** Whether to play sounds */
  enableSounds?: boolean;
  /** Whether to update document title */
  updateTitle?: boolean;
  /** Base document title */
  baseTitle?: string;
  /** Channel ID to filter by */
  channelId?: string;
}

export interface UseUnreadMentionsReturn {
  /** Total unread mention count */
  unreadCount: number;
  /** Unread mentions for specific channel (if channelId provided) */
  channelUnreadCount: number;
  /** All unread mentions */
  unreadMentions: MentionNotification[];
  /** All mentions */
  allMentions: MentionNotification[];
  /** Whether mentions are loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  /** Mark a mention as read */
  markAsRead: (mentionId: string) => void;
  /** Mark multiple mentions as read */
  markMultipleAsRead: (mentionIds: string[]) => void;
  /** Mark all mentions as read */
  markAllAsRead: () => void;
  /** Mark all mentions in a channel as read */
  markChannelAsRead: (channelId: string) => void;

  /** Jump to a mention in the UI */
  jumpToMention: (mention: MentionNotification) => void;

  /** Manually add a mention (from subscription) */
  addMention: (mention: MentionNotification) => void;
  /** Refresh mentions from server */
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useUnreadMentions({
  userId,
  preferences = DEFAULT_MENTION_PREFERENCES,
  enableDesktopNotifications = true,
  enableSounds = true,
  updateTitle = true,
  baseTitle = "nchat",
  channelId,
}: UseUnreadMentionsOptions = {}): UseUnreadMentionsReturn {
  // Local state for mentions (in a real app, this would come from the store)
  const [mentions, setMentions] = useState<MentionNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate derived values
  const unreadMentions = useMemo(
    () => mentions.filter((m) => !m.isRead),
    [mentions],
  );

  const unreadCount = unreadMentions.length;

  const channelUnreadCount = useMemo(() => {
    if (!channelId) return 0;
    return unreadMentions.filter((m) => m.channelId === channelId).length;
  }, [unreadMentions, channelId]);

  // Update document title when unread count changes
  useEffect(() => {
    if (updateTitle) {
      updateDocumentTitleWithMentions(baseTitle, unreadCount);
    }
  }, [updateTitle, baseTitle, unreadCount]);

  // Mark as read
  const markAsRead = useCallback((mentionId: string) => {
    setMentions((prev) =>
      prev.map((m) =>
        m.id === mentionId
          ? { ...m, isRead: true, readAt: new Date().toISOString() }
          : m,
      ),
    );
  }, []);

  // Mark multiple as read
  const markMultipleAsRead = useCallback((mentionIds: string[]) => {
    const idSet = new Set(mentionIds);
    const now = new Date().toISOString();
    setMentions((prev) =>
      prev.map((m) =>
        idSet.has(m.id) ? { ...m, isRead: true, readAt: now } : m,
      ),
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setMentions((prev) =>
      prev.map((m) => ({ ...m, isRead: true, readAt: now })),
    );
  }, []);

  // Mark channel as read
  const markChannelAsRead = useCallback((targetChannelId: string) => {
    const now = new Date().toISOString();
    setMentions((prev) =>
      prev.map((m) =>
        m.channelId === targetChannelId
          ? { ...m, isRead: true, readAt: now }
          : m,
      ),
    );
  }, []);

  // Add a new mention
  const addMention = useCallback(
    (mention: MentionNotification) => {
      // Check for deduplication
      const dedupeKey = createMentionDeduplicationKey(
        mention.messageId,
        userId || "",
        mention.mentionType,
      );
      if (shouldDeduplicateNotification(dedupeKey)) {
        return;
      }

      setMentions((prev) => {
        // Don't add if already exists
        if (prev.some((m) => m.id === mention.id)) {
          return prev;
        }
        return [mention, ...prev];
      });

      // Show desktop notification if enabled
      if (enableDesktopNotifications && !mention.isRead) {
        showMentionNotification(mention).catch(() => {
          // Ignore notification errors
        });
      }

      // Play sound if enabled
      if (enableSounds && !mention.isRead) {
        playMentionSound(preferences.mentionSound);
      }
    },
    [
      userId,
      enableDesktopNotifications,
      enableSounds,
      preferences.mentionSound,
    ],
  );

  // Jump to mention
  const jumpToMention = useCallback(
    (mention: MentionNotification) => {
      // Mark as read
      if (!mention.isRead) {
        markAsRead(mention.id);
      }

      // Navigate to the message (this would typically use router)
      // window.location.href = `/chat/${mention.channelSlug}?message=${mention.messageId}`
    },
    [markAsRead],
  );

  // Refresh mentions from server
  const refresh = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch from the API
      // const response = await fetchMentions(userId)
      // setMentions(response.mentions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mentions");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      refresh();
    }
  }, [userId, refresh]);

  return {
    unreadCount,
    channelUnreadCount,
    unreadMentions,
    allMentions: mentions,
    isLoading,
    error,

    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    markChannelAsRead,

    jumpToMention,

    addMention,
    refresh,
  };
}

// ============================================================================
// Channel Unread Mentions Hook
// ============================================================================

export interface UseChannelUnreadMentionsOptions {
  channelId: string;
  userId?: string;
}

export function useChannelUnreadMentions({
  channelId,
  userId,
}: UseChannelUnreadMentionsOptions) {
  const { unreadCount, markChannelAsRead } = useUnreadMentions({
    userId,
    channelId,
  });

  return {
    unreadCount,
    markAsRead: () => markChannelAsRead(channelId),
  };
}

// ============================================================================
// Mention Badge Hook (for sidebar items)
// ============================================================================

export interface UseMentionBadgeOptions {
  channelId: string;
  userId?: string;
  showBadge?: boolean;
}

export function useMentionBadge({
  channelId,
  userId,
  showBadge = true,
}: UseMentionBadgeOptions) {
  const { channelUnreadCount } = useUnreadMentions({
    userId,
    channelId,
  });

  return {
    count: showBadge ? channelUnreadCount : 0,
    show: showBadge && channelUnreadCount > 0,
  };
}

export default useUnreadMentions;
