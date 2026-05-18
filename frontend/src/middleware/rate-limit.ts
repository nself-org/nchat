/**
 * Rate Limiting Middleware
 *
 * Edge-compatible rate limiting middleware for Next.js.
 * Applies rate limits at the middleware layer for optimal performance.
 *
 * Features:
 * - Sliding window algorithm for accurate rate limiting
 * - User tier-based limits (guest, member, premium, enterprise, admin)
 * - Per-endpoint and per-category configurations
 * - Penalty box for abuse prevention
 * - Standard rate limit headers (X-RateLimit-*)
 * - Graceful degradation
 *
 * @module middleware/rate-limit
 */

import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Burst allowance */
  burst?: number;
  /** Custom key prefix */
  keyPrefix?: string;
  /** Request cost multiplier */
  cost?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  limit: number;
  retryAfter?: number;
  current: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: number[];
  lastRequest?: number;
}

/**
 * User tier for rate limit multipliers
 */
export type UserTier =
  | "guest"
  | "member"
  | "premium"
  | "enterprise"
  | "admin"
  | "internal";

/**
 * Tier multipliers for rate limits
 */
export const TIER_MULTIPLIERS: Record<UserTier, number> = {
  guest: 0.5, // 50% of base limit
  member: 1.0, // 100% of base limit
  premium: 2.0, // 200% of base limit
  enterprise: 5.0, // 500% of base limit
  admin: 10.0, // 1000% of base limit
  internal: 100.0, // Effectively unlimited
};

// ============================================================================
// Edge-Compatible In-Memory Store
// ============================================================================

class EdgeRateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private readonly MAX_ENTRIES = 50000;

  /**
   * Check rate limit using sliding window algorithm
   */
  check(key: string, config: RateLimitConfig): RateLimitResult {
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
      // Create new entry
      entry = {
        count: cost,
        resetAt: now + windowMs,
        requests: [now],
        lastRequest: now,
      };
      this.store.set(key, entry);

      return {
        allowed: true,
        remaining: limit - cost,
        reset: Math.ceil((now + windowMs) / 1000),
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

    // Update reset time based on oldest request
    if (entry.requests.length > 0) {
      entry.resetAt = entry.requests[0] + windowMs;
    } else {
      entry.resetAt = now + windowMs;
    }

    this.store.set(key, entry);

    const remaining = Math.max(0, limit - entry.count);

    // Calculate retry after if rate limited
    let retryAfter: number | undefined;
    if (!allowed && entry.requests.length > 0) {
      const oldestRequest = entry.requests[0];
      retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
    }

    return {
      allowed,
      remaining,
      reset: Math.ceil(entry.resetAt / 1000),
      limit,
      retryAfter,
      current: entry.count,
    };
  }

  /**
   * Get current status without incrementing
   */
  status(key: string, config: RateLimitConfig): RateLimitResult {
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

    // Sliding window: count requests in window
    const windowStart = now - windowMs;
    const requestsInWindow = entry.requests.filter(
      (timestamp) => timestamp > windowStart,
    );
    const count = requestsInWindow.length;
    const remaining = Math.max(0, limit - count);
    const allowed = count < limit;

    let resetAt = now + windowMs;
    if (requestsInWindow.length > 0) {
      resetAt = requestsInWindow[0] + windowMs;
    }

    return {
      allowed,
      remaining,
      reset: Math.ceil(resetAt / 1000),
      limit,
      current: count,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - now) / 1000),
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
        deleted++;
      }
    }

    // Emergency cleanup if over max entries
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

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
  }
}

// Singleton store instance
const edgeStore = new EdgeRateLimitStore();

// ============================================================================
// Penalty Box for Abuse Prevention
// ============================================================================

interface PenaltyBoxEntry {
  identifier: string;
  reason: string;
  expiresAt: number;
  violations: number;
}

const penaltyBox = new Map<string, PenaltyBoxEntry>();
const violations = new Map<string, number>();
const VIOLATION_THRESHOLD = 10;
const PENALTY_DURATION = 3600 * 1000; // 1 hour

