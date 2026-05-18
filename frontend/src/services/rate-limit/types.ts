/**
 * Rate Limiting Types
 *
 * Shared type definitions for the rate limiting system.
 *
 * @module services/rate-limit/types
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Rate limit configuration for an endpoint or category
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Additional burst allowance for peak traffic */
  burst?: number;
  /** Custom key prefix for storage */
  keyPrefix?: string;
  /** Skip rate limiting for certain conditions */
  skip?: (identifier: string, metadata?: RateLimitMetadata) => boolean;
  /** Cost multiplier for this endpoint (default: 1) */
  cost?: number;
}

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (seconds) when the limit resets */
  reset: number;
  /** Total limit for the window */
  limit: number;
  /** Seconds to wait before retrying (if rate limited) */
  retryAfter?: number;
  /** Current request count in window */
  current: number;
}

/**
 * Rate limit entry stored in the backend
 */
export interface RateLimitEntry {
  /** Current request count */
  count: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
  /** Timestamps of requests for sliding window */
  requests: number[];
  /** First request timestamp */
  firstRequest?: number;
  /** Last request timestamp */
  lastRequest?: number;
}

/**
 * Metadata about the rate-limited request
 */
export interface RateLimitMetadata {
  /** User ID if authenticated */
  userId?: string;
  /** User role for tier-based limits */
  userRole?: UserTier;
  /** IP address */
  ip?: string;
  /** Request path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** API key if present */
  apiKey?: string;
  /** Tenant ID for multi-tenant setups */
  tenantId?: string;
  /** Additional custom metadata */
  custom?: Record<string, unknown>;
}

// ============================================================================
// User Tiers
// ============================================================================

/**
 * User subscription/role tiers for rate limit multipliers
 */
export type UserTier =
  | "guest"
  | "member"
  | "premium"
  | "enterprise"
  | "admin"
  | "internal";

/**
 * Tier-specific rate limit multipliers
 */
export interface TierMultipliers {
  guest: number;
  member: number;
  premium: number;
  enterprise: number;
  admin: number;
  internal: number;
}

/**
 * Default tier multipliers
 */
export const DEFAULT_TIER_MULTIPLIERS: TierMultipliers = {
  guest: 0.5, // 50% of base limit
  member: 1.0, // 100% of base limit
  premium: 2.0, // 200% of base limit
  enterprise: 5.0, // 500% of base limit
  admin: 10.0, // 1000% of base limit
  internal: 100.0, // Effectively unlimited
};

// ============================================================================
// Store Interface
// ============================================================================

/**
 * Interface for rate limit storage backends
 */
export interface RateLimitStore {
  /**
   * Check rate limit and increment counter
   * @param key Unique identifier for the rate limit
   * @param config Rate limit configuration
   * @returns Rate limit result
   */
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Get current status without incrementing
   * @param key Unique identifier for the rate limit
   * @param config Rate limit configuration
   * @returns Current rate limit status
   */
  status(key: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Reset rate limit for a key
   * @param key Unique identifier to reset
   */
  reset(key: string): Promise<void>;

  /**
   * Decrement the counter (for refunds/corrections)
   * @param key Unique identifier
   * @param amount Amount to decrement (default: 1)
   */
  decrement(key: string, amount?: number): Promise<void>;

  /**
   * Clear all rate limits (for testing)
   */
  clear(): Promise<void>;

  /**
   * Check if the store is healthy/connected
   */
  isHealthy(): Promise<boolean>;

  /**
   * Get store name for debugging
   */
  getName(): string;
}

// ============================================================================
// Endpoint Categories
// ============================================================================

/**
 * Predefined endpoint categories for rate limiting
 */
export type EndpointCategory =
  | "auth"
  | "auth_sensitive"
  | "messages"
  | "messages_create"
  | "file_upload"
  | "search"
  | "api_general"
  | "graphql"
  | "websocket"
  | "admin"
  | "webhook"
  | "bot"
  | "ai"
  | "export";

/**
 * Rate limit configurations by category
 */
export interface CategoryConfigs {
  [category: string]: RateLimitConfig;
}

// ============================================================================
// Penalty Box
// ============================================================================

/**
 * Penalty box entry for blocked IPs/users
 */
export interface PenaltyBoxEntry {
  /** Identifier (IP or user ID) */
  identifier: string;
  /** Reason for blocking */
  reason: string;
  /** Unix timestamp when block expires */
  expiresAt: number;
  /** Number of violations that led to this block */
  violations: number;
  /** When the block was created */
  createdAt: number;
}

// ============================================================================
// Rate Limit Events
// ============================================================================

/**
 * Event emitted when rate limit is exceeded
 */
export interface RateLimitExceededEvent {
  /** Identifier that was rate limited */
  identifier: string;
  /** Endpoint or category */
  endpoint: string;
  /** Current limit */
  limit: number;
  /** Current request count */
  current: number;
  /** When the limit resets */
  resetAt: number;
  /** Request metadata */
  metadata?: RateLimitMetadata;
  /** Timestamp of the event */
  timestamp: number;
}

/**
 * Event emitted when an identifier is added to penalty box
 */
export interface PenaltyBoxAddedEvent {
  entry: PenaltyBoxEntry;
  timestamp: number;
}
