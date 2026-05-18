/**
 * Plugin Operations - Operational Hardening
 *
 * Barrel export for the plugin operations system including:
 * - Health checking and monitoring
 * - Version compatibility validation
 * - Rollback management with snapshots
 * - Circuit breaker pattern
 * - Graceful degradation with fallbacks
 */

// Types
export type {
  PluginHealthState,
  PluginHealthCheckResult,
  HealthCheckConfig,
  HealthCheckFn,
  SemVer,
  VersionCompatibilityRule,
  VersionCompatibilityResult,
  VersionIssue,
  VersionCompatibilityConfig,
  RollbackStatus,
  PluginSnapshot,
  RollbackRecord,
  RollbackConfig,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerEvent,
  CircuitBreakerStatus,
  DegradationLevel,
  FallbackConfig,
  FallbackHandler,
  FallbackContext,
  DegradationStatus,
  GracefulDegradationConfig,
  PluginOperationsConfig,
  PluginOperationalStatus,
} from "./types";

export {
  DEFAULT_HEALTH_CHECK_CONFIG,
  DEFAULT_VERSION_COMPATIBILITY_CONFIG,
  DEFAULT_ROLLBACK_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_GRACEFUL_DEGRADATION_CONFIG,
  DEFAULT_PLUGIN_OPERATIONS_CONFIG,
} from "./types";

// Health Checker
export { PluginHealthChecker, HealthCheckError } from "./health-checker";
export type {
  HealthCheckEventType,
  HealthCheckEvent,
  HealthCheckEventListener,
} from "./health-checker";

// Version Compatibility
export {
  VersionCompatibilityChecker,
  VersionCompatibilityError,
  parseSemVer,
  compareSemVer,
  compareVersionStrings,
  isVersionInRange,
  isSameMajor,
  isCompatible,
} from "./version-compatibility";

// Rollback Manager
export {
  RollbackManager,
  RollbackError,
  resetRollbackIdCounter,
} from "./rollback-manager";
export type {
  RollbackHandler,
  RollbackEventType,
  RollbackEvent,
  RollbackEventListener,
} from "./rollback-manager";

// Circuit Breaker
export { CircuitBreakerManager, CircuitBreakerError } from "./circuit-breaker";
export type {
  CircuitBreakerEventType,
  CircuitBreakerNotification,
  CircuitBreakerEventListener,
} from "./circuit-breaker";

// Graceful Degradation
export {
  GracefulDegradationManager,
  DegradationError,
} from "./graceful-degradation";
export type {
  DegradationEventType,
  DegradationEvent,
  DegradationEventListener,
} from "./graceful-degradation";
