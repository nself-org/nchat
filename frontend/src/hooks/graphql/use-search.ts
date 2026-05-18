"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useLazyQuery,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  SEARCH_MESSAGES,
  SEARCH_MESSAGES_FTS,
  SEARCH_FILES,
  SEARCH_USERS,
  SEARCH_CHANNELS,
  SEARCH_ALL,
  QUICK_SEARCH,
  SEARCH_CHANNEL_MESSAGES,
  SEARCH_USER_MESSAGES,
  SEARCH_MESSAGES_BY_DATE,
  GET_RECENT_SEARCHES,
  SAVE_SEARCH,
  CLEAR_SEARCH_HISTORY,
  type SearchMessagesVariables,
  type SearchFilesVariables,
  type SearchUsersVariables,
  type SearchChannelsVariables,
  type SearchAllVariables,
} from "@/graphql/search";

// ============================================================================
// TYPES
// ============================================================================

export interface SearchUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  status?: string;
  status_emoji?: string;
  presence?: {
    status: string;
    last_seen_at: string;
  };
}

export interface SearchChannel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  topic?: string;
  is_private: boolean;
  members_aggregate?: {
    aggregate: {
      count: number;
    };
  };
  creator?: SearchUser;
}

export interface SearchMessage {
  id: string;
  content: string;
  type: string;
  created_at: string;
  user: SearchUser;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  attachments?: Array<{
    id: string;
    file_name: string;
    file_type: string;
  }>;
  parent?: {
    id: string;
    content: string;
  };
}

export interface SearchFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  message?: {
    id: string;
    content: string;
    created_at: string;
    user: SearchUser;
    channel: SearchChannel;
  };
}

export interface SearchHistory {
  id: string;
  query: string;
  type: string;
  result_count: number;
  searched_at: string;
}

export interface SearchFilters {
  channelId?: string;
  userId?: string;
  before?: string;
  after?: string;
  hasAttachments?: boolean;
  fileType?: string;
  type?: string;
}

// Hook return types
export interface UseSearchMessagesReturn {
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  messages: SearchMessage[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  clear: () => void;
}

export interface UseSearchUsersReturn {
  search: (query: string) => Promise<void>;
  users: SearchUser[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  clear: () => void;
}

export interface UseSearchChannelsReturn {
  search: (query: string, type?: string) => Promise<void>;
  channels: SearchChannel[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  clear: () => void;
}

export interface UseSearchFilesReturn {
  search: (
    query: string,
    filters?: { channelId?: string; fileType?: string },
  ) => Promise<void>;
  files: SearchFile[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  clear: () => void;
}

export interface UseSearchAllReturn {
  search: (query: string) => Promise<void>;
  results: {
    messages: SearchMessage[];
    users: SearchUser[];
    channels: SearchChannel[];
    files: SearchFile[];
  };
  loading: boolean;
  error: ApolloError | undefined;
  clear: () => void;
}

export interface UseQuickSearchReturn {
  search: (query: string) => Promise<void>;
  results: {
    channels: Array<{
      id: string;
      name: string;
      slug: string;
      type: string;
      icon?: string;
    }>;
    users: Array<{
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
      presence?: { status: string };
    }>;
  };
  loading: boolean;
  error: ApolloError | undefined;
  clear: () => void;
}

export interface UseSearchHistoryReturn {
  history: SearchHistory[];
  loading: boolean;
  error: ApolloError | undefined;
  saveSearch: (
    query: string,
    type: string,
    resultCount: number,
  ) => Promise<void>;
  clearHistory: () => Promise<void>;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Search messages with filters and pagination
 */
export function useSearchMessages(limit = 20): UseSearchMessagesReturn {
  const [searchQuery, { data, loading, error, fetchMore }] =
    useLazyQuery(SEARCH_MESSAGES);
  const [searchParams, setSearchParams] = useState<{
    query: string;
    filters: SearchFilters;
  } | null>(null);

  const search = useCallback(
    async (query: string, filters?: SearchFilters) => {
      const searchPattern = `%${query}%`;
      setSearchParams({ query, filters: filters ?? {} });

      await searchQuery({
        variables: {
          query: searchPattern,
          channelId: filters?.channelId,
          userId: filters?.userId,
          before: filters?.before,
          after: filters?.after,
          hasAttachments: filters?.hasAttachments,
          limit,
          offset: 0,
        },
      });
    },
    [searchQuery, limit],
  );

  const messages = useMemo(() => {
    return data?.nchat_messages ?? [];
  }, [data]);

  const totalCount = data?.nchat_messages_aggregate?.aggregate?.count ?? 0;
  const hasMore = messages.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !searchParams) return;

