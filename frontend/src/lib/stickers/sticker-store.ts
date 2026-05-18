import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Sticker,
  StickerPack,
  UserStickerPack,
  RecentSticker,
  FavoriteSticker,
} from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface StickerPackWithStickers extends StickerPack {
  stickers: Sticker[];
}

export interface StickerState {
  // Installed packs
  installedPacks: UserStickerPack[];

  // Recent stickers
  recentStickers: RecentSticker[];

  // Favorite stickers
  favoriteStickers: FavoriteSticker[];

  // All available packs (for browsing)
  availablePacks: StickerPack[];

  // Cached pack stickers (pack_id -> stickers)
  cachedStickers: Record<string, Sticker[]>;

  // Search results
  searchResults: Sticker[];
  searchQuery: string;

  // UI state
  activePackId: string | null;
  isPickerOpen: boolean;
  isManageModalOpen: boolean;
  isAddPackModalOpen: boolean;
  previewSticker: Sticker | null;

  // Loading states
  isLoadingPacks: boolean;
  isLoadingStickers: boolean;
  isSearching: boolean;
}

export interface StickerActions {
  // Pack management
  setInstalledPacks: (packs: UserStickerPack[]) => void;
  addInstalledPack: (pack: UserStickerPack) => void;
  removeInstalledPack: (packId: string) => void;
  reorderInstalledPacks: (packIds: string[]) => void;

  // Available packs
  setAvailablePacks: (packs: StickerPack[]) => void;
  addAvailablePack: (pack: StickerPack) => void;

  // Sticker caching
  cachePackStickers: (packId: string, stickers: Sticker[]) => void;
  getCachedStickers: (packId: string) => Sticker[] | undefined;
  clearCachedStickers: (packId?: string) => void;

  // Recent stickers
  setRecentStickers: (stickers: RecentSticker[]) => void;
  addRecentSticker: (sticker: RecentSticker) => void;
  clearRecentStickers: () => void;

  // Favorite stickers
  setFavoriteStickers: (stickers: FavoriteSticker[]) => void;
  addFavoriteSticker: (sticker: FavoriteSticker) => void;
  removeFavoriteSticker: (stickerId: string) => void;
  reorderFavoriteStickers: (stickerIds: string[]) => void;
  isFavorite: (stickerId: string) => boolean;

  // Search
  setSearchResults: (stickers: Sticker[]) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // UI state
  setActivePackId: (packId: string | null) => void;
  setPickerOpen: (open: boolean) => void;
  setManageModalOpen: (open: boolean) => void;
  setAddPackModalOpen: (open: boolean) => void;
  setPreviewSticker: (sticker: Sticker | null) => void;

  // Loading states
  setLoadingPacks: (loading: boolean) => void;
  setLoadingStickers: (loading: boolean) => void;
  setSearching: (searching: boolean) => void;

  // Helpers
  getPackById: (packId: string) => StickerPack | undefined;
  isPackInstalled: (packId: string) => boolean;
  reset: () => void;
}

export type StickerStore = StickerState & StickerActions;

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: StickerState = {
  installedPacks: [],
  recentStickers: [],
  favoriteStickers: [],
  availablePacks: [],
  cachedStickers: {},
  searchResults: [],
  searchQuery: "",
  activePackId: null,
  isPickerOpen: false,
  isManageModalOpen: false,
  isAddPackModalOpen: false,
  previewSticker: null,
  isLoadingPacks: false,
  isLoadingStickers: false,
  isSearching: false,
};

// ============================================================================
// STORE
// ============================================================================

