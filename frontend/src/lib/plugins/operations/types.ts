/**
 * Plugin Operations Types
 *
 * Type definitions for the plugin operational hardening system.
 * Covers health checks, version compatibility, rollback, circuit breaker,
 * and graceful degradation patterns.
 */

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

/**
 * Health status for a plugin.
 */
export type PluginHealthState =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";

/**
 * Detailed health check result for a plugin.
 */
export interface PluginHealthCheckResult {
  /** Plugin ID */
  pluginId: string;
  /** Overall health state */
  state: PluginHealthState;
  /** Human-readable message */
  message: string;
  /** When the check was performed */
  checkedAt: string;
  /** Response time in milliseconds */
  responseTimeMs: number;
  /** Uptime percentage (0-100) */
  uptimePercent: number;
  /** Total number of checks performed */
  totalChecks: number;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Number of consecutive successes */
  consecutiveSuccesses: number;
  /** Last time the plugin was healthy */
  lastHealthyAt: string | null;
  /** Last error message */
  lastError: string | null;
  /** Additional details */
  details: Record<string, unknown>;
}

/**
 * Configuration for health check behavior.
 */
export interface HealthCheckConfig {
  /** Interval between health checks in ms */
  intervalMs: number;
  /** Timeout for individual health check in ms */
  timeoutMs: number;
  /** Number of consecutive failures to mark unhealthy */
  unhealthyThreshold: number;
  /** Number of consecutive successes to mark healthy after degraded */
  healthyThreshold: number;
  /** Whether to enable health checking */
  enabled: boolean;
  /** Number of degraded checks before marking unhealthy */
  degradedThreshold: number;
}

/**
 * Default health check configuration.
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  intervalMs: 30000,
  timeoutMs: 5000,
  unhealthyThreshold: 3,
  healthyThreshold: 2,
  enabled: true,
  degradedThreshold: 2,
};

/**
 * Health check function type.
 */
export type HealthCheckFn = () => Promise<{
  healthy: boolean;
  message?: string;
  details?: Record<string, unknown>;
}>;

// ============================================================================
// VERSION COMPATIBILITY TYPES
// ============================================================================

/**
 * Semantic version components.
 */
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

/**
 * Version compatibility rule.
 */
export interface VersionCompatibilityRule {
  /** Plugin ID this rule applies to */
  pluginId: string;
  /** Minimum compatible version (inclusive) */
  minVersion: string;
  /** Maximum compatible version (inclusive) */
  maxVersion: string;
  /** Whether to allow prerelease versions */
  allowPrerelease: boolean;
  /** Description of the compatibility constraint */
  description: string;
}

/**
 * Result of a version compatibility check.
 */
export interface VersionCompatibilityResult {
  /** Whether the version is compatible */
  compatible: boolean;
  /** Plugin ID */
  pluginId: string;
  /** Plugin version checked */
  pluginVersion: string;
  /** Platform version */
  platformVersion: string;
  /** Specific compatibility issues */
  issues: VersionIssue[];
  /** Deprecation warnings */
  deprecations: string[];
  /** Suggested upgrade path */
  suggestedVersion: string | null;
}

/**
 * A specific version compatibility issue.
 */
export interface VersionIssue {
  /** Severity of the issue */
  severity: "error" | "warning" | "info";
  /** Description of the issue */
  message: string;
  /** Field or constraint that failed */
  field: string;
}

/**
 * Configuration for version compatibility checking.
 */
export interface VersionCompatibilityConfig {
  /** Current platform version */
  platformVersion: string;
  /** Whether to enforce strict semver */
  strictSemver: boolean;
  /** Whether to allow prerelease plugins */
  allowPrerelease: boolean;
  /** Custom compatibility rules */
  rules: VersionCompatibilityRule[];
}

/**
 * Default version compatibility configuration.
 */
export const DEFAULT_VERSION_COMPATIBILITY_CONFIG: VersionCompatibilityConfig =
  {
    platformVersion: "0.9.1",
    strictSemver: true,
    allowPrerelease: false,
    rules: [],
  };

// ============================================================================
// ROLLBACK TYPES
// ============================================================================

/**
 * Status of a rollback operation.
 */
export type RollbackStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * A snapshot of a plugin's state before an update.
 */
