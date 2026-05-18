/**
 * Rate Limiter Service
 *
 * Provides configurable rate limiting for various action types including:
 * - Message sending
 * - Reactions
 * - Channel joins
 * - API calls
 * - File uploads
 * - Friend requests
 *
 * Supports:
 * - Token bucket algorithm
 * - Sliding window counters
 * - Per-user and per-channel limits
 * - Burst allowance
 * - Hierarchical limits (user -> channel -> global)
 */

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type RateLimitAction =
  | "message"
  | "reaction"
  | "channel_join"
  | "channel_create"
  | "api_call"
  | "file_upload"
  | "friend_request"
  | "mention"
  | "dm_create"
  | "invite_create"
  | "report"
  | "profile_update"
  | "webhook_call"
  | "search"
  | "export";

export type RateLimitScope = "user" | "channel" | "workspace" | "global" | "ip";

export interface RateLimitConfig {
  /** Maximum number of actions allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional burst limit (allows short bursts above normal rate) */
  burstLimit?: number;
  /** Burst window in milliseconds */
  burstWindowMs?: number;
  /** Cooldown period in ms after hitting the limit */
  cooldownMs?: number;
  /** Whether to skip rate limiting for trusted users */
  skipTrusted?: boolean;
  /** Roles exempt from this limit */
  exemptRoles?: string[];
  /** Message to return when rate limited */
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfter?: number;
  scope: RateLimitScope;
  action: RateLimitAction;
  burstRemaining?: number;
}

export interface RateLimitState {
  count: number;
  firstRequestAt: number;
  lastRequestAt: number;
  burstCount: number;
  burstFirstRequestAt: number;
  cooldownUntil?: number;
}

export interface RateLimitEntry {
  key: string;
  action: RateLimitAction;
  scope: RateLimitScope;
  state: RateLimitState;
  config: RateLimitConfig;
}

export interface RateLimiterOptions {
  /** Default limits for each action type */
  defaults: Partial<Record<RateLimitAction, RateLimitConfig>>;
  /** Trusted users who may have different limits */
  trustedUsers?: string[];
  /** Custom limits per user */
  userOverrides?: Map<
    string,
    Partial<Record<RateLimitAction, RateLimitConfig>>
  >;
  /** Custom limits per channel */
  channelOverrides?: Map<
    string,
    Partial<Record<RateLimitAction, RateLimitConfig>>
  >;
  /** Enable penalty escalation for repeat offenders */
  escalationEnabled?: boolean;
  /** How long to remember violations for escalation */
  violationMemoryMs?: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  message: {
    limit: 30,
    windowMs: 60000, // 30 messages per minute
    burstLimit: 5,
    burstWindowMs: 5000,
    cooldownMs: 10000,
    message: "You are sending messages too quickly. Please slow down.",
  },
  reaction: {
    limit: 60,
    windowMs: 60000, // 60 reactions per minute
    burstLimit: 10,
    burstWindowMs: 5000,
    message: "You are adding reactions too quickly. Please slow down.",
  },
  channel_join: {
    limit: 20,
    windowMs: 3600000, // 20 joins per hour
    cooldownMs: 60000,
    message: "You are joining too many channels. Please wait.",
  },
  channel_create: {
    limit: 5,
    windowMs: 3600000, // 5 channels per hour
    cooldownMs: 300000,
    message: "You have reached the channel creation limit. Please wait.",
  },
  api_call: {
    limit: 100,
    windowMs: 60000, // 100 API calls per minute
    burstLimit: 20,
    burstWindowMs: 5000,
    message: "API rate limit exceeded. Please try again later.",
  },
  file_upload: {
    limit: 20,
    windowMs: 3600000, // 20 uploads per hour
    cooldownMs: 60000,
    message: "You have reached the upload limit. Please wait.",
  },
  friend_request: {
    limit: 10,
    windowMs: 3600000, // 10 requests per hour
    cooldownMs: 300000,
    message: "You are sending too many friend requests. Please wait.",
  },
  mention: {
    limit: 50,
    windowMs: 60000, // 50 mentions per minute
    burstLimit: 10,
    burstWindowMs: 10000,
    message: "You are mentioning users too frequently. Please slow down.",
  },
  dm_create: {
    limit: 20,
    windowMs: 3600000, // 20 new DMs per hour
    cooldownMs: 300000,
    message: "You are starting too many conversations. Please wait.",
  },
  invite_create: {
    limit: 10,
    windowMs: 3600000, // 10 invites per hour
    cooldownMs: 600000,
    message: "You have created too many invites. Please wait.",
  },
  report: {
    limit: 10,
    windowMs: 86400000, // 10 reports per day
    cooldownMs: 3600000,
    message: "You have submitted too many reports today. Please wait.",
  },
  profile_update: {
    limit: 10,
    windowMs: 3600000, // 10 updates per hour
    cooldownMs: 60000,
    message: "You are updating your profile too frequently. Please wait.",
  },
  webhook_call: {
    limit: 30,
    windowMs: 60000, // 30 webhook calls per minute
    burstLimit: 10,
    burstWindowMs: 5000,
    message: "Webhook rate limit exceeded.",
  },
  search: {
    limit: 30,
    windowMs: 60000, // 30 searches per minute
    burstLimit: 10,
    burstWindowMs: 10000,
    message: "You are searching too frequently. Please slow down.",
  },
  export: {
    limit: 5,
    windowMs: 86400000, // 5 exports per day
    cooldownMs: 3600000,
    message: "You have reached the export limit. Please wait.",
  },
};