export const useStickerStore = create<StickerStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Pack management
      setInstalledPacks: (packs) => set({ installedPacks: packs }),

      addInstalledPack: (pack) =>
        set((state) => ({
          installedPacks: [...state.installedPacks, pack].sort(
            (a, b) => a.position - b.position,
          ),
        })),

      removeInstalledPack: (packId) =>
        set((state) => ({
          installedPacks: state.installedPacks.filter(
            (p) => p.pack_id !== packId,
          ),
        })),

      reorderInstalledPacks: (packIds) =>
        set((state) => {
          const packsMap = new Map(
            state.installedPacks.map((p) => [p.pack_id, p]),
          );
          const reorderedPacks = packIds
            .map((id, index) => {
              const pack = packsMap.get(id);
              if (pack) {
                return { ...pack, position: index };
              }
              return null;
            })
            .filter((p): p is UserStickerPack => p !== null);

          return { installedPacks: reorderedPacks };
        }),

      // Available packs
      setAvailablePacks: (packs) => set({ availablePacks: packs }),

      addAvailablePack: (pack) =>
        set((state) => ({
          availablePacks: [...state.availablePacks, pack],
        })),

      // Sticker caching
      cachePackStickers: (packId, stickers) =>
        set((state) => ({
          cachedStickers: {
            ...state.cachedStickers,
            [packId]: stickers,
          },
        })),

      getCachedStickers: (packId) => get().cachedStickers[packId],

      clearCachedStickers: (packId) => {
        if (packId) {
          set((state) => {
            const newCache = { ...state.cachedStickers };
            delete newCache[packId];
            return { cachedStickers: newCache };
          });
        } else {
          set({ cachedStickers: {} });
        }
      },

      // Recent stickers
      setRecentStickers: (stickers) => set({ recentStickers: stickers }),

      addRecentSticker: (sticker) =>
        set((state) => {
          // Remove if already exists, then add to front
          const filtered = state.recentStickers.filter(
            (s) => s.sticker_id !== sticker.sticker_id,
          );
          // Keep only last 30 recent stickers
          const limited = [sticker, ...filtered].slice(0, 30);
          return { recentStickers: limited };
        }),

      clearRecentStickers: () => set({ recentStickers: [] }),

      // Favorite stickers
      setFavoriteStickers: (stickers) => set({ favoriteStickers: stickers }),

      addFavoriteSticker: (sticker) =>
        set((state) => ({
          favoriteStickers: [...state.favoriteStickers, sticker],
        })),

      removeFavoriteSticker: (stickerId) =>
        set((state) => ({
          favoriteStickers: state.favoriteStickers.filter(
            (s) => s.sticker_id !== stickerId,
          ),
        })),

      reorderFavoriteStickers: (stickerIds) =>
        set((state) => {
          const stickersMap = new Map(
            state.favoriteStickers.map((s) => [s.sticker_id, s]),
          );
          const reorderedStickers = stickerIds
            .map((id, index) => {
              const sticker = stickersMap.get(id);
              if (sticker) {
                return { ...sticker, position: index };
              }
              return null;
            })
            .filter((s): s is FavoriteSticker => s !== null);

          return { favoriteStickers: reorderedStickers };
        }),

      isFavorite: (stickerId) => {
        return get().favoriteStickers.some((s) => s.sticker_id === stickerId);
      },

      // Search
      setSearchResults: (stickers) => set({ searchResults: stickers }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearSearch: () => set({ searchResults: [], searchQuery: "" }),

      // UI state
      setActivePackId: (packId) => set({ activePackId: packId }),
      setPickerOpen: (open) => set({ isPickerOpen: open }),
      setManageModalOpen: (open) => set({ isManageModalOpen: open }),
      setAddPackModalOpen: (open) => set({ isAddPackModalOpen: open }),
      setPreviewSticker: (sticker) => set({ previewSticker: sticker }),

      // Loading states
      setLoadingPacks: (loading) => set({ isLoadingPacks: loading }),
      setLoadingStickers: (loading) => set({ isLoadingStickers: loading }),
      setSearching: (searching) => set({ isSearching: searching }),

      // Helpers
      getPackById: (packId) => {
        const state = get();
        // Check installed packs first
        const installed = state.installedPacks.find(
          (p) => p.pack_id === packId,
        );
        if (installed) return installed.pack;
        // Check available packs
        return state.availablePacks.find((p) => p.id === packId);
      },

      isPackInstalled: (packId) => {
        return get().installedPacks.some((p) => p.pack_id === packId);
      },

      reset: () => set(initialState),
    }),
    {
      name: "nchat-stickers",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist essential data, not UI state
        installedPacks: state.installedPacks,
        recentStickers: state.recentStickers,
        favoriteStickers: state.favoriteStickers,
        cachedStickers: state.cachedStickers,
      }),
    },
  ),
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectInstalledPacks = (state: StickerStore) =>
  state.installedPacks;
export const selectRecentStickers = (state: StickerStore) =>
  state.recentStickers;
export const selectFavoriteStickers = (state: StickerStore) =>
  state.favoriteStickers;
export const selectAvailablePacks = (state: StickerStore) =>
  state.availablePacks;
export const selectActivePackId = (state: StickerStore) => state.activePackId;
export const selectIsPickerOpen = (state: StickerStore) => state.isPickerOpen;
export const selectSearchQuery = (state: StickerStore) => state.searchQuery;
export const selectSearchResults = (state: StickerStore) => state.searchResults;
export const selectPreviewSticker = (state: StickerStore) =>
  state.previewSticker;

// Derived selectors
export const selectActivePackStickers = (state: StickerStore) => {
  const { activePackId, cachedStickers } = state;
  if (!activePackId) return [];
  return cachedStickers[activePackId] || [];
};

export const selectHasInstalledPacks = (state: StickerStore) => {
  return state.installedPacks.length > 0;
};

export const selectNotInstalledPacks = (state: StickerStore) => {
  const installedIds = new Set(state.installedPacks.map((p) => p.pack_id));
  return state.availablePacks.filter((p) => !installedIds.has(p.id));
};

export default useStickerStore;
