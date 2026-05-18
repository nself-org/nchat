/**
 * useMediaGallery Hook - Manage media gallery state and operations
 *
 * Provides a comprehensive interface for fetching, filtering, sorting,
 * and managing media items in a gallery context.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@apollo/client";
import { useMediaStore } from "@/stores/media-store";
import {
  GET_MEDIA,
  GET_CHANNEL_MEDIA,
  GET_USER_MEDIA,
  MediaItemResult,
} from "@/graphql/media/media-queries";
import {
  MediaItem,
  MediaFilters,
  MediaSorting,
  MediaViewMode,
  MediaFilterTab,
  MediaType,
} from "@/lib/media/media-types";

// ============================================================================
// Types
// ============================================================================

export interface UseMediaGalleryOptions {
  channelId?: string;
  threadId?: string;
  userId?: string;
  initialFilters?: Partial<MediaFilters>;
  autoFetch?: boolean;
  pageSize?: number;
}

export interface UseMediaGalleryReturn {
  // Data
  items: MediaItem[];
  filteredItems: MediaItem[];
  totalCount: number;

  // Loading state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Filters
  filters: MediaFilters;
  setFilters: (filters: Partial<MediaFilters>) => void;
  setTypeFilter: (type: MediaFilterTab) => void;
  setSearchQuery: (query: string) => void;
  setDateRange: (start: Date | null, end: Date | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;

  // Sorting
  sorting: MediaSorting;
  setSorting: (sorting: Partial<MediaSorting>) => void;
  toggleSortDirection: () => void;

  // Pagination
  page: number;
  totalPages: number;
  hasMore: boolean;
  loadMore: () => void;
  goToPage: (page: number) => void;

  // View mode
  viewMode: MediaViewMode;
  setViewMode: (mode: MediaViewMode) => void;

  // Selection
  selectedItems: Set<string>;
  isSelectMode: boolean;
  toggleSelection: (itemId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setSelectMode: (enabled: boolean) => void;
  getSelectedItems: () => MediaItem[];

  // Actions
  refresh: () => void;
  openViewer: (itemId: string) => void;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform GraphQL result to MediaItem
 */
