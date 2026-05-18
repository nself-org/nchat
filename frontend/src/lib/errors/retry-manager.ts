/**
 * Retry Manager
 *
 * Handles retry logic with exponential backoff, jitter, and circuit breaker pattern.
 * Provides a robust retry mechanism for failed operations.
 */

import { isRetryableError, parseError, AppError } from "./error-types";
import { addSentryBreadcrumb } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  // Retry attempts
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;

  // Jitter
  useJitter?: boolean;
  jitterFactor?: number;

  // Timeout
  timeoutMs?: number;

  // Circuit breaker
  useCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerResetTimeMs?: number;

  // Callbacks
  onRetry?: (attempt: number, error: AppError, delayMs: number) => void;
  shouldRetry?: (error: AppError, attempt: number) => boolean;
}

export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  useJitter: true,
  jitterFactor: 0.3,
  timeoutMs: 60000,
  useCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeMs: 60000,
  onRetry: () => {},
  shouldRetry: (error) => isRetryableError(error),
};

// ============================================================================
// Circuit Breaker State
// ============================================================================

enum CircuitState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Failing, reject requests
  HALF_OPEN = "half_open", // Testing if service recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private readonly threshold: number;
  private readonly resetTimeMs: number;

  constructor(threshold: number, resetTimeMs: number) {
    this.threshold = threshold;
    this.resetTimeMs = resetTimeMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      // Check if we should transition to half-open
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime >= this.resetTimeMs
      ) {
        this.state = CircuitState.HALF_OPEN;
        addSentryBreadcrumb(
          "circuit_breaker",
          "Circuit breaker transitioning to half-open",
          { threshold: this.threshold },
          "info",
        );
      } else {
        throw new AppError(
          "Circuit breaker is open",
          "circuit_breaker" as any,
          {
            userMessage:
              "Service temporarily unavailable. Please try again later.",
            isRetryable: false,
          },
        );
      }
    }

    try {
      const result = await fn();

      // Success - reset failure count
      if (this.state === CircuitState.HALF_OPEN) {
        this.reset();
        addSentryBreadcrumb(
          "circuit_breaker",
          "Circuit breaker closed after successful test",
          {},
          "info",
        );
      }

      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      addSentryBreadcrumb(
        "circuit_breaker",
        "Circuit breaker opened",
        { failureCount: this.failureCount, threshold: this.threshold },
        "warning",
      );
    }
  }

  private reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = undefined;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// ============================================================================
// Retry Manager
// ============================================================================

export class RetryManager {
  private readonly config: Required<RetryConfig>;
  private circuitBreaker?: CircuitBreaker;

  constructor(config?: RetryConfig) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };

    if (this.config.useCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerResetTimeMs,
      );
    }
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, operationName?: string): Promise<T> {
    const startTime = Date.now();
    let lastError: AppError | undefined;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      // Check timeout
      if (Date.now() - startTime >= this.config.timeoutMs) {
        const timeoutError = new AppError(
          `Operation timed out after ${this.config.timeoutMs}ms`,
          "timeout" as any,
          {
            userMessage: "Operation timed out. Please try again.",
            isRetryable: true,
            context: {
              operation: operationName,
              metadata: { timeoutMs: this.config.timeoutMs },
            },
          },
        );
        throw timeoutError;
      }

      try {
        // Execute with circuit breaker if enabled
        if (this.circuitBreaker) {
          return await this.circuitBreaker.execute(fn);
        }
        return await fn();
      } catch (error) {
        lastError = parseError(error);

        // Add breadcrumb
        addSentryBreadcrumb(
          "retry",
          `Attempt ${attempt}/${this.config.maxAttempts} failed`,
          {
            operation: operationName,
            error: lastError.message,
            category: lastError.category,
          },
          "warning",
        );

        // Check if we should retry
        const isLastAttempt = attempt === this.config.maxAttempts;
        const shouldRetry = this.config.shouldRetry(lastError, attempt);

        if (isLastAttempt || !shouldRetry) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delayMs = this.calculateDelay(attempt);

        // Call retry callback
        this.config.onRetry(attempt, lastError, delayMs);

        // Wait before next attempt
        await this.sleep(delayMs);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error("Retry failed with unknown error");
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
    let delay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, this.config.maxDelayMs);

    // Add jitter to prevent thundering herd
    if (this.config.useJitter) {
      const jitter = delay * this.config.jitterFactor;
      delay = delay + (Math.random() * jitter * 2 - jitter);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState | null {
    return this.circuitBreaker?.getState() || null;
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitStats() {
    return this.circuitBreaker?.getStats() || null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create retry manager with default config
 */
export function createRetryManager(config?: RetryConfig): RetryManager {
  return new RetryManager(config);
}

/**
 * Execute with retry using default config
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: RetryConfig,
): Promise<T> {
  const manager = new RetryManager(config);
  return manager.execute(fn);
}

/**
 * Execute with aggressive retry (more attempts, shorter delays)
 */
export async function withAggressiveRetry<T>(fn: () => Promise<T>): Promise<T> {
  const manager = new RetryManager({
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 1.5,
  });
  return manager.execute(fn);
}

/**
 * Execute with conservative retry (fewer attempts, longer delays)
 */
export async function withConservativeRetry<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const manager = new RetryManager({
    maxAttempts: 2,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 3,
  });
  return manager.execute(fn);
}

/**
 * Execute with no circuit breaker
 */
export async function withRetryNoCircuit<T>(
  fn: () => Promise<T>,
  config?: RetryConfig,
): Promise<T> {
  const manager = new RetryManager({
    ...config,
    useCircuitBreaker: false,
  });
  return manager.execute(fn);
}

// ============================================================================
// Retry Decorators (for class methods)
// ============================================================================

export interface RetryOptions {
  config?: RetryConfig;
  operationName?: string;
}

/**
 * Decorator to add retry logic to async methods
 */
export function Retry(options?: RetryOptions) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const manager = new RetryManager(options?.config);
      const operationName = options?.operationName || propertyKey;

      return manager.execute(
        () => originalMethod.apply(this, args),
        operationName,
      );
    };

    return descriptor;
  };
}

