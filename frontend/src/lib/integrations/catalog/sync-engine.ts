/**
 * Sync Engine
 *
 * Bidirectional sync management with conflict resolution, sync queues,
 * delta sync, full resync, and status tracking.
 */

import {
  type SyncDirection,
  type SyncQueueItem,
  type SyncState,
  type SyncConflict,
  type SyncResult,
  type ConflictResolutionStrategy,
  type SyncItemStatus,
  ConnectorError,
} from "./types";

// ============================================================================
// Sync Engine
// ============================================================================

export class SyncEngine {
  private queue: SyncQueueItem[] = [];
  private states: Map<string, SyncState> = new Map();
  private conflicts: Map<string, SyncConflict> = new Map();
  private processing = false;
  private maxQueueSize: number;
  private defaultMaxRetries: number;
  private onConflict?: (
    conflict: SyncConflict,
  ) => ConflictResolutionStrategy | null;
  private onItemProcessed?: (item: SyncQueueItem, success: boolean) => void;

  constructor(options?: {
    maxQueueSize?: number;
    defaultMaxRetries?: number;
    onConflict?: (conflict: SyncConflict) => ConflictResolutionStrategy | null;
    onItemProcessed?: (item: SyncQueueItem, success: boolean) => void;
  }) {
    this.maxQueueSize = options?.maxQueueSize ?? 10_000;
    this.defaultMaxRetries = options?.defaultMaxRetries ?? 3;
    this.onConflict = options?.onConflict;
    this.onItemProcessed = options?.onItemProcessed;
  }

  // ==========================================================================
  // Queue Management
  // ==========================================================================

  /**
   * Enqueue a sync item.
   */
  enqueue(
    item: Omit<SyncQueueItem, "id" | "status" | "retryCount" | "createdAt">,
  ): SyncQueueItem {
    if (this.queue.length >= this.maxQueueSize) {
      throw new ConnectorError(
        "Sync queue is full",
        "data",
        item.integrationId,
        { retryable: false },
      );
    }

    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: "pending",
      retryCount: 0,
      maxRetries: item.maxRetries || this.defaultMaxRetries,
      createdAt: new Date().toISOString(),
    };

    // Insert maintaining priority order (higher priority first)
    const insertIndex = this.queue.findIndex(
      (q) => q.priority < queueItem.priority,
    );
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    // Update sync state
    this.updateSyncState(item.integrationId, item.entityType, {
      pendingCount: 1,
    });