// Stricter limits for new/untrusted users
export const STRICT_RATE_LIMITS: Partial<
  Record<RateLimitAction, RateLimitConfig>
> = {
  message: {
    limit: 10,
    windowMs: 60000,
    burstLimit: 3,
    burstWindowMs: 5000,
    cooldownMs: 30000,
    message: "New accounts have limited messaging. Please slow down.",
  },
  dm_create: {
    limit: 5,
    windowMs: 3600000,
    cooldownMs: 600000,
    message: "New accounts have limited DM creation. Please wait.",
  },
  channel_join: {
    limit: 10,
    windowMs: 3600000,
    cooldownMs: 120000,
    message: "New accounts have limited channel joins. Please wait.",
  },
};

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private violations: Map<string, number[]> = new Map();
  private options: RateLimiterOptions;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = {
      defaults: { ...DEFAULT_RATE_LIMITS, ...options.defaults },
      trustedUsers: options.trustedUsers || [],
      userOverrides: options.userOverrides || new Map(),
      channelOverrides: options.channelOverrides || new Map(),
      escalationEnabled: options.escalationEnabled ?? true,
      violationMemoryMs: options.violationMemoryMs || 3600000, // 1 hour
    };

    // Start cleanup timer
    this.startCleanup();
  }

  // ==========================================================================
  // Main Methods
  // ==========================================================================

  /**
   * Checks if an action is allowed and consumes a token if so
   */
  check(
    action: RateLimitAction,
    identifier: string,
    options: {
      scope?: RateLimitScope;
      channelId?: string;
      workspaceId?: string;
      userRole?: string;
      consume?: boolean;
    } = {},
  ): RateLimitResult {
    const scope = options.scope || "user";
    const consume = options.consume ?? true;

    // Get applicable config
    const config = this.getConfig(action, identifier, options.channelId);

    // Check exemptions
    if (config.exemptRoles && options.userRole) {
      if (config.exemptRoles.includes(options.userRole)) {
        return this.createAllowedResult(action, scope, config);
      }
    }

    // Check trusted users
    if (config.skipTrusted && this.options.trustedUsers?.includes(identifier)) {
      return this.createAllowedResult(action, scope, config);
    }

    // Get or create state
    const key = this.createKey(action, scope, identifier, options.channelId);
    let entry = this.limits.get(key);

    if (!entry) {
      entry = {
        key,
        action,
        scope,
        state: {
          count: 0,
          firstRequestAt: Date.now(),
          lastRequestAt: Date.now(),
          burstCount: 0,
          burstFirstRequestAt: Date.now(),
        },
        config,
      };
      this.limits.set(key, entry);
    }

    // Update config if it changed
    entry.config = config;

    const now = Date.now();
    const state = entry.state;

    // Check cooldown
    if (state.cooldownUntil && now < state.cooldownUntil) {
      return this.createDeniedResult(action, scope, config, state);
    }

    // Reset window if expired
    if (now - state.firstRequestAt >= config.windowMs) {
      state.count = 0;
      state.firstRequestAt = now;
    }

    // Reset burst window if expired
    if (
      config.burstLimit &&
      config.burstWindowMs &&
      now - state.burstFirstRequestAt >= config.burstWindowMs
    ) {
      state.burstCount = 0;
      state.burstFirstRequestAt = now;
    }

    // Check burst limit
    if (config.burstLimit && state.burstCount >= config.burstLimit) {
      const burstResetAt =
        state.burstFirstRequestAt + (config.burstWindowMs || 0);
      if (now < burstResetAt) {
        this.recordViolation(identifier);
        return {
          allowed: false,
          remaining: 0,
          limit: config.burstLimit,
          resetAt: burstResetAt,
          retryAfter: burstResetAt - now,
          scope,
          action,
          burstRemaining: 0,
        };
      }
    }

    // Check main limit
    if (state.count >= config.limit) {
      // Apply cooldown if configured
      if (config.cooldownMs) {
        state.cooldownUntil = now + config.cooldownMs;
      }

      this.recordViolation(identifier);
      return this.createDeniedResult(action, scope, config, state);
    }

    // Consume token if requested
    if (consume) {
      state.count++;
      state.burstCount++;
      state.lastRequestAt = now;
    }

    return this.createAllowedResult(action, scope, config, state);
  }

  /**
   * Checks multiple actions at once (for compound operations)
   */
  checkMultiple(
    actions: Array<{
      action: RateLimitAction;
      identifier: string;
      options?: {
        scope?: RateLimitScope;
        channelId?: string;
        userRole?: string;
      };
    }>,
  ): { allowed: boolean; results: RateLimitResult[] } {
    // First pass: check without consuming
    const results: RateLimitResult[] = [];
    for (const { action, identifier, options } of actions) {
      results.push(
        this.check(action, identifier, { ...options, consume: false }),
      );
    }

    // If any denied, return without consuming
    if (results.some((r) => !r.allowed)) {
      return { allowed: false, results };
    }

    // Second pass: consume tokens
    const consumedResults: RateLimitResult[] = [];
    for (const { action, identifier, options } of actions) {
      consumedResults.push(
        this.check(action, identifier, { ...options, consume: true }),
      );
    }

    return { allowed: true, results: consumedResults };
  }

  /**
   * Resets rate limit for a specific action/identifier
   */
  reset(
    action: RateLimitAction,
    identifier: string,
    scope: RateLimitScope = "user",
    channelId?: string,
  ): void {
    const key = this.createKey(action, scope, identifier, channelId);
    this.limits.delete(key);
  }

  /**
   * Resets all rate limits for an identifier
   */
  resetAll(identifier: string): void {
    for (const [key] of this.limits) {
      if (key.includes(identifier)) {
        this.limits.delete(key);
      }
    }
    this.violations.delete(identifier);
  }

  /**
   * Gets current state for a rate limit
   */
  getState(
    action: RateLimitAction,
    identifier: string,
    scope: RateLimitScope = "user",
    channelId?: string,
  ): RateLimitState | undefined {
    const key = this.createKey(action, scope, identifier, channelId);
    return this.limits.get(key)?.state;
  }

  /**
   * Manually sets remaining count
   */
  setRemaining(
    action: RateLimitAction,
    identifier: string,
    remaining: number,
    scope: RateLimitScope = "user",
    channelId?: string,
  ): void {
    const key = this.createKey(action, scope, identifier, channelId);
    const entry = this.limits.get(key);
    if (entry) {
      const consumed = entry.config.limit - remaining;
      entry.state.count = Math.max(0, consumed);
    }
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Sets default limit for an action
   */
  setDefaultLimit(action: RateLimitAction, config: RateLimitConfig): void {
    this.options.defaults[action] = config;
  }

  /**
   * Sets user-specific override
   */
  setUserOverride(
    userId: string,
    action: RateLimitAction,
    config: RateLimitConfig,
  ): void {
    if (!this.options.userOverrides) {
      this.options.userOverrides = new Map();
    }
    const userConfig = this.options.userOverrides.get(userId) || {};
    userConfig[action] = config;
    this.options.userOverrides.set(userId, userConfig);
  }

  /**
   * Removes user-specific override
   */
  removeUserOverride(userId: string, action?: RateLimitAction): void {
    if (!this.options.userOverrides) return;

    if (action) {
      const userConfig = this.options.userOverrides.get(userId);
      if (userConfig) {
        delete userConfig[action];
      }
    } else {
      this.options.userOverrides.delete(userId);
    }
  }

  /**
   * Sets channel-specific override
   */
  setChannelOverride(
    channelId: string,
    action: RateLimitAction,
    config: RateLimitConfig,
  ): void {
    if (!this.options.channelOverrides) {
      this.options.channelOverrides = new Map();
    }
    const channelConfig = this.options.channelOverrides.get(channelId) || {};
    channelConfig[action] = config;
    this.options.channelOverrides.set(channelId, channelConfig);
  }

  /**
   * Removes channel-specific override
   */
  removeChannelOverride(channelId: string, action?: RateLimitAction): void {
    if (!this.options.channelOverrides) return;

    if (action) {
      const channelConfig = this.options.channelOverrides.get(channelId);
      if (channelConfig) {
        delete channelConfig[action];
      }
    } else {
      this.options.channelOverrides.delete(channelId);
    }
  }

  /**
   * Adds a trusted user
   */
  addTrustedUser(userId: string): void {
    if (!this.options.trustedUsers) {
      this.options.trustedUsers = [];
    }
    if (!this.options.trustedUsers.includes(userId)) {
      this.options.trustedUsers.push(userId);
    }
  }

  /**
   * Removes a trusted user
   */
  removeTrustedUser(userId: string): void {
    if (this.options.trustedUsers) {
      const index = this.options.trustedUsers.indexOf(userId);
      if (index > -1) {
        this.options.trustedUsers.splice(index, 1);
      }
    }
  }

  /**
   * Applies strict limits to a user (new/suspicious users)
   */
  applyStrictLimits(userId: string): void {
    for (const [action, config] of Object.entries(STRICT_RATE_LIMITS)) {
      this.setUserOverride(userId, action as RateLimitAction, config);
    }
    logger.info(`Applied strict rate limits to user ${userId}`);
  }

  /**
   * Removes strict limits from a user
   */
  removeStrictLimits(userId: string): void {
    for (const action of Object.keys(STRICT_RATE_LIMITS)) {
      this.removeUserOverride(userId, action as RateLimitAction);
    }
  }

  // ==========================================================================
  // Violation Tracking
  // ==========================================================================

  /**
   * Gets violation count for a user
   */
  getViolationCount(identifier: string): number {
    const violations = this.violations.get(identifier) || [];
    const cutoff = Date.now() - (this.options.violationMemoryMs || 3600000);
    return violations.filter((t) => t > cutoff).length;
  }

  /**
   * Checks if user is a repeat offender
   */
  isRepeatOffender(identifier: string, threshold: number = 5): boolean {
    return this.getViolationCount(identifier) >= threshold;
  }

  /**
   * Gets escalation multiplier based on violations
   */
  getEscalationMultiplier(identifier: string): number {
    const violations = this.getViolationCount(identifier);
    if (violations < 3) return 1;
    if (violations < 5) return 1.5;
    if (violations < 10) return 2;
    return 3;
  }

  /**
   * Clears violation history for a user
   */
  clearViolations(identifier: string): void {
    this.violations.delete(identifier);
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Gets current rate limit statistics
   */
  getStats(): {
    totalEntries: number;
    byAction: Record<string, number>;
    byScope: Record<string, number>;
    violationCount: number;
    repeatOffenders: number;
  } {
    const byAction: Record<string, number> = {};
    const byScope: Record<string, number> = {};

    for (const entry of this.limits.values()) {
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      byScope[entry.scope] = (byScope[entry.scope] || 0) + 1;
    }

    let violationCount = 0;
    let repeatOffenders = 0;

    for (const [identifier, violations] of this.violations) {
      const cutoff = Date.now() - (this.options.violationMemoryMs || 3600000);
      const recent = violations.filter((t) => t > cutoff);
      violationCount += recent.length;
      if (recent.length >= 5) repeatOffenders++;
    }

    return {
      totalEntries: this.limits.size,
      byAction,
      byScope,
      violationCount,
      repeatOffenders,
    };
  }

  /**
   * Gets all rate-limited identifiers
   */
  getRateLimitedIdentifiers(action?: RateLimitAction): string[] {
    const identifiers: Set<string> = new Set();
    const now = Date.now();

    for (const entry of this.limits.values()) {
      if (action && entry.action !== action) continue;

      const state = entry.state;
      const windowExpiry = state.firstRequestAt + entry.config.windowMs;

      if (state.count >= entry.config.limit && windowExpiry > now) {
        // Extract identifier from key
        const parts = entry.key.split(":");
        if (parts.length >= 3) {
          identifiers.add(parts[2]);
        }
      }
    }

    return Array.from(identifiers);
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private createKey(
    action: RateLimitAction,
    scope: RateLimitScope,
    identifier: string,
    channelId?: string,
  ): string {
    const parts = [action, scope, identifier];
    if (channelId) parts.push(channelId);
    return parts.join(":");
  }

  private getConfig(
    action: RateLimitAction,
    userId: string,
    channelId?: string,
  ): RateLimitConfig {
    // Check user override first
    const userOverride = this.options.userOverrides?.get(userId)?.[action];
    if (userOverride) return userOverride;

    // Check channel override
    if (channelId) {
      const channelOverride =
        this.options.channelOverrides?.get(channelId)?.[action];
      if (channelOverride) return channelOverride;
    }

    // Use default
    return this.options.defaults[action] || DEFAULT_RATE_LIMITS[action];
  }

  private createAllowedResult(
    action: RateLimitAction,
    scope: RateLimitScope,
    config: RateLimitConfig,
    state?: RateLimitState,
  ): RateLimitResult {
    const remaining = state ? config.limit - state.count : config.limit;
    const resetAt = state
      ? state.firstRequestAt + config.windowMs
      : Date.now() + config.windowMs;

    const result: RateLimitResult = {
      allowed: true,
      remaining: Math.max(0, remaining),
      limit: config.limit,
      resetAt,
      scope,
      action,
    };

    if (config.burstLimit && state) {
      result.burstRemaining = config.burstLimit - state.burstCount;
    }

    return result;
  }

  private createDeniedResult(
    action: RateLimitAction,
    scope: RateLimitScope,
    config: RateLimitConfig,
    state: RateLimitState,
  ): RateLimitResult {
    const resetAt =
      state.cooldownUntil || state.firstRequestAt + config.windowMs;
    const retryAfter = Math.max(0, resetAt - Date.now());

    return {
      allowed: false,
      remaining: 0,
      limit: config.limit,
      resetAt,
      retryAfter,
      scope,
      action,
      burstRemaining: config.burstLimit ? 0 : undefined,
    };
  }

  private recordViolation(identifier: string): void {
    const violations = this.violations.get(identifier) || [];
    violations.push(Date.now());

    // Trim old violations
    const cutoff = Date.now() - (this.options.violationMemoryMs || 3600000);
    const filtered = violations.filter((t) => t > cutoff);

    this.violations.set(identifier, filtered);

    logger.info(`Rate limit violation for ${identifier}`, {
      totalViolations: filtered.length,
    });
  }

  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean up expired entries
    for (const [key, entry] of this.limits) {
      const state = entry.state;
      const config = entry.config;
      const windowExpiry = state.firstRequestAt + config.windowMs;

      // Remove if window expired and no cooldown active
      if (
        windowExpiry < now &&
        (!state.cooldownUntil || state.cooldownUntil < now)
      ) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    // Clean up old violations
    const violationCutoff = now - (this.options.violationMemoryMs || 3600000);
    for (const [identifier, violations] of this.violations) {
      const filtered = violations.filter((t) => t > violationCutoff);
      if (filtered.length === 0) {
        this.violations.delete(identifier);
      } else {
        this.violations.set(identifier, filtered);
      }
    }

    if (cleaned > 0) {
      logger.debug(`Rate limiter cleanup: removed ${cleaned} expired entries`);
    }
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Stops the cleanup timer
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clears all rate limit data
   */
  clear(): void {
    this.limits.clear();
    this.violations.clear();
  }
}

// ============================================================================
// Factory and Singleton
// ============================================================================

let limiterInstance: RateLimiter | null = null;

export function getRateLimiter(
  options?: Partial<RateLimiterOptions>,
): RateLimiter {
  if (!limiterInstance || options) {
    limiterInstance = new RateLimiter(options);
  }
  return limiterInstance;
}

export function createRateLimiter(
  options?: Partial<RateLimiterOptions>,
): RateLimiter {
  return new RateLimiter(options);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats retry-after duration for display
 */
export function formatRetryAfter(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

/**
 * Creates HTTP headers for rate limit response
 */
export function createRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = Math.ceil(result.retryAfter / 1000).toString();
  }

  return headers;
}
