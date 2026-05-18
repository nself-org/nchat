/**
 * Offline Manager - Coordinates offline state and synchronization
 *
 * Detects online/offline status, manages the sync queue,
 * and coordinates data synchronization when connectivity changes.
 */

import { CacheManager, getCacheManager } from "./cache-manager";
import { SyncQueue, getSyncQueue } from "./sync-queue";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Connection state
 */
export type ConnectionState =
  | "online"
  | "offline"
  | "connecting"
  | "reconnecting";

/**
 * Network quality
 */
export type NetworkQuality = "excellent" | "good" | "fair" | "poor" | "unknown";

/**
 * Connection information
 */
export interface ConnectionInfo {
  state: ConnectionState;
  quality: NetworkQuality;
  isOnline: boolean;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
  offlineDuration: number | null;
  downlink: number | null;
  rtt: number | null;
  effectiveType: string | null;
}

/**
 * Offline manager configuration
 */
export interface OfflineManagerConfig {
  /** Enable automatic sync on reconnect */
  syncOnReconnect: boolean;
  /** Sync delay after reconnect (ms) */
  syncDelay: number;
  /** Enable network quality monitoring */
  monitorQuality: boolean;
  /** Quality check interval (ms) */
  qualityCheckInterval: number;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Offline event types
 */
export type OfflineEventType =
  | "online"
  | "offline"
  | "quality_change"
  | "sync_start"
  | "sync_complete"
  | "sync_error";

/**
 * Offline event
 */
export interface OfflineEvent {
  type: OfflineEventType;
  data?: unknown;
  timestamp: number;
}

/**
 * Offline event listener
 */
export type OfflineEventListener = (event: OfflineEvent) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: OfflineManagerConfig = {
  syncOnReconnect: true,
  syncDelay: 1000,
  monitorQuality: true,
  qualityCheckInterval: 30000,
  debug: false,
};

// =============================================================================
// Offline Manager Class
// =============================================================================

/**
 * OfflineManager - Coordinates offline functionality
 */
export class OfflineManager {
  private config: OfflineManagerConfig;
  private cacheManager: CacheManager;
  private syncQueue: SyncQueue;
  private listeners: Set<OfflineEventListener>;
  private connectionInfo: ConnectionInfo;
  private qualityTimer: ReturnType<typeof setInterval> | null = null;
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialized: boolean = false;
  private boundHandlers: {
    online: () => void;
    offline: () => void;
  };

  constructor(
    config: Partial<OfflineManagerConfig> = {},
    cacheManager?: CacheManager,
    syncQueue?: SyncQueue,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cacheManager = cacheManager || getCacheManager();
    this.syncQueue = syncQueue || getSyncQueue();
    this.listeners = new Set();
    this.connectionInfo = this.getInitialConnectionInfo();
    this.boundHandlers = {
      online: this.handleOnline.bind(this),
      offline: this.handleOffline.bind(this),
    };
  }

  /**
   * Initialize the offline manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize dependencies
    await this.cacheManager.initialize();
    await this.syncQueue.initialize();

    // Set up event listeners
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.boundHandlers.online);
      window.addEventListener("offline", this.boundHandlers.offline);
    }

    // Start quality monitoring
    if (this.config.monitorQuality) {
      this.startQualityMonitoring();
    }

    this.initialized = true;
    this.log("Offline manager initialized");
  }

  /**
   * Destroy the offline manager
   */
  public destroy(): void {
    // Remove event listeners
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.boundHandlers.online);
      window.removeEventListener("offline", this.boundHandlers.offline);
    }

    // Stop quality monitoring
    this.stopQualityMonitoring();

    // Clear pending sync
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    // Clean up dependencies
    this.cacheManager.destroy();
    this.syncQueue.destroy();

    this.listeners.clear();
    this.initialized = false;

    this.log("Offline manager destroyed");
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  // ===========================================================================
  // Connection State
  // ===========================================================================