/**
 * Add IP/user to penalty box
 */
export function addToPenaltyBox(
  identifier: string,
  reason: string,
  durationMs: number = PENALTY_DURATION,
): void {
  const entry: PenaltyBoxEntry = {
    identifier,
    reason,
    expiresAt: Date.now() + durationMs,
    violations: violations.get(identifier) || 0,
  };
  penaltyBox.set(identifier, entry);
  violations.delete(identifier);
}

/**
 * Check if IP/user is in penalty box
 */
export function isInPenaltyBox(identifier: string): boolean {
  const entry = penaltyBox.get(identifier);
  if (!entry) return false;

  if (Date.now() > entry.expiresAt) {
    penaltyBox.delete(identifier);
    return false;
  }

  return true;
}

/**
 * Get penalty box unblock time
 */
export function getPenaltyBoxUnblockTime(identifier: string): number | null {
  const entry = penaltyBox.get(identifier);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    penaltyBox.delete(identifier);
    return null;
  }

  return Math.ceil((entry.expiresAt - Date.now()) / 1000);
}

/**
 * Remove from penalty box
 */
export function removeFromPenaltyBox(identifier: string): void {
  penaltyBox.delete(identifier);
}

/**
 * Record a rate limit violation
 */
function recordViolation(identifier: string): void {
  const current = violations.get(identifier) || 0;
  const newCount = current + 1;
  violations.set(identifier, newCount);

  if (newCount >= VIOLATION_THRESHOLD) {
    addToPenaltyBox(identifier, `Exceeded rate limit ${newCount} times`);
  }
}

// ============================================================================
// Rate Limit Configurations by Endpoint
// ============================================================================

