/**
 * Optimistic Updates - Handle optimistic UI updates with rollback support
 *
 * Provides a pattern for showing pending changes immediately while
 * syncing in the background, with automatic rollback on failure.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Optimistic update state
 */
export type OptimisticState =
  | "pending"
  | "syncing"
  | "confirmed"
  | "failed"
  | "rolledback";

/**
 * Optimistic update record
 */
export interface OptimisticUpdate<T = unknown> {
  id: string;
  type: string;
  optimisticValue: T;
  originalValue?: T;
  confirmedValue?: T;
  state: OptimisticState;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Rollback callback
 */
export type RollbackCallback<T> = (
  original: T,
  optimistic: T,
) => void | Promise<void>;

/**
 * Confirm callback
 */
export type ConfirmCallback<T> = (
  confirmed: T,
  optimistic: T,
) => void | Promise<void>;

/**
 * Update callbacks
 */
export interface UpdateCallbacks<T> {
  onRollback?: RollbackCallback<T>;
  onConfirm?: ConfirmCallback<T>;
  onFail?: (error: Error, update: OptimisticUpdate<T>) => void;
}

/**
 * Optimistic updates manager options
 */
export interface OptimisticUpdatesOptions {
  /** Maximum number of pending updates */
  maxPending: number;
  /** Timeout for pending updates (ms) */
  pendingTimeout: number;
  /** Auto-rollback on timeout */
  autoRollbackOnTimeout: boolean;
  /** Enable state persistence */
  persistState: boolean;
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: OptimisticUpdatesOptions = {
  maxPending: 100,
  pendingTimeout: 30000, // 30 seconds
  autoRollbackOnTimeout: true,
  persistState: false,
};

// =============================================================================
// Optimistic Updates Manager
// =============================================================================

export class OptimisticUpdatesManager<T = unknown> {
  private options: OptimisticUpdatesOptions;
  private updates: Map<string, OptimisticUpdate<T>> = new Map();
  private callbacks: Map<string, UpdateCallbacks<T>> = new Map();
  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<(updates: OptimisticUpdate<T>[]) => void> = new Set();

