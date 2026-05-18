/**
 * Redis-Based Rate Limit Store
 *
 * Distributed rate limiting using Redis with sliding window algorithm.
 * Suitable for production deployments with multiple server instances.
 *
 * Features:
 * - Sliding window rate limiting (more accurate than fixed window)
 * - Atomic operations using Lua scripts
 * - Automatic key expiration
 * - Connection pooling and error handling
 * - Graceful degradation if Redis is unavailable
 *
 * @module services/rate-limit/redis-store
 */

import Redis from "ioredis";
import type { RateLimitStore, RateLimitConfig, RateLimitResult } from "./types";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

interface RedisStoreOptions {
  /** Redis connection URL or config */
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  /** Key prefix for all rate limit keys */
  keyPrefix?: string;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Max retries on connection failure */
  maxRetries?: number;
  /** Enable TLS */
  tls?: boolean;
  /** Cluster mode */
  cluster?: boolean;
  /** Cluster nodes for cluster mode */
  clusterNodes?: Array<{ host: string; port: number }>;
}

// ============================================================================
// Lua Scripts for Atomic Operations
// ============================================================================

/**
 * Lua script for sliding window rate limiting
 * Uses a sorted set to track request timestamps
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1

-- Remove expired entries (outside the window)
local window_start = now - window_ms
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Get current count
local current_count = redis.call('ZCARD', key)

-- Check if we're over the limit
local allowed = 1
local remaining = max_requests - current_count

if current_count >= max_requests then
  allowed = 0
  remaining = 0
else
  -- Add new request(s) with current timestamp as score
  for i = 1, cost do
    redis.call('ZADD', key, now, now .. ':' .. i .. ':' .. math.random(1000000))
  end
  remaining = max_requests - current_count - cost
  if remaining < 0 then remaining = 0 end
end

-- Set expiration on the key
redis.call('PEXPIRE', key, window_ms)

-- Get the oldest request timestamp for reset calculation
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local reset_at = now + window_ms
if oldest and oldest[2] then
  reset_at = tonumber(oldest[2]) + window_ms
end

-- Return results
return {allowed, remaining, reset_at, current_count + (allowed == 1 and cost or 0)}
`;

/**
 * Lua script for getting status without incrementing
 */
const STATUS_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])

-- Remove expired entries
local window_start = now - window_ms
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Get current count
local current_count = redis.call('ZCARD', key)
local remaining = max_requests - current_count
if remaining < 0 then remaining = 0 end

-- Get the oldest request timestamp
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local reset_at = now + window_ms
if oldest and oldest[2] then
  reset_at = tonumber(oldest[2]) + window_ms
end

local allowed = 1
if current_count >= max_requests then
  allowed = 0
end

return {allowed, remaining, reset_at, current_count}
`;

/**
 * Lua script for decrementing the counter
 */
const DECREMENT_SCRIPT = `
local key = KEYS[1]
local amount = tonumber(ARGV[1]) or 1

-- Get the newest entries to remove
local entries = redis.call('ZRANGE', key, -amount, -1)
for _, entry in ipairs(entries) do
  redis.call('ZREM', key, entry)
end

