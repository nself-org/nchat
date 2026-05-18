"use client";

import { useCallback, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useLazyQuery,
  type ApolloError,
} from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { useStickerStore } from "./sticker-store";
import { StickerService } from "./sticker-service";
import { logger } from "@/lib/logger";
import {
  GET_STICKER_PACKS,
  GET_PACK_STICKERS,
  GET_USER_STICKER_PACKS,
  GET_RECENT_STICKERS,
  GET_FAVORITE_STICKERS,
  SEARCH_STICKERS,
  GET_STICKER_PACK,
  GET_TRENDING_PACKS,
  CHECK_USER_HAS_PACK,
  ADD_STICKER_PACK,
  REMOVE_STICKER_PACK,
  ADD_RECENT_STICKER,
  ADD_FAVORITE_STICKER,
  REMOVE_FAVORITE_STICKER,
  CLEAR_RECENT_STICKERS,
  REORDER_USER_PACKS,
  type Sticker,
  type StickerPack,
  type UserStickerPack,
  type RecentSticker,
  type FavoriteSticker,
} from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface UseStickersReturn {
  // Data
  installedPacks: UserStickerPack[];
  availablePacks: StickerPack[];
  recentStickers: RecentSticker[];
  favoriteStickers: FavoriteSticker[];
  activePackStickers: Sticker[];
  searchResults: Sticker[];

  // State
  activePackId: string | null;
  searchQuery: string;
  isPickerOpen: boolean;
  previewSticker: Sticker | null;

  // Loading
  isLoadingPacks: boolean;
  isLoadingStickers: boolean;
  isSearching: boolean;

  // Actions
  loadUserPacks: () => Promise<void>;
  loadAvailablePacks: () => Promise<void>;
  loadPackStickers: (packId: string) => Promise<void>;
  loadRecentStickers: () => Promise<void>;
  loadFavoriteStickers: () => Promise<void>;

  addPack: (packId: string) => Promise<UserStickerPack | null>;
  removePack: (packId: string) => Promise<boolean>;
  reorderPacks: (packIds: string[]) => Promise<void>;
  isPackInstalled: (packId: string) => boolean;

  sendSticker: (sticker: Sticker) => Promise<void>;
  searchStickers: (query: string) => Promise<void>;

  addToFavorites: (sticker: Sticker) => Promise<void>;
  removeFromFavorites: (stickerId: string) => Promise<void>;
  isFavorite: (stickerId: string) => boolean;

  clearRecentStickers: () => Promise<void>;

  setActivePackId: (packId: string | null) => void;
  setPickerOpen: (open: boolean) => void;
  setPreviewSticker: (sticker: Sticker | null) => void;

  // Errors
  error: ApolloError | undefined;
}

export interface UsePackStickersReturn {
  pack: StickerPack | null;
  stickers: Sticker[];
  loading: boolean;
  error: ApolloError | undefined;
  refetch: () => Promise<void>;
}

