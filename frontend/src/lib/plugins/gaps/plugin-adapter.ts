/**
 * Plugin Adapter
 *
 * Adapter pattern for wrapping existing services as plugins.
 * Provides a standardized interface for services that directly
 * access backend capabilities, enabling proper plugin abstraction.
 */

import type {
  PluginAdapterConfig,
  AdapterOperation,
  AdapterOperationResult,
  PluginHealthStatus,
  PluginDomain,
  PluginDescriptor,
} from "./types";
import { DEFAULT_ADAPTER_CONFIG } from "./types";

// ============================================================================
// ADAPTER ERRORS
// ============================================================================

export class PluginAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly adapterId: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = "PluginAdapterError";
  }
}

// ============================================================================
// ADAPTER HANDLER TYPE
// ============================================================================

/**
 * Handler function for an adapter operation.
 */
export type AdapterHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: AdapterContext,
) => Promise<TOutput>;

/**
 * Context provided to adapter handlers.
 */
export interface AdapterContext {
  /** Adapter ID */
  adapterId: string;
  /** Operation being performed */
  operation: string;
  /** Timestamp of the request */
  timestamp: string;
  /** Optional timeout in ms */
  timeoutMs: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ADAPTER METRICS
// ============================================================================

export interface AdapterMetrics {
  /** Total operations performed */
  totalOperations: number;
  /** Successful operations */
  successCount: number;
  /** Failed operations */
  failureCount: number;
  /** Average response time in ms */
  avgResponseTimeMs: number;
  /** Max response time in ms */
  maxResponseTimeMs: number;
  /** Min response time in ms */
  minResponseTimeMs: number;
  /** Operations per second (last minute) */
  opsPerSecond: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Last operation timestamp */
  lastOperationAt: string | null;
}

// ============================================================================
// PLUGIN ADAPTER
// ============================================================================

/**
 * Base plugin adapter that wraps a service as a plugin.
 * Provides operation registration, execution, health checking, and metrics.
 */
export class PluginAdapter {
  private config: PluginAdapterConfig;
  private handlers: Map<string, AdapterHandler> = new Map();
  private operations: Map<string, AdapterOperation> = new Map();
  private healthCheckFn: (() => Promise<PluginHealthStatus>) | null = null;

  // Metrics tracking
  private totalOps = 0;
  private successOps = 0;
  private failureOps = 0;
  private responseTimes: number[] = [];
  private lastOperationAt: string | null = null;
  private recentOpsTimestamps: number[] = [];

  constructor(
    config: Partial<PluginAdapterConfig> &
      Pick<
        PluginAdapterConfig,
        "id" | "name" | "domain" | "serviceId" | "capabilities"
      >,
  ) {
    this.config = {
      ...DEFAULT_ADAPTER_CONFIG,
      ...config,
      healthCheck:
        config.healthCheck ?? DEFAULT_ADAPTER_CONFIG.healthCheck ?? true,
      metrics: config.metrics ?? DEFAULT_ADAPTER_CONFIG.metrics ?? true,
      timeoutMs: config.timeoutMs ?? DEFAULT_ADAPTER_CONFIG.timeoutMs ?? 30000,
    } as PluginAdapterConfig;
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get adapter configuration.
   */
  getConfig(): PluginAdapterConfig {
    return { ...this.config };
  }

  /**
   * Get adapter ID.
   */
  getId(): string {
    return this.config.id;
  }

  /**
   * Get adapter name.
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get adapter domain.
   */
  getDomain(): PluginDomain {
    return this.config.domain;
  }

  /**
   * Get capabilities this adapter provides.
   */
  getCapabilities(): string[] {
    return [...this.config.capabilities];
  }

  // ==========================================================================
  // OPERATION REGISTRATION
  // ==========================================================================

  /**
   * Register an operation with its handler.
   */
  registerOperation<TInput = unknown, TOutput = unknown>(
    operation: AdapterOperation,
    handler: AdapterHandler<TInput, TOutput>,
  ): void {
    this.operations.set(operation.name, operation);
    this.handlers.set(operation.name, handler as AdapterHandler);
  }

  /**
   * Unregister an operation.
   */
  unregisterOperation(name: string): boolean {
    this.handlers.delete(name);
    return this.operations.delete(name);
  }

  /**
   * Check if an operation is registered.
   */
  hasOperation(name: string): boolean {
    return this.operations.has(name);
  }

  /**
   * Get all registered operations.
   */
  getOperations(): AdapterOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get a specific operation definition.
   */
  getOperation(name: string): AdapterOperation | undefined {
    return this.operations.get(name);
  }

  // ==========================================================================
  // OPERATION EXECUTION
  // ==========================================================================

  /**
   * Execute an operation through the adapter.
   */
  async execute<TInput = unknown, TOutput = unknown>(
    operationName: string,
    input: TInput,
    metadata?: Record<string, unknown>,
  ): Promise<AdapterOperationResult<TOutput>> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    const handler = this.handlers.get(operationName);
    if (!handler) {
      this.trackOperation(false, Date.now() - startTime);
      return {
        success: false,
        error: `Operation "${operationName}" not found on adapter "${this.config.id}"`,
        errorCode: "OPERATION_NOT_FOUND",
        durationMs: Date.now() - startTime,
        adapterId: this.config.id,
        operation: operationName,
        timestamp,
      };
    }

    const context: AdapterContext = {
      adapterId: this.config.id,
      operation: operationName,
      timestamp,
      timeoutMs: this.config.timeoutMs,
      metadata,
    };

    try {
      const result = (await this.executeWithTimeout(
        () => handler(input, context),
        this.config.timeoutMs,
      )) as TOutput;

      const durationMs = Date.now() - startTime;
      this.trackOperation(true, durationMs);

      return {
        success: true,
        data: result,
        durationMs,
        adapterId: this.config.id,
        operation: operationName,
        timestamp,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.trackOperation(false, durationMs);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof PluginAdapterError ? error.code : "OPERATION_FAILED";

      return {
        success: false,
        error: errorMessage,
        errorCode,
        durationMs,
        adapterId: this.config.id,
        operation: operationName,
        timestamp,
      };
    }
  }

  /**
   * Execute with timeout support.
   */
  private executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new PluginAdapterError(
            `Operation timed out after ${timeoutMs}ms`,
            "OPERATION_TIMEOUT",
            this.config.id,
            408,
          ),
        );
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // ==========================================================================
  // HEALTH CHECKING
  // ==========================================================================