function transformMediaItem(item: MediaItemResult): MediaItem {
  return {
    id: item.id,
    fileName: item.file_name,
    fileType: item.file_type as MediaType,
    mimeType: item.mime_type,
    fileSize: item.file_size,
    fileExtension: item.file_extension,
    url: item.url,
    thumbnailUrl: item.thumbnail_url,
    previewUrl: item.preview_url,
    downloadUrl: item.download_url || item.url,
    channelId: item.channel_id,
    channelName: item.channel?.name || null,
    threadId: item.thread_id,
    messageId: item.message_id,
    uploadedBy: {
      id: item.uploaded_by.id,
      username: item.uploaded_by.username,
      displayName: item.uploaded_by.display_name,
      avatarUrl: item.uploaded_by.avatar_url,
    },
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    metadata: {
      dimensions:
        item.width && item.height
          ? { width: item.width, height: item.height }
          : undefined,
      duration: item.duration || undefined,
      ...(item.metadata || {}),
    },
    canDelete: true,
    canShare: true,
    canDownload: true,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useMediaGallery(
  options: UseMediaGalleryOptions = {},
): UseMediaGalleryReturn {
  const {
    channelId,
    threadId,
    userId,
    initialFilters,
    autoFetch = true,
    pageSize = 50,
  } = options;

  // Store state
  const {
    items,
    filteredItems,
    isLoading,
    isLoadingMore,
    error,
    filters,
    sorting,
    pagination,
    viewMode,
    selectedItems,
    isSelectMode,
    setItems,
    addItems,
    setLoading,
    setLoadingMore,
    setError,
    setFilters: storeSetFilters,
    setTypeFilter,
    setSearchQuery,
    setDateRange,
    clearFilters,
    hasActiveFilters,
    getActiveFilterCount,
    setSorting,
    toggleSortDirection,
    setPagination,
    nextPage,
    goToPage: storeGoToPage,
    setViewMode,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectMode,
    getSelectedItems,
    applyFiltersAndSort,
    openViewer,
    setContext,
  } = useMediaStore();

  // Build query based on context
  const query = useMemo(() => {
    if (channelId) return GET_CHANNEL_MEDIA;
    if (userId) return GET_USER_MEDIA;
    return GET_MEDIA;
  }, [channelId, userId]);

  // Build variables
  const variables = useMemo(() => {
    const vars: Record<string, unknown> = {
      limit: pageSize,
      offset: (pagination.page - 1) * pageSize,
    };

    if (channelId) {
      vars.channelId = channelId;
    }
    if (userId) {
      vars.userId = userId;
    }

    // Map filter type to fileType
    if (filters.type !== "all") {
      const typeMap: Record<string, string | null> = {
        images: "image",
        videos: "video",
        audio: "audio",
        documents: "document",
      };
      vars.fileType = typeMap[filters.type] || null;
    }

    return vars;
  }, [channelId, userId, pagination.page, pageSize, filters.type]);

  // GraphQL query
  const {
    data,
    loading,
    error: queryError,
    refetch,
  } = useQuery(query, {
    variables,
    skip: !autoFetch,
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  // Set context on mount
  useEffect(() => {
    setContext({
      channelId: channelId || null,
      threadId: threadId || null,
      userId: userId || null,
    });
  }, [channelId, threadId, userId, setContext]);

  // Apply initial filters
  useEffect(() => {
    if (initialFilters) {
      storeSetFilters(initialFilters);
    }
  }, [initialFilters, storeSetFilters]);

  // Process query results
  useEffect(() => {
    if (loading && !data) {
      setLoading(true);
    } else if (!loading) {
      setLoading(false);
    }

    if (queryError) {
      setError(queryError.message);
    }

    if (data) {
      const mediaItems = data.nchat_media?.map(transformMediaItem) || [];
      const total =
        data.nchat_media_aggregate?.aggregate?.count || mediaItems.length;

      if (pagination.page === 1) {
        setItems(mediaItems);
      } else {
        addItems(mediaItems);
      }

      setPagination({
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: mediaItems.length === pageSize,
      });

      applyFiltersAndSort();
    }
  }, [
    data,
    loading,
    queryError,
    pagination.page,
    pageSize,
    setItems,
    addItems,
    setLoading,
    setError,
    setPagination,
    applyFiltersAndSort,
  ]);

  // Apply filters and sort when they change
  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, sorting, applyFiltersAndSort]);

  // Load more handler
  const loadMore = useCallback(() => {
    if (!isLoadingMore && pagination.hasMore) {
      setLoadingMore(true);
      nextPage();
      refetch().finally(() => setLoadingMore(false));
    }
  }, [isLoadingMore, pagination.hasMore, setLoadingMore, nextPage, refetch]);

  // Refresh handler
  const refresh = useCallback(() => {
    storeGoToPage(1);
    refetch();
  }, [storeGoToPage, refetch]);

  // Set filters with apply
  const setFilters = useCallback(
    (newFilters: Partial<MediaFilters>) => {
      storeSetFilters(newFilters);
    },
    [storeSetFilters],
  );

  // Go to page handler
  const goToPage = useCallback(
    (page: number) => {
      storeGoToPage(page);
      refetch();
    },
    [storeGoToPage, refetch],
  );

  return {
    // Data
    items,
    filteredItems,
    totalCount: pagination.total,

    // Loading state
    isLoading,
    isLoadingMore,
    error,

    // Filters
    filters,
    setFilters,
    setTypeFilter,
    setSearchQuery,
    setDateRange,
    clearFilters,
    hasActiveFilters: hasActiveFilters(),
    activeFilterCount: getActiveFilterCount(),

    // Sorting
    sorting,
    setSorting,
    toggleSortDirection,

    // Pagination
    page: pagination.page,
    totalPages: pagination.totalPages,
    hasMore: pagination.hasMore,
    loadMore,
    goToPage,

    // View mode
    viewMode,
    setViewMode,

    // Selection
    selectedItems,
    isSelectMode,
    toggleSelection,
    selectAll,
    clearSelection,
    setSelectMode,
    getSelectedItems,

    // Actions
    refresh,
    openViewer,
  };
}

export default useMediaGallery;
