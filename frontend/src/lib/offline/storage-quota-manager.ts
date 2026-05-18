/**
 * Storage Quota Manager - Manages IndexedDB storage quota and eviction
 *
 * Provides:
 * - Storage quota monitoring
 * - Automatic eviction of oldest data
 * - Storage status indicators
 * - Quota persistence
 */

import { getIndexedDB, IndexedDBWrapper } from "./indexed-db";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Storage status levels
 */
export type StorageStatus = "healthy" | "warning" | "critical" | "unknown";

/**
 * Storage statistics
 */
export interface StorageStats {
  used: number;
  quota: number;
  available: number;
  percentage: number;
  status: StorageStatus;
  breakdown: {
    messages: number;
    channels: number;
    users: number;
    queue: number;
    attachments: number;
  };
  lastUpdated: Date;
}

/**
 * Eviction result
 */
export interface EvictionResult {
  success: boolean;
  bytesFreed: number;
  itemsRemoved: {
    messages: number;
    attachments: number;
    channels: number;
  };
  duration: number;
}

/**
 * Storage event types
 */
export type StorageEventType =
  | "status_changed"
  | "quota_exceeded"
  | "eviction_started"
  | "eviction_completed"
  | "storage_cleared";

/**
 * Storage event
 */
export interface StorageEvent {
  type: StorageEventType;
  stats?: StorageStats;
  evictionResult?: EvictionResult;
  timestamp: Date;
}

/**
 * Storage event listener
 */
export type StorageEventListener = (event: StorageEvent) => void;

/**
 * Storage quota manager options
 */
export interface StorageQuotaOptions {
  /** Warning threshold percentage */
  warningThreshold: number;
  /** Critical threshold percentage */
  criticalThreshold: number;
  /** Target percentage after eviction */
  evictionTarget: number;
  /** Check interval in ms */
  checkInterval: number;
  /** Enable auto-eviction */
  autoEvict: boolean;
  /** Maximum age for messages in ms */
  maxMessageAge: number;
  /** Maximum age for attachments in ms */
  maxAttachmentAge: number;
  /** Minimum messages to keep per channel */
  minMessagesPerChannel: number;
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: StorageQuotaOptions = {
  warningThreshold: 80,
  criticalThreshold: 95,
  evictionTarget: 70,
  checkInterval: 60000, // 1 minute
  autoEvict: true,
  maxMessageAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxAttachmentAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  minMessagesPerChannel: 50,
};

// =============================================================================
// Storage Quota Manager
// =============================================================================

export class StorageQuotaManager {
  private options: StorageQuotaOptions;
  private db: IndexedDBWrapper;
  private listeners: Set<StorageEventListener> = new Set();
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private lastStats: StorageStats | null = null;
  private isEvicting = false;

