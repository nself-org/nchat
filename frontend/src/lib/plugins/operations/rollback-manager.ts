/**
 * Plugin Rollback Manager
 *
 * Manages plugin version rollback with snapshot-based state preservation.
 * Takes snapshots before updates and can restore a plugin to a previous
 * known-good state when an update fails, preventing data loss.
 */

import type {
  PluginSnapshot,
  RollbackRecord,
  RollbackStatus,
  RollbackConfig,
} from "./types";
import { DEFAULT_ROLLBACK_CONFIG } from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class RollbackError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly pluginId?: string,
  ) {
    super(message);
    this.name = "RollbackError";
  }
}

// ============================================================================
// ID GENERATION
// ============================================================================

let rollbackIdCounter = 0;

function generateRollbackId(prefix: string): string {
  try {
    const uuid = crypto.randomUUID();
    return `${prefix}_${uuid}`;
  } catch {
    rollbackIdCounter++;
    const ts = Date.now().toString(36);
    const count = rollbackIdCounter.toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${ts}-${count}-${rand}`;
  }
}

/**
 * Reset the ID counter (for testing).
 */
export function resetRollbackIdCounter(): void {
  rollbackIdCounter = 0;
}

// ============================================================================
// CHECKSUM
// ============================================================================

/**
 * Compute a simple checksum for integrity verification.
 * Uses a string-based hash for portability.
 */
function computeChecksum(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `chk_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

// ============================================================================
// ROLLBACK HANDLER TYPE
// ============================================================================

/**
 * Handler that performs the actual rollback.
 * Receives the snapshot and should restore the plugin to that state.
 */
export type RollbackHandler = (
  pluginId: string,
  snapshot: PluginSnapshot,
) => Promise<void>;

// ============================================================================
// EVENT TYPES
// ============================================================================

export type RollbackEventType =
  | "snapshot_created"
  | "snapshot_deleted"
  | "rollback_started"
  | "rollback_completed"
  | "rollback_failed"
  | "rollback_cancelled";

export interface RollbackEvent {
  type: RollbackEventType;
  pluginId: string;
  timestamp: string;
  snapshotId?: string;
  rollbackId?: string;
  error?: string;
}

export type RollbackEventListener = (event: RollbackEvent) => void;

// ============================================================================
// ROLLBACK MANAGER
// ============================================================================

export class RollbackManager {
  private config: RollbackConfig;
  private snapshots: Map<string, PluginSnapshot[]> = new Map();
  private rollbackRecords: Map<string, RollbackRecord[]> = new Map();
  private rollbackHandlers: Map<string, RollbackHandler> = new Map();
  private listeners: RollbackEventListener[] = [];

  constructor(config?: Partial<RollbackConfig>) {
    this.config = { ...DEFAULT_ROLLBACK_CONFIG, ...config };
  }

  // ==========================================================================
  // HANDLER REGISTRATION
  // ==========================================================================

  /**
   * Register a rollback handler for a plugin.
   */
  registerHandler(pluginId: string, handler: RollbackHandler): void {
    this.rollbackHandlers.set(pluginId, handler);
  }

  /**
   * Unregister a rollback handler.
   */
  unregisterHandler(pluginId: string): boolean {
    return this.rollbackHandlers.delete(pluginId);
  }

  /**
   * Check if a plugin has a rollback handler.
   */
  hasHandler(pluginId: string): boolean {
    return this.rollbackHandlers.has(pluginId);
  }

  // ==========================================================================
  // SNAPSHOT MANAGEMENT
  // ==========================================================================

  /**
   * Create a snapshot of a plugin's current state.
   */
  createSnapshot(
    pluginId: string,
    version: string,
    config: Record<string, unknown>,
    stateData: Record<string, unknown>,
    reason: string,
  ): PluginSnapshot {
    const allData = { ...config, ...stateData };
    const checksum = computeChecksum(allData);

    const snapshot: PluginSnapshot = {
      id: generateRollbackId("snap"),
      pluginId,
      version,
      config: { ...config },
      stateData: { ...stateData },
      createdAt: new Date().toISOString(),
      reason,
      verified: true,
      checksum,
    };

    const pluginSnapshots = this.snapshots.get(pluginId) || [];
    pluginSnapshots.push(snapshot);

    // Enforce max snapshots per plugin
    while (pluginSnapshots.length > this.config.maxSnapshotsPerPlugin) {
      pluginSnapshots.shift();
    }

    this.snapshots.set(pluginId, pluginSnapshots);

    this.emitEvent({
      type: "snapshot_created",
      pluginId,
      timestamp: new Date().toISOString(),
      snapshotId: snapshot.id,
    });

    return snapshot;
  }

  /**
   * Get all snapshots for a plugin.
   */
  getSnapshots(pluginId: string): PluginSnapshot[] {
    return [...(this.snapshots.get(pluginId) || [])];
  }

  /**
   * Get a specific snapshot by ID.
   */
  getSnapshot(snapshotId: string): PluginSnapshot | undefined {
    for (const snapshots of this.snapshots.values()) {
      const found = snapshots.find((s) => s.id === snapshotId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Get the latest snapshot for a plugin.
   */
  getLatestSnapshot(pluginId: string): PluginSnapshot | undefined {
    const snapshots = this.snapshots.get(pluginId);
    if (!snapshots || snapshots.length === 0) return undefined;
    return snapshots[snapshots.length - 1];
  }

  /**
   * Get a snapshot for a specific version.
   */
  getSnapshotForVersion(
    pluginId: string,
    version: string,
  ): PluginSnapshot | undefined {
    const snapshots = this.snapshots.get(pluginId) || [];
    // Return the most recent snapshot for that version
    for (let i = snapshots.length - 1; i >= 0; i--) {
      if (snapshots[i].version === version) {
        return snapshots[i];
      }
    }
    return undefined;
  }

  /**
   * Delete a specific snapshot.
   */
  deleteSnapshot(snapshotId: string): boolean {
    for (const [pluginId, snapshots] of this.snapshots.entries()) {
      const index = snapshots.findIndex((s) => s.id === snapshotId);
      if (index >= 0) {
        snapshots.splice(index, 1);
        this.emitEvent({
          type: "snapshot_deleted",
          pluginId,
          timestamp: new Date().toISOString(),
          snapshotId,
        });
        return true;
      }
    }
    return false;
  }

  /**
   * Delete all snapshots for a plugin.
   */
  deletePluginSnapshots(pluginId: string): number {
    const snapshots = this.snapshots.get(pluginId) || [];
    const count = snapshots.length;
    this.snapshots.delete(pluginId);
    return count;
  }

  /**
   * Verify a snapshot's integrity by checking its checksum.
   */
  verifySnapshot(snapshotId: string): boolean {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) return false;

    const allData = { ...snapshot.config, ...snapshot.stateData };
    const expectedChecksum = computeChecksum(allData);
    return snapshot.checksum === expectedChecksum;
  }

  // ==========================================================================
  // ROLLBACK OPERATIONS
  // ==========================================================================

  /**
   * Perform a rollback to a specific snapshot.
   */
  async rollback(
    pluginId: string,
    snapshotId: string,
    initiatedBy: string,
  ): Promise<RollbackRecord> {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new RollbackError(
        `Snapshot "${snapshotId}" not found`,
        "SNAPSHOT_NOT_FOUND",
        pluginId,
      );
    }

    if (snapshot.pluginId !== pluginId) {
      throw new RollbackError(
        `Snapshot "${snapshotId}" does not belong to plugin "${pluginId}"`,
        "SNAPSHOT_MISMATCH",
        pluginId,
      );
    }

    const handler = this.rollbackHandlers.get(pluginId);
    if (!handler) {
      throw new RollbackError(
        `No rollback handler registered for plugin "${pluginId}"`,
        "NO_HANDLER",
        pluginId,
      );
    }

    // Verify snapshot integrity
    if (this.config.verifyBeforeRollback) {
      if (!this.verifySnapshot(snapshotId)) {
        throw new RollbackError(
          `Snapshot "${snapshotId}" failed integrity verification`,
          "INTEGRITY_FAILURE",
          pluginId,
        );
      }
    }

    const record: RollbackRecord = {
      id: generateRollbackId("rb"),
      pluginId,
      fromVersion: "current",
      toVersion: snapshot.version,
      snapshotId,
      status: "in_progress" as RollbackStatus,
      initiatedAt: new Date().toISOString(),
      completedAt: null,
      initiatedBy,
      error: null,
      durationMs: null,
    };

    this.addRollbackRecord(record);

    this.emitEvent({
      type: "rollback_started",
      pluginId,
      timestamp: new Date().toISOString(),
      snapshotId,
      rollbackId: record.id,
    });

    const startTime = Date.now();

    try {
      await this.executeWithTimeout(
        () => handler(pluginId, snapshot),
        this.config.rollbackTimeoutMs,
      );

      record.status = "completed";
      record.completedAt = new Date().toISOString();
      record.durationMs = Date.now() - startTime;

      this.emitEvent({
        type: "rollback_completed",
        pluginId,
        timestamp: new Date().toISOString(),
        snapshotId,
        rollbackId: record.id,
      });

      return record;
    } catch (error) {
      record.status = "failed";
      record.completedAt = new Date().toISOString();
      record.error = error instanceof Error ? error.message : String(error);
      record.durationMs = Date.now() - startTime;

      this.emitEvent({
        type: "rollback_failed",
        pluginId,
        timestamp: new Date().toISOString(),
        snapshotId,
        rollbackId: record.id,
        error: record.error,
      });

      throw new RollbackError(
        `Rollback failed: ${record.error}`,
        "ROLLBACK_FAILED",
        pluginId,
      );
    }
  }

  /**
   * Rollback to the latest snapshot for a plugin.
   */
  async rollbackToLatest(
    pluginId: string,
    initiatedBy: string,
  ): Promise<RollbackRecord> {
    const latest = this.getLatestSnapshot(pluginId);
    if (!latest) {
      throw new RollbackError(
        `No snapshots available for plugin "${pluginId}"`,
        "NO_SNAPSHOTS",
        pluginId,
      );
    }
    return this.rollback(pluginId, latest.id, initiatedBy);
  }

  /**
   * Rollback to a specific version.
   */
  async rollbackToVersion(
    pluginId: string,
    version: string,
    initiatedBy: string,
  ): Promise<RollbackRecord> {
    const snapshot = this.getSnapshotForVersion(pluginId, version);
    if (!snapshot) {
      throw new RollbackError(
        `No snapshot found for plugin "${pluginId}" version "${version}"`,
        "VERSION_NOT_FOUND",
        pluginId,
      );
    }
    return this.rollback(pluginId, snapshot.id, initiatedBy);
  }

  /**
   * Cancel a pending rollback.
   */
  cancelRollback(rollbackId: string): boolean {
    for (const records of this.rollbackRecords.values()) {
      const record = records.find((r) => r.id === rollbackId);
      if (record && record.status === "pending") {
        record.status = "cancelled";
        record.completedAt = new Date().toISOString();

        this.emitEvent({
          type: "rollback_cancelled",
          pluginId: record.pluginId,
          timestamp: new Date().toISOString(),
          rollbackId: record.id,
        });

        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // ROLLBACK RECORDS
  // ==========================================================================

  /**
   * Get all rollback records for a plugin.
   */
  getRollbackRecords(pluginId: string): RollbackRecord[] {
    return [...(this.rollbackRecords.get(pluginId) || [])];
  }

  /**
   * Get a specific rollback record.
   */
  getRollbackRecord(rollbackId: string): RollbackRecord | undefined {
    for (const records of this.rollbackRecords.values()) {
      const found = records.find((r) => r.id === rollbackId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Get the latest rollback record for a plugin.
   */
  getLatestRollback(pluginId: string): RollbackRecord | undefined {
    const records = this.rollbackRecords.get(pluginId);
    if (!records || records.length === 0) return undefined;
    return records[records.length - 1];
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get current configuration.
   */
  getConfig(): RollbackConfig {
    return { ...this.config };
  }

  /**
   * Check if auto-rollback is enabled.
   */
  isAutoRollbackEnabled(): boolean {
    return this.config.autoRollbackOnFailure;
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  /**
   * Add an event listener.
   */
  addEventListener(listener: RollbackEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  removeEventListener(listener: RollbackEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all snapshots and records.
   */
  clear(): void {
    this.snapshots.clear();
    this.rollbackRecords.clear();
    this.rollbackHandlers.clear();
    this.listeners = [];
  }

  /**
   * Clear all data for a specific plugin.
   */
  clearPlugin(pluginId: string): void {
    this.snapshots.delete(pluginId);
    this.rollbackRecords.delete(pluginId);
    this.rollbackHandlers.delete(pluginId);
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  /**
   * Get rollback statistics.
   */
  getStats(): {
    totalSnapshots: number;
    totalRollbacks: number;
    successfulRollbacks: number;
    failedRollbacks: number;
    pluginsWithSnapshots: number;
  } {
    let totalSnapshots = 0;
    let totalRollbacks = 0;
    let successfulRollbacks = 0;
    let failedRollbacks = 0;

    for (const snapshots of this.snapshots.values()) {
      totalSnapshots += snapshots.length;
    }

    for (const records of this.rollbackRecords.values()) {
      for (const record of records) {
        totalRollbacks++;
        if (record.status === "completed") successfulRollbacks++;
        if (record.status === "failed") failedRollbacks++;
      }
    }

    return {
      totalSnapshots,
      totalRollbacks,
      successfulRollbacks,
      failedRollbacks,
      pluginsWithSnapshots: this.snapshots.size,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private addRollbackRecord(record: RollbackRecord): void {
    const records = this.rollbackRecords.get(record.pluginId) || [];
    records.push(record);
    this.rollbackRecords.set(record.pluginId, records);
  }

  private async executeWithTimeout(
    fn: () => Promise<void>,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new RollbackError(
            `Rollback timed out after ${timeoutMs}ms`,
            "ROLLBACK_TIMEOUT",
          ),
        );
      }, timeoutMs);

      fn()
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private emitEvent(event: RollbackEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Silently handle listener errors
      }
    }
  }
}
