/**
 * useThreads Hook
 *
 * Complete thread management hook providing:
 * - Thread listing and filtering
 * - Thread search
 * - Thread activity feed
 * - Thread notifications
 * - Real-time updates
 */

"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  GET_CHANNEL_THREADS,
  GET_USER_THREADS,
  GET_UNREAD_THREADS_COUNT,
  SEARCH_CHANNEL_THREADS,
  GET_THREAD_ACTIVITY_FEED,
} from "@/graphql/queries/threads";
import {
  CREATE_THREAD,
  MARK_ALL_THREADS_READ,
} from "@/graphql/mutations/threads";
import { USER_THREADS_SUBSCRIPTION } from "@/graphql/threads";
import { useThreadStore } from "@/stores/thread-store";
import type { Thread, ThreadMessage } from "@/stores/thread-store";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface UseThreadsOptions {
  channelId?: string;
  userId?: string;
  limit?: number;
  autoSubscribe?: boolean;
  searchQuery?: string;
}

export interface UseThreadsReturn {
  // Data
  threads: Thread[];
  unreadCount: number;
  totalThreadCount: number;

  // Loading states
  loading: boolean;
  loadingMore: boolean;

  // Error states
  error: Error | null;

  // Actions
  createThread: (
    parentMessageId: string,
    content: string,
  ) => Promise<Thread | null>;
  markAllAsRead: () => Promise<void>;
  refreshThreads: () => Promise<void>;
  loadMore: () => Promise<void>;
  searchThreads: (query: string) => Promise<void>;

  // Helpers
  hasMore: boolean;
}

export interface ThreadActivityItem {
  id: string;
  type: "new_reply" | "mentioned" | "thread_created";
  threadId: string;
  messageId: string;
  message: ThreadMessage;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  timestamp: Date;
  isRead: boolean;
}

export interface UseThreadActivityReturn {
  // Data
  activityItems: ThreadActivityItem[];

