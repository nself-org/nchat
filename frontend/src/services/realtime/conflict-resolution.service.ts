/**
 * Conflict Resolution Service
 *
 * Detects and resolves conflicts in offline edits and settings sync.
 * Supports multiple resolution strategies: last-write-wins, merge, manual, server-wins.
 *
 * @module services/realtime/conflict-resolution.service
 * @version 1.0.0
 */

import type { UserSettings } from "@/graphql/settings";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Conflict types
 */
export type ConflictType =
  | "message:edit"
  | "message:delete"
  | "channel:settings"
  | "user:settings"
  | "file:upload"
  | "thread:reply";

/**
 * Resolution strategies
 */
export type ResolutionStrategy =
  | "last-write-wins" // Most recent timestamp wins
  | "server-wins" // Server version always wins
  | "client-wins" // Client version always wins
  | "merge" // Merge both versions
  | "manual"; // User must resolve manually

/**
 * Conflict severity
 */
export type ConflictSeverity = "low" | "medium" | "high" | "critical";

/**
 * Conflict entity
 */
export interface ConflictEntity {
  id: string;
  type: ConflictType;
  localData: unknown;
  remoteData: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
  localVersion?: number;
  remoteVersion?: number;
  localHash?: string;
  remoteHash?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictType?: ConflictType;
  severity: ConflictSeverity;
  entity: ConflictEntity;
  suggestedStrategy: ResolutionStrategy;
  reason?: string;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  id: string;
  type: ConflictType;
  strategy: ResolutionStrategy;
  resolvedData: unknown;
  conflictedFields?: string[];
  timestamp: number;
  requiresUserAction: boolean;
  resolutionMetadata?: Record<string, unknown>;
}

/**
 * Conflict history entry
 */
export interface ConflictHistoryEntry {
  id: string;
  type: ConflictType;
  detectedAt: number;
  resolvedAt?: number;
  strategy: ResolutionStrategy;
  entity: ConflictEntity;
  resolution?: ConflictResolutionResult;
  userAction?: {
    timestamp: number;
    userId: string;
    choice: "local" | "remote" | "merged" | "custom";
  };
}

/**
 * Conflict event types
 */
export type ConflictEventType =
  | "conflict:detected"
  | "conflict:resolved"
  | "conflict:manual-required"
  | "conflict:history-updated";

/**
 * Conflict event listener
 */
export type ConflictEventListener = (
  event: ConflictEventType,
  data?: {
    detection?: ConflictDetectionResult;
    resolution?: ConflictResolutionResult;
    history?: ConflictHistoryEntry;
  },
) => void;

/**
 * Conflict resolution config
 */
export interface ConflictResolutionConfig {
  /** Default resolution strategy */
  defaultStrategy?: ResolutionStrategy;
  /** Store conflict history */
  enableHistory?: boolean;
  /** Max history entries */
  maxHistorySize?: number;
  /** Auto-resolve low severity conflicts */
  autoResolveLowSeverity?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** LocalStorage key for history */
  storageKey?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<ConflictResolutionConfig> = {
  defaultStrategy: "last-write-wins",
  enableHistory: true,
  maxHistorySize: 100,
  autoResolveLowSeverity: true,
  debug: false,
  storageKey: "nchat:conflict-history",
};

/**
 * Strategy priority for different conflict types
 */
const CONFLICT_TYPE_STRATEGIES: Record<ConflictType, ResolutionStrategy> = {
  "message:edit": "last-write-wins",
  "message:delete": "server-wins",
  "channel:settings": "server-wins",
  "user:settings": "merge",
  "file:upload": "last-write-wins",
  "thread:reply": "last-write-wins",
};

/**
 * Critical fields that trigger manual resolution for settings
 */
const CRITICAL_SETTINGS_FIELDS = [
  "privacy.onlineStatusVisible",
  "privacy.lastSeenVisible",
  "privacy.profileVisible",
  "notifications.quietHoursEnabled",
];

// ============================================================================
// Conflict Resolution Service Class
// ============================================================================

/**
 * ConflictResolutionService - Detects and resolves data conflicts
 */
class ConflictResolutionService {
  private config: Required<ConflictResolutionConfig>;
  private history: ConflictHistoryEntry[] = [];
  private listeners = new Set<ConflictEventListener>();
  private isInitialized = false;

