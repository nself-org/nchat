/**
 * In-Memory Rate Limit Store
 *
 * Local memory-based rate limiting for development and fallback scenarios.
 * Uses sliding window algorithm for accurate rate limiting.
 *
 * Features:
 * - No external dependencies
 * - Automatic cleanup of expired entries
 * - Sliding window algorithm
 * - Suitable for single-instance deployments
 *
 * Limitations:
 * - Not suitable for distributed systems (each server has its own state)
 * - State is lost on server restart
 * - Memory usage grows with number of unique identifiers
 *
 * @module services/rate-limit/memory-store
 */

import type {
  RateLimitStore,
  RateLimitConfig,
  RateLimitResult,
  RateLimitEntry,
} from "./types";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

interface MemoryStoreOptions {
  /** Cleanup interval in milliseconds (default: 60000) */
  cleanupInterval?: number;
  /** Maximum entries before forced cleanup (default: 100000) */
  maxEntries?: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
}

// ============================================================================
// Memory Rate Limit Store
// ============================================================================

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly options: Required<MemoryStoreOptions>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lastCleanup = Date.now();

  constructor(options: MemoryStoreOptions = {}) {
    this.options = {
      cleanupInterval: options.cleanupInterval || 60000,
      maxEntries: options.maxEntries || 100000,
      keyPrefix: options.keyPrefix || "",
    };

    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Build the full key
   */
  private buildKey(key: string): string {
    return this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key;
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Only start timer in Node.js environment (not in edge runtime)
    if (typeof setInterval !== "undefined") {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.options.cleanupInterval);

      // Unref to allow process to exit if this is the only timer
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.store.entries()) {
      // Delete entries where all requests are outside the window
      if (now > entry.resetAt) {
        this.store.delete(key);
        deleted++;
      }
    }

    this.lastCleanup = now;

    // Log cleanup if significant entries were removed
    if (deleted > 100) {
      // REMOVED: console.log(`[MemoryRateLimitStore] Cleaned up ${deleted} expired entries`)
    }
  }

  /**
   * Force cleanup if we're over the max entries limit
   */
  private checkMaxEntries(): void {
    if (this.store.size > this.options.maxEntries) {
      console.warn(
        `[MemoryRateLimitStore] Max entries (${this.options.maxEntries}) exceeded. ` +
          `Current: ${this.store.size}. Forcing cleanup.`,
      );
      this.cleanup();

      // If still over limit, remove oldest entries
      if (this.store.size > this.options.maxEntries) {
        const entries = Array.from(this.store.entries()).sort(
          (a, b) => (a[1].lastRequest || 0) - (b[1].lastRequest || 0),
        );

        const toRemove = entries.slice(
          0,
          this.store.size - this.options.maxEntries,
        );
        for (const [key] of toRemove) {
          this.store.delete(key);
        }
      }
    }
  }

  /**
   * Check rate limit and increment counter
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const fullKey = this.buildKey(
      config.keyPrefix ? `${config.keyPrefix}:${key}` : key,
    );
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const limit = config.maxRequests + (config.burst || 0);
    const cost = config.cost || 1;

    // Check max entries limit
    this.checkMaxEntries();

    let entry = this.store.get(fullKey);

    if (!entry) {
      // Create new entry
      entry = {
        count: cost,
        resetAt: now + windowMs,
        requests: [now],
        firstRequest: now,
        lastRequest: now,
      };
      this.store.set(fullKey, entry);

      return {
        allowed: true,
        remaining: limit - cost,
        reset: Math.ceil(entry.resetAt / 1000),
        limit,
        current: cost,
      };
    }

    // Sliding window: remove requests outside the window
    const windowStart = now - windowMs;
    entry.requests = entry.requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    // Check if we're over the limit
    const currentCount = entry.requests.length;
    const allowed = currentCount + cost <= limit;

    if (allowed) {
      // Add new request(s)
      for (let i = 0; i < cost; i++) {
        entry.requests.push(now);
      }
      entry.count = entry.requests.length;
      entry.lastRequest = now;
    }

    // Update reset time based on oldest request in window
    if (entry.requests.length > 0) {
      entry.resetAt = entry.requests[0] + windowMs;
    } else {
      entry.resetAt = now + windowMs;
    }

    this.store.set(fullKey, entry);

    const result: RateLimitResult = {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      reset: Math.ceil(entry.resetAt / 1000),
      limit,
      current: entry.count,
    };

    // Calculate retry-after if rate limited
    if (!allowed && entry.requests.length > 0) {
      const oldestRequest = entry.requests[0];
      result.retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
    }

    return result;
  }

  /**
   * Get current status without incrementing
   */
  async status(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const fullKey = this.buildKey(
      config.keyPrefix ? `${config.keyPrefix}:${key}` : key,
    );
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const limit = config.maxRequests + (config.burst || 0);

    const entry = this.store.get(fullKey);

    if (!entry) {
      return {
        allowed: true,
        remaining: limit,
        reset: Math.ceil((now + windowMs) / 1000),
        limit,
        current: 0,
      };
    }

    // Sliding window: count requests in window
    const windowStart = now - windowMs;
    const requestsInWindow = entry.requests.filter(
      (timestamp) => timestamp > windowStart,
    );
    const count = requestsInWindow.length;
    const remaining = Math.max(0, limit - count);
    const allowed = count < limit;

    // Calculate reset time
    let resetAt = now + windowMs;
    if (requestsInWindow.length > 0) {
      resetAt = requestsInWindow[0] + windowMs;
    }

    const result: RateLimitResult = {
      allowed,
      remaining,
      reset: Math.ceil(resetAt / 1000),
      limit,
      current: count,
    };

    if (!allowed) {
      result.retryAfter = Math.ceil((resetAt - now) / 1000);
    }

    return result;
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    this.store.delete(fullKey);

    // Also delete with any prefix variations
    for (const storeKey of this.store.keys()) {
      if (storeKey.includes(key)) {
        this.store.delete(storeKey);
      }
    }
  }

  /**
   * Decrement the counter
   */
  async decrement(key: string, amount: number = 1): Promise<void> {
    const fullKey = this.buildKey(key);
    const entry = this.store.get(fullKey);

    if (entry && entry.requests.length > 0) {
      // Remove the most recent requests
      entry.requests = entry.requests.slice(0, -amount);
      entry.count = entry.requests.length;

      if (entry.requests.length === 0) {
        this.store.delete(fullKey);
      } else {
        this.store.set(fullKey, entry);
      }
    }
  }

  /**
   * Clear all rate limits
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Check if the store is healthy
   */
  async isHealthy(): Promise<boolean> {
    return true; // Memory store is always healthy
  }

  /**
   * Get store name
   */
  getName(): string {
    return "memory";
  }

  /**
   * Get current store size
   */
  getSize(): number {
    return this.store.size;
  }

  /**
   * Get store statistics
   */
  getStats(): {
    size: number;
    lastCleanup: number;
    maxEntries: number;
  } {
    return {
      size: this.store.size,
      lastCleanup: this.lastCleanup,
      maxEntries: this.options.maxEntries,
    };
  }

  /**
   * Stop cleanup timer and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let memoryStoreInstance: MemoryRateLimitStore | null = null;

/**
 * Get or create the memory rate limit store singleton
 */
