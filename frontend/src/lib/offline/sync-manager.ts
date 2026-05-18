/**
 * Sync Manager - Orchestrates offline sync operations
 *
 * Manages synchronization of offline data with the server, including:
 * - Incremental sync (only new messages since last sync)
 * - Background sync with configurable intervals
 * - Conflict resolution
 * - Battery-aware sync scheduling
 * - Priority-based sync (important channels first)
 */

import {
  messageStorage,
  channelStorage,
  userStorage,
  queueStorage,
} from "./offline-storage";
import { SyncQueue, getSyncQueue } from "./sync-queue";
import { getNetworkDetector } from "./network-detector";
import type {
  SyncState,
  SyncResult,
  SyncOperationType,
  SyncStatus,
  QueuedAction,
  CachedMessage,
  CachedChannel,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface SyncManagerConfig {
  /** Enable automatic sync when online */
  autoSync: boolean;
  /** Sync interval in ms (default: 30s) */
  syncInterval: number;
  /** Sync on reconnect */
  syncOnReconnect: boolean;
  /** Enable background sync */
  backgroundSync: boolean;
  /** Battery threshold for background sync (0-100) */
  batteryThreshold: number;
  /** Maximum items per sync batch */
  batchSize: number;
  /** Priority channels to sync first */
  priorityChannels: string[];
}

export interface SyncProgress {
  operation: SyncOperationType;
  current: number;
  total: number;
  itemType: string;
}

export type SyncEventType =
  | "sync_started"
  | "sync_progress"
  | "sync_completed"
  | "sync_failed"
  | "sync_paused"
  | "sync_resumed";

export interface SyncEvent {
  type: SyncEventType;
  data?: SyncState | SyncProgress | SyncResult;
  timestamp: Date;
}

export type SyncEventListener = (event: SyncEvent) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: SyncManagerConfig = {
  autoSync: true,
  syncInterval: 30000, // 30 seconds
  syncOnReconnect: true,
  backgroundSync: true,
  batteryThreshold: 20, // Don't background sync below 20% battery
  batchSize: 100,
  priorityChannels: [],
};

// =============================================================================
// Sync Manager Class
// =============================================================================

export class SyncManager {
  private config: SyncManagerConfig;
  private syncQueue: SyncQueue;
  private state: SyncState;
  private listeners: Set<SyncEventListener> = new Set();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private lastSyncTime: Record<string, Date> = {}; // channelId -> last sync time
  private isSyncing = false;
  private isPaused = false;

  constructor(config: Partial<SyncManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.syncQueue = getSyncQueue({ autoProcess: false });

    this.state = {
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

    this.setupNetworkListeners();
    this.setupBatteryMonitoring();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize the sync manager
   */
  public async initialize(): Promise<void> {
    await this.syncQueue.initialize();

    if (this.config.autoSync) {
      this.startAutoSync();
    }

    // Update pending changes count
    this.state.pendingChanges = await queueStorage.countPending();
  }

  /**
   * Cleanup and shutdown
   */
  public async shutdown(): Promise<void> {
    this.stopAutoSync();
    this.syncQueue.destroy();
    this.listeners.clear();
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Perform full sync - sync all channels and messages
   */
  public async fullSync(): Promise<SyncResult> {
    return this.performSync("full_sync", async () => {
      const results: SyncResult[] = [];

      // 1. Sync queue (pending actions)
      results.push(await this.syncQueueItems());

      // 2. Sync channels
      results.push(await this.syncChannels());

      // 3. Sync messages for all channels
      const channels = await channelStorage.getAll();
      for (const channel of channels) {
        results.push(await this.syncChannelMessages(channel.id));
      }

      // Aggregate results
      return this.aggregateResults(results);
    });
  }

  /**
   * Perform incremental sync - only sync new data
   */
  public async incrementalSync(): Promise<SyncResult> {
    return this.performSync("incremental_sync", async () => {
      const results: SyncResult[] = [];

      // 1. Sync queue first (outgoing changes)
      results.push(await this.syncQueueItems());

      // 2. Sync new messages for each channel since last sync
      const channels = await channelStorage.getAll();
      for (const channel of channels) {
        const lastSync = this.lastSyncTime[channel.id];
        if (lastSync) {
          results.push(
            await this.syncChannelMessagesSince(channel.id, lastSync),
          );
        } else {
          // First sync for this channel
          results.push(await this.syncChannelMessages(channel.id, 100));
        }
        this.lastSyncTime[channel.id] = new Date();
      }

      return this.aggregateResults(results);
    });
  }

  /**
   * Sync a specific channel
   */
  public async syncChannel(channelId: string): Promise<SyncResult> {
    return this.performSync("channel_sync", async () => {
      const results: SyncResult[] = [];

      // Sync channel data
      results.push(await this.syncChannelData(channelId));

      // Sync channel messages
      results.push(await this.syncChannelMessages(channelId));

      this.lastSyncTime[channelId] = new Date();
      return this.aggregateResults(results);
    });
  }

  /**
   * Flush the sync queue
   */
  public async flushQueue(): Promise<SyncResult> {
    return this.performSync("queue_flush", async () => {
      return await this.syncQueueItems();
    });
  }

  // ===========================================================================
  // Private Sync Methods
  // ===========================================================================

  /**
   * Perform a sync operation with state management
   */
  private async performSync(
    operation: SyncOperationType,
    syncFn: () => Promise<SyncResult>,
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error("Sync already in progress");
    }

    if (this.isPaused) {
      throw new Error("Sync is paused");
    }

    const networkDetector = getNetworkDetector();
    if (!networkDetector.isOnline()) {
      throw new Error("Cannot sync while offline");
    }

    this.isSyncing = true;
    this.updateState({
      status: "syncing",
      operation,
      progress: 0,
      itemsProcessed: 0,
      error: null,
    });

    this.emit({
      type: "sync_started",
      data: this.state,
      timestamp: new Date(),
    });

    const startTime = Date.now();

    try {
      const result = await syncFn();
      const duration = Date.now() - startTime;

      this.updateState({
        status: result.success ? "completed" : "failed",
        operation: null,
        progress: 100,
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: result.success
          ? new Date()
          : this.state.lastSuccessfulSyncAt,
        error: result.success ? null : "Sync completed with errors",
        pendingChanges: await queueStorage.countPending(),
      });

      this.emit({
        type: result.success ? "sync_completed" : "sync_failed",
        data: { ...result, duration },
        timestamp: new Date(),
      });

      return { ...result, duration };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown sync error";
      const duration = Date.now() - startTime;

      this.updateState({
        status: "failed",
        operation: null,
        progress: 0,
        lastSyncAt: new Date(),
        error: errorMessage,
      });

      this.emit({
        type: "sync_failed",
        data: {
          success: false,
          operation,
          itemsSynced: 0,
          itemsFailed: 0,
          errors: [
            {
              itemId: "sync",
              itemType: "operation",
              operation,
              error: errorMessage,
              timestamp: new Date(),
            },
          ],
          duration,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      });

      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync queued items
   */
  private async syncQueueItems(): Promise<SyncResult> {
    const pending = await queueStorage.getPending();
    const result = await this.syncQueue.process();

    return {
      success: result.failed === 0,
      operation: "queue_flush",
      itemsSynced: result.processed,
      itemsFailed: result.failed,
      errors: result.errors.map((e) => ({
        itemId: e.id,
        itemType: "queue_item",
        operation: "sync",
        error: e.error,
        timestamp: new Date(),
      })),
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Sync all channels
   */
  private async syncChannels(): Promise<SyncResult> {
    // This would fetch channels from the API
    // For now, return empty result
    return {
      success: true,
      operation: "channel_sync",
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Sync specific channel data
   */
  private async syncChannelData(channelId: string): Promise<SyncResult> {
    // Fetch channel from API and update cache
    // For now, return empty result
    return {
      success: true,
      operation: "channel_sync",
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Sync messages for a channel (limited)
   */
  private async syncChannelMessages(
    channelId: string,
    limit = 1000,
  ): Promise<SyncResult> {
    // Fetch messages from API and update cache
    // For now, return empty result
    return {
      success: true,
      operation: "message_sync",
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Sync messages for a channel since a specific time
   */
  private async syncChannelMessagesSince(
    channelId: string,
    since: Date,
  ): Promise<SyncResult> {
    // Fetch messages from API where createdAt > since
    // For now, return empty result
    return {
      success: true,
      operation: "message_sync",
      itemsSynced: 0,
      itemsFailed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Aggregate multiple sync results
   */
  private aggregateResults(results: SyncResult[]): SyncResult {
    return {
      success: results.every((r) => r.success),
      operation: results[0]?.operation || "full_sync",
      itemsSynced: results.reduce((sum, r) => sum + r.itemsSynced, 0),
      itemsFailed: results.reduce((sum, r) => sum + r.itemsFailed, 0),
      errors: results.flatMap((r) => r.errors),
      duration: results.reduce((sum, r) => sum + r.duration, 0),
      timestamp: new Date(),
    };
  }

  // ===========================================================================
  // Auto Sync
  // ===========================================================================

  /**
   * Start automatic sync on interval
   */
  public startAutoSync(): void {
    if (this.syncTimer) {
      return;
    }

    this.syncTimer = setInterval(async () => {
      if (!this.isPaused && !this.isSyncing) {
        try {
          await this.incrementalSync();
        } catch (error) {
          logger.error("[SyncManager] Auto sync failed:", error);
        }
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic sync
   */
  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Pause sync operations
   */
  public pause(): void {
    this.isPaused = true;
    this.updateState({ status: "idle" });
    this.emit({ type: "sync_paused", timestamp: new Date() });
  }

  /**
   * Resume sync operations
   */
  public resume(): void {
    this.isPaused = false;
    this.emit({ type: "sync_resumed", timestamp: new Date() });
  }

  // ===========================================================================
  // Network & Battery Monitoring
  // ===========================================================================

  /**
   * Setup network listeners for auto-reconnect sync
   */
  private setupNetworkListeners(): void {
    if (typeof window === "undefined") return;

    const networkDetector = getNetworkDetector();
    networkDetector.subscribe((info) => {
      if (
        info.state === "online" &&
        this.config.syncOnReconnect &&
        !this.isSyncing
      ) {
        // Delay sync slightly to allow connection to stabilize
        setTimeout(() => {
          this.incrementalSync().catch((error) => {
            logger.error("[SyncManager] Reconnect sync failed:", error);
          });
        }, 1000);
      }
    });
  }

  /**
   * Setup battery monitoring for efficient sync
   */
  private setupBatteryMonitoring(): void {
    if (typeof navigator === "undefined" || !("getBattery" in navigator)) {
      return;
    }

    (navigator as any)
      .getBattery()
      .then((battery: any) => {
        const checkBattery = () => {
          const level = battery.level * 100;
          const charging = battery.charging;

          // Pause sync if battery is low and not charging
          if (
            level < this.config.batteryThreshold &&
            !charging &&
            !this.isPaused
          ) {
            // REMOVED: console.log('[SyncManager] Pausing sync due to low battery')
            this.pause();
          } else if (
            (level >= this.config.batteryThreshold || charging) &&
            this.isPaused
          ) {
            // REMOVED: console.log('[SyncManager] Resuming sync - battery ok')
            this.resume();
          }
        };

        battery.addEventListener("levelchange", checkBattery);
        battery.addEventListener("chargingchange", checkBattery);
        checkBattery();
      })
      .catch(() => {
        // Battery API not supported, continue without battery monitoring
      });
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
   * Check if currently syncing
   */
  public isSyncInProgress(): boolean {
    return this.isSyncing;
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
   * Emit sync event
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[SyncManager] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<SyncManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart auto sync if interval changed
    if (config.syncInterval || config.autoSync !== undefined) {
      this.stopAutoSync();
      if (this.config.autoSync) {
        this.startAutoSync();
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): SyncManagerConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let syncManagerInstance: SyncManager | null = null;

/**
 * Get the default sync manager instance
 */
export function getSyncManager(
  config?: Partial<SyncManagerConfig>,
): SyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager(config);
  }
  return syncManagerInstance;
}

/**
 * Reset the sync manager instance
 */
export function resetSyncManager(): void {
  if (syncManagerInstance) {
    syncManagerInstance.shutdown();
    syncManagerInstance = null;
  }
}

export default SyncManager;