  constructor(config: ConflictResolutionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the conflict resolution service
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Load history from storage
    if (this.config.enableHistory) {
      this.loadHistoryFromStorage();
    }

    this.isInitialized = true;
    this.log("Conflict resolution service initialized");
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    // Save history before destroying
    if (this.config.enableHistory) {
      this.saveHistoryToStorage();
    }

    this.listeners.clear();
    this.isInitialized = false;
    this.log("Conflict resolution service destroyed");
  }

  // ============================================================================
  // Conflict Detection
  // ============================================================================

  /**
   * Detect conflicts between local and remote data
   */
  detectConflict(entity: ConflictEntity): ConflictDetectionResult {
    const hasConflict = this.hasConflict(entity);

    if (!hasConflict) {
      return {
        hasConflict: false,
        severity: "low",
        entity,
        suggestedStrategy: this.config.defaultStrategy,
      };
    }

    const severity = this.calculateSeverity(entity);
    const suggestedStrategy = this.suggestStrategy(entity, severity);

    const result: ConflictDetectionResult = {
      hasConflict: true,
      conflictType: entity.type,
      severity,
      entity,
      suggestedStrategy,
      reason: this.getConflictReason(entity),
    };

    this.emit("conflict:detected", { detection: result });
    this.log("Conflict detected:", result);

    return result;
  }

  /**
   * Check if entity has a conflict
   */
  private hasConflict(entity: ConflictEntity): boolean {
    // Version-based conflict detection
    if (
      entity.localVersion !== undefined &&
      entity.remoteVersion !== undefined
    ) {
      return entity.localVersion !== entity.remoteVersion;
    }

    // Timestamp-based conflict detection
    if (entity.localTimestamp && entity.remoteTimestamp) {
      // Allow 1 second tolerance for timestamp differences
      const timeDiff = Math.abs(entity.localTimestamp - entity.remoteTimestamp);
      if (timeDiff < 1000) {
        return false;
      }
    }

    // Hash-based conflict detection
    if (entity.localHash && entity.remoteHash) {
      return entity.localHash !== entity.remoteHash;
    }

    // Deep equality check as fallback
    return (
      JSON.stringify(entity.localData) !== JSON.stringify(entity.remoteData)
    );
  }

  /**
   * Calculate conflict severity
   */
  private calculateSeverity(entity: ConflictEntity): ConflictSeverity {
    // Critical types
    if (
      entity.type === "message:delete" ||
      entity.type === "channel:settings"
    ) {
      return "critical";
    }

    // High severity for settings with critical fields
    if (entity.type === "user:settings") {
      const hasComplex = this.hasCriticalSettingsConflict(
        entity.localData as Partial<UserSettings>,
        entity.remoteData as Partial<UserSettings>,
      );
      if (hasComplex) {
        return "high";
      }
    }

    // Medium severity for edits
    if (entity.type === "message:edit" || entity.type === "thread:reply") {
      return "medium";
    }

    // Low severity for file uploads and other operations
    return "low";
  }

