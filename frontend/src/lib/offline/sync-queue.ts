/**
 * Sync Queue - Manages offline action queue for synchronization
 *
 * Queues operations performed while offline and synchronizes them
 * when the connection is restored, with retry and conflict resolution.
 */

import { IndexedDBWrapper, getIndexedDB } from "./indexed-db";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Sync queue item status
 */
export type SyncItemStatus = "pending" | "syncing" | "failed" | "completed";

/**
 * Sync queue item type
 */
export type SyncItemType =
  | "message"
  | "reaction"
  | "read_receipt"
  | "typing"
  | "presence";

/**
 * Sync queue item operation
 */
export type SyncItemOperation = "create" | "update" | "delete";

/**
 * Sync queue item interface
 */
export interface SyncQueueItem<T = unknown> {
  id: string;
  type: SyncItemType;
  operation: SyncItemOperation;
  data: T;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  maxRetries: number;
  status: SyncItemStatus;
  error?: string;
  priority: number;
  channelId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Sync processor function type
 */
export type SyncProcessor<T = unknown> = (
  item: SyncQueueItem<T>,
) => Promise<void>;

/**
 * Sync queue configuration
 */
export interface SyncQueueConfig {
  /** Maximum number of retries */
  maxRetries: number;
  /** Base delay for exponential backoff (ms) */
  retryBaseDelay: number;
  /** Maximum delay between retries (ms) */
  retryMaxDelay: number;
  /** Enable automatic processing */
  autoProcess: boolean;
  /** Processing interval (ms) */
  processInterval: number;
  /** Maximum concurrent operations */
  maxConcurrent: number;
  /** Maximum queue size */
  maxQueueSize: number;
}

/**
 * Sync result
 */
export interface SyncResult {
  processed: number;
  failed: number;
  remaining: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Sync event types
 */
export type SyncEventType =
  | "item_added"
  | "item_processing"
  | "item_completed"
  | "item_failed"
  | "item_removed"
  | "queue_processing"
  | "queue_processed"
  | "queue_cleared";

/**
 * Sync event
 */
export interface SyncEvent {
  type: SyncEventType;
  item?: SyncQueueItem;
  result?: SyncResult;
  timestamp: number;
}

/**
 * Sync event listener
 */
export type SyncEventListener = (event: SyncEvent) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: SyncQueueConfig = {
  maxRetries: 5,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
  autoProcess: false,
  processInterval: 5000,
  maxConcurrent: 3,
  maxQueueSize: 1000,
};

// =============================================================================
// Sync Queue Class
// =============================================================================

/**
 * SyncQueue - Manages offline action synchronization
 */
export class SyncQueue {
  private db: IndexedDBWrapper;
  private config: SyncQueueConfig;
  private processors: Map<SyncItemType, SyncProcessor>;
  private listeners: Set<SyncEventListener>;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing: boolean = false;
  private initialized: boolean = false;

  constructor(config: Partial<SyncQueueConfig> = {}, db?: IndexedDBWrapper) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = db || getIndexedDB();
    this.processors = new Map();
    this.listeners = new Set();
  }

