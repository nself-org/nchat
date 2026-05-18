/**
 * Conflict Resolver - Handles data conflicts during sync
 *
 * Implements conflict resolution strategies:
 * - Last-write-wins for simple conflicts
 * - User prompt for complex conflicts
 * - Tombstone records for deletions
 * - Merge strategies for concurrent edits
 */

import type { CachedMessage } from "./offline-types";

// =============================================================================
// Types
// =============================================================================

/**
 * Conflict type
 */
export type ConflictType =
  | "concurrent_edit" // Same item edited on multiple devices
  | "delete_edit" // Item deleted on one device, edited on another
  | "duplicate" // Duplicate creation
  | "version_mismatch"; // Version conflict

/**
 * Conflict resolution strategy
 */
export type ResolutionStrategy =
  | "local_wins" // Keep local changes
  | "remote_wins" // Use remote changes
  | "last_write_wins" // Use most recent by timestamp
  | "merge" // Attempt to merge both
  | "user_prompt"; // Ask user to resolve

/**
 * Conflict data
 */
export interface Conflict<T = any> {
  id: string;
  type: ConflictType;
  itemType: string;
  local: T | null;
  remote: T | null;
  ancestor?: T | null; // Common ancestor for 3-way merge
  localTimestamp: Date;
  remoteTimestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution<T = any> {
  resolved: boolean;
  strategy: ResolutionStrategy;
  result: T | null;
  needsUserInput: boolean;
  error?: string;
}

/**
 * User choice callback for manual resolution
 */
export type UserChoiceCallback<T = any> = (
  conflict: Conflict<T>,
) => Promise<T | null>;

// =============================================================================
// Conflict Resolver Class
// =============================================================================

export class ConflictResolver {
  private userChoiceCallback: UserChoiceCallback | null = null;

  /**
   * Set callback for user-prompted conflict resolution
   */
  public setUserChoiceCallback(callback: UserChoiceCallback): void {
    this.userChoiceCallback = callback;
  }

  /**
   * Resolve a conflict using the appropriate strategy
   */
  public async resolve<T>(
    conflict: Conflict<T>,
    strategy: ResolutionStrategy = "last_write_wins",
  ): Promise<ConflictResolution<T>> {
    switch (strategy) {
      case "local_wins":
        return this.resolveLocalWins(conflict);

      case "remote_wins":
        return this.resolveRemoteWins(conflict);

      case "last_write_wins":
        return this.resolveLastWriteWins(conflict);

      case "merge":
        return this.resolveMerge(conflict);

      case "user_prompt":
        return this.resolveUserPrompt(conflict);

      default:
        return {
          resolved: false,
          strategy,
          result: null,
          needsUserInput: false,
          error: `Unknown strategy: ${strategy}`,
        };
    }
  }

  /**
   * Automatically resolve a conflict using the best strategy
   */
  public async autoResolve<T>(
    conflict: Conflict<T>,
  ): Promise<ConflictResolution<T>> {
    // Choose strategy based on conflict type
    switch (conflict.type) {
      case "concurrent_edit":
        // Try merge first, fall back to last-write-wins
        const mergeResult = await this.resolveMerge(conflict);
        if (mergeResult.resolved) {
          return mergeResult;
        }
        return this.resolveLastWriteWins(conflict);

      case "delete_edit":
        // Deletion takes precedence
        return this.resolveRemoteWins(conflict);

      case "duplicate":
        // Keep the one with earlier timestamp
        return this.resolveLastWriteWins(conflict);

      case "version_mismatch":
        // Use last-write-wins
        return this.resolveLastWriteWins(conflict);

      default:
        return this.resolveLastWriteWins(conflict);
    }
  }

  /**
   * Resolve by keeping local changes
   */
  private resolveLocalWins<T>(conflict: Conflict<T>): ConflictResolution<T> {
    return {
      resolved: true,
      strategy: "local_wins",
      result: conflict.local,
      needsUserInput: false,
    };
  }

  /**
   * Resolve by using remote changes
   */
  private resolveRemoteWins<T>(conflict: Conflict<T>): ConflictResolution<T> {
    return {
      resolved: true,
      strategy: "remote_wins",
      result: conflict.remote,
      needsUserInput: false,
    };
  }

  /**
   * Resolve by using most recent changes
   */
  private resolveLastWriteWins<T>(
    conflict: Conflict<T>,
  ): ConflictResolution<T> {
    const useLocal = conflict.localTimestamp > conflict.remoteTimestamp;

    return {
      resolved: true,
      strategy: "last_write_wins",
      result: useLocal ? conflict.local : conflict.remote,
      needsUserInput: false,
    };
  }

  /**
   * Attempt to merge both changes
   */
  private resolveMerge<T>(conflict: Conflict<T>): ConflictResolution<T> {
    // Type-specific merge logic
    if (conflict.itemType === "message") {
      return this.mergeMessages(
        conflict as Conflict<CachedMessage>,
      ) as ConflictResolution<T>;
    }

    // For other types, fall back to last-write-wins
    return {
      resolved: false,
      strategy: "merge",
      result: null,
      needsUserInput: true,
      error: "Merge not supported for this type",
    };
  }

  /**
   * Merge message conflicts
   */
  private mergeMessages(
    conflict: Conflict<CachedMessage>,
  ): ConflictResolution<CachedMessage> {
    if (!conflict.local || !conflict.remote) {
      return {
        resolved: false,
        strategy: "merge",
        result: null,
        needsUserInput: true,
        error: "Cannot merge with null value",
      };
    }

    const local = conflict.local;
    const remote = conflict.remote;

    // If content is the same, merge metadata
    if (local.content === remote.content) {
      const merged: CachedMessage = {
        ...remote,
        reactions: this.mergeReactions(local.reactions, remote.reactions),
        updatedAt: remote.updatedAt || local.updatedAt,
      };

      return {
        resolved: true,
        strategy: "merge",
        result: merged,
        needsUserInput: false,
      };
    }

    // Content differs - needs user decision
    return {
      resolved: false,
      strategy: "merge",
      result: null,
      needsUserInput: true,
      error: "Message content differs",
    };
  }

