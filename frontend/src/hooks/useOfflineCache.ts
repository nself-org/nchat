"use client";

/**
 * useOfflineCache - Hook for managing offline cache
 *
 * Provides access to cached data and methods for managing
 * the offline cache.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useOfflineStore, useSyncStatus } from "@/stores/offline-store";
import {
  getOfflineCache,
  type CacheEventListener,
} from "@/lib/offline/offline-cache";
import { getOfflineSync } from "@/lib/offline/offline-sync";
import type {
  CachedChannel,
  CachedMessage,
  CachedUser,
  CacheStats,
} from "@/lib/offline/offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UseOfflineCacheReturn {
  // State
  isEnabled: boolean;
  stats: CacheStats | null;
  cachedChannelIds: string[];

  // Channel operations
  getChannel: (id: string) => Promise<CachedChannel | undefined>;
  getAllChannels: () => Promise<CachedChannel[]>;
  cacheChannel: (channel: CachedChannel) => Promise<void>;
  cacheChannels: (channels: CachedChannel[]) => Promise<void>;
  removeChannel: (id: string) => Promise<void>;

  // Message operations
  getMessages: (channelId: string, limit?: number) => Promise<CachedMessage[]>;
  getMessage: (id: string) => Promise<CachedMessage | undefined>;
  getPendingMessages: () => Promise<CachedMessage[]>;
  cacheMessage: (message: CachedMessage) => Promise<void>;
  cacheMessages: (messages: CachedMessage[]) => Promise<void>;
  removeMessage: (id: string) => Promise<void>;
  removeChannelMessages: (channelId: string) => Promise<void>;

  // User operations
  getUser: (id: string) => Promise<CachedUser | undefined>;
  getAllUsers: () => Promise<CachedUser[]>;
  cacheUser: (user: CachedUser) => Promise<void>;
  cacheUsers: (users: CachedUser[]) => Promise<void>;
  removeUser: (id: string) => Promise<void>;

  // Cache management
  clearAll: () => Promise<void>;
  runCleanup: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Settings
  setEnabled: (enabled: boolean) => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useOfflineCache(): UseOfflineCacheReturn {
  const store = useOfflineStore();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize and load stats on mount
  useEffect(() => {
    refreshStats();
    setIsInitialized(true);
  }, []);

  // Subscribe to cache events
  useEffect(() => {
    const cache = getOfflineCache();

    const handleEvent: CacheEventListener = (event) => {
      // Refresh stats on significant events
      if (
        event.type === "cache_set" ||
        event.type === "cache_delete" ||
        event.type === "cache_clear"
      ) {
        refreshStats();
      }
    };

    const unsubscribe = cache.subscribe(handleEvent);
    return unsubscribe;
  }, []);

  // Refresh cache stats
  const refreshStats = useCallback(async () => {
    try {
      const cache = getOfflineCache();
      const stats = await cache.getStats();
      store.setCacheStats(stats);

      // Also update cached channel IDs
      const channels = await cache.getAllChannels();
      store.setCachedChannelIds(channels.map((c) => c.id));
    } catch (error) {
      logger.error("[useOfflineCache] Failed to refresh stats:", error);
    }
  }, [store]);

  // Channel operations
  const getChannel = useCallback(async (id: string) => {
    const cache = getOfflineCache();
    return cache.getChannel(id);
  }, []);

  const getAllChannels = useCallback(async () => {
    const cache = getOfflineCache();
    return cache.getAllChannels();
  }, []);

  const cacheChannel = useCallback(
    async (channel: CachedChannel) => {
      const cache = getOfflineCache();
      await cache.setChannel(channel);
      store.addCachedChannel(channel.id);
    },
    [store],
  );

  const cacheChannels = useCallback(
    async (channels: CachedChannel[]) => {
      const cache = getOfflineCache();
      await cache.setChannels(channels);
      channels.forEach((c) => store.addCachedChannel(c.id));
    },
    [store],
  );

  const removeChannel = useCallback(
    async (id: string) => {
      const cache = getOfflineCache();
      await cache.removeChannel(id);
      store.removeCachedChannel(id);
    },
    [store],
  );

  // Message operations
  const getMessages = useCallback(async (channelId: string, limit?: number) => {
    const cache = getOfflineCache();
    return cache.getMessages(channelId, limit);
  }, []);

  const getMessage = useCallback(async (id: string) => {
    const cache = getOfflineCache();
    return cache.getMessage(id);
  }, []);

  const getPendingMessages = useCallback(async () => {
    const cache = getOfflineCache();
    return cache.getPendingMessages();
  }, []);

  const cacheMessage = useCallback(async (message: CachedMessage) => {
    const cache = getOfflineCache();
    await cache.setMessage(message);
  }, []);

  const cacheMessages = useCallback(async (messages: CachedMessage[]) => {
    const cache = getOfflineCache();
    await cache.setMessages(messages);
  }, []);

  const removeMessage = useCallback(async (id: string) => {
    const cache = getOfflineCache();
    await cache.removeMessage(id);
  }, []);

  const removeChannelMessages = useCallback(async (channelId: string) => {
    const cache = getOfflineCache();
    await cache.removeChannelMessages(channelId);
  }, []);

  // User operations
  const getUser = useCallback(async (id: string) => {
    const cache = getOfflineCache();
    return cache.getUser(id);
  }, []);

  const getAllUsers = useCallback(async () => {
    const cache = getOfflineCache();
    return cache.getAllUsers();
  }, []);

  const cacheUser = useCallback(async (user: CachedUser) => {
    const cache = getOfflineCache();
    await cache.setUser(user);
  }, []);

  const cacheUsers = useCallback(async (users: CachedUser[]) => {
    const cache = getOfflineCache();
    await cache.setUsers(users);
  }, []);

  const removeUser = useCallback(async (id: string) => {
    const cache = getOfflineCache();
    await cache.removeUser(id);
  }, []);

  // Cache management
  const clearAll = useCallback(async () => {
    const cache = getOfflineCache();
    await cache.clearAll();
    store.setCacheStats(null);
    store.setCachedChannelIds([]);
  }, [store]);

  const runCleanup = useCallback(async () => {
    const cache = getOfflineCache();
    await cache.runCleanup();
    await refreshStats();
  }, [refreshStats]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      store.setCacheEnabled(enabled);
      const cache = getOfflineCache();
      cache.setConfig({ cacheEnabled: enabled });
    },
    [store],
  );

  return {
    isEnabled: store.cacheEnabled,
    stats: store.cacheStats,
    cachedChannelIds: store.cachedChannelIds,
    getChannel,
    getAllChannels,
    cacheChannel,
    cacheChannels,
    removeChannel,
    getMessages,
    getMessage,
    getPendingMessages,
    cacheMessage,
    cacheMessages,
    removeMessage,
    removeChannelMessages,
    getUser,
    getAllUsers,
    cacheUser,
    cacheUsers,
    removeUser,
    clearAll,
    runCleanup,
    refreshStats,
    setEnabled,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Get cached messages for a channel
 */