  // Loading states
  loading: boolean;
  loadingMore: boolean;

  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Helpers
  hasMore: boolean;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useThreads({
  channelId,
  userId,
  limit = 20,
  autoSubscribe = true,
  searchQuery,
}: UseThreadsOptions = {}): UseThreadsReturn {
  const { user } = useAuth();
  const currentUserId = userId || user?.id;

  // Store actions
  const { setThreads, setLoadingThreads, setHasMoreThreads, setThreadsCursor } =
    useThreadStore();

  // Determine which query to use
  const useChannelThreads = !!channelId;
  const useUserThreads = !!currentUserId && !channelId;
  const useSearch = !!searchQuery;

  // Query: Get channel threads
  const {
    data: channelThreadsData,
    loading: loadingChannelThreads,
    error: channelThreadsError,
    fetchMore: fetchMoreChannelThreads,
    refetch: refetchChannelThreads,
  } = useQuery(GET_CHANNEL_THREADS, {
    variables: { channelId, limit },
    skip: !useChannelThreads || useSearch,
  });

  // Query: Get user threads
  const {
    data: userThreadsData,
    loading: loadingUserThreads,
    error: userThreadsError,
    fetchMore: fetchMoreUserThreads,
    refetch: refetchUserThreads,
  } = useQuery(GET_USER_THREADS, {
    variables: { userId: currentUserId, limit },
    skip: !useUserThreads || useSearch,
  });

  // Query: Search threads
  const {
    data: searchData,
    loading: loadingSearch,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery(SEARCH_CHANNEL_THREADS, {
    variables: { channelId, searchQuery: `%${searchQuery}%`, limit },
    skip: !useSearch || !channelId,
  });

  // Query: Unread count
  const { data: unreadData, refetch: refetchUnreadCount } = useQuery(
    GET_UNREAD_THREADS_COUNT,
    {
      variables: { userId: currentUserId },
      skip: !currentUserId,
    },
  );

  // Subscribe to user threads updates
  useSubscription(USER_THREADS_SUBSCRIPTION, {
    variables: { userId: currentUserId },
    skip: !currentUserId || !autoSubscribe,
    onData: ({ data }) => {
      if (data.data?.nchat_thread_participants) {
        const threads = data.data.nchat_thread_participants.map(
          (p: { thread: Thread }) => p.thread,
        );
        setThreads(threads);
      }
    },
  });

  // Mutation: Create thread
  const [createThreadMutation, { loading: creatingThread }] =
    useMutation(CREATE_THREAD);

  // Mutation: Mark all as read
  const [markAllReadMutation] = useMutation(MARK_ALL_THREADS_READ);

  // Derived data
  const threads = useMemo(() => {
    if (useSearch && searchData) {
      return searchData.nchat_threads || [];
    }

    if (useChannelThreads && channelThreadsData) {
      return channelThreadsData.nchat_threads || [];
    }

    if (useUserThreads && userThreadsData) {
      return (
        userThreadsData.nchat_thread_participants?.map(
          (p: { thread: Thread }) => p.thread,
        ) || []
      );
    }

    return [];
  }, [
    channelThreadsData,
    userThreadsData,
    searchData,
    useChannelThreads,
    useUserThreads,
    useSearch,
  ]);

  const unreadCount = useMemo(() => {
    return (
      unreadData?.nchat_thread_participants_aggregate?.aggregate?.count || 0
    );
  }, [unreadData]);

  const totalThreadCount = threads.length;

  // Update store when threads change
  useEffect(() => {
    if (threads.length > 0) {
      setThreads(threads);
    }
  }, [threads, setThreads]);

  // Update loading state
  useEffect(() => {
    const isLoading =
      loadingChannelThreads || loadingUserThreads || loadingSearch;
    setLoadingThreads(isLoading);
  }, [
    loadingChannelThreads,
    loadingUserThreads,
    loadingSearch,
    setLoadingThreads,
  ]);

  // Actions
  const createThread = useCallback(
    async (
      parentMessageId: string,
      content: string,
    ): Promise<Thread | null> => {
      if (!user || !channelId) {
        throw new Error("Cannot create thread: missing user or channel");
      }

      try {
        const result = await createThreadMutation({
          variables: {
            channelId,
            parentMessageId,
            userId: user.id,
            content,
          },
        });

        const thread = result.data?.insert_nchat_threads_one;
        if (thread) {
          // Refresh threads to include the new one
          await refreshThreads();
        }

        return thread || null;
      } catch (err) {
        logger.error("Failed to create thread:", err);
        return null;
      }
    },
    [user, channelId, createThreadMutation],
  );

  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;

    try {
      await markAllReadMutation({
        variables: { userId: currentUserId },
      });
      await refetchUnreadCount();
    } catch (err) {
      logger.error("Failed to mark all threads as read:", err);
    }
  }, [currentUserId, markAllReadMutation, refetchUnreadCount]);

  const refreshThreads = useCallback(async () => {
    try {
      if (useSearch) {
        await refetchSearch();
      } else if (useChannelThreads) {
        await refetchChannelThreads();
      } else if (useUserThreads) {
        await refetchUserThreads();
      }
      await refetchUnreadCount();
    } catch (err) {
      logger.error("Failed to refresh threads:", err);
    }
  }, [
    useSearch,
    useChannelThreads,
    useUserThreads,
    refetchSearch,
    refetchChannelThreads,
    refetchUserThreads,
    refetchUnreadCount,
  ]);

  const loadMore = useCallback(async () => {
    try {
      if (useChannelThreads && fetchMoreChannelThreads) {
        await fetchMoreChannelThreads({
          variables: {
            offset: threads.length,
          },
        });
      } else if (useUserThreads && fetchMoreUserThreads) {
        await fetchMoreUserThreads({
          variables: {
            offset: threads.length,
          },
        });
      }
    } catch (err) {
      logger.error("Failed to load more threads:", err);
    }
  }, [
    useChannelThreads,
    useUserThreads,
    threads.length,
    fetchMoreChannelThreads,
    fetchMoreUserThreads,
  ]);

