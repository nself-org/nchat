"use client";

/**
 * useOfflineQueue - Hook for managing the offline action queue
 *
 * Provides access to queued actions and methods for adding,
 * processing, and managing offline queue items.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useOfflineStore, useQueueStatus } from "@/stores/offline-store";
import {
  getOfflineQueue,
  type QueueEventListener,
} from "@/lib/offline/offline-queue";
import type {
  QueuedAction,
  QueuedSendMessage,
  QueuedEditMessage,
  QueuedDeleteMessage,
  QueuedReaction,
  QueuedActionType,
  QueuePriority,
} from "@/lib/offline/offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  completed: number;
  byType: Record<QueuedActionType, number>;
}

export interface UseOfflineQueueReturn {
  // State
  items: QueuedAction[];
  isProcessing: boolean;
  error: string | null;
  stats: QueueStats;
  hasPendingItems: boolean;

  // Queue actions
  addSendMessage: (
    message: QueuedSendMessage,
  ) => Promise<QueuedAction<QueuedSendMessage>>;
  addEditMessage: (
    edit: QueuedEditMessage,
  ) => Promise<QueuedAction<QueuedEditMessage>>;
  addDeleteMessage: (
    deletion: QueuedDeleteMessage,
  ) => Promise<QueuedAction<QueuedDeleteMessage>>;
  addReaction: (
    reaction: QueuedReaction,
  ) => Promise<QueuedAction<QueuedReaction>>;
  removeReaction: (
    reaction: QueuedReaction,
  ) => Promise<QueuedAction<QueuedReaction>>;

  // Management
  processQueue: () => Promise<{
    processed: number;
    failed: number;
    remaining: number;
  }>;
  removeItem: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  retryFailed: () => Promise<void>;
  getItemsByChannel: (channelId: string) => QueuedAction[];
  getItemsByType: (type: QueuedActionType) => QueuedAction[];

  // Refresh
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useOfflineQueue(): UseOfflineQueueReturn {
  const store = useOfflineStore();
  const queueStatus = useQueueStatus();
  const [isLoading, setIsLoading] = useState(false);

  // Get items from store
  const items = store.queuedActions;

  // Calculate stats
  const stats = useMemo((): QueueStats => {
    const byType = {} as Record<QueuedActionType, number>;
    let pending = 0;
    let processing = 0;
    let failed = 0;
    let completed = 0;

    for (const item of items) {
      // Count by status
      switch (item.status) {
        case "pending":
          pending++;
          break;
        case "processing":
          processing++;
          break;
        case "failed":
          failed++;
          break;
        case "completed":
          completed++;
          break;
      }

      // Count by type
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    return {
      total: items.length,
      pending,
      processing,
      failed,
      completed,
      byType,
    };
  }, [items]);

  // Load queue items on mount
  useEffect(() => {
    refresh();
  }, []);

  // Subscribe to queue events
  useEffect(() => {
    const queue = getOfflineQueue();

    const handleEvent: QueueEventListener = (event) => {
      // Refresh store on queue changes
      refresh();
    };

    const unsubscribe = queue.subscribe(handleEvent);
    return unsubscribe;
  }, []);

  // Refresh queue from IndexedDB
  const refresh = useCallback(async () => {
    try {
      const queue = getOfflineQueue();
      const allItems = await queue.getAll();
      store.setQueuedActions(allItems);
    } catch (error) {
      logger.error("[useOfflineQueue] Failed to refresh queue:", error);
    }
  }, [store]);

  // Add send message
  const addSendMessage = useCallback(
    async (message: QueuedSendMessage) => {
      const queue = getOfflineQueue();
      const action = await queue.addSendMessage(message);
      store.addQueuedAction(action as QueuedAction);
      return action;
    },
    [store],
  );

  // Add edit message
  const addEditMessage = useCallback(
    async (edit: QueuedEditMessage) => {
      const queue = getOfflineQueue();
      const action = await queue.addEditMessage(edit);
      store.addQueuedAction(action as QueuedAction);
      return action;
    },
    [store],
  );

  // Add delete message
  const addDeleteMessage = useCallback(
    async (deletion: QueuedDeleteMessage) => {
      const queue = getOfflineQueue();
      const action = await queue.addDeleteMessage(deletion);
      store.addQueuedAction(action as QueuedAction);
      return action;
    },
    [store],
  );

  // Add reaction
  const addReaction = useCallback(
    async (reaction: QueuedReaction) => {
      const queue = getOfflineQueue();
      const action = await queue.addReaction(reaction);
      store.addQueuedAction(action as QueuedAction);
      return action;
    },
    [store],
  );

  // Remove reaction
  const removeReaction = useCallback(
    async (reaction: QueuedReaction) => {
      const queue = getOfflineQueue();
      const action = await queue.removeReaction(reaction);
      store.addQueuedAction(action as QueuedAction);
      return action;
    },
    [store],
  );

  // Process queue
  const processQueue = useCallback(async () => {
    store.setQueueProcessing(true);
    store.setQueueError(null);

    try {
      const queue = getOfflineQueue();
      const result = await queue.processQueue();

      // Refresh to get updated items
      await refresh();

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process queue";
      store.setQueueError(errorMessage);
      throw error;
    } finally {
      store.setQueueProcessing(false);
    }
  }, [store, refresh]);

  // Remove item
  const removeItem = useCallback(
    async (id: string) => {
      const queue = getOfflineQueue();
      await queue.remove(id);
      store.removeQueuedAction(id);
    },
    [store],
  );

  // Clear queue
  const clearQueue = useCallback(async () => {
    const queue = getOfflineQueue();
    await queue.clear();
    store.clearQueue();
  }, [store]);

  // Retry failed items
  const retryFailed = useCallback(async () => {
    const failedItems = items.filter((item) => item.status === "failed");

    for (const item of failedItems) {
      store.updateQueuedAction(item.id, {
        status: "pending",
        retryCount: 0,
        lastError: null,
      });

      const queue = getOfflineQueue();
      await queue.updateStatus(item.id, "pending");
    }

    // Process the queue
    await processQueue();
  }, [items, store, processQueue]);

  // Get items by channel
  const getItemsByChannel = useCallback(
    (channelId: string) => {
      return items.filter((item) => item.channelId === channelId);
    },
    [items],
  );

  // Get items by type
  const getItemsByType = useCallback(
    (type: QueuedActionType) => {
      return items.filter((item) => item.type === type);
    },
    [items],
  );

  return {
    items,
    isProcessing: queueStatus.isProcessing,
    error: queueStatus.error,
    stats,
    hasPendingItems: stats.pending > 0,
    addSendMessage,
    addEditMessage,
    addDeleteMessage,
    addReaction,
    removeReaction,
    processQueue,
    removeItem,
    clearQueue,
    retryFailed,
    getItemsByChannel,
    getItemsByType,
    refresh,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Get pending message count for a channel
 */
export function usePendingMessageCount(channelId: string): number {
  return useOfflineStore(
    (state) =>
      state.queuedActions.filter(
        (a) => a.channelId === channelId && a.type === "send_message",
      ).length +
      state.pendingMessages.filter((m) => m.channelId === channelId).length,
  );
}

/**
 * Check if there are pending changes
 */
export function useHasPendingChanges(): boolean {
  return useOfflineStore(
    (state) =>
      state.queuedActions.length > 0 || state.pendingMessages.length > 0,
  );
}

export default useOfflineQueue;
