/**
 * Plugin Operations Service
 *
 * Orchestrates all operational hardening concerns for the plugin system:
 * health checks, version compatibility, circuit breakers, graceful degradation,
 * and rollback management. Provides a unified API for plugin operational status.
 */

import { PluginHealthChecker } from "@/lib/plugins/operations/health-checker";
import { VersionCompatibilityChecker } from "@/lib/plugins/operations/version-compatibility";
import { RollbackManager } from "@/lib/plugins/operations/rollback-manager";
import { CircuitBreakerManager } from "@/lib/plugins/operations/circuit-breaker";
import { GracefulDegradationManager } from "@/lib/plugins/operations/graceful-degradation";
import type {
  PluginOperationsConfig,
  PluginOperationalStatus,
  PluginHealthCheckResult,
  VersionCompatibilityResult,
  CircuitBreakerStatus,
  DegradationStatus,
  HealthCheckFn,
  FallbackConfig,
  RollbackConfig,
  CircuitBreakerConfig,
  PluginSnapshot,
  RollbackRecord,
} from "@/lib/plugins/operations/types";
import { DEFAULT_PLUGIN_OPERATIONS_CONFIG } from "@/lib/plugins/operations/types";
import type { RollbackHandler } from "@/lib/plugins/operations/rollback-manager";

// ============================================================================
// SERVICE CONFIGURATION
// ============================================================================

export interface OperationsServiceConfig extends PluginOperationsConfig {
  /** Whether auto-rollback is triggered on plugin failure */
  autoRollbackEnabled: boolean;
  /** Whether to auto-degrade on circuit open */
  autoDegradeOnCircuitOpen: boolean;
  /** Whether to auto-restore on circuit close */
  autoRestoreOnCircuitClose: boolean;
}

const DEFAULT_SERVICE_CONFIG: OperationsServiceConfig = {
  ...DEFAULT_PLUGIN_OPERATIONS_CONFIG,
  autoRollbackEnabled: true,
  autoDegradeOnCircuitOpen: true,
  autoRestoreOnCircuitClose: true,
};

// ============================================================================
// PLUGIN OPERATIONS SERVICE
// ============================================================================

export class PluginOperationsService {
  private config: OperationsServiceConfig;
  private healthChecker: PluginHealthChecker;
  private versionChecker: VersionCompatibilityChecker;
  private rollbackManager: RollbackManager;
  private circuitBreaker: CircuitBreakerManager;
  private degradationManager: GracefulDegradationManager;
  private initialized = false;

  constructor(config?: Partial<OperationsServiceConfig>) {
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };

    this.healthChecker = new PluginHealthChecker(this.config.healthCheck);
    this.versionChecker = new VersionCompatibilityChecker(
      this.config.versionCompatibility,
    );
    this.rollbackManager = new RollbackManager(this.config.rollback);
    this.circuitBreaker = new CircuitBreakerManager(this.config.circuitBreaker);
    this.degradationManager = new GracefulDegradationManager(
      this.config.gracefulDegradation,
    );
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the service and wire up cross-cutting concerns.
   */
  initialize(): void {
    if (this.initialized) return;

    // Wire circuit breaker -> degradation
    if (this.config.autoDegradeOnCircuitOpen) {
      this.circuitBreaker.addEventListener((event) => {
        if (event.type === "state_changed") {
          const details = event.details as
            | { fromState?: string; reason?: string }
            | undefined;
          if (event.state === "open") {
            this.degradationManager.degradePlugin(
              event.pluginId,
              "fallback",
              details?.reason || "Circuit breaker opened",
            );
          } else if (
            event.state === "closed" &&
            this.config.autoRestoreOnCircuitClose
          ) {
            this.degradationManager.restorePlugin(event.pluginId);
          }
        }
      });
    }

    // Wire health checker -> circuit breaker
    this.healthChecker.addEventListener((event) => {
      if (event.type === "state_changed") {
        if (event.newState === "unhealthy") {
          this.circuitBreaker.forceOpen(
            event.pluginId,
            "Health check reports unhealthy",
          );
        }
      }
    });

    this.initialized = true;
  }

