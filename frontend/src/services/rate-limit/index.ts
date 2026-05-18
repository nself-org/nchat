/**
 * Rate Limiting Module
 *
 * Comprehensive rate limiting for nself-chat APIs.
 *
 * @module services/rate-limit
 *
 * @example
 * ```typescript
 * import {
 *   getRateLimitService,
 *   checkRateLimit,
 *   checkEndpointRateLimit,
 *   RATE_LIMIT_CONFIGS,
 * } from '@/services/rate-limit'
 *
 * // Check rate limit for a category
 * const result = await checkRateLimit('messages_create', {
 *   userId: 'user-123',
 *   ip: '192.168.1.1',
 *   userRole: 'premium',
 * })
 *
 * if (!result.allowed) {
 *   return { error: 'Rate limited', retryAfter: result.retryAfter }
 * }
 *
 * // Check rate limit for an endpoint
 * const result = await checkEndpointRateLimit('/api/messages', 'POST', {
 *   userId: 'user-123',
 * })
 * ```
 */

// Types
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitEntry,
  RateLimitMetadata,
  RateLimitStore,
  UserTier,
  TierMultipliers,
  PenaltyBoxEntry,
  EndpointCategory,
  CategoryConfigs,
  RateLimitExceededEvent,
  PenaltyBoxAddedEvent,
} from "./types";

export { DEFAULT_TIER_MULTIPLIERS } from "./types";

// Stores
export {
  RedisRateLimitStore,
  getRedisStore,
  createRedisStore,
} from "./redis-store";

export {
  MemoryRateLimitStore,
  EdgeMemoryStore,
  getMemoryStore,
  createMemoryStore,
  getEdgeStore,
} from "./memory-store";

// Service
export {
  RateLimitService,
  getRateLimitService,
  createRateLimitService,
  checkRateLimit,
  checkEndpointRateLimit,
  RATE_LIMIT_CONFIGS,
  ENDPOINT_CATEGORY_MAP,
} from "./rate-limit-service";

export type { RateLimitServiceOptions } from "./rate-limit-service";
