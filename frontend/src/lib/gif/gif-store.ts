/**
 * GIF Store - Zustand store for GIF picker state management
 *
 * Manages recent GIFs, favorite GIFs, and search history with localStorage persistence.
 *
 * @example
 * ```typescript
 * import { useGifStore } from '@/lib/gif/gif-store'
 *
 * function RecentGifs() {
 *   const { recentGifs, addRecentGif } = useGifStore()
 *
 *   return (
 *     <div>
 *       {recentGifs.map(gif => (
 *         <GifPreview key={gif.id} gif={gif} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { Gif, GifHistoryItem, GifSearchHistoryItem } from "@/types/gif";

// ============================================================================
// Types
// ============================================================================

export interface GifPickerState {
  isOpen: boolean;
  activeTab: "trending" | "search" | "categories" | "recent" | "favorites";
  searchQuery: string;
  selectedCategory: string | null;
}

export interface GifState {
  // Recent GIFs (most recently used)
  recentGifs: Gif[];

  // Favorite GIFs
  favoriteGifs: Gif[];

  // Search history
  searchHistory: GifSearchHistoryItem[];

  // Picker state (transient)
  picker: GifPickerState;

  // Configuration
  maxRecentGifs: number;
  maxFavoriteGifs: number;
  maxSearchHistory: number;
}

export interface GifActions {
  // Recent GIFs
  addRecentGif: (gif: Gif) => void;
  removeRecentGif: (gifId: string) => void;
  clearRecentGifs: () => void;

  // Favorite GIFs
  addFavoriteGif: (gif: Gif) => void;
  removeFavoriteGif: (gifId: string) => void;
  toggleFavoriteGif: (gif: Gif) => void;
  isFavoriteGif: (gifId: string) => boolean;
  clearFavoriteGifs: () => void;

  // Search history
  addSearchHistory: (query: string) => void;
  removeSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;

  // Picker state
  openPicker: () => void;
  closePicker: () => void;
  setPickerTab: (tab: GifPickerState["activeTab"]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;

  // Configuration
  setMaxRecentGifs: (max: number) => void;
  setMaxFavoriteGifs: (max: number) => void;
  setMaxSearchHistory: (max: number) => void;

  // Utility
  reset: () => void;
}

export type GifStore = GifState & GifActions;

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_RECENT_GIFS = 50;
const DEFAULT_MAX_FAVORITE_GIFS = 100;
const DEFAULT_MAX_SEARCH_HISTORY = 20;

// ============================================================================
// Initial State
// ============================================================================

const initialState: GifState = {
  recentGifs: [],
  favoriteGifs: [],
  searchHistory: [],
  picker: {
    isOpen: false,
    activeTab: "trending",
    searchQuery: "",
    selectedCategory: null,
  },
  maxRecentGifs: DEFAULT_MAX_RECENT_GIFS,
  maxFavoriteGifs: DEFAULT_MAX_FAVORITE_GIFS,
  maxSearchHistory: DEFAULT_MAX_SEARCH_HISTORY,
};

// ============================================================================
// Store
// ============================================================================

export const useGifStore = create<GifStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // ================================================================
          // Recent GIFs
          // ================================================================

          addRecentGif: (gif) =>
            set(
              (state) => {
                // Remove if already exists to move to front
                state.recentGifs = state.recentGifs.filter(
                  (g) => g.id !== gif.id,
                );
                // Add to front
                state.recentGifs.unshift(gif);
                // Trim to max
                if (state.recentGifs.length > state.maxRecentGifs) {
                  state.recentGifs = state.recentGifs.slice(
                    0,
                    state.maxRecentGifs,
                  );
                }
              },
              false,
              "gif/addRecentGif",
            ),

          removeRecentGif: (gifId) =>
            set(
              (state) => {
                state.recentGifs = state.recentGifs.filter(
                  (g) => g.id !== gifId,
                );
              },
              false,
              "gif/removeRecentGif",
            ),

          clearRecentGifs: () =>
            set(
              (state) => {
                state.recentGifs = [];
              },
              false,
              "gif/clearRecentGifs",
            ),

          // ================================================================
          // Favorite GIFs
          // ================================================================

          addFavoriteGif: (gif) =>
            set(
              (state) => {
                // Don't add if already exists
                if (state.favoriteGifs.some((g) => g.id === gif.id)) {
                  return;
                }
                // Add to front
                state.favoriteGifs.unshift(gif);
                // Trim to max
                if (state.favoriteGifs.length > state.maxFavoriteGifs) {
                  state.favoriteGifs = state.favoriteGifs.slice(
                    0,
                    state.maxFavoriteGifs,
                  );
                }
              },
              false,
              "gif/addFavoriteGif",
            ),

          removeFavoriteGif: (gifId) =>
            set(
              (state) => {
                state.favoriteGifs = state.favoriteGifs.filter(
                  (g) => g.id !== gifId,
                );
              },
              false,
              "gif/removeFavoriteGif",
            ),

          toggleFavoriteGif: (gif) =>
            set(
              (state) => {
                const index = state.favoriteGifs.findIndex(
                  (g) => g.id === gif.id,
                );
                if (index >= 0) {
                  state.favoriteGifs.splice(index, 1);
                } else {
                  state.favoriteGifs.unshift(gif);
                  if (state.favoriteGifs.length > state.maxFavoriteGifs) {
                    state.favoriteGifs = state.favoriteGifs.slice(
                      0,
                      state.maxFavoriteGifs,
                    );
                  }
                }
              },
              false,
              "gif/toggleFavoriteGif",
            ),

          isFavoriteGif: (gifId) => {
            return get().favoriteGifs.some((g) => g.id === gifId);
          },

          clearFavoriteGifs: () =>
            set(
              (state) => {
                state.favoriteGifs = [];
              },
              false,
              "gif/clearFavoriteGifs",
            ),

          // ================================================================
          // Search History
          // ================================================================

          addSearchHistory: (query) =>
            set(
              (state) => {
                const trimmedQuery = query.trim().toLowerCase();
                if (!trimmedQuery) return;

                // Remove if already exists
                state.searchHistory = state.searchHistory.filter(
                  (item) => item.query.toLowerCase() !== trimmedQuery,
                );
                // Add to front
                state.searchHistory.unshift({
                  query: query.trim(),
                  searchedAt: Date.now(),
                });
                // Trim to max
                if (state.searchHistory.length > state.maxSearchHistory) {
                  state.searchHistory = state.searchHistory.slice(
                    0,
                    state.maxSearchHistory,
                  );
                }
              },
              false,
              "gif/addSearchHistory",
            ),

          removeSearchHistory: (query) =>
            set(
              (state) => {
                state.searchHistory = state.searchHistory.filter(
                  (item) => item.query.toLowerCase() !== query.toLowerCase(),
                );
              },
              false,
              "gif/removeSearchHistory",
            ),

          clearSearchHistory: () =>
            set(
              (state) => {
                state.searchHistory = [];
              },
              false,
              "gif/clearSearchHistory",
            ),

          // ================================================================
          // Picker State
          // ================================================================

          openPicker: () =>
            set(
              (state) => {
                state.picker.isOpen = true;
              },
              false,
              "gif/openPicker",
            ),

          closePicker: () =>
            set(
              (state) => {
                state.picker.isOpen = false;
                state.picker.searchQuery = "";
                state.picker.selectedCategory = null;
              },
              false,
              "gif/closePicker",
            ),

          setPickerTab: (tab) =>
            set(
              (state) => {
                state.picker.activeTab = tab;
              },
              false,
              "gif/setPickerTab",
            ),

          setSearchQuery: (query) =>
            set(
              (state) => {
                state.picker.searchQuery = query;
              },
              false,
              "gif/setSearchQuery",
            ),

          setSelectedCategory: (category) =>
            set(
              (state) => {
                state.picker.selectedCategory = category;
              },
              false,
              "gif/setSelectedCategory",
            ),

          // ================================================================
          // Configuration
          // ================================================================

          setMaxRecentGifs: (max) =>
            set(
              (state) => {
                state.maxRecentGifs = max;
                if (state.recentGifs.length > max) {
                  state.recentGifs = state.recentGifs.slice(0, max);
                }
              },
              false,
              "gif/setMaxRecentGifs",
            ),

          setMaxFavoriteGifs: (max) =>
            set(
              (state) => {
                state.maxFavoriteGifs = max;
                if (state.favoriteGifs.length > max) {
                  state.favoriteGifs = state.favoriteGifs.slice(0, max);
                }
              },
              false,
              "gif/setMaxFavoriteGifs",
            ),

          setMaxSearchHistory: (max) =>
            set(
              (state) => {
                state.maxSearchHistory = max;
                if (state.searchHistory.length > max) {
                  state.searchHistory = state.searchHistory.slice(0, max);
                }
              },
              false,
              "gif/setMaxSearchHistory",
            ),

          // ================================================================
          // Utility
          // ================================================================

          reset: () =>
            set(
              () => ({
                ...initialState,
              }),
              false,
              "gif/reset",
            ),
        })),
      ),
      {
        name: "nchat-gif-store",
        // Only persist certain fields (picker state is transient)
        partialize: (state) => ({
          recentGifs: state.recentGifs,
          favoriteGifs: state.favoriteGifs,
          searchHistory: state.searchHistory,
          maxRecentGifs: state.maxRecentGifs,
          maxFavoriteGifs: state.maxFavoriteGifs,
          maxSearchHistory: state.maxSearchHistory,
        }),
      },
    ),
    { name: "gif-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectRecentGifs = (state: GifStore) => state.recentGifs;

export const selectFavoriteGifs = (state: GifStore) => state.favoriteGifs;

export const selectSearchHistory = (state: GifStore) => state.searchHistory;

export const selectPickerState = (state: GifStore) => state.picker;

export const selectIsPickerOpen = (state: GifStore) => state.picker.isOpen;

export const selectActiveTab = (state: GifStore) => state.picker.activeTab;

export const selectSearchQuery = (state: GifStore) => state.picker.searchQuery;

export const selectSelectedCategory = (state: GifStore) =>
  state.picker.selectedCategory;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get formatted search history with time ago
 */
export function getFormattedSearchHistory(
  history: GifSearchHistoryItem[],
): Array<GifSearchHistoryItem & { timeAgo: string }> {
  const now = Date.now();

  return history.map((item) => {
    const diff = now - item.searchedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    let timeAgo: string;
    if (minutes < 1) {
      timeAgo = "just now";
    } else if (minutes < 60) {
      timeAgo = `${minutes}m ago`;
    } else if (hours < 24) {
      timeAgo = `${hours}h ago`;
    } else {
      timeAgo = `${days}d ago`;
    }

    return { ...item, timeAgo };
  });
}

/**
 * Check if a GIF is in the recent list
 */
export function isRecentGif(state: GifStore, gifId: string): boolean {
  return state.recentGifs.some((g) => g.id === gifId);
}

/**
 * Get the most used GIFs (appears most in recent)
 */
export function getMostUsedGifs(recentGifs: Gif[], limit = 10): Gif[] {
  // Count occurrences (though our recent list is unique, this is for future extension)
  const counts = new Map<string, { gif: Gif; count: number }>();

  for (const gif of recentGifs) {
    const existing = counts.get(gif.id);
    if (existing) {
      existing.count++;
    } else {
      counts.set(gif.id, { gif, count: 1 });
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => item.gif);
}