  /**
   * Get current connection info
   */
  public getConnectionInfo(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  /**
   * Check if currently online
   */
  public isOnline(): boolean {
    return this.connectionInfo.isOnline;
  }

  /**
   * Check if currently offline
   */
  public isOffline(): boolean {
    return !this.connectionInfo.isOnline;
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionInfo.state;
  }

  /**
   * Get network quality
   */
  public getNetworkQuality(): NetworkQuality {
    return this.connectionInfo.quality;
  }

  /**
   * Get time spent offline
   */
  public getOfflineDuration(): number | null {
    if (this.connectionInfo.isOnline) {
      return this.connectionInfo.offlineDuration;
    }

    if (this.connectionInfo.lastOfflineAt) {
      return Date.now() - this.connectionInfo.lastOfflineAt;
    }

    return null;
  }

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  /**
   * Queue an operation for sync
   */
  public async queueOperation(
    type: "message" | "reaction" | "read_receipt",
    operation: "create" | "update" | "delete",
    data: unknown,
    options?: { channelId?: string; priority?: number },
  ): Promise<void> {
    await this.ensureInitialized();

    await this.syncQueue.add(type, operation, data, options);

    this.log(`Queued ${type} ${operation} operation`);
  }

  /**
   * Get pending operation count
   */
  public async getPendingCount(): Promise<number> {
    await this.ensureInitialized();

    return this.syncQueue.countPending();
  }

  /**
   * Check if there are pending operations
   */
  public async hasPendingOperations(): Promise<boolean> {
    const count = await this.getPendingCount();
    return count > 0;
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Sync all pending operations
   */
  public async sync(): Promise<{ processed: number; failed: number }> {
    await this.ensureInitialized();

    if (!this.connectionInfo.isOnline) {
      this.log("Cannot sync while offline");
      return { processed: 0, failed: 0 };
    }

    this.emit({ type: "sync_start", timestamp: Date.now() });
    this.log("Starting sync");

    try {
      const result = await this.syncQueue.process();

      this.emit({
        type: "sync_complete",
        data: result,
        timestamp: Date.now(),
      });

      this.log(
        `Sync complete: ${result.processed} processed, ${result.failed} failed`,
      );

      return { processed: result.processed, failed: result.failed };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      this.emit({
        type: "sync_error",
        data: { error: errorMessage },
        timestamp: Date.now(),
      });

      this.log(`Sync error: ${errorMessage}`);

      throw error;
    }
  }

  /**
   * Force a sync attempt
   */
  public async forceSync(): Promise<{ processed: number; failed: number }> {
    return this.sync();
  }

  // ===========================================================================
  // Cache Operations
  // ===========================================================================

  /**
   * Get the cache manager
   */
  public getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  /**
   * Get the sync queue
   */
  public getSyncQueue(): SyncQueue {
    return this.syncQueue;
  }

  /**
   * Clear all offline data
   */
  public async clearAll(): Promise<void> {
    await this.ensureInitialized();

    await Promise.all([this.cacheManager.clearAll(), this.syncQueue.clear()]);

    this.log("All offline data cleared");
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to offline events
   */
  public subscribe(listener: OfflineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an offline event
   */
  private emit(event: OfflineEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[OfflineManager] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<OfflineManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Update quality monitoring
    this.stopQualityMonitoring();
    if (this.config.monitorQuality) {
      this.startQualityMonitoring();
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): OfflineManagerConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Handle online event
   */
  private handleOnline(): void {
    const now = Date.now();
    const offlineDuration = this.connectionInfo.lastOfflineAt
      ? now - this.connectionInfo.lastOfflineAt
      : null;

    this.connectionInfo = {
      ...this.connectionInfo,
      state: "online",
      isOnline: true,
      lastOnlineAt: now,
      offlineDuration,
    };

    this.updateQuality();
    this.emit({ type: "online", timestamp: now });
    this.log(`Came online after ${offlineDuration}ms`);

    // Schedule sync if enabled
    if (this.config.syncOnReconnect) {
      this.scheduleSync();
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    const now = Date.now();

    this.connectionInfo = {
      ...this.connectionInfo,
      state: "offline",
      isOnline: false,
      lastOfflineAt: now,
      quality: "unknown",
    };

    this.emit({ type: "offline", timestamp: now });
    this.log("Went offline");

    // Cancel pending sync
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }

  /**
   * Schedule a sync operation
   */
  private scheduleSync(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(async () => {
      try {
        await this.sync();
      } catch (error) {
        this.log(`Scheduled sync failed: ${error}`);
      }
    }, this.config.syncDelay);
  }

  /**
   * Start quality monitoring
   */
  private startQualityMonitoring(): void {
    if (this.qualityTimer) {
      return;
    }

    this.updateQuality();

    this.qualityTimer = setInterval(() => {
      this.updateQuality();
    }, this.config.qualityCheckInterval);
  }

  /**
   * Stop quality monitoring
   */
  private stopQualityMonitoring(): void {
    if (this.qualityTimer) {
      clearInterval(this.qualityTimer);
      this.qualityTimer = null;
    }
  }

  /**
   * Update network quality
   */
  private updateQuality(): void {
    const quality = this.measureQuality();
    const prevQuality = this.connectionInfo.quality;

    if (quality !== prevQuality) {
      this.connectionInfo.quality = quality;
      this.emit({
        type: "quality_change",
        data: { quality, previous: prevQuality },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Measure network quality
   */
  private measureQuality(): NetworkQuality {
    if (typeof navigator === "undefined") {
      return "unknown";
    }

    // Use Network Information API if available
    const connection = (
      navigator as Navigator & { connection?: NetworkInformation }
    ).connection;

    if (connection) {
      this.connectionInfo.downlink = connection.downlink ?? null;
      this.connectionInfo.rtt = connection.rtt ?? null;
      this.connectionInfo.effectiveType = connection.effectiveType ?? null;

      // Determine quality based on effective type and downlink
      if (connection.effectiveType === "4g" && (connection.downlink ?? 0) > 5) {
        return "excellent";
      } else if (connection.effectiveType === "4g") {
        return "good";
      } else if (connection.effectiveType === "3g") {
        return "fair";
      } else if (
        connection.effectiveType === "2g" ||
        connection.effectiveType === "slow-2g"
      ) {
        return "poor";
      }
    }

    // Fallback: assume good if online
    return this.connectionInfo.isOnline ? "good" : "unknown";
  }

  /**
   * Get initial connection info
   */
  private getInitialConnectionInfo(): ConnectionInfo {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    return {
      state: isOnline ? "online" : "offline",
      quality: "unknown",
      isOnline,
      lastOnlineAt: isOnline ? Date.now() : null,
      lastOfflineAt: isOnline ? null : Date.now(),
      offlineDuration: null,
      downlink: null,
      rtt: null,
      effectiveType: null,
    };
  }

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Log a debug message
   */
  private log(message: string): void {
    if (this.config.debug) {
    }
  }
}

// =============================================================================
// Network Information API Types
// =============================================================================

interface NetworkInformation {
  downlink?: number;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  rtt?: number;
  saveData?: boolean;
  onchange?: ((this: NetworkInformation, ev: Event) => void) | null;
}

// =============================================================================
// Singleton Instance
// =============================================================================

let offlineManagerInstance: OfflineManager | null = null;

/**
 * Get the default offline manager instance
 */
export function getOfflineManager(
  config?: Partial<OfflineManagerConfig>,
): OfflineManager {
  if (!offlineManagerInstance) {
    offlineManagerInstance = new OfflineManager(config);
  }
  return offlineManagerInstance;
}

/**
 * Reset the default offline manager instance
 */
export function resetOfflineManager(): void {
  if (offlineManagerInstance) {
    offlineManagerInstance.destroy();
    offlineManagerInstance = null;
  }
}

export default OfflineManager;