  /**
   * Set a custom health check function.
   */
  setHealthCheck(fn: () => Promise<PluginHealthStatus>): void {
    this.healthCheckFn = fn;
  }

  /**
   * Check the health of the adapter.
   */
  async checkHealth(): Promise<PluginHealthStatus> {
    const startTime = Date.now();

    if (this.healthCheckFn) {
      try {
        const status = await this.healthCheckFn();
        status.responseTimeMs = Date.now() - startTime;
        return status;
      } catch (error) {
        return {
          id: this.config.id,
          healthy: false,
          message:
            error instanceof Error ? error.message : "Health check failed",
          lastChecked: new Date().toISOString(),
          responseTimeMs: Date.now() - startTime,
        };
      }
    }

    // Default health check: adapter is healthy if it has operations registered
    return {
      id: this.config.id,
      healthy: this.operations.size > 0,
      message:
        this.operations.size > 0
          ? `Adapter healthy with ${this.operations.size} operations`
          : "No operations registered",
      lastChecked: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
    };
  }

  // ==========================================================================
  // METRICS
  // ==========================================================================

  /**
   * Get adapter metrics.
   */
  getMetrics(): AdapterMetrics {
    const now = Date.now();
    // Keep only ops from last 60 seconds for ops/sec calculation
    this.recentOpsTimestamps = this.recentOpsTimestamps.filter(
      (ts) => now - ts < 60000,
    );

    return {
      totalOperations: this.totalOps,
      successCount: this.successOps,
      failureCount: this.failureOps,
      avgResponseTimeMs:
        this.responseTimes.length > 0
          ? Math.round(
              this.responseTimes.reduce((a, b) => a + b, 0) /
                this.responseTimes.length,
            )
          : 0,
      maxResponseTimeMs:
        this.responseTimes.length > 0 ? Math.max(...this.responseTimes) : 0,
      minResponseTimeMs:
        this.responseTimes.length > 0 ? Math.min(...this.responseTimes) : 0,
      opsPerSecond: this.recentOpsTimestamps.length / 60,
      errorRate: this.totalOps > 0 ? this.failureOps / this.totalOps : 0,
      lastOperationAt: this.lastOperationAt,
    };
  }

  /**
   * Reset metrics.
   */
  resetMetrics(): void {
    this.totalOps = 0;
    this.successOps = 0;
    this.failureOps = 0;
    this.responseTimes = [];
    this.recentOpsTimestamps = [];
    this.lastOperationAt = null;
  }

  /**
   * Track an operation for metrics.
   */
  private trackOperation(success: boolean, durationMs: number): void {
    if (!this.config.metrics) return;

    this.totalOps++;
    if (success) {
      this.successOps++;
    } else {
      this.failureOps++;
    }

    this.responseTimes.push(durationMs);
    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    const now = Date.now();
    this.recentOpsTimestamps.push(now);
    this.lastOperationAt = new Date(now).toISOString();
  }

