"use client";

/**
 * Sync Hook - React hook for managing sync operations
 *
 * Provides methods to trigger sync operations and monitor progress.
 */

import { useState, useEffect, useCallback } from "react";
import { getSyncManager, type SyncManager } from "@/lib/offline/sync-manager";
import type { SyncState, SyncResult } from "@/lib/offline/offline-types";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface UseSyncReturn {
  // State
  state: SyncState;
  isSyncing: boolean;
  error: string | null;

  // Actions
  syncNow: () => Promise<SyncResult>;
  fullSync: () => Promise<SyncResult>;
  syncChannel: (channelId: string) => Promise<SyncResult>;
  flushQueue: () => Promise<SyncResult>;
  pause: () => void;
  resume: () => void;

  // Config
  setAutoSync: (enabled: boolean) => void;
  setSyncInterval: (ms: number) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for sync operations
 *
 * @example
 * ```tsx
 * function SyncButton() {
 *   const { isSyncing, syncNow, state } = useSync();
 *
 *   return (
 *     <button onClick={syncNow} disabled={isSyncing}>
 *       {isSyncing ? `Syncing... ${state.progress}%` : 'Sync Now'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useSync(): UseSyncReturn {
  const [syncManager] = useState<SyncManager>(() => getSyncManager());
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
  const [error, setError] = useState<string | null>(null);

  // ===========================================================================
  // State Updates
  // ===========================================================================

  useEffect(() => {
    // Initialize sync manager
    syncManager.initialize().catch((err) => {
      logger.error("[useSync] Failed to initialize:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize sync",
      );
    });

    // Subscribe to sync events
    const unsubscribe = syncManager.subscribe((event) => {
      setState(syncManager.getState());

      if (event.type === "sync_failed" && event.data) {
        setError((event.data as SyncResult).errors[0]?.error || "Sync failed");
      } else if (event.type === "sync_completed") {
        setError(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [syncManager]);

  // ===========================================================================
  // Actions
  // ===========================================================================

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    try {
      setError(null);
      return await syncManager.incrementalSync();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sync failed";
      setError(errorMessage);
      throw err;
    }
  }, [syncManager]);

  const fullSync = useCallback(async (): Promise<SyncResult> => {
    try {
      setError(null);
      return await syncManager.fullSync();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Full sync failed";
      setError(errorMessage);
      throw err;
    }
  }, [syncManager]);

  const syncChannel = useCallback(
    async (channelId: string): Promise<SyncResult> => {
      try {
        setError(null);
        return await syncManager.syncChannel(channelId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Channel sync failed";
        setError(errorMessage);
        throw err;
      }
    },
    [syncManager],
  );

  const flushQueue = useCallback(async (): Promise<SyncResult> => {
    try {
      setError(null);
      return await syncManager.flushQueue();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Queue flush failed";
      setError(errorMessage);
      throw err;
    }
  }, [syncManager]);

  const pause = useCallback(() => {
    syncManager.pause();
  }, [syncManager]);

  const resume = useCallback(() => {
    syncManager.resume();
  }, [syncManager]);

  const setAutoSync = useCallback(
    (enabled: boolean) => {
      syncManager.setConfig({ autoSync: enabled });
    },
    [syncManager],
  );

  const setSyncInterval = useCallback(
    (ms: number) => {
      syncManager.setConfig({ syncInterval: ms });
    },
    [syncManager],
  );

  return {
    state,
    isSyncing: state.status === "syncing",
    error,
    syncNow,
    fullSync,
    syncChannel,
    flushQueue,
    pause,
    resume,
    setAutoSync,
    setSyncInterval,
  };
}

/**
 * Hook for simple sync trigger
 */
export function useSyncTrigger() {
  const { syncNow, isSyncing } = useSync();
  return { sync: syncNow, isSyncing };
}
