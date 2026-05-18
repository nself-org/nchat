/**
 * Offline Queue - Manages queued actions for offline mode
 *
 * Actions performed while offline are queued and processed
 * when the connection is restored.
 */

import { queueStorage } from "./offline-storage";
import type {
  QueuedAction,
  QueuedActionType,
  QueuePriority,
  QueueItemStatus,
  QueuedSendMessage,
  QueuedEditMessage,
  QueuedDeleteMessage,
  QueuedReaction,
  OfflineConfig,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Queue event types
 */
export type QueueEventType =
  | "item_added"
  | "item_updated"
  | "item_removed"
  | "item_processing"
  | "item_completed"
  | "item_failed"
  | "queue_cleared"
  | "queue_flushing";

/**
 * Queue event listener
 */
export type QueueEventListener = (event: {
  type: QueueEventType;
  item?: QueuedAction;
  details?: Record<string, unknown>;
}) => void;

/**
 * Action processor function
 */
export type ActionProcessor<T = unknown> = (
  action: QueuedAction<T>,
) => Promise<void>;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique ID for queue items
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get priority for action type
 */
function getPriorityForType(type: QueuedActionType): QueuePriority {
  switch (type) {
    case "send_message":
    case "edit_message":
    case "delete_message":
      return "high";

    case "add_reaction":
    case "remove_reaction":
    case "mark_read":
      return "normal";

    case "update_typing":
    case "update_presence":
      return "low";

    default:
      return "normal";
  }
}

// =============================================================================
// Offline Queue Class
// =============================================================================

class OfflineQueue {
  private config: OfflineConfig;
  private listeners: Set<QueueEventListener> = new Set();
  private processors: Map<QueuedActionType, ActionProcessor> = new Map();
  private isProcessing: boolean = false;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<OfflineConfig>) {
    this.config = {
      cacheEnabled: true,
      maxCacheSize: 50 * 1024 * 1024,
      maxCacheAge: 7 * 24 * 60 * 60 * 1000,
      cacheChannelMessages: 100,
      cacheChannels: 50,
      queueEnabled: true,
      maxQueueSize: 100,
      maxQueueAge: 24 * 60 * 60 * 1000,
      autoSync: true,
      syncInterval: 30 * 1000,
      syncOnReconnect: true,
      backgroundSync: true,
      retry: {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        strategy: "exponential",
        factor: 2,
        jitter: true,
        retryOn: [408, 429, 500, 502, 503, 504],
      },
      networkCheckInterval: 10000,
      networkCheckUrl: "/api/health",
      storageWarningThreshold: 40 * 1024 * 1024,
      storageCriticalThreshold: 48 * 1024 * 1024,
      ...config,
    };
  }

  /**
   * Initialize the queue
   */
  public initialize(): void {
    if (!this.config.queueEnabled) return;

    // Start periodic cleanup
    this.cleanupInterval = setInterval(
      () => this.cleanupOldItems(),
      60 * 1000, // Every minute
    );
  }

  /**
   * Cleanup the queue manager
   */
  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.listeners.clear();
    this.processors.clear();
  }

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  /**
   * Add an item to the queue
   */
  async add<T>(
    type: QueuedActionType,
    payload: T,
    options?: {
      priority?: QueuePriority;
      channelId?: string;
      messageId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<QueuedAction<T>> {
    if (!this.config.queueEnabled) {
      throw new Error("Queue is disabled");
    }

    // Check queue size limit
    const currentSize = await queueStorage.count();
    if (currentSize >= this.config.maxQueueSize) {
      // Remove oldest low-priority items
      await this.evictLowPriorityItems();
    }

    const now = new Date();
    const action: QueuedAction<T> = {
      id: generateId(),
      type,
      payload,
      priority: options?.priority ?? getPriorityForType(type),
      status: "pending",
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: this.config.retry.maxRetries,
      lastError: null,
      channelId: options?.channelId,
      messageId: options?.messageId,
      metadata: options?.metadata,
    };

    await queueStorage.add(action as QueuedAction);

    this.emit({ type: "item_added", item: action as QueuedAction });

    return action;
  }

  /**
   * Add a message to send
   */
  async addSendMessage(
    message: QueuedSendMessage,
  ): Promise<QueuedAction<QueuedSendMessage>> {
    return this.add("send_message", message, {
      channelId: message.channelId,
    });
  }

  /**
   * Add a message edit
   */
  async addEditMessage(
    edit: QueuedEditMessage,
  ): Promise<QueuedAction<QueuedEditMessage>> {
    return this.add("edit_message", edit, {
      channelId: edit.channelId,
      messageId: edit.messageId,
    });
  }

  /**
   * Add a message deletion
   */
  async addDeleteMessage(
    deletion: QueuedDeleteMessage,
  ): Promise<QueuedAction<QueuedDeleteMessage>> {
    return this.add("delete_message", deletion, {
      channelId: deletion.channelId,
      messageId: deletion.messageId,
    });
  }

  /**
   * Add a reaction
   */
  async addReaction(
    reaction: QueuedReaction,
  ): Promise<QueuedAction<QueuedReaction>> {
    return this.add("add_reaction", reaction, {
      channelId: reaction.channelId,
      messageId: reaction.messageId,
    });
  }

  /**
   * Remove a reaction
   */
  async removeReaction(
    reaction: QueuedReaction,
  ): Promise<QueuedAction<QueuedReaction>> {
    return this.add("remove_reaction", reaction, {
      channelId: reaction.channelId,
      messageId: reaction.messageId,
    });
  }

  /**
   * Get all queued items
   */
  async getAll(): Promise<QueuedAction[]> {
    return queueStorage.getAll();
  }

  /**
   * Get pending items
   */
  async getPending(): Promise<QueuedAction[]> {
    return queueStorage.getPending();
  }

  /**
   * Get items by channel
   */
  async getByChannel(channelId: string): Promise<QueuedAction[]> {
    return queueStorage.getByChannel(channelId);
  }

  /**
   * Get a specific item
   */
  async get(id: string): Promise<QueuedAction | undefined> {
    return queueStorage.get(id);
  }

  /**
   * Update an item's status
   */
  async updateStatus(id: string, status: QueueItemStatus): Promise<void> {
    const item = await queueStorage.get(id);
    if (!item) return;

    await queueStorage.update(id, { status });
    this.emit({ type: "item_updated", item: { ...item, status } });
  }

  /**
   * Mark an item as failed
   */
  async markFailed(id: string, error: string): Promise<void> {
    const item = await queueStorage.get(id);
    if (!item) return;

    const updates = {
      status: "failed" as QueueItemStatus,
      lastError: error,
      retryCount: item.retryCount + 1,
    };

    await queueStorage.update(id, updates);
    this.emit({ type: "item_failed", item: { ...item, ...updates } });
  }

  /**
   * Mark an item as completed
   */
  async markCompleted(id: string): Promise<void> {
    const item = await queueStorage.get(id);
    if (!item) return;

    await queueStorage.update(id, { status: "completed" });
    this.emit({
      type: "item_completed",
      item: { ...item, status: "completed" },
    });

    // Remove completed items immediately or keep for a short time
    setTimeout(() => {
      queueStorage.remove(id);
    }, 5000);
  }

  /**
   * Remove an item from the queue
   */
  async remove(id: string): Promise<void> {
    const item = await queueStorage.get(id);
    await queueStorage.remove(id);

    if (item) {
      this.emit({ type: "item_removed", item });
    }
  }

  /**
   * Clear all items from the queue
   */
  async clear(): Promise<void> {
    await queueStorage.clear();
    this.emit({ type: "queue_cleared" });
  }

  /**
   * Get queue count
   */
  async count(): Promise<number> {
    return queueStorage.count();
  }

  /**
   * Get pending count
   */
  async countPending(): Promise<number> {
    return queueStorage.countPending();
  }

  // ===========================================================================
  // Queue Processing
  // ===========================================================================

  /**
   * Register a processor for an action type
   */
  registerProcessor<T>(
    type: QueuedActionType,
    processor: ActionProcessor<T>,
  ): void {
    this.processors.set(type, processor as ActionProcessor);
  }

  /**
   * Process all pending items
   */
  async processQueue(): Promise<{
    processed: number;
    failed: number;
    remaining: number;
  }> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, remaining: await this.countPending() };
    }

    this.isProcessing = true;
    this.emit({ type: "queue_flushing" });

    let processed = 0;
    let failed = 0;

    try {
      const pending = await this.getPending();

      for (const item of pending) {
        const processor = this.processors.get(item.type);

        if (!processor) {
          logger.warn(`[OfflineQueue] No processor for type: ${item.type}`);
          continue;
        }

        // Mark as processing
        await this.updateStatus(item.id, "processing");
        this.emit({ type: "item_processing", item });

        try {
          await processor(item);
          await this.markCompleted(item.id);
          processed++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          if (item.retryCount < item.maxRetries) {
            // Mark as pending for retry
            await queueStorage.update(item.id, {
              status: "pending",
              lastError: errorMessage,
              retryCount: item.retryCount + 1,
            });
          } else {
            await this.markFailed(item.id, errorMessage);
            failed++;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }

    const remaining = await this.countPending();

    // REMOVED: console.log(
    //   `[OfflineQueue] Processed: ${processed}, Failed: ${failed}, Remaining: ${remaining}`
    // )

    return { processed, failed, remaining };
  }

  /**
   * Check if queue is being processed
   */
  isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Remove old items from the queue
   */
  private async cleanupOldItems(): Promise<void> {
    const items = await this.getAll();
    const now = Date.now();
    const maxAge = this.config.maxQueueAge;

    let removed = 0;

    for (const item of items) {
      const age = now - new Date(item.createdAt).getTime();

      // Remove items older than max age
      if (age > maxAge) {
        await this.remove(item.id);
        removed++;
      }
    }

    if (removed > 0) {
    }

    // Also remove completed items
    await queueStorage.removeCompleted();
  }

  /**
   * Evict low-priority items when queue is full
   */
  private async evictLowPriorityItems(): Promise<void> {
    const items = await this.getAll();

    // Sort by priority (low first) then by age (oldest first)
    const sorted = items.sort((a, b) => {
      const priorityOrder = { low: 0, normal: 1, high: 2 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // Remove 10% of items
    const toRemove = Math.ceil(sorted.length * 0.1);

    for (let i = 0; i < toRemove && i < sorted.length; i++) {
      await this.remove(sorted[i].id);
    }
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to queue events
   */
  subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a queue event
   */
  private emit(event: {
    type: QueueEventType;
    item?: QueuedAction;
    details?: Record<string, unknown>;
  }): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[OfflineQueue] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  setConfig(config: Partial<OfflineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): OfflineConfig {
    return { ...this.config };
  }

  /**
   * Check if queue is enabled
   */
  isEnabled(): boolean {
    return this.config.queueEnabled;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let offlineQueue: OfflineQueue | null = null;

/**
 * Get or create the offline queue singleton
 */
export function getOfflineQueue(config?: Partial<OfflineConfig>): OfflineQueue {
  if (!offlineQueue) {
    offlineQueue = new OfflineQueue(config);
  }
  return offlineQueue;
}

/**
 * Initialize the offline queue
 */
export function initializeOfflineQueue(
  config?: Partial<OfflineConfig>,
): OfflineQueue {
  const queue = getOfflineQueue(config);
  queue.initialize();
  return queue;
}

/**
 * Cleanup the offline queue
 */
export function cleanupOfflineQueue(): void {
  if (offlineQueue) {
    offlineQueue.cleanup();
    offlineQueue = null;
  }
}

export { OfflineQueue };
export default getOfflineQueue;
