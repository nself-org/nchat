/**
 * Bot Rate Limiter
 *
 * Per-bot rate limiting with sliding window algorithm, burst allowance,
 * per-channel limits, and per-endpoint overrides. Builds on the app-level
 * rate limiter with bot-specific controls.
 */

import type {
  BotRateLimitConfig,
  BotRateLimitResult,
  EndpointRateLimit,
} from "./types";
import { DEFAULT_BOT_RATE_LIMITS } from "./types";

// ============================================================================
// INTERNAL WINDOW ENTRY
// ============================================================================

interface SlidingWindowEntry {
  /** Request timestamps within the current window */
  timestamps: number[];
  /** Burst tokens consumed */
  burstUsed: number;
}

// ============================================================================
// BOT RATE LIMITER
// ============================================================================

export class BotRateLimiter {
  /** Window entries keyed by composite key (botId, channel, endpoint) */
  private windows: Map<string, SlidingWindowEntry> = new Map();
  /** Per-bot custom configs */
  private botConfigs: Map<string, BotRateLimitConfig> = new Map();
  /** Cleanup interval */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  /** Window duration in ms */
  private readonly windowMs = 60000; // 1 minute

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Set a custom rate limit config for a specific bot.
   */
  setConfig(botId: string, config: BotRateLimitConfig): void {
    this.botConfigs.set(botId, config);
  }

  /**
   * Get the rate limit config for a bot (custom or default).
   */
  getConfig(botId: string): BotRateLimitConfig {
    return this.botConfigs.get(botId) ?? DEFAULT_BOT_RATE_LIMITS;
  }

  /**
   * Remove custom config for a bot (reverts to defaults).
   */
  removeConfig(botId: string): void {
    this.botConfigs.delete(botId);
  }

  /**
   * Reduce a bot's rate limits (moderation action).
   * Multiplies all limits by the given factor (0 < factor < 1).
   */
  reduceRateLimits(botId: string, factor: number): BotRateLimitConfig {
    if (factor <= 0 || factor >= 1) {
      throw new Error(
        "Rate limit reduction factor must be between 0 and 1 (exclusive)",
      );
    }

    const current = this.getConfig(botId);
    const reduced: BotRateLimitConfig = {
      globalRequestsPerMinute: Math.max(
        1,
        Math.floor(current.globalRequestsPerMinute * factor),
      ),
      burstAllowance: Math.max(0, Math.floor(current.burstAllowance * factor)),
      channelMessageRate: Math.max(
        1,
        Math.floor(current.channelMessageRate * factor),
      ),
      endpointOverrides: {},
    };

    // Reduce endpoint overrides
    for (const [endpoint, limit] of Object.entries(current.endpointOverrides)) {
      reduced.endpointOverrides[endpoint] = {
        requestsPerMinute: Math.max(
          1,
          Math.floor(limit.requestsPerMinute * factor),
        ),
        burstAllowance: limit.burstAllowance
          ? Math.max(0, Math.floor(limit.burstAllowance * factor))
          : undefined,
      };
    }

    this.botConfigs.set(botId, reduced);
    return reduced;
  }

  // ==========================================================================
  // RATE CHECKING - GLOBAL
  // ==========================================================================

  /**
   * Check global rate limit for a bot.
   */
  checkGlobal(botId: string): BotRateLimitResult {
    const config = this.getConfig(botId);
    const key = `global:${botId}`;
    return this.check(
      key,
      config.globalRequestsPerMinute,
      config.burstAllowance,
      "global",
    );
  }

  // ==========================================================================
  // RATE CHECKING - CHANNEL
  // ==========================================================================

  /**
   * Check per-channel message rate limit for a bot.
   */
  checkChannel(botId: string, channelId: string): BotRateLimitResult {
    const config = this.getConfig(botId);
    const key = `channel:${botId}:${channelId}`;
    return this.check(
      key,
      config.channelMessageRate,
      0, // No burst for channel limits
      "channel",
    );
  }

  // ==========================================================================
  // RATE CHECKING - ENDPOINT
  // ==========================================================================

  /**
   * Check endpoint-specific rate limit for a bot.
   */
  checkEndpoint(botId: string, endpoint: string): BotRateLimitResult {
    const config = this.getConfig(botId);
    const endpointConfig = config.endpointOverrides[endpoint];

    if (!endpointConfig) {
      // No specific endpoint limit, use global
      return this.checkGlobal(botId);
    }

    const key = `endpoint:${botId}:${endpoint}`;
    return this.check(
      key,
      endpointConfig.requestsPerMinute,
      endpointConfig.burstAllowance ?? 0,
      "endpoint",
    );
  }