export function getMemoryStore(
  options?: MemoryStoreOptions,
): MemoryRateLimitStore {
  if (!memoryStoreInstance) {
    memoryStoreInstance = new MemoryRateLimitStore(options);
  }
  return memoryStoreInstance;
}

/**
 * Create a new memory rate limit store instance
 */
export function createMemoryStore(
  options?: MemoryStoreOptions,
): MemoryRateLimitStore {
  return new MemoryRateLimitStore(options);
}

// ============================================================================
// Edge-Compatible Store (No Timer, Manual Cleanup)
// ============================================================================

/**
 * Edge-compatible memory store for use in Next.js middleware
 * Does not use timers (which aren't available in edge runtime)
 */
export class EdgeMemoryStore implements RateLimitStore {
  private readonly store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly MAX_ENTRIES = 10000;

  /**
   * Check rate limit and increment counter
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const limit = config.maxRequests + (config.burst || 0);
    const cost = config.cost || 1;

    // Periodic cleanup
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      this.cleanup();
    }

    let entry = this.store.get(key);

    if (!entry) {
      entry = {
        count: cost,
        resetAt: now + windowMs,
        requests: [now],
        firstRequest: now,
        lastRequest: now,
      };
      this.store.set(key, entry);

      return {
        allowed: true,
        remaining: limit - cost,
        reset: Math.ceil(entry.resetAt / 1000),
        limit,
        current: cost,
      };
    }

    // Sliding window
    const windowStart = now - windowMs;
    entry.requests = entry.requests.filter((ts) => ts > windowStart);

    const currentCount = entry.requests.length;
    const allowed = currentCount + cost <= limit;

    if (allowed) {
      for (let i = 0; i < cost; i++) {
        entry.requests.push(now);
      }
      entry.count = entry.requests.length;
      entry.lastRequest = now;
    }

    if (entry.requests.length > 0) {
      entry.resetAt = entry.requests[0] + windowMs;
    }

    this.store.set(key, entry);

    const result: RateLimitResult = {
      allowed,
      remaining: Math.max(0, limit - entry.count),
      reset: Math.ceil(entry.resetAt / 1000),
      limit,
      current: entry.count,
    };

    if (!allowed && entry.requests.length > 0) {
      result.retryAfter = Math.ceil(
        (entry.requests[0] + windowMs - now) / 1000,
      );
    }

    return result;
  }

  /**
   * Get status without incrementing
   */
  async status(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const limit = config.maxRequests + (config.burst || 0);

    const entry = this.store.get(key);

    if (!entry) {
      return {
        allowed: true,
        remaining: limit,
        reset: Math.ceil((now + windowMs) / 1000),
        limit,
        current: 0,
      };
    }

    const windowStart = now - windowMs;
    const requestsInWindow = entry.requests.filter((ts) => ts > windowStart);
    const count = requestsInWindow.length;
    const allowed = count < limit;

    let resetAt = now + windowMs;
    if (requestsInWindow.length > 0) {
      resetAt = requestsInWindow[0] + windowMs;
    }

    return {
      allowed,
      remaining: Math.max(0, limit - count),
      reset: Math.ceil(resetAt / 1000),
      limit,
      current: count,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async decrement(key: string, amount: number = 1): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      entry.requests = entry.requests.slice(0, -amount);
      entry.count = entry.requests.length;
      if (entry.count === 0) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }

  getName(): string {
    return "edge-memory";
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }

    // Emergency cleanup if over max
    if (this.store.size > this.MAX_ENTRIES) {
      const entries = Array.from(this.store.entries()).sort(
        (a, b) => (a[1].lastRequest || 0) - (b[1].lastRequest || 0),
      );

      const toRemove = entries.slice(0, Math.floor(this.MAX_ENTRIES * 0.2));
      for (const [key] of toRemove) {
        this.store.delete(key);
      }
    }

    this.lastCleanup = now;
  }
}

// Edge store singleton
let edgeStoreInstance: EdgeMemoryStore | null = null;

export function getEdgeStore(): EdgeMemoryStore {
  if (!edgeStoreInstance) {
    edgeStoreInstance = new EdgeMemoryStore();
  }
  return edgeStoreInstance;
}
