/**
 * AI Rate Limiter
 * - Token bucket algorithm for rate limiting
 * - Redis-backed distributed rate limiting
 * - Per-user, per-org, and per-endpoint limits
 * - Rate limit headers and responses
 * - Sliding window implementation
 */

import { getCache, type RedisCacheService } from "@/lib/redis-cache";
import { captureError, addSentryBreadcrumb } from "@/lib/sentry-utils";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  // Limit configuration
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds

  // Bucket configuration (for token bucket algorithm)
  bucketSize?: number; // Maximum tokens in bucket
  refillRate?: number; // Tokens added per second

  // Advanced options
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyPrefix?: string; // Redis key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until reset
}

export interface RateLimitInfo {
  endpoint: string;
  userId?: string;
  orgId?: string;
  requestCount: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  blocked: boolean;
}

export enum RateLimitType {
  PER_USER = "user",
  PER_ORG = "org",
  PER_ENDPOINT = "endpoint",
  PER_USER_PER_ENDPOINT = "user_endpoint",
  PER_ORG_PER_ENDPOINT = "org_endpoint",
}

// ============================================================================
// Default Configurations
// ============================================================================

export const AI_RATE_LIMITS = {
  // Summarization (per user per hour)
  SUMMARIZE_USER: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Summarization (per org per hour)
  SUMMARIZE_ORG: {
    maxRequests: 500,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Search (per user per minute)
  SEARCH_USER: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },

  // Search (per org per hour)
  SEARCH_ORG: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Chat completions (per user per minute)
  CHAT_USER: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },

  // Chat completions (per org per hour)
  CHAT_ORG: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Embeddings (per user per minute)
  EMBEDDINGS_USER: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },

  // Embeddings (per org per hour)
  EMBEDDINGS_ORG: {
    maxRequests: 5000,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
  private cache: RedisCacheService;
  private _config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this._config = {
      keyPrefix: "ratelimit:ai",
      ...config,
    };
    this.cache = getCache();
  }

  /**
   * Get the rate limiter configuration
   */
  get config(): RateLimitConfig {
    return this._config;
  }

  // ============================================================================
  // Token Bucket Algorithm
  // ============================================================================

  async checkLimit(
    key: string,
    options?: { cost?: number },
  ): Promise<RateLimitResult> {
    const cost = options?.cost || 1;
    const now = Date.now();
    const windowMs = this.config.windowMs;
    const maxRequests = this.config.maxRequests;

    const redisKey = `${this.config.keyPrefix}:${key}`;
    const bucketKey = `${redisKey}:bucket`;
    const timestampKey = `${redisKey}:timestamp`;

    try {
      // Get current bucket state
      const [currentTokens, lastRefill] = await Promise.all([
        this.cache.get<number>(bucketKey),
        this.cache.get<number>(timestampKey),
      ]);

      // Initialize bucket if not exists
      if (currentTokens === null || lastRefill === null) {
        const allowed = cost <= maxRequests;

        if (allowed) {
          await Promise.all([
            this.cache.set(
              bucketKey,
              maxRequests - cost,
              Math.ceil(windowMs / 1000),
            ),
            this.cache.set(timestampKey, now, Math.ceil(windowMs / 1000)),
          ]);
        }

        return {
          allowed,
          limit: maxRequests,
          remaining: allowed ? maxRequests - cost : 0,
          resetAt: new Date(now + windowMs),
        };
      }

      // Calculate token refill
      const bucketSize = this.config.bucketSize || maxRequests;
      const refillRate =
        this.config.refillRate || maxRequests / (windowMs / 1000);
      const timePassed = (now - lastRefill) / 1000; // seconds
      const tokensToAdd = Math.floor(timePassed * refillRate);

      // Update bucket
      const newTokens = Math.min(bucketSize, currentTokens + tokensToAdd);
      const allowed = newTokens >= cost;

      if (allowed) {
        const remaining = newTokens - cost;
        await Promise.all([
          this.cache.set(bucketKey, remaining, Math.ceil(windowMs / 1000)),
          this.cache.set(timestampKey, now, Math.ceil(windowMs / 1000)),
        ]);

        return {
          allowed: true,
          limit: maxRequests,
          remaining,
          resetAt: new Date(now + windowMs),
        };
      } else {
        // Calculate retry after
        const tokensNeeded = cost - newTokens;
        const retryAfter = Math.ceil(tokensNeeded / refillRate);

        return {
          allowed: false,
          limit: maxRequests,
          remaining: newTokens,
          resetAt: new Date(now + windowMs),
          retryAfter,
        };
      }
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "ai-rate-limit" },
        extra: { key, cost },
      });

      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests,
        resetAt: new Date(now + windowMs),
      };
    }
  }

  // ============================================================================
  // Sliding Window Algorithm
  // ============================================================================

  async checkSlidingWindow(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = this.config.windowMs;
    const maxRequests = this.config.maxRequests;

    const redisKey = `${this.config.keyPrefix}:sliding:${key}`;

    try {
      // Get all timestamps in current window
      const timestamps = (await this.cache.get<number[]>(redisKey)) || [];

      // Remove expired timestamps
      const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

      // Check if limit exceeded
      const allowed = validTimestamps.length < maxRequests;

      if (allowed) {
        // Add current timestamp
        validTimestamps.push(now);
        await this.cache.set(
          redisKey,
          validTimestamps,
          Math.ceil(windowMs / 1000),
        );

        return {
          allowed: true,
          limit: maxRequests,
          remaining: maxRequests - validTimestamps.length,
          resetAt: new Date(validTimestamps[0] + windowMs),
        };
      } else {
        // Calculate reset time (when oldest request expires)
        const oldestTimestamp = validTimestamps[0];
        const resetAt = new Date(oldestTimestamp + windowMs);
        const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }
    } catch (error) {
      captureError(error as Error, {
        tags: { feature: "ai-rate-limit-sliding" },
        extra: { key },
      });

      // Fail open
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests,
        resetAt: new Date(now + windowMs),
      };
    }
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  async checkUserLimit(
    userId: string,
    endpoint: string,
  ): Promise<RateLimitResult> {
    const key = `user:${userId}:${endpoint}`;
    addSentryBreadcrumb("ai", "Checking user rate limit", { userId, endpoint });
    return this.checkLimit(key);
  }

  async checkOrgLimit(
    orgId: string,
    endpoint: string,
  ): Promise<RateLimitResult> {
    const key = `org:${orgId}:${endpoint}`;
    addSentryBreadcrumb("ai", "Checking org rate limit", { orgId, endpoint });
    return this.checkLimit(key);
  }

  async checkEndpointLimit(endpoint: string): Promise<RateLimitResult> {
    const key = `endpoint:${endpoint}`;
    addSentryBreadcrumb("ai", "Checking endpoint rate limit", { endpoint });
    return this.checkLimit(key);
  }

  // ============================================================================
  // Rate Limit Info
  // ============================================================================

  async getRateLimitInfo(
    endpoint: string,
    userId?: string,
    orgId?: string,
  ): Promise<RateLimitInfo[]> {
    const info: RateLimitInfo[] = [];

    if (userId) {
      const userLimit = await this.checkUserLimit(userId, endpoint);
      info.push({
        endpoint,
        userId,
        requestCount: userLimit.limit - userLimit.remaining,
        limit: userLimit.limit,
        remaining: userLimit.remaining,
        resetAt: userLimit.resetAt,
        blocked: !userLimit.allowed,
      });
    }

    if (orgId) {
      const orgLimit = await this.checkOrgLimit(orgId, endpoint);
      info.push({
        endpoint,
        orgId,
        requestCount: orgLimit.limit - orgLimit.remaining,
        limit: orgLimit.limit,
        remaining: orgLimit.remaining,
        resetAt: orgLimit.resetAt,
        blocked: !orgLimit.allowed,
      });
    }

    const endpointLimit = await this.checkEndpointLimit(endpoint);
    info.push({
      endpoint,
      requestCount: endpointLimit.limit - endpointLimit.remaining,
      limit: endpointLimit.limit,
      remaining: endpointLimit.remaining,
      resetAt: endpointLimit.resetAt,
      blocked: !endpointLimit.allowed,
    });

    return info;
  }

  // ============================================================================
  // Reset Methods
  // ============================================================================

  async resetUserLimit(userId: string, endpoint: string): Promise<void> {
    const key = `${this.config.keyPrefix}:user:${userId}:${endpoint}`;
    await this.cache.del(key);
    await this.cache.del(`${key}:bucket`);
    await this.cache.del(`${key}:timestamp`);
  }

  async resetOrgLimit(orgId: string, endpoint: string): Promise<void> {
    const key = `${this.config.keyPrefix}:org:${orgId}:${endpoint}`;
    await this.cache.del(key);
    await this.cache.del(`${key}:bucket`);
    await this.cache.del(`${key}:timestamp`);
  }

  async resetAllLimits(userId?: string, orgId?: string): Promise<void> {
    if (userId) {
      await this.cache.deletePattern(
        `${this.config.keyPrefix}:user:${userId}:*`,
      );
    }
    if (orgId) {
      await this.cache.deletePattern(`${this.config.keyPrefix}:org:${orgId}:*`);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

const limiterInstances = new Map<string, RateLimiter>();

export function getRateLimiter(
  name: string,
  config: RateLimitConfig,
): RateLimiter {
  if (!limiterInstances.has(name)) {
    limiterInstances.set(name, new RateLimiter(config));
  }
  return limiterInstances.get(name)!;
}

// Pre-configured limiters
export function getSummarizeUserLimiter(): RateLimiter {
  return getRateLimiter("summarize_user", AI_RATE_LIMITS.SUMMARIZE_USER);
}

export function getSummarizeOrgLimiter(): RateLimiter {
  return getRateLimiter("summarize_org", AI_RATE_LIMITS.SUMMARIZE_ORG);
}

export function getSearchUserLimiter(): RateLimiter {
  return getRateLimiter("search_user", AI_RATE_LIMITS.SEARCH_USER);
}

export function getSearchOrgLimiter(): RateLimiter {
  return getRateLimiter("search_org", AI_RATE_LIMITS.SEARCH_ORG);
}

export function getChatUserLimiter(): RateLimiter {
  return getRateLimiter("chat_user", AI_RATE_LIMITS.CHAT_USER);
}

export function getChatOrgLimiter(): RateLimiter {
  return getRateLimiter("chat_org", AI_RATE_LIMITS.CHAT_ORG);
}

export function getEmbeddingsUserLimiter(): RateLimiter {
  return getRateLimiter("embeddings_user", AI_RATE_LIMITS.EMBEDDINGS_USER);
}

export function getEmbeddingsOrgLimiter(): RateLimiter {
  return getRateLimiter("embeddings_org", AI_RATE_LIMITS.EMBEDDINGS_ORG);
}

// ============================================================================
// Middleware Helper
// ============================================================================

export interface RateLimitCheckOptions {
  userId?: string;
  orgId?: string;
  endpoint: string;
  userLimiter?: RateLimiter;
  orgLimiter?: RateLimiter;
}

export async function checkAIRateLimit(
  options: RateLimitCheckOptions,
): Promise<RateLimitResult> {
  const { userId, orgId, endpoint, userLimiter, orgLimiter } = options;

  // Check user limit first (most restrictive)
  if (userId && userLimiter) {
    const userLimit = await userLimiter.checkUserLimit(userId, endpoint);
    if (!userLimit.allowed) {
      return userLimit;
    }
  }

  // Check org limit
  if (orgId && orgLimiter) {
    const orgLimit = await orgLimiter.checkOrgLimit(orgId, endpoint);
    if (!orgLimit.allowed) {
      return orgLimit;
    }
  }

  // All checks passed
  return {
    allowed: true,
    limit: userLimiter?.config.maxRequests || 0,
    remaining: 0,
    resetAt: new Date(),
  };
}

// ============================================================================
// Response Headers Helper
// ============================================================================

export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.floor(result.resetAt.getTime() / 1000).toString(),
    ...(result.retryAfter && {
      "Retry-After": result.retryAfter.toString(),
    }),
  };
}
