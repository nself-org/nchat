"use client";

/**
 * Offline Hook - React hook for offline mode management
 *
 * Provides comprehensive offline state management including:
 * - Network status
 * - Sync state
 * - Queue management
 * - Cache statistics
 */

import { useState, useEffect, useCallback } from "react";
import { getNetworkDetector } from "@/lib/offline/network-detector";
import { getSyncManager } from "@/lib/offline/sync-manager";
import { queueStorage, getStorageStats } from "@/lib/offline/offline-storage";
import type {
  ConnectionInfo,
  SyncState,
  QueuedAction,
} from "@/lib/offline/offline-types";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface OfflineState {
  // Network state
  isOnline: boolean;
  connectionInfo: ConnectionInfo;

  // Sync state
  isSyncing: boolean;
  syncState: SyncState;
  lastSyncAt: Date | null;

  // Queue state
  pendingCount: number;
  queuedActions: QueuedAction[];

  // Storage stats
  cacheStats: {
    channels: number;
    messages: number;
    users: number;
    queue: number;
    estimatedSize: number;
  };
}

export interface OfflineActions {
  // Network
  checkConnectivity: () => Promise<boolean>;

  // Sync
  syncNow: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;

  // Queue
  retryFailed: () => Promise<void>;
  clearQueue: () => Promise<void>;

  // Cache
  clearCache: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for offline mode management
 *
 * @example
 * ```tsx
 * function ChatView() {
 *   const { state, actions } = useOffline();
 *
 *   if (!state.isOnline) {
 *     return <OfflineIndicator pendingCount={state.pendingCount} />;
 *   }
 *
 *   return <Chat />;
 * }
 * ```
 */
export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    connectionInfo: {
      state: "online",
      quality: "unknown",
      type: "unknown",
      effectiveType: "unknown",
      downlink: null,
      rtt: null,
      saveData: false,
      lastOnline: null,
      lastOffline: null,
      offlineDuration: null,
    },
    isSyncing: false,
    syncState: {
      status: "idle",
      operation: null,
      progress: 0,
      itemsProcessed: 0,
      itemsTotal: 0,
      lastSyncAt: null,
      lastSuccessfulSyncAt: null,
      error: null,
      pendingChanges: 0,
    },
    lastSyncAt: null,
    pendingCount: 0,
    queuedActions: [],
    cacheStats: {
      channels: 0,
      messages: 0,
      users: 0,
      queue: 0,
      estimatedSize: 0,
    },
  });

  // ===========================================================================
  // Network Monitoring
  // ===========================================================================

  useEffect(() => {
    const networkDetector = getNetworkDetector();

    const unsubscribe = networkDetector.subscribe((info) => {
      setState((prev) => ({
        ...prev,
        isOnline: info.state === "online",
        connectionInfo: info,
      }));
    });

    return unsubscribe;
  }, []);

  // ===========================================================================
  // Sync Monitoring
  // ===========================================================================

  useEffect(() => {
    const syncManager = getSyncManager();

    // Initialize sync manager
    syncManager.initialize().catch((error) => {
      logger.error("[useOffline] Failed to initialize sync manager:", error);
    });

    const unsubscribe = syncManager.subscribe((event) => {
      setState((prev) => ({
        ...prev,
        isSyncing: event.type === "sync_started",
        syncState: syncManager.getState(),
        lastSyncAt: syncManager.getState().lastSyncAt,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ===========================================================================
  // Queue Monitoring
  // ===========================================================================

  useEffect(() => {
    const updateQueue = async () => {
      try {
        const pending = await queueStorage.getPending();
        setState((prev) => ({
          ...prev,
          pendingCount: pending.length,
          queuedActions: pending,
        }));
      } catch (error) {
        logger.error("[useOffline] Failed to update queue:", error);
      }
    };

    updateQueue();

    // Poll queue status every 5 seconds
    const interval = setInterval(updateQueue, 5000);

    return () => clearInterval(interval);
  }, []);

  // ===========================================================================
  // Cache Stats Monitoring
  // ===========================================================================

  const refreshStats = useCallback(async () => {
    try {
      const stats = await getStorageStats();
      setState((prev) => ({
        ...prev,
        cacheStats: stats,
      }));
    } catch (error) {
      logger.error("[useOffline] Failed to refresh stats:", error);
    }
  }, []);

  useEffect(() => {
    refreshStats();

    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);

    return () => clearInterval(interval);
  }, [refreshStats]);

  // ===========================================================================
  // Actions
  // ===========================================================================

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    const networkDetector = getNetworkDetector();
    return await networkDetector.checkConnectivity();
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    const syncManager = getSyncManager();
    try {
      await syncManager.incrementalSync();
    } catch (error) {
      logger.error("[useOffline] Sync failed:", error);
      throw error;
    }
  }, []);

  const pauseSync = useCallback(() => {
    const syncManager = getSyncManager();
    syncManager.pause();
  }, []);

  const resumeSync = useCallback(() => {
    const syncManager = getSyncManager();
    syncManager.resume();
  }, []);

  const retryFailed = useCallback(async (): Promise<void> => {
    const syncQueue = (await import("@/lib/offline/sync-queue")).getSyncQueue();
    await syncQueue.retryFailed();
  }, []);

  const clearQueue = useCallback(async (): Promise<void> => {
    await queueStorage.clear();
    setState((prev) => ({
      ...prev,
      pendingCount: 0,
      queuedActions: [],
    }));
  }, []);

  const clearCache = useCallback(async (): Promise<void> => {
    const { channelStorage, messageStorage, userStorage } =
      await import("@/lib/offline/offline-storage");
    await Promise.all([
      channelStorage.clear(),
      messageStorage.clear(),
      userStorage.clear(),
    ]);
    await refreshStats();
  }, [refreshStats]);

  const actions: OfflineActions = {
    checkConnectivity,
    syncNow,
    pauseSync,
    resumeSync,
    retryFailed,
    clearQueue,
    clearCache,
    refreshStats,
  };

  return {
    state,
    actions,
  };
}

/**
 * Hook for simple online/offline status
 */
export function useOfflineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const networkDetector = getNetworkDetector();

    const unsubscribe = networkDetector.subscribe((info) => {
      setIsOnline(info.state === "online");
    });

    return unsubscribe;
  }, []);

  return isOnline;
}

/**
 * Hook for sync status
 */
export function useSyncStatus() {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    operation: null,
    progress: 0,
    itemsProcessed: 0,
    itemsTotal: 0,
    lastSyncAt: null,
    lastSuccessfulSyncAt: null,
    error: null,
    pendingChanges: 0,
  });

  useEffect(() => {
    const syncManager = getSyncManager();

    syncManager.initialize().catch(console.error);

    const unsubscribe = syncManager.subscribe(() => {
      setState(syncManager.getState());
    });

    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook for pending queue count
 */
export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      try {
        const pending = await queueStorage.countPending();
        setCount(pending);
      } catch (error) {
        logger.error("[usePendingCount] Failed to get pending count:", error);
      }
    };

    updateCount();

    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  return count;
}
