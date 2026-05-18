/**
 * Sync Service
 *
 * Handles synchronization after reconnection, fetching missed messages,
 * refreshing channels, and resolving conflicts.
 *
 * @module services/realtime/sync.service
 * @version 1.0.0
 */

import { realtimeClient, RealtimeConnectionState } from "./realtime-client";
import { getPresenceService } from "./presence.service";
import { getOfflineQueueService } from "./offline-queue";
import {
  getConflictResolutionService,
  type ConflictEntity,
} from "./conflict-resolution.service";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Sync status
 */
export type SyncStatus = "idle" | "syncing" | "completed" | "failed";

/**
 * Message for sync
 */
export interface SyncMessage {
  id: string;
  channelId: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  type: string;
  threadId?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
}

/**
 * Channel for sync
 */
export interface SyncChannel {
  id: string;
  name: string;
  type: string;
  lastMessageAt?: string;
  memberCount: number;
  unreadCount?: number;
}

/**
 * User presence for sync
 */
export interface SyncPresence {
  userId: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeenAt?: string;
}

/**
 * Sync result
 */
export interface SyncResult {
  messages: {
    synced: number;
    conflicts: number;
    errors: number;
  };
  channels: {
    synced: number;
    errors: number;
  };
  presence: {
    synced: number;
  };
  queueFlushed: {
    sent: number;
    failed: number;
  };
  timestamp: number;
  duration: number;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  messageId: string;
  resolution: "server" | "local" | "merged";
  finalContent: string;
  timestamp: number;
}

/**
 * Sync event types
 */
export type SyncEventType =
  | "sync:started"
  | "sync:progress"
  | "sync:completed"
  | "sync:failed"
  | "sync:conflict";

/**
 * Sync event listener
 */
export type SyncEventListener = (
  event: SyncEventType,
  data?: {
    progress?: number;
    result?: SyncResult;
    error?: string;
    conflict?: ConflictResolution;
  },
) => void;

/**
 * Sync configuration
 */
export interface SyncServiceConfig {
  /** Maximum messages to sync per channel */
  maxMessagesPerChannel?: number;
  /** Auto-sync on reconnection */
  autoSyncOnReconnect?: boolean;
  /** Sync timeout in ms */
  syncTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** LocalStorage key for sync timestamps */
  storageKey?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<SyncServiceConfig> = {
  maxMessagesPerChannel: 50,
  autoSyncOnReconnect: true,
  syncTimeout: 30000,
  debug: false,
  storageKey: "nchat:sync-state",
};

// ============================================================================
// Sync Service Class
// ============================================================================

/**
 * SyncService - Manages synchronization after reconnection
 */
class SyncService {
  private config: Required<SyncServiceConfig>;
  private status: SyncStatus = "idle";
  private lastSyncTimestamp: number | null = null;
  private channelSyncTimestamps = new Map<string, number>();
  private listeners = new Set<SyncEventListener>();
  private unsubscribers: Array<() => void> = [];
  private isInitialized = false;
  private currentSyncAbortController: AbortController | null = null;

  constructor(config: SyncServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the sync service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Load sync state from storage
    this.loadFromStorage();

    // Set up connection state listener
    if (this.config.autoSyncOnReconnect) {
      this.setupConnectionListener();
    }

    this.isInitialized = true;
    this.log("Sync service initialized");
  }