export interface UseStickerSearchReturn {
  results: Sticker[];
  searching: boolean;
  error: ApolloError | undefined;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useStickers(): UseStickersReturn {
  const { user } = useAuth();
  const store = useStickerStore();

  // GraphQL Queries
  const [fetchUserPacks, { loading: loadingUserPacks, error: userPacksError }] =
    useLazyQuery(GET_USER_STICKER_PACKS);
  const [
    fetchAvailablePacks,
    { loading: loadingAvailPacks, error: availPacksError },
  ] = useLazyQuery(GET_STICKER_PACKS);
  const [
    fetchPackStickers,
    { loading: loadingPackStickers, error: packStickersError },
  ] = useLazyQuery(GET_PACK_STICKERS);
  const [fetchRecentStickers, { loading: loadingRecent, error: recentError }] =
    useLazyQuery(GET_RECENT_STICKERS);
  const [
    fetchFavoriteStickers,
    { loading: loadingFavorites, error: favoritesError },
  ] = useLazyQuery(GET_FAVORITE_STICKERS);
  const [searchStickersQuery, { loading: searching, error: searchError }] =
    useLazyQuery(SEARCH_STICKERS);

  // GraphQL Mutations
  const [addPackMutation] = useMutation(ADD_STICKER_PACK);
  const [removePackMutation] = useMutation(REMOVE_STICKER_PACK);
  const [addRecentMutation] = useMutation(ADD_RECENT_STICKER);
  const [addFavoriteMutation] = useMutation(ADD_FAVORITE_STICKER);
  const [removeFavoriteMutation] = useMutation(REMOVE_FAVORITE_STICKER);
  const [clearRecentMutation] = useMutation(CLEAR_RECENT_STICKERS);
  const [reorderPacksMutation] = useMutation(REORDER_USER_PACKS);

  // Combined error
  const error =
    userPacksError ||
    availPacksError ||
    packStickersError ||
    recentError ||
    favoritesError ||
    searchError;

  // Load user's installed packs
  const loadUserPacks = useCallback(async () => {
    if (!user?.id) return;

    store.setLoadingPacks(true);
    try {
      const { data } = await fetchUserPacks({
        variables: { userId: user.id },
      });
      if (data?.nchat_user_sticker_packs) {
        store.setInstalledPacks(data.nchat_user_sticker_packs);
      }
    } finally {
      store.setLoadingPacks(false);
    }
  }, [user?.id, fetchUserPacks, store]);

  // Load available packs for browsing
  const loadAvailablePacks = useCallback(async () => {
    store.setLoadingPacks(true);
    try {
      const { data } = await fetchAvailablePacks({
        variables: { limit: 100, offset: 0 },
      });
      if (data?.nchat_sticker_packs) {
        store.setAvailablePacks(data.nchat_sticker_packs);
      }
    } finally {
      store.setLoadingPacks(false);
    }
  }, [fetchAvailablePacks, store]);

  // Load stickers for a specific pack
  const loadPackStickers = useCallback(
    async (packId: string) => {
      // Check cache first
      const cached = store.getCachedStickers(packId);
      if (cached && cached.length > 0) {
        store.setActivePackId(packId);
        return;
      }

      store.setLoadingStickers(true);
      try {
        const { data } = await fetchPackStickers({
          variables: { packId },
        });
        if (data?.nchat_stickers) {
          store.cachePackStickers(packId, data.nchat_stickers);
          store.setActivePackId(packId);
        }
      } finally {
        store.setLoadingStickers(false);
      }
    },
    [fetchPackStickers, store],
  );

  // Load recent stickers
  const loadRecentStickers = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data } = await fetchRecentStickers({
        variables: { userId: user.id, limit: 30 },
      });
      if (data?.nchat_recent_stickers) {
        store.setRecentStickers(data.nchat_recent_stickers);
      }
    } catch (err) {
      logger.error("Failed to load recent stickers:", err);
    }
  }, [user?.id, fetchRecentStickers, store]);

  // Load favorite stickers
  const loadFavoriteStickers = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data } = await fetchFavoriteStickers({
        variables: { userId: user.id },
      });
      if (data?.nchat_favorite_stickers) {
        store.setFavoriteStickers(data.nchat_favorite_stickers);
      }
    } catch (err) {
      logger.error("Failed to load favorite stickers:", err);
    }
  }, [user?.id, fetchFavoriteStickers, store]);

  // Add pack to collection
  const addPack = useCallback(
    async (packId: string): Promise<UserStickerPack | null> => {
      if (!user?.id) return null;

      try {
        const position = store.installedPacks.length;
        const { data } = await addPackMutation({
          variables: { userId: user.id, packId, position },
          optimisticResponse: {
            insert_nchat_user_sticker_packs_one: {
              __typename: "nchat_user_sticker_packs",
              id: `temp-${Date.now()}`,
              user_id: user.id,
              pack_id: packId,
              position,
              added_at: new Date().toISOString(),
              pack: store.getPackById(packId) || {
                __typename: "nchat_sticker_packs",
                id: packId,
                name: "Loading...",
                description: "",
                thumbnail_url: "",
                author: "",
                sticker_count: 0,
                is_animated: false,
                is_official: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
          },
        });

        if (data?.insert_nchat_user_sticker_packs_one) {
          store.addInstalledPack(data.insert_nchat_user_sticker_packs_one);
          return data.insert_nchat_user_sticker_packs_one;
        }
        return null;
      } catch (err) {
        logger.error("Failed to add pack:", err);
        return null;
      }
    },
    [user?.id, addPackMutation, store],
  );

  // Remove pack from collection
  const removePack = useCallback(
    async (packId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const { data } = await removePackMutation({
          variables: { userId: user.id, packId },
        });

        if (data?.delete_nchat_user_sticker_packs?.affected_rows) {
          store.removeInstalledPack(packId);
          return true;
        }
        return false;
      } catch (err) {
        logger.error("Failed to remove pack:", err);
        return false;
      }
    },
    [user?.id, removePackMutation, store],
  );

  // Reorder packs
  const reorderPacks = useCallback(
    async (packIds: string[]) => {
      if (!user?.id) return;

      // Optimistically update the store
      store.reorderInstalledPacks(packIds);

      try {
        const updates = packIds.map((packId, index) => ({
          where: { user_id: { _eq: user.id }, pack_id: { _eq: packId } },
          _set: { position: index },
        }));

        await reorderPacksMutation({
          variables: { updates },
        });
      } catch (err) {
        logger.error("Failed to reorder packs:", err);
        // Reload packs on failure to restore correct order
        await loadUserPacks();
      }
    },
    [user?.id, reorderPacksMutation, store, loadUserPacks],
  );

  // Check if pack is installed
  const isPackInstalled = useCallback(
    (packId: string): boolean => {
      return store.isPackInstalled(packId);
    },
    [store],
  );

  // Send a sticker (add to recent + emit event)
  const sendSticker = useCallback(
    async (sticker: Sticker) => {
      if (!user?.id) return;

      // Add to recent stickers in database
      try {
        await addRecentMutation({
          variables: { userId: user.id, stickerId: sticker.id },
        });

        // Update local store
        const recentSticker: RecentSticker = {
          id: `temp-${Date.now()}`,
          user_id: user.id,
          sticker_id: sticker.id,
          used_at: new Date().toISOString(),
          use_count: 1,
          sticker,
        };
        store.addRecentSticker(recentSticker);
      } catch (err) {
        logger.error("Failed to record recent sticker:", err);
      }

      // Close the picker
      store.setPickerOpen(false);

      // The actual sending is handled by the chat system
      // We dispatch a custom event that the message input can listen to
      window.dispatchEvent(
        new CustomEvent("nchat:send-sticker", { detail: { sticker } }),
      );
    },
    [user?.id, addRecentMutation, store],
  );

  // Search stickers
  const searchStickers = useCallback(
    async (query: string) => {
      store.setSearchQuery(query);

      if (!query || query.length < 2) {
        store.setSearchResults([]);
        return;
      }

      store.setSearching(true);
      try {
        const { data } = await searchStickersQuery({
          variables: { searchQuery: `%${query}%`, limit: 50 },
        });
        if (data?.nchat_stickers) {
          store.setSearchResults(data.nchat_stickers);
        }
      } finally {
        store.setSearching(false);
      }
    },
    [searchStickersQuery, store],
  );

  // Add to favorites
  const addToFavorites = useCallback(
    async (sticker: Sticker) => {
      if (!user?.id) return;

      try {
        const position = store.favoriteStickers.length;
        const { data } = await addFavoriteMutation({
          variables: { userId: user.id, stickerId: sticker.id, position },
        });

        if (data?.insert_nchat_favorite_stickers_one) {
          store.addFavoriteSticker(data.insert_nchat_favorite_stickers_one);
        }
      } catch (err) {
        logger.error("Failed to add to favorites:", err);
      }
    },
    [user?.id, addFavoriteMutation, store],
  );

  // Remove from favorites
  const removeFromFavorites = useCallback(
    async (stickerId: string) => {
      if (!user?.id) return;

      try {
        const { data } = await removeFavoriteMutation({
          variables: { userId: user.id, stickerId },
        });

        if (data?.delete_nchat_favorite_stickers?.affected_rows) {
          store.removeFavoriteSticker(stickerId);
        }
      } catch (err) {
        logger.error("Failed to remove from favorites:", err);
      }
    },
    [user?.id, removeFavoriteMutation, store],
  );

  // Check if sticker is favorite
  const isFavorite = useCallback(
    (stickerId: string): boolean => {
      return store.isFavorite(stickerId);
    },
    [store],
  );

  // Clear recent stickers
  const clearRecentStickersHandler = useCallback(async () => {
    if (!user?.id) return;

    try {
      await clearRecentMutation({
        variables: { userId: user.id },
      });
      store.clearRecentStickers();
    } catch (err) {
      logger.error("Failed to clear recent stickers:", err);
    }
  }, [user?.id, clearRecentMutation, store]);

  // Get active pack stickers
  const activePackStickers = useMemo(() => {
    if (!store.activePackId) return [];
    return store.cachedStickers[store.activePackId] || [];
  }, [store.activePackId, store.cachedStickers]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      loadUserPacks();
      loadRecentStickers();
      loadFavoriteStickers();
    }
  }, [user?.id, loadUserPacks, loadRecentStickers, loadFavoriteStickers]);

  return {
    // Data
    installedPacks: store.installedPacks,
    availablePacks: store.availablePacks,
    recentStickers: store.recentStickers,
    favoriteStickers: store.favoriteStickers,
    activePackStickers,
    searchResults: store.searchResults,

    // State
    activePackId: store.activePackId,
    searchQuery: store.searchQuery,
    isPickerOpen: store.isPickerOpen,
    previewSticker: store.previewSticker,

    // Loading
    isLoadingPacks:
      loadingUserPacks || loadingAvailPacks || store.isLoadingPacks,
    isLoadingStickers: loadingPackStickers || store.isLoadingStickers,
    isSearching: searching || store.isSearching,

    // Actions
    loadUserPacks,
    loadAvailablePacks,
    loadPackStickers,
    loadRecentStickers,
    loadFavoriteStickers,

    addPack,
    removePack,
    reorderPacks,
    isPackInstalled,

    sendSticker,
    searchStickers,

    addToFavorites,
    removeFromFavorites,
    isFavorite,

    clearRecentStickers: clearRecentStickersHandler,

    setActivePackId: store.setActivePackId,
    setPickerOpen: store.setPickerOpen,
    setPreviewSticker: store.setPreviewSticker,

    error,
  };
}