export interface PluginSnapshot {
  /** Snapshot ID */
  id: string;
  /** Plugin ID */
  pluginId: string;
  /** Plugin version at snapshot time */
  version: string;
  /** Plugin configuration at snapshot time */
  config: Record<string, unknown>;
  /** Plugin state data */
  stateData: Record<string, unknown>;
  /** When the snapshot was taken */
  createdAt: string;
  /** Description of why snapshot was taken */
  reason: string;
  /** Whether this snapshot has been verified */
  verified: boolean;
  /** Checksum for integrity verification */
  checksum: string;
}

/**
 * Record of a rollback operation.
 */
export interface RollbackRecord {
  /** Rollback ID */
  id: string;
  /** Plugin ID */
  pluginId: string;
  /** Source version (being rolled back from) */
  fromVersion: string;
  /** Target version (being rolled back to) */
  toVersion: string;
  /** Snapshot used for rollback */
  snapshotId: string;
  /** Status of the rollback */
  status: RollbackStatus;
  /** When rollback was initiated */
  initiatedAt: string;
  /** When rollback completed or failed */
  completedAt: string | null;
  /** Who initiated the rollback */
  initiatedBy: string;
  /** Error message if failed */
  error: string | null;
  /** Duration in ms */
  durationMs: number | null;
}

/**
 * Configuration for rollback behavior.
 */
export interface RollbackConfig {
  /** Maximum number of snapshots to retain per plugin */
  maxSnapshotsPerPlugin: number;
  /** Whether to auto-rollback on failure */
  autoRollbackOnFailure: boolean;
  /** Timeout for rollback operations in ms */
  rollbackTimeoutMs: number;
  /** Whether to verify snapshots before rollback */
  verifyBeforeRollback: boolean;
}

/**
 * Default rollback configuration.
 */
export const DEFAULT_ROLLBACK_CONFIG: RollbackConfig = {
  maxSnapshotsPerPlugin: 5,
  autoRollbackOnFailure: true,
  rollbackTimeoutMs: 30000,
  verifyBeforeRollback: true,
};

// ============================================================================
// CIRCUIT BREAKER TYPES
// ============================================================================

/**
 * State of a circuit breaker.
 */
export type CircuitBreakerState = "closed" | "open" | "half_open";

/**
 * Configuration for the circuit breaker.
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open the circuit */
  failureThreshold: number;
  /** Success threshold in half-open to close the circuit */
  successThreshold: number;
  /** How long the circuit stays open before transitioning to half-open (ms) */
  resetTimeoutMs: number;
  /** Time window for counting failures (ms) */
  failureWindowMs: number;
  /** Maximum number of requests in half-open state */
  halfOpenMaxRequests: number;
  /** Whether to monitor response times */
  monitorResponseTime: boolean;
  /** Response time threshold to count as slow (ms) */
  slowCallThresholdMs: number;
  /** Percentage of slow calls to open circuit */
  slowCallRateThreshold: number;
}

/**
 * Default circuit breaker configuration.
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  resetTimeoutMs: 30000,
  failureWindowMs: 60000,
  halfOpenMaxRequests: 3,
  monitorResponseTime: true,
  slowCallThresholdMs: 5000,
  slowCallRateThreshold: 0.5,
};

/**
 * Record of circuit breaker state changes.
 */
export interface CircuitBreakerEvent {
  /** Plugin ID */
  pluginId: string;
  /** Previous state */
  fromState: CircuitBreakerState;
  /** New state */
  toState: CircuitBreakerState;
  /** When the transition happened */
  timestamp: string;
  /** Reason for the transition */
  reason: string;
  /** Current failure count */
  failureCount: number;
  /** Current success count */
  successCount: number;
}

/**
 * Status of a circuit breaker instance.
 */
export interface CircuitBreakerStatus {
  /** Plugin ID */
  pluginId: string;
  /** Current state */
  state: CircuitBreakerState;
  /** Number of failures in current window */
  failureCount: number;
  /** Number of successes in half-open state */
  successCount: number;
  /** Total requests */
  totalRequests: number;
  /** Last failure time */
  lastFailureAt: string | null;
  /** Last success time */
  lastSuccessAt: string | null;
  /** When the circuit was last opened */
  lastOpenedAt: string | null;
  /** When the circuit will next try half-open (if open) */
  nextRetryAt: string | null;
  /** State change history */
  history: CircuitBreakerEvent[];
}