  /**
   * Destroy the sync service
   */
  destroy(): void {
    // Cancel any in-progress sync
    if (this.currentSyncAbortController) {
      this.currentSyncAbortController.abort();
      this.currentSyncAbortController = null;
    }

    // Cleanup listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.listeners.clear();

    // Save state before destroying
    this.saveToStorage();

    this.isInitialized = false;
    this.log("Sync service destroyed");
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  /**
   * Perform full sync on reconnection
   */
  async syncOnReconnect(): Promise<SyncResult> {
    if (this.status === "syncing") {
      this.log("Sync already in progress");
      throw new Error("Sync already in progress");
    }

    if (!realtimeClient.isConnected) {
      this.log("Cannot sync, not connected");
      throw new Error("Not connected");
    }

    const startTime = Date.now();
    this.status = "syncing";
    this.currentSyncAbortController = new AbortController();

    this.emit("sync:started");
    this.log("Starting full sync");

    const result: SyncResult = {
      messages: { synced: 0, conflicts: 0, errors: 0 },
      channels: { synced: 0, errors: 0 },
      presence: { synced: 0 },
      queueFlushed: { sent: 0, failed: 0 },
      timestamp: startTime,
      duration: 0,
    };

    try {
      // 1. Flush offline queue first
      this.emit("sync:progress", { progress: 10 });
      const offlineQueue = getOfflineQueueService();
      if (offlineQueue.initialized) {
        result.queueFlushed = await offlineQueue.flushQueue();
      }

      // 2. Sync channels
      this.emit("sync:progress", { progress: 30 });
      result.channels = await this.syncChannels();

      // 3. Sync presence
      this.emit("sync:progress", { progress: 70 });
      result.presence = await this.syncPresence();

      // 4. Update last sync timestamp
      this.lastSyncTimestamp = Date.now();
      this.saveToStorage();

      result.duration = Date.now() - startTime;
      this.status = "completed";

      this.emit("sync:completed", { result });
      this.emit("sync:progress", { progress: 100 });
      this.log("Sync completed:", result);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      this.status = "failed";

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.emit("sync:failed", { error: errorMessage });
      this.log("Sync failed:", errorMessage);

      throw error;
    } finally {
      this.currentSyncAbortController = null;
    }
  }

  /**
   * Get last successful sync timestamp
   */
  getLastSyncTimestamp(): number | null {
    return this.lastSyncTimestamp;
  }

  /**
   * Get last sync timestamp for a channel
   */
  getChannelSyncTimestamp(channelId: string): number | null {
    return this.channelSyncTimestamps.get(channelId) ?? null;
  }

  /**
   * Sync messages for a specific channel since last sync
   */
  async syncMessages(
    channelId: string,
    since?: number,
  ): Promise<{ messages: SyncMessage[]; conflicts: ConflictResolution[] }> {
    if (!realtimeClient.isConnected) {
      throw new Error("Not connected");
    }

    const sinceTimetamp =
      since ?? this.channelSyncTimestamps.get(channelId) ?? null;

    this.log(
      "Syncing messages for channel:",
      channelId,
      "since:",
      sinceTimetamp,
    );

    try {
      const response = await realtimeClient.emitAsync<
        { channelId: string; since: number | null; limit: number },
        { messages: SyncMessage[]; serverTime: number }
      >("sync:messages", {
        channelId,
        since: sinceTimetamp,
        limit: this.config.maxMessagesPerChannel,
      });

      // Update channel sync timestamp
      this.channelSyncTimestamps.set(channelId, response.serverTime);
      this.saveToStorage();

      // Check for conflicts with local optimistic updates
      const conflicts = await this.checkMessageConflicts(
        channelId,
        response.messages,
      );

      this.log(
        "Synced",
        response.messages.length,
        "messages,",
        conflicts.length,
        "conflicts",
      );

      return { messages: response.messages, conflicts };
    } catch (error) {
      this.log("Failed to sync messages:", error);
      throw error;
    }
  }

  /**
   * Sync channel list
   */
  async syncChannels(): Promise<{ synced: number; errors: number }> {
    if (!realtimeClient.isConnected) {
      throw new Error("Not connected");
    }

    this.log("Syncing channels");

    try {
      const response = await realtimeClient.emitAsync<
        { since: number | null },
        { channels: SyncChannel[]; serverTime: number }
      >("sync:channels", {
        since: this.lastSyncTimestamp,
      });

      this.log("Synced", response.channels.length, "channels");

      return { synced: response.channels.length, errors: 0 };
    } catch (error) {
      this.log("Failed to sync channels:", error);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Sync user presence for subscribed users
   */
  async syncPresence(): Promise<{ synced: number }> {
    if (!realtimeClient.isConnected) {
      return { synced: 0 };
    }

    const presenceService = getPresenceService();
    if (!presenceService.initialized) {
      return { synced: 0 };
    }

    const subscribedUsers = presenceService.getSubscribedUserIds();
    if (subscribedUsers.length === 0) {
      return { synced: 0 };
    }

    this.log("Syncing presence for", subscribedUsers.length, "users");

    try {
      const presenceMap = await presenceService.fetchPresence(subscribedUsers);

      this.log("Synced presence for", presenceMap.size, "users");

      return { synced: presenceMap.size };
    } catch (error) {
      this.log("Failed to sync presence:", error);
      return { synced: 0 };
    }
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  /**
   * Check for conflicts between local and remote messages
   */
  private async checkMessageConflicts(
    channelId: string,
    remoteMessages: SyncMessage[],
  ): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    const conflictService = getConflictResolutionService();

    if (!conflictService.initialized) {
      conflictService.initialize();
    }

    // In a real implementation, we would check against local state
    // For now, we'll just identify edited messages as potential conflicts
    for (const message of remoteMessages) {
      if (message.isEdited) {
        // Create conflict entity
        const entity: ConflictEntity = {
          id: message.id,
          type: "message:edit",
          localData: { content: message.content }, // Would be from local cache
          remoteData: { content: message.content },
          localTimestamp: Date.now(),
          remoteTimestamp: new Date(
            message.updatedAt || message.createdAt,
          ).getTime(),
        };

        // Detect and resolve conflict
        const detection = conflictService.detectConflict(entity);
        if (detection.hasConflict) {
          const resolution = conflictService.resolveConflict(detection);

          const syncResolution: ConflictResolution = {
            messageId: message.id,
            resolution:
              resolution.strategy === "server-wins" ? "server" : "local",
            finalContent: (resolution.resolvedData as { content: string })
              .content,
            timestamp: Date.now(),
          };
          conflicts.push(syncResolution);
          this.emit("sync:conflict", { conflict: syncResolution });
        }
      }
    }

    return conflicts;
  }

  /**
   * Reconcile conflicts between local and remote data
   * Default strategy: server wins for edits, last-write-wins for simple conflicts
   */
  reconcileConflicts(
    local: SyncMessage,
    remote: SyncMessage,
  ): ConflictResolution {
    // Compare timestamps
    const localTime = new Date(local.updatedAt || local.createdAt).getTime();
    const remoteTime = new Date(remote.updatedAt || remote.createdAt).getTime();

    // Server wins if it's more recent or if the message was edited on server
    if (remoteTime >= localTime || remote.isEdited) {
      return {
        messageId: remote.id,
        resolution: "server",
        finalContent: remote.content,
        timestamp: Date.now(),
      };
    }

    // Local wins if it's more recent and not a server edit
    return {
      messageId: local.id,
      resolution: "local",
      finalContent: local.content,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit(
    event: SyncEventType,
    data?: {
      progress?: number;
      result?: SyncResult;
      error?: string;
      conflict?: ConflictResolution;
    },
  ): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        logger.error("[SyncService] Listener error:", error);
      }
    });
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Load sync state from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return;
      }

      const state = JSON.parse(stored);

      this.lastSyncTimestamp = state.lastSyncTimestamp ?? null;
      this.channelSyncTimestamps = new Map(
        Object.entries(state.channelSyncTimestamps || {}).map(([k, v]) => [
          k,
          v as number,
        ]),
      );

      this.log("Loaded sync state from storage");
    } catch (error) {
      logger.error("[SyncService] Failed to load from storage:", error);
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * Save sync state to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const state = {
        lastSyncTimestamp: this.lastSyncTimestamp,
        channelSyncTimestamps: Object.fromEntries(this.channelSyncTimestamps),
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(state));
    } catch (error) {
      logger.error("[SyncService] Failed to save to storage:", error);
    }
  }