  /**
   * Check if service is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ==========================================================================
  // PLUGIN REGISTRATION
  // ==========================================================================

  /**
   * Register a plugin with all operational systems.
   */
  registerPlugin(
    pluginId: string,
    options: {
      healthCheck?: HealthCheckFn;
      version?: string;
      rollbackHandler?: RollbackHandler;
      circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
      features?: string[];
      fallbacks?: FallbackConfig[];
    } = {},
  ): void {
    // Register with health checker
    if (options.healthCheck) {
      this.healthChecker.registerPlugin(pluginId, options.healthCheck);
    }

    // Check version compatibility
    if (options.version) {
      this.versionChecker.checkCompatibility(pluginId, options.version);
    }

    // Register with circuit breaker
    this.circuitBreaker.registerPlugin(pluginId, options.circuitBreakerConfig);

    // Register with degradation manager
    this.degradationManager.registerPlugin(pluginId);

    // Register features
    if (options.features) {
      for (const feature of options.features) {
        this.degradationManager.registerFeature(pluginId, feature);
      }
    }

    // Register fallbacks
    if (options.fallbacks) {
      for (const fallback of options.fallbacks) {
        this.degradationManager.registerFallback(fallback);
      }
    }

    // Register rollback handler
    if (options.rollbackHandler) {
      this.rollbackManager.registerHandler(pluginId, options.rollbackHandler);
    }
  }

  /**
   * Unregister a plugin from all operational systems.
   */
  unregisterPlugin(pluginId: string): void {
    this.healthChecker.unregisterPlugin(pluginId);
    this.circuitBreaker.unregisterPlugin(pluginId);
    this.degradationManager.unregisterPlugin(pluginId);
    this.rollbackManager.clearPlugin(pluginId);
  }

  // ==========================================================================
  // EXECUTION WITH PROTECTION
  // ==========================================================================

  /**
   * Execute a plugin operation with full operational protection:
   * circuit breaker, health check, fallback, and error tracking.
   */
  async executeProtected<T>(
    pluginId: string,
    featureId: string,
    fn: () => Promise<T>,
    fallbackValue?: T,
  ): Promise<T> {
    // Check circuit breaker
    if (!this.circuitBreaker.allowRequest(pluginId)) {
      // Try fallback
      if (this.degradationManager.hasFallback(pluginId, featureId)) {
        return this.degradationManager.executeFallback<T>(
          pluginId,
          featureId,
          new Error("Circuit breaker is open"),
        );
      }
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw new Error(
        `Circuit breaker is open for plugin "${pluginId}" and no fallback available`,
      );
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      this.circuitBreaker.recordSuccess(pluginId, Date.now() - startTime);
      return result;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.circuitBreaker.recordFailure(pluginId, errorMessage, responseTimeMs);

      // Try fallback
      if (this.degradationManager.hasFallback(pluginId, featureId)) {
        try {
          return await this.degradationManager.executeFallback<T>(
            pluginId,
            featureId,
            error instanceof Error ? error : new Error(String(error)),
          );
        } catch {
          // Fallback also failed
        }
      }

      if (fallbackValue !== undefined) {
        return fallbackValue;
      }

      throw error;
    }
  }

  // ==========================================================================
  // HEALTH CHECKS
  // ==========================================================================

  /**
   * Run health check for a specific plugin.
   */
  async checkHealth(pluginId: string): Promise<PluginHealthCheckResult> {
    return this.healthChecker.checkPlugin(pluginId);
  }

  /**
   * Run health checks for all plugins.
   */
  async checkAllHealth(): Promise<Map<string, PluginHealthCheckResult>> {
    return this.healthChecker.checkAll();
  }

