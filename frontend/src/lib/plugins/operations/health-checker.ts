/**
 * Plugin Health Checker
 *
 * Monitors plugin health through periodic checks, tracking uptime,
 * response times, consecutive failures/successes, and state transitions.
 * Provides a comprehensive health picture for each registered plugin.
 */

import type {
  PluginHealthState,
  PluginHealthCheckResult,
  HealthCheckConfig,
  HealthCheckFn,
} from "./types";
import { DEFAULT_HEALTH_CHECK_CONFIG } from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class HealthCheckError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly pluginId: string,
  ) {
    super(message);
    this.name = "HealthCheckError";
  }
}

// ============================================================================
// HEALTH CHECK RECORD
// ============================================================================

interface PluginHealthRecord {
  pluginId: string;
  checkFn: HealthCheckFn;
  config: HealthCheckConfig;
  state: PluginHealthState;
  totalChecks: number;
  successfulChecks: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastHealthyAt: string | null;
  lastError: string | null;
  lastCheckAt: string | null;
  lastResponseTimeMs: number;
  responseTimes: number[];
  intervalHandle: ReturnType<typeof setInterval> | null;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type HealthCheckEventType =
  | "check_completed"
  | "state_changed"
  | "plugin_registered"
  | "plugin_unregistered";

export interface HealthCheckEvent {
  type: HealthCheckEventType;
  pluginId: string;
  timestamp: string;
  previousState?: PluginHealthState;
  newState?: PluginHealthState;
  result?: PluginHealthCheckResult;
}

export type HealthCheckEventListener = (event: HealthCheckEvent) => void;

// ============================================================================
// PLUGIN HEALTH CHECKER
// ============================================================================

export class PluginHealthChecker {
  private plugins: Map<string, PluginHealthRecord> = new Map();
  private defaultConfig: HealthCheckConfig;
  private listeners: HealthCheckEventListener[] = [];

  constructor(config?: Partial<HealthCheckConfig>) {
    this.defaultConfig = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...config };
  }

  // ==========================================================================
  // PLUGIN REGISTRATION
  // ==========================================================================