  // ==========================================================================
  // PLUGIN DESCRIPTOR
  // ==========================================================================

  /**
   * Convert this adapter to a plugin descriptor.
   */
  toPluginDescriptor(version: string = "1.0.0"): PluginDescriptor {
    return {
      id: this.config.id,
      name: this.config.name,
      version,
      domain: this.config.domain,
      capabilities: this.config.capabilities,
      enabled: true,
      healthy: true,
      description: `Adapter for ${this.config.serviceId}`,
    };
  }
}

// ============================================================================
// ADAPTER REGISTRY
// ============================================================================

/**
 * Registry for managing multiple plugin adapters.
 */
export class PluginAdapterRegistry {
  private adapters: Map<string, PluginAdapter> = new Map();

  /**
   * Register an adapter.
   */
  register(adapter: PluginAdapter): void {
    this.adapters.set(adapter.getId(), adapter);
  }

  /**
   * Unregister an adapter.
   */
  unregister(adapterId: string): boolean {
    return this.adapters.delete(adapterId);
  }

  /**
   * Get an adapter by ID.
   */
  get(adapterId: string): PluginAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  /**
   * Get all adapters.
   */
  getAll(): PluginAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapters by domain.
   */
  getByDomain(domain: PluginDomain): PluginAdapter[] {
    return this.getAll().filter((a) => a.getDomain() === domain);
  }

  /**
   * Find an adapter that provides a specific capability.
   */
  findByCapability(capability: string): PluginAdapter | undefined {
    return this.getAll().find((a) => a.getCapabilities().includes(capability));
  }

  /**
   * Find all adapters that provide a specific capability.
   */
  findAllByCapability(capability: string): PluginAdapter[] {
    return this.getAll().filter((a) =>
      a.getCapabilities().includes(capability),
    );
  }

  /**
   * Execute an operation on the first adapter that supports it.
   */
  async executeOperation<TInput = unknown, TOutput = unknown>(
    operationName: string,
    input: TInput,
    metadata?: Record<string, unknown>,
  ): Promise<AdapterOperationResult<TOutput>> {
    for (const adapter of this.adapters.values()) {
      if (adapter.hasOperation(operationName)) {
        return adapter.execute<TInput, TOutput>(operationName, input, metadata);
      }
    }

    return {
      success: false,
      error: `No adapter found with operation "${operationName}"`,
      errorCode: "NO_ADAPTER_FOUND",
      durationMs: 0,
      adapterId: "none",
      operation: operationName,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check health of all adapters.
   */
  async checkAllHealth(): Promise<PluginHealthStatus[]> {
    const results: PluginHealthStatus[] = [];
    for (const adapter of this.adapters.values()) {
      const status = await adapter.checkHealth();
      results.push(status);
    }
    return results;
  }

  /**
   * Get metrics for all adapters.
   */
  getAllMetrics(): Record<string, AdapterMetrics> {
    const metrics: Record<string, AdapterMetrics> = {};
    for (const adapter of this.adapters.values()) {
      metrics[adapter.getId()] = adapter.getMetrics();
    }
    return metrics;
  }

  /**
   * Convert all adapters to plugin descriptors.
   */
  toPluginDescriptors(): PluginDescriptor[] {
    return this.getAll().map((a) => a.toPluginDescriptor());
  }

  /**
   * Get count of registered adapters.
   */
  size(): number {
    return this.adapters.size;
  }

  /**
   * Clear all registered adapters.
   */
  clear(): void {
    this.adapters.clear();
  }
}

// ============================================================================
// FACTORY HELPERS
// ============================================================================

/**
 * Create a simple adapter for a specific domain.
 */
export function createDomainAdapter(
  domain: PluginDomain,
  serviceId: string,
  capabilities: string[],
  name?: string,
): PluginAdapter {
  return new PluginAdapter({
    id: `adapter-${domain}-${serviceId}`,
    name:
      name ||
      `${domain.charAt(0).toUpperCase() + domain.slice(1)} Adapter (${serviceId})`,
    domain,
    serviceId,
    capabilities,
  });
}

/**
 * Create an adapter and register operations from a map.
 */
export function createAdapterWithOperations(
  config: Partial<PluginAdapterConfig> &
    Pick<
      PluginAdapterConfig,
      "id" | "name" | "domain" | "serviceId" | "capabilities"
    >,
  operationsMap: Record<
    string,
    { operation: AdapterOperation; handler: AdapterHandler }
  >,
): PluginAdapter {
  const adapter = new PluginAdapter(config);

  for (const [, { operation, handler }] of Object.entries(operationsMap)) {
    adapter.registerOperation(operation, handler);
  }

  return adapter;
}
