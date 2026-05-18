/**
 * Plugin Circuit Breaker
 *
 * Implements the circuit breaker pattern for plugin operations.
 * When a plugin repeatedly fails, the circuit opens to prevent
 * cascading failures. After a cooling-off period, it transitions
 * to half-open to test recovery before fully closing again.
 *
 * States:
 * - Closed: Normal operation, requests pass through
 * - Open: All requests are rejected immediately
 * - Half-Open: Limited requests pass through to test recovery
 */

import type {
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerEvent,
  CircuitBreakerStatus,
} from "./types";
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from "./types";

// ============================================================================
// ERRORS
// ============================================================================

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly pluginId: string,
    public readonly state: CircuitBreakerState,
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface FailureRecord {
  timestamp: number;
  error: string;
  responseTimeMs: number;
}

interface CircuitBreakerInstance {
  pluginId: string;
  config: CircuitBreakerConfig;
  state: CircuitBreakerState;
  failureRecords: FailureRecord[];
  successCount: number;
  totalRequests: number;
  halfOpenRequests: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  lastOpenedAt: string | null;
  lastStateChangeAt: string;
  nextRetryAt: string | null;
  history: CircuitBreakerEvent[];
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export type CircuitBreakerEventType =
  | "state_changed"
  | "request_allowed"
  | "request_rejected"
  | "request_succeeded"
  | "request_failed";

export interface CircuitBreakerNotification {
  type: CircuitBreakerEventType;
  pluginId: string;
  timestamp: string;
  state: CircuitBreakerState;
  details?: Record<string, unknown>;
}

export type CircuitBreakerEventListener = (
  event: CircuitBreakerNotification,
) => void;

// ============================================================================
// CIRCUIT BREAKER MANAGER
// ============================================================================

export class CircuitBreakerManager {
  private instances: Map<string, CircuitBreakerInstance> = new Map();
  private defaultConfig: CircuitBreakerConfig;
  private listeners: CircuitBreakerEventListener[] = [];

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.defaultConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register a plugin with the circuit breaker.
   */
  registerPlugin(
    pluginId: string,
    config?: Partial<CircuitBreakerConfig>,
  ): void {
    if (this.instances.has(pluginId)) return;

    const instanceConfig = { ...this.defaultConfig, ...config };

    this.instances.set(pluginId, {
      pluginId,
      config: instanceConfig,
      state: "closed",
      failureRecords: [],
      successCount: 0,
      totalRequests: 0,
      halfOpenRequests: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastOpenedAt: null,
      lastStateChangeAt: new Date().toISOString(),
      nextRetryAt: null,
      history: [],
    });
  }

  /**
   * Unregister a plugin.
   */
  unregisterPlugin(pluginId: string): boolean {
    return this.instances.delete(pluginId);
  }

  /**
   * Check if a plugin is registered.
   */
  isRegistered(pluginId: string): boolean {
    return this.instances.has(pluginId);
  }

  // ==========================================================================
  // REQUEST GATING
  // ==========================================================================

  /**
   * Check if a request should be allowed through the circuit breaker.
   * Throws CircuitBreakerError if the circuit is open.
   */
  allowRequest(pluginId: string): boolean {
    const instance = this.instances.get(pluginId);
    if (!instance) return true; // Unregistered plugins pass through

    // Check for state transitions
    this.checkStateTransitions(instance);

    switch (instance.state) {
      case "closed":
        instance.totalRequests++;
        this.notify({
          type: "request_allowed",
          pluginId,
          timestamp: new Date().toISOString(),
          state: "closed",
        });
        return true;

      case "open":
        this.notify({
          type: "request_rejected",
          pluginId,
          timestamp: new Date().toISOString(),
          state: "open",
        });
        return false;

      case "half_open":
        if (instance.halfOpenRequests < instance.config.halfOpenMaxRequests) {
          instance.halfOpenRequests++;
          instance.totalRequests++;
          this.notify({
            type: "request_allowed",
            pluginId,
            timestamp: new Date().toISOString(),
            state: "half_open",
          });
          return true;
        }
        this.notify({
          type: "request_rejected",
          pluginId,
          timestamp: new Date().toISOString(),
          state: "half_open",
          details: { reason: "half_open_limit_reached" },
        });
        return false;

      default:
        return true;
    }
  }

  /**
   * Execute a function through the circuit breaker.
   * Returns the result if allowed, throws if circuit is open.
   */
  async execute<T>(pluginId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.allowRequest(pluginId)) {
      const instance = this.instances.get(pluginId)!;
      throw new CircuitBreakerError(
        `Circuit breaker is open for plugin "${pluginId}"`,
        "CIRCUIT_OPEN",
        pluginId,
        instance.state,
      );
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      this.recordSuccess(pluginId, Date.now() - startTime);
      return result;
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.recordFailure(pluginId, errorMessage, responseTimeMs);
      throw error;
    }
  }