// ============================================================================
// ADDITIONAL HOOKS
// ============================================================================

/**
 * Hook for loading stickers from a specific pack
 */
export function usePackStickers(packId: string | null): UsePackStickersReturn {
  const { data, loading, error, refetch } = useQuery(GET_PACK_STICKERS, {
    variables: { packId: packId! },
    skip: !packId,
  });

  const pack = useMemo(() => {
    return data?.nchat_sticker_packs_by_pk || null;
  }, [data]);

  const stickers = useMemo(() => {
    return data?.nchat_stickers || [];
  }, [data]);

  return {
    pack,
    stickers,
    loading,
    error,
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Hook for sticker search
 */
export function useStickerSearch(): UseStickerSearchReturn {
  const store = useStickerStore();
  const [search, { loading, error }] = useLazyQuery(SEARCH_STICKERS);

  const searchHandler = useCallback(
    async (query: string) => {
      store.setSearchQuery(query);

      if (!query || query.length < 2) {
        store.setSearchResults([]);
        return;
      }

      try {
        const { data } = await search({
          variables: { searchQuery: `%${query}%`, limit: 50 },
        });
        if (data?.nchat_stickers) {
          store.setSearchResults(data.nchat_stickers);
        }
      } catch (err) {
        logger.error("Search failed:", err);
      }
    },
    [search, store],
  );

  const clear = useCallback(() => {
    store.clearSearch();
  }, [store]);

  return {
    results: store.searchResults,
    searching: loading,
    error,
    search: searchHandler,
    clear,
  };
}

/**
 * Hook for trending packs
 */
export function useTrendingPacks(limit = 10) {
  const { data, loading, error } = useQuery(GET_TRENDING_PACKS, {
    variables: { limit },
  });

  const packs = useMemo(() => {
    return data?.nchat_sticker_packs || [];
  }, [data]);

  return { packs, loading, error };
}

/**
 * Hook for checking if user has a specific pack
 */
export function useHasPack(packId: string) {
  const { user } = useAuth();
  const { data, loading } = useQuery(CHECK_USER_HAS_PACK, {
    variables: { userId: user?.id, packId },
    skip: !user?.id || !packId,
  });

  const hasPack = useMemo(() => {
    return (data?.nchat_user_sticker_packs?.length ?? 0) > 0;
  }, [data]);

  return { hasPack, loading };
}

export default useStickers;