export const ENDPOINT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Authentication endpoints - strict limits
  "/api/auth/signin": {
    maxRequests: 5,
    windowSeconds: 60, // 5 per minute
    keyPrefix: "rl:auth:signin",
  },
  "/api/auth/signup": {
    maxRequests: 3,
    windowSeconds: 3600, // 3 per hour
    keyPrefix: "rl:auth:signup",
  },
  "/api/auth/2fa/verify": {
    maxRequests: 5,
    windowSeconds: 300, // 5 per 5 minutes
    keyPrefix: "rl:auth:2fa",
  },
  "/api/auth/2fa/setup": {
    maxRequests: 3,
    windowSeconds: 300, // 3 per 5 minutes
    keyPrefix: "rl:auth:2fa:setup",
  },
  "/api/auth/change-password": {
    maxRequests: 3,
    windowSeconds: 900, // 3 per 15 minutes
    keyPrefix: "rl:auth:password",
  },
  "/api/auth/verify-password": {
    maxRequests: 5,
    windowSeconds: 300, // 5 per 5 minutes
    keyPrefix: "rl:auth:verify",
  },
  "/api/auth/oauth": {
    maxRequests: 10,
    windowSeconds: 60, // 10 per minute
    keyPrefix: "rl:auth:oauth",
  },

  // Message endpoints - moderate limits
  "/api/messages": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute (sending)
    burst: 10,
    keyPrefix: "rl:messages",
  },

  // File upload endpoints - strict limits
  "/api/storage": {
    maxRequests: 10,
    windowSeconds: 60, // 10 per minute
    keyPrefix: "rl:storage",
  },
  "/api/upload": {
    maxRequests: 10,
    windowSeconds: 60, // 10 per minute
    keyPrefix: "rl:upload",
  },

  // Search endpoints - moderate with burst
  "/api/search": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    burst: 20,
    keyPrefix: "rl:search",
  },
  "/api/search/suggestions": {
    maxRequests: 120,
    windowSeconds: 60, // 120 per minute (faster for autocomplete)
    burst: 30,
    keyPrefix: "rl:search:suggest",
  },

  // AI endpoints - strict limits (expensive operations)
  "/api/ai": {
    maxRequests: 20,
    windowSeconds: 60, // 20 per minute
    burst: 5,
    keyPrefix: "rl:ai",
  },
  "/api/ai/search": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:ai:search",
  },
  "/api/ai/embed": {
    maxRequests: 10,
    windowSeconds: 60, // 10 per minute
    keyPrefix: "rl:ai:embed",
  },
  "/api/ai/digest": {
    maxRequests: 5,
    windowSeconds: 60, // 5 per minute
    keyPrefix: "rl:ai:digest",
  },
  "/api/translate": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:translate",
  },

  // Export endpoints - very strict (resource intensive)
  "/api/export": {
    maxRequests: 5,
    windowSeconds: 3600, // 5 per hour
    keyPrefix: "rl:export",
  },
  "/api/compliance/export": {
    maxRequests: 3,
    windowSeconds: 3600, // 3 per hour
    keyPrefix: "rl:compliance:export",
  },
  "/api/analytics/export": {
    maxRequests: 5,
    windowSeconds: 3600, // 5 per hour
    keyPrefix: "rl:analytics:export",
  },
  "/api/audit/export": {
    maxRequests: 3,
    windowSeconds: 3600, // 3 per hour
    keyPrefix: "rl:audit:export",
  },

  // Analytics endpoints
  "/api/analytics": {
    maxRequests: 100,
    windowSeconds: 60, // 100 per minute
    keyPrefix: "rl:analytics",
  },

  // Webhook endpoints - high limits
  "/api/webhook": {
    maxRequests: 100,
    windowSeconds: 60, // 100 per minute
    burst: 50,
    keyPrefix: "rl:webhook",
  },

  // Bot API endpoints - moderate limits
  "/api/bots": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    burst: 20,
    keyPrefix: "rl:bots",
  },

  // Admin endpoints - higher limits for authenticated admins
  "/api/admin": {
    maxRequests: 200,
    windowSeconds: 60, // 200 per minute
    burst: 50,
    keyPrefix: "rl:admin",
  },

  // Channels
  "/api/channels": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    burst: 20,
    keyPrefix: "rl:channels",
  },

  // Users
  "/api/users": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    burst: 20,
    keyPrefix: "rl:users",
  },

  // Polls
  "/api/polls": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    burst: 10,
    keyPrefix: "rl:polls",
  },

  // Calls (WebRTC)
  "/api/calls": {
    maxRequests: 20,
    windowSeconds: 60, // 20 per minute
    keyPrefix: "rl:calls",
  },

  // Link preview
  "/api/link-preview": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:linkpreview",
  },

  // URL unfurl - moderate limits with SSRF protection
  "/api/unfurl": {
    maxRequests: 20,
    windowSeconds: 60, // 20 per minute
    keyPrefix: "rl:unfurl",
  },

  // GIF search
  "/api/gif": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    burst: 20,
    keyPrefix: "rl:gif",
  },

  // Config
  "/api/config": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:config",
  },

  // Health checks - high limits
  "/api/health": {
    maxRequests: 300,
    windowSeconds: 60, // 300 per minute
    keyPrefix: "rl:health",
  },
  "/api/ready": {
    maxRequests: 300,
    windowSeconds: 60, // 300 per minute
    keyPrefix: "rl:ready",
  },

  // Billing - moderate limits
  "/api/billing": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:billing",
  },

  // Email sending - strict limits
  "/api/email/send": {
    maxRequests: 10,
    windowSeconds: 60, // 10 per minute
    keyPrefix: "rl:email",
  },

  // Moderation - moderate limits
  "/api/moderation": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    keyPrefix: "rl:moderation",
  },

  // Social media
  "/api/social": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:social",
  },

  // Tenants
  "/api/tenants": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:tenants",
  },

  // CSRF token
  "/api/csrf": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    keyPrefix: "rl:csrf",
  },

  // CSP reports
  "/api/csp-report": {
    maxRequests: 100,
    windowSeconds: 60, // 100 per minute
    keyPrefix: "rl:csp",
  },

  // Metrics
  "/api/metrics": {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    keyPrefix: "rl:metrics",
  },

  // Workers
  "/api/workers": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:workers",
  },

  // Compliance
  "/api/compliance": {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute
    keyPrefix: "rl:compliance",
  },
};

