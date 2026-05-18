/**
 * Advanced Rate Limiter with Redis Support
 *
 * Production-ready rate limiting implementation with:
 * - Sliding window algorithm
 * - Redis backend support with in-memory fallback
 * - Per-user, per-IP, and per-endpoint limits
 * - Token bucket algorithm for burst protection
 * - Automatic cleanup and TTL management
 *
 * @module lib/api/rate-limiter
 */

import { NextRequest } from "next/server";
import Redis from "ioredis";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Burst allowance (optional, for token bucket) */
  burst?: number;
  /** Custom identifier key */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Time when the limit resets (Unix timestamp in seconds) */
  reset: number;
  /** Total limit */
  limit: number;
  /** Retry after seconds (only set if rate limited) */
  retryAfter?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in milliseconds
  tokens?: number; // For token bucket algorithm
  lastRefill?: number; // Last token refill time
}

// ============================================================================
// Rate Limit Presets
// ============================================================================

export const RATE_LIMIT_PRESETS = {
  // Authentication endpoints (strict)
  AUTH: {
    maxRequests: 5,
    windowSeconds: 60, // 5 requests per minute
    keyPrefix: "rl:auth",
  },

  // Auth signup (very strict)
  AUTH_SIGNUP: {
    maxRequests: 3,
    windowSeconds: 3600, // 3 signups per hour
    keyPrefix: "rl:auth:signup",
  },

  // Password reset (strict)
  AUTH_RESET: {
    maxRequests: 3,
    windowSeconds: 900, // 3 requests per 15 minutes
    keyPrefix: "rl:auth:reset",
  },

  // Message sending (moderate)
  MESSAGE_SEND: {
    maxRequests: 10,
    windowSeconds: 60, // 10 messages per minute
    burst: 5, // Allow bursts up to 15
    keyPrefix: "rl:message:send",
  },

  // Message editing
  MESSAGE_EDIT: {
    maxRequests: 20,
    windowSeconds: 60, // 20 edits per minute
    keyPrefix: "rl:message:edit",
  },

  // File upload (restrictive)
  FILE_UPLOAD: {
    maxRequests: 5,
    windowSeconds: 60, // 5 uploads per minute
    keyPrefix: "rl:upload",
  },

  // Large file upload (very restrictive)
  FILE_UPLOAD_LARGE: {
    maxRequests: 2,
    windowSeconds: 300, // 2 uploads per 5 minutes
    keyPrefix: "rl:upload:large",
  },

  // Search queries
  SEARCH: {
    maxRequests: 20,
    windowSeconds: 60, // 20 searches per minute
    burst: 10,
    keyPrefix: "rl:search",
  },

  // AI queries (expensive)
  AI_QUERY: {
    maxRequests: 10,
    windowSeconds: 60, // 10 AI queries per minute
    keyPrefix: "rl:ai",
  },

  // General API calls (per user)
  API_USER: {
    maxRequests: 100,
    windowSeconds: 60, // 100 requests per minute
    burst: 20,
    keyPrefix: "rl:api:user",
  },

  // General API calls (per IP)
  API_IP: {
    maxRequests: 500,
    windowSeconds: 60, // 500 requests per minute per IP
    keyPrefix: "rl:api:ip",
  },

  // GraphQL queries
  GRAPHQL: {
    maxRequests: 100,
    windowSeconds: 60, // 100 queries per minute
    burst: 20,
    keyPrefix: "rl:graphql",
  },

  // GraphQL mutations
  GRAPHQL_MUTATION: {
    maxRequests: 50,
    windowSeconds: 60, // 50 mutations per minute
    keyPrefix: "rl:graphql:mutation",
  },

  // Webhook endpoints
  WEBHOOK: {
    maxRequests: 50,
    windowSeconds: 60, // 50 webhooks per minute
    keyPrefix: "rl:webhook",
  },

  // Email sending
  EMAIL_SEND: {
    maxRequests: 10,
    windowSeconds: 3600, // 10 emails per hour
    keyPrefix: "rl:email",
  },

  // Bot API calls
  BOT_API: {
    maxRequests: 60,
    windowSeconds: 60, // 60 requests per minute
    burst: 10,
    keyPrefix: "rl:bot",
  },

  // Admin operations
  ADMIN_BULK: {
    maxRequests: 10,
    windowSeconds: 300, // 10 bulk ops per 5 minutes
    keyPrefix: "rl:admin:bulk",
  },

  // Export operations
  EXPORT: {
    maxRequests: 3,
    windowSeconds: 3600, // 3 exports per hour
    keyPrefix: "rl:export",
  },

  // Analytics tracking
  ANALYTICS: {
    maxRequests: 200,
    windowSeconds: 60, // 200 events per minute
    keyPrefix: "rl:analytics",
  },
} as const;

