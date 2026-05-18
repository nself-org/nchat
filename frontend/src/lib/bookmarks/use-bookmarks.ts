"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useSubscription,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import {
  useBookmarkStore,
  type Bookmark,
  type BookmarkFolder,
  type SortBy,
  type SortOrder,
} from "./bookmark-store";
import { logger } from "@/lib/logger";
import {
  GET_BOOKMARKS,
  GET_BOOKMARK_COUNT,
  CHECK_BOOKMARK,
  SEARCH_BOOKMARKS,
  GET_RECENT_BOOKMARKS,
  ADD_BOOKMARK,
  REMOVE_BOOKMARK,
  REMOVE_BOOKMARK_BY_MESSAGE,
  UPDATE_BOOKMARK,
  DELETE_ALL_BOOKMARKS,
  BOOKMARKS_SUBSCRIPTION,
  BOOKMARK_COUNT_SUBSCRIPTION,
} from "@/graphql/bookmarks";

// ============================================================================
// Types
// ============================================================================

export interface UseBookmarksOptions {
  limit?: number;
  channelId?: string;
  autoSubscribe?: boolean;
}

export interface UseBookmarksReturn {
  bookmarks: Bookmark[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  error: ApolloError | undefined;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseBookmarkReturn {
  isBookmarked: boolean;
  bookmark: Bookmark | undefined;
  loading: boolean;
  toggleBookmark: (note?: string) => Promise<void>;
  addBookmark: (note?: string) => Promise<Bookmark | null>;
  removeBookmark: () => Promise<boolean>;
  updateNote: (note: string) => Promise<boolean>;
}

export interface UseBookmarkActionsReturn {
  addBookmark: (messageId: string, note?: string) => Promise<Bookmark | null>;
  removeBookmark: (bookmarkId: string) => Promise<boolean>;
  removeBookmarkByMessage: (messageId: string) => Promise<boolean>;
  toggleBookmark: (
    messageId: string,
    note?: string,
  ) => Promise<{ action: "added" | "removed"; bookmark?: Bookmark }>;
  updateNote: (bookmarkId: string, note: string) => Promise<boolean>;
  clearAllBookmarks: () => Promise<number>;
  loading: boolean;
  error: ApolloError | undefined;
}

export interface UseBookmarkFoldersReturn {
  folders: BookmarkFolder[];
  loading: boolean;
  error: ApolloError | undefined;
  createFolder: (
    name: string,
    color?: string,
    icon?: string,
  ) => Promise<BookmarkFolder | null>;
  updateFolder: (
    folderId: string,
    updates: Partial<BookmarkFolder>,
  ) => Promise<boolean>;
  deleteFolder: (folderId: string) => Promise<boolean>;
  moveBookmarkToFolder: (
    bookmarkId: string,
    folderId: string | null,
  ) => Promise<boolean>;
}

export interface UseBookmarkSearchReturn {
  results: Bookmark[];
  loading: boolean;
  error: ApolloError | undefined;
  search: (query: string) => void;
  clearSearch: () => void;
}

export interface UseBookmarkFiltersReturn {
  selectedFolderId: string | null;
  selectedChannelFilter: string | null;
  searchQuery: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
  filteredBookmarks: Bookmark[];
  setFolderFilter: (folderId: string | null) => void;
  setChannelFilter: (channelId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  clearFilters: () => void;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all bookmarks for the current user with pagination
 */
export function useBookmarks({
  limit = 50,
  channelId,
  autoSubscribe = true,
}: UseBookmarksOptions = {}): UseBookmarksReturn {
  const { user } = useAuth();
  const store = useBookmarkStore();

  const { data, loading, error, fetchMore, refetch } = useQuery(GET_BOOKMARKS, {
    variables: {
      userId: user?.id,
      limit,
      offset: 0,
      channelId: channelId || null,
    },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.nchat_bookmarks) {
        store.setBookmarks(data.nchat_bookmarks);
        store.setTotalCount(
          data.nchat_bookmarks_aggregate?.aggregate?.count ?? 0,
        );
        store.setHasMoreBookmarks(
          data.nchat_bookmarks.length <
            (data.nchat_bookmarks_aggregate?.aggregate?.count ?? 0),
        );
      }
    },
  });

  // Subscribe to bookmark changes
  useSubscription(BOOKMARKS_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id || !autoSubscribe,
    onData: ({ data: subData }) => {
      if (subData.data?.nchat_bookmarks) {
        store.setBookmarks(subData.data.nchat_bookmarks);
      }
    },
  });

  // Subscribe to bookmark count
  useSubscription(BOOKMARK_COUNT_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id || !autoSubscribe,
    onData: ({ data: subData }) => {
      if (
        subData.data?.nchat_bookmarks_aggregate?.aggregate?.count !== undefined
      ) {
        store.setTotalCount(
          subData.data.nchat_bookmarks_aggregate.aggregate.count,
        );
      }
    },
  });