// Default rate limit for all API routes
export const DEFAULT_API_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60, // 100 per minute
  burst: 30,
  keyPrefix: "rl:api:default",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers in order of preference
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

  // Vercel
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  return "127.0.0.1";
}

/**
 * Get user ID from request (if authenticated)
 */
export function getUserId(request: NextRequest): string | null {
  // Try to extract user ID from session cookie
  const sessionCookie =
    request.cookies.get("nchat-session")?.value ||
    request.cookies.get("nhostSession")?.value ||
    request.cookies.get("nchat-dev-session")?.value;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      return parsed.userId || parsed.sub || null;
    } catch {
      // Ignore parsing errors
    }
  }

  // Try to extract from JWT in Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.sub || payload.userId || null;
      }
    } catch {
      // Ignore parsing errors
    }
  }

  return null;
}

/**
 * Get user tier from request
 */
export function getUserTier(request: NextRequest): UserTier {
  // Try to extract from session/token
  const sessionCookie =
    request.cookies.get("nchat-session")?.value ||
    request.cookies.get("nhostSession")?.value ||
    request.cookies.get("nchat-dev-session")?.value;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      const role = parsed.role || parsed["x-hasura-default-role"];
      if (role === "owner" || role === "admin") return "admin";
      if (role === "premium") return "premium";
      if (role === "enterprise") return "enterprise";
      if (role === "guest") return "guest";
      return "member";
    } catch {
      // Ignore
    }
  }

  // Check for internal service header
  const internalKey = request.headers.get("x-internal-key");
  if (internalKey === process.env.INTERNAL_SERVICE_KEY) {
    return "internal";
  }

  // Check for API key tier
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    // In production, you'd look up the API key to determine tier
    // For now, treat API keys as member tier
    return "member";
  }

  // No authentication = guest
  const userId = getUserId(request);
  return userId ? "member" : "guest";
}

/**
 * Get rate limit identifier for request
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  const userId = getUserId(request);
  const ip = getClientIp(request);

  // Prefer user ID over IP for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${ip}`;
}

/**
 * Get rate limit configuration for a path
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  // Check for exact match
  if (ENDPOINT_RATE_LIMITS[pathname]) {
    return ENDPOINT_RATE_LIMITS[pathname];
  }

  // Check for prefix match (sorted by specificity - longer paths first)
  const sortedEndpoints = Object.entries(ENDPOINT_RATE_LIMITS).sort(
    (a, b) => b[0].length - a[0].length,
  );

  for (const [path, config] of sortedEndpoints) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }

  // Return default
  return DEFAULT_API_RATE_LIMIT;
}

/**
 * Apply tier multiplier to rate limit
 */