    const searchPattern = `%${searchParams.query}%`;

    await fetchMore({
      variables: {
        query: searchPattern,
        channelId: searchParams.filters.channelId,
        userId: searchParams.filters.userId,
        before: searchParams.filters.before,
        after: searchParams.filters.after,
        hasAttachments: searchParams.filters.hasAttachments,
        limit,
        offset: messages.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_messages: [
            ...prev.nchat_messages,
            ...fetchMoreResult.nchat_messages,
          ],
        };
      },
    });
  }, [hasMore, loading, searchParams, messages.length, limit, fetchMore]);

  const clear = useCallback(() => {
    setSearchParams(null);
  }, []);

  return {
    search,
    messages,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    clear,
  };
}

/**
 * Full-text search messages using PostgreSQL FTS
 */
export function useSearchMessagesFTS(limit = 20) {
  const [searchQuery, { data, loading, error, fetchMore }] =
    useLazyQuery(SEARCH_MESSAGES_FTS);
  const [searchParams, setSearchParams] = useState<{
    query: string;
    channelId?: string;
  } | null>(null);

  const search = useCallback(
    async (query: string, channelId?: string) => {
      setSearchParams({ query, channelId });

      await searchQuery({
        variables: {
          query,
          channelId,
          limit,
          offset: 0,
        },
      });
    },
    [searchQuery, limit],
  );

  const messages = useMemo(() => {
    return data?.search_messages ?? [];
  }, [data]);

  const loadMore = useCallback(async () => {
    if (loading || !searchParams) return;

    await fetchMore({
      variables: {
        query: searchParams.query,
        channelId: searchParams.channelId,
        limit,
        offset: messages.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          search_messages: [
            ...prev.search_messages,
            ...fetchMoreResult.search_messages,
          ],
        };
      },
    });
  }, [loading, searchParams, messages.length, limit, fetchMore]);

  const clear = useCallback(() => {
    setSearchParams(null);
  }, []);

  return {
    search,
    messages,
    loading,
    error,
    loadMore,
    clear,
  };
}

/**
 * Search users
 */
export function useSearchUsers(limit = 20): UseSearchUsersReturn {
  const [searchQuery, { data, loading, error, fetchMore }] =
    useLazyQuery(SEARCH_USERS);
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);

  const search = useCallback(
    async (query: string) => {
      const searchPattern = `%${query}%`;
      setCurrentQuery(query);

      await searchQuery({
        variables: {
          query: searchPattern,
          limit,
          offset: 0,
        },
      });
    },
    [searchQuery, limit],
  );

  const users = useMemo(() => {
    return data?.nchat_users ?? [];
  }, [data]);

  const totalCount = data?.nchat_users_aggregate?.aggregate?.count ?? 0;
  const hasMore = users.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !currentQuery) return;

    const searchPattern = `%${currentQuery}%`;

    await fetchMore({
      variables: {
        query: searchPattern,
        limit,
        offset: users.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_users: [...prev.nchat_users, ...fetchMoreResult.nchat_users],
        };
      },
    });
  }, [hasMore, loading, currentQuery, users.length, limit, fetchMore]);

  const clear = useCallback(() => {
    setCurrentQuery(null);
  }, []);

  return {
    search,
    users,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    clear,
  };
}

/**
 * Search channels
 */
export function useSearchChannels(limit = 20): UseSearchChannelsReturn {
  const [searchQuery, { data, loading, error, fetchMore }] =
    useLazyQuery(SEARCH_CHANNELS);
  const [searchParams, setSearchParams] = useState<{
    query: string;
    type?: string;
  } | null>(null);

  const search = useCallback(
    async (query: string, type?: string) => {
      const searchPattern = `%${query}%`;
      setSearchParams({ query, type });

      await searchQuery({
        variables: {
          query: searchPattern,
          type,
          limit,
          offset: 0,
        },
      });
    },
    [searchQuery, limit],
  );

  const channels = useMemo(() => {
    return data?.nchat_channels ?? [];
  }, [data]);

  const totalCount = data?.nchat_channels_aggregate?.aggregate?.count ?? 0;
  const hasMore = channels.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !searchParams) return;

    const searchPattern = `%${searchParams.query}%`;

    await fetchMore({
      variables: {
        query: searchPattern,
        type: searchParams.type,
        limit,
        offset: channels.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_channels: [
            ...prev.nchat_channels,
            ...fetchMoreResult.nchat_channels,
          ],
        };
      },
    });
  }, [hasMore, loading, searchParams, channels.length, limit, fetchMore]);

  const clear = useCallback(() => {
    setSearchParams(null);
  }, []);

  return {
    search,
    channels,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    clear,
  };
}