  constructor(options: Partial<StorageQuotaOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.db = getIndexedDB();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Start monitoring storage quota
   */
  public start(): void {
    if (this.checkTimer) return;

    // Initial check
    this.checkQuota();

    // Periodic checks
    this.checkTimer = setInterval(() => {
      this.checkQuota();
    }, this.options.checkInterval);
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.stop();
    this.listeners.clear();
  }

  // ===========================================================================
  // Storage Statistics
  // ===========================================================================

  /**
   * Get current storage statistics
   */
  public async getStats(): Promise<StorageStats> {
    const estimate = await this.getStorageEstimate();
    const breakdown = await this.getStorageBreakdown();

    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - used;
    const percentage = quota > 0 ? (used / quota) * 100 : 0;

    const status = this.calculateStatus(percentage);

    const stats: StorageStats = {
      used,
      quota,
      available,
      percentage,
      status,
      breakdown,
      lastUpdated: new Date(),
    };

    // Track status changes
    if (this.lastStats && this.lastStats.status !== status) {
      this.emit({ type: "status_changed", stats, timestamp: new Date() });
    }

    this.lastStats = stats;
    return stats;
  }

  /**
   * Get last known stats (without async)
   */
  public getLastStats(): StorageStats | null {
    return this.lastStats;
  }

  /**
   * Get storage estimate from browser
   */
  private async getStorageEstimate(): Promise<StorageEstimate> {
    if (typeof navigator === "undefined" || !("storage" in navigator)) {
      return { usage: 0, quota: 0 };
    }

    try {
      return await navigator.storage.estimate();
    } catch {
      return { usage: 0, quota: 0 };
    }
  }

  /**
   * Get storage breakdown by store
   */
  private async getStorageBreakdown(): Promise<StorageStats["breakdown"]> {
    try {
      // These would be actual counts from IndexedDB
      // For now, return estimates based on record counts
      const messageCount = await this.db.count("messages");
      const channelCount = await this.db.count("channels");
      const userCount = await this.db.count("users");
      const queueCount = await this.db.count("syncQueue");

      // Estimate sizes (rough averages)
      const avgMessageSize = 2000; // 2KB per message
      const avgChannelSize = 500; // 0.5KB per channel
      const avgUserSize = 300; // 0.3KB per user
      const avgQueueSize = 1000; // 1KB per queue item

      return {
        messages: messageCount * avgMessageSize,
        channels: channelCount * avgChannelSize,
        users: userCount * avgUserSize,
        queue: queueCount * avgQueueSize,
        attachments: 0, // Would need separate tracking
      };
    } catch {
      return {
        messages: 0,
        channels: 0,
        users: 0,
        queue: 0,
        attachments: 0,
      };
    }
  }

  /**
   * Calculate status from percentage
   */
  private calculateStatus(percentage: number): StorageStatus {
    if (percentage >= this.options.criticalThreshold) {
      return "critical";
    }
    if (percentage >= this.options.warningThreshold) {
      return "warning";
    }
    if (percentage > 0) {
      return "healthy";
    }
    return "unknown";
  }

  // ===========================================================================
  // Quota Checking
  // ===========================================================================

  /**
   * Check quota and trigger eviction if needed
   */
  public async checkQuota(): Promise<StorageStats> {
    const stats = await this.getStats();

    if (
      stats.status === "critical" &&
      this.options.autoEvict &&
      !this.isEvicting
    ) {
      // Auto-evict when critical
      this.evictToTarget(this.options.evictionTarget);
    }

    return stats;
  }

  /**
   * Check if operation would exceed quota
   */
  public async wouldExceedQuota(estimatedBytes: number): Promise<boolean> {
    const stats = await this.getStats();
    const newPercentage = ((stats.used + estimatedBytes) / stats.quota) * 100;
    return newPercentage >= this.options.criticalThreshold;
  }

  /**
   * Request persistent storage
   */
  public async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator === "undefined" || !("storage" in navigator)) {
      return false;
    }

    try {
      const persisted = await navigator.storage.persist();
      return persisted;
    } catch {
      return false;
    }
  }

