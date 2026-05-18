/**
 * useStarredMessages Hook
 *
 * Hook for managing starred messages with color/priority support.
 */

import { useCallback, useMemo } from "react";
import { useStarStore } from "@/stores/star-store";
import { useAuth } from "@/contexts/auth-context";
import type {
  StarredMessage,
  StarMessageInput,
  UpdateStarInput,
  StarFilters,
  StarSortBy,
  StarSortOrder,
  StarColor,
  StarPriority,
  StarStats,
} from "@/lib/stars";
import { starManager, STAR_COLORS, PRIORITY_ORDER } from "@/lib/stars";

interface UseStarredMessagesOptions {
  channelId?: string;
}

interface UseStarredMessagesReturn {
  // Data
  starredMessages: StarredMessage[];
  filteredStarredMessages: StarredMessage[];
  quickAccessStars: StarredMessage[];
  highPriorityStars: StarredMessage[];
  starredCount: number;
  stats: StarStats;

  // Loading/Error
  isLoading: boolean;
  isStarring: boolean;
  isUnstarring: boolean;
  error: string | null;

  // Actions
  starMessage: (
    input: StarMessageInput,
  ) => Promise<{ success: boolean; error?: string }>;
  unstarMessage: (
    messageId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateStar: (input: UpdateStarInput) => void;
  toggleStar: (
    messageId: string,
    channelId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  changeColor: (starId: string, color: StarColor) => void;
  toggleQuickAccess: (starId: string) => void;
  setCategory: (starId: string, category: string | undefined) => void;

  // Panel
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  // Filtering & Sorting
  setFilters: (filters: Partial<StarFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: StarSortBy) => void;
  setSortOrder: (sortOrder: StarSortOrder) => void;
  setSearchQuery: (query: string) => void;
  setColorFilter: (color: StarColor | null) => void;

  // Query
  isMessageStarred: (messageId: string) => boolean;
  getStarForMessage: (messageId: string) => StarredMessage | undefined;
  getAllCategories: () => string[];
}

/**
 * Hook for managing starred messages.
 */
export function useStarredMessages(
  options: UseStarredMessagesOptions = {},
): UseStarredMessagesReturn {
  const { channelId } = options;
  const { user } = useAuth();
  const store = useStarStore();

  // Get starred messages
  const starredMessages = useMemo(() => {
    const all = Array.from(store.starredMessages.values());
    if (channelId) {
      return all.filter((s) => s.channelId === channelId);
    }
    return all;
  }, [store.starredMessages, channelId]);

  const filteredStarredMessages = useMemo(() => {
    return store.getFilteredStarredMessages();
  }, [store]);

  const quickAccessStars = useMemo(() => {
    return store.getQuickAccessStars(5);
  }, [store]);

  const highPriorityStars = useMemo(() => {
    return store.getHighPriorityStars();
  }, [store]);

  const stats = useMemo(() => {
    return store.getStarStats();
  }, [store]);

  // Star message
  const starMessage = useCallback(
    async (
      input: StarMessageInput,
    ): Promise<{ success: boolean; error?: string }> => {
      const validation = starManager.validateStarInput(input);
      if (!validation.isValid) {
        return { success: false, error: validation.errors[0] };
      }

      store.setStarring(true);
      store.setError(null);

      try {
        const color = input.color ?? "yellow";
        const priority =
          input.priority ?? starManager.getPriorityForColor(color);

        const starredMessage: StarredMessage = {
          id: `star-${Date.now()}`,
          userId: user?.id ?? "",
          messageId: input.messageId,
          channelId: input.channelId,
          starredAt: new Date(),
          message: {} as any, // Would be fetched from message store
          color,
          priority,
          note: input.note,
          quickAccess: input.quickAccess ?? false,
          category: input.category,
        };

        store.addStarredMessage(starredMessage);
        store.setStarring(false);

        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to star message";
        store.setError(error);
        store.setStarring(false);
        return { success: false, error };
      }
    },
    [store, user?.id],
  );

  // Unstar message
  const unstarMessage = useCallback(
    async (
      messageId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      store.setUnstarring(true);
      store.setError(null);

      try {
        store.removeStarByMessageId(messageId);
        store.setUnstarring(false);
        return { success: true };
      } catch (err) {
        const error =
          err instanceof Error ? err.message : "Failed to unstar message";
        store.setError(error);
        store.setUnstarring(false);
        return { success: false, error };
      }
    },
    [store],
  );

  // Toggle star
  const toggleStar = useCallback(
    async (
      messageId: string,
      msgChannelId: string,
    ): Promise<{ success: boolean; error?: string }> => {
      if (store.isMessageStarred(messageId)) {
        return unstarMessage(messageId);
      } else {
        return starMessage({ messageId, channelId: msgChannelId });
      }
    },
    [store, starMessage, unstarMessage],
  );

  // Update star
  const updateStar = useCallback(
    (input: UpdateStarInput) => {
      const { starId, ...updates } = input;
      store.updateStarredMessage(starId, updates);
    },
    [store],
  );

  // Change color
  const changeColor = useCallback(
    (starId: string, color: StarColor) => {
      store.changeStarColor(starId, color);
      // Also update priority based on color
      const priority = starManager.getPriorityForColor(color);
      store.updateStarredMessage(starId, { priority });
    },
    [store],
  );

  // Toggle quick access
  const toggleQuickAccess = useCallback(
    (starId: string) => {
      store.toggleQuickAccess(starId);
    },
    [store],
  );

  // Set category
  const setCategory = useCallback(
    (starId: string, category: string | undefined) => {
      store.setStarCategory(starId, category);
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

  // Filter actions
  const setFilters = useCallback(
    (filters: Partial<StarFilters>) => {
      store.setFilters(filters);
    },
    [store],
  );

  const clearFilters = useCallback(() => {
    store.clearFilters();
  }, [store]);

  const setSortBy = useCallback(
    (sortBy: StarSortBy) => {
      store.setSortBy(sortBy);
    },
    [store],
  );

  const setSortOrder = useCallback(
    (sortOrder: StarSortOrder) => {
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

  const setColorFilter = useCallback(
    (color: StarColor | null) => {
      store.setSelectedColorFilter(color);
    },
    [store],
  );

  // Query functions
  const isMessageStarred = useCallback(
    (messageId: string) => {
      return store.isMessageStarred(messageId);
    },
    [store],
  );

  const getStarForMessage = useCallback(
    (messageId: string) => {
      return store.getStarByMessageId(messageId);
    },
    [store],
  );

  const getAllCategories = useCallback(() => {
    return store.getAllCategories();
  }, [store]);

  return {
    starredMessages,
    filteredStarredMessages,
    quickAccessStars,
    highPriorityStars,
    starredCount: store.totalCount,
    stats,
    isLoading: store.isLoading,
    isStarring: store.isStarring,
    isUnstarring: store.isUnstarring,
    error: store.error,
    starMessage,
    unstarMessage,
    updateStar,
    toggleStar,
    changeColor,
    toggleQuickAccess,
    setCategory,
    isPanelOpen: store.isPanelOpen,
    openPanel,
    closePanel,
    togglePanel,
    setFilters,
    clearFilters,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setColorFilter,
    isMessageStarred,
    getStarForMessage,
    getAllCategories,
  };
}
