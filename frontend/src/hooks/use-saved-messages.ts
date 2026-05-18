/**
 * useSavedMessages Hook
 *
 * Hook for managing saved messages (Telegram-style personal message space).
 */

import { useCallback, useMemo } from "react";
import { useSavedStore } from "@/stores/saved-store";
import { useAuth } from "@/contexts/auth-context";
import type {
  SavedMessage,
  SavedCollection,
  SaveMessageInput,
  UpdateSavedMessageInput,
  SavedFilters,
  SavedSortBy,
  SavedSortOrder,
  SavedStats,
} from "@/lib/saved";
import { savedManager } from "@/lib/saved";

interface UseSavedMessagesOptions {
  collectionId?: string;
  channelId?: string;
}

interface UseSavedMessagesReturn {
  // Data
  savedMessages: SavedMessage[];
  filteredSavedMessages: SavedMessage[];
  collections: SavedCollection[];
  starredMessages: SavedMessage[];
  pendingReminders: SavedMessage[];
  savedCount: number;
  stats: SavedStats;
  allTags: string[];

  // Loading/Error
  isLoading: boolean;
  isSaving: boolean;
  isExporting: boolean;
  error: string | null;

  // Message Actions
  saveMessage: (
    input: SaveMessageInput,
  ) => Promise<{ success: boolean; error?: string }>;
  unsaveMessage: (
    messageId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateSavedMessage: (input: UpdateSavedMessageInput) => void;
  toggleSave: (
    messageId: string,
    channelId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  toggleStar: (savedId: string) => void;

  // Collection Actions
  createCollection: (name: string, description?: string) => SavedCollection;
  updateCollection: (
    collectionId: string,
    updates: Partial<SavedCollection>,
  ) => void;
  deleteCollection: (collectionId: string) => void;
  addToCollection: (savedId: string, collectionId: string) => void;
  removeFromCollection: (savedId: string, collectionId: string) => void;

  // Tag Actions
  addTag: (savedId: string, tag: string) => void;
  removeTag: (savedId: string, tag: string) => void;

  // Reminder Actions
  setReminder: (savedId: string, reminderAt: Date | null) => void;
  triggerReminder: (savedId: string) => void;

  // Panel
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Collection Modal
  isCreateCollectionOpen: boolean;
  openCreateCollection: () => void;
  closeCreateCollection: () => void;

  // Filtering & Sorting
  setFilters: (filters: Partial<SavedFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: SavedSortBy) => void;
  setSortOrder: (sortOrder: SavedSortOrder) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCollection: (collectionId: string | null) => void;
  setSelectedChannelFilter: (channelId: string | null) => void;
  setSelectedTagFilter: (tags: string[]) => void;

  // Query
  isMessageSaved: (messageId: string) => boolean;
  getSavedForMessage: (messageId: string) => SavedMessage | undefined;
}

/**
 * Hook for managing saved messages.
 */
export function useSavedMessages(
  options: UseSavedMessagesOptions = {},
): UseSavedMessagesReturn {
  const { collectionId, channelId } = options;
  const { user } = useAuth();
  const store = useSavedStore();

  // Get saved messages
  const savedMessages = useMemo(() => {
    const all = Array.from(store.savedMessages.values());
    let filtered = all;

    if (collectionId) {
      filtered = filtered.filter((s) => s.collectionIds.includes(collectionId));
    }
    if (channelId) {
      filtered = filtered.filter((s) => s.channelId === channelId);
    }

    return filtered;
  }, [store.savedMessages, collectionId, channelId]);

  const filteredSavedMessages = useMemo(() => {
    return store.getFilteredSavedMessages();
  }, [store]);

  const collections = useMemo(() => {
    return Array.from(store.collections.values()).sort(
      (a, b) => a.position - b.position,
    );
  }, [store.collections]);

  const starredMessages = useMemo(() => {
    return store.getStarredMessages();
  }, [store]);

  const pendingReminders = useMemo(() => {
    return store.getPendingReminders();
  }, [store]);

  const stats = useMemo(() => {
    return store.getSavedStats();
  }, [store]);

  const allTags = useMemo(() => {
    return store.getAllTags();
  }, [store]);

  // Save message
  const saveMessage = useCallback(
    async (
      input: SaveMessageInput,
    ): Promise<{ success: boolean; error?: string }> => {
      const validation = savedManager.validateSaveInput(input);
      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }

      store.setSaving(true);
      store.setError(null);

      try {
        const savedMessage: SavedMessage = {
          id: `saved-${Date.now()}`,
          userId: user?.id ?? "",
          messageId: input.messageId,
          channelId: input.channelId,
          collectionIds: input.collectionIds ?? [],
          savedAt: new Date(),
          message: {} as any, // Would be fetched from message store
          note: input.note,
          tags: input.tags ?? [],
          isStarred: input.isStarred ?? false,
          reminderAt: input.reminderAt,
        };

        store.addSavedMessage(savedMessage);
        store.setSaving(false);

        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to save message";
        store.setError(error);
        store.setSaving(false);
        return { success: false, error };
      }
    },
    [store, user?.id],
  );

  // Unsave message
  const unsaveMessage = useCallback(
    async (
      messageId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      store.setSaving(true);
      store.setError(null);

      try {
        store.removeSavedByMessageId(messageId);
        store.setSaving(false);
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to unsave message";
        store.setError(error);
        store.setSaving(false);
        return { success: false, error };
      }
    },
    [store],
  );

  // Toggle save
  const toggleSave = useCallback(
    async (
      messageId: string,
      msgChannelId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (store.isMessageSaved(messageId)) {
        return unsaveMessage(messageId);
      } else {
        return saveMessage({ messageId, channelId: msgChannelId });
      }
    },
    [store, saveMessage, unsaveMessage],
  );

  // Update saved message
  const updateSavedMessage = useCallback(
    (input: UpdateSavedMessageInput) => {
      const { savedId, note, tags, isStarred, reminderAt } = input;
      store.updateSavedMessage(savedId, {
        ...(note !== undefined && { note }),
        ...(tags !== undefined && { tags }),
        ...(isStarred !== undefined && { isStarred }),
        ...(reminderAt !== undefined && {
          reminderAt: reminderAt ?? undefined,
        }),
      });
    },
    [store],
  );

  // Toggle star
  const toggleStar = useCallback(
    (savedId: string) => {
      store.toggleStar(savedId);
    },
    [store],
  );

  // Collection actions
  const createCollection = useCallback(
    (name: string, description?: string): SavedCollection => {
      const collection: SavedCollection = {
        id: `collection-${Date.now()}`,
        userId: user?.id ?? "",
        name,
        description,
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        position: collections.length,
        isShared: false,
      };
      store.addCollection(collection);
      return collection;
    },
    [store, user?.id, collections.length],
  );

  const updateCollection = useCallback(
    (collectionId: string, updates: Partial<SavedCollection>) => {
      store.updateCollection(collectionId, updates);
    },
    [store],
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      store.removeCollection(collectionId);
    },
    [store],
  );

