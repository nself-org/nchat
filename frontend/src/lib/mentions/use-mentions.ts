"use client";

/**
 * React Hook for Mentions
 *
 * Provides a convenient interface for working with mentions,
 * including fetching, marking as read, and subscribing to new mentions.
 *
 * @example
 * ```tsx
 * import { useMentions } from '@/lib/mentions/use-mentions'
 *
 * function MentionsPanel() {
 *   const {
 *     mentions,
 *     unreadCount,
 *     markAsRead,
 *     markAllAsRead,
 *     jumpToMention
 *   } = useMentions({ userId: 'user-123' })
 *
 *   // ...
 * }
 * ```
 */

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { useRouter } from "next/navigation";
import {
  useMentionStore,
  normalizeMention,
  type Mention,
  type MentionType,
} from "./mention-store";
import {
  GET_MENTIONS,
  GET_UNREAD_MENTIONS_COUNT,
  GET_MENTION_PERMISSIONS,
  SEARCH_MENTIONABLE_USERS,
  MARK_MENTION_READ,
  MARK_MENTIONS_READ,
  MARK_ALL_MENTIONS_READ,
  MENTION_SUBSCRIPTION,
  UNREAD_MENTIONS_COUNT_SUBSCRIPTION,
} from "@/graphql/mentions";
import { useFeatureEnabled } from "@/lib/features/hooks/use-feature";
import { FEATURES } from "@/lib/features/feature-flags";

// ============================================================================
// Types
// ============================================================================

export interface UseMentionsOptions {
  /** The current user's ID */
  userId: string;
  /** Optional channel ID to filter mentions */
  channelId?: string;
  /** Whether to auto-fetch mentions on mount */
  autoFetch?: boolean;
  /** Whether to subscribe to real-time updates */
  subscribe?: boolean;
  /** Number of mentions to fetch */
  limit?: number;
}

export interface MentionableUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  presence?: {
    status: "online" | "away" | "busy" | "offline";
  };
  role?: string;
}

export interface GroupMentionPermissions {
  canMentionHere: boolean;
  canMentionChannel: boolean;
  canMentionEveryone: boolean;
}

export interface UseMentionsReturn {
  // Data
  mentions: Mention[];
  unreadMentions: Mention[];
  unreadCount: number;
  isFeatureEnabled: boolean;

  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isMarkingRead: boolean;

  // Error state
  error: string | null;

  // Panel controls
  isPanelOpen: boolean;
  panelFilter: "all" | "unread";
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setFilter: (filter: "all" | "unread") => void;