  /**
   * Register a plugin for health monitoring.
   */
  registerPlugin(
    pluginId: string,
    checkFn: HealthCheckFn,
    config?: Partial<HealthCheckConfig>,
  ): void {
    if (this.plugins.has(pluginId)) {
      throw new HealthCheckError(
        `Plugin "${pluginId}" is already registered for health checking`,
        "ALREADY_REGISTERED",
        pluginId,
      );
    }

    const pluginConfig = { ...this.defaultConfig, ...config };

    const record: PluginHealthRecord = {
      pluginId,
      checkFn,
      config: pluginConfig,
      state: "unknown",
      totalChecks: 0,
      successfulChecks: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastHealthyAt: null,
      lastError: null,
      lastCheckAt: null,
      lastResponseTimeMs: 0,
      responseTimes: [],
      intervalHandle: null,
    };

    this.plugins.set(pluginId, record);
    this.emitEvent({
      type: "plugin_registered",
      pluginId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unregister a plugin from health monitoring.
   */
  unregisterPlugin(pluginId: string): boolean {
    const record = this.plugins.get(pluginId);
    if (!record) return false;

    this.stopMonitoring(pluginId);
    this.plugins.delete(pluginId);
    this.emitEvent({
      type: "plugin_unregistered",
      pluginId,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Check if a plugin is registered.
   */
  isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get all registered plugin IDs.
   */
  getRegisteredPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  // ==========================================================================
  // HEALTH CHECKING
  // ==========================================================================

  /**
   * Run a health check for a specific plugin.
   */
  async checkPlugin(pluginId: string): Promise<PluginHealthCheckResult> {
    const record = this.plugins.get(pluginId);
    if (!record) {
      throw new HealthCheckError(
        `Plugin "${pluginId}" is not registered for health checking`,
        "NOT_REGISTERED",
        pluginId,
      );
    }

    const startTime = Date.now();
    const previousState = record.state;

    try {
      const checkResult = await this.executeWithTimeout(
        record.checkFn,
        record.config.timeoutMs,
      );

      const responseTimeMs = Date.now() - startTime;
      this.updateRecordOnSuccess(
        record,
        responseTimeMs,
        checkResult.message,
        checkResult.details,
      );

      const result = this.buildResult(record);

      if (previousState !== record.state) {
        this.emitEvent({
          type: "state_changed",
          pluginId,
          timestamp: new Date().toISOString(),
          previousState,
          newState: record.state,
          result,
        });
      }

      this.emitEvent({
        type: "check_completed",
        pluginId,
        timestamp: new Date().toISOString(),
        result,
      });

      return result;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.updateRecordOnFailure(record, responseTimeMs, errorMessage);

      const result = this.buildResult(record);

      if (previousState !== record.state) {
        this.emitEvent({
          type: "state_changed",
          pluginId,
          timestamp: new Date().toISOString(),
          previousState,
          newState: record.state,
          result,
        });
      }

      this.emitEvent({
        type: "check_completed",
        pluginId,
        timestamp: new Date().toISOString(),
        result,
      });

      return result;
    }
  }

  /**
   * Run health checks for all registered plugins.
   */
  async checkAll(): Promise<Map<string, PluginHealthCheckResult>> {
    const results = new Map<string, PluginHealthCheckResult>();
    const pluginIds = Array.from(this.plugins.keys());

    for (const pluginId of pluginIds) {
      const result = await this.checkPlugin(pluginId);
      results.set(pluginId, result);
    }

    return results;
  }

  /**
   * Get the current health status of a plugin without running a check.
   */
  getStatus(pluginId: string): PluginHealthCheckResult | null {
    const record = this.plugins.get(pluginId);
    if (!record) return null;
    return this.buildResult(record);
  }

  /**
   * Get the health state of a plugin.
   */
  getState(pluginId: string): PluginHealthState | null {
    const record = this.plugins.get(pluginId);
    return record ? record.state : null;
  }

  /**
   * Check if a plugin is healthy.
   */
  isHealthy(pluginId: string): boolean {
    const record = this.plugins.get(pluginId);
    return record ? record.state === "healthy" : false;
  }

  // ==========================================================================
  // MONITORING
  // ==========================================================================

  /**
   * Start periodic health monitoring for a plugin.
   */
  startMonitoring(pluginId: string): void {
    const record = this.plugins.get(pluginId);
    if (!record) {
      throw new HealthCheckError(
        `Plugin "${pluginId}" is not registered`,
        "NOT_REGISTERED",
        pluginId,
      );
    }

    if (!record.config.enabled) return;
    if (record.intervalHandle) return;

    record.intervalHandle = setInterval(async () => {
      try {
        await this.checkPlugin(pluginId);
      } catch {
        // Silently handle - errors are tracked in the record
      }
    }, record.config.intervalMs);
  }

  /**
   * Stop periodic health monitoring for a plugin.
   */
  stopMonitoring(pluginId: string): void {
    const record = this.plugins.get(pluginId);
    if (!record) return;

    if (record.intervalHandle) {
      clearInterval(record.intervalHandle);
      record.intervalHandle = null;
    }
  }

  /**
   * Start monitoring all registered plugins.
   */
  startAllMonitoring(): void {
    for (const pluginId of this.plugins.keys()) {
      this.startMonitoring(pluginId);
    }
  }

  /**
   * Stop monitoring all registered plugins.
   */
  stopAllMonitoring(): void {
    for (const pluginId of this.plugins.keys()) {
      this.stopMonitoring(pluginId);
    }
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  /**
   * Add an event listener.
   */
  addEventListener(listener: HealthCheckEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  removeEventListener(listener: HealthCheckEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  // ==========================================================================
  // AGGREGATE STATS
  // ==========================================================================

  /**
   * Get aggregate health statistics across all plugins.
   */
  getAggregateStats(): {
    totalPlugins: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
    averageUptimePercent: number;
    averageResponseTimeMs: number;
  } {
    const stats = {
      totalPlugins: this.plugins.size,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 0,
      averageUptimePercent: 0,
      averageResponseTimeMs: 0,
    };

    let totalUptime = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const record of this.plugins.values()) {
      switch (record.state) {
        case "healthy":
          stats.healthy++;
          break;
        case "degraded":
          stats.degraded++;
          break;
        case "unhealthy":
          stats.unhealthy++;
          break;
        case "unknown":
          stats.unknown++;
          break;
      }

      if (record.totalChecks > 0) {
        totalUptime += (record.successfulChecks / record.totalChecks) * 100;
      }

      if (record.responseTimes.length > 0) {
        totalResponseTime += record.responseTimes.reduce((a, b) => a + b, 0);
        responseTimeCount += record.responseTimes.length;
      }
    }

    if (this.plugins.size > 0) {
      stats.averageUptimePercent =
        Math.round((totalUptime / this.plugins.size) * 100) / 100;
    }

    if (responseTimeCount > 0) {
      stats.averageResponseTimeMs = Math.round(
        totalResponseTime / responseTimeCount,
      );
    }

    return stats;
  }

  // ==========================================================================
  // RESET
  // ==========================================================================

  /**
   * Reset health statistics for a plugin.
   */
  resetStats(pluginId: string): void {
    const record = this.plugins.get(pluginId);
    if (!record) return;

    record.totalChecks = 0;
    record.successfulChecks = 0;
    record.consecutiveFailures = 0;
    record.consecutiveSuccesses = 0;
    record.lastHealthyAt = null;
    record.lastError = null;
    record.lastCheckAt = null;
    record.lastResponseTimeMs = 0;
    record.responseTimes = [];
    record.state = "unknown";
  }

  /**
   * Clear all registered plugins and stop monitoring.
   */
  clear(): void {
    this.stopAllMonitoring();
    this.plugins.clear();
    this.listeners = [];
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async executeWithTimeout(
    fn: HealthCheckFn,
    timeoutMs: number,
  ): Promise<{
    healthy: boolean;
    message?: string;
    details?: Record<string, unknown>;
  }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new HealthCheckError(
            `Health check timed out after ${timeoutMs}ms`,
            "TIMEOUT",
            "unknown",
          ),
        );
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          if (result.healthy) {
            resolve(result);
          } else {
            reject(
              new Error(result.message || "Health check reported unhealthy"),
            );
          }
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private updateRecordOnSuccess(
    record: PluginHealthRecord,
    responseTimeMs: number,
    message?: string,
    details?: Record<string, unknown>,
  ): void {
    record.totalChecks++;
    record.successfulChecks++;
    record.consecutiveSuccesses++;
    record.consecutiveFailures = 0;
    record.lastResponseTimeMs = responseTimeMs;
    record.lastCheckAt = new Date().toISOString();
    record.responseTimes.push(responseTimeMs);

    // Keep only last 100 response times
    if (record.responseTimes.length > 100) {
      record.responseTimes = record.responseTimes.slice(-100);
    }

    // State transitions
    if (record.state === "unknown" || record.state === "unhealthy") {
      if (record.consecutiveSuccesses >= record.config.healthyThreshold) {
        record.state = "healthy";
        record.lastHealthyAt = new Date().toISOString();
      } else {
        record.state = "degraded";
      }
    } else if (record.state === "degraded") {
      if (record.consecutiveSuccesses >= record.config.healthyThreshold) {
        record.state = "healthy";
        record.lastHealthyAt = new Date().toISOString();
      }
    } else {
      // Already healthy
      record.lastHealthyAt = new Date().toISOString();
    }

    // Store any message/details for the result
    if (message) {
      record.lastError = null; // Clear last error on success
    }
    // We store details but don't have a field for it in the record,
    // so we rely on buildResult to include current state
    void details;
  }

  private updateRecordOnFailure(
    record: PluginHealthRecord,
    responseTimeMs: number,
    errorMessage: string,
  ): void {
    record.totalChecks++;
    record.consecutiveFailures++;
    record.consecutiveSuccesses = 0;
    record.lastResponseTimeMs = responseTimeMs;
    record.lastCheckAt = new Date().toISOString();
    record.lastError = errorMessage;
    record.responseTimes.push(responseTimeMs);

    // Keep only last 100 response times
    if (record.responseTimes.length > 100) {
      record.responseTimes = record.responseTimes.slice(-100);
    }

    // State transitions
    if (record.consecutiveFailures >= record.config.unhealthyThreshold) {
      record.state = "unhealthy";
    } else if (record.consecutiveFailures >= record.config.degradedThreshold) {
      record.state = "degraded";
    }
  }

  private buildResult(record: PluginHealthRecord): PluginHealthCheckResult {
    const uptimePercent =
      record.totalChecks > 0
        ? Math.round((record.successfulChecks / record.totalChecks) * 10000) /
          100
        : 0;

    let message: string;
    switch (record.state) {
      case "healthy":
        message = "Plugin is healthy";
        break;
      case "degraded":
        message = `Plugin is degraded (${record.consecutiveFailures} consecutive failures)`;
        break;
      case "unhealthy":
        message = `Plugin is unhealthy: ${record.lastError || "unknown error"}`;
        break;
      case "unknown":
      default:
        message = "Plugin health status is unknown";
        break;
    }

    return {
      pluginId: record.pluginId,
      state: record.state,
      message,
      checkedAt: record.lastCheckAt || new Date().toISOString(),
      responseTimeMs: record.lastResponseTimeMs,
      uptimePercent,
      totalChecks: record.totalChecks,
      consecutiveFailures: record.consecutiveFailures,
      consecutiveSuccesses: record.consecutiveSuccesses,
      lastHealthyAt: record.lastHealthyAt,
      lastError: record.lastError,
      details: {},
    };
  }

  private emitEvent(event: HealthCheckEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Silently handle listener errors
      }
    }
  }
}
