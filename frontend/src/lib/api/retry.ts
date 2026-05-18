/**
 * API Retry Utility
 *
 * Handles transient failures with exponential backoff and jitter.
 * Useful for network requests that may temporarily fail.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;

  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;

  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;

  /** Add random jitter to delays (default: true) */
  jitter?: boolean;

  /** Function to determine if error is retryable (default: retry all) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;

  /** Called before each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
  totalTime: number;
}

// ============================================================================
// Default Retry Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: () => true,
  onRetry: () => {},
};

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  backoffMultiplier: number,
  maxDelay: number,
  useJitter: boolean,
): number {
  // Exponential backoff: delay * (multiplier ^ attempt)
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

  // Cap at max delay
  delay = Math.min(delay, maxDelay);

  // Add jitter (random ±25%)
  if (useJitter) {
    const jitter = delay * 0.25;
    delay = delay + (Math.random() - 0.5) * 2 * jitter;
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error indicates a retryable condition
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // HTTP errors (5xx server errors, 429 rate limit, 408 timeout)
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    return status >= 500 || status === 429 || status === 408;
  }

  return false;
}

// ============================================================================
// Retry Functions
// ============================================================================

/**
 * Retry an async function with exponential backoff
 *
 * @example
 * ```typescript
 * const result = await retryAsync(
 *   () => fetch('/api/data'),
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     onRetry: (error, attempt) => {
 *       /* console.log `Retry attempt ${attempt}`)
 *     }
 *   }
 * )
 * ```
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  let lastError: unknown;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    attempt++;

    try {
      const result = await fn();

      // Success! Log if we had to retry
      if (attempt > 1) {
        logger.debug("Retry succeeded", {
          attempts: attempt,
          totalTime: Date.now() - startTime,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const shouldRetry = opts.shouldRetry(error, attempt);
      const hasRetriesLeft = attempt < opts.maxRetries;

      if (!shouldRetry || !hasRetriesLeft) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.backoffMultiplier,
        opts.maxDelay,
        opts.jitter,
      );

      logger.warn("Retry attempt", {
        attempt,
        maxRetries: opts.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      opts.onRetry(error, attempt, delay);
      await sleep(delay);
    }
  }

  // All retries exhausted
  logger.error(
    "All retry attempts failed",
    lastError instanceof Error ? lastError : new Error(String(lastError)),
    {
      attempts: attempt,
      totalTime: Date.now() - startTime,
    },
  );

  throw lastError;
}

/**
 * Retry with detailed result information
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  try {
    const data = await retryAsync(async () => {
      attempts++;
      return await fn();
    }, options);

    return {
      success: true,
      data,
      attempts,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error,
      attempts,
      totalTime: Date.now() - startTime,
    };
  }
}

/**
 * Create a retry wrapper for a function
 *
 * @example
 * ```typescript
 * const fetchWithRetry = createRetryWrapper(fetch, {
 *   maxRetries: 3,
 *   shouldRetry: (error) => error.status >= 500
 * })
 *
 * const response = await fetchWithRetry('/api/data')
 * ```
 */
export function createRetryWrapper<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {},
): (...args: TArgs) => Promise<TReturn> {
  return (...args: TArgs) => {
    return retryAsync(() => fn(...args), options);
  };
}

// ============================================================================
// Specialized Retry Functions
// ============================================================================

/**
 * Retry fetch requests with smart defaults
 */
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<Response> {
  return retryAsync(
    async () => {
      const response = await fetch(input, init);

      // Throw on non-OK responses to trigger retry
      if (!response.ok) {
        throw Object.assign(
          new Error(`HTTP ${response.status}: ${response.statusText}`),
          {
            status: response.status,
            response,
          },
        );
      }

      return response;
    },
    {
      ...options,
      shouldRetry: (error, attempt) => {
        // Use custom shouldRetry if provided
        if (options?.shouldRetry) {
          return options.shouldRetry(error, attempt);
        }
        // Default: retry on network errors and 5xx/429/408
        return isRetryableError(error);
      },
    },
  );
}

/**
 * Retry GraphQL queries
 */
export async function retryGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  options?: RetryOptions,
): Promise<T> {
  return retryAsync(
    async () => {
      const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw Object.assign(new Error(`HTTP ${response.status}`), {
          status: response.status,
        });
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "GraphQL Error");
      }

      return result.data as T;
    },
    {
      ...options,
      shouldRetry: (error) => {
        // Retry on network errors and server errors
        return isRetryableError(error);
      },
    },
  );
}

/**
 * Circuit breaker pattern
 * Prevents cascading failures by failing fast after repeated errors
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === "open") {
      const now = Date.now();
      if (now - this.lastFailureTime < this.timeout) {
        throw new Error("Circuit breaker is OPEN");
      }
      // Try to close circuit
      this.state = "half-open";
    }

    try {
      const result = await fn();
      // Success! Reset on half-open or maintain closed
      if (this.state === "half-open") {
        this.state = "closed";
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = "open";
        logger.warn("Circuit breaker opened", {
          failures: this.failures,
          threshold: this.threshold,
        });
      }

      throw error;
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = "closed";
    this.lastFailureTime = 0;
  }

  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures,
    };
  }
}
