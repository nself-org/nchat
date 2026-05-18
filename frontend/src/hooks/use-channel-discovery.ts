"use client";

/**
 * Channel Discovery Hook
 *
 * React hook for discovering, browsing, and searching channels with
 * comprehensive filtering, sorting, and recommendation features.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  GET_PUBLIC_CHANNELS,
  SEARCH_CHANNELS,
  GET_TRENDING_CHANNELS,
  GET_FEATURED_CHANNELS,
} from "@/graphql/queries/channel-discovery";
import {
  getDiscoveryResults,
  filterChannels,
  sortChannels,
  calculateDiscoveryStats,
  getFeaturedChannels,
  getPopularChannels,
  getRecentlyActiveChannels,
  getNewChannels,
  type DiscoveryFilters,
  type DiscoveryResult,
  type DiscoveryStats,
} from "@/lib/channels/channel-discovery";
import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelDiscoveryOptions {
  /** Initial filters to apply */
  initialFilters?: Partial<DiscoveryFilters>;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Enable real-time updates */
  enableRealtime?: boolean;
  /** Limit for queries */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Include joined channels */
  includeJoined?: boolean;
}

export interface ChannelDiscoveryState {
  channels: Channel[];
  filteredChannels: Channel[];
  results: DiscoveryResult[];
  stats: DiscoveryStats | null;
  filters: DiscoveryFilters;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
}

