/**
 * Offline Sync - Synchronization manager for offline data
 *
 * Handles syncing cached data with the server when connection is restored,
 * and processing queued actions.
 */

import { getOfflineCache, type OfflineCache } from "./offline-cache";
import { getOfflineQueue, type OfflineQueue } from "./offline-queue";
import {
  getConnectionManager,
  type CombinedConnectionState,
} from "./connection-manager";
import type {
  SyncState,
  SyncStatus,
  SyncOperationType,
  SyncResult,
  SyncError,
  CachedChannel,
  CachedMessage,
  CachedUser,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Sync event types
 */
export type SyncEventType =
  | "sync_started"
  | "sync_progress"
  | "sync_completed"
  | "sync_failed"
  | "sync_cancelled";

/**
 * Sync event listener
 */
export type SyncEventListener = (event: {
  type: SyncEventType;
  state: SyncState;
  result?: SyncResult;
}) => void;

/**
 * Data fetcher functions
 */
export interface DataFetchers {
  fetchChannels: () => Promise<CachedChannel[]>;
  fetchMessages: (
    channelId: string,
    limit?: number,
  ) => Promise<CachedMessage[]>;
  fetchUsers: () => Promise<CachedUser[]>;
}

/**
 * Sync options
 */
export interface SyncOptions {
  fullSync?: boolean;
  channelIds?: string[];
  skipQueue?: boolean;
}

// =============================================================================
// Offline Sync Class
// =============================================================================

class OfflineSync {
  private cache: OfflineCache;
  private queue: OfflineQueue;
  private listeners: Set<SyncEventListener> = new Set();
  private fetchers: DataFetchers | null = null;
  private state: SyncState;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private connectionUnsubscribe: (() => void) | null = null;
  private isCancelled: boolean = false;
  private autoSyncEnabled: boolean = true;
  private syncIntervalMs: number = 30000;

  constructor() {
    this.cache = getOfflineCache();
    this.queue = getOfflineQueue();
    this.state = this.getInitialState();
  }

  /**
   * Get initial sync state
   */
  private getInitialState(): SyncState {
    return {
      status: "idle",
      operation: null,
      progress: 0,
      itemsProcessed: 0,
      itemsTotal: 0,
      lastSyncAt: null,
      lastSuccessfulSyncAt: null,
      error: null,
      pendingChanges: 0,
    };
  }

  /**
   * Initialize the sync manager
   */
  public initialize(fetchers: DataFetchers): void {
    this.fetchers = fetchers;

    // Subscribe to connection changes
    const connectionManager = getConnectionManager();
    this.connectionUnsubscribe = connectionManager.subscribe(
      this.handleConnectionChange,
    );

    // Start periodic sync if enabled
    if (this.autoSyncEnabled) {
      this.startPeriodicSync();
    }
  }

  /**
   * Cleanup the sync manager
   */
  public cleanup(): void {
    if (this.connectionUnsubscribe) {
      this.connectionUnsubscribe();
      this.connectionUnsubscribe = null;
    }

    this.stopPeriodicSync();
    this.listeners.clear();
    this.isCancelled = true;
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionChange = (state: CombinedConnectionState): void => {
    // Connection restored - sync
    if (state.canSendMessages && this.state.status === "idle") {
      this.sync({ skipQueue: false });
    }
  };

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Start a sync operation
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.state.status === "syncing") {
      return this.createResult(
        "incremental_sync",
        false,
        "Sync already in progress",
      );
    }

    if (!this.fetchers) {
      return this.createResult(
        "incremental_sync",
        false,
        "Fetchers not configured",
      );
    }

    const connectionManager = getConnectionManager();
    if (!connectionManager.isConnected()) {
      return this.createResult("incremental_sync", false, "Not connected");
    }

    this.isCancelled = false;
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let itemsSynced = 0;
    let itemsFailed = 0;

    const operation: SyncOperationType = options.fullSync
      ? "full_sync"
      : "incremental_sync";

    this.updateState({
      status: "syncing",
      operation,
      progress: 0,
      itemsProcessed: 0,
      error: null,
    });

    this.emit({ type: "sync_started", state: this.state });

    try {
      // Step 1: Process queue (unless skipped)
      if (!options.skipQueue) {
        const queueResult = await this.processQueue();
        itemsSynced += queueResult.processed;
        itemsFailed += queueResult.failed;
      }

      if (this.isCancelled) {
        throw new Error("Sync cancelled");
      }

      // Step 2: Sync channels
      this.updateProgress(20, "Syncing channels...");
      const channelResult = await this.syncChannels();
      itemsSynced += channelResult.synced;
      errors.push(...channelResult.errors);

      if (this.isCancelled) {
        throw new Error("Sync cancelled");
      }

      // Step 3: Sync messages for specified channels or all cached channels
      this.updateProgress(40, "Syncing messages...");
      const messageResult = await this.syncMessages(options.channelIds);
      itemsSynced += messageResult.synced;
      errors.push(...messageResult.errors);

      if (this.isCancelled) {
        throw new Error("Sync cancelled");
      }

      // Step 4: Sync users
      this.updateProgress(80, "Syncing users...");
      const userResult = await this.syncUsers();
      itemsSynced += userResult.synced;
      errors.push(...userResult.errors);

      // Complete
      this.updateProgress(100, "Sync complete");

      const result = this.createResult(operation, true, undefined, {
        itemsSynced,
        itemsFailed,
        errors,
        duration: Date.now() - startTime,
      });

      this.updateState({
        status: "completed",
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        pendingChanges: 0,
      });

      this.emit({ type: "sync_completed", state: this.state, result });

      // REMOVED: console.log(
      //   `[OfflineSync] Sync completed: ${itemsSynced} items synced, ${itemsFailed} failed`
      // )

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const result = this.createResult(operation, false, errorMessage, {
        itemsSynced,
        itemsFailed,
        errors,
        duration: Date.now() - startTime,
      });

      this.updateState({
        status: this.isCancelled ? "idle" : "failed",
        error: errorMessage,
        lastSyncAt: new Date(),
      });

      this.emit({
        type: this.isCancelled ? "sync_cancelled" : "sync_failed",
        state: this.state,
        result,
      });

      logger.error("[OfflineSync] Sync failed:", errorMessage);

      return result;
    }
  }

  /**
   * Process the offline queue
   */
  private async processQueue(): Promise<{ processed: number; failed: number }> {
    this.updateProgress(10, "Processing offline queue...");

    const result = await this.queue.processQueue();

    return {
      processed: result.processed,
      failed: result.failed,
    };
  }

  /**
   * Sync channels from server
   */
  private async syncChannels(): Promise<{
    synced: number;
    errors: SyncError[];
  }> {
    const errors: SyncError[] = [];

    try {
      const channels = await this.fetchers!.fetchChannels();
      await this.cache.setChannels(channels);

      return { synced: channels.length, errors };
    } catch (error) {
      errors.push({
        itemId: "channels",
        itemType: "channel",
        operation: "fetch",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });

      return { synced: 0, errors };
    }
  }

  /**
   * Sync messages from server
   */
  private async syncMessages(
    channelIds?: string[],
  ): Promise<{ synced: number; errors: SyncError[] }> {
    const errors: SyncError[] = [];
    let synced = 0;

    // Get channels to sync
    const channels = channelIds
      ? channelIds
      : (await this.cache.getAllChannels()).map((c) => c.id);

    const totalChannels = channels.length;

    for (let i = 0; i < totalChannels; i++) {
      if (this.isCancelled) break;

      const channelId = channels[i];

      try {
        const messages = await this.fetchers!.fetchMessages(channelId);
        await this.cache.setMessages(messages);
        synced += messages.length;
      } catch (error) {
        errors.push({
          itemId: channelId,
          itemType: "message",
          operation: "fetch",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        });
      }

      // Update progress
      const progress = 40 + (40 * (i + 1)) / totalChannels;
      this.updateProgress(
        progress,
        `Syncing messages (${i + 1}/${totalChannels})...`,
      );
    }

    return { synced, errors };
  }

  /**
   * Sync users from server
   */
  private async syncUsers(): Promise<{ synced: number; errors: SyncError[] }> {
    const errors: SyncError[] = [];

    try {
      const users = await this.fetchers!.fetchUsers();
      await this.cache.setUsers(users);

      return { synced: users.length, errors };
    } catch (error) {
      errors.push({
        itemId: "users",
        itemType: "user",
        operation: "fetch",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });

      return { synced: 0, errors };
    }
  }

  /**
   * Cancel ongoing sync
   */
  public cancel(): void {
    if (this.state.status === "syncing") {
      this.isCancelled = true;
    }
  }

  // ===========================================================================
  // Periodic Sync
  // ===========================================================================

  /**
   * Start periodic sync
   */
  public startPeriodicSync(intervalMs?: number): void {
    if (intervalMs) {
      this.syncIntervalMs = intervalMs;
    }

    this.stopPeriodicSync();

    this.syncInterval = setInterval(() => {
      const connectionManager = getConnectionManager();
      if (connectionManager.isConnected()) {
        this.sync({ skipQueue: true });
      }
    }, this.syncIntervalMs);
  }

  /**
   * Stop periodic sync
   */
  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Enable/disable auto sync
   */
  public setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;

    if (enabled) {
      this.startPeriodicSync();
    } else {
      this.stopPeriodicSync();
    }
  }

  // ===========================================================================
  // State Management
  // ===========================================================================

  /**
   * Get current sync state
   */
  public getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Update sync state
   */
  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Update sync progress
   */
  private updateProgress(progress: number, message?: string): void {
    this.updateState({
      progress: Math.min(100, Math.max(0, progress)),
    });

    if (message) {
    }

    this.emit({ type: "sync_progress", state: this.state });
  }

  /**
   * Create a sync result object
   */
  private createResult(
    operation: SyncOperationType,
    success: boolean,
    errorMessage?: string,
    details?: {
      itemsSynced?: number;
      itemsFailed?: number;
      errors?: SyncError[];
      duration?: number;
    },
  ): SyncResult {
    return {
      success,
      operation,
      itemsSynced: details?.itemsSynced ?? 0,
      itemsFailed: details?.itemsFailed ?? 0,
      errors:
        details?.errors ??
        (errorMessage
          ? [
              {
                itemId: "sync",
                itemType: "sync",
                operation: "sync",
                error: errorMessage,
                timestamp: new Date(),
              },
            ]
          : []),
      duration: details?.duration ?? 0,
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to sync events
   */
  public subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a sync event
   */
  private emit(event: {
    type: SyncEventType;
    state: SyncState;
    result?: SyncResult;
  }): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[OfflineSync] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  /**
   * Check if sync is in progress
   */
  public isSyncing(): boolean {
    return this.state.status === "syncing";
  }

  /**
   * Get last sync time
   */
  public getLastSyncTime(): Date | null {
    return this.state.lastSyncAt;
  }

  /**
   * Get time since last sync
   */
  public getTimeSinceLastSync(): number | null {
    if (!this.state.lastSyncAt) return null;
    return Date.now() - this.state.lastSyncAt.getTime();
  }

  /**
   * Get pending changes count
   */
  public async getPendingChangesCount(): Promise<number> {
    return this.queue.countPending();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let offlineSync: OfflineSync | null = null;

/**
 * Get or create the offline sync singleton
 */
export function getOfflineSync(): OfflineSync {
  if (!offlineSync) {
    offlineSync = new OfflineSync();
  }
  return offlineSync;
}

/**
 * Initialize the offline sync
 */
export function initializeOfflineSync(fetchers: DataFetchers): OfflineSync {
  const sync = getOfflineSync();
  sync.initialize(fetchers);
  return sync;
}

/**
 * Cleanup the offline sync
 */
export function cleanupOfflineSync(): void {
  if (offlineSync) {
    offlineSync.cleanup();
    offlineSync = null;
  }
}

export { OfflineSync };
export default getOfflineSync;