  const bookmarks = useMemo(() => {
    return data?.nchat_bookmarks ?? [];
  }, [data]);

  const totalCount = data?.nchat_bookmarks_aggregate?.aggregate?.count ?? 0;
  const hasMore = bookmarks.length < totalCount;

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    await fetchMore({
      variables: {
        userId: user?.id,
        limit,
        offset: bookmarks.length,
        channelId: channelId || null,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;

        const newBookmarks = [
          ...prev.nchat_bookmarks,
          ...fetchMoreResult.nchat_bookmarks,
        ];

        // Update store
        store.setBookmarks(newBookmarks);

        return {
          ...fetchMoreResult,
          nchat_bookmarks: newBookmarks,
        };
      },
    });
  }, [
    user?.id,
    limit,
    channelId,
    bookmarks.length,
    hasMore,
    loading,
    fetchMore,
    store,
  ]);

  return {
    bookmarks,
    totalCount,
    hasMore,
    loading,
    error,
    loadMore,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Check if a specific message is bookmarked and provide actions
 */
export function useBookmark(messageId: string): UseBookmarkReturn {
  const { user } = useAuth();
  const store = useBookmarkStore();

  const { data, loading, refetch } = useQuery(CHECK_BOOKMARK, {
    variables: {
      userId: user?.id,
      messageId,
    },
    skip: !user?.id || !messageId,
    fetchPolicy: "cache-first",
  });

  const [addBookmarkMutation, { loading: addLoading }] =
    useMutation(ADD_BOOKMARK);
  const [removeBookmarkMutation, { loading: removeLoading }] = useMutation(
    REMOVE_BOOKMARK_BY_MESSAGE,
  );
  const [updateBookmarkMutation, { loading: updateLoading }] =
    useMutation(UPDATE_BOOKMARK);

  const existingBookmark = data?.nchat_bookmarks?.[0];
  const isBookmarked = !!existingBookmark;
  const storeBookmark = store.getBookmarkByMessageId(messageId);

  const addBookmark = useCallback(
    async (note?: string): Promise<Bookmark | null> => {
      if (!user?.id || !messageId) return null;

      try {
        const result = await addBookmarkMutation({
          variables: {
            userId: user.id,
            messageId,
            note,
          },
        });

        const newBookmark = result.data?.insert_nchat_bookmarks_one;
        if (newBookmark) {
          await refetch();
        }

        return newBookmark ?? null;
      } catch (error) {
        logger.error("Failed to add bookmark:", error);
        throw error;
      }
    },
    [user?.id, messageId, addBookmarkMutation, refetch],
  );

  const removeBookmark = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !messageId) return false;

    try {
      const result = await removeBookmarkMutation({
        variables: {
          userId: user.id,
          messageId,
        },
      });

      if (result.data?.delete_nchat_bookmarks?.affected_rows) {
        store.removeBookmarkByMessageId(messageId);
        await refetch();
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Failed to remove bookmark:", error);
      throw error;
    }
  }, [user?.id, messageId, removeBookmarkMutation, store, refetch]);

  const toggleBookmark = useCallback(
    async (note?: string): Promise<void> => {
      if (isBookmarked) {
        await removeBookmark();
      } else {
        await addBookmark(note);
      }
    },
    [isBookmarked, addBookmark, removeBookmark],
  );

  const updateNote = useCallback(
    async (note: string): Promise<boolean> => {
      if (!existingBookmark?.id) return false;

      try {
        const result = await updateBookmarkMutation({
          variables: {
            bookmarkId: existingBookmark.id,
            note,
          },
        });

        if (result.data?.update_nchat_bookmarks_by_pk) {
          store.updateBookmark(existingBookmark.id, { note });
          return true;
        }

        return false;
      } catch (error) {
        logger.error("Failed to update bookmark note:", error);
        throw error;
      }
    },
    [existingBookmark?.id, updateBookmarkMutation, store],
  );

  return {
    isBookmarked,
    bookmark: storeBookmark,
    loading: loading || addLoading || removeLoading || updateLoading,
    toggleBookmark,
    addBookmark,
    removeBookmark,
    updateNote,
  };
}