  /**
   * Merge reaction arrays
   */
  private mergeReactions(
    local: CachedMessage["reactions"],
    remote: CachedMessage["reactions"],
  ): CachedMessage["reactions"] {
    const merged = new Map<string, CachedMessage["reactions"][0]>();

    // Add all remote reactions
    for (const reaction of remote) {
      merged.set(reaction.emoji, reaction);
    }

    // Merge local reactions
    for (const reaction of local) {
      const existing = merged.get(reaction.emoji);
      if (existing) {
        // Merge user IDs
        const userIds = new Set([...existing.userIds, ...reaction.userIds]);
        merged.set(reaction.emoji, {
          ...existing,
          userIds: Array.from(userIds),
          count: userIds.size,
        });
      } else {
        merged.set(reaction.emoji, reaction);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Resolve by asking user
   */
  private async resolveUserPrompt<T>(
    conflict: Conflict<T>,
  ): Promise<ConflictResolution<T>> {
    if (!this.userChoiceCallback) {
      return {
        resolved: false,
        strategy: "user_prompt",
        result: null,
        needsUserInput: true,
        error: "No user choice callback set",
      };
    }

    try {
      const result = await this.userChoiceCallback(conflict);

      return {
        resolved: true,
        strategy: "user_prompt",
        result,
        needsUserInput: false,
      };
    } catch (error) {
      return {
        resolved: false,
        strategy: "user_prompt",
        result: null,
        needsUserInput: true,
        error:
          error instanceof Error ? error.message : "User resolution failed",
      };
    }
  }

  // ===========================================================================
  // Conflict Detection
  // ===========================================================================

  /**
   * Detect if a conflict exists
   */
  public detectConflict<T extends { id: string; updatedAt?: Date | string }>(
    local: T | null,
    remote: T | null,
  ): Conflict<T> | null {
    // No conflict if one is null
    if (!local || !remote) {
      return null;
    }

    // Check if they're different
    const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
    const remoteTime = remote.updatedAt
      ? new Date(remote.updatedAt).getTime()
      : 0;

    // Same timestamps = no conflict
    if (localTime === remoteTime) {
      return null;
    }

    // Determine conflict type
    let type: ConflictType = "concurrent_edit";
    if (Math.abs(localTime - remoteTime) < 1000) {
      type = "concurrent_edit"; // Within 1 second = concurrent
    } else {
      type = "version_mismatch";
    }

    return {
      id: local.id,
      type,
      itemType: "unknown",
      local,
      remote,
      localTimestamp: new Date(localTime),
      remoteTimestamp: new Date(remoteTime),
    };
  }

  /**
   * Batch resolve conflicts
   */
  public async resolveMany<T>(
    conflicts: Conflict<T>[],
    strategy: ResolutionStrategy = "last_write_wins",
  ): Promise<ConflictResolution<T>[]> {
    const results: ConflictResolution<T>[] = [];

    for (const conflict of conflicts) {
      const result = await this.resolve(conflict, strategy);
      results.push(result);
    }

    return results;
  }
}

// =============================================================================
// Tombstone Management
// =============================================================================

/**
 * Tombstone record for deleted items
 */
export interface Tombstone {
  id: string;
  itemType: string;
  deletedAt: Date;
  deletedBy: string;
  reason?: string;
}

/**
 * Tombstone store for tracking deletions
 */
export class TombstoneStore {
  private tombstones: Map<string, Tombstone> = new Map();

  /**
   * Add a tombstone
   */
  public add(tombstone: Tombstone): void {
    this.tombstones.set(tombstone.id, tombstone);
  }

  /**
   * Check if an item has been deleted
   */
  public isDeleted(id: string): boolean {
    return this.tombstones.has(id);
  }

  /**
   * Get tombstone
   */
  public get(id: string): Tombstone | null {
    return this.tombstones.get(id) || null;
  }

  /**
   * Remove old tombstones (older than retention period)
   */
  public cleanup(retentionMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - retentionMs;
    let removed = 0;

    for (const [id, tombstone] of this.tombstones.entries()) {
      if (tombstone.deletedAt.getTime() < cutoff) {
        this.tombstones.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get all tombstones
   */
  public getAll(): Tombstone[] {
    return Array.from(this.tombstones.values());
  }

  /**
   * Clear all tombstones
   */
  public clear(): void {
    this.tombstones.clear();
  }

  /**
   * Get count
   */
  public count(): number {
    return this.tombstones.size;
  }
}

// =============================================================================
// Singleton Instances
// =============================================================================

let conflictResolverInstance: ConflictResolver | null = null;
let tombstoneStoreInstance: TombstoneStore | null = null;

/**
 * Get the default conflict resolver instance
 */
export function getConflictResolver(): ConflictResolver {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver();
  }
  return conflictResolverInstance;
}

/**
 * Get the default tombstone store instance
 */
export function getTombstoneStore(): TombstoneStore {
  if (!tombstoneStoreInstance) {
    tombstoneStoreInstance = new TombstoneStore();
  }
  return tombstoneStoreInstance;
}

/**
 * Reset conflict resolver instance
 */
export function resetConflictResolver(): void {
  conflictResolverInstance = null;
}

/**
 * Reset tombstone store instance
 */
export function resetTombstoneStore(): void {
  if (tombstoneStoreInstance) {
    tombstoneStoreInstance.clear();
    tombstoneStoreInstance = null;
  }
}

export default ConflictResolver;