export function applyTierMultiplier(
  config: RateLimitConfig,
  tier: UserTier,
): RateLimitConfig {
  const multiplier = TIER_MULTIPLIERS[tier];

  return {
    ...config,
    maxRequests: Math.floor(config.maxRequests * multiplier),
    burst: config.burst ? Math.floor(config.burst * multiplier) : undefined,
  };
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const response = NextResponse.json(
    {
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${result.retryAfter || 60} seconds.`,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: result.retryAfter,
    },
    { status: 429 },
  );

  // Add rate limit headers
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", "0");
  response.headers.set("X-RateLimit-Reset", result.reset.toString());

  if (result.retryAfter) {
    response.headers.set("Retry-After", result.retryAfter.toString());
  }

  return response;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());

  if (result.retryAfter) {
    response.headers.set("Retry-After", result.retryAfter.toString());
  }

  return response;
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Check if path should have rate limiting applied
 */
export function shouldApplyRateLimit(pathname: string): boolean {
  // Always rate limit API routes
  if (pathname.startsWith("/api/")) {
    return true;
  }

  // Don't rate limit static files
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2)$/)
  ) {
    return false;
  }

  return false;
}

/**
 * Check if request should bypass rate limiting
 */
export function shouldBypassRateLimit(request: NextRequest): boolean {
  // Check for internal service key
  const internalKey = request.headers.get("x-internal-key");
  if (internalKey && internalKey === process.env.INTERNAL_SERVICE_KEY) {
    return true;
  }

  // Check for bypass token (for testing/debugging)
  const bypassToken = request.headers.get("x-ratelimit-bypass");
  if (bypassToken && bypassToken === process.env.RATELIMIT_BYPASS_TOKEN) {
    return true;
  }

  return false;
}

/**
 * Apply rate limiting to request
 */
export function applyRateLimit(
  request: NextRequest,
  pathname: string,
): RateLimitResult {
  const identifier = getRateLimitIdentifier(request);
  const tier = getUserTier(request);
  const baseConfig = getRateLimitConfig(pathname);
  const config = applyTierMultiplier(baseConfig, tier);

  const key = `${config.keyPrefix}:${identifier}`;
  const result = edgeStore.check(key, config);

  // Record violation if rate limited
  if (!result.allowed) {
    recordViolation(identifier);
  }

  return result;
}

/**
 * Rate limiting middleware for Next.js
 */
export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  // Skip if rate limiting shouldn't be applied
  if (!shouldApplyRateLimit(pathname)) {
    return null;
  }

  // Skip if bypass is allowed
  if (shouldBypassRateLimit(request)) {
    return null;
  }

  // Check penalty box first
  const identifier = getRateLimitIdentifier(request);
  if (isInPenaltyBox(identifier)) {
    const retryAfter = getPenaltyBoxUnblockTime(identifier) || 3600;

    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Your access has been temporarily blocked due to abuse",
        code: "IP_BLOCKED",
        retryAfter,
      },
      {
        status: 403,
        headers: {
          "Retry-After": retryAfter.toString(),
        },
      },
    );
  }

  // Apply rate limit
  const result = applyRateLimit(request, pathname);

  // Return 429 if rate limited
  if (!result.allowed) {
    return createRateLimitResponse(result);
  }

  // Allow request to proceed (headers will be added in response)
  return null;
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(
  request: NextRequest,
  pathname: string,
): RateLimitResult {
  const identifier = getRateLimitIdentifier(request);
  const tier = getUserTier(request);
  const baseConfig = getRateLimitConfig(pathname);
  const config = applyTierMultiplier(baseConfig, tier);

  const key = `${config.keyPrefix}:${identifier}`;
  return edgeStore.status(key, config);
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(
  identifier: string,
  config: RateLimitConfig,
): void {
  const key = `${config.keyPrefix}:${identifier}`;
  edgeStore.reset(key);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  edgeStore.clear();
  penaltyBox.clear();
  violations.clear();
}

// ============================================================================
// Advanced Features
// ============================================================================

/**
 * Rate limit by custom key (e.g., API key, email address)
 */
export function rateLimitByKey(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const fullKey = `${config.keyPrefix}:custom:${key}`;
  return edgeStore.check(fullKey, config);
}

/**
 * Check penalty box and return response if blocked
 */
export function checkPenaltyBox(request: NextRequest): NextResponse | null {
  const identifier = getRateLimitIdentifier(request);

  if (isInPenaltyBox(identifier)) {
    const retryAfter = getPenaltyBoxUnblockTime(identifier) || 3600;

    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Your access has been temporarily blocked due to abuse",
        code: "IP_BLOCKED",
        retryAfter,
      },
      {
        status: 403,
        headers: {
          "Retry-After": retryAfter.toString(),
        },
      },
    );
  }

  return null;
}

/**
 * Get rate limit info for a request (for debugging/admin)
 */
export function getRateLimitInfo(request: NextRequest): {
  identifier: string;
  tier: UserTier;
  config: RateLimitConfig;
  status: RateLimitResult;
  inPenaltyBox: boolean;
  violations: number;
} {
  const { pathname } = request.nextUrl;
  const identifier = getRateLimitIdentifier(request);
  const tier = getUserTier(request);
  const config = getRateLimitConfig(pathname);
  const status = getRateLimitStatus(request, pathname);

  return {
    identifier,
    tier,
    config,
    status,
    inPenaltyBox: isInPenaltyBox(identifier),
    violations: violations.get(identifier) || 0,
  };
}