/**
 * Bookmark actions without being tied to a specific message
 */
export function useBookmarkActions(): UseBookmarkActionsReturn {
  const { user } = useAuth();
  const store = useBookmarkStore();

  const [addBookmarkMutation, { loading: addLoading, error: addError }] =
    useMutation(ADD_BOOKMARK);
  const [
    removeBookmarkMutation,
    { loading: removeLoading, error: removeError },
  ] = useMutation(REMOVE_BOOKMARK);
  const [
    removeByMessageMutation,
    { loading: removeByMsgLoading, error: removeByMsgError },
  ] = useMutation(REMOVE_BOOKMARK_BY_MESSAGE);
  const [
    updateBookmarkMutation,
    { loading: updateLoading, error: updateError },
  ] = useMutation(UPDATE_BOOKMARK);
  const [
    deleteAllMutation,
    { loading: deleteAllLoading, error: deleteAllError },
  ] = useMutation(DELETE_ALL_BOOKMARKS);

  const addBookmark = useCallback(
    async (messageId: string, note?: string): Promise<Bookmark | null> => {
      if (!user?.id) return null;

      try {
        store.setSaving(true);
        const result = await addBookmarkMutation({
          variables: {
            userId: user.id,
            messageId,
            note,
          },
        });

        const newBookmark = result.data?.insert_nchat_bookmarks_one;
        return newBookmark ?? null;
      } catch (error) {
        store.setError("Failed to add bookmark");
        throw error;
      } finally {
        store.setSaving(false);
      }
    },
    [user?.id, addBookmarkMutation, store],
  );

  const removeBookmark = useCallback(
    async (bookmarkId: string): Promise<boolean> => {
      try {
        store.setSaving(true);
        const result = await removeBookmarkMutation({
          variables: { bookmarkId },
        });

        if (result.data?.delete_nchat_bookmarks_by_pk) {
          store.removeBookmark(bookmarkId);
          return true;
        }

        return false;
      } catch (error) {
        store.setError("Failed to remove bookmark");
        throw error;
      } finally {
        store.setSaving(false);
      }
    },
    [removeBookmarkMutation, store],
  );

  const removeBookmarkByMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        store.setSaving(true);
        const result = await removeByMessageMutation({
          variables: {
            userId: user.id,
            messageId,
          },
        });

        if (result.data?.delete_nchat_bookmarks?.affected_rows) {
          store.removeBookmarkByMessageId(messageId);
          return true;
        }

        return false;
      } catch (error) {
        store.setError("Failed to remove bookmark");
        throw error;
      } finally {
        store.setSaving(false);
      }
    },
    [user?.id, removeByMessageMutation, store],
  );

  const toggleBookmark = useCallback(
    async (
      messageId: string,
      note?: string,
    ): Promise<{ action: "added" | "removed"; bookmark?: Bookmark }> => {
      const isBookmarked = store.isMessageBookmarked(messageId);

      if (isBookmarked) {
        await removeBookmarkByMessage(messageId);
        return { action: "removed" };
      } else {
        const bookmark = await addBookmark(messageId, note);
        return { action: "added", bookmark: bookmark ?? undefined };
      }
    },
    [store, addBookmark, removeBookmarkByMessage],
  );

  const updateNote = useCallback(
    async (bookmarkId: string, note: string): Promise<boolean> => {
      try {
        store.setSaving(true);
        const result = await updateBookmarkMutation({
          variables: {
            bookmarkId,
            note,
          },
        });

        if (result.data?.update_nchat_bookmarks_by_pk) {
          store.updateBookmark(bookmarkId, { note });
          return true;
        }

        return false;
      } catch (error) {
        store.setError("Failed to update bookmark note");
        throw error;
      } finally {
        store.setSaving(false);
      }
    },
    [updateBookmarkMutation, store],
  );

  const clearAllBookmarks = useCallback(async (): Promise<number> => {
    if (!user?.id) return 0;

    try {
      store.setSaving(true);
      const result = await deleteAllMutation({
        variables: { userId: user.id },
      });

      const count = result.data?.delete_nchat_bookmarks?.affected_rows ?? 0;
      if (count > 0) {
        store.clearAllBookmarks();
      }

      return count;
    } catch (error) {
      store.setError("Failed to clear bookmarks");
      throw error;
    } finally {
      store.setSaving(false);
    }
  }, [user?.id, deleteAllMutation, store]);

  return {
    addBookmark,
    removeBookmark,
    removeBookmarkByMessage,
    toggleBookmark,
    updateNote,
    clearAllBookmarks,
    loading:
      addLoading ||
      removeLoading ||
      removeByMsgLoading ||
      updateLoading ||
      deleteAllLoading,
    error:
      addError ??
      removeError ??
      removeByMsgError ??
      updateError ??
      deleteAllError,
  };
}

