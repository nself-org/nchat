/**
 * useOfflineStatus Hook
 *
 * Comprehensive hook for tracking offline status, message queue, and sync state.
 * Integrates with OfflineQueueService and SyncService for full offline support.
 *
 * @module hooks/use-offline-status
 * @version 1.0.0
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  realtimeClient,
  RealtimeConnectionState,
  ConnectionQuality,
} from "@/services/realtime/realtime-client";
import {
  getOfflineQueueService,
  initializeOfflineQueue,
  QueuedMessage,
  QueueEventType,
} from "@/services/realtime/offline-queue";
import {
  getSyncService,
  initializeSyncService,
  SyncStatus,
  SyncResult,
  SyncEventType,
} from "@/services/realtime/sync.service";

// ============================================================================
// Types
// ============================================================================

/**
 * Offline status state
 */
export interface OfflineStatusState {
  /** Whether the browser is online */
  isOnline: boolean;
  /** Whether the socket is connected */
  isConnected: boolean;
  /** Current connection state */
  connectionState: RealtimeConnectionState;
  /** Connection quality */
  connectionQuality: ConnectionQuality;
  /** Average latency in ms */
  latency: number | null;
  /** Number of messages in offline queue */
  queueCount: number;
  /** Whether queue is being flushed */
  isFlushing: boolean;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSyncAt: number | null;
  /** Was previously offline (needs sync) */
  wasOffline: boolean;
}

/**
 * Offline status actions
 */
export interface OfflineStatusActions {
  /** Manually trigger sync */
  sync: () => Promise<SyncResult | null>;
  /** Flush the offline queue */
  flushQueue: () => Promise<{ sent: number; failed: number }>;
  /** Clear the offline queue */
  clearQueue: () => void;
  /** Get queued messages */
  getQueuedMessages: () => QueuedMessage[];
  /** Queue a message for sending */
  queueMessage: (
    message: Omit<QueuedMessage, "id" | "timestamp" | "retries">,
  ) => QueuedMessage;
  /** Remove a message from queue */
  removeFromQueue: (id: string) => boolean;
}

/**
 * useOfflineStatus hook options
 */