  // ==========================================================================
  // COMPOSITE CHECK
  // ==========================================================================

  /**
   * Check all applicable rate limits for a bot action.
   * Returns the most restrictive result.
   */
  checkAll(
    botId: string,
    endpoint?: string,
    channelId?: string,
  ): BotRateLimitResult {
    // Check global first
    const globalResult = this.checkGlobal(botId);
    if (!globalResult.allowed) return globalResult;

    // Check endpoint if provided
    if (endpoint) {
      const endpointResult = this.checkEndpoint(botId, endpoint);
      if (!endpointResult.allowed) return endpointResult;
    }

    // Check channel if provided
    if (channelId) {
      const channelResult = this.checkChannel(botId, channelId);
      if (!channelResult.allowed) return channelResult;
    }

    return globalResult;
  }

  // ==========================================================================
  // STATUS (NON-CONSUMING)
  // ==========================================================================

  /**
   * Get rate limit status without consuming a request.
   */
  status(
    botId: string,
    type: "global" | "channel" | "endpoint",
    qualifier?: string,
  ): BotRateLimitResult {
    const config = this.getConfig(botId);
    let key: string;
    let limit: number;
    let burst: number;

    switch (type) {
      case "global":
        key = `global:${botId}`;
        limit = config.globalRequestsPerMinute;
        burst = config.burstAllowance;
        break;
      case "channel":
        key = `channel:${botId}:${qualifier}`;
        limit = config.channelMessageRate;
        burst = 0;
        break;
      case "endpoint": {
        key = `endpoint:${botId}:${qualifier}`;
        const endpointConfig = config.endpointOverrides[qualifier ?? ""];
        limit =
          endpointConfig?.requestsPerMinute ?? config.globalRequestsPerMinute;
        burst = endpointConfig?.burstAllowance ?? 0;
        break;
      }
    }

    const now = Date.now();
    const entry = this.windows.get(key);
    const totalLimit = limit + burst;
    const resetAt = Math.ceil((now + this.windowMs) / 1000);

    if (!entry) {
      return {
        allowed: true,
        remaining: totalLimit,
        limit: totalLimit,
        resetAt,
        retryAfterMs: 0,
        limitType: type,
      };
    }

    const windowStart = now - this.windowMs;
    const activeCount = entry.timestamps.filter(
      (ts) => ts > windowStart,
    ).length;
    const remaining = Math.max(0, totalLimit - activeCount);

    return {
      allowed: remaining > 0,
      remaining,
      limit: totalLimit,
      resetAt,
      retryAfterMs: remaining > 0 ? 0 : this.windowMs,
      limitType: type,
    };
  }

  // ==========================================================================
  // RESET
  // ==========================================================================

  /**
   * Reset all rate limits for a specific bot.
   */
  resetBot(botId: string): void {
    const keysToDelete: string[] = [];
    for (const key of Array.from(this.windows.keys())) {
      if (key.includes(`:${botId}:`) || key.endsWith(`:${botId}`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.windows.delete(key);
    }
  }

  /**
   * Reset rate limit for a specific key.
   */
  resetKey(key: string): void {
    this.windows.delete(key);
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, entry] of Array.from(this.windows)) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
      if (entry.timestamps.length === 0) {
        this.windows.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.windows.clear();
    this.botConfigs.clear();
  }

  getWindowCount(): number {
    return this.windows.size;
  }

  // ==========================================================================
  // INTERNAL
  // ==========================================================================

  private check(
    key: string,
    limit: number,
    burst: number,
    limitType: "global" | "channel" | "endpoint",
  ): BotRateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.windows.get(key);
    if (!entry) {
      entry = { timestamps: [], burstUsed: 0 };
      this.windows.set(key, entry);
    }

    // Remove expired timestamps
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const totalLimit = limit + burst;
    const currentCount = entry.timestamps.length;
    const resetAt = Math.ceil((now + this.windowMs) / 1000);

    if (currentCount >= totalLimit) {
      const oldestInWindow = entry.timestamps[0] || now;
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        limit: totalLimit,
        resetAt,
        retryAfterMs: Math.max(0, retryAfterMs),
        limitType,
      };
    }

    // Allow the request
    entry.timestamps.push(now);

    if (currentCount >= limit) {
      entry.burstUsed = currentCount - limit + 1;
    }

    return {
      allowed: true,
      remaining: totalLimit - currentCount - 1,
      limit: totalLimit,
      resetAt,
      retryAfterMs: 0,
      limitType,
    };
  }
}
