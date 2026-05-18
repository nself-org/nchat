/**
 * Rate Limiter
 *
 * In-memory rate limiting for API routes.
 * For production, use Redis or a dedicated rate limiting service.
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Max requests per interval
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   */
  async check(
    identifier: string,
    config: RateLimitConfig = { interval: 60000, maxRequests: 100 },
  ): Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No entry or entry expired
    if (!entry || now > entry.resetTime) {
      this.store.set(identifier, {
        count: 1,
        resetTime: now + config.interval,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        reset: now + config.interval,
      };
    }

    // Entry exists and not expired
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.store.set(identifier, entry);

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        reset: entry.resetTime,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// =============================================================================
// Rate Limit Configurations
// =============================================================================

export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH: {
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },

  // API endpoints (per user)
  API_USER: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },

  // API endpoints (per IP)
  API_IP: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 500, // 500 requests per minute per IP
  },

  // GraphQL queries
  GRAPHQL: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 queries per minute
  },

  // File uploads
  UPLOAD: {
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 uploads per hour
  },

  // WebSocket connections
  WS_CONNECT: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 connections per minute
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get identifier from request (IP or user ID)
 */
export function getIdentifier(
  req: Request | { ip?: string; userId?: string },
): string {
  if ("userId" in req && req.userId) {
    return `user:${req.userId}`;
  }

  if ("ip" in req && req.ip) {
    return `ip:${req.ip}`;
  }

  // Fallback to 'unknown' (not ideal, but prevents crashes)
  return "unknown";
}

/**
 * Apply rate limit to API route
 */
export async function applyRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const result = await rateLimiter.check(identifier, config);

  return {
    allowed: result.allowed,
    headers: {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
    },
  };
}

/**
 * Create rate limit middleware for API routes
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: Request & { ip?: string; userId?: string }) => {
    const identifier = getIdentifier(req);
    const result = await applyRateLimit(identifier, config);

    if (!result.allowed) {
      return {
        error: "Too many requests",
        status: 429,
        headers: result.headers,
      };
    }

    return {
      allowed: true,
      headers: result.headers,
    };
  };
}