  /**
   * Check if settings conflict involves critical fields
   */
  private hasCriticalSettingsConflict(
    local: Partial<UserSettings>,
    remote: Partial<UserSettings>,
  ): boolean {
    for (const field of CRITICAL_SETTINGS_FIELDS) {
      const [category, key] = field.split(".");
      const localCategory = local[category as keyof UserSettings] as
        | Record<string, any>
        | undefined;
      const remoteCategory = remote[category as keyof UserSettings] as
        | Record<string, any>
        | undefined;
      const localValue = localCategory?.[key as string];
      const remoteValue = remoteCategory?.[key as string];

      if (
        localValue !== undefined &&
        remoteValue !== undefined &&
        localValue !== remoteValue
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Suggest resolution strategy based on conflict type and severity
   */
  private suggestStrategy(
    entity: ConflictEntity,
    severity: ConflictSeverity,
  ): ResolutionStrategy {
    // Manual resolution for critical conflicts
    if (severity === "critical") {
      return "manual";
    }

    // Use type-specific strategy
    const typeStrategy = CONFLICT_TYPE_STRATEGIES[entity.type];
    if (typeStrategy) {
      return typeStrategy;
    }

    // Fallback to default
    return this.config.defaultStrategy;
  }

  /**
   * Get human-readable conflict reason
   */
  private getConflictReason(entity: ConflictEntity): string {
    switch (entity.type) {
      case "message:edit":
        return "Message was edited on multiple devices while offline";
      case "message:delete":
        return "Message was deleted while offline edits were pending";
      case "channel:settings":
        return "Channel settings were changed on multiple devices";
      case "user:settings":
        return "User settings were changed on multiple devices";
      case "file:upload":
        return "Same file was uploaded multiple times";
      case "thread:reply":
        return "Thread was modified while offline";
      default:
        return "Data was modified on multiple devices while offline";
    }
  }

  // ============================================================================
  // Conflict Resolution
  // ============================================================================

  /**
   * Resolve a conflict using the specified strategy
   */
  resolveConflict(
    detection: ConflictDetectionResult,
    strategy?: ResolutionStrategy,
    userChoice?: unknown,
  ): ConflictResolutionResult {
    const resolveStrategy = strategy ?? detection.suggestedStrategy;
    const entity = detection.entity;

    this.log(
      "Resolving conflict:",
      entity.id,
      "with strategy:",
      resolveStrategy,
    );

    let resolvedData: unknown;
    let requiresUserAction = false;
    let conflictedFields: string[] = [];

    switch (resolveStrategy) {
      case "last-write-wins":
        resolvedData = this.resolveLastWriteWins(entity);
        break;

      case "server-wins":
        resolvedData = entity.remoteData;
        break;

      case "client-wins":
        resolvedData = entity.localData;
        break;

      case "merge":
        const mergeResult = this.resolveMerge(entity);
        resolvedData = mergeResult.data;
        conflictedFields = mergeResult.conflictedFields;
        break;

      case "manual":
        if (userChoice !== undefined) {
          resolvedData = userChoice;
        } else {
          resolvedData = entity.remoteData; // Default to remote for manual
          requiresUserAction = true;
        }
        break;

      default:
        resolvedData = entity.remoteData;
    }

    const result: ConflictResolutionResult = {
      id: entity.id,
      type: entity.type,
      strategy: resolveStrategy,
      resolvedData,
      conflictedFields:
        conflictedFields.length > 0 ? conflictedFields : undefined,
      timestamp: Date.now(),
      requiresUserAction,
    };

    this.emit("conflict:resolved", { resolution: result });

    // Add to history
    if (this.config.enableHistory) {
      this.addToHistory({
        id: entity.id,
        type: entity.type,
        detectedAt: Date.now(),
        resolvedAt: Date.now(),
        strategy: resolveStrategy,
        entity,
        resolution: result,
      });
    }

    this.log("Conflict resolved:", result);

    return result;
  }

  /**
   * Resolve using last-write-wins strategy
   */
  private resolveLastWriteWins(entity: ConflictEntity): unknown {
    if (entity.remoteTimestamp > entity.localTimestamp) {
      return entity.remoteData;
    }
    return entity.localData;
  }

  /**
   * Resolve using merge strategy
   */
  private resolveMerge(entity: ConflictEntity): {
    data: unknown;
    conflictedFields: string[];
  } {
    const local = entity.localData as Record<string, unknown>;
    const remote = entity.remoteData as Record<string, unknown>;

    if (
      !local ||
      !remote ||
      typeof local !== "object" ||
      typeof remote !== "object"
    ) {
      return { data: remote, conflictedFields: [] };
    }

    const merged: Record<string, unknown> = {};
    const conflictedFields: string[] = [];

    // Get all keys from both objects
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of allKeys) {
      const localValue = local[key];
      const remoteValue = remote[key];

      // If only one side has the key, use that value
      if (localValue === undefined) {
        merged[key] = remoteValue;
        continue;
      }
      if (remoteValue === undefined) {
        merged[key] = localValue;
        continue;
      }

      // If values are equal, no conflict
      if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) {
        merged[key] = localValue;
        continue;
      }

      // For objects, recursively merge
      if (
        typeof localValue === "object" &&
        typeof remoteValue === "object" &&
        localValue !== null &&
        remoteValue !== null &&
        !Array.isArray(localValue) &&
        !Array.isArray(remoteValue)
      ) {
        const nestedResult = this.resolveMerge({
          ...entity,
          localData: localValue,
          remoteData: remoteValue,
        });
        merged[key] = nestedResult.data;
        conflictedFields.push(
          ...nestedResult.conflictedFields.map((field) => `${key}.${field}`),
        );
        continue;
      }

      // For arrays, union merge
      if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
        merged[key] = [...new Set([...localValue, ...remoteValue])];
        conflictedFields.push(key);
        continue;
      }

      // For primitive conflicts, prefer remote (more recent server data)
      merged[key] = remoteValue;
      conflictedFields.push(key);
    }

    return { data: merged, conflictedFields };
  }