  /**
   * Check if storage is persistent
   */
  public async isPersistent(): Promise<boolean> {
    if (typeof navigator === "undefined" || !("storage" in navigator)) {
      return false;
    }

    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Eviction
  // ===========================================================================

  /**
   * Evict data until target percentage is reached
   */
  public async evictToTarget(
    targetPercentage: number,
  ): Promise<EvictionResult> {
    if (this.isEvicting) {
      return {
        success: false,
        bytesFreed: 0,
        itemsRemoved: { messages: 0, attachments: 0, channels: 0 },
        duration: 0,
      };
    }

    this.isEvicting = true;
    const startTime = Date.now();
    let bytesFreed = 0;
    const itemsRemoved = { messages: 0, attachments: 0, channels: 0 };

    this.emit({ type: "eviction_started", timestamp: new Date() });

    try {
      let stats = await this.getStats();
      const targetBytes = (stats.quota * targetPercentage) / 100;

      // 1. Remove old attachments first
      if (stats.used > targetBytes) {
        const attachmentResult = await this.evictOldAttachments();
        bytesFreed += attachmentResult.bytesFreed;
        itemsRemoved.attachments = attachmentResult.count;
        stats = await this.getStats();
      }

      // 2. Remove old messages
      if (stats.used > targetBytes) {
        const messageResult = await this.evictOldMessages();
        bytesFreed += messageResult.bytesFreed;
        itemsRemoved.messages = messageResult.count;
        stats = await this.getStats();
      }

      // 3. Remove inactive channels (no recent messages)
      if (stats.used > targetBytes) {
        const channelResult = await this.evictInactiveChannels();
        bytesFreed += channelResult.bytesFreed;
        itemsRemoved.channels = channelResult.count;
      }

      const result: EvictionResult = {
        success: true,
        bytesFreed,
        itemsRemoved,
        duration: Date.now() - startTime,
      };

      this.emit({
        type: "eviction_completed",
        evictionResult: result,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      logger.error("[StorageQuotaManager] Eviction failed:", error);
      return {
        success: false,
        bytesFreed,
        itemsRemoved,
        duration: Date.now() - startTime,
      };
    } finally {
      this.isEvicting = false;
    }
  }

  /**
   * Evict old attachments
   */
  private async evictOldAttachments(): Promise<{
    bytesFreed: number;
    count: number;
  }> {
    // Attachments would be in a separate store
    // For now, return empty result
    return { bytesFreed: 0, count: 0 };
  }

  /**
   * Evict old messages
   */
  private async evictOldMessages(): Promise<{
    bytesFreed: number;
    count: number;
  }> {
    const cutoff = new Date(Date.now() - this.options.maxMessageAge);
    let bytesFreed = 0;
    let count = 0;

    try {
      // Get all messages older than cutoff
      const messages = await this.db.getAll<{
        id: string;
        createdAt: string;
        channelId: string;
      }>("messages");
      const oldMessages = messages.filter(
        (msg) => new Date(msg.createdAt) < cutoff,
      );

      // Group by channel to respect minMessagesPerChannel
      const byChannel = new Map<string, typeof oldMessages>();
      for (const msg of oldMessages) {
        const existing = byChannel.get(msg.channelId) || [];
        existing.push(msg);
        byChannel.set(msg.channelId, existing);
      }

      // Delete old messages while keeping minimum per channel
      const toDelete: string[] = [];
      for (const [channelId, channelMessages] of byChannel) {
        const totalInChannel = messages.filter(
          (m) => m.channelId === channelId,
        ).length;
        const canDelete = Math.max(
          0,
          totalInChannel - this.options.minMessagesPerChannel,
        );
        const deleteCount = Math.min(canDelete, channelMessages.length);

        // Sort by date (oldest first) and take deleteCount
        const sorted = channelMessages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        for (let i = 0; i < deleteCount; i++) {
          toDelete.push(sorted[i].id);
        }
      }

      if (toDelete.length > 0) {
        await this.db.deleteMany("messages", toDelete);
        count = toDelete.length;
        bytesFreed = count * 2000; // Estimate 2KB per message
      }
    } catch (error) {
      logger.error("[StorageQuotaManager] Failed to evict messages:", error);
    }

    return { bytesFreed, count };
  }

  /**
   * Evict inactive channels
   */
  private async evictInactiveChannels(): Promise<{
    bytesFreed: number;
    count: number;
  }> {
    // Would need to track channel activity
    // For now, return empty result
    return { bytesFreed: 0, count: 0 };
  }

  /**
   * Clear all offline data
   */
  public async clearAllData(): Promise<void> {
    await Promise.all([
      this.db.clear("messages"),
      this.db.clear("channels"),
      this.db.clear("users"),
      this.db.clear("syncQueue"),
    ]);

    this.emit({ type: "storage_cleared", timestamp: new Date() });
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to storage events
   */
  public subscribe(listener: StorageEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event
   */
  private emit(event: StorageEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[StorageQuotaManager] Listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Format bytes for display
   */
  public static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get human-readable status text
   */
  public static getStatusText(status: StorageStatus): string {
    switch (status) {
      case "healthy":
        return "Storage is healthy";
      case "warning":
        return "Storage is getting full";
      case "critical":
        return "Storage is almost full";
      case "unknown":
      default:
        return "Storage status unknown";
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let storageQuotaManagerInstance: StorageQuotaManager | null = null;

/**
 * Get the storage quota manager instance
 */
export function getStorageQuotaManager(
  options?: Partial<StorageQuotaOptions>,
): StorageQuotaManager {
  if (!storageQuotaManagerInstance) {
    storageQuotaManagerInstance = new StorageQuotaManager(options);
  }
  return storageQuotaManagerInstance;
}

/**
 * Reset the storage quota manager instance
 */
export function resetStorageQuotaManager(): void {
  if (storageQuotaManagerInstance) {
    storageQuotaManagerInstance.cleanup();
    storageQuotaManagerInstance = null;
  }
}

export default StorageQuotaManager;