/**
 * Manage bookmark folders (client-side for now, can be extended to GraphQL)
 */
export function useBookmarkFolders(): UseBookmarkFoldersReturn {
  const store = useBookmarkStore();

  // For now, folders are managed client-side
  // This can be extended to use GraphQL mutations when the backend supports folders

  const createFolder = useCallback(
    async (
      name: string,
      color?: string,
      icon?: string,
    ): Promise<BookmarkFolder | null> => {
      const newFolder: BookmarkFolder = {
        id: `folder-${Date.now()}`,
        name,
        color,
        icon,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        bookmark_count: 0,
      };

      store.addFolder(newFolder);
      return newFolder;
    },
    [store],
  );

  const updateFolder = useCallback(
    async (
      folderId: string,
      updates: Partial<BookmarkFolder>,
    ): Promise<boolean> => {
      store.updateFolder(folderId, updates);
      return true;
    },
    [store],
  );

  const deleteFolder = useCallback(
    async (folderId: string): Promise<boolean> => {
      store.removeFolder(folderId);
      return true;
    },
    [store],
  );

  const moveBookmarkToFolder = useCallback(
    async (bookmarkId: string, folderId: string | null): Promise<boolean> => {
      store.moveBookmarkToFolder(bookmarkId, folderId);
      return true;
    },
    [store],
  );

  return {
    folders: Array.from(store.folders.values()),
    loading: store.isLoadingFolders,
    error: undefined,
    createFolder,
    updateFolder,
    deleteFolder,
    moveBookmarkToFolder,
  };
}

/**
 * Search bookmarks
 */