return redis.call('ZCARD', key)
`;

// ============================================================================
// Redis Rate Limit Store
// ============================================================================

export class RedisRateLimitStore implements RateLimitStore {
  private client: Redis | null = null;
  private readonly options: Required<RedisStoreOptions>;
  private readonly scriptsLoaded = new Map<string, string>();
  private connected = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(options: RedisStoreOptions = {}) {
    this.options = {
      url: options.url || process.env.REDIS_URL || "",
      host: options.host || process.env.REDIS_HOST || "localhost",
      port: options.port || parseInt(process.env.REDIS_PORT || "6379", 10),
      password: options.password || process.env.REDIS_PASSWORD || "",
      db: options.db ?? parseInt(process.env.REDIS_DB || "0", 10),
      keyPrefix: options.keyPrefix || "nchat:ratelimit:",
      connectTimeout: options.connectTimeout || 5000,
      maxRetries: options.maxRetries || 3,
      tls: options.tls ?? process.env.REDIS_TLS === "true",
      cluster: options.cluster ?? process.env.REDIS_CLUSTER === "true",
      clusterNodes: options.clusterNodes || [],
    };
  }

  /**
   * Get the Redis client, initializing if needed
   */
  private async getClient(): Promise<Redis> {
    if (this.client && this.connected) {
      return this.client;
    }

    // Prevent multiple concurrent connection attempts
    if (this.connectionPromise) {
      await this.connectionPromise;
      if (this.client && this.connected) {
        return this.client;
      }
    }

    this.connectionPromise = this.connect();
    await this.connectionPromise;
    this.connectionPromise = null;

    if (!this.client) {
      throw new Error("Failed to connect to Redis");
    }

    return this.client;
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      if (this.options.url) {
        this.client = new Redis(this.options.url, {
          maxRetriesPerRequest: this.options.maxRetries,
          connectTimeout: this.options.connectTimeout,
          lazyConnect: true,
          enableReadyCheck: true,
          retryStrategy: (times) => {
            if (times > this.options.maxRetries) {
              return null; // Stop retrying
            }
            return Math.min(times * 100, 3000);
          },
        });
      } else {
        this.client = new Redis({
          host: this.options.host,
          port: this.options.port,
          password: this.options.password || undefined,
          db: this.options.db,
          maxRetriesPerRequest: this.options.maxRetries,
          connectTimeout: this.options.connectTimeout,
          lazyConnect: true,
          enableReadyCheck: true,
          tls: this.options.tls ? {} : undefined,
          retryStrategy: (times) => {
            if (times > this.options.maxRetries) {
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        });
      }

      // Set up event handlers
      this.client.on("connect", () => {
        this.connected = true;
        // REMOVED: console.log('[RedisRateLimitStore] Connected to Redis')
      });

      this.client.on("error", (error) => {
        logger.error("[RedisRateLimitStore] Redis error:", error.message);
        this.connected = false;
      });

      this.client.on("close", () => {
        this.connected = false;
        // REMOVED: console.log('[RedisRateLimitStore] Redis connection closed')
      });

      this.client.on("reconnecting", () => {
        // REMOVED: console.log('[RedisRateLimitStore] Reconnecting to Redis...')
      });

      // Explicitly connect
      await this.client.connect();

      // Load Lua scripts
      await this.loadScripts();
    } catch (error) {
      logger.error("[RedisRateLimitStore] Failed to connect to Redis:", error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Load Lua scripts into Redis
   */
  private async loadScripts(): Promise<void> {
    if (!this.client) return;

    try {
      const slidingWindowSha = await this.client.script(
        "LOAD",
        SLIDING_WINDOW_SCRIPT,
      );
      this.scriptsLoaded.set("slidingWindow", slidingWindowSha as string);

      const statusSha = await this.client.script("LOAD", STATUS_SCRIPT);
      this.scriptsLoaded.set("status", statusSha as string);

      const decrementSha = await this.client.script("LOAD", DECREMENT_SCRIPT);
      this.scriptsLoaded.set("decrement", decrementSha as string);

      // REMOVED: console.log('[RedisRateLimitStore] Lua scripts loaded')
    } catch (error) {
      logger.error("[RedisRateLimitStore] Failed to load Lua scripts:", error);
      // Scripts will be evaluated inline as fallback
    }
  }

  /**
   * Build the full Redis key
   */
  private buildKey(key: string): string {
    return `${this.options.keyPrefix}${key}`;
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
    const maxRequests = config.maxRequests + (config.burst || 0);
    const cost = config.cost || 1;

    try {
      const client = await this.getClient();

      let result: [number, number, number, number];

      // Try to use cached script SHA
      const scriptSha = this.scriptsLoaded.get("slidingWindow");
      if (scriptSha) {
        try {
          result = (await client.evalsha(
            scriptSha,
            1,
            fullKey,
            now.toString(),
            windowMs.toString(),
            maxRequests.toString(),
            cost.toString(),
          )) as [number, number, number, number];
        } catch (error: any) {
          // Script might not be loaded (NOSCRIPT error), fallback to EVAL
          if (error.message?.includes("NOSCRIPT")) {
            // sast-ignore: EVAL_USAGE -- client.eval() calls a pre-loaded Redis Lua script, not arbitrary user input
            result = (await client.eval(
              SLIDING_WINDOW_SCRIPT,
              1,
              fullKey,
              now.toString(),
              windowMs.toString(),
              maxRequests.toString(),
              cost.toString(),
            )) as [number, number, number, number];
          } else {
            throw error;
          }
        }
      } else {
        // sast-ignore: EVAL_USAGE -- client.eval() calls a pre-loaded Redis Lua script, not arbitrary user input
        result = (await client.eval(
          SLIDING_WINDOW_SCRIPT,
          1,
          fullKey,
          now.toString(),
          windowMs.toString(),
          maxRequests.toString(),
          cost.toString(),
        )) as [number, number, number, number];
      }

      const [allowed, remaining, resetAt, current] = result;

      const rateLimitResult: RateLimitResult = {
        allowed: allowed === 1,
        remaining,
        reset: Math.ceil(resetAt / 1000),
        limit: maxRequests,
        current,
      };

      // Calculate retry-after if rate limited
      if (!rateLimitResult.allowed) {
        rateLimitResult.retryAfter = Math.ceil((resetAt - now) / 1000);
      }

      return rateLimitResult;
    } catch (error) {
      logger.error("[RedisRateLimitStore] Check error:", error);
      // On Redis error, allow the request (fail open)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        reset: Math.ceil((now + windowMs) / 1000),
        limit: maxRequests,
        current: 1,
      };
    }
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
    const maxRequests = config.maxRequests + (config.burst || 0);

    try {
      const client = await this.getClient();

      let result: [number, number, number, number];

      const scriptSha = this.scriptsLoaded.get("status");
      if (scriptSha) {
        try {
          result = (await client.evalsha(
            scriptSha,
            1,
            fullKey,
            now.toString(),
            windowMs.toString(),
            maxRequests.toString(),
          )) as [number, number, number, number];
        } catch (error: any) {
          if (error.message?.includes("NOSCRIPT")) {
            // sast-ignore: EVAL_USAGE -- client.eval() calls a pre-loaded Redis Lua script, not arbitrary user input
            result = (await client.eval(
              STATUS_SCRIPT,
              1,
              fullKey,
              now.toString(),
              windowMs.toString(),
              maxRequests.toString(),
            )) as [number, number, number, number];
          } else {
            throw error;
          }
        }
      } else {
        // sast-ignore: EVAL_USAGE -- client.eval() calls a pre-loaded Redis Lua script, not arbitrary user input
        result = (await client.eval(
          STATUS_SCRIPT,
          1,
          fullKey,
          now.toString(),
          windowMs.toString(),
          maxRequests.toString(),
        )) as [number, number, number, number];
      }

      const [allowed, remaining, resetAt, current] = result;

      return {
        allowed: allowed === 1,
        remaining,
        reset: Math.ceil(resetAt / 1000),
        limit: maxRequests,
        current,
        retryAfter:
          allowed === 0 ? Math.ceil((resetAt - now) / 1000) : undefined,
      };
    } catch (error) {
      logger.error("[RedisRateLimitStore] Status error:", error);
      return {
        allowed: true,
        remaining: maxRequests,
        reset: Math.ceil((now + windowMs) / 1000),
        limit: maxRequests,
        current: 0,
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      // Delete all keys matching the pattern
      const pattern = this.buildKey(key);
      await client.del(pattern);
    } catch (error) {
      logger.error("[RedisRateLimitStore] Reset error:", error);
    }
  }

  /**
   * Decrement the counter
   */
  async decrement(key: string, amount: number = 1): Promise<void> {
    try {
      const client = await this.getClient();
      const fullKey = this.buildKey(key);

      const scriptSha = this.scriptsLoaded.get("decrement");
      if (scriptSha) {
        try {
          await client.evalsha(scriptSha, 1, fullKey, amount.toString());
        } catch (error: any) {
          if (error.message?.includes("NOSCRIPT")) {
            // sast-ignore: EVAL_USAGE -- client.eval() calls a pre-loaded Redis Lua script, not arbitrary user input
            await client.eval(DECREMENT_SCRIPT, 1, fullKey, amount.toString());
          } else {
            throw error;
          }
        }
      } else {
        // sast-ignore: EVAL_USAGE -- client.eval() calls a pre-loaded Redis Lua script, not arbitrary user input
        await client.eval(DECREMENT_SCRIPT, 1, fullKey, amount.toString());
      }
    } catch (error) {
      logger.error("[RedisRateLimitStore] Decrement error:", error);
    }
  }

  /**
   * Clear all rate limits
   */
  async clear(): Promise<void> {
    try {
      const client = await this.getClient();
      // Use SCAN to find and delete all rate limit keys
      const pattern = this.buildKey("*");
      let cursor = "0";

      do {
        const [newCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = newCursor;

        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      logger.error("[RedisRateLimitStore] Clear error:", error);
    }
  }

  /**
   * Check if Redis is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const result = await client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  /**
   * Get store name
   */
  getName(): string {
    return "redis";
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let redisStoreInstance: RedisRateLimitStore | null = null;

/**
 * Get or create the Redis rate limit store singleton
 */
export function getRedisStore(
  options?: RedisStoreOptions,
): RedisRateLimitStore {
  if (!redisStoreInstance) {
    redisStoreInstance = new RedisRateLimitStore(options);
  }
  return redisStoreInstance;
}

/**
 * Create a new Redis rate limit store instance
 */
export function createRedisStore(
  options?: RedisStoreOptions,
): RedisRateLimitStore {
  return new RedisRateLimitStore(options);
}
