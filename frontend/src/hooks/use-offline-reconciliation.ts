"use client";

/**
 * useOfflineReconciliation Hook
 *
 * Comprehensive hook for offline-first queue management with conflict resolution.
 * Provides reactive state for pending operations, conflicts, and sync status.
 *
 * @module hooks/use-offline-reconciliation
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getReconciliationManager,
  ReconciliationManager,
  type PendingOperation,
  type ConflictInfo,
  type ReconciliationEvent,
  type ReconciliationConfig,
} from "@/lib/offline/reconciliation-manager";
import {
  getStorageQuotaManager,
  StorageQuotaManager,
  type StorageStats,
  type StorageStatus,
} from "@/lib/offline/storage-quota-manager";
import {
  getMessageOptimisticUpdates,
  type OptimisticUpdate,
  type PendingMessageData,
} from "@/lib/offline/optimistic-updates";
import { getNetworkDetector } from "@/lib/offline/network-detector";
import { type ResolutionStrategy } from "@/lib/offline/conflict-resolver";
import type {
  QueuedSendMessage,
  QueuedEditMessage,
  QueuedDeleteMessage,
  QueuedReaction,
} from "@/lib/offline/offline-types";

// =============================================================================
// Types
// =============================================================================

/**
 * Offline reconciliation state
 */
export interface OfflineReconciliationState {
  /** Whether the app is online */
  isOnline: boolean;
  /** Whether sync is in progress */
  isSyncing: boolean;
  /** Sync progress (0-100) */
  syncProgress: number;
  /** Number of pending operations */
  pendingCount: number;
  /** Pending operations list */
  pendingOperations: PendingOperation[];
  /** Number of unresolved conflicts */
  conflictCount: number;
  /** Unresolved conflicts list */
  unresolvedConflicts: ConflictInfo[];
  /** Optimistic message updates */
  optimisticMessages: OptimisticUpdate<PendingMessageData>[];
  /** Storage statistics */
  storageStats: StorageStats | null;
  /** Storage status */
  storageStatus: StorageStatus;
  /** Last sync timestamp */
  lastSyncAt: Date | null;
  /** Has any pending changes */
  hasPendingChanges: boolean;
  /** Is storage critical (near quota) */
  isStorageCritical: boolean;
}

/**
 * Offline reconciliation actions
 */
export interface OfflineReconciliationActions {
  // Queue operations
  queueMessage: (
    message: QueuedSendMessage,
  ) => Promise<PendingOperation<QueuedSendMessage>>;
  queueEdit: (
    edit: QueuedEditMessage,
  ) => Promise<PendingOperation<QueuedEditMessage>>;
  queueDelete: (
    deletion: QueuedDeleteMessage,
  ) => Promise<PendingOperation<QueuedDeleteMessage>>;
  queueReaction: (
    reaction: QueuedReaction,
    add: boolean,
  ) => Promise<PendingOperation<QueuedReaction>>;
  queueReadReceipt: (
    channelId: string,
    messageId: string,
  ) => Promise<PendingOperation>;

  // Sync operations
  syncNow: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;

  // Conflict resolution
  resolveConflict: (
    conflictId: string,
    strategy: ResolutionStrategy,
    customValue?: unknown,
  ) => Promise<void>;
  resolveAllConflicts: () => Promise<void>;
  dismissConflict: (conflictId: string) => void;

  // Optimistic updates
  addOptimisticMessage: (
    tempId: string,
    channelId: string,
    content: string,
    senderId: string,
    senderName: string,
  ) => void;
  confirmOptimisticMessage: (tempId: string, confirmedId?: string) => void;
  rollbackOptimisticMessage: (tempId: string, error?: string) => void;
  getOptimisticMessagesForChannel: (
    channelId: string,
  ) => OptimisticUpdate<PendingMessageData>[];

  // Rollback
  rollbackOperation: (operationId: string) => Promise<void>;

  // Storage
  checkStorageQuota: () => Promise<StorageStats>;
  clearOfflineData: () => Promise<void>;
  evictOldData: () => Promise<void>;

  // Utility
  getPendingForChannel: (channelId: string) => PendingOperation[];
  retryFailed: () => Promise<void>;
}

/**
 * Hook options
 */