export interface ChannelDiscoveryActions {
  // Filtering & Sorting
  setFilters: (filters: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
  applyQuickFilter: (filter: QuickFilterType) => void;

  // Search
  search: (query: string) => void;
  clearSearch: () => void;

  // Data fetching
  fetchChannels: () => Promise<void>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Recommendations
  getFeatured: (limit?: number) => Channel[];
  getPopular: (limit?: number) => Channel[];
  getTrending: (limit?: number) => Channel[];
  getNew: (limit?: number) => Channel[];
  getSuggested: (limit?: number) => Channel[];
}

export type QuickFilterType =
  | "all"
  | "public"
  | "private"
  | "active"
  | "new"
  | "popular"
  | "trending";

// ============================================================================
// Hook Implementation
// ============================================================================

export function useChannelDiscovery(
  options: ChannelDiscoveryOptions = {},
): ChannelDiscoveryState & ChannelDiscoveryActions {
  const {
    initialFilters = {},
    autoFetch = true,
    enableRealtime = false,
    limit = 50,
    offset = 0,
    includeJoined = true,
  } = options;

  const { user } = useAuth();
  const { toast } = useToast();

  // ============================================================================
  // State
  // ============================================================================

  const [filters, setFiltersState] = useState<DiscoveryFilters>({
    sortBy: "activity",
    sortDirection: "desc",
    excludePrivate: false,
    ...initialFilters,
  });
  const [searchQuery, setSearchQuery] = useState(initialFilters.query || "");
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [total, setTotal] = useState(0);

  // ============================================================================
  // GraphQL Queries
  // ============================================================================

  const {
    data: publicChannelsData,
    loading: loadingPublic,
    error: publicError,
    refetch: refetchPublic,
    fetchMore: fetchMorePublic,
  } = useQuery(GET_PUBLIC_CHANNELS, {
    variables: { limit, offset },
    skip: !autoFetch,
    fetchPolicy: enableRealtime ? "cache-and-network" : "cache-first",
    onCompleted: (data) => {
      logger.debug("Public channels fetched", {
        count: data.nchat_channels?.length,
      });
      if (data.nchat_channels) {
        setLocalChannels(transformChannels(data.nchat_channels));
        setTotal(data.nchat_channels.length);
      }
    },
    onError: (error) => {
      logger.error("Failed to fetch public channels", error);
      toast({
        title: "Failed to load channels",
        description: "Could not load public channels. Please try again.",
        variant: "destructive",
      });
    },
  });

  const {
    data: searchData,
    loading: loadingSearch,
    refetch: refetchSearch,
  } = useQuery(SEARCH_CHANNELS, {
    variables: { query: `%${searchQuery}%`, limit: 20 },
    skip: !searchQuery,
    fetchPolicy: "network-only",
  });

  // ============================================================================
  // Computed State
  // ============================================================================

  const channels = useMemo(() => {
    if (searchQuery && searchData?.nchat_channels) {
      return transformChannels(searchData.nchat_channels);
    }
    return localChannels;
  }, [searchQuery, searchData, localChannels]);

  const joinedChannelIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    // This would be populated from user's channel memberships
    // For now, return empty set
    return new Set<string>();
  }, [user]);

  const results = useMemo(() => {
    return getDiscoveryResults(
      channels,
      { ...filters, query: searchQuery },
      includeJoined ? undefined : joinedChannelIds,
    );
  }, [channels, filters, searchQuery, includeJoined, joinedChannelIds]);

  const filteredChannels = useMemo(() => {
    return results.map((r) => r.channel);
  }, [results]);

  const stats = useMemo(() => {
    return calculateDiscoveryStats(channels);
  }, [channels]);

  const isLoading = loadingPublic || loadingSearch;
  const error = publicError || null;

  // ============================================================================
  // Actions
  // ============================================================================

  const setFilters = useCallback((newFilters: Partial<DiscoveryFilters>) => {
    logger.debug("Updating discovery filters", { newFilters });
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    logger.debug("Resetting discovery filters");
    setFiltersState({
      sortBy: "activity",
      sortDirection: "desc",
      excludePrivate: false,
    });
    setSearchQuery("");
  }, []);

  const applyQuickFilter = useCallback((filter: QuickFilterType) => {
    logger.debug("Applying quick filter", { filter });

    switch (filter) {
      case "all":
        setFiltersState((prev) => ({
          ...prev,
          type: undefined,
          hasActivity: undefined,
        }));
        break;
      case "public":
        setFiltersState((prev) => ({
          ...prev,
          type: "public",
          excludePrivate: true,
        }));
        break;
      case "private":
        setFiltersState((prev) => ({
          ...prev,
          type: "private",
          excludePrivate: false,
        }));
        break;
      case "active":
        setFiltersState((prev) => ({
          ...prev,
          hasActivity: true,
          sortBy: "activity",
        }));
        break;
      case "new":
        setFiltersState((prev) => ({
          ...prev,
          sortBy: "created",
          sortDirection: "desc",
        }));
        break;
      case "popular":
        setFiltersState((prev) => ({
          ...prev,
          sortBy: "memberCount",
          sortDirection: "desc",
        }));
        break;
      case "trending":
        setFiltersState((prev) => ({
          ...prev,
          sortBy: "trending",
          sortDirection: "desc",
          hasActivity: true,
        }));
        break;
    }
  }, []);

  const search = useCallback(
    (query: string) => {
      logger.debug("Searching channels", { query });
      setSearchQuery(query);
      if (query) {
        refetchSearch({ query: `%${query}%` });
      }
    },
    [refetchSearch],
  );

  const clearSearch = useCallback(() => {
    logger.debug("Clearing search");
    setSearchQuery("");
  }, []);

  const fetchChannels = useCallback(async () => {
    logger.info("Fetching channels");
    try {
      await refetchPublic();
    } catch (error) {
      logger.error("Failed to fetch channels", error as Error);
      throw error;
    }
  }, [refetchPublic]);

  const fetchMore = useCallback(async () => {
    logger.info("Fetching more channels", { currentCount: channels.length });
    try {
      await fetchMorePublic({
        variables: {
          offset: channels.length,
        },
      });
    } catch (error) {
      logger.error("Failed to fetch more channels", error as Error);
      throw error;
    }
  }, [fetchMorePublic, channels.length]);

  const refresh = useCallback(async () => {
    logger.info("Refreshing channels");
    try {
      await Promise.all([
        refetchPublic(),
        searchQuery ? refetchSearch() : Promise.resolve(),
      ]);
      toast({
        title: "Channels refreshed",
        description: "Channel list has been updated.",
      });
    } catch (error) {
      logger.error("Failed to refresh channels", error as Error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh channels. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [refetchPublic, refetchSearch, searchQuery, toast]);

  // ============================================================================
  // Recommendation Functions
  // ============================================================================

  const getFeatured = useCallback(
    (limit = 6) => {
      return getFeaturedChannels(channels).slice(0, limit);
    },
    [channels],
  );

  const getPopular = useCallback(
    (limit = 10) => {
      return getPopularChannels(channels, limit);
    },
    [channels],
  );

  const getTrending = useCallback(
    (limit = 10) => {
      return getRecentlyActiveChannels(channels, limit);
    },
    [channels],
  );

  const getNew = useCallback(
    (limit = 10) => {
      return getNewChannels(channels, limit);
    },
    [channels],
  );

  const getSuggested = useCallback(
    (limit = 10) => {
      // This would use more sophisticated recommendation logic
      // For now, return a mix of popular and new channels
      const popular = getPopularChannels(channels, Math.ceil(limit / 2));
      const recent = getNewChannels(channels, Math.ceil(limit / 2));
      return [...popular, ...recent].slice(0, limit);
    },
    [channels],
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && !publicChannelsData) {
      fetchChannels();
    }
  }, [autoFetch, publicChannelsData, fetchChannels]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    channels,
    filteredChannels,
    results,
    stats,
    filters,
    isLoading,
    error,
    hasMore: channels.length < total,
    total,

    // Actions
    setFilters,
    resetFilters,
    applyQuickFilter,
    search,
    clearSearch,
    fetchChannels,
    fetchMore,
    refresh,
    getFeatured,
    getPopular,
    getTrending,
    getNew,
    getSuggested,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function transformChannels(rawChannels: any[]): Channel[] {
  return rawChannels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    slug: ch.slug,
    description: ch.description,
    type: ch.type,
    categoryId: ch.category_id,
    createdBy: ch.created_by || ch.owner_id,
    createdAt: ch.created_at,
    updatedAt: ch.updated_at,
    topic: ch.topic,
    icon: ch.icon,
    color: ch.color,
    isArchived: ch.is_archived || false,
    isDefault: ch.is_default || false,
    memberCount: ch.members_aggregate?.aggregate?.count || 0,
    lastMessageAt: ch.last_message_at,
    lastMessagePreview: ch.last_message?.content,
  }));
}

// ============================================================================
// Export
// ============================================================================

export default useChannelDiscovery;