  const addToCollection = useCallback(
    (savedId: string, collectionId: string) => {
      store.addToCollection(savedId, collectionId);
    },
    [store],
  );

  const removeFromCollection = useCallback(
    (savedId: string, collectionId: string) => {
      store.removeFromCollection(savedId, collectionId);
    },
    [store],
  );

  // Tag actions
  const addTag = useCallback(
    (savedId: string, tag: string) => {
      store.addTag(savedId, tag);
    },
    [store],
  );

  const removeTag = useCallback(
    (savedId: string, tag: string) => {
      store.removeTag(savedId, tag);
    },
    [store],
  );

  // Reminder actions
  const setReminder = useCallback(
    (savedId: string, reminderAt: Date | null) => {
      store.setReminder(savedId, reminderAt);
    },
    [store],
  );

  const triggerReminder = useCallback(
    (savedId: string) => {
      store.triggerReminder(savedId);
    },
    [store],
  );

  // Panel actions
  const openPanel = useCallback(() => {
    store.openPanel();
  }, [store]);

  const closePanel = useCallback(() => {
    store.closePanel();
  }, [store]);

  const togglePanel = useCallback(() => {
    store.togglePanel();
  }, [store]);

  // Collection modal actions
  const openCreateCollection = useCallback(() => {
    store.openCreateCollection();
  }, [store]);

  const closeCreateCollection = useCallback(() => {
    store.closeCreateCollection();
  }, [store]);

  // Filter actions
  const setFilters = useCallback(
    (filters: Partial<SavedFilters>) => {
      store.setFilters(filters);
    },
    [store],
  );

  const clearFilters = useCallback(() => {
    store.clearFilters();
  }, [store]);

  const setSortBy = useCallback(
    (sortBy: SavedSortBy) => {
      store.setSortBy(sortBy);
    },
    [store],
  );

  const setSortOrder = useCallback(
    (sortOrder: SavedSortOrder) => {
      store.setSortOrder(sortOrder);
    },
    [store],
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      store.setSearchQuery(query);
    },
    [store],
  );

  const setSelectedCollection = useCallback(
    (selectedCollectionId: string | null) => {
      store.setSelectedCollection(selectedCollectionId);
    },
    [store],
  );

  const setSelectedChannelFilter = useCallback(
    (selectedChannelId: string | null) => {
      store.setSelectedChannelFilter(selectedChannelId);
    },
    [store],
  );

  const setSelectedTagFilter = useCallback(
    (tags: string[]) => {
      store.setSelectedTagFilter(tags);
    },
    [store],
  );

  // Query functions
  const isMessageSaved = useCallback(
    (messageId: string) => {
      return store.isMessageSaved(messageId);
    },
    [store],
  );

  const getSavedForMessage = useCallback(
    (messageId: string) => {
      return store.getSavedByMessageId(messageId);
    },
    [store],
  );

  return {
    savedMessages,
    filteredSavedMessages,
    collections,
    starredMessages,
    pendingReminders,
    savedCount: store.totalCount,
    stats,
    allTags,
    isLoading: store.isLoading,
    isSaving: store.isSaving,
    isExporting: store.isExporting,
    error: store.error,
    saveMessage,
    unsaveMessage,
    updateSavedMessage,
    toggleSave,
    toggleStar,
    createCollection,
    updateCollection,
    deleteCollection,
    addToCollection,
    removeFromCollection,
    addTag,
    removeTag,
    setReminder,
    triggerReminder,
    isPanelOpen: store.isPanelOpen,
    openPanel,
    closePanel,
    togglePanel,
    isCreateCollectionOpen: store.isCreateCollectionOpen,
    openCreateCollection,
    closeCreateCollection,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setSelectedCollection,
    setSelectedChannelFilter,
    setSelectedTagFilter,
    isMessageSaved,
    getSavedForMessage,
  };
}
