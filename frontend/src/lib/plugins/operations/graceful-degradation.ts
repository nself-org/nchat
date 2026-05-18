/**
 * Graceful Degradation Manager
 *
 * Manages plugin failure degradation levels and fallback handlers.
 * When a plugin fails, instead of crashing the app, the system
 * gracefully degrades by providing fallback values, caching results,
 * and disabling features that depend on the failed plugin.
 */

import type {
  DegradationLevel,
  FallbackConfig,
  FallbackHandler,
  FallbackContext,
  DegradationStatus,
  GracefulDegradationConfig,
} from "./types";
import { DEFAULT_GRACEFUL_DEGRADATION_CONFIG } from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class DegradationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly pluginId?: string,
  ) {
    super(message);
    this.name = "DegradationError";
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface PluginDegradationRecord {
  pluginId: string;
  level: DegradationLevel;
  degradedSince: string | null;
  reason: string | null;
  features: Map<string, FeatureRecord>;
}

interface FeatureRecord {
  featureId: string;
  pluginId: string;
  fallback: FallbackConfig | null;
  status: "active" | "degraded" | "fallback" | "disabled";
  invocationCount: number;
  lastInvokedAt: string | null;
  invocationTimestamps: number[];
  cachedResult: { value: unknown; expiresAt: number } | null;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type DegradationEventType =
  | "level_changed"
  | "feature_degraded"
  | "feature_disabled"
  | "feature_restored"
  | "fallback_invoked"
  | "fallback_cached";

export interface DegradationEvent {
  type: DegradationEventType;
  pluginId: string;
  featureId?: string;
  timestamp: string;
  previousLevel?: DegradationLevel;
  newLevel?: DegradationLevel;
  error?: string;
}

export type DegradationEventListener = (event: DegradationEvent) => void;

// ============================================================================
// GRACEFUL DEGRADATION MANAGER
// ============================================================================

export class GracefulDegradationManager {
  private config: GracefulDegradationConfig;
  private plugins: Map<string, PluginDegradationRecord> = new Map();
  private listeners: DegradationEventListener[] = [];

  constructor(config?: Partial<GracefulDegradationConfig>) {
    this.config = { ...DEFAULT_GRACEFUL_DEGRADATION_CONFIG, ...config };
  }

  // ==========================================================================
  // PLUGIN REGISTRATION
  // ==========================================================================

  /**
   * Register a plugin for degradation management.
   */
  registerPlugin(pluginId: string): void {
    if (this.plugins.has(pluginId)) return;

    this.plugins.set(pluginId, {
      pluginId,
      level: "none",
      degradedSince: null,
      reason: null,
      features: new Map(),
    });
  }

  /**
   * Unregister a plugin.
   */
  unregisterPlugin(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  /**
   * Check if a plugin is registered.
   */
  isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  // ==========================================================================
  // FEATURE REGISTRATION
  // ==========================================================================

  /**
   * Register a feature for a plugin.
   */
  registerFeature(pluginId: string, featureId: string): void {
    const record = this.getOrCreatePlugin(pluginId);

    if (record.features.has(featureId)) return;

    record.features.set(featureId, {
      featureId,
      pluginId,
      fallback: null,
      status: "active",
      invocationCount: 0,
      lastInvokedAt: null,
      invocationTimestamps: [],
      cachedResult: null,
    });
  }

  /**
   * Register a fallback for a feature.
   */
  registerFallback(fallbackConfig: FallbackConfig): void {
    const record = this.getOrCreatePlugin(fallbackConfig.pluginId);

    let feature = record.features.get(fallbackConfig.featureId);
    if (!feature) {
      feature = {
        featureId: fallbackConfig.featureId,
        pluginId: fallbackConfig.pluginId,
        fallback: null,
        status: "active",
        invocationCount: 0,
        lastInvokedAt: null,
        invocationTimestamps: [],
        cachedResult: null,
      };
      record.features.set(fallbackConfig.featureId, feature);
    }

    feature.fallback = fallbackConfig;
  }

  /**
   * Remove a fallback for a feature.
   */
  removeFallback(pluginId: string, featureId: string): boolean {
    const record = this.plugins.get(pluginId);
    if (!record) return false;

    const feature = record.features.get(featureId);
    if (!feature) return false;

    feature.fallback = null;
    return true;
  }

  /**
   * Check if a feature has a fallback.
   */
  hasFallback(pluginId: string, featureId: string): boolean {
    const record = this.plugins.get(pluginId);
    if (!record) return false;

    const feature = record.features.get(featureId);
    return feature ? feature.fallback !== null : false;
  }

  // ==========================================================================
  // DEGRADATION CONTROL
  // ==========================================================================

  /**
   * Degrade a plugin to a specific level.
   */
  degradePlugin(
    pluginId: string,
    level: DegradationLevel,
    reason: string,
  ): void {
    const record = this.getOrCreatePlugin(pluginId);
    const previousLevel = record.level;

    if (previousLevel === level) return;

    record.level = level;
    record.reason = reason;

    if (level !== "none" && !record.degradedSince) {
      record.degradedSince = new Date().toISOString();
    } else if (level === "none") {
      record.degradedSince = null;
      record.reason = null;
    }

    // Update feature statuses based on degradation level
    this.updateFeatureStatuses(record);

    this.emitEvent({
      type: "level_changed",
      pluginId,
      timestamp: new Date().toISOString(),
      previousLevel,
      newLevel: level,
    });
  }

  /**
   * Restore a plugin to normal operation.
   */
  restorePlugin(pluginId: string): void {
    this.degradePlugin(pluginId, "none", "");
  }

  /**
   * Degrade a specific feature.
   */
  degradeFeature(pluginId: string, featureId: string, reason: string): void {
    const record = this.getOrCreatePlugin(pluginId);
    const feature = record.features.get(featureId);
    if (!feature) {
      this.registerFeature(pluginId, featureId);
      return this.degradeFeature(pluginId, featureId, reason);
    }

    if (feature.fallback) {
      feature.status = "fallback";
    } else {
      feature.status = "disabled";
    }

    this.recalculatePluginLevel(record);

    this.emitEvent({
      type:
        feature.status === "disabled" ? "feature_disabled" : "feature_degraded",
      pluginId,
      featureId,
      timestamp: new Date().toISOString(),
      error: reason,
    });
  }

  /**
   * Disable a specific feature completely.
   */
  disableFeature(pluginId: string, featureId: string): void {
    const record = this.plugins.get(pluginId);
    if (!record) return;

    const feature = record.features.get(featureId);
    if (!feature) return;

    feature.status = "disabled";
    feature.cachedResult = null;

    this.recalculatePluginLevel(record);

    this.emitEvent({
      type: "feature_disabled",
      pluginId,
      featureId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Restore a specific feature.
   */
  restoreFeature(pluginId: string, featureId: string): void {
    const record = this.plugins.get(pluginId);
    if (!record) return;

    const feature = record.features.get(featureId);
    if (!feature) return;

    feature.status = "active";
    feature.invocationCount = 0;
    feature.invocationTimestamps = [];
    feature.cachedResult = null;

    this.recalculatePluginLevel(record);

    this.emitEvent({
      type: "feature_restored",
      pluginId,
      featureId,
      timestamp: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // FALLBACK EXECUTION
  // ==========================================================================

  /**
   * Execute a fallback for a feature.
   * Returns the fallback value if available, throws if no fallback.
   */
  async executeFallback<T = unknown>(
    pluginId: string,
    featureId: string,
    error: Error | null,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.config.enabled) {
      throw new DegradationError(
        "Graceful degradation is disabled",
        "DEGRADATION_DISABLED",
        pluginId,
      );
    }

    const record = this.plugins.get(pluginId);
    if (!record) {
      throw new DegradationError(
        `Plugin "${pluginId}" is not registered`,
        "NOT_REGISTERED",
        pluginId,
      );
    }

    const feature = record.features.get(featureId);
    if (!feature) {
      throw new DegradationError(
        `Feature "${featureId}" is not registered for plugin "${pluginId}"`,
        "FEATURE_NOT_REGISTERED",
        pluginId,
      );
    }

    if (!feature.fallback) {
      throw new DegradationError(
        `No fallback registered for feature "${featureId}" of plugin "${pluginId}"`,
        "NO_FALLBACK",
        pluginId,
      );
    }

    if (feature.status === "disabled") {
      throw new DegradationError(
        `Feature "${featureId}" is disabled`,
        "FEATURE_DISABLED",
        pluginId,
      );
    }

    // Check cache
    if (this.config.cacheFallbacks && feature.cachedResult) {
      if (Date.now() < feature.cachedResult.expiresAt) {
        this.emitEvent({
          type: "fallback_cached",
          pluginId,
          featureId,
          timestamp: new Date().toISOString(),
        });
        return feature.cachedResult.value as T;
      }
      feature.cachedResult = null;
    }

    // Check invocation limits
    this.pruneInvocationTimestamps(feature);
    if (
      feature.invocationTimestamps.length >= this.config.maxFallbackInvocations
    ) {
      feature.status = "disabled";
      this.recalculatePluginLevel(record);
      throw new DegradationError(
        `Fallback invocation limit exceeded for "${featureId}"`,
        "INVOCATION_LIMIT",
        pluginId,
      );
    }

    const context: FallbackContext = {
      pluginId,
      featureId,
      error,
      invocationCount: feature.invocationCount,
      lastInvokedAt: feature.lastInvokedAt,
      metadata: metadata || {},
    };

    try {
      const result = await feature.fallback.handler(context);

      feature.invocationCount++;
      feature.lastInvokedAt = new Date().toISOString();
      feature.invocationTimestamps.push(Date.now());
      feature.status = "fallback";

      // Cache result if configured
      if (this.config.cacheFallbacks && feature.fallback.cacheable) {
        const ttl =
          feature.fallback.cacheTtlMs || this.config.defaultCacheTtlMs;
        feature.cachedResult = {
          value: result,
          expiresAt: Date.now() + ttl,
        };
      }

      this.recalculatePluginLevel(record);

      this.emitEvent({
        type: "fallback_invoked",
        pluginId,
        featureId,
        timestamp: new Date().toISOString(),
      });

      return result as T;
    } catch (fallbackError) {
      feature.status = "disabled";
      this.recalculatePluginLevel(record);

      throw new DegradationError(
        `Fallback handler failed for "${featureId}": ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
        "FALLBACK_FAILED",
        pluginId,
      );
    }
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  /**
   * Get degradation status for a plugin.
   */
  getStatus(pluginId: string): DegradationStatus | null {
    const record = this.plugins.get(pluginId);
    if (!record) return null;

    const degradedFeatures: string[] = [];
    const fallbackFeatures: string[] = [];
    const disabledFeatures: string[] = [];

    for (const feature of record.features.values()) {
      switch (feature.status) {
        case "degraded":
          degradedFeatures.push(feature.featureId);
          break;
        case "fallback":
          fallbackFeatures.push(feature.featureId);
          break;
        case "disabled":
          disabledFeatures.push(feature.featureId);
          break;
      }
    }

    return {
      pluginId,
      level: record.level,
      degradedFeatures,
      fallbackFeatures,
      disabledFeatures,
      degradedSince: record.degradedSince,
      reason: record.reason,
    };
  }

  /**
   * Get degradation level for a plugin.
   */
  getLevel(pluginId: string): DegradationLevel {
    const record = this.plugins.get(pluginId);
    return record ? record.level : "none";
  }

  /**
   * Check if a plugin is degraded.
   */
  isDegraded(pluginId: string): boolean {
    const record = this.plugins.get(pluginId);
    return record ? record.level !== "none" : false;
  }

  /**
   * Check if a feature is available (active or has a working fallback).
   */
  isFeatureAvailable(pluginId: string, featureId: string): boolean {
    const record = this.plugins.get(pluginId);
    if (!record) return false;

    const feature = record.features.get(featureId);
    if (!feature) return false;

    return feature.status === "active" || feature.status === "fallback";
  }

  /**
   * Get all degraded plugins.
   */
  getDegradedPlugins(): DegradationStatus[] {
    const results: DegradationStatus[] = [];
    for (const pluginId of this.plugins.keys()) {
      const status = this.getStatus(pluginId);
      if (status && status.level !== "none") {
        results.push(status);
      }
    }
    return results;
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  /**
   * Add an event listener.
   */
  addEventListener(listener: DegradationEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  removeEventListener(listener: DegradationEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all state.
   */
  clear(): void {
    this.plugins.clear();
    this.listeners = [];
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getOrCreatePlugin(pluginId: string): PluginDegradationRecord {
    let record = this.plugins.get(pluginId);
    if (!record) {
      record = {
        pluginId,
        level: "none",
        degradedSince: null,
        reason: null,
        features: new Map(),
      };
      this.plugins.set(pluginId, record);
    }
    return record;
  }

  private updateFeatureStatuses(record: PluginDegradationRecord): void {
    for (const feature of record.features.values()) {
      switch (record.level) {
        case "none":
          feature.status = "active";
          break;
        case "partial":
          // Keep current feature status
          break;
        case "fallback":
          if (feature.fallback) {
            feature.status = "fallback";
          } else {
            feature.status = "disabled";
          }
          break;
        case "disabled":
          feature.status = "disabled";
          break;
      }
    }
  }

  private recalculatePluginLevel(record: PluginDegradationRecord): void {
    if (record.features.size === 0) return;

    let activeCount = 0;
    let fallbackCount = 0;
    let disabledCount = 0;

    for (const feature of record.features.values()) {
      switch (feature.status) {
        case "active":
          activeCount++;
          break;
        case "fallback":
        case "degraded":
          fallbackCount++;
          break;
        case "disabled":
          disabledCount++;
          break;
      }
    }

    const total = record.features.size;
    const previousLevel = record.level;

    if (disabledCount === total) {
      record.level = "disabled";
    } else if (disabledCount > 0 || fallbackCount > 0) {
      if (activeCount === 0) {
        record.level = "fallback";
      } else {
        record.level = "partial";
      }
    } else {
      record.level = "none";
    }

    if (record.level !== "none" && !record.degradedSince) {
      record.degradedSince = new Date().toISOString();
    } else if (record.level === "none") {
      record.degradedSince = null;
      record.reason = null;
    }

    if (previousLevel !== record.level) {
      this.emitEvent({
        type: "level_changed",
        pluginId: record.pluginId,
        timestamp: new Date().toISOString(),
        previousLevel,
        newLevel: record.level,
      });
    }
  }

  private pruneInvocationTimestamps(feature: FeatureRecord): void {
    const cutoff = Date.now() - this.config.fallbackWindowMs;
    feature.invocationTimestamps = feature.invocationTimestamps.filter(
      (ts) => ts > cutoff,
    );
  }

  private emitEvent(event: DegradationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Silently handle listener errors
      }
    }
  }
}