  /**
   * Initialize the sync queue
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.db.open();

    if (this.config.autoProcess) {
      this.startProcessing();
    }

    this.initialized = true;
  }

  /**
   * Destroy the sync queue
   */
  public destroy(): void {
    this.stopProcessing();
    this.listeners.clear();
    this.processors.clear();
    this.initialized = false;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  /**
   * Add an item to the sync queue
   */
  public async add<T>(
    type: SyncItemType,
    operation: SyncItemOperation,
    data: T,
    options?: {
      priority?: number;
      channelId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<SyncQueueItem<T>> {
    await this.ensureInitialized();

    // Check queue size limit
    const count = await this.count();
    if (count >= this.config.maxQueueSize) {
      throw new Error("Sync queue is full");
    }

    const now = new Date().toISOString();
    const item: SyncQueueItem<T> = {
      id: this.generateId(),
      type,
      operation,
      data,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      status: "pending",
      priority: options?.priority ?? this.getDefaultPriority(type),
      channelId: options?.channelId,
      metadata: options?.metadata,
    };

    await this.db.put("syncQueue", item);

    this.emit({
      type: "item_added",
      item: item as SyncQueueItem,
      timestamp: Date.now(),
    });

    return item;
  }

  /**
   * Get an item from the queue
   */
  public async get(id: string): Promise<SyncQueueItem | null> {
    await this.ensureInitialized();

    const item = await this.db.get<SyncQueueItem>("syncQueue", id);
    return item || null;
  }

  /**
   * Get all items in the queue
   */
  public async getAll(): Promise<SyncQueueItem[]> {
    await this.ensureInitialized();

    return this.db.getAll<SyncQueueItem>("syncQueue");
  }

  /**
   * Get pending items
   */
  public async getPending(): Promise<SyncQueueItem[]> {
    await this.ensureInitialized();

    const items = await this.db.getByIndex<SyncQueueItem>(
      "syncQueue",
      "status",
      "pending",
    );

    // Sort by priority (higher first) then by createdAt (older first)
    return items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get failed items
   */
  public async getFailed(): Promise<SyncQueueItem[]> {
    await this.ensureInitialized();

    return this.db.getByIndex<SyncQueueItem>("syncQueue", "status", "failed");
  }

  /**
   * Get items by type
   */
  public async getByType(type: SyncItemType): Promise<SyncQueueItem[]> {
    await this.ensureInitialized();

    return this.db.getByIndex<SyncQueueItem>("syncQueue", "type", type);
  }

  /**
   * Update an item's status
   */
  public async updateStatus(
    id: string,
    status: SyncItemStatus,
    error?: string,
  ): Promise<void> {
    await this.ensureInitialized();

    const item = await this.get(id);
    if (!item) {
      return;
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (error) {
      item.error = error;
    }

    await this.db.put("syncQueue", item);
  }

  /**
   * Remove an item from the queue
   */
  public async remove(id: string): Promise<void> {
    await this.ensureInitialized();

    const item = await this.get(id);
    await this.db.delete("syncQueue", id);

    if (item) {
      this.emit({ type: "item_removed", item, timestamp: Date.now() });
    }
  }

  /**
   * Clear all items from the queue
   */
  public async clear(): Promise<void> {
    await this.ensureInitialized();

    await this.db.clear("syncQueue");

    this.emit({ type: "queue_cleared", timestamp: Date.now() });
  }

  /**
   * Clear completed items
   */
  public async clearCompleted(): Promise<number> {
    await this.ensureInitialized();

    const completed = await this.db.getByIndex<SyncQueueItem>(
      "syncQueue",
      "status",
      "completed",
    );
    await this.db.deleteMany(
      "syncQueue",
      completed.map((item) => item.id),
    );

    return completed.length;
  }

  /**
   * Count items in the queue
   */
  public async count(): Promise<number> {
    await this.ensureInitialized();

    return this.db.count("syncQueue");
  }

  /**
   * Count pending items
   */
  public async countPending(): Promise<number> {
    await this.ensureInitialized();

    const pending = await this.getPending();
    return pending.length;
  }

  // ===========================================================================
  // Processing
  // ===========================================================================

  /**
   * Register a processor for a sync item type
   */
  public registerProcessor<T>(
    type: SyncItemType,
    processor: SyncProcessor<T>,
  ): void {
    this.processors.set(type, processor as SyncProcessor);
  }

  /**
   * Unregister a processor
   */
  public unregisterProcessor(type: SyncItemType): void {
    this.processors.delete(type);
  }

  /**
   * Process the sync queue
   */
  public async process(): Promise<SyncResult> {
    await this.ensureInitialized();

    if (this.isProcessing) {
      const pending = await this.countPending();
      return { processed: 0, failed: 0, remaining: pending, errors: [] };
    }

    this.isProcessing = true;
    this.emit({ type: "queue_processing", timestamp: Date.now() });

    const result: SyncResult = {
      processed: 0,
      failed: 0,
      remaining: 0,
      errors: [],
    };

    try {
      const pending = await this.getPending();

      // Process in batches based on maxConcurrent
      for (let i = 0; i < pending.length; i += this.config.maxConcurrent) {
        const batch = pending.slice(i, i + this.config.maxConcurrent);
        const batchResults = await Promise.allSettled(
          batch.map((item) => this.processItem(item)),
        );

        for (let j = 0; j < batchResults.length; j++) {
          const batchResult = batchResults[j];
          const item = batch[j];

          if (batchResult.status === "fulfilled") {
            result.processed++;
          } else {
            result.failed++;
            result.errors.push({
              id: item.id,
              error: batchResult.reason?.message || "Unknown error",
            });
          }
        }
      }

      result.remaining = await this.countPending();
    } finally {
      this.isProcessing = false;
    }

    this.emit({ type: "queue_processed", result, timestamp: Date.now() });

    return result;
  }

  /**
   * Process a single item
   */
  private async processItem(item: SyncQueueItem): Promise<void> {
    const processor = this.processors.get(item.type);

    if (!processor) {
      throw new Error(`No processor registered for type: ${item.type}`);
    }

    // Update status to syncing
    await this.updateStatus(item.id, "syncing");
    this.emit({ type: "item_processing", item, timestamp: Date.now() });

    try {
      await processor(item);

      // Mark as completed
      await this.updateStatus(item.id, "completed");
      this.emit({
        type: "item_completed",
        item: { ...item, status: "completed" },
        timestamp: Date.now(),
      });

      // Remove completed item after a short delay
      setTimeout(() => {
        this.remove(item.id).catch(() => {});
      }, 5000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Increment retry count
      item.retryCount++;

      if (item.retryCount >= item.maxRetries) {
        // Mark as failed
        await this.updateStatus(item.id, "failed", errorMessage);
        this.emit({
          type: "item_failed",
          item: { ...item, status: "failed", error: errorMessage },
          timestamp: Date.now(),
        });
        throw error;
      } else {
        // Mark as pending for retry
        await this.updateStatus(item.id, "pending", errorMessage);

        // Update in DB with new retry count
        await this.db.put("syncQueue", {
          ...item,
          retryCount: item.retryCount,
          status: "pending",
          error: errorMessage,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Retry failed items
   */
  public async retryFailed(): Promise<number> {
    await this.ensureInitialized();

    const failed = await this.getFailed();
    let count = 0;

    for (const item of failed) {
      if (item.retryCount < item.maxRetries) {
        await this.updateStatus(item.id, "pending");
        count++;
      }
    }

    return count;
  }

  /**
   * Start automatic processing
   */
  public startProcessing(): void {
    if (this.processTimer) {
      return;
    }

    this.processTimer = setInterval(async () => {
      try {
        await this.process();
      } catch (error) {
        logger.error("[SyncQueue] Processing error:", error);
      }
    }, this.config.processInterval);
  }

  /**
   * Stop automatic processing
   */
  public stopProcessing(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
  }

  /**
   * Check if currently processing
   */
  public isQueueProcessing(): boolean {
    return this.isProcessing;
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
  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[SyncQueue] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<SyncQueueConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart processing if interval changed
    if (
      config.processInterval !== undefined ||
      config.autoProcess !== undefined
    ) {
      this.stopProcessing();
      if (this.config.autoProcess) {
        this.startProcessing();
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): SyncQueueConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Conflict Resolution
  // ===========================================================================

  /**
   * Resolve conflicts for duplicate operations
   */
  public async resolveConflicts(): Promise<number> {
    await this.ensureInitialized();

    const all = await this.getAll();
    const conflicts: string[] = [];

    // Group by type + operation + data key
    const groups = new Map<string, SyncQueueItem[]>();

    for (const item of all) {
      const key = this.getConflictKey(item);
      const group = groups.get(key) || [];
      group.push(item);
      groups.set(key, group);
    }

    // Find and resolve conflicts
    for (const [, group] of groups) {
      if (group.length > 1) {
        // Sort by createdAt (newest first)
        group.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        // Keep the newest, remove the rest
        for (let i = 1; i < group.length; i++) {
          conflicts.push(group[i].id);
        }
      }
    }

    // Remove conflicting items
    await this.db.deleteMany("syncQueue", conflicts);

    return conflicts.length;
  }

  /**
   * Get conflict key for an item
   */
  private getConflictKey(item: SyncQueueItem): string {
    const data = item.data as Record<string, unknown>;
    const dataId = data.id || data.messageId || "";
    return `${item.type}:${item.operation}:${dataId}`;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Ensure the sync queue is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get default priority for an item type
   */
  private getDefaultPriority(type: SyncItemType): number {
    switch (type) {
      case "message":
        return 10;
      case "reaction":
        return 5;
      case "read_receipt":
        return 3;
      case "typing":
        return 1;
      case "presence":
        return 1;
      default:
        return 5;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  public calculateRetryDelay(retryCount: number): number {
    const delay = this.config.retryBaseDelay * Math.pow(2, retryCount);
    return Math.min(delay, this.config.retryMaxDelay);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let syncQueueInstance: SyncQueue | null = null;

/**
 * Get the default sync queue instance
 */
export function getSyncQueue(config?: Partial<SyncQueueConfig>): SyncQueue {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue(config);
  }
  return syncQueueInstance;
}

/**
 * Reset the default sync queue instance
 */
export function resetSyncQueue(): void {
  if (syncQueueInstance) {
    syncQueueInstance.destroy();
    syncQueueInstance = null;
  }
}

export default SyncQueue;
