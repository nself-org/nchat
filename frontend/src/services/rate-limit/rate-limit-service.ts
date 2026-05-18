/**
 * Rate Limit Service
 *
 * Unified rate limiting service with automatic fallback from Redis to memory.
 * Provides a high-level API for rate limiting with user tiers and endpoint categories.
 *
 * Features:
 * - Automatic store selection (Redis -> Memory)
 * - User tier-based rate limits
 * - Per-endpoint and per-category configurations
 * - Penalty box for abuse prevention
 * - WebSocket connection limiting
 * - GraphQL query cost analysis
 *
 * @module services/rate-limit/rate-limit-service
 */

import type {
  RateLimitStore,
  RateLimitConfig,
  RateLimitResult,
  RateLimitMetadata,
  UserTier,
  TierMultipliers,
  PenaltyBoxEntry,
  EndpointCategory,
  DEFAULT_TIER_MULTIPLIERS,
} from "./types";

import { getRedisStore, createRedisStore } from "./redis-store";
import {
  getMemoryStore,
  createMemoryStore,
  getEdgeStore,
} from "./memory-store";

import { logger } from "@/lib/logger";

// ============================================================================
// Rate Limit Configurations
// ============================================================================

/**
 * Default rate limit configurations by category
 */
export const RATE_LIMIT_CONFIGS: Record<EndpointCategory, RateLimitConfig> = {
  // Authentication - very strict
  auth: {
    maxRequests: 5,
    windowSeconds: 60, // 5 per minute
    keyPrefix: "rl:auth",
  },
  auth_sensitive: {
    maxRequests: 3,
    windowSeconds: 300, // 3 per 5 minutes (password reset, 2FA setup)
    keyPrefix: "rl:auth:sensitive",
  },

  // Messages - moderate limits
  messages: {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute for reading
    burst: 20,
    keyPrefix: "rl:messages",
  },
  messages_create: {
    maxRequests: 30,
    windowSeconds: 60, // 30 per minute for sending
    burst: 10,
    keyPrefix: "rl:messages:create",
  },

  // File uploads - strict
  file_upload: {
    maxRequests: 10,
    windowSeconds: 60, // 10 per minute
    keyPrefix: "rl:upload",
  },

  // Search - moderate
  search: {
    maxRequests: 60,
    windowSeconds: 60, // 60 per minute
    burst: 20,
    keyPrefix: "rl:search",
  },

  // General API - standard
  api_general: {
    maxRequests: 100,
    windowSeconds: 60, // 100 per minute
    burst: 50,
    keyPrefix: "rl:api",
  },

  // GraphQL - moderate with burst
  graphql: {
    maxRequests: 120,
    windowSeconds: 60, // 120 per minute
    burst: 30,
    keyPrefix: "rl:graphql",
  },

  // WebSocket connections - per connection limit
  websocket: {
    maxRequests: 5,
    windowSeconds: 60, // 5 connections per minute
    keyPrefix: "rl:ws",
  },

  // Admin endpoints - higher limits
  admin: {
    maxRequests: 200,
    windowSeconds: 60, // 200 per minute
    burst: 50,
    keyPrefix: "rl:admin",
  },

  // Webhooks - high limits
  webhook: {
    maxRequests: 100,
    windowSeconds: 60,
    burst: 50,
    keyPrefix: "rl:webhook",
  },

  // Bot API - moderate
  bot: {
    maxRequests: 60,
    windowSeconds: 60,
    burst: 20,
    keyPrefix: "rl:bot",
  },

  // AI endpoints - strict
  ai: {
    maxRequests: 20,
    windowSeconds: 60, // 20 per minute
    burst: 5,
    keyPrefix: "rl:ai",
  },

  // Export endpoints - very strict
  export: {
    maxRequests: 5,
    windowSeconds: 3600, // 5 per hour
    keyPrefix: "rl:export",
  },
};

/**
 * Endpoint path to category mapping
 */
export const ENDPOINT_CATEGORY_MAP: Record<string, EndpointCategory> = {
  // Auth endpoints
  "/api/auth/signin": "auth",
  "/api/auth/signup": "auth",
  "/api/auth/change-password": "auth_sensitive",
  "/api/auth/2fa": "auth_sensitive",
  "/api/auth/verify-password": "auth_sensitive",
  "/api/auth/oauth": "auth",
  "/api/auth/sessions": "auth",

  // Message endpoints
  "/api/messages": "messages",

  // File uploads
  "/api/storage": "file_upload",
  "/api/upload": "file_upload",

  // Search
  "/api/search": "search",
  "/api/ai/search": "search",

  // AI endpoints
  "/api/ai": "ai",
  "/api/ai/embed": "ai",
  "/api/ai/digest": "ai",
  "/api/translate": "ai",

  // Admin endpoints
  "/api/admin": "admin",

  // Bot endpoints
  "/api/bots": "bot",

  // Webhook endpoints
  "/api/webhook": "webhook",

  // Export endpoints
  "/api/export": "export",
  "/api/compliance/export": "export",
  "/api/analytics/export": "export",
  "/api/audit/export": "export",

  // GraphQL
  "/api/graphql": "graphql",
  "/v1/graphql": "graphql",
};