/**
 * Search files/attachments
 */
export function useSearchFiles(limit = 20): UseSearchFilesReturn {
  const [searchQuery, { data, loading, error, fetchMore }] =
    useLazyQuery(SEARCH_FILES);
  const [searchParams, setSearchParams] = useState<{
    query: string;
    channelId?: string;
    fileType?: string;
  } | null>(null);

  const search = useCallback(
    async (
      query: string,
      filters?: { channelId?: string; fileType?: string },
    ) => {
      const searchPattern = `%${query}%`;
      const fileTypePattern = filters?.fileType
        ? `%${filters.fileType}%`
        : undefined;

      setSearchParams({
        query,
        channelId: filters?.channelId,
        fileType: filters?.fileType,
      });

      await searchQuery({
        variables: {
          query: searchPattern,
          channelId: filters?.channelId,
          fileType: fileTypePattern,
          limit,
          offset: 0,
        },
      });
    },
    [searchQuery, limit],
  );

  const files = useMemo(() => {
    return data?.nchat_attachments ?? [];
  }, [data]);

  const totalCount = data?.nchat_attachments_aggregate?.aggregate?.count ?? 0;
  const hasMore = files.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !searchParams) return;

    const searchPattern = `%${searchParams.query}%`;
    const fileTypePattern = searchParams.fileType
      ? `%${searchParams.fileType}%`
      : undefined;

    await fetchMore({
      variables: {
        query: searchPattern,
        channelId: searchParams.channelId,
        fileType: fileTypePattern,
        limit,
        offset: files.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          ...fetchMoreResult,
          nchat_attachments: [
            ...prev.nchat_attachments,
            ...fetchMoreResult.nchat_attachments,
          ],
        };
      },
    });
  }, [hasMore, loading, searchParams, files.length, limit, fetchMore]);

  const clear = useCallback(() => {
    setSearchParams(null);
  }, []);

  return {
    search,
    files,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    clear,
  };
}

/**
 * Combined search across all entities
 */
export function useSearchAll(limit = 5): UseSearchAllReturn {
  const [searchQuery, { data, loading, error }] = useLazyQuery(SEARCH_ALL);

  const search = useCallback(
    async (query: string) => {
      const searchPattern = `%${query}%`;

      await searchQuery({
        variables: {
          query: searchPattern,
          limit,
        },
      });
    },
    [searchQuery, limit],
  );

  const results = useMemo(
    () => ({
      messages: data?.messages ?? [],
      users: data?.users ?? [],
      channels: data?.channels ?? [],
      files: data?.files ?? [],
    }),
    [data],
  );

  const clear = useCallback(() => {
    // Reset search state if needed
  }, []);

  return {
    search,
    results,
    loading,
    error,
    clear,
  };
}

/**
 * Quick search for command palette / spotlight
 */
export function useQuickSearch(limit = 8): UseQuickSearchReturn {
  const [searchQuery, { data, loading, error }] = useLazyQuery(QUICK_SEARCH);

  const search = useCallback(
    async (query: string) => {
      const searchPattern = `%${query}%`;

      await searchQuery({
        variables: {
          query: searchPattern,
          limit,
        },
      });
    },
    [searchQuery, limit],
  );

  const results = useMemo(
    () => ({
      channels: data?.channels ?? [],
      users: data?.users ?? [],
    }),
    [data],
  );

  const clear = useCallback(() => {
    // Reset search state if needed
  }, []);

  return {
    search,
    results,
    loading,
    error,
    clear,
  };
}

/**
 * Search messages in a specific channel
 */