    return queueItem;
  }

  /**
   * Dequeue the next item to process.
   */
  dequeue(): SyncQueueItem | null {
    const index = this.queue.findIndex((item) => item.status === "pending");
    if (index === -1) return null;

    const item = this.queue[index];
    item.status = "syncing";
    item.processedAt = new Date().toISOString();
    return item;
  }

  /**
   * Mark an item as completed.
   */
  complete(itemId: string): void {
    const item = this.queue.find((q) => q.id === itemId);
    if (!item) return;

    item.status = "synced";
    item.processedAt = new Date().toISOString();

    this.updateSyncState(item.integrationId, item.entityType, {
      syncedCountInc: 1,
      pendingCountDec: 1,
    });

    this.onItemProcessed?.(item, true);

    // Remove completed items
    this.removeCompletedItems();
  }

  /**
   * Mark an item as errored.
   */
  error(itemId: string, errorMessage: string): void {
    const item = this.queue.find((q) => q.id === itemId);
    if (!item) return;

    item.retryCount++;
    item.error = errorMessage;

    if (item.retryCount >= item.maxRetries) {
      item.status = "error";
      this.updateSyncState(item.integrationId, item.entityType, {
        errorCountInc: 1,
        pendingCountDec: 1,
      });
      this.onItemProcessed?.(item, false);
    } else {
      item.status = "pending"; // Will be retried
    }
  }

  /**
   * Get queue size.
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get pending items count.
   */
  getPendingCount(): number {
    return this.queue.filter((q) => q.status === "pending").length;
  }

  /**
   * Get items by status.
   */
  getItemsByStatus(status: SyncItemStatus): SyncQueueItem[] {
    return this.queue.filter((q) => q.status === status);
  }

  /**
   * Get items for a specific integration.
   */
  getItemsForIntegration(integrationId: string): SyncQueueItem[] {
    return this.queue.filter((q) => q.integrationId === integrationId);
  }

  /**
   * Clear the queue.
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Clear items for a specific integration.
   */
  clearIntegrationQueue(integrationId: string): void {
    this.queue = this.queue.filter((q) => q.integrationId !== integrationId);
  }

  // ==========================================================================
  // Conflict Resolution
  // ==========================================================================

  /**
   * Detect a conflict between source and target data.
   */
  detectConflict(
    integrationId: string,
    entityType: string,
    entityId: string,
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>,
  ): SyncConflict | null {
    // Compare checksums to detect actual changes
    const sourceChecksum = this.computeChecksum(sourceData);
    const targetChecksum = this.computeChecksum(targetData);

    if (sourceChecksum === targetChecksum) {
      return null; // No conflict
    }

    const conflict: SyncConflict = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      integrationId,
      entityType,
      entityId,
      sourceData,
      targetData,
      detectedAt: new Date().toISOString(),
    };

    this.conflicts.set(conflict.id, conflict);

    // Try automatic resolution
    const autoResolution = this.onConflict?.(conflict);
    if (autoResolution) {
      return this.resolveConflict(conflict.id, autoResolution);
    }

    return conflict;
  }

  /**
   * Resolve a conflict.
   */
  resolveConflict(
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    resolvedBy?: string,
  ): SyncConflict | null {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return null;

    conflict.resolution = strategy;
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = resolvedBy;

    this.conflicts.set(conflictId, conflict);
    return conflict;
  }

  /**
   * Get the winning data based on resolution strategy.
   */
  getResolvedData(conflict: SyncConflict): Record<string, unknown> | null {
    if (!conflict.resolution) return null;

    switch (conflict.resolution) {
      case "source_wins":
        return conflict.sourceData;
      case "target_wins":
        return conflict.targetData;
      case "latest_wins": {
        const sourceTime = (conflict.sourceData.updatedAt as string) || "";
        const targetTime = (conflict.targetData.updatedAt as string) || "";
        return sourceTime > targetTime
          ? conflict.sourceData
          : conflict.targetData;
      }
      case "manual":
        return null; // Must be resolved manually
      default:
        return conflict.sourceData;
    }
  }

  /**
   * Get all unresolved conflicts.
   */
  getUnresolvedConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter((c) => !c.resolvedAt);
  }

  /**
   * Get conflicts for an integration.
   */
  getConflictsForIntegration(integrationId: string): SyncConflict[] {
    return Array.from(this.conflicts.values()).filter(
      (c) => c.integrationId === integrationId,
    );
  }

  /**
   * Get a specific conflict.
   */
  getConflict(conflictId: string): SyncConflict | null {
    return this.conflicts.get(conflictId) || null;
  }

  // ==========================================================================
  // Delta Sync
  // ==========================================================================

  /**
   * Compute a checksum for data comparison (delta detection).
   */
  computeChecksum(data: Record<string, unknown>): string {
    // Simple deterministic hash for delta detection
    const sorted = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash.toString(36);
  }

  /**
   * Determine if data has changed (for delta sync).
   */
  hasChanged(
    previousChecksum: string | undefined,
    currentData: Record<string, unknown>,
  ): boolean {
    if (!previousChecksum) return true;
    return this.computeChecksum(currentData) !== previousChecksum;
  }

  /**
   * Prepare delta sync items - only enqueue changed data.
   */
  prepareDeltaSync(
    integrationId: string,
    entityType: string,
    items: Array<{
      entityId: string;
      data: Record<string, unknown>;
      previousChecksum?: string;
    }>,
    direction: SyncDirection,
  ): SyncQueueItem[] {
    const enqueued: SyncQueueItem[] = [];

    for (const item of items) {
      if (this.hasChanged(item.previousChecksum, item.data)) {
        const queueItem = this.enqueue({
          integrationId,
          direction,
          entityType,
          entityId: item.entityId,
          operation: item.previousChecksum ? "update" : "create",
          payload: item.data,
          priority: 5,
          maxRetries: this.defaultMaxRetries,
          checksum: this.computeChecksum(item.data),
        });
        enqueued.push(queueItem);
      }
    }

    return enqueued;
  }

  // ==========================================================================
  // Full Resync
  // ==========================================================================

  /**
   * Prepare a full resync, clearing existing sync state.
   */
  prepareFullResync(
    integrationId: string,
    entityType: string,
    items: Array<{ entityId: string; data: Record<string, unknown> }>,
    direction: SyncDirection,
  ): SyncQueueItem[] {
    // Clear existing items for this integration/entity type
    this.queue = this.queue.filter(
      (q) =>
        !(q.integrationId === integrationId && q.entityType === entityType),
    );

    // Reset sync state
    const stateKey = `${integrationId}:${entityType}`;
    this.states.delete(stateKey);

    // Enqueue all items
    return items.map((item) =>
      this.enqueue({
        integrationId,
        direction,
        entityType,
        entityId: item.entityId,
        operation: "create",
        payload: item.data,
        priority: 3,
        maxRetries: this.defaultMaxRetries,
        checksum: this.computeChecksum(item.data),
      }),
    );
  }

  // ==========================================================================
  // Sync State Tracking
  // ==========================================================================

  /**
   * Get sync state for an integration/entity type.
   */
  getSyncState(integrationId: string, entityType: string): SyncState {
    const key = `${integrationId}:${entityType}`;
    return (
      this.states.get(key) || {
        integrationId,
        entityType,
        syncedCount: 0,
        pendingCount: 0,
        errorCount: 0,
        status: "idle",
        conflictResolution: "latest_wins",
      }
    );
  }

  /**
   * Update sync state.
   */
  private updateSyncState(
    integrationId: string,
    entityType: string,
    updates: {
      syncedCountInc?: number;
      pendingCount?: number;
      pendingCountDec?: number;
      errorCountInc?: number;
      lastSyncAt?: string;
      lastSyncCursor?: string;
      status?: SyncState["status"];
      conflictResolution?: ConflictResolutionStrategy;
    },
  ): void {
    const key = `${integrationId}:${entityType}`;
    const current = this.getSyncState(integrationId, entityType);

    const updated: SyncState = {
      ...current,
      syncedCount: current.syncedCount + (updates.syncedCountInc || 0),
      pendingCount: Math.max(
        0,
        current.pendingCount +
          (updates.pendingCount || 0) -
          (updates.pendingCountDec || 0),
      ),
      errorCount: current.errorCount + (updates.errorCountInc || 0),
      lastSyncAt: updates.lastSyncAt || current.lastSyncAt,
      lastSyncCursor: updates.lastSyncCursor || current.lastSyncCursor,
      status: updates.status || current.status,
      conflictResolution:
        updates.conflictResolution || current.conflictResolution,
    };

    this.states.set(key, updated);
  }

  /**
   * Set sync state for an integration/entity type.
   */
  setSyncState(
    integrationId: string,
    entityType: string,
    state: Partial<SyncState>,
  ): void {
    const key = `${integrationId}:${entityType}`;
    const current = this.getSyncState(integrationId, entityType);
    this.states.set(key, { ...current, ...state });
  }

  /**
   * Get all sync states.
   */
  getAllSyncStates(): SyncState[] {
    return Array.from(this.states.values());
  }

  // ==========================================================================
  // Batch Processing
  // ==========================================================================

  /**
   * Process the queue, executing a handler for each item.
   */
  async processQueue(
    handler: (item: SyncQueueItem) => Promise<void>,
    batchSize = 10,
  ): Promise<SyncResult[]> {
    if (this.processing) {
      throw new ConnectorError(
        "Queue is already being processed",
        "config",
        "sync-engine",
      );
    }

    this.processing = true;
    const results: Map<string, SyncResult> = new Map();
    const startTime = Date.now();

    try {
      let processed = 0;

      while (processed < batchSize) {
        const item = this.dequeue();
        if (!item) break;

        const resultKey = `${item.integrationId}:${item.entityType}:${item.direction}`;
        if (!results.has(resultKey)) {
          results.set(resultKey, {
            integrationId: item.integrationId,
            entityType: item.entityType,
            direction: item.direction,
            created: 0,
            updated: 0,
            deleted: 0,
            conflicts: 0,
            errors: 0,
            duration: 0,
            timestamp: new Date().toISOString(),
          });
        }

        const result = results.get(resultKey)!;

        try {
          await handler(item);
          this.complete(item.id);

          switch (item.operation) {
            case "create":
              result.created++;
              break;
            case "update":
              result.updated++;
              break;
            case "delete":
              result.deleted++;
              break;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.error(item.id, errorMessage);
          result.errors++;
        }

        processed++;
      }

      // Update durations
      const duration = Date.now() - startTime;
      for (const result of results.values()) {
        result.duration = duration;
      }
    } finally {
      this.processing = false;
    }

    return Array.from(results.values());
  }

  /**
   * Check if the engine is currently processing.
   */
  isProcessing(): boolean {
    return this.processing;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Remove completed items from the queue.
   */
  private removeCompletedItems(): void {
    this.queue = this.queue.filter((q) => q.status !== "synced");
  }

  /**
   * Get a summary of the current sync state.
   */
  getSummary(): {
    queueSize: number;
    pending: number;
    syncing: number;
    errors: number;
    conflicts: number;
    integrations: number;
  } {
    return {
      queueSize: this.queue.length,
      pending: this.queue.filter((q) => q.status === "pending").length,
      syncing: this.queue.filter((q) => q.status === "syncing").length,
      errors: this.queue.filter((q) => q.status === "error").length,
      conflicts: this.getUnresolvedConflicts().length,
      integrations: new Set(this.queue.map((q) => q.integrationId)).size,
    };
  }
}