// ============================================================================
// Rate Limit Service Class
// ============================================================================

export interface RateLimitServiceOptions {
  /** Force a specific store type */
  storeType?: "redis" | "memory" | "edge" | "auto";
  /** Custom tier multipliers */
  tierMultipliers?: Partial<TierMultipliers>;
  /** Enable penalty box */
  enablePenaltyBox?: boolean;
  /** Penalty box violation threshold */
  violationThreshold?: number;
  /** Penalty box duration in seconds */
  penaltyDuration?: number;
  /** Bypass tokens for internal services */
  bypassTokens?: string[];
  /** Admin user IDs that bypass limits */
  adminBypassIds?: string[];
}

export class RateLimitService {
  private store: RateLimitStore | null = null;
  private storeInitPromise: Promise<void> | null = null;
  private readonly options: Required<RateLimitServiceOptions>;
  private readonly penaltyBox = new Map<string, PenaltyBoxEntry>();
  private readonly violations = new Map<string, number>();

  constructor(options: RateLimitServiceOptions = {}) {
    this.options = {
      storeType: options.storeType || "auto",
      tierMultipliers: {
        guest: 0.5,
        member: 1.0,
        premium: 2.0,
        enterprise: 5.0,
        admin: 10.0,
        internal: 100.0,
        ...options.tierMultipliers,
      } as TierMultipliers,
      enablePenaltyBox: options.enablePenaltyBox ?? true,
      violationThreshold: options.violationThreshold || 10,
      penaltyDuration: options.penaltyDuration || 3600, // 1 hour
      bypassTokens: options.bypassTokens || [],
      adminBypassIds: options.adminBypassIds || [],
    };
  }

  /**
   * Initialize the store
   */
  private async initStore(): Promise<void> {
    if (this.store) return;

    if (this.storeInitPromise) {
      await this.storeInitPromise;
      return;
    }

    this.storeInitPromise = this.doInitStore();
    await this.storeInitPromise;
    this.storeInitPromise = null;
  }