  constructor(options: Partial<OptimisticUpdatesOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Add an optimistic update
   */
  public add(
    id: string,
    type: string,
    optimisticValue: T,
    originalValue?: T,
    callbacks?: UpdateCallbacks<T>,
  ): OptimisticUpdate<T> {
    // Check limit
    if (this.updates.size >= this.options.maxPending) {
      throw new Error("Maximum pending updates reached");
    }

    const now = new Date();
    const update: OptimisticUpdate<T> = {
      id,
      type,
      optimisticValue,
      originalValue,
      state: "pending",
      createdAt: now,
      updatedAt: now,
    };

    this.updates.set(id, update);

    if (callbacks) {
      this.callbacks.set(id, callbacks);
    }

    // Set timeout for auto-rollback
    if (this.options.autoRollbackOnTimeout) {
      const timeout = setTimeout(() => {
        this.handleTimeout(id);
      }, this.options.pendingTimeout);
      this.timeouts.set(id, timeout);
    }

    this.notifyListeners();
    return update;
  }

  /**
   * Mark update as syncing
   */
  public markSyncing(id: string): void {
    const update = this.updates.get(id);
    if (!update) return;

    update.state = "syncing";
    update.updatedAt = new Date();
    this.notifyListeners();
  }

  /**
   * Confirm an optimistic update succeeded
   */
  public async confirm(id: string, confirmedValue?: T): Promise<void> {
    const update = this.updates.get(id);
    if (!update) return;

    // Clear timeout
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    update.state = "confirmed";
    update.confirmedValue = confirmedValue ?? update.optimisticValue;
    update.updatedAt = new Date();

    // Call confirm callback
    const callbacks = this.callbacks.get(id);
    if (callbacks?.onConfirm) {
      try {
        await callbacks.onConfirm(
          update.confirmedValue,
          update.optimisticValue,
        );
      } catch (error) {
        logger.error("[OptimisticUpdates] Confirm callback error:", error);
      }
    }

    // Remove after confirmation
    setTimeout(() => {
      this.updates.delete(id);
      this.callbacks.delete(id);
      this.notifyListeners();
    }, 100);

    this.notifyListeners();
  }

  /**
   * Rollback an optimistic update
   */
  public async rollback(id: string, error?: string): Promise<void> {
    const update = this.updates.get(id);
    if (!update) return;

    // Clear timeout
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    update.state = "rolledback";
    update.error = error;
    update.updatedAt = new Date();

    // Call rollback callback
    const callbacks = this.callbacks.get(id);
    if (callbacks?.onRollback && update.originalValue !== undefined) {
      try {
        await callbacks.onRollback(
          update.originalValue,
          update.optimisticValue,
        );
      } catch (callbackError) {
        logger.error(
          "[OptimisticUpdates] Rollback callback error:",
          callbackError,
        );
      }
    }

    // Remove after rollback
    setTimeout(() => {
      this.updates.delete(id);
      this.callbacks.delete(id);
      this.notifyListeners();
    }, 100);

    this.notifyListeners();
  }

  /**
   * Mark update as failed (without rollback)
   */
  public async fail(id: string, error: Error): Promise<void> {
    const update = this.updates.get(id);
    if (!update) return;

    // Clear timeout
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    update.state = "failed";
    update.error = error.message;
    update.updatedAt = new Date();

    // Call fail callback
    const callbacks = this.callbacks.get(id);
    if (callbacks?.onFail) {
      try {
        callbacks.onFail(error, update);
      } catch (callbackError) {
        logger.error("[OptimisticUpdates] Fail callback error:", callbackError);
      }
    }

    this.notifyListeners();
  }

  /**
   * Get an update by ID
   */
  public get(id: string): OptimisticUpdate<T> | undefined {
    return this.updates.get(id);
  }

  /**
   * Get all updates
   */
  public getAll(): OptimisticUpdate<T>[] {
    return Array.from(this.updates.values());
  }

  /**
   * Get pending updates
   */
  public getPending(): OptimisticUpdate<T>[] {
    return this.getAll().filter(
      (u) => u.state === "pending" || u.state === "syncing",
    );
  }

  /**
   * Get updates by type
   */
  public getByType(type: string): OptimisticUpdate<T>[] {
    return this.getAll().filter((u) => u.type === type);
  }

  /**
   * Get failed updates
   */
  public getFailed(): OptimisticUpdate<T>[] {
    return this.getAll().filter((u) => u.state === "failed");
  }

  /**
   * Check if an update exists
   */
  public has(id: string): boolean {
    return this.updates.has(id);
  }

  /**
   * Remove an update
   */
  public remove(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
    this.updates.delete(id);
    this.callbacks.delete(id);
    this.notifyListeners();
  }

  /**
   * Clear all updates
   */
  public clear(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.updates.clear();
    this.callbacks.clear();
    this.notifyListeners();
  }

  /**
   * Get count of pending updates
   */
  public count(): number {
    return this.updates.size;
  }

  /**
   * Subscribe to update changes
   */
  public subscribe(
    listener: (updates: OptimisticUpdate<T>[]) => void,
  ): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getAll());
    return () => this.listeners.delete(listener);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Handle timeout for an update
   */
  private handleTimeout(id: string): void {
    const update = this.updates.get(id);
    if (!update || update.state !== "pending") return;

    this.timeouts.delete(id);
    this.rollback(id, "Update timed out");
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const updates = this.getAll();
    this.listeners.forEach((listener) => {
      try {
        listener(updates);
      } catch (error) {
        logger.error("[OptimisticUpdates] Listener error:", error);
      }
    });
  }
}

// =============================================================================
// Message-specific Optimistic Updates
// =============================================================================

/**
 * Pending message data
 */
export interface PendingMessageData {
  tempId: string;
  channelId: string;
  content: string;
  senderId: string;
  senderName: string;
  attachments?: Array<{ id: string; name: string; type: string; size: number }>;
}

/**
 * Optimistic updates manager for messages
 */
export class MessageOptimisticUpdates extends OptimisticUpdatesManager<PendingMessageData> {
  /**
   * Add a pending message
   */
  public addMessage(
    tempId: string,
    channelId: string,
    content: string,
    senderId: string,
    senderName: string,
    callbacks?: UpdateCallbacks<PendingMessageData>,
  ): OptimisticUpdate<PendingMessageData> {
    return this.add(
      tempId,
      "message",
      { tempId, channelId, content, senderId, senderName },
      undefined,
      callbacks,
    );
  }

  /**
   * Add a pending edit
   */
  public addEdit(
    messageId: string,
    channelId: string,
    newContent: string,
    originalContent: string,
    senderId: string,
    senderName: string,
    callbacks?: UpdateCallbacks<PendingMessageData>,
  ): OptimisticUpdate<PendingMessageData> {
    return this.add(
      messageId,
      "edit",
      {
        tempId: messageId,
        channelId,
        content: newContent,
        senderId,
        senderName,
      },
      {
        tempId: messageId,
        channelId,
        content: originalContent,
        senderId,
        senderName,
      },
      callbacks,
    );
  }

  /**
   * Get pending messages for a channel
   */
  public getForChannel(
    channelId: string,
  ): OptimisticUpdate<PendingMessageData>[] {
    return this.getAll().filter(
      (u) => u.optimisticValue.channelId === channelId,
    );
  }
}

// =============================================================================
// Singleton Instances
// =============================================================================

let messageOptimisticUpdatesInstance: MessageOptimisticUpdates | null = null;

/**
 * Get the message optimistic updates instance
 */
export function getMessageOptimisticUpdates(): MessageOptimisticUpdates {
  if (!messageOptimisticUpdatesInstance) {
    messageOptimisticUpdatesInstance = new MessageOptimisticUpdates();
  }
  return messageOptimisticUpdatesInstance;
}

/**
 * Reset the message optimistic updates instance
 */
export function resetMessageOptimisticUpdates(): void {
  if (messageOptimisticUpdatesInstance) {
    messageOptimisticUpdatesInstance.clear();
    messageOptimisticUpdatesInstance = null;
  }
}

export default OptimisticUpdatesManager;