  // ============================================================================
  // Connection Handling
  // ============================================================================

  /**
   * Set up connection state listener
   */
  private setupConnectionListener(): void {
    let wasDisconnected = false;

    const unsub = realtimeClient.onConnectionStateChange(
      (state: RealtimeConnectionState) => {
        if (state === "disconnected" || state === "reconnecting") {
          wasDisconnected = true;
        } else if (
          (state === "connected" || state === "authenticated") &&
          wasDisconnected
        ) {
          // Reconnected after being disconnected
          wasDisconnected = false;
          this.log("Reconnected, starting sync");

          // Small delay to let connection stabilize
          setTimeout(() => {
            if (realtimeClient.isConnected) {
              this.syncOnReconnect().catch((error) => {
                this.log("Auto-sync failed:", error);
              });
            }
          }, 1000);
        }
      },
    );

    this.unsubscribers.push(unsub);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[SyncService]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current sync status
   */
  get syncStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Check if currently syncing
   */
  get isSyncing(): boolean {
    return this.status === "syncing";
  }

  /**
   * Cancel current sync operation
   */
  cancelSync(): void {
    if (this.currentSyncAbortController) {
      this.currentSyncAbortController.abort();
      this.currentSyncAbortController = null;
      this.status = "idle";
      this.log("Sync cancelled");
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let syncServiceInstance: SyncService | null = null;

/**
 * Get the sync service instance
 */
export function getSyncService(config?: SyncServiceConfig): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService(config);
  }
  return syncServiceInstance;
}

/**
 * Initialize the sync service
 */
export function initializeSyncService(config?: SyncServiceConfig): SyncService {
  const service = getSyncService(config);
  service.initialize();
  return service;
}

/**
 * Reset the sync service
 */
export function resetSyncService(): void {
  if (syncServiceInstance) {
    syncServiceInstance.destroy();
    syncServiceInstance = null;
  }
}

export { SyncService };
export default SyncService;