  /**
   * Auto-resolve conflict if strategy allows
   */
  autoResolve(
    detection: ConflictDetectionResult,
  ): ConflictResolutionResult | null {
    // Only auto-resolve if enabled and severity is low
    if (!this.config.autoResolveLowSeverity || detection.severity !== "low") {
      return null;
    }

    // Don't auto-resolve manual strategy
    if (detection.suggestedStrategy === "manual") {
      return null;
    }

    return this.resolveConflict(detection);
  }

  // ============================================================================
  // Conflict History
  // ============================================================================

  /**
   * Add entry to conflict history
   */
  private addToHistory(entry: ConflictHistoryEntry): void {
    this.history.unshift(entry);

    // Trim history to max size
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(0, this.config.maxHistorySize);
    }

    this.saveHistoryToStorage();
    this.emit("conflict:history-updated", { history: entry });
  }

  /**
   * Get conflict history
   */
  getHistory(filter?: {
    type?: ConflictType;
    limit?: number;
  }): ConflictHistoryEntry[] {
    let filtered = [...this.history];

    if (filter?.type) {
      filtered = filtered.filter((entry) => entry.type === filter.type);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Get a specific history entry
   */
  getHistoryEntry(id: string): ConflictHistoryEntry | undefined {
    return this.history.find((entry) => entry.id === id);
  }

  /**
   * Clear conflict history
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistoryToStorage();
    this.log("Conflict history cleared");
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to conflict events
   */
  subscribe(listener: ConflictEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(
    event: ConflictEventType,
    data?: {
      detection?: ConflictDetectionResult;
      resolution?: ConflictResolutionResult;
      history?: ConflictHistoryEntry;
    },
  ): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        logger.error("[ConflictResolution] Listener error:", error);
      }
    });
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Load history from localStorage
   */
  private loadHistoryFromStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      this.history = parsed.history || [];

      this.log("Loaded", this.history.length, "history entries from storage");
    } catch (error) {
      logger.error("[ConflictResolution] Failed to load history:", error);
      localStorage.removeItem(this.config.storageKey);
    }
  }

  /**
   * Save history to localStorage
   */
  private saveHistoryToStorage(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify({ history: this.history }),
      );
    } catch (error) {
      logger.error("[ConflictResolution] Failed to save history:", error);
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Log message if debug enabled
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      // REMOVED: console.log('[ConflictResolution]', ...args)
    }
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalConflicts: number;
    resolvedConflicts: number;
    pendingConflicts: number;
    byType: Record<ConflictType, number>;
    byStrategy: Record<ResolutionStrategy, number>;
  } {
    const byType: Record<string, number> = {};
    const byStrategy: Record<string, number> = {};

    let resolved = 0;
    let pending = 0;

    for (const entry of this.history) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      byStrategy[entry.strategy] = (byStrategy[entry.strategy] || 0) + 1;

      if (entry.resolvedAt) {
        resolved++;
      } else {
        pending++;
      }
    }

    return {
      totalConflicts: this.history.length,
      resolvedConflicts: resolved,
      pendingConflicts: pending,
      byType: byType as Record<ConflictType, number>,
      byStrategy: byStrategy as Record<ResolutionStrategy, number>,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let conflictResolutionInstance: ConflictResolutionService | null = null;

/**
 * Get the conflict resolution service instance
 */
export function getConflictResolutionService(
  config?: ConflictResolutionConfig,
): ConflictResolutionService {
  if (!conflictResolutionInstance) {
    conflictResolutionInstance = new ConflictResolutionService(config);
  }
  return conflictResolutionInstance;
}

/**
 * Initialize the conflict resolution service
 */
export function initializeConflictResolution(
  config?: ConflictResolutionConfig,
): ConflictResolutionService {
  const service = getConflictResolutionService(config);
  service.initialize();
  return service;
}

/**
 * Reset the conflict resolution service
 */
export function resetConflictResolution(): void {
  if (conflictResolutionInstance) {
    conflictResolutionInstance.destroy();
    conflictResolutionInstance = null;
  }
}

export { ConflictResolutionService };
export default ConflictResolutionService;