  /**
   * Start health monitoring for all plugins.
   */
  startHealthMonitoring(): void {
    this.healthChecker.startAllMonitoring();
  }

  /**
   * Stop health monitoring.
   */
  stopHealthMonitoring(): void {
    this.healthChecker.stopAllMonitoring();
  }

  // ==========================================================================
  // VERSION COMPATIBILITY
  // ==========================================================================

  /**
   * Check version compatibility for a plugin.
   */
  checkVersionCompatibility(
    pluginId: string,
    version: string,
  ): VersionCompatibilityResult {
    return this.versionChecker.checkCompatibility(pluginId, version);
  }

  /**
   * Check if an upgrade is safe.
   */
  isUpgradeSafe(
    pluginId: string,
    fromVersion: string,
    toVersion: string,
  ): {
    safe: boolean;
    issues: Array<{ severity: string; message: string; field: string }>;
  } {
    return this.versionChecker.isUpgradeSafe(pluginId, fromVersion, toVersion);
  }

  // ==========================================================================
  // CIRCUIT BREAKER
  // ==========================================================================

  /**
   * Get circuit breaker status.
   */
  getCircuitBreakerStatus(pluginId: string): CircuitBreakerStatus | null {
    return this.circuitBreaker.getStatus(pluginId);
  }

  /**
   * Force open a circuit.
   */
  forceOpenCircuit(pluginId: string, reason: string): void {
    this.circuitBreaker.forceOpen(pluginId, reason);
  }

  /**
   * Force close a circuit.
   */
  forceCloseCircuit(pluginId: string, reason: string): void {
    this.circuitBreaker.forceClose(pluginId, reason);
  }

  /**
   * Reset a circuit breaker.
   */
  resetCircuitBreaker(pluginId: string): void {
    this.circuitBreaker.reset(pluginId);
  }

  // ==========================================================================
  // DEGRADATION
  // ==========================================================================

  /**
   * Get degradation status.
   */
  getDegradationStatus(pluginId: string): DegradationStatus | null {
    return this.degradationManager.getStatus(pluginId);
  }

  /**
   * Manually degrade a plugin.
   */
  degradePlugin(
    pluginId: string,
    level: "partial" | "fallback" | "disabled",
    reason: string,
  ): void {
    this.degradationManager.degradePlugin(pluginId, level, reason);
  }

  /**
   * Restore a plugin from degradation.
   */
  restorePlugin(pluginId: string): void {
    this.degradationManager.restorePlugin(pluginId);
  }

  /**
   * Get all degraded plugins.
   */
  getDegradedPlugins(): DegradationStatus[] {
    return this.degradationManager.getDegradedPlugins();
  }

  // ==========================================================================
  // ROLLBACK
  // ==========================================================================

  /**
   * Create a snapshot before an update.
   */
  createSnapshot(
    pluginId: string,
    version: string,
    config: Record<string, unknown>,
    stateData: Record<string, unknown>,
    reason: string,
  ): PluginSnapshot {
    return this.rollbackManager.createSnapshot(
      pluginId,
      version,
      config,
      stateData,
      reason,
    );
  }

  /**
   * Rollback a plugin to a snapshot.
   */
  async rollback(
    pluginId: string,
    snapshotId: string,
    initiatedBy: string,
  ): Promise<RollbackRecord> {
    return this.rollbackManager.rollback(pluginId, snapshotId, initiatedBy);
  }

  /**
   * Rollback to the latest snapshot.
   */
  async rollbackToLatest(
    pluginId: string,
    initiatedBy: string,
  ): Promise<RollbackRecord> {
    return this.rollbackManager.rollbackToLatest(pluginId, initiatedBy);
  }

  /**
   * Get snapshots for a plugin.
   */
  getSnapshots(pluginId: string): PluginSnapshot[] {
    return this.rollbackManager.getSnapshots(pluginId);
  }