export function useCachedMessages(channelId: string) {
  const [messages, setMessages] = useState<CachedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadMessages() {
      setIsLoading(true);
      try {
        const cache = getOfflineCache();
        const cachedMessages = await cache.getMessages(channelId);
        if (mounted) {
          setMessages(cachedMessages);
        }
      } catch (error) {
        logger.error("[useCachedMessages] Error:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [channelId]);

  return { messages, isLoading };
}

/**
 * Check if a channel is cached
 */
export function useIsChannelCached(channelId: string): boolean {
  return useOfflineStore((state) => state.cachedChannelIds.includes(channelId));
}

/**
 * Get cache stats
 */
export function useCacheStats() {
  return useOfflineStore((state) => state.cacheStats);
}

// =============================================================================
// Sync Hook
// =============================================================================

/**
 * Hook for syncing data
 */
export function useOfflineSync() {
  const store = useOfflineStore();
  const syncStatus = useSyncStatus();

  const sync = useCallback(
    async (options?: { fullSync?: boolean }) => {
      try {
        const syncManager = getOfflineSync();
        const result = await syncManager.sync(options);

        if (result.success) {
          store.recordSuccessfulSync();
        } else {
          store.setSyncError(result.errors[0]?.error || "Sync failed");
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Sync failed";
        store.setSyncError(errorMessage);
        throw error;
      }
    },
    [store],
  );

  const cancel = useCallback(() => {
    const syncManager = getOfflineSync();
    syncManager.cancel();
  }, []);

  return {
    ...syncStatus,
    sync,
    cancel,
  };
}

export default useOfflineCache;