  // Actions
  fetchMentions: () => Promise<void>;
  markAsRead: (mentionId: string) => Promise<void>;
  markMultipleAsRead: (mentionIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  jumpToMention: (mention: Mention) => void;

  // Utilities
  getMentionById: (mentionId: string) => Mention | undefined;
  getMentionsByChannel: (channelId: string) => Mention[];
}

export interface UseMentionAutocompleteOptions {
  /** The search query */
  query: string;
  /** Optional channel ID to prioritize channel members */
  channelId?: string;
  /** Maximum number of results */
  limit?: number;
}

export interface UseMentionAutocompleteReturn {
  users: MentionableUser[];
  isLoading: boolean;
  error: string | null;
}

export interface UseMentionPermissionsOptions {
  userId: string;
  channelId: string;
}

export interface UseMentionPermissionsReturn {
  permissions: GroupMentionPermissions;
  isLoading: boolean;
  canUseGroupMention: (type: MentionType) => boolean;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useMentions({
  userId,
  channelId,
  autoFetch = true,
  subscribe = true,
  limit = 50,
}: UseMentionsOptions): UseMentionsReturn {
  const router = useRouter();
  const isFeatureEnabled = useFeatureEnabled(FEATURES.MESSAGES_MENTIONS);

  // Store state
  const {
    mentions: mentionsMap,
    panel,
    isLoading,
    error,
    setMentions,
    addMention,
    markAsRead: storeMarkAsRead,
    markMultipleAsRead: storeMarkMultipleAsRead,
    markAllAsRead: storeMarkAllAsRead,
    setLoading,
    setError,
    openPanel,
    closePanel,
    togglePanel,
    setFilter,
    getMention,
    getMentionsByChannel,
    getUnreadMentions,
    getAllMentions,
    getUnreadCount,
  } = useMentionStore();

  // GraphQL queries and mutations
  const {
    data: mentionsData,
    loading: queryLoading,
    refetch,
  } = useQuery(GET_MENTIONS, {
    variables: {
      userId,
      limit,
      offset: 0,
      unreadOnly: false,
    },
    skip: !isFeatureEnabled || !autoFetch,
    fetchPolicy: "cache-and-network",
  });

  const [markMentionReadMutation, { loading: markReadLoading }] =
    useMutation(MARK_MENTION_READ);
  const [markMentionsReadMutation] = useMutation(MARK_MENTIONS_READ);
  const [markAllMentionsReadMutation] = useMutation(MARK_ALL_MENTIONS_READ);

  // Subscription for new mentions
  const { data: subscriptionData } = useSubscription(MENTION_SUBSCRIPTION, {
    variables: { userId },
    skip: !isFeatureEnabled || !subscribe,
  });

  // Sync query data to store
  useEffect(() => {
    if (mentionsData?.nchat_mentions) {
      const normalizedMentions =
        mentionsData.nchat_mentions.map(normalizeMention);
      setMentions(normalizedMentions);
    }
  }, [mentionsData, setMentions]);

  // Handle new mentions from subscription
  useEffect(() => {
    if (subscriptionData?.nchat_mentions?.[0]) {
      const newMention = normalizeMention(subscriptionData.nchat_mentions[0]);
      // Only add if not already in store
      if (!getMention(newMention.id)) {
        addMention(newMention);
      }
    }
  }, [subscriptionData, getMention, addMention]);

  // Sync loading state
  useEffect(() => {
    setLoading(queryLoading);
  }, [queryLoading, setLoading]);

  // Memoized values
  const mentions = useMemo(() => getAllMentions(), [mentionsMap]);
  const unreadMentions = useMemo(() => getUnreadMentions(), [mentionsMap]);
  const unreadCount = useMemo(() => getUnreadCount(), [mentionsMap]);

  // Actions
  const fetchMentions = useCallback(async () => {
    if (!isFeatureEnabled) return;
    setLoading(true);
    setError(null);
    try {
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mentions");
    } finally {
      setLoading(false);
    }
  }, [isFeatureEnabled, refetch, setLoading, setError]);

  const markAsRead = useCallback(
    async (mentionId: string) => {
      if (!isFeatureEnabled) return;

      // Optimistic update
      storeMarkAsRead(mentionId);

      try {
        await markMentionReadMutation({
          variables: { mentionId },
        });
      } catch (err) {
        // Revert on error - would need to refetch
        setError(
          err instanceof Error ? err.message : "Failed to mark mention as read",
        );
        await fetchMentions();
      }
    },
    [
      isFeatureEnabled,
      markMentionReadMutation,
      storeMarkAsRead,
      setError,
      fetchMentions,
    ],
  );

  const markMultipleAsRead = useCallback(
    async (mentionIds: string[]) => {
      if (!isFeatureEnabled || mentionIds.length === 0) return;

      // Optimistic update
      storeMarkMultipleAsRead(mentionIds);

      try {
        await markMentionsReadMutation({
          variables: { mentionIds },
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to mark mentions as read",
        );
        await fetchMentions();
      }
    },
    [
      isFeatureEnabled,
      markMentionsReadMutation,
      storeMarkMultipleAsRead,
      setError,
      fetchMentions,
    ],
  );

  const markAllAsRead = useCallback(async () => {
    if (!isFeatureEnabled) return;

    // Optimistic update
    storeMarkAllAsRead();

    try {
      await markAllMentionsReadMutation({
        variables: {
          userId,
          channelId: channelId || null,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to mark all mentions as read",
      );
      await fetchMentions();
    }
  }, [
    isFeatureEnabled,
    userId,
    channelId,
    markAllMentionsReadMutation,
    storeMarkAllAsRead,
    setError,
    fetchMentions,
  ]);

  const jumpToMention = useCallback(
    (mention: Mention) => {
      // Navigate to the channel and message
      const channel = mention.message.channel;
      const messageId = mention.message.id;

      // Mark as read when jumping
      if (!mention.is_read) {
        markAsRead(mention.id);
      }

      // Close the panel
      closePanel();

      // Navigate to the message
      router.push(`/chat/${channel.slug}?message=${messageId}`);
    },
    [markAsRead, closePanel, router],
  );

  return {
    // Data
    mentions,
    unreadMentions,
    unreadCount,
    isFeatureEnabled,

    // Loading states
    isLoading,
    isFetching: queryLoading,
    isMarkingRead: markReadLoading,

    // Error state
    error,

    // Panel controls
    isPanelOpen: panel.isOpen,
    panelFilter: panel.filter,
    openPanel,
    closePanel,
    togglePanel,
    setFilter,

    // Actions
    fetchMentions,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    jumpToMention,

    // Utilities
    getMentionById: getMention,
    getMentionsByChannel,
  };
}

// ============================================================================
// Autocomplete Hook
// ============================================================================

/**
 * Hook for @mention autocomplete functionality
 */
export function useMentionAutocomplete({
  query,
  channelId,
  limit = 10,
}: UseMentionAutocompleteOptions): UseMentionAutocompleteReturn {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.MESSAGES_MENTIONS);

  const { data, loading, error } = useQuery(SEARCH_MENTIONABLE_USERS, {
    variables: {
      search: `%${query}%`,
      channelId,
      limit,
    },
    skip: !isFeatureEnabled || query.length < 1,
    fetchPolicy: "cache-first",
  });

  // Combine and deduplicate channel members and all users
  const users = useMemo(() => {
    if (!data) return [];

    const channelMembers: MentionableUser[] = data.channel_members || [];
    const allUsers: MentionableUser[] = data.all_users || [];

    // Create a map to deduplicate
    const userMap = new Map<string, MentionableUser>();

    // Add channel members first (they have priority)
    for (const user of channelMembers) {
      userMap.set(user.id, user);
    }

    // Add remaining users
    for (const user of allUsers) {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, user);
      }
    }

    return Array.from(userMap.values()).slice(0, limit);
  }, [data, limit]);

  return {
    users,
    isLoading: loading,
    error: error?.message || null,
  };
}

// ============================================================================
// Permissions Hook
// ============================================================================

/**
 * Hook to check group mention permissions (@here, @channel, @everyone)
 */
export function useMentionPermissions({
  userId,
  channelId,
}: UseMentionPermissionsOptions): UseMentionPermissionsReturn {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.MESSAGES_MENTIONS);