  private async doInitStore(): Promise<void> {
    const { storeType } = this.options;

    if (storeType === "edge") {
      this.store = getEdgeStore();
      // REMOVED: console.log('[RateLimitService] Using edge memory store')
      return;
    }

    if (storeType === "memory") {
      this.store = getMemoryStore();
      // REMOVED: console.log('[RateLimitService] Using memory store')
      return;
    }

    if (storeType === "redis") {
      try {
        const redisStore = getRedisStore();
        const isHealthy = await redisStore.isHealthy();
        if (isHealthy) {
          this.store = redisStore;
          // REMOVED: console.log('[RateLimitService] Using Redis store')
          return;
        }
      } catch (error) {
        logger.error("[RateLimitService] Failed to connect to Redis:", error);
      }
      throw new Error("Redis store requested but not available");
    }

    // Auto mode: try Redis first, fallback to memory
    if (storeType === "auto") {
      // Check if Redis is configured
      const redisConfigured = !!(
        process.env.REDIS_URL || process.env.REDIS_HOST
      );

      if (redisConfigured) {
        try {
          const redisStore = getRedisStore();
          // Wait a bit for connection
          await new Promise((resolve) => setTimeout(resolve, 100));
          const isHealthy = await redisStore.isHealthy();

          if (isHealthy) {
            this.store = redisStore;
            // REMOVED: console.log('[RateLimitService] Using Redis store (auto-detected)')
            return;
          }
        } catch (error) {
          logger.warn(
            "[RateLimitService] Redis not available, falling back to memory:",
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      // Fallback to memory store
      this.store = getMemoryStore();
      // REMOVED: console.log('[RateLimitService] Using memory store (fallback)')
    }
  }

  /**
   * Get the current store
   */
  private async getStore(): Promise<RateLimitStore> {
    await this.initStore();
    if (!this.store) {
      throw new Error("Rate limit store not initialized");
    }
    return this.store;
  }

  /**
   * Calculate effective limit based on user tier
   */
  private getEffectiveLimit(baseLimit: number, tier?: UserTier): number {
    if (!tier) return baseLimit;

    const multiplier = this.options.tierMultipliers[tier] || 1.0;
    return Math.floor(baseLimit * multiplier);
  }

  /**
   * Check if identifier should bypass rate limiting
   */
  private shouldBypass(metadata?: RateLimitMetadata): boolean {
    if (!metadata) return false;

    // Check bypass tokens
    if (
      metadata.apiKey &&
      this.options.bypassTokens.includes(metadata.apiKey)
    ) {
      return true;
    }

    // Check admin bypass
    if (
      metadata.userId &&
      this.options.adminBypassIds.includes(metadata.userId)
    ) {
      return true;
    }

    // Internal tier bypasses
    if (metadata.userRole === "internal") {
      return true;
    }

    return false;
  }

  /**
   * Check if identifier is in penalty box
   */
  isBlocked(identifier: string): PenaltyBoxEntry | null {
    const entry = this.penaltyBox.get(identifier);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.penaltyBox.delete(identifier);
      return null;
    }

    return entry;
  }

  /**
   * Record a violation
   */
  private recordViolation(identifier: string, reason: string): void {
    if (!this.options.enablePenaltyBox) return;

    const current = this.violations.get(identifier) || 0;
    const newCount = current + 1;
    this.violations.set(identifier, newCount);

    if (newCount >= this.options.violationThreshold) {
      // Add to penalty box
      const entry: PenaltyBoxEntry = {
        identifier,
        reason: `Exceeded rate limit ${newCount} times: ${reason}`,
        expiresAt: Date.now() + this.options.penaltyDuration * 1000,
        violations: newCount,
        createdAt: Date.now(),
      };
      this.penaltyBox.set(identifier, entry);
      this.violations.delete(identifier);

      console.warn(
        `[RateLimitService] Added ${identifier} to penalty box for ${this.options.penaltyDuration}s`,
      );
    }
  }

  /**
   * Get rate limit configuration for an endpoint
   */
  getConfigForEndpoint(path: string, method?: string): RateLimitConfig {
    // Check for exact match
    if (ENDPOINT_CATEGORY_MAP[path]) {
      return RATE_LIMIT_CONFIGS[ENDPOINT_CATEGORY_MAP[path]];
    }

    // Check for prefix match
    for (const [endpoint, category] of Object.entries(ENDPOINT_CATEGORY_MAP)) {
      if (path.startsWith(endpoint)) {
        // Special case: POST to messages is message creation
        if (category === "messages" && method === "POST") {
          return RATE_LIMIT_CONFIGS.messages_create;
        }
        return RATE_LIMIT_CONFIGS[category];
      }
    }

    // Default to general API
    return RATE_LIMIT_CONFIGS.api_general;
  }

  /**
   * Build rate limit key from metadata
   */
  buildKey(
    category: EndpointCategory | string,
    metadata?: RateLimitMetadata,
  ): string {
    const parts: string[] = [];

    // Prefer user ID over IP for authenticated requests
    if (metadata?.userId) {
      parts.push(`user:${metadata.userId}`);
    } else if (metadata?.ip) {
      parts.push(`ip:${metadata.ip}`);
    } else {
      parts.push("anonymous");
    }

    // Add path for per-endpoint limiting
    if (metadata?.path) {
      parts.push(metadata.path.replace(/\//g, ":"));
    }

    return parts.join(":");
  }

  /**
   * Check rate limit
   */
  async check(
    category: EndpointCategory,
    metadata?: RateLimitMetadata,
  ): Promise<RateLimitResult> {
    // Check bypass
    if (this.shouldBypass(metadata)) {
      const config = RATE_LIMIT_CONFIGS[category];
      return {
        allowed: true,
        remaining: config.maxRequests,
        reset: Math.ceil(Date.now() / 1000) + config.windowSeconds,
        limit: config.maxRequests,
        current: 0,
      };
    }

    // Check penalty box
    const identifier = metadata?.userId || metadata?.ip || "anonymous";
    const blocked = this.isBlocked(identifier);
    if (blocked) {
      const retryAfter = Math.ceil((blocked.expiresAt - Date.now()) / 1000);
      return {
        allowed: false,
        remaining: 0,
        reset: Math.ceil(blocked.expiresAt / 1000),
        limit: 0,
        current: 0,
        retryAfter,
      };
    }

    const store = await this.getStore();
    const baseConfig = RATE_LIMIT_CONFIGS[category];

    // Apply tier multiplier
    const effectiveLimit = this.getEffectiveLimit(
      baseConfig.maxRequests,
      metadata?.userRole,
    );

    const config: RateLimitConfig = {
      ...baseConfig,
      maxRequests: effectiveLimit,
    };

    const key = this.buildKey(category, metadata);
    const result = await store.check(key, config);

    // Record violation if rate limited
    if (!result.allowed) {
      this.recordViolation(identifier, category);
    }

    return result;
  }

  /**
   * Check rate limit for a specific endpoint
   */
  async checkEndpoint(
    path: string,
    method: string,
    metadata?: RateLimitMetadata,
  ): Promise<RateLimitResult> {
    const config = this.getConfigForEndpoint(path, method);
    const category = this.getCategoryForEndpoint(path, method);

    // Add path to metadata for key building
    const fullMetadata: RateLimitMetadata = {
      ...metadata,
      path,
      method,
    };

    return this.check(category, fullMetadata);
  }

  /**
   * Get category for endpoint
   */
  private getCategoryForEndpoint(
    path: string,
    method?: string,
  ): EndpointCategory {
    // Check for exact match
    if (ENDPOINT_CATEGORY_MAP[path]) {
      const category = ENDPOINT_CATEGORY_MAP[path];
      if (category === "messages" && method === "POST") {
        return "messages_create";
      }
      return category;
    }

    // Check for prefix match
    for (const [endpoint, category] of Object.entries(ENDPOINT_CATEGORY_MAP)) {
      if (path.startsWith(endpoint)) {
        if (category === "messages" && method === "POST") {
          return "messages_create";
        }
        return category;
      }
    }

    return "api_general";
  }

  /**
   * Get current status without incrementing
   */
  async status(
    category: EndpointCategory,
    metadata?: RateLimitMetadata,
  ): Promise<RateLimitResult> {
    const store = await this.getStore();
    const baseConfig = RATE_LIMIT_CONFIGS[category];
    const effectiveLimit = this.getEffectiveLimit(
      baseConfig.maxRequests,
      metadata?.userRole,
    );

    const config: RateLimitConfig = {
      ...baseConfig,
      maxRequests: effectiveLimit,
    };

    const key = this.buildKey(category, metadata);
    return store.status(key, config);
  }

  /**
   * Reset rate limit for a user/IP
   */
  async reset(identifier: string): Promise<void> {
    const store = await this.getStore();
    await store.reset(identifier);

    // Also remove from penalty box
    this.penaltyBox.delete(identifier);
    this.violations.delete(identifier);
  }

  /**
   * Manually add to penalty box
   */
  addToPenaltyBox(
    identifier: string,
    reason: string,
    durationSeconds?: number,
  ): void {
    const duration = durationSeconds || this.options.penaltyDuration;
    const entry: PenaltyBoxEntry = {
      identifier,
      reason,
      expiresAt: Date.now() + duration * 1000,
      violations: 0,
      createdAt: Date.now(),
    };
    this.penaltyBox.set(identifier, entry);
  }

  /**
   * Remove from penalty box
   */
  removeFromPenaltyBox(identifier: string): void {
    this.penaltyBox.delete(identifier);
  }

  /**
   * Get all penalty box entries
   */
  getPenaltyBoxEntries(): PenaltyBoxEntry[] {
    return Array.from(this.penaltyBox.values());
  }

  /**
   * Check store health
   */
  async isHealthy(): Promise<boolean> {
    try {
      const store = await this.getStore();
      return store.isHealthy();
    } catch {
      return false;
    }
  }

  /**
   * Get current store name
   */
  async getStoreName(): Promise<string> {
    try {
      const store = await this.getStore();
      return store.getName();
    } catch {
      return "unknown";
    }
  }

  /**
   * Clear all rate limits (for testing)
   */
  async clearAll(): Promise<void> {
    const store = await this.getStore();
    await store.clear();
    this.penaltyBox.clear();
    this.violations.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let rateLimitServiceInstance: RateLimitService | null = null;

/**
 * Get the global rate limit service instance
 */
export function getRateLimitService(
  options?: RateLimitServiceOptions,
): RateLimitService {
  if (!rateLimitServiceInstance) {
    rateLimitServiceInstance = new RateLimitService(options);
  }
  return rateLimitServiceInstance;
}

/**
 * Create a new rate limit service instance
 */
export function createRateLimitService(
  options?: RateLimitServiceOptions,
): RateLimitService {
  return new RateLimitService(options);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick check for rate limiting
 */
export async function checkRateLimit(
  category: EndpointCategory,
  metadata?: RateLimitMetadata,
): Promise<RateLimitResult> {
  const service = getRateLimitService();
  return service.check(category, metadata);
}

/**
 * Quick check for endpoint rate limiting
 */
export async function checkEndpointRateLimit(
  path: string,
  method: string,
  metadata?: RateLimitMetadata,
): Promise<RateLimitResult> {
  const service = getRateLimitService();
  return service.checkEndpoint(path, method, metadata);
}