export interface UseOfflineReconciliationOptions {
  /** Auto-initialize on mount */
  autoInitialize?: boolean;
  /** Enable storage monitoring */
  monitorStorage?: boolean;
  /** Reconciliation config overrides */
  config?: Partial<ReconciliationConfig>;
}

/**
 * Hook return type
 */
export type UseOfflineReconciliationReturn = OfflineReconciliationState &
  OfflineReconciliationActions;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for offline-first queue management with conflict resolution
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const {
 *     isOnline,
 *     isSyncing,
 *     pendingCount,
 *     unresolvedConflicts,
 *     queueMessage,
 *     resolveConflict,
 *   } = useOfflineReconciliation();
 *
 *   const handleSend = async (content: string, channelId: string) => {
 *     await queueMessage({
 *       channelId,
 *       content,
 *       tempId: generateTempId(),
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       {!isOnline && <OfflineIndicator />}
 *       {pendingCount > 0 && <PendingIndicator count={pendingCount} />}
 *       {unresolvedConflicts.length > 0 && (
 *         <ConflictDialog
 *           conflicts={unresolvedConflicts}
 *           onResolve={resolveConflict}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOfflineReconciliation(
  options: UseOfflineReconciliationOptions = {},
): UseOfflineReconciliationReturn {
  const { autoInitialize = true, monitorStorage = true, config } = options;

  // Refs
  const managerRef = useRef<ReconciliationManager | null>(null);
  const storageManagerRef = useRef<StorageQuotaManager | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const initializedRef = useRef(false);

  // State
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [pendingOperations, setPendingOperations] = useState<
    PendingOperation[]
  >([]);
  const [unresolvedConflicts, setUnresolvedConflicts] = useState<
    ConflictInfo[]
  >([]);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticUpdate<PendingMessageData>[]
  >([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Derived state
  const pendingCount = pendingOperations.length;
  const conflictCount = unresolvedConflicts.length;
  const hasPendingChanges = pendingCount > 0 || optimisticMessages.length > 0;
  const storageStatus = storageStats?.status || "unknown";
  const isStorageCritical = storageStatus === "critical";

  // ==========================================================================
  // Initialization
  // ==========================================================================

  useEffect(() => {
    if (!autoInitialize || initializedRef.current) return;

    const initialize = async () => {
      try {
        // Initialize reconciliation manager
        managerRef.current = getReconciliationManager(config);
        await managerRef.current.initialize();

        // Subscribe to reconciliation events
        const unsubReconciliation = managerRef.current.subscribe(
          handleReconciliationEvent,
        );
        unsubscribersRef.current.push(unsubReconciliation);

        // Subscribe to network changes
        const networkDetector = getNetworkDetector();
        const unsubNetwork = networkDetector.subscribe((info) => {
          setIsOnline(info.state === "online");
        });
        unsubscribersRef.current.push(unsubNetwork);

        // Subscribe to optimistic updates
        const optimisticUpdates = getMessageOptimisticUpdates();
        const unsubOptimistic = optimisticUpdates.subscribe((updates) => {
          setOptimisticMessages(updates);
        });
        unsubscribersRef.current.push(unsubOptimistic);

        // Initialize storage monitoring
        if (monitorStorage) {
          storageManagerRef.current = getStorageQuotaManager();
          storageManagerRef.current.start();

          const unsubStorage =
            storageManagerRef.current.subscribe(handleStorageEvent);
          unsubscribersRef.current.push(unsubStorage);

          // Get initial stats
          const stats = await storageManagerRef.current.getStats();
          setStorageStats(stats);
        }

        // Load initial state
        setPendingOperations(managerRef.current.getAllPending());
        setUnresolvedConflicts(managerRef.current.getUnresolvedConflicts());
        setIsOnline(networkDetector.isOnline());

        initializedRef.current = true;
      } catch (error) {
        console.error(
          "[useOfflineReconciliation] Initialization failed:",
          error,
        );
      }
    };

    initialize();

    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
      if (storageManagerRef.current) {
        storageManagerRef.current.stop();
      }
    };
  }, [autoInitialize, monitorStorage, config]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleReconciliationEvent = useCallback(
    (event: ReconciliationEvent) => {
      switch (event.type) {
        case "operation_queued":
        case "operation_completed":
        case "operation_failed":
        case "operation_rollback":
          if (managerRef.current) {
            setPendingOperations(managerRef.current.getAllPending());
          }
          break;

        case "operation_syncing":
          setIsSyncing(true);
          break;

        case "conflict_detected":
          if (event.conflict) {
            setUnresolvedConflicts((prev) => [...prev, event.conflict!]);
          }
          break;

        case "conflict_resolved":
          if (event.conflict) {
            setUnresolvedConflicts((prev) =>
              prev.filter((c) => c.id !== event.conflict!.id),
            );
          }
          break;

        case "sync_started":
          setIsSyncing(true);
          setSyncProgress(0);
          break;

        case "sync_progress":
          if (event.progress) {
            setSyncProgress(event.progress.percentage);
          }
          break;

        case "sync_completed":
          setIsSyncing(false);
          setSyncProgress(100);
          setLastSyncAt(event.timestamp);
          break;

        case "storage_warning":
        case "storage_critical":
          if (event.storage) {
            setStorageStats((prev) =>
              prev
                ? {
                    ...prev,
                    used: event.storage!.used,
                    quota: event.storage!.quota,
                    percentage: event.storage!.percentage,
                    status:
                      event.type === "storage_critical"
                        ? "critical"
                        : "warning",
                  }
                : null,
            );
          }
          break;
      }
    },
    [],
  );

  const handleStorageEvent = useCallback((event: { stats?: StorageStats }) => {
    if (event.stats) {
      setStorageStats(event.stats);
    }
  }, []);

  // ==========================================================================
  // Queue Actions
  // ==========================================================================

  const queueMessage = useCallback(async (message: QueuedSendMessage) => {
    if (!managerRef.current) {
      throw new Error("Reconciliation manager not initialized");
    }
    return managerRef.current.queueMessage(message);
  }, []);

  const queueEdit = useCallback(async (edit: QueuedEditMessage) => {
    if (!managerRef.current) {
      throw new Error("Reconciliation manager not initialized");
    }
    return managerRef.current.queueEdit(edit);
  }, []);

  const queueDelete = useCallback(async (deletion: QueuedDeleteMessage) => {
    if (!managerRef.current) {
      throw new Error("Reconciliation manager not initialized");
    }
    return managerRef.current.queueDelete(deletion);
  }, []);

  const queueReaction = useCallback(
    async (reaction: QueuedReaction, add: boolean) => {
      if (!managerRef.current) {
        throw new Error("Reconciliation manager not initialized");
      }
      return managerRef.current.queueReaction(reaction, add);
    },
    [],
  );

  const queueReadReceipt = useCallback(
    async (channelId: string, messageId: string) => {
      if (!managerRef.current) {
        throw new Error("Reconciliation manager not initialized");
      }
      return managerRef.current.queueReadReceipt(channelId, messageId);
    },
    [],
  );

  // ==========================================================================
  // Sync Actions
  // ==========================================================================

  const syncNow = useCallback(async () => {
    if (!managerRef.current) return;
    await managerRef.current.processPendingOperations();
  }, []);

  const pauseSync = useCallback(() => {
    // Would pause auto-sync
  }, []);

  const resumeSync = useCallback(() => {
    // Would resume auto-sync
  }, []);

  // ==========================================================================
  // Conflict Resolution Actions
  // ==========================================================================

  const resolveConflict = useCallback(
    async (
      conflictId: string,
      strategy: ResolutionStrategy,
      customValue?: unknown,
    ) => {
      if (!managerRef.current) return;
      await managerRef.current.resolveConflict(
        conflictId,
        strategy,
        customValue,
      );
    },
    [],
  );

  const resolveAllConflicts = useCallback(async () => {
    if (!managerRef.current) return;
    await managerRef.current.resolveAllConflicts();
  }, []);

  const dismissConflict = useCallback((conflictId: string) => {
    setUnresolvedConflicts((prev) => prev.filter((c) => c.id !== conflictId));
  }, []);

  // ==========================================================================
  // Optimistic Update Actions
  // ==========================================================================

  const addOptimisticMessage = useCallback(
    (
      tempId: string,
      channelId: string,
      content: string,
      senderId: string,
      senderName: string,
    ) => {
      const optimisticUpdates = getMessageOptimisticUpdates();
      optimisticUpdates.addMessage(
        tempId,
        channelId,
        content,
        senderId,
        senderName,
      );
    },
    [],
  );

  const confirmOptimisticMessage = useCallback(
    (tempId: string, confirmedId?: string) => {
      const optimisticUpdates = getMessageOptimisticUpdates();
      optimisticUpdates.confirm(tempId);
    },
    [],
  );

  const rollbackOptimisticMessage = useCallback(
    (tempId: string, error?: string) => {
      const optimisticUpdates = getMessageOptimisticUpdates();
      optimisticUpdates.rollback(tempId, error);
    },
    [],
  );

  const getOptimisticMessagesForChannel = useCallback((channelId: string) => {
    const optimisticUpdates = getMessageOptimisticUpdates();
    return optimisticUpdates.getForChannel(channelId);
  }, []);

  // ==========================================================================
  // Rollback Actions
  // ==========================================================================

  const rollbackOperation = useCallback(async (operationId: string) => {
    if (!managerRef.current) return;
    await managerRef.current.rollbackOperation(operationId);
  }, []);

  // ==========================================================================
  // Storage Actions
  // ==========================================================================

  const checkStorageQuota = useCallback(async () => {
    if (!storageManagerRef.current) {
      throw new Error("Storage manager not initialized");
    }
    const stats = await storageManagerRef.current.getStats();
    setStorageStats(stats);
    return stats;
  }, []);

  const clearOfflineData = useCallback(async () => {
    if (!storageManagerRef.current) return;
    await storageManagerRef.current.clearAllData();
  }, []);

  const evictOldData = useCallback(async () => {
    if (!storageManagerRef.current) return;
    await storageManagerRef.current.evictToTarget(70);
  }, []);

  // ==========================================================================
  // Utility Actions
  // ==========================================================================

  const getPendingForChannel = useCallback((channelId: string) => {
    if (!managerRef.current) return [];
    return managerRef.current.getPendingForChannel(channelId);
  }, []);

  const retryFailed = useCallback(async () => {
    if (!managerRef.current) return;
    await managerRef.current.processPendingOperations();
  }, []);

  // ==========================================================================
  // Return
  // ==========================================================================

  return useMemo(
    () => ({
      // State
      isOnline,
      isSyncing,
      syncProgress,
      pendingCount,
      pendingOperations,
      conflictCount,
      unresolvedConflicts,
      optimisticMessages,
      storageStats,
      storageStatus,
      lastSyncAt,
      hasPendingChanges,
      isStorageCritical,
      // Queue actions
      queueMessage,
      queueEdit,
      queueDelete,
      queueReaction,
      queueReadReceipt,
      // Sync actions
      syncNow,
      pauseSync,
      resumeSync,
      // Conflict resolution
      resolveConflict,
      resolveAllConflicts,
      dismissConflict,
      // Optimistic updates
      addOptimisticMessage,
      confirmOptimisticMessage,
      rollbackOptimisticMessage,
      getOptimisticMessagesForChannel,
      // Rollback
      rollbackOperation,
      // Storage
      checkStorageQuota,
      clearOfflineData,
      evictOldData,
      // Utility
      getPendingForChannel,
      retryFailed,
    }),
    [
      isOnline,
      isSyncing,
      syncProgress,
      pendingCount,
      pendingOperations,
      conflictCount,
      unresolvedConflicts,
      optimisticMessages,
      storageStats,
      storageStatus,
      lastSyncAt,
      hasPendingChanges,
      isStorageCritical,
      queueMessage,
      queueEdit,
      queueDelete,
      queueReaction,
      queueReadReceipt,
      syncNow,
      pauseSync,
      resumeSync,
      resolveConflict,
      resolveAllConflicts,
      dismissConflict,
      addOptimisticMessage,
      confirmOptimisticMessage,
      rollbackOptimisticMessage,
      getOptimisticMessagesForChannel,
      rollbackOperation,
      checkStorageQuota,
      clearOfflineData,
      evictOldData,
      getPendingForChannel,
      retryFailed,
    ],
  );
}

export default useOfflineReconciliation;