  const searchThreads = useCallback(
    async (query: string) => {
      if (!channelId) return;

      try {
        await refetchSearch({
          channelId,
          searchQuery: `%${query}%`,
          limit,
        });
      } catch (err) {
        logger.error("Failed to search threads:", err);
      }
    },
    [channelId, limit, refetchSearch],
  );

  // Determine if there are more threads to load
  const hasMore = useMemo(() => {
    // For now, assume there are more if we have a full page
    return threads.length >= limit;
  }, [threads.length, limit]);

  useEffect(() => {
    setHasMoreThreads(hasMore);
  }, [hasMore, setHasMoreThreads]);

  return {
    // Data
    threads,
    unreadCount,
    totalThreadCount,

    // Loading states
    loading: loadingChannelThreads || loadingUserThreads || loadingSearch,
    loadingMore: false,

    // Error states
    error: channelThreadsError || userThreadsError || searchError || null,

    // Actions
    createThread,
    markAllAsRead,
    refreshThreads,
    loadMore,
    searchThreads,

    // Helpers
    hasMore,
  };
}

// ============================================================================
// THREAD ACTIVITY HOOK
// ============================================================================

export function useThreadActivity(
  options: { limit?: number } = {},
): UseThreadActivityReturn {
  const { limit = 50 } = options;
  const { user } = useAuth();
  const threads = useThreadStore((state) => state.threads);

  // Query: Get thread activity feed
  const { data, loading, error, fetchMore, refetch } = useQuery(
    GET_THREAD_ACTIVITY_FEED,
    {
      variables: { userId: user?.id, limit },
      skip: !user?.id,
    },
  );

  // Transform messages into activity items
  const activityItems = useMemo<ThreadActivityItem[]>(() => {
    if (!data?.nchat_messages) return [];

    return data.nchat_messages.map(
      (msg: {
        id: string;
        thread_id: string;
        thread: {
          id: string;
          parent_message_id: string;
          channel: {
            id: string;
            name: string;
            slug: string;
          };
        };
        user_id: string;
        content: string;
        created_at: string;
        mentioned_users?: string[];
      }) => {
        // Determine activity type
        let type: ThreadActivityItem["type"] = "new_reply";
        if (msg.mentioned_users?.includes(user?.id || "")) {
          type = "mentioned";
        }
        if (msg.id === msg.thread.parent_message_id) {
          type = "thread_created";
        }

        // Check read state from thread store
        const thread = threads.get(msg.thread.id);
        const lastReadId = thread?.lastReadMessageId;
        const isRead = lastReadId ? msg.id <= lastReadId : false;

        return {
          id: msg.id,
          type,
          threadId: msg.thread.id,
          messageId: msg.id,
          message: msg as unknown as ThreadMessage,
          channel: msg.thread.channel,
          timestamp: new Date(msg.created_at),
          isRead,
        };
      },
    );
  }, [data, user?.id, threads]);

  // Actions
  const loadMoreActivity = useCallback(async () => {
    if (!fetchMore) return;

    try {
      await fetchMore({
        variables: {
          limit,
          offset: activityItems.length,
        },
      });
    } catch (err) {
      logger.error("Failed to load more activity:", err);
    }
  }, [fetchMore, limit, activityItems.length]);

  const refresh = useCallback(async () => {
    try {
      await refetch();
    } catch (err) {
      logger.error("Failed to refresh activity:", err);
    }
  }, [refetch]);

  // Determine if there are more items to load
  const hasMore = useMemo(() => {
    return activityItems.length >= limit;
  }, [activityItems.length, limit]);

  return {
    activityItems,
    loading,
    loadingMore: false,
    loadMore: loadMoreActivity,
    refresh,
    hasMore,
  };
}