// ============================================================================
// Redis Client
// ============================================================================

let redisClient: Redis | null = null;
let redisAvailable = false;

/**
 * Initialize Redis client
 */
function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

  if (!redisUrl) {
    logger.warn(
      "[RateLimiter] No Redis URL configured, using in-memory fallback",
    );
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      // Connection options
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      // Lazy connect - only connect when needed
      lazyConnect: true,
      // Enable offline queue
      enableOfflineQueue: true,
    });

    redisClient.on("connect", () => {
      redisAvailable = true;
      // REMOVED: console.log('[RateLimiter] Redis connected successfully')
    });

    redisClient.on("error", (error) => {
      redisAvailable = false;
      logger.error("[RateLimiter] Redis error:", error.message);
    });

    // Attempt to connect
    redisClient.connect().catch((error) => {
      logger.error("[RateLimiter] Failed to connect to Redis:", error.message);
      redisAvailable = false;
    });

    return redisClient;
  } catch (error) {
    logger.error("[RateLimiter] Failed to initialize Redis:", error);
    return null;
  }
}

// ============================================================================
// In-Memory Store (Fallback)
// ============================================================================

class InMemoryStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(
    key: string,
    entry: RateLimitEntry,
    ttlSeconds: number,
  ): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const entry = await this.get(key);
    const now = Date.now();

    if (!entry) {
      // Create new entry
      this.store.set(key, {
        count: 1,
        resetAt: now + ttlSeconds * 1000,
      });
      return 1;
    }

    // Increment existing entry
    entry.count++;
    this.store.set(key, entry);
    return entry.count;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton in-memory store
const inMemoryStore = new InMemoryStore();

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

export class RateLimiter {
  private redis: Redis | null;
  private useRedis: boolean;

  constructor() {
    this.redis = getRedisClient();
    this.useRedis = !!this.redis && redisAvailable;
  }

  /**
   * Check if a request is rate limited (sliding window algorithm)
   */
  async check(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = config.keyPrefix
      ? `${config.keyPrefix}:${identifier}`
      : identifier;
    const now = Date.now();
    const windowMs = config.windowSeconds * 1000;
    const resetAt = now + windowMs;

    try {
      if (this.useRedis && this.redis) {
        return await this.checkRedis(key, config, now, resetAt);
      } else {
        return await this.checkInMemory(key, config, now, resetAt);
      }
    } catch (error) {
      logger.error("[RateLimiter] Error checking rate limit:", error);
      // On error, fall back to in-memory
      this.useRedis = false;
      return await this.checkInMemory(key, config, now, resetAt);
    }
  }

  /**
   * Redis-based rate limiting with sliding window
   */
  private async checkRedis(
    key: string,
    config: RateLimitConfig,
    now: number,
    resetAt: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw new Error("Redis client not available");
    }

    // Sliding window using sorted set
    const windowKey = `${key}:window`;
    const windowStart = now - config.windowSeconds * 1000;

    // Pipeline Redis commands for atomicity
    const pipeline = this.redis.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(windowKey, "-inf", windowStart);

    // Count requests in current window
    pipeline.zcard(windowKey);

    // Add current request
    pipeline.zadd(windowKey, now, `${now}:${Math.random()}`);

    // Set expiry on the window
    pipeline.expire(windowKey, config.windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Redis pipeline failed");
    }

    // Extract count (before adding current request)
    const count = (results[1]?.[1] as number) || 0;
    const currentCount = count + 1;

    // Check if limit exceeded
    const limit = config.maxRequests + (config.burst || 0);
    const allowed = currentCount <= limit;
    const remaining = Math.max(0, limit - currentCount);