// ============================================================================
// Offline Queue Support
// ============================================================================

export interface QueuedOperation<T = unknown> {
  id: string;
  fn: () => Promise<T>;
  operationName: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export class OfflineQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private processing = false;
  private readonly STORAGE_KEY = "offline_queue";

  constructor() {
    // Load queue from localStorage on init
    this.loadQueue();

    // Listen for online event
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.processQueue());
    }
  }

  /**
   * Add operation to queue
   */
  enqueue<T>(
    fn: () => Promise<T>,
    operationName: string,
    maxRetries = 3,
  ): string {
    const id = this.generateId();
    const operation: QueuedOperation<T> = {
      id,
      fn,
      operationName,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.queue.set(id, operation);
    this.saveQueue();

    addSentryBreadcrumb(
      "offline_queue",
      `Operation queued: ${operationName}`,
      { id, queueSize: this.queue.size },
      "info",
    );

    return id;
  }

  /**
   * Process queued operations
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;
    if (!navigator.onLine) return;

    this.processing = true;

    const operations = Array.from(this.queue.values());

    for (const operation of operations) {
      try {
        await operation.fn();
        this.queue.delete(operation.id);

        addSentryBreadcrumb(
          "offline_queue",
          `Operation completed: ${operation.operationName}`,
          { id: operation.id },
          "info",
        );
      } catch (error) {
        operation.retryCount++;

        if (operation.retryCount >= operation.maxRetries) {
          this.queue.delete(operation.id);

          addSentryBreadcrumb(
            "offline_queue",
            `Operation failed permanently: ${operation.operationName}`,
            { id: operation.id, error: parseError(error).message },
            "error",
          );
        }
      }
    }

    this.saveQueue();
    this.processing = false;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Get queued operations
   */
  getOperations(): QueuedOperation[] {
    return Array.from(this.queue.values());
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.clear();
    this.saveQueue();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    if (typeof window === "undefined") return;

    try {
      const serialized = JSON.stringify(
        Array.from(this.queue.entries()).map(([id, op]) => ({
          id,
          operationName: op.operationName,
          timestamp: op.timestamp,
          retryCount: op.retryCount,
          maxRetries: op.maxRetries,
        })),
      );
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      logger.error("Failed to save offline queue:", error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    if (typeof window === "undefined") return;

    try {
      const serialized = localStorage.getItem(this.STORAGE_KEY);
      if (!serialized) return;

      const items = JSON.parse(serialized);
      // Note: We can't restore the actual functions, so this is mainly
      // for showing queued operation count to users
      // In practice, operations should be re-queued on app restart
    } catch (error) {
      logger.error("Failed to load offline queue:", error);
    }
  }
}

// Global offline queue instance
export const offlineQueue = new OfflineQueue();