  const { data, loading } = useQuery(GET_MENTION_PERMISSIONS, {
    variables: { channelId, userId },
    skip: !isFeatureEnabled || !channelId,
    fetchPolicy: "cache-first",
  });

  const permissions = useMemo((): GroupMentionPermissions => {
    if (!data?.nchat_channel_members?.[0]) {
      return {
        canMentionHere: false,
        canMentionChannel: false,
        canMentionEveryone: false,
      };
    }

    const membership = data.nchat_channel_members[0];
    const role = membership.role;
    const channelSettings = membership.channel?.settings || {};

    // Default permission rules based on role
    const isAdmin = role === "admin" || role === "owner";
    const isModerator = role === "moderator";

    // Check channel-specific settings
    const mentionSettings = channelSettings.mentions || {};

    return {
      canMentionHere:
        mentionSettings.allowHere !== false && (isAdmin || isModerator || true),
      canMentionChannel:
        mentionSettings.allowChannel !== false && (isAdmin || isModerator),
      canMentionEveryone: mentionSettings.allowEveryone !== false && isAdmin,
    };
  }, [data]);

  const canUseGroupMention = useCallback(
    (type: MentionType): boolean => {
      if (!isFeatureEnabled) return false;

      switch (type) {
        case "here":
          return permissions.canMentionHere;
        case "channel":
          return permissions.canMentionChannel;
        case "everyone":
          return permissions.canMentionEveryone;
        default:
          return true;
      }
    },
    [isFeatureEnabled, permissions],
  );

  return {
    permissions,
    isLoading: loading,
    canUseGroupMention,
  };
}

// ============================================================================
// Unread Count Hook
// ============================================================================

/**
 * Hook to get and subscribe to unread mentions count
 */
export function useUnreadMentionsCount(userId: string): {
  count: number;
  isLoading: boolean;
} {
  const isFeatureEnabled = useFeatureEnabled(FEATURES.MESSAGES_MENTIONS);
  const { getUnreadCount } = useMentionStore();

  const { data, loading } = useQuery(GET_UNREAD_MENTIONS_COUNT, {
    variables: { userId },
    skip: !isFeatureEnabled,
    fetchPolicy: "cache-and-network",
    pollInterval: 30000, // Poll every 30 seconds as fallback
  });

  // Subscribe to real-time count updates
  const { data: subscriptionData } = useSubscription(
    UNREAD_MENTIONS_COUNT_SUBSCRIPTION,
    {
      variables: { userId },
      skip: !isFeatureEnabled,
    },
  );

  const count = useMemo(() => {
    // Prefer subscription data, then query data, then store data
    if (
      subscriptionData?.nchat_mentions_aggregate?.aggregate?.count !== undefined
    ) {
      return subscriptionData.nchat_mentions_aggregate.aggregate.count;
    }
    if (data?.nchat_mentions_aggregate?.aggregate?.count !== undefined) {
      return data.nchat_mentions_aggregate.aggregate.count;
    }
    return getUnreadCount();
  }, [data, subscriptionData, getUnreadCount]);

  return {
    count,
    isLoading: loading,
  };
}

// ============================================================================
// Parsing Helpers
// ============================================================================

/**
 * Regular expression to match @mentions in text
 */
export const MENTION_REGEX = /@(\w+|here|channel|everyone)/g;

/**
 * Parse mentions from message content
 */
export function parseMentions(
  content: string,
): Array<{ text: string; start: number; end: number }> {
  const mentions: Array<{ text: string; start: number; end: number }> = [];
  let match;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    mentions.push({
      text: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return mentions;
}

/**
 * Get mention type from mention text
 */
export function getMentionType(mentionText: string): MentionType {
  const lowerText = mentionText.toLowerCase();
  if (lowerText === "here") return "here";
  if (lowerText === "channel") return "channel";
  if (lowerText === "everyone") return "everyone";
  return "user";
}

/**
 * Check if text is a special group mention
 */
export function isSpecialMention(text: string): boolean {
  const lower = text.toLowerCase();
  return lower === "here" || lower === "channel" || lower === "everyone";
}

/**
 * Format mention for display
 */
export function formatMention(type: MentionType, username?: string): string {
  switch (type) {
    case "here":
      return "@here";
    case "channel":
      return "@channel";
    case "everyone":
      return "@everyone";
    default:
      return username ? `@${username}` : "@unknown";
  }
}
