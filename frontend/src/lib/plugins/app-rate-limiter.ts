/**
 * Per-App Rate Limiter
 *
 * Provides rate limiting per app and per scope, with configurable
 * quotas and sliding window algorithm.
 */

import type { AppScope } from "./app-contract";

// ============================================================================
// TYPES
// ============================================================================

export interface AppRateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Total limit */
  limit: number;
  /** When the window resets (Unix timestamp in seconds) */
  reset: number;
  /** Seconds to wait before retrying (0 if allowed) */
  retryAfter: number;
}

export interface AppRateLimitConfig {
  /** Requests per window */
  requestsPerMinute: number;
  /** Burst allowance above base rate */
  burstAllowance?: number;
  /** Per-scope overrides */
  scopeOverrides?: Record<string, { requestsPerMinute: number }>;
}

/**
 * Default rate limit for apps that don't declare their own limits.
 */
export const DEFAULT_APP_RATE_LIMIT: AppRateLimitConfig = {
  requestsPerMinute: 60,
  burstAllowance: 10,
};

// ============================================================================
// INTERNAL WINDOW ENTRY
// ============================================================================

interface WindowEntry {
  /** Timestamps of requests in the current window */
  timestamps: number[];
  /** Burst tokens used */
  burstUsed: number;
}

// ============================================================================
// APP RATE LIMITER
// ============================================================================

export class AppRateLimiter {
  /** Map of app/scope key -> window entry */
  private windows: Map<string, WindowEntry> = new Map();
  /** Cleanup interval handle */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Run cleanup every 60 seconds to prevent memory leaks
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // ==========================================================================
  // RATE CHECK
  // ==========================================================================

  /**
   * Check whether a request from an app is allowed.
   *
   * @param appId The app registration ID
   * @param config Rate limit config for the app
   * @param scope Optional scope to apply scope-specific limits
   */
  check(
    appId: string,
    config: AppRateLimitConfig,
    scope?: AppScope,
  ): AppRateLimitResult {
    const key = scope ? `${appId}:${scope}` : appId;
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    // Get or create window entry
    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [], burstUsed: 0 };
      this.windows.set(key, entry);
    }

    // Remove expired timestamps
    const windowStart = now - windowMs;
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Determine effective limit
    let effectiveLimit: number;
    if (scope && config.scopeOverrides?.[scope]) {
      effectiveLimit = config.scopeOverrides[scope].requestsPerMinute;
    } else {
      effectiveLimit = config.requestsPerMinute;
    }

    const burstLimit = config.burstAllowance ?? 0;
    const totalLimit = effectiveLimit + burstLimit;
    const currentCount = entry.timestamps.length;

    const reset = Math.ceil((now + windowMs) / 1000);

    if (currentCount >= totalLimit) {
      // Rate limited
      const oldestInWindow = entry.timestamps[0] || now;
      const retryAfterMs = oldestInWindow + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        limit: totalLimit,
        reset,
        retryAfter: Math.ceil(retryAfterMs / 1000),
      };
    }

    // Allow the request
    entry.timestamps.push(now);

    // Track burst usage
    if (currentCount >= effectiveLimit) {
      entry.burstUsed = currentCount - effectiveLimit + 1;
    }

    return {
      allowed: true,
      remaining: totalLimit - currentCount - 1,
      limit: totalLimit,
      reset,
      retryAfter: 0,
    };
  }

  // ==========================================================================
  // STATUS (non-consuming)
  // ==========================================================================

  /**
   * Get the current rate limit status without consuming a request.
   */
  status(
    appId: string,
    config: AppRateLimitConfig,
    scope?: AppScope,
  ): AppRateLimitResult {
    const key = scope ? `${appId}:${scope}` : appId;
    const now = Date.now();
    const windowMs = 60000;

    const entry = this.windows.get(key);
    if (!entry) {
      const totalLimit =
        config.requestsPerMinute + (config.burstAllowance ?? 0);
      return {
        allowed: true,
        remaining: totalLimit,
        limit: totalLimit,
        reset: Math.ceil((now + windowMs) / 1000),
        retryAfter: 0,
      };
    }

    // Remove expired
    const windowStart = now - windowMs;
    const activeTimestamps = entry.timestamps.filter((ts) => ts > windowStart);

    let effectiveLimit: number;
    if (scope && config.scopeOverrides?.[scope]) {
      effectiveLimit = config.scopeOverrides[scope].requestsPerMinute;
    } else {
      effectiveLimit = config.requestsPerMinute;
    }

    const totalLimit = effectiveLimit + (config.burstAllowance ?? 0);
    const remaining = Math.max(0, totalLimit - activeTimestamps.length);

    return {
      allowed: remaining > 0,
      remaining,
      limit: totalLimit,
      reset: Math.ceil((now + windowMs) / 1000),
      retryAfter: remaining > 0 ? 0 : Math.ceil(windowMs / 1000),
    };
  }

  // ==========================================================================
  // RESET
  // ==========================================================================

  /**
   * Reset rate limit for an app (e.g., admin action).
   */
  reset(appId: string, scope?: AppScope): void {
    const key = scope ? `${appId}:${scope}` : appId;
    this.windows.delete(key);
  }

  /**
   * Reset all rate limits for an app across all scopes.
   */
  resetAll(appId: string): void {
    const prefix = `${appId}`;
    for (const key of this.windows.keys()) {
      if (key === appId || key.startsWith(`${prefix}:`)) {
        this.windows.delete(key);
      }
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Remove expired window entries.
   */
  cleanup(): void {
    const now = Date.now();
    const windowMs = 60000;

    for (const [key, entry] of this.windows) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > now - windowMs);
      if (entry.timestamps.length === 0) {
        this.windows.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter (stop cleanup interval).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.windows.clear();
  }

  /**
   * Get the number of tracked windows (for diagnostics).
   */
  getWindowCount(): number {
    return this.windows.size;
  }
}
