/**
 * Reconciliation Manager - Orchestrates offline-first queue and sync conflict handling
 *
 * Provides a deterministic local queue with conflict merge and reconciliation UX:
 * - Message queueing while offline
 * - Edit and delete operations
 * - Reactions and read receipts
 * - Conflict detection and resolution
 * - Optimistic updates with rollback
 * - Progress indicators
 */

import { getOfflineQueue, type OfflineQueue } from "./offline-queue";
import { getSyncQueue, type SyncQueue } from "./sync-queue";
import {
  getConflictResolver,
  ConflictResolver,
  type Conflict,
  type ResolutionStrategy,
} from "./conflict-resolver";
import { getNetworkDetector, NetworkDetector } from "./network-detector";
import { queueStorage } from "./offline-storage";
import type {
  QueuedAction,
  QueuedSendMessage,
  QueuedEditMessage,
  QueuedDeleteMessage,
  QueuedReaction,
  CachedMessage,
  SyncResult,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Pending operation for optimistic updates
 */
export interface PendingOperation<T = unknown> {
  id: string;
  type: "message" | "edit" | "delete" | "reaction" | "read_receipt";
  data: T;
  tempId?: string;
  channelId: string;
  createdAt: Date;
  status: "pending" | "syncing" | "completed" | "failed" | "conflict";
  error?: string;
  rollbackData?: T;
  conflictData?: ConflictInfo;
}

/**
 * Conflict information for UI display
 */
export interface ConflictInfo {
  id: string;
  type:
    | "edit_conflict"
    | "delete_conflict"
    | "concurrent_edit"
    | "version_mismatch";
  localValue: unknown;
  serverValue: unknown;
  localTimestamp: Date;
  serverTimestamp: Date;
  description: string;
  resolutionOptions: ResolutionStrategy[];
}

/**
 * Reconciliation event types
 */
export type ReconciliationEventType =
  | "operation_queued"
  | "operation_syncing"
  | "operation_completed"
  | "operation_failed"
  | "operation_rollback"
  | "conflict_detected"
  | "conflict_resolved"
  | "sync_started"
  | "sync_progress"
  | "sync_completed"
  | "storage_warning"
  | "storage_critical";

/**
 * Reconciliation event
 */
export interface ReconciliationEvent {
  type: ReconciliationEventType;
  operation?: PendingOperation;
  conflict?: ConflictInfo;
  progress?: { current: number; total: number; percentage: number };
  storage?: { used: number; quota: number; percentage: number };
  timestamp: Date;
}

/**
 * Event listener type
 */
export type ReconciliationEventListener = (event: ReconciliationEvent) => void;

/**
 * Reconciliation manager configuration
 */
export interface ReconciliationConfig {
  /** Default conflict resolution strategy */
  defaultStrategy: ResolutionStrategy;
  /** Auto-resolve non-critical conflicts */
  autoResolveMinorConflicts: boolean;
  /** Maximum pending operations before warning */
  maxPendingOperations: number;
  /** Retry delay multiplier */
  retryDelayMultiplier: number;
  /** Maximum retries per operation */
  maxRetries: number;
  /** Enable optimistic updates */
  optimisticUpdates: boolean;
  /** Storage warning threshold (percentage) */
  storageWarningThreshold: number;
  /** Storage critical threshold (percentage) */
  storageCriticalThreshold: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: ReconciliationConfig = {
  defaultStrategy: "last_write_wins",
  autoResolveMinorConflicts: true,
  maxPendingOperations: 100,
  retryDelayMultiplier: 2,
  maxRetries: 5,
  optimisticUpdates: true,
  storageWarningThreshold: 80,
  storageCriticalThreshold: 95,
};

// =============================================================================
// Reconciliation Manager Class
// =============================================================================

export class ReconciliationManager {
  private config: ReconciliationConfig;
  private offlineQueue: OfflineQueue;
  private syncQueue: SyncQueue;
  private conflictResolver: ConflictResolver;
  private networkDetector: NetworkDetector;
  private listeners: Set<ReconciliationEventListener> = new Set();
  private pendingOperations: Map<string, PendingOperation> = new Map();
  private unresolvedConflicts: Map<string, ConflictInfo> = new Map();
  private networkUnsubscribe: (() => void) | null = null;
  private initialized = false;

  constructor(config: Partial<ReconciliationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.offlineQueue = getOfflineQueue();
    this.syncQueue = getSyncQueue();
    this.conflictResolver = getConflictResolver();
    this.networkDetector = getNetworkDetector();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize the reconciliation manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize queue
    this.offlineQueue.initialize();
    await this.syncQueue.initialize();

    // Setup network listener
    this.networkUnsubscribe = this.networkDetector.subscribe((info) => {
      if (info.state === "online") {
        this.onReconnect();
      }
    });

    // Register sync processors
    this.registerProcessors();

    // Load pending operations from storage
    await this.loadPendingOperations();

    // Check storage quota
    await this.checkStorageQuota();

    this.initialized = true;
  }

  /**
   * Cleanup the reconciliation manager
   */
  public cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.offlineQueue.cleanup();
    this.syncQueue.destroy();
    this.listeners.clear();
    this.pendingOperations.clear();
    this.unresolvedConflicts.clear();
    this.initialized = false;
  }

  /**
   * Check if manager is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  /**
   * Queue a message for sending
   */
  public async queueMessage(
    message: QueuedSendMessage,
  ): Promise<PendingOperation<QueuedSendMessage>> {
    await this.ensureInitialized();

    const operation: PendingOperation<QueuedSendMessage> = {
      id: this.generateId(),
      type: "message",
      data: message,
      tempId: message.tempId,
      channelId: message.channelId,
      createdAt: new Date(),
      status: "pending",
    };

    // Add to offline queue
    await this.offlineQueue.addSendMessage(message);

    // Track operation
    this.pendingOperations.set(operation.id, operation);

    // Emit event
    this.emit({ type: "operation_queued", operation, timestamp: new Date() });

    // Try to sync immediately if online
    if (this.networkDetector.isOnline()) {
      this.processPendingOperations();
    }

    return operation;
  }

  /**
   * Queue a message edit
   */
  public async queueEdit(
    edit: QueuedEditMessage,
  ): Promise<PendingOperation<QueuedEditMessage>> {
    await this.ensureInitialized();

    // Get original message for rollback (stored as original content only)
    const originalMessage = await this.getOriginalMessage(edit.messageId);
    const rollbackData: QueuedEditMessage | undefined = originalMessage
      ? { ...edit, content: originalMessage.content }
      : undefined;

    const operation: PendingOperation<QueuedEditMessage> = {
      id: this.generateId(),
      type: "edit",
      data: edit,
      channelId: edit.channelId,
      createdAt: new Date(),
      status: "pending",
      rollbackData,
    };

    await this.offlineQueue.addEditMessage(edit);
    this.pendingOperations.set(operation.id, operation);

    this.emit({ type: "operation_queued", operation, timestamp: new Date() });

    if (this.networkDetector.isOnline()) {
      this.processPendingOperations();
    }

    return operation;
  }

  /**
   * Queue a message deletion
   */
  public async queueDelete(
    deletion: QueuedDeleteMessage,
  ): Promise<PendingOperation<QueuedDeleteMessage>> {
    await this.ensureInitialized();

    // For delete, store the deletion info for potential undo
    const operation: PendingOperation<QueuedDeleteMessage> = {
      id: this.generateId(),
      type: "delete",
      data: deletion,
      channelId: deletion.channelId,
      createdAt: new Date(),
      status: "pending",
      // Note: actual message content for undo would be stored separately
    };

    await this.offlineQueue.addDeleteMessage(deletion);
    this.pendingOperations.set(operation.id, operation);

    this.emit({ type: "operation_queued", operation, timestamp: new Date() });

    if (this.networkDetector.isOnline()) {
      this.processPendingOperations();
    }

    return operation;
  }

  /**
   * Queue a reaction
   */
  public async queueReaction(
    reaction: QueuedReaction,
    add: boolean,
  ): Promise<PendingOperation<QueuedReaction>> {
    await this.ensureInitialized();

    const operation: PendingOperation<QueuedReaction> = {
      id: this.generateId(),
      type: "reaction",
      data: reaction,
      channelId: reaction.channelId,
      createdAt: new Date(),
      status: "pending",
    };

    if (add) {
      await this.offlineQueue.addReaction(reaction);
    } else {
      await this.offlineQueue.removeReaction(reaction);
    }

    this.pendingOperations.set(operation.id, operation);

    this.emit({ type: "operation_queued", operation, timestamp: new Date() });

    if (this.networkDetector.isOnline()) {
      this.processPendingOperations();
    }

    return operation;
  }

  /**
   * Queue a read receipt
   */
  public async queueReadReceipt(
    channelId: string,
    messageId: string,
  ): Promise<PendingOperation> {
    await this.ensureInitialized();

    const operation: PendingOperation = {
      id: this.generateId(),
      type: "read_receipt",
      data: { channelId, messageId },
      channelId,
      createdAt: new Date(),
      status: "pending",
    };

    await this.offlineQueue.add(
      "mark_read",
      { channelId, messageId },
      { channelId, messageId },
    );
    this.pendingOperations.set(operation.id, operation);

    this.emit({ type: "operation_queued", operation, timestamp: new Date() });

    if (this.networkDetector.isOnline()) {
      this.processPendingOperations();
    }

    return operation;
  }

  // ===========================================================================
  // Conflict Resolution
  // ===========================================================================

  /**
   * Get unresolved conflicts
   */
  public getUnresolvedConflicts(): ConflictInfo[] {
    return Array.from(this.unresolvedConflicts.values());
  }

  /**
   * Get conflict by ID
   */
  public getConflict(id: string): ConflictInfo | undefined {
    return this.unresolvedConflicts.get(id);
  }

  /**
   * Resolve a conflict with chosen strategy
   */
  public async resolveConflict(
    conflictId: string,
    strategy: ResolutionStrategy,
    customValue?: unknown,
  ): Promise<void> {
    const conflictInfo = this.unresolvedConflicts.get(conflictId);
    if (!conflictInfo) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    // Create conflict object for resolver
    const conflict: Conflict = {
      id: conflictInfo.id,
      type: this.mapConflictType(conflictInfo.type),
      itemType: "message",
      local: conflictInfo.localValue,
      remote: conflictInfo.serverValue,
      localTimestamp: conflictInfo.localTimestamp,
      remoteTimestamp: conflictInfo.serverTimestamp,
    };

    // Use custom value if provided (for manual merge)
    if (customValue !== undefined && strategy === "user_prompt") {
      // Apply custom value directly
      await this.applyConflictResolution(conflictInfo, customValue);
    } else {
      // Use resolver
      const resolution = await this.conflictResolver.resolve(
        conflict,
        strategy,
      );
      if (resolution.resolved) {
        await this.applyConflictResolution(conflictInfo, resolution.result);
      }
    }

    // Remove from unresolved conflicts
    this.unresolvedConflicts.delete(conflictId);

    this.emit({
      type: "conflict_resolved",
      conflict: conflictInfo,
      timestamp: new Date(),
    });
  }

  /**
   * Resolve all conflicts with default strategy
   */
  public async resolveAllConflicts(): Promise<void> {
    const conflicts = Array.from(this.unresolvedConflicts.values());
    for (const conflict of conflicts) {
      await this.resolveConflict(conflict.id, this.config.defaultStrategy);
    }
  }

  // ===========================================================================
  // Sync Operations
  // ===========================================================================

  /**
   * Process pending operations when reconnecting
   */
  public async processPendingOperations(): Promise<SyncResult> {
    if (!this.networkDetector.isOnline()) {
      throw new Error("Cannot sync while offline");
    }

    const pending = await this.offlineQueue.getPending();
    const total = pending.length;

    if (total === 0) {
      return {
        success: true,
        operation: "queue_flush",
        itemsSynced: 0,
        itemsFailed: 0,
        errors: [],
        duration: 0,
        timestamp: new Date(),
      };
    }

    this.emit({
      type: "sync_started",
      progress: { current: 0, total, percentage: 0 },
      timestamp: new Date(),
    });

    const result = await this.offlineQueue.processQueue();

    this.emit({
      type: "sync_completed",
      progress: { current: result.processed, total, percentage: 100 },
      timestamp: new Date(),
    });

    // Update pending operations status
    for (const [id, op] of this.pendingOperations.entries()) {
      if (op.status === "syncing") {
        op.status = "completed";
        this.emit({
          type: "operation_completed",
          operation: op,
          timestamp: new Date(),
        });
      }
    }

    return {
      success: result.failed === 0,
      operation: "queue_flush",
      itemsSynced: result.processed,
      itemsFailed: result.failed,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Get pending operation count
   */
  public getPendingCount(): number {
    return this.pendingOperations.size;
  }

  /**
   * Get pending operations for a channel
   */
  public getPendingForChannel(channelId: string): PendingOperation[] {
    return Array.from(this.pendingOperations.values()).filter(
      (op) => op.channelId === channelId,
    );
  }

  /**
   * Get all pending operations
   */
  public getAllPending(): PendingOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  // ===========================================================================
  // Optimistic Updates
  // ===========================================================================

  /**
   * Apply optimistic update for a message
   */
  public applyOptimisticUpdate<T>(operationId: string, data: T): void {
    const operation = this.pendingOperations.get(operationId);
    if (!operation || !this.config.optimisticUpdates) return;

    operation.data = data;
  }

  /**
   * Rollback an optimistic update
   */
  public async rollbackOperation(operationId: string): Promise<void> {
    const operation = this.pendingOperations.get(operationId);
    if (!operation) return;

    if (operation.rollbackData) {
      this.emit({
        type: "operation_rollback",
        operation,
        timestamp: new Date(),
      });
    }

    // Remove from pending
    this.pendingOperations.delete(operationId);

    // Remove from queue
    const queueItems = await this.offlineQueue.getAll();
    const matchingItem = queueItems.find((item) => {
      const payload = item.payload as Record<string, unknown>;
      return (
        payload.tempId === operation.tempId ||
        payload.messageId ===
          (operation.data as Record<string, unknown>).messageId
      );
    });

    if (matchingItem) {
      await this.offlineQueue.remove(matchingItem.id);
    }
  }

  // ===========================================================================
  // Storage Management
  // ===========================================================================

  /**
   * Check storage quota and emit warnings
   */
  public async checkStorageQuota(): Promise<{
    used: number;
    quota: number;
    percentage: number;
  }> {
    if (typeof navigator === "undefined" || !("storage" in navigator)) {
      return { used: 0, quota: 0, percentage: 0 };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      if (percentage >= this.config.storageCriticalThreshold) {
        this.emit({
          type: "storage_critical",
          storage: { used, quota, percentage },
          timestamp: new Date(),
        });
      } else if (percentage >= this.config.storageWarningThreshold) {
        this.emit({
          type: "storage_warning",
          storage: { used, quota, percentage },
          timestamp: new Date(),
        });
      }

      return { used, quota, percentage };
    } catch {
      return { used: 0, quota: 0, percentage: 0 };
    }
  }

  /**
   * Evict old data to free storage
   */
  public async evictOldData(targetSizeBytes: number): Promise<number> {
    // This would be implemented with actual data eviction logic
    // For now, return 0 bytes freed
    return 0;
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to reconciliation events
   */
  public subscribe(listener: ReconciliationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit an event
   */
  private emit(event: ReconciliationEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[ReconciliationManager] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Ensure manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Register sync processors
   */
  private registerProcessors(): void {
    // Register message processor
    this.syncQueue.registerProcessor("message", async (item) => {
      // This would send the message to the server
      // For now, just mark as processed
      const operationId = this.findOperationByTempId(
        item.data as { tempId?: string },
      );
      if (operationId) {
        const operation = this.pendingOperations.get(operationId);
        if (operation) {
          operation.status = "completed";
          this.emit({
            type: "operation_completed",
            operation,
            timestamp: new Date(),
          });
          this.pendingOperations.delete(operationId);
        }
      }
    });

    // Register reaction processor
    this.syncQueue.registerProcessor("reaction", async (item) => {
      const operationId = this.findOperationByData(item.data);
      if (operationId) {
        const operation = this.pendingOperations.get(operationId);
        if (operation) {
          operation.status = "completed";
          this.pendingOperations.delete(operationId);
        }
      }
    });

    // Register read receipt processor
    this.syncQueue.registerProcessor("read_receipt", async (item) => {
      const operationId = this.findOperationByData(item.data);
      if (operationId) {
        const operation = this.pendingOperations.get(operationId);
        if (operation) {
          operation.status = "completed";
          this.pendingOperations.delete(operationId);
        }
      }
    });
  }

  /**
   * Load pending operations from storage
   */
  private async loadPendingOperations(): Promise<void> {
    const queueItems = await queueStorage.getPending();

    for (const item of queueItems) {
      const payload = item.payload as Record<string, unknown>;
      const operation: PendingOperation = {
        id: item.id,
        type: this.mapQueueTypeToOperationType(item.type),
        data: item.payload,
        tempId: payload.tempId as string | undefined,
        channelId: item.channelId || (payload.channelId as string) || "",
        createdAt: new Date(item.createdAt),
        status: item.status === "failed" ? "failed" : "pending",
        error: item.lastError || undefined,
      };
      this.pendingOperations.set(operation.id, operation);
    }
  }

  /**
   * Handle reconnection
   */
  private onReconnect(): void {
    // Delay sync to allow connection to stabilize
    setTimeout(() => {
      this.processPendingOperations().catch((error) => {
        logger.error("[ReconciliationManager] Reconnect sync failed:", error);
      });
    }, 1000);
  }

  /**
   * Get original message for rollback
   */
  private async getOriginalMessage(
    messageId: string,
  ): Promise<CachedMessage | undefined> {
    // This would fetch from local cache
    // For now, return undefined
    return undefined;
  }

  /**
   * Apply conflict resolution result
   */
  private async applyConflictResolution(
    conflict: ConflictInfo,
    resolvedValue: unknown,
  ): Promise<void> {
    // This would apply the resolved value to the local cache
    // and potentially queue a sync operation
  }

  /**
   * Map conflict info type to conflict type
   */
  private mapConflictType(type: ConflictInfo["type"]): Conflict["type"] {
    switch (type) {
      case "edit_conflict":
      case "concurrent_edit":
        return "concurrent_edit";
      case "delete_conflict":
        return "delete_edit";
      case "version_mismatch":
        return "version_mismatch";
      default:
        return "concurrent_edit";
    }
  }

  /**
   * Map queue type to operation type
   */
  private mapQueueTypeToOperationType(type: string): PendingOperation["type"] {
    switch (type) {
      case "send_message":
        return "message";
      case "edit_message":
        return "edit";
      case "delete_message":
        return "delete";
      case "add_reaction":
      case "remove_reaction":
        return "reaction";
      case "mark_read":
        return "read_receipt";
      default:
        return "message";
    }
  }

  /**
   * Find operation by temp ID
   */
  private findOperationByTempId(data: { tempId?: string }): string | undefined {
    if (!data.tempId) return undefined;
    for (const [id, op] of this.pendingOperations.entries()) {
      if (op.tempId === data.tempId) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Find operation by data match
   */
  private findOperationByData(data: unknown): string | undefined {
    const dataStr = JSON.stringify(data);
    for (const [id, op] of this.pendingOperations.entries()) {
      if (JSON.stringify(op.data) === dataStr) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let reconciliationManagerInstance: ReconciliationManager | null = null;

/**
 * Get the default reconciliation manager instance
 */
export function getReconciliationManager(
  config?: Partial<ReconciliationConfig>,
): ReconciliationManager {
  if (!reconciliationManagerInstance) {
    reconciliationManagerInstance = new ReconciliationManager(config);
  }
  return reconciliationManagerInstance;
}

/**
 * Reset the reconciliation manager instance
 */
export function resetReconciliationManager(): void {
  if (reconciliationManagerInstance) {
    reconciliationManagerInstance.cleanup();
    reconciliationManagerInstance = null;
  }
}

export default ReconciliationManager;