// ============================================================================
// GRACEFUL DEGRADATION TYPES
// ============================================================================

/**
 * Degradation level for a plugin.
 */
export type DegradationLevel = "none" | "partial" | "fallback" | "disabled";

/**
 * Fallback configuration for a plugin feature.
 */
export interface FallbackConfig {
  /** Feature identifier */
  featureId: string;
  /** Plugin ID */
  pluginId: string;
  /** Fallback handler */
  handler: FallbackHandler;
  /** Whether this fallback is cacheable */
  cacheable: boolean;
  /** Cache TTL in ms (if cacheable) */
  cacheTtlMs: number;
  /** Priority (higher = preferred) */
  priority: number;
  /** Description */
  description: string;
}

/**
 * Fallback handler type. Returns a fallback value or throws if no fallback is possible.
 */
export type FallbackHandler<T = unknown> = (
  context: FallbackContext,
) => Promise<T> | T;

/**
 * Context provided to fallback handlers.
 */
export interface FallbackContext {
  /** Plugin ID */
  pluginId: string;
  /** Feature that failed */
  featureId: string;
  /** Original error */
  error: Error | null;
  /** Number of times fallback has been invoked */
  invocationCount: number;
  /** Last invocation time */
  lastInvokedAt: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Status of graceful degradation for a plugin.
 */
export interface DegradationStatus {
  /** Plugin ID */
  pluginId: string;
  /** Current degradation level */
  level: DegradationLevel;
  /** Features that are degraded */
  degradedFeatures: string[];
  /** Features using fallback */
  fallbackFeatures: string[];
  /** Features that are fully disabled */
  disabledFeatures: string[];
  /** When degradation started */
  degradedSince: string | null;
  /** Reason for degradation */
  reason: string | null;
}

/**
 * Configuration for graceful degradation.
 */
export interface GracefulDegradationConfig {
  /** Whether to enable graceful degradation */
  enabled: boolean;
  /** Whether to cache fallback results */
  cacheFallbacks: boolean;
  /** Default cache TTL in ms */
  defaultCacheTtlMs: number;
  /** Maximum number of fallback invocations before disabling */
  maxFallbackInvocations: number;
  /** Time window for counting fallback invocations (ms) */
  fallbackWindowMs: number;
}

/**
 * Default graceful degradation configuration.
 */
export const DEFAULT_GRACEFUL_DEGRADATION_CONFIG: GracefulDegradationConfig = {
  enabled: true,
  cacheFallbacks: true,
  defaultCacheTtlMs: 60000,
  maxFallbackInvocations: 100,
  fallbackWindowMs: 300000,
};

// ============================================================================
// OPERATIONS MANAGER TYPES
// ============================================================================

/**
 * Overall configuration for plugin operations management.
 */
export interface PluginOperationsConfig {
  healthCheck: HealthCheckConfig;
  versionCompatibility: VersionCompatibilityConfig;
  rollback: RollbackConfig;
  circuitBreaker: CircuitBreakerConfig;
  gracefulDegradation: GracefulDegradationConfig;
}

/**
 * Default plugin operations configuration.
 */
export const DEFAULT_PLUGIN_OPERATIONS_CONFIG: PluginOperationsConfig = {
  healthCheck: DEFAULT_HEALTH_CHECK_CONFIG,
  versionCompatibility: DEFAULT_VERSION_COMPATIBILITY_CONFIG,
  rollback: DEFAULT_ROLLBACK_CONFIG,
  circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  gracefulDegradation: DEFAULT_GRACEFUL_DEGRADATION_CONFIG,
};

/**
 * Overall status of a plugin's operational state.
 */
export interface PluginOperationalStatus {
  /** Plugin ID */
  pluginId: string;
  /** Health check result */
  health: PluginHealthCheckResult;
  /** Circuit breaker status */
  circuitBreaker: CircuitBreakerStatus;
  /** Degradation status */
  degradation: DegradationStatus;
  /** Version compatibility */
  versionCompatibility: VersionCompatibilityResult | null;
  /** Whether the plugin is operational */
  operational: boolean;
  /** Summary message */
  summary: string;
}