  // ==========================================================================
  // SUCCESS/FAILURE RECORDING
  // ==========================================================================

  /**
   * Record a successful request.
   */
  recordSuccess(pluginId: string, responseTimeMs: number = 0): void {
    const instance = this.instances.get(pluginId);
    if (!instance) return;

    instance.successCount++;
    instance.lastSuccessAt = new Date().toISOString();

    this.notify({
      type: "request_succeeded",
      pluginId,
      timestamp: new Date().toISOString(),
      state: instance.state,
      details: { responseTimeMs },
    });

    // State transitions on success
    if (instance.state === "half_open") {
      if (instance.successCount >= instance.config.successThreshold) {
        this.transitionState(
          instance,
          "closed",
          "Sufficient successes in half-open state",
        );
      }
    }

    // Check for slow calls
    if (
      instance.config.monitorResponseTime &&
      responseTimeMs > instance.config.slowCallThresholdMs
    ) {
      // Slow call counts as partial failure for rate calculation
      this.checkSlowCallRate(instance);
    }
  }

  /**
   * Record a failed request.
   */
  recordFailure(
    pluginId: string,
    error: string,
    responseTimeMs: number = 0,
  ): void {
    const instance = this.instances.get(pluginId);
    if (!instance) return;

    instance.lastFailureAt = new Date().toISOString();

    instance.failureRecords.push({
      timestamp: Date.now(),
      error,
      responseTimeMs,
    });

    // Prune old failures outside the window
    this.pruneFailureRecords(instance);

    this.notify({
      type: "request_failed",
      pluginId,
      timestamp: new Date().toISOString(),
      state: instance.state,
      details: { error, responseTimeMs },
    });

    // State transitions on failure
    if (instance.state === "half_open") {
      // Any failure in half-open returns to open
      this.transitionState(
        instance,
        "open",
        `Failure during half-open: ${error}`,
      );
    } else if (instance.state === "closed") {
      // Check if we've exceeded the failure threshold
      if (instance.failureRecords.length >= instance.config.failureThreshold) {
        this.transitionState(
          instance,
          "open",
          `Failure threshold reached (${instance.failureRecords.length}/${instance.config.failureThreshold})`,
        );
      }
    }
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  /**
   * Get the current state of a circuit breaker.
   */
  getState(pluginId: string): CircuitBreakerState | null {
    const instance = this.instances.get(pluginId);
    if (!instance) return null;
    this.checkStateTransitions(instance);
    return instance.state;
  }

  /**
   * Get the full status of a circuit breaker.
   */
  getStatus(pluginId: string): CircuitBreakerStatus | null {
    const instance = this.instances.get(pluginId);
    if (!instance) return null;

    this.checkStateTransitions(instance);
    this.pruneFailureRecords(instance);

    return {
      pluginId,
      state: instance.state,
      failureCount: instance.failureRecords.length,
      successCount: instance.successCount,
      totalRequests: instance.totalRequests,
      lastFailureAt: instance.lastFailureAt,
      lastSuccessAt: instance.lastSuccessAt,
      lastOpenedAt: instance.lastOpenedAt,
      nextRetryAt: instance.nextRetryAt,
      history: [...instance.history],
    };
  }

  /**
   * Check if the circuit is open for a plugin.
   */
  isOpen(pluginId: string): boolean {
    const instance = this.instances.get(pluginId);
    if (!instance) return false;
    this.checkStateTransitions(instance);
    return instance.state === "open";
  }

  /**
   * Check if the circuit is closed for a plugin.
   */
  isClosed(pluginId: string): boolean {
    const instance = this.instances.get(pluginId);
    if (!instance) return true;
    this.checkStateTransitions(instance);
    return instance.state === "closed";
  }

  /**
   * Get all plugins with open circuits.
   */
  getOpenCircuits(): string[] {
    const open: string[] = [];
    for (const [pluginId, instance] of this.instances) {
      this.checkStateTransitions(instance);
      if (instance.state === "open") {
        open.push(pluginId);
      }
    }
    return open;
  }

  /**
   * Get statuses of all registered circuit breakers.
   */
  getAllStatuses(): Map<string, CircuitBreakerStatus> {
    const statuses = new Map<string, CircuitBreakerStatus>();
    for (const pluginId of this.instances.keys()) {
      const status = this.getStatus(pluginId);
      if (status) {
        statuses.set(pluginId, status);
      }
    }
    return statuses;
  }

  // ==========================================================================
  // MANUAL CONTROL
  // ==========================================================================

  /**
   * Manually open the circuit for a plugin.
   */
  forceOpen(pluginId: string, reason: string): void {
    const instance = this.instances.get(pluginId);
    if (!instance) return;
    this.transitionState(instance, "open", `Manually opened: ${reason}`);
  }

  /**
   * Manually close the circuit for a plugin.
   */
  forceClose(pluginId: string, reason: string): void {
    const instance = this.instances.get(pluginId);
    if (!instance) return;
    this.transitionState(instance, "closed", `Manually closed: ${reason}`);
  }

  /**
   * Manually transition to half-open.
   */
  forceHalfOpen(pluginId: string, reason: string): void {
    const instance = this.instances.get(pluginId);
    if (!instance) return;
    this.transitionState(
      instance,
      "half_open",
      `Manually set to half-open: ${reason}`,
    );
  }

  /**
   * Reset a circuit breaker to its initial state.
   */
  reset(pluginId: string): void {
    const instance = this.instances.get(pluginId);
    if (!instance) return;

    instance.state = "closed";
    instance.failureRecords = [];
    instance.successCount = 0;
    instance.totalRequests = 0;
    instance.halfOpenRequests = 0;
    instance.lastFailureAt = null;
    instance.lastSuccessAt = null;
    instance.lastOpenedAt = null;
    instance.nextRetryAt = null;
    instance.lastStateChangeAt = new Date().toISOString();
    instance.history = [];
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  /**
   * Add an event listener.
   */
  addEventListener(listener: CircuitBreakerEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener.
   */
  removeEventListener(listener: CircuitBreakerEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all circuit breakers.
   */
  clear(): void {
    this.instances.clear();
    this.listeners = [];
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private transitionState(
    instance: CircuitBreakerInstance,
    newState: CircuitBreakerState,
    reason: string,
  ): void {
    const fromState = instance.state;
    if (fromState === newState) return;

    instance.state = newState;
    instance.lastStateChangeAt = new Date().toISOString();

    const event: CircuitBreakerEvent = {
      pluginId: instance.pluginId,
      fromState,
      toState: newState,
      timestamp: new Date().toISOString(),
      reason,
      failureCount: instance.failureRecords.length,
      successCount: instance.successCount,
    };

    instance.history.push(event);

    // Keep only last 50 history entries
    if (instance.history.length > 50) {
      instance.history = instance.history.slice(-50);
    }

    if (newState === "open") {
      instance.lastOpenedAt = new Date().toISOString();
      instance.nextRetryAt = new Date(
        Date.now() + instance.config.resetTimeoutMs,
      ).toISOString();
      instance.successCount = 0;
    } else if (newState === "half_open") {
      instance.halfOpenRequests = 0;
      instance.successCount = 0;
      instance.nextRetryAt = null;
    } else if (newState === "closed") {
      instance.failureRecords = [];
      instance.successCount = 0;
      instance.halfOpenRequests = 0;
      instance.nextRetryAt = null;
    }

    this.notify({
      type: "state_changed",
      pluginId: instance.pluginId,
      timestamp: new Date().toISOString(),
      state: newState,
      details: { fromState, reason },
    });
  }

  private checkStateTransitions(instance: CircuitBreakerInstance): void {
    if (instance.state === "open" && instance.nextRetryAt) {
      const nextRetryTime = new Date(instance.nextRetryAt).getTime();
      if (Date.now() >= nextRetryTime) {
        this.transitionState(instance, "half_open", "Reset timeout elapsed");
      }
    }
  }

  private pruneFailureRecords(instance: CircuitBreakerInstance): void {
    const cutoff = Date.now() - instance.config.failureWindowMs;
    instance.failureRecords = instance.failureRecords.filter(
      (r) => r.timestamp > cutoff,
    );
  }

  private checkSlowCallRate(instance: CircuitBreakerInstance): void {
    if (!instance.config.monitorResponseTime) return;

    const recentRecords = instance.failureRecords.filter(
      (r) => r.timestamp > Date.now() - instance.config.failureWindowMs,
    );

    const slowCalls = recentRecords.filter(
      (r) => r.responseTimeMs > instance.config.slowCallThresholdMs,
    );

    if (recentRecords.length > 0) {
      const slowRate = slowCalls.length / recentRecords.length;
      if (slowRate >= instance.config.slowCallRateThreshold) {
        this.transitionState(
          instance,
          "open",
          `Slow call rate ${(slowRate * 100).toFixed(1)}% exceeds threshold ${(instance.config.slowCallRateThreshold * 100).toFixed(1)}%`,
        );
      }
    }
  }

  private notify(event: CircuitBreakerNotification): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Silently handle listener errors
      }
    }
  }
}
