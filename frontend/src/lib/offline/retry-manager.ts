/**
 * Retry Manager - Handles retry logic for failed operations
 *
 * Provides configurable retry strategies with exponential backoff,
 * jitter, and customizable retry conditions.
 */

import type { RetryConfig, RetryStrategy } from "./offline-types";

// =============================================================================
// Types
// =============================================================================

/**
 * Retry operation result
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Retry operation function
 */
export type RetryOperation<T> = () => Promise<T>;

/**
 * Retry condition function
 */
export type RetryCondition = (error: Error, attempt: number) => boolean;

/**
 * Retry progress callback
 */
export type RetryProgressCallback = (
  attempt: number,
  maxAttempts: number,
  delay: number,
  error?: Error,
) => void;

/**
 * Extended retry options
 */
export interface RetryOptions extends Partial<RetryConfig> {
  shouldRetry?: RetryCondition;
  onRetry?: RetryProgressCallback;
  signal?: AbortSignal;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  strategy: "exponential",
  factor: 2,
  jitter: true,
  retryOn: [408, 429, 500, 502, 503, 504],
};

// =============================================================================
// Retry Manager Class
// =============================================================================

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: RetryOperation<T>,
    options: RetryOptions = {},
  ): Promise<RetryResult<T>> {
    const config = { ...this.config, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        // Check for abort signal
        if (options.signal?.aborted) {
          throw new Error("Operation aborted");
        }

        const data = await operation();

        return {
          success: true,
          data,
          attempts: attempt + 1,
          totalTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const shouldRetry =
          attempt < config.maxRetries &&
          this.shouldRetryError(
            lastError,
            attempt,
            options.shouldRetry,
            config,
          );

        if (!shouldRetry) {
          break;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, config);

        // Notify progress
        if (options.onRetry) {
          options.onRetry(attempt + 1, config.maxRetries, delay, lastError);
        }

        // Wait before retrying
        await this.wait(delay, options.signal);

        attempt++;
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: attempt + 1,
      totalTime: Date.now() - startTime,
    };
  }

  /**
   * Determine if error should trigger a retry
   */
  private shouldRetryError(
    error: Error,
    attempt: number,
    customCondition?: RetryCondition,
    config: RetryConfig = this.config,
  ): boolean {
    // Custom condition takes precedence
    if (customCondition) {
      return customCondition(error, attempt);
    }

    // Check for network errors
    if (this.isNetworkError(error)) {
      return true;
    }

    // Check for HTTP status codes
    const statusCode = this.extractStatusCode(error);
    if (statusCode && config.retryOn.includes(statusCode)) {
      return true;
    }

    // Check for timeout errors
    if (this.isTimeoutError(error)) {
      return true;
    }

    return false;
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      "network error",
      "failed to fetch",
      "networkerror",
      "net::err",
      "connection refused",
      "econnrefused",
      "enotfound",
      "etimedout",
      "socket hang up",
    ];

    const message = error.message.toLowerCase();
    return networkErrorMessages.some((msg) => message.includes(msg));
  }

  /**
   * Check if error is a timeout error
   */
  private isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("deadline exceeded")
    );
  }

  /**
   * Extract HTTP status code from error
   */
  private extractStatusCode(error: Error): number | null {
    // Check for status property
    const errorWithStatus = error as Error & {
      status?: number;
      statusCode?: number;
    };
    if (errorWithStatus.status) return errorWithStatus.status;
    if (errorWithStatus.statusCode) return errorWithStatus.statusCode;

    // Check for status in message
    const match = error.message.match(/\b([45]\d{2})\b/);
    if (match) return parseInt(match[1], 10);

    return null;
  }

  /**
   * Calculate delay for current attempt
   */
  private calculateDelay(
    attempt: number,
    config: RetryConfig = this.config,
  ): number {
    let delay: number;

    switch (config.strategy) {
      case "exponential":
        delay = Math.min(
          config.baseDelay * Math.pow(config.factor, attempt),
          config.maxDelay,
        );
        break;

      case "linear":
        delay = Math.min(config.baseDelay * (attempt + 1), config.maxDelay);
        break;

      case "fixed":
      default:
        delay = config.baseDelay;
    }

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterRange = delay * 0.3; // 30% jitter
      delay += Math.random() * jitterRange - jitterRange / 2;
    }

    return Math.round(Math.max(0, delay));
  }

  /**
   * Wait for specified duration
   */
  private wait(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);

      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Operation aborted"));
        });
      }
    });
  }

  /**
   * Update configuration
   */
  public setConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a retry manager with custom configuration
 */
export function createRetryManager(
  config?: Partial<RetryConfig>,
): RetryManager {
  return new RetryManager(config);
}

/**
 * Execute operation with retry (standalone function)
 */
export async function withRetry<T>(
  operation: RetryOperation<T>,
  options?: RetryOptions,
): Promise<RetryResult<T>> {
  const manager = new RetryManager(options);
  return manager.execute(operation, options);
}

/**
 * Create a retryable wrapper for a function
 */
export function makeRetryable<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options?: RetryOptions,
): (...args: T) => Promise<RetryResult<R>> {
  const manager = new RetryManager(options);

  return async (...args: T): Promise<RetryResult<R>> => {
    return manager.execute(() => fn(...args), options);
  };
}

/**
 * Sleep for specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for a specific attempt
 */
export function calculateRetryDelay(
  attempt: number,
  strategy: RetryStrategy = "exponential",
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  factor: number = 2,
): number {
  let delay: number;

  switch (strategy) {
    case "exponential":
      delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
      break;
    case "linear":
      delay = Math.min(baseDelay * (attempt + 1), maxDelay);
      break;
    case "fixed":
    default:
      delay = baseDelay;
  }

  return delay;
}

/**
 * Format retry delay for display
 */
export function formatRetryDelay(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

// =============================================================================
// Default Export
// =============================================================================

export default RetryManager;