  // ==========================================================================
  // OPERATIONAL STATUS
  // ==========================================================================

  /**
   * Get the full operational status for a plugin.
   */
  getOperationalStatus(pluginId: string): PluginOperationalStatus {
    const health = this.healthChecker.getStatus(pluginId) || {
      pluginId,
      state: "unknown" as const,
      message: "No health data",
      checkedAt: new Date().toISOString(),
      responseTimeMs: 0,
      uptimePercent: 0,
      totalChecks: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastHealthyAt: null,
      lastError: null,
      details: {},
    };

    const circuitBreakerStatus = this.circuitBreaker.getStatus(pluginId) || {
      pluginId,
      state: "closed" as const,
      failureCount: 0,
      successCount: 0,
      totalRequests: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastOpenedAt: null,
      nextRetryAt: null,
      history: [],
    };

    const degradation = this.degradationManager.getStatus(pluginId) || {
      pluginId,
      level: "none" as const,
      degradedFeatures: [],
      fallbackFeatures: [],
      disabledFeatures: [],
      degradedSince: null,
      reason: null,
    };

    const operational =
      health.state !== "unhealthy" &&
      circuitBreakerStatus.state !== "open" &&
      degradation.level !== "disabled";

    let summary: string;
    if (operational) {
      if (health.state === "degraded" || degradation.level !== "none") {
        summary = "Plugin is operational but degraded";
      } else {
        summary = "Plugin is fully operational";
      }
    } else {
      const reasons: string[] = [];
      if (health.state === "unhealthy") reasons.push("unhealthy");
      if (circuitBreakerStatus.state === "open") reasons.push("circuit open");
      if (degradation.level === "disabled") reasons.push("disabled");
      summary = `Plugin is not operational: ${reasons.join(", ")}`;
    }

    return {
      pluginId,
      health,
      circuitBreaker: circuitBreakerStatus,
      degradation,
      versionCompatibility: null,
      operational,
      summary,
    };
  }

  /**
   * Get operational status for all registered plugins.
   */
  getAllOperationalStatuses(): Map<string, PluginOperationalStatus> {
    const statuses = new Map<string, PluginOperationalStatus>();
    const pluginIds = new Set<string>();

    // Gather all plugin IDs from all subsystems
    for (const id of this.healthChecker.getRegisteredPlugins()) {
      pluginIds.add(id);
    }

    for (const status of this.circuitBreaker.getAllStatuses().keys()) {
      pluginIds.add(status);
    }

    for (const id of pluginIds) {
      statuses.set(id, this.getOperationalStatus(id));
    }

    return statuses;
  }

  // ==========================================================================
  // SUBSYSTEM ACCESS
  // ==========================================================================

  /**
   * Get the health checker instance.
   */
  getHealthChecker(): PluginHealthChecker {
    return this.healthChecker;
  }

  /**
   * Get the version compatibility checker.
   */
  getVersionChecker(): VersionCompatibilityChecker {
    return this.versionChecker;
  }

  /**
   * Get the rollback manager.
   */
  getRollbackManager(): RollbackManager {
    return this.rollbackManager;
  }

  /**
   * Get the circuit breaker manager.
   */
  getCircuitBreakerManager(): CircuitBreakerManager {
    return this.circuitBreaker;
  }

  /**
   * Get the degradation manager.
   */
  getDegradationManager(): GracefulDegradationManager {
    return this.degradationManager;
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Destroy the service and clean up all resources.
   */
  destroy(): void {
    this.healthChecker.clear();
    this.circuitBreaker.clear();
    this.degradationManager.clear();
    this.rollbackManager.clear();
    this.initialized = false;
  }
}

/**
 * Create a new PluginOperationsService instance.
 */
export function createPluginOperationsService(
  config?: Partial<OperationsServiceConfig>,
): PluginOperationsService {
  return new PluginOperationsService(config);
}