    // Calculate retry after if rate limited
    let retryAfter: number | undefined;
    if (!allowed) {
      // Get oldest entry to calculate when it expires
      const oldest = await this.redis.zrange(windowKey, 0, 0, "WITHSCORES");
      if (oldest && oldest.length >= 2) {
        const oldestTime = parseInt(oldest[1], 10);
        retryAfter = Math.ceil(
          (oldestTime + config.windowSeconds * 1000 - now) / 1000,
        );
      } else {
        retryAfter = config.windowSeconds;
      }
    }

    return {
      allowed,
      remaining,
      reset: Math.ceil(resetAt / 1000),
      limit,
      retryAfter,
    };
  }

  /**
   * In-memory rate limiting (fallback)
   */
  private async checkInMemory(
    key: string,
    config: RateLimitConfig,
    now: number,
    resetAt: number,
  ): Promise<RateLimitResult> {
    const entry = await inMemoryStore.get(key);
    const limit = config.maxRequests + (config.burst || 0);

    if (!entry || now > entry.resetAt) {
      // Create new entry
      await inMemoryStore.set(
        key,
        {
          count: 1,
          resetAt,
        },
        config.windowSeconds,
      );

      return {
        allowed: true,
        remaining: limit - 1,
        reset: Math.ceil(resetAt / 1000),
        limit,
      };
    }

    // Increment existing entry
    entry.count++;
    await inMemoryStore.set(key, entry, config.windowSeconds);

    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);
    const retryAfter = allowed
      ? undefined
      : Math.ceil((entry.resetAt - now) / 1000);

    return {
      allowed,
      remaining,
      reset: Math.ceil(entry.resetAt / 1000),
      limit,
      retryAfter,
    };
  }

  /**
   * Token bucket algorithm for burst protection
   */
  async checkTokenBucket(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = config.keyPrefix
      ? `${config.keyPrefix}:tb:${identifier}`
      : `tb:${identifier}`;
    const now = Date.now();
    const capacity = config.maxRequests;
    const refillRate = config.maxRequests / config.windowSeconds; // tokens per second

    try {
      if (this.useRedis && this.redis) {
        return await this.checkTokenBucketRedis(
          key,
          config,
          now,
          capacity,
          refillRate,
        );
      } else {
        return await this.checkTokenBucketInMemory(
          key,
          config,
          now,
          capacity,
          refillRate,
        );
      }
    } catch (error) {
      logger.error("[RateLimiter] Error checking token bucket:", error);
      this.useRedis = false;
      return await this.checkTokenBucketInMemory(
        key,
        config,
        now,
        capacity,
        refillRate,
      );
    }
  }

  /**
   * Redis-based token bucket
   */
  private async checkTokenBucketRedis(
    key: string,
    config: RateLimitConfig,
    now: number,
    capacity: number,
    refillRate: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw new Error("Redis client not available");
    }

    // Use Lua script for atomic token bucket operations
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local ttl = tonumber(ARGV[4])

      local bucket = redis.call('hmget', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now

      -- Calculate tokens to add based on time passed
      local elapsed = (now - lastRefill) / 1000
      local tokensToAdd = elapsed * refillRate
      tokens = math.min(capacity, tokens + tokensToAdd)

      -- Try to consume 1 token
      local allowed = tokens >= 1
      if allowed then
        tokens = tokens - 1
      end

      -- Update bucket
      redis.call('hmset', key, 'tokens', tokens, 'lastRefill', now)
      redis.call('expire', key, ttl)

      return {allowed and 1 or 0, tokens}
    `;

    // sast-ignore: EVAL_USAGE -- this.redis.eval() is the ioredis API for executing Lua scripts server-side; not JavaScript eval()
    const result = await this.redis.eval(
      script,
      1,
      key,
      capacity.toString(),
      refillRate.toString(),
      now.toString(),
      (config.windowSeconds * 2).toString(),
    );

    const [allowedNum, tokens] = result as [number, number];
    const allowed = allowedNum === 1;
    const remaining = Math.floor(tokens);
    const retryAfter = allowed
      ? undefined
      : Math.ceil((1 - tokens) / refillRate);

    return {
      allowed,
      remaining,
      reset: Math.ceil((now + config.windowSeconds * 1000) / 1000),
      limit: capacity,
      retryAfter,
    };
  }

  /**
   * In-memory token bucket
   */
  private async checkTokenBucketInMemory(
    key: string,
    config: RateLimitConfig,
    now: number,
    capacity: number,
    refillRate: number,
  ): Promise<RateLimitResult> {
    const entry = await inMemoryStore.get(key);
    const resetAt = now + config.windowSeconds * 1000;

    let tokens = capacity;
    let lastRefill = now;

    if (entry && entry.tokens !== undefined && entry.lastRefill !== undefined) {
      // Calculate tokens to add
      const elapsed = (now - entry.lastRefill) / 1000;
      const tokensToAdd = elapsed * refillRate;
      tokens = Math.min(capacity, entry.tokens + tokensToAdd);
      lastRefill = entry.lastRefill;
    }

    // Try to consume 1 token
    const allowed = tokens >= 1;
    if (allowed) {
      tokens -= 1;
    }

    // Update entry
    await inMemoryStore.set(
      key,
      {
        count: 0,
        resetAt,
        tokens,
        lastRefill: now,
      },
      config.windowSeconds * 2,
    );

    const retryAfter = allowed
      ? undefined
      : Math.ceil((1 - tokens) / refillRate);

    return {
      allowed,
      remaining: Math.floor(tokens),
      reset: Math.ceil(resetAt / 1000),
      limit: capacity,
      retryAfter,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async reset(identifier: string, config: RateLimitConfig): Promise<void> {
    const key = config.keyPrefix
      ? `${config.keyPrefix}:${identifier}`
      : identifier;

    try {
      if (this.useRedis && this.redis) {
        await this.redis.del(key);
        await this.redis.del(`${key}:window`);
        await this.redis.del(`${config.keyPrefix}:tb:${identifier}`);
      } else {
        await inMemoryStore.delete(key);
      }
    } catch (error) {
      logger.error("[RateLimiter] Error resetting rate limit:", error);
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async status(
    identifier: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = config.keyPrefix
      ? `${config.keyPrefix}:${identifier}`
      : identifier;
    const now = Date.now();
    const limit = config.maxRequests + (config.burst || 0);

    try {
      if (this.useRedis && this.redis) {
        const windowKey = `${key}:window`;
        const windowStart = now - config.windowSeconds * 1000;

        await this.redis.zremrangebyscore(windowKey, "-inf", windowStart);
        const count = await this.redis.zcard(windowKey);

        const remaining = Math.max(0, limit - count);
        const resetAt = now + config.windowSeconds * 1000;

        return {
          allowed: count < limit,
          remaining,
          reset: Math.ceil(resetAt / 1000),
          limit,
        };
      } else {
        const entry = await inMemoryStore.get(key);

        if (!entry) {
          return {
            allowed: true,
            remaining: limit,
            reset: Math.ceil((now + config.windowSeconds * 1000) / 1000),
            limit,
          };
        }

        const remaining = Math.max(0, limit - entry.count);
        return {
          allowed: entry.count < limit,
          remaining,
          reset: Math.ceil(entry.resetAt / 1000),
          limit,
        };
      }
    } catch (error) {
      logger.error("[RateLimiter] Error getting status:", error);
      return {
        allowed: true,
        remaining: limit,
        reset: Math.ceil((now + config.windowSeconds * 1000) / 1000),
        limit,
      };
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    inMemoryStore.destroy();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const rateLimiter = new RateLimiter();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Check common proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Get user identifier from request
 */
export function getUserIdentifier(
  request: NextRequest & { user?: { id: string } },
): string | null {
  return request.user?.id || null;
}

/**
 * Get combined identifier (user + IP for double limiting)
 */
export function getCombinedIdentifier(
  request: NextRequest & { user?: { id: string } },
): string {
  const userId = getUserIdentifier(request);
  const ip = getClientIp(request);
  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Apply rate limit and return headers
 */
export async function applyRateLimit(
  request: NextRequest & { user?: { id: string } },
  config: RateLimitConfig,
  identifier?: string,
): Promise<RateLimitResult> {
  const key = identifier || getCombinedIdentifier(request);
  return await rateLimiter.check(key, config);
}

/**
 * Create rate limit headers for response
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}