export function useSearchChannelMessages(channelId: string, limit = 20) {
  const [searchQuery, { data, loading, error, fetchMore }] = useLazyQuery(
    SEARCH_CHANNEL_MESSAGES,
  );
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);

  const search = useCallback(
    async (query: string) => {
      const searchPattern = `%${query}%`;
      setCurrentQuery(query);

      await searchQuery({
        variables: {
          channelId,
          query: searchPattern,
          limit,
          offset: 0,
        },
      });
    },
    [channelId, searchQuery, limit],
  );

  const messages = useMemo(() => {
    return data?.nchat_messages ?? [];
  }, [data]);

  const loadMore = useCallback(async () => {
    if (loading || !currentQuery) return;

    const searchPattern = `%${currentQuery}%`;

    await fetchMore({
      variables: {
        channelId,
        query: searchPattern,
        limit,
        offset: messages.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          nchat_messages: [
            ...prev.nchat_messages,
            ...fetchMoreResult.nchat_messages,
          ],
        };
      },
    });
  }, [channelId, loading, currentQuery, messages.length, limit, fetchMore]);

  const clear = useCallback(() => {
    setCurrentQuery(null);
  }, []);

  return {
    search,
    messages,
    loading,
    error,
    loadMore,
    clear,
  };
}

/**
 * Search messages from a specific user
 */
export function useSearchUserMessages(userId: string, limit = 20) {
  const [searchQuery, { data, loading, error, fetchMore }] =
    useLazyQuery(SEARCH_USER_MESSAGES);
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);

  const search = useCallback(
    async (query: string) => {
      const searchPattern = `%${query}%`;
      setCurrentQuery(query);

      await searchQuery({
        variables: {
          userId,
          query: searchPattern,
          limit,
          offset: 0,
        },
      });
    },
    [userId, searchQuery, limit],
  );

  const messages = useMemo(() => {
    return data?.nchat_messages ?? [];
  }, [data]);

  const loadMore = useCallback(async () => {
    if (loading || !currentQuery) return;

    const searchPattern = `%${currentQuery}%`;

    await fetchMore({
      variables: {
        userId,
        query: searchPattern,
        limit,
        offset: messages.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        return {
          nchat_messages: [
            ...prev.nchat_messages,
            ...fetchMoreResult.nchat_messages,
          ],
        };
      },
    });
  }, [userId, loading, currentQuery, messages.length, limit, fetchMore]);

  const clear = useCallback(() => {
    setCurrentQuery(null);
  }, []);

  return {
    search,
    messages,
    loading,
    error,
    loadMore,
    clear,
  };
}

/**
 * Search messages by date range
 */
export function useSearchMessagesByDate(limit = 50) {
  const [searchQuery, { data, loading, error }] = useLazyQuery(
    SEARCH_MESSAGES_BY_DATE,
  );

  const search = useCallback(
    async (
      query: string,
      startDate: string,
      endDate: string,
      channelId?: string,
    ) => {
      const searchPattern = `%${query}%`;

      await searchQuery({
        variables: {
          query: searchPattern,
          startDate,
          endDate,
          channelId,
          limit,
        },
      });
    },
    [searchQuery, limit],
  );

  const messages = useMemo(() => {
    return data?.nchat_messages ?? [];
  }, [data]);

  return {
    search,
    messages,
    loading,
    error,
  };
}

/**
 * Search history management
 */
export function useSearchHistory(): UseSearchHistoryReturn {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_RECENT_SEARCHES, {
    variables: { userId: user?.id, limit: 10 },
    skip: !user?.id,
  });

  const [saveSearchMutation] = useMutation(SAVE_SEARCH);
  const [clearHistoryMutation] = useMutation(CLEAR_SEARCH_HISTORY);

  const history = useMemo(() => {
    return data?.nchat_search_history ?? [];
  }, [data]);

  const saveSearch = useCallback(
    async (query: string, type: string, resultCount: number) => {
      if (!user) return;

      await saveSearchMutation({
        variables: {
          userId: user.id,
          query,
          type,
          resultCount,
        },
        update: (cache, { data }) => {
          if (data?.insert_nchat_search_history_one) {
            cache.modify({
              fields: {
                nchat_search_history(existingHistory = []) {
                  return [
                    data.insert_nchat_search_history_one,
                    ...existingHistory,
                  ];
                },
              },
            });
          }
        },
      });
    },
    [user, saveSearchMutation],
  );

  const clearHistory = useCallback(async () => {
    if (!user) return;

    await clearHistoryMutation({
      variables: { userId: user.id },
      update: (cache) => {
        cache.modify({
          fields: {
            nchat_search_history() {
              return [];
            },
          },
        });
      },
    });
  }, [user, clearHistoryMutation]);

  return {
    history,
    loading,
    error,
    saveSearch,
    clearHistory,
    refetch: async () => {
      await refetch();
    },
  };
}

export default useSearchMessages;