export interface UseOfflineStatusOptions {
  /** Enable offline queue service */
  enableQueue?: boolean;
  /** Enable sync service */
  enableSync?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * useOfflineStatus hook return type
 */
export type UseOfflineStatusReturn = OfflineStatusState & OfflineStatusActions;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Comprehensive hook for offline status tracking
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const {
 *     isOnline,
 *     isConnected,
 *     queueCount,
 *     isSyncing,
 *     sync,
 *     queueMessage,
 *   } = useOfflineStatus();
 *
 *   const handleSendMessage = async (content: string, channelId: string) => {
 *     if (!isConnected) {
 *       // Queue message for later
 *       queueMessage({ content, channelId, type: 'text' });
 *       return;
 *     }
 *     // Send normally
 *     await sendMessage(content, channelId);
 *   };
 *
 *   return (
 *     <div>
 *       {!isOnline && <span>Offline</span>}
 *       {queueCount > 0 && <span>{queueCount} messages queued</span>}
 *       {isSyncing && <span>Syncing...</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOfflineStatus(
  options: UseOfflineStatusOptions = {},
): UseOfflineStatusReturn {
  const { enableQueue = true, enableSync = true, debug = false } = options;

  // State
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] =
    useState<RealtimeConnectionState>("disconnected");
  const [connectionQuality, setConnectionQuality] =
    useState<ConnectionQuality>("unknown");
  const [latency, setLatency] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [wasOffline, setWasOffline] = useState(false);

  // Refs
  const unsubscribersRef = useRef<Array<() => void>>([]);

  // ============================================================================
  // Logging
  // ============================================================================

  const log = useCallback(
    (...args: unknown[]) => {
      if (debug) {
        // REMOVED: console.log('[useOfflineStatus]', ...args)
      }
    },
    [debug],
  );

  // ============================================================================
  // Queue Operations
  // ============================================================================

  /**
   * Get queued messages
   */
  const getQueuedMessages = useCallback((): QueuedMessage[] => {
    if (!enableQueue) return [];
    const queue = getOfflineQueueService();
    return queue.initialized ? queue.getQueuedMessages() : [];
  }, [enableQueue]);

  /**
   * Queue a message
   */
  const queueMessage = useCallback(
    (
      message: Omit<QueuedMessage, "id" | "timestamp" | "retries">,
    ): QueuedMessage => {
      if (!enableQueue) {
        throw new Error("Offline queue is not enabled");
      }
      const queue = getOfflineQueueService();
      if (!queue.initialized) {
        initializeOfflineQueue({ debug });
      }
      return queue.queueMessage(message);
    },
    [enableQueue, debug],
  );

  /**
   * Remove from queue
   */
  const removeFromQueue = useCallback(
    (id: string): boolean => {
      if (!enableQueue) return false;
      const queue = getOfflineQueueService();
      return queue.initialized ? queue.removeFromQueue(id) : false;
    },
    [enableQueue],
  );

  /**
   * Flush the queue
   */
  const flushQueue = useCallback(async (): Promise<{
    sent: number;
    failed: number;
  }> => {
    if (!enableQueue) return { sent: 0, failed: 0 };
    const queue = getOfflineQueueService();
    return queue.initialized
      ? await queue.flushQueue()
      : { sent: 0, failed: 0 };
  }, [enableQueue]);

  /**
   * Clear the queue
   */
  const clearQueue = useCallback((): void => {
    if (!enableQueue) return;
    const queue = getOfflineQueueService();
    if (queue.initialized) {
      queue.clearQueue();
    }
  }, [enableQueue]);

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Trigger manual sync
   */
  const sync = useCallback(async (): Promise<SyncResult | null> => {
    if (!enableSync) return null;

    const syncService = getSyncService();
    if (!syncService.initialized) {
      initializeSyncService({ debug });
    }

    try {
      const result = await syncService.syncOnReconnect();
      setLastSyncAt(result.timestamp);
      setWasOffline(false);
      realtimeClient.clearWasOffline();
      return result;
    } catch (error) {
      log("Sync failed:", error);
      return null;
    }
  }, [enableSync, debug, log]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Initialize services and set up listeners
   */
  useEffect(() => {
    // Initialize queue service
    if (enableQueue) {
      const queue = initializeOfflineQueue({ debug });
      setQueueCount(queue.getQueueLength());

      // Subscribe to queue events
      const unsubQueue = queue.subscribe((event: QueueEventType) => {
        log("Queue event:", event);

        switch (event) {
          case "message:queued":
          case "message:sent":
          case "message:failed":
          case "queue:cleared":
            setQueueCount(queue.getQueueLength());
            break;
          case "queue:flushing":
            setIsFlushing(true);
            break;
          case "queue:flushed":
            setIsFlushing(false);
            setQueueCount(queue.getQueueLength());
            break;
        }
      });

      unsubscribersRef.current.push(unsubQueue);
    }

    // Initialize sync service
    if (enableSync) {
      const syncService = initializeSyncService({ debug });
      setLastSyncAt(syncService.getLastSyncTimestamp());

      // Subscribe to sync events
      const unsubSync = syncService.subscribe((event: SyncEventType, data) => {
        log("Sync event:", event, data);

        switch (event) {
          case "sync:started":
            setSyncStatus("syncing");
            break;
          case "sync:completed":
            setSyncStatus("completed");
            if (data?.result) {
              setLastSyncAt(data.result.timestamp);
              setWasOffline(false);
            }
            break;
          case "sync:failed":
            setSyncStatus("failed");
            break;
        }
      });

      unsubscribersRef.current.push(unsubSync);
    }

    return () => {
      unsubscribersRef.current.forEach((unsub) => unsub());
      unsubscribersRef.current = [];
    };
  }, [enableQueue, enableSync, debug, log]);

  /**
   * Subscribe to realtime client events
   */
  useEffect(() => {
    // Connection state changes
    const unsubConnection = realtimeClient.onConnectionStateChange((state) => {
      log("Connection state:", state);
      setConnectionState(state);
      setIsConnected(state === "connected" || state === "authenticated");
    });

    unsubscribersRef.current.push(unsubConnection);

    // Offline status changes
    const unsubOffline = realtimeClient.onOfflineStatusChange((online) => {
      log("Online status:", online);
      setIsOnline(online);
      if (!online) {
        setWasOffline(true);
      }
    });

    unsubscribersRef.current.push(unsubOffline);

    // Reconnection events
    const unsubReconnection = realtimeClient.onReconnection(
      (attempts, wasOffline) => {
        log("Reconnected after", attempts, "attempts, wasOffline:", wasOffline);
        setWasOffline(wasOffline);
      },
    );

    unsubscribersRef.current.push(unsubReconnection);

    // Initial state
    setIsOnline(realtimeClient.isOnline);
    setIsConnected(realtimeClient.isConnected);
    setConnectionState(realtimeClient.state);
    setConnectionQuality(realtimeClient.connectionQuality);
    setLatency(realtimeClient.averageLatency);
    setWasOffline(realtimeClient.wasOffline);

    return () => {
      // Cleanup is handled in the first useEffect
    };
  }, [log]);

  /**
   * Browser online/offline events
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      log("Browser online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      log("Browser offline");
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [log]);

  /**
   * Update connection quality periodically
   */
  useEffect(() => {
    const updateQuality = () => {
      setConnectionQuality(realtimeClient.connectionQuality);
      setLatency(realtimeClient.averageLatency);
    };

    const interval = setInterval(updateQuality, 5000);
    updateQuality();

    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    isOnline,
    isConnected,
    connectionState,
    connectionQuality,
    latency,
    queueCount,
    isFlushing,
    syncStatus,
    isSyncing: syncStatus === "syncing",
    lastSyncAt,
    wasOffline,
    // Actions
    sync,
    flushQueue,
    clearQueue,
    getQueuedMessages,
    queueMessage,
    removeFromQueue,
  };
}

export default useOfflineStatus;