export function useBookmarkSearch(): UseBookmarkSearchReturn {
  const { user } = useAuth();
  const store = useBookmarkStore();

  const { data, loading, error, refetch } = useQuery(SEARCH_BOOKMARKS, {
    variables: {
      userId: user?.id,
      query: `%${store.searchQuery}%`,
      limit: 20,
    },
    skip: !user?.id || !store.searchQuery.trim(),
  });

  const search = useCallback(
    (query: string) => {
      store.setSearchQuery(query);
      if (query.trim()) {
        refetch({
          userId: user?.id,
          query: `%${query}%`,
          limit: 20,
        });
      }
    },
    [store, refetch, user?.id],
  );

  const clearSearch = useCallback(() => {
    store.setSearchQuery("");
  }, [store]);

  return {
    results: data?.nchat_bookmarks ?? [],
    loading,
    error,
    search,
    clearSearch,
  };
}

/**
 * Bookmark filters and sorting
 */
export function useBookmarkFilters(): UseBookmarkFiltersReturn {
  const store = useBookmarkStore();

  const setFolderFilter = useCallback(
    (folderId: string | null) => {
      store.setSelectedFolderId(folderId);
    },
    [store],
  );

  const setChannelFilter = useCallback(
    (channelId: string | null) => {
      store.setSelectedChannelFilter(channelId);
    },
    [store],
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      store.setSearchQuery(query);
    },
    [store],
  );

  const setSortBy = useCallback(
    (sortBy: SortBy) => {
      store.setSortBy(sortBy);
    },
    [store],
  );

  const setSortOrder = useCallback(
    (sortOrder: SortOrder) => {
      store.setSortOrder(sortOrder);
    },
    [store],
  );

  const clearFilters = useCallback(() => {
    store.setSelectedFolderId(null);
    store.setSelectedChannelFilter(null);
    store.setSearchQuery("");
    store.setSortBy("date");
    store.setSortOrder("desc");
  }, [store]);

  return {
    selectedFolderId: store.selectedFolderId,
    selectedChannelFilter: store.selectedChannelFilter,
    searchQuery: store.searchQuery,
    sortBy: store.sortBy,
    sortOrder: store.sortOrder,
    filteredBookmarks: store.getFilteredBookmarks(),
    setFolderFilter,
    setChannelFilter,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    clearFilters,
  };
}

/**
 * Get recent bookmarks
 */
export function useRecentBookmarks(limit = 5) {
  const { user } = useAuth();

  const { data, loading, error } = useQuery(GET_RECENT_BOOKMARKS, {
    variables: {
      userId: user?.id,
      limit,
    },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  return {
    recentBookmarks: (data?.nchat_bookmarks ?? []) as Bookmark[],
    loading,
    error,
  };
}

/**
 * Get bookmark count
 */
export function useBookmarkCount() {
  const { user } = useAuth();
  const store = useBookmarkStore();

  const { data, loading } = useQuery(GET_BOOKMARK_COUNT, {
    variables: { userId: user?.id },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
    onCompleted: (data) => {
      if (data?.nchat_bookmarks_aggregate?.aggregate?.count !== undefined) {
        store.setTotalCount(data.nchat_bookmarks_aggregate.aggregate.count);
      }
    },
  });

  useSubscription(BOOKMARK_COUNT_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
    onData: ({ data: subData }) => {
      if (
        subData.data?.nchat_bookmarks_aggregate?.aggregate?.count !== undefined
      ) {
        store.setTotalCount(
          subData.data.nchat_bookmarks_aggregate.aggregate.count,
        );
      }
    },
  });

  return {
    count:
      data?.nchat_bookmarks_aggregate?.aggregate?.count ?? store.totalCount,
    loading,
  };
}

/**
 * Hook to manage bookmark panel state
 */
export function useBookmarkPanel() {
  const store = useBookmarkStore();

  return {
    isOpen: store.isPanelOpen,
    open: store.openPanel,
    close: store.closePanel,
    toggle: store.togglePanel,
  };
}

// Default export
export default useBookmarks;
