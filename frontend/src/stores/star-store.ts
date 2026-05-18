/**
 * Star Store
 *
 * Zustand store for managing starred messages state.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  StarredMessage,
  StarFilters,
  StarSortBy,
  StarSortOrder,
  StarStats,
  StarColor,
  StarCategory,
} from "@/lib/stars";
import {
  filterStarredMessages,
  sortStarredMessages,
  calculateStarStats,
  getQuickAccessStars,
  getHighPriorityStars,
  getAllCategories,
  PRIORITY_ORDER,
} from "@/lib/stars";

// ============================================================================
// Types
// ============================================================================

export interface StarState {
  // Starred messages
  starredMessages: Map<string, StarredMessage>;
  starredByMessageId: Map<string, string>; // messageId -> starId mapping

  // Categories
  categories: Map<string, StarCategory>;

  // Current view state
  selectedColorFilter: StarColor | null;
  selectedChannelFilter: string | null;
  selectedCategoryFilter: string | null;

  // Panel state
  isPanelOpen: boolean;
  isEditStarOpen: boolean;
  selectedStarId: string | null;

  // Filters & sorting
  filters: StarFilters;
  sortBy: StarSortBy;
  sortOrder: StarSortOrder;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isStarring: boolean;
  isUnstarring: boolean;
  error: string | null;

  // Pagination
  hasMore: boolean;
  cursor: number;
  totalCount: number;
}

export interface StarActions {
  // Starred message operations
  setStarredMessages: (messages: StarredMessage[]) => void;
  addStarredMessage: (message: StarredMessage) => void;
  updateStarredMessage: (
    starId: string,
    updates: Partial<StarredMessage>,
  ) => void;
  removeStarredMessage: (starId: string) => void;
  removeStarByMessageId: (messageId: string) => void;
  clearAllStarred: () => void;

  // Get operations
  getStarredMessage: (starId: string) => StarredMessage | undefined;
  getStarByMessageId: (messageId: string) => StarredMessage | undefined;
  isMessageStarred: (messageId: string) => boolean;
  getFilteredStarredMessages: () => StarredMessage[];
  getStarStats: () => StarStats;
  getQuickAccessStars: (limit?: number) => StarredMessage[];
  getHighPriorityStars: () => StarredMessage[];
  getAllCategories: () => string[];

  // Color operations
  changeStarColor: (starId: string, color: StarColor) => void;
  getStarredByColor: (color: StarColor) => StarredMessage[];

  // Quick access operations
  toggleQuickAccess: (starId: string) => void;

  // Category operations
  setCategories: (categories: StarCategory[]) => void;
  addCategory: (category: StarCategory) => void;
  updateCategory: (categoryId: string, updates: Partial<StarCategory>) => void;
  removeCategory: (categoryId: string) => void;
  setStarCategory: (starId: string, category: string | undefined) => void;

  // View state
  setSelectedColorFilter: (color: StarColor | null) => void;
  setSelectedChannelFilter: (channelId: string | null) => void;
  setSelectedCategoryFilter: (category: string | null) => void;

  // Panel state
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  openEditStar: (starId: string) => void;
  closeEditStar: () => void;

  // Filters & sorting
  setFilters: (filters: Partial<StarFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: StarSortBy) => void;
  setSortOrder: (sortOrder: StarSortOrder) => void;
  setSearchQuery: (query: string) => void;

  // Loading/error
  setLoading: (loading: boolean) => void;
  setStarring: (starring: boolean) => void;
  setUnstarring: (unstarring: boolean) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: number) => void;
  setTotalCount: (count: number) => void;

  // Utility
  resetStore: () => void;
}

export type StarStore = StarState & StarActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: StarState = {
  starredMessages: new Map(),
  starredByMessageId: new Map(),
  categories: new Map(),
  selectedColorFilter: null,
  selectedChannelFilter: null,
  selectedCategoryFilter: null,
  isPanelOpen: false,
  isEditStarOpen: false,
  selectedStarId: null,
  filters: {},
  sortBy: "priority",
  sortOrder: "desc",
  searchQuery: "",
  isLoading: false,
  isStarring: false,
  isUnstarring: false,
  error: null,
  hasMore: false,
  cursor: 0,
  totalCount: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useStarStore = create<StarStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // Starred message operations
          setStarredMessages: (messages) =>
            set(
              (state) => {
                state.starredMessages = new Map(messages.map((m) => [m.id, m]));
                state.starredByMessageId = new Map(
                  messages.map((m) => [m.messageId, m.id]),
                );
                state.totalCount = messages.length;
              },
              false,
              "star/setStarredMessages",
            ),

          addStarredMessage: (message) =>
            set(
              (state) => {
                state.starredMessages.set(message.id, message);
                state.starredByMessageId.set(message.messageId, message.id);
                state.totalCount += 1;
              },
              false,
              "star/addStarredMessage",
            ),

          updateStarredMessage: (starId, updates) =>
            set(
              (state) => {
                const existing = state.starredMessages.get(starId);
                if (existing) {
                  state.starredMessages.set(starId, {
                    ...existing,
                    ...updates,
                  });
                }
              },
              false,
              "star/updateStarredMessage",
            ),

          removeStarredMessage: (starId) =>
            set(
              (state) => {
                const starred = state.starredMessages.get(starId);
                if (starred) {
                  state.starredMessages.delete(starId);
                  state.starredByMessageId.delete(starred.messageId);
                  state.totalCount = Math.max(0, state.totalCount - 1);
                }
              },
              false,
              "star/removeStarredMessage",
            ),

          removeStarByMessageId: (messageId) =>
            set(
              (state) => {
                const starId = state.starredByMessageId.get(messageId);
                if (starId) {
                  state.starredMessages.delete(starId);
                  state.starredByMessageId.delete(messageId);
                  state.totalCount = Math.max(0, state.totalCount - 1);
                }
              },
              false,
              "star/removeStarByMessageId",
            ),

          clearAllStarred: () =>
            set(
              (state) => {
                state.starredMessages = new Map();
                state.starredByMessageId = new Map();
                state.totalCount = 0;
              },
              false,
              "star/clearAllStarred",
            ),

          // Get operations
          getStarredMessage: (starId) => get().starredMessages.get(starId),

          getStarByMessageId: (messageId) => {
            const starId = get().starredByMessageId.get(messageId);
            return starId ? get().starredMessages.get(starId) : undefined;
          },

          isMessageStarred: (messageId) =>
            get().starredByMessageId.has(messageId),

          getFilteredStarredMessages: () => {
            const state = get();
            let messages = Array.from(state.starredMessages.values());

            // Build filters
            const filters: StarFilters = {
              ...state.filters,
              color: state.selectedColorFilter ?? undefined,
              channelId: state.selectedChannelFilter ?? undefined,
              category: state.selectedCategoryFilter ?? undefined,
              searchQuery: state.searchQuery || undefined,
            };

            // Apply filters
            messages = filterStarredMessages(messages, filters);

            // Apply sorting
            messages = sortStarredMessages(
              messages,
              state.sortBy,
              state.sortOrder,
            );

            return messages;
          },

          getStarStats: () => {
            const messages = Array.from(get().starredMessages.values());
            return calculateStarStats(messages);
          },

          getQuickAccessStars: (limit = 5) => {
            const messages = Array.from(get().starredMessages.values());
            return getQuickAccessStars(messages, limit);
          },

          getHighPriorityStars: () => {
            const messages = Array.from(get().starredMessages.values());
            return getHighPriorityStars(messages);
          },

          getAllCategories: () => {
            const messages = Array.from(get().starredMessages.values());
            return getAllCategories(messages);
          },

          // Color operations
          changeStarColor: (starId, color) =>
            set(
              (state) => {
                const starred = state.starredMessages.get(starId);
                if (starred) {
                  starred.color = color;
                }
              },
              false,
              "star/changeStarColor",
            ),

          getStarredByColor: (color) => {
            return Array.from(get().starredMessages.values()).filter(
              (s) => s.color === color,
            );
          },

          // Quick access operations
          toggleQuickAccess: (starId) =>
            set(
              (state) => {
                const starred = state.starredMessages.get(starId);
                if (starred) {
                  starred.quickAccess = !starred.quickAccess;
                }
              },
              false,
              "star/toggleQuickAccess",
            ),

          // Category operations
          setCategories: (categories) =>
            set(
              (state) => {
                state.categories = new Map(categories.map((c) => [c.id, c]));
              },
              false,
              "star/setCategories",
            ),

          addCategory: (category) =>
            set(
              (state) => {
                state.categories.set(category.id, category);
              },
              false,
              "star/addCategory",
            ),

          updateCategory: (categoryId, updates) =>
            set(
              (state) => {
                const existing = state.categories.get(categoryId);
                if (existing) {
                  state.categories.set(categoryId, { ...existing, ...updates });
                }
              },
              false,
              "star/updateCategory",
            ),

          removeCategory: (categoryId) =>
            set(
              (state) => {
                state.categories.delete(categoryId);
                // Remove category from all starred messages
                state.starredMessages.forEach((starred) => {
                  if (starred.category === categoryId) {
                    starred.category = undefined;
                  }
                });
              },
              false,
              "star/removeCategory",
            ),

          setStarCategory: (starId, category) =>
            set(
              (state) => {
                const starred = state.starredMessages.get(starId);
                if (starred) {
                  starred.category = category;
                }
              },
              false,
              "star/setStarCategory",
            ),

          // View state
          setSelectedColorFilter: (color) =>
            set(
              (state) => {
                state.selectedColorFilter = color;
              },
              false,
              "star/setSelectedColorFilter",
            ),

          setSelectedChannelFilter: (channelId) =>
            set(
              (state) => {
                state.selectedChannelFilter = channelId;
              },
              false,
              "star/setSelectedChannelFilter",
            ),

          setSelectedCategoryFilter: (category) =>
            set(
              (state) => {
                state.selectedCategoryFilter = category;
              },
              false,
              "star/setSelectedCategoryFilter",
            ),

          // Panel state
          openPanel: () =>
            set(
              (state) => {
                state.isPanelOpen = true;
              },
              false,
              "star/openPanel",
            ),

          closePanel: () =>
            set(
              (state) => {
                state.isPanelOpen = false;
              },
              false,
              "star/closePanel",
            ),

          togglePanel: () =>
            set(
              (state) => {
                state.isPanelOpen = !state.isPanelOpen;
              },
              false,
              "star/togglePanel",
            ),

          openEditStar: (starId) =>
            set(
              (state) => {
                state.isEditStarOpen = true;
                state.selectedStarId = starId;
              },
              false,
              "star/openEditStar",
            ),

          closeEditStar: () =>
            set(
              (state) => {
                state.isEditStarOpen = false;
                state.selectedStarId = null;
              },
              false,
              "star/closeEditStar",
            ),

          // Filters & sorting
          setFilters: (filters) =>
            set(
              (state) => {
                state.filters = { ...state.filters, ...filters };
              },
              false,
              "star/setFilters",
            ),

          clearFilters: () =>
            set(
              (state) => {
                state.filters = {};
                state.selectedColorFilter = null;
                state.selectedChannelFilter = null;
                state.selectedCategoryFilter = null;
                state.searchQuery = "";
              },
              false,
              "star/clearFilters",
            ),

          setSortBy: (sortBy) =>
            set(
              (state) => {
                state.sortBy = sortBy;
              },
              false,
              "star/setSortBy",
            ),

          setSortOrder: (sortOrder) =>
            set(
              (state) => {
                state.sortOrder = sortOrder;
              },
              false,
              "star/setSortOrder",
            ),

          setSearchQuery: (query) =>
            set(
              (state) => {
                state.searchQuery = query;
              },
              false,
              "star/setSearchQuery",
            ),

          // Loading/error
          setLoading: (loading) =>
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "star/setLoading",
            ),

          setStarring: (starring) =>
            set(
              (state) => {
                state.isStarring = starring;
              },
              false,
              "star/setStarring",
            ),

          setUnstarring: (unstarring) =>
            set(
              (state) => {
                state.isUnstarring = unstarring;
              },
              false,
              "star/setUnstarring",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "star/setError",
            ),

          // Pagination
          setHasMore: (hasMore) =>
            set(
              (state) => {
                state.hasMore = hasMore;
              },
              false,
              "star/setHasMore",
            ),

          setCursor: (cursor) =>
            set(
              (state) => {
                state.cursor = cursor;
              },
              false,
              "star/setCursor",
            ),

          setTotalCount: (count) =>
            set(
              (state) => {
                state.totalCount = count;
              },
              false,
              "star/setTotalCount",
            ),

          // Utility
          resetStore: () =>
            set(
              () => ({
                ...initialState,
                starredMessages: new Map(),
                starredByMessageId: new Map(),
                categories: new Map(),
              }),
              false,
              "star/resetStore",
            ),
        })),
        {
          name: "nchat-stars",
          partialize: (state) => ({
            // Only persist UI preferences
            sortBy: state.sortBy,
            sortOrder: state.sortOrder,
          }),
        },
      ),
    ),
    { name: "star-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectStarredCount = (state: StarStore) => state.totalCount;

export const selectQuickAccessCount = (state: StarStore) =>
  Array.from(state.starredMessages.values()).filter((m) => m.quickAccess)
    .length;

export const selectHighPriorityCount = (state: StarStore) =>
  Array.from(state.starredMessages.values()).filter(
    (m) => m.priority === "urgent" || m.priority === "high",
  ).length;

export const selectIsPanelOpen = (state: StarStore) => state.isPanelOpen;

export const selectIsLoading = (state: StarStore) => state.isLoading;

export const selectError = (state: StarStore) => state.error;
