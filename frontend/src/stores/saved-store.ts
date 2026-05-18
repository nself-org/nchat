/**
 * Saved Messages Store
 *
 * Zustand store for managing saved/starred messages state.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  SavedMessage,
  SavedCollection,
  SavedFilters,
  SavedSortBy,
  SavedSortOrder,
  SavedStats,
} from "@/lib/saved";
import {
  filterSavedMessages,
  sortSavedMessages,
  calculateSavedStats,
  getAllTags,
} from "@/lib/saved";

// ============================================================================
// Types
// ============================================================================

export interface SavedState {
  // Saved messages
  savedMessages: Map<string, SavedMessage>;
  savedByMessageId: Map<string, string>; // messageId -> savedId mapping

  // Collections
  collections: Map<string, SavedCollection>;

  // Current view state
  selectedCollectionId: string | null;
  selectedChannelFilter: string | null;
  selectedTagFilter: string[];

  // Panel state
  isPanelOpen: boolean;
  isAddToCollectionOpen: boolean;
  selectedSavedId: string | null;

  // Create collection modal
  isCreateCollectionOpen: boolean;

  // Filters & sorting
  filters: SavedFilters;
  sortBy: SavedSortBy;
  sortOrder: SavedSortOrder;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isLoadingCollections: boolean;
  isSaving: boolean;
  isExporting: boolean;
  error: string | null;

  // Pagination
  hasMore: boolean;
  cursor: number;
  totalCount: number;
}

export interface SavedActions {
  // Saved message operations
  setSavedMessages: (messages: SavedMessage[]) => void;
  addSavedMessage: (message: SavedMessage) => void;
  updateSavedMessage: (savedId: string, updates: Partial<SavedMessage>) => void;
  removeSavedMessage: (savedId: string) => void;
  removeSavedByMessageId: (messageId: string) => void;
  clearAllSaved: () => void;

  // Get operations
  getSavedMessage: (savedId: string) => SavedMessage | undefined;
  getSavedByMessageId: (messageId: string) => SavedMessage | undefined;
  isMessageSaved: (messageId: string) => boolean;
  getFilteredSavedMessages: () => SavedMessage[];
  getSavedStats: () => SavedStats;
  getAllTags: () => string[];

  // Starred operations
  toggleStar: (savedId: string) => void;
  getStarredMessages: () => SavedMessage[];

  // Collection operations
  setCollections: (collections: SavedCollection[]) => void;
  addCollection: (collection: SavedCollection) => void;
  updateCollection: (
    collectionId: string,
    updates: Partial<SavedCollection>,
  ) => void;
  removeCollection: (collectionId: string) => void;
  getCollection: (collectionId: string) => SavedCollection | undefined;
  getCollectionMessages: (collectionId: string) => SavedMessage[];
  addToCollection: (savedId: string, collectionId: string) => void;
  removeFromCollection: (savedId: string, collectionId: string) => void;
  reorderCollections: (collectionIds: string[]) => void;

  // Tag operations
  addTag: (savedId: string, tag: string) => void;
  removeTag: (savedId: string, tag: string) => void;

  // Reminder operations
  setReminder: (savedId: string, reminderAt: Date | null) => void;
  triggerReminder: (savedId: string) => void;
  getPendingReminders: () => SavedMessage[];

  // View state
  setSelectedCollection: (collectionId: string | null) => void;
  setSelectedChannelFilter: (channelId: string | null) => void;
  setSelectedTagFilter: (tags: string[]) => void;

  // Panel state
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  openAddToCollection: (savedId: string) => void;
  closeAddToCollection: () => void;
  openCreateCollection: () => void;
  closeCreateCollection: () => void;

  // Filters & sorting
  setFilters: (filters: Partial<SavedFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: SavedSortBy) => void;
  setSortOrder: (sortOrder: SavedSortOrder) => void;
  setSearchQuery: (query: string) => void;

  // Loading/error
  setLoading: (loading: boolean) => void;
  setLoadingCollections: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setExporting: (exporting: boolean) => void;
  setError: (error: string | null) => void;

  // Pagination
  setHasMore: (hasMore: boolean) => void;
  setCursor: (cursor: number) => void;
  setTotalCount: (count: number) => void;

  // Utility
  resetStore: () => void;
}

export type SavedStore = SavedState & SavedActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SavedState = {
  savedMessages: new Map(),
  savedByMessageId: new Map(),
  collections: new Map(),
  selectedCollectionId: null,
  selectedChannelFilter: null,
  selectedTagFilter: [],
  isPanelOpen: false,
  isAddToCollectionOpen: false,
  selectedSavedId: null,
  isCreateCollectionOpen: false,
  filters: {},
  sortBy: "savedAt",
  sortOrder: "desc",
  searchQuery: "",
  isLoading: false,
  isLoadingCollections: false,
  isSaving: false,
  isExporting: false,
  error: null,
  hasMore: false,
  cursor: 0,
  totalCount: 0,
};

// ============================================================================
// Store
// ============================================================================

export const useSavedStore = create<SavedStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // Saved message operations
          setSavedMessages: (messages) =>
            set(
              (state) => {
                state.savedMessages = new Map(messages.map((m) => [m.id, m]));
                state.savedByMessageId = new Map(
                  messages.map((m) => [m.messageId, m.id]),
                );
                state.totalCount = messages.length;
              },
              false,
              "saved/setSavedMessages",
            ),

          addSavedMessage: (message) =>
            set(
              (state) => {
                state.savedMessages.set(message.id, message);
                state.savedByMessageId.set(message.messageId, message.id);
                state.totalCount += 1;

                // Update collection counts
                message.collectionIds.forEach((cid) => {
                  const collection = state.collections.get(cid);
                  if (collection) {
                    collection.itemCount += 1;
                  }
                });
              },
              false,
              "saved/addSavedMessage",
            ),

          updateSavedMessage: (savedId, updates) =>
            set(
              (state) => {
                const existing = state.savedMessages.get(savedId);
                if (existing) {
                  state.savedMessages.set(savedId, { ...existing, ...updates });
                }
              },
              false,
              "saved/updateSavedMessage",
            ),

          removeSavedMessage: (savedId) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                if (saved) {
                  // Update collection counts
                  saved.collectionIds.forEach((cid) => {
                    const collection = state.collections.get(cid);
                    if (collection) {
                      collection.itemCount = Math.max(
                        0,
                        collection.itemCount - 1,
                      );
                    }
                  });

                  state.savedMessages.delete(savedId);
                  state.savedByMessageId.delete(saved.messageId);
                  state.totalCount = Math.max(0, state.totalCount - 1);
                }
              },
              false,
              "saved/removeSavedMessage",
            ),

          removeSavedByMessageId: (messageId) =>
            set(
              (state) => {
                const savedId = state.savedByMessageId.get(messageId);
                if (savedId) {
                  const saved = state.savedMessages.get(savedId);
                  if (saved) {
                    saved.collectionIds.forEach((cid) => {
                      const collection = state.collections.get(cid);
                      if (collection) {
                        collection.itemCount = Math.max(
                          0,
                          collection.itemCount - 1,
                        );
                      }
                    });
                  }
                  state.savedMessages.delete(savedId);
                  state.savedByMessageId.delete(messageId);
                  state.totalCount = Math.max(0, state.totalCount - 1);
                }
              },
              false,
              "saved/removeSavedByMessageId",
            ),

          clearAllSaved: () =>
            set(
              (state) => {
                state.savedMessages = new Map();
                state.savedByMessageId = new Map();
                state.totalCount = 0;
                state.collections.forEach((c) => {
                  c.itemCount = 0;
                });
              },
              false,
              "saved/clearAllSaved",
            ),

          // Get operations
          getSavedMessage: (savedId) => get().savedMessages.get(savedId),

          getSavedByMessageId: (messageId) => {
            const savedId = get().savedByMessageId.get(messageId);
            return savedId ? get().savedMessages.get(savedId) : undefined;
          },

          isMessageSaved: (messageId) => get().savedByMessageId.has(messageId),

          getFilteredSavedMessages: () => {
            const state = get();
            let messages = Array.from(state.savedMessages.values());

            // Build filters
            const filters: SavedFilters = {
              ...state.filters,
              collectionId: state.selectedCollectionId,
              channelId: state.selectedChannelFilter ?? undefined,
              tags:
                state.selectedTagFilter.length > 0
                  ? state.selectedTagFilter
                  : undefined,
              searchQuery: state.searchQuery || undefined,
            };

            // Apply filters
            messages = filterSavedMessages(messages, filters);

            // Apply sorting
            messages = sortSavedMessages(
              messages,
              state.sortBy,
              state.sortOrder,
            );

            return messages;
          },

          getSavedStats: () => {
            const messages = Array.from(get().savedMessages.values());
            return calculateSavedStats(messages);
          },

          getAllTags: () => {
            const messages = Array.from(get().savedMessages.values());
            return getAllTags(messages);
          },

          // Starred operations
          toggleStar: (savedId) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                if (saved) {
                  saved.isStarred = !saved.isStarred;
                }
              },
              false,
              "saved/toggleStar",
            ),

          getStarredMessages: () => {
            return Array.from(get().savedMessages.values()).filter(
              (m) => m.isStarred,
            );
          },

          // Collection operations
          setCollections: (collections) =>
            set(
              (state) => {
                state.collections = new Map(collections.map((c) => [c.id, c]));
              },
              false,
              "saved/setCollections",
            ),

          addCollection: (collection) =>
            set(
              (state) => {
                state.collections.set(collection.id, collection);
              },
              false,
              "saved/addCollection",
            ),

          updateCollection: (collectionId, updates) =>
            set(
              (state) => {
                const existing = state.collections.get(collectionId);
                if (existing) {
                  state.collections.set(collectionId, {
                    ...existing,
                    ...updates,
                    updatedAt: new Date(),
                  });
                }
              },
              false,
              "saved/updateCollection",
            ),

          removeCollection: (collectionId) =>
            set(
              (state) => {
                state.collections.delete(collectionId);

                // Remove collection from all saved messages
                state.savedMessages.forEach((saved) => {
                  saved.collectionIds = saved.collectionIds.filter(
                    (cid) => cid !== collectionId,
                  );
                });

                // Reset selection if needed
                if (state.selectedCollectionId === collectionId) {
                  state.selectedCollectionId = null;
                }
              },
              false,
              "saved/removeCollection",
            ),

          getCollection: (collectionId) => get().collections.get(collectionId),

          getCollectionMessages: (collectionId) => {
            return Array.from(get().savedMessages.values()).filter((m) =>
              m.collectionIds.includes(collectionId),
            );
          },

          addToCollection: (savedId, collectionId) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                const collection = state.collections.get(collectionId);

                if (
                  saved &&
                  collection &&
                  !saved.collectionIds.includes(collectionId)
                ) {
                  saved.collectionIds.push(collectionId);
                  collection.itemCount += 1;
                }
              },
              false,
              "saved/addToCollection",
            ),

          removeFromCollection: (savedId, collectionId) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                const collection = state.collections.get(collectionId);

                if (saved && collection) {
                  saved.collectionIds = saved.collectionIds.filter(
                    (cid) => cid !== collectionId,
                  );
                  collection.itemCount = Math.max(0, collection.itemCount - 1);
                }
              },
              false,
              "saved/removeFromCollection",
            ),

          reorderCollections: (collectionIds) =>
            set(
              (state) => {
                collectionIds.forEach((id, index) => {
                  const collection = state.collections.get(id);
                  if (collection) {
                    collection.position = index;
                  }
                });
              },
              false,
              "saved/reorderCollections",
            ),

          // Tag operations
          addTag: (savedId, tag) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                if (saved && !saved.tags.includes(tag)) {
                  saved.tags.push(tag);
                }
              },
              false,
              "saved/addTag",
            ),

          removeTag: (savedId, tag) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                if (saved) {
                  saved.tags = saved.tags.filter((t) => t !== tag);
                }
              },
              false,
              "saved/removeTag",
            ),

          // Reminder operations
          setReminder: (savedId, reminderAt) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                if (saved) {
                  saved.reminderAt = reminderAt ?? undefined;
                  saved.reminderTriggered = false;
                }
              },
              false,
              "saved/setReminder",
            ),

          triggerReminder: (savedId) =>
            set(
              (state) => {
                const saved = state.savedMessages.get(savedId);
                if (saved) {
                  saved.reminderTriggered = true;
                }
              },
              false,
              "saved/triggerReminder",
            ),

          getPendingReminders: () => {
            const now = new Date();
            return Array.from(get().savedMessages.values()).filter(
              (m) => m.reminderAt && !m.reminderTriggered && m.reminderAt > now,
            );
          },

          // View state
          setSelectedCollection: (collectionId) =>
            set(
              (state) => {
                state.selectedCollectionId = collectionId;
              },
              false,
              "saved/setSelectedCollection",
            ),

          setSelectedChannelFilter: (channelId) =>
            set(
              (state) => {
                state.selectedChannelFilter = channelId;
              },
              false,
              "saved/setSelectedChannelFilter",
            ),

          setSelectedTagFilter: (tags) =>
            set(
              (state) => {
                state.selectedTagFilter = tags;
              },
              false,
              "saved/setSelectedTagFilter",
            ),

          // Panel state
          openPanel: () =>
            set(
              (state) => {
                state.isPanelOpen = true;
              },
              false,
              "saved/openPanel",
            ),

          closePanel: () =>
            set(
              (state) => {
                state.isPanelOpen = false;
              },
              false,
              "saved/closePanel",
            ),

          togglePanel: () =>
            set(
              (state) => {
                state.isPanelOpen = !state.isPanelOpen;
              },
              false,
              "saved/togglePanel",
            ),

          openAddToCollection: (savedId) =>
            set(
              (state) => {
                state.isAddToCollectionOpen = true;
                state.selectedSavedId = savedId;
              },
              false,
              "saved/openAddToCollection",
            ),

          closeAddToCollection: () =>
            set(
              (state) => {
                state.isAddToCollectionOpen = false;
                state.selectedSavedId = null;
              },
              false,
              "saved/closeAddToCollection",
            ),

          openCreateCollection: () =>
            set(
              (state) => {
                state.isCreateCollectionOpen = true;
              },
              false,
              "saved/openCreateCollection",
            ),

          closeCreateCollection: () =>
            set(
              (state) => {
                state.isCreateCollectionOpen = false;
              },
              false,
              "saved/closeCreateCollection",
            ),

          // Filters & sorting
          setFilters: (filters) =>
            set(
              (state) => {
                state.filters = { ...state.filters, ...filters };
              },
              false,
              "saved/setFilters",
            ),

          clearFilters: () =>
            set(
              (state) => {
                state.filters = {};
                state.selectedCollectionId = null;
                state.selectedChannelFilter = null;
                state.selectedTagFilter = [];
                state.searchQuery = "";
              },
              false,
              "saved/clearFilters",
            ),

          setSortBy: (sortBy) =>
            set(
              (state) => {
                state.sortBy = sortBy;
              },
              false,
              "saved/setSortBy",
            ),

          setSortOrder: (sortOrder) =>
            set(
              (state) => {
                state.sortOrder = sortOrder;
              },
              false,
              "saved/setSortOrder",
            ),

          setSearchQuery: (query) =>
            set(
              (state) => {
                state.searchQuery = query;
              },
              false,
              "saved/setSearchQuery",
            ),

          // Loading/error
          setLoading: (loading) =>
            set(
              (state) => {
                state.isLoading = loading;
              },
              false,
              "saved/setLoading",
            ),

          setLoadingCollections: (loading) =>
            set(
              (state) => {
                state.isLoadingCollections = loading;
              },
              false,
              "saved/setLoadingCollections",
            ),

          setSaving: (saving) =>
            set(
              (state) => {
                state.isSaving = saving;
              },
              false,
              "saved/setSaving",
            ),

          setExporting: (exporting) =>
            set(
              (state) => {
                state.isExporting = exporting;
              },
              false,
              "saved/setExporting",
            ),

          setError: (error) =>
            set(
              (state) => {
                state.error = error;
              },
              false,
              "saved/setError",
            ),

          // Pagination
          setHasMore: (hasMore) =>
            set(
              (state) => {
                state.hasMore = hasMore;
              },
              false,
              "saved/setHasMore",
            ),

          setCursor: (cursor) =>
            set(
              (state) => {
                state.cursor = cursor;
              },
              false,
              "saved/setCursor",
            ),

          setTotalCount: (count) =>
            set(
              (state) => {
                state.totalCount = count;
              },
              false,
              "saved/setTotalCount",
            ),

          // Utility
          resetStore: () =>
            set(
              () => ({
                ...initialState,
                savedMessages: new Map(),
                savedByMessageId: new Map(),
                collections: new Map(),
              }),
              false,
              "saved/resetStore",
            ),
        })),
        {
          name: "nchat-saved",
          partialize: (state) => ({
            // Only persist UI preferences
            sortBy: state.sortBy,
            sortOrder: state.sortOrder,
          }),
        },
      ),
    ),
    { name: "saved-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSavedCount = (state: SavedStore) => state.totalCount;

export const selectStarredCount = (state: SavedStore) =>
  Array.from(state.savedMessages.values()).filter((m) => m.isStarred).length;

export const selectCollectionCount = (state: SavedStore) =>
  state.collections.size;

export const selectAllCollections = (state: SavedStore) =>
  Array.from(state.collections.values()).sort(
    (a, b) => a.position - b.position,
  );

export const selectIsPanelOpen = (state: SavedStore) => state.isPanelOpen;

export const selectIsLoading = (state: SavedStore) => state.isLoading;

export const selectError = (state: SavedStore) => state.error;
