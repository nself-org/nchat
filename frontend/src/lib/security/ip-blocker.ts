/**
 * IP Blocker - Advanced IP-based Security
 *
 * Features:
 * - Automatic IP blocking based on abuse detection
 * - Whitelist/blacklist management
 * - Temporary and permanent blocks
 * - Geographic blocking (optional)
 * - Automatic unblock after time
 * - Redis-backed storage with in-memory fallback
 *
 * @module lib/security/ip-blocker
 */

import { NextRequest } from "next/server";
import Redis from "ioredis";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: number; // Unix timestamp in milliseconds
  expiresAt?: number; // Unix timestamp in milliseconds (undefined = permanent)
  blockType: "temporary" | "permanent";
  metadata?: {
    country?: string;
    userAgent?: string;
    endpoint?: string;
    requestCount?: number;
    lastViolation?: string;
  };
}

export interface BlockRule {
  /** Rule name/ID */
  id: string;
  /** Rule type */
  type: "rate_limit" | "abuse" | "spam" | "security" | "manual";
  /** Number of violations before blocking */
  threshold: number;
  /** Time window in seconds for counting violations */
  windowSeconds: number;
  /** Block duration in seconds (0 = permanent) */
  blockDurationSeconds: number;
  /** Whether this rule is enabled */
  enabled: boolean;
}

export interface AbuseEvent {
  ip: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Default Block Rules
// ============================================================================

export const DEFAULT_BLOCK_RULES: Record<string, BlockRule> = {
  // Excessive failed login attempts
  FAILED_LOGIN: {
    id: "FAILED_LOGIN",
    type: "abuse",
    threshold: 10, // 10 failed attempts
    windowSeconds: 900, // in 15 minutes
    blockDurationSeconds: 3600, // block for 1 hour
    enabled: true,
  },

  // Excessive rate limit violations
  RATE_LIMIT_ABUSE: {
    id: "RATE_LIMIT_ABUSE",
    type: "rate_limit",
    threshold: 50, // 50 rate limit hits
    windowSeconds: 300, // in 5 minutes
    blockDurationSeconds: 7200, // block for 2 hours
    enabled: true,
  },

  // Suspicious activity patterns
  SUSPICIOUS_ACTIVITY: {
    id: "SUSPICIOUS_ACTIVITY",
    type: "security",
    threshold: 5, // 5 suspicious events
    windowSeconds: 600, // in 10 minutes
    blockDurationSeconds: 86400, // block for 24 hours
    enabled: true,
  },

  // Spam detection
  SPAM_DETECTED: {
    id: "SPAM_DETECTED",
    type: "spam",
    threshold: 20, // 20 spam messages
    windowSeconds: 3600, // in 1 hour
    blockDurationSeconds: 43200, // block for 12 hours
    enabled: true,
  },

  // CSRF violations
  CSRF_VIOLATION: {
    id: "CSRF_VIOLATION",
    type: "security",
    threshold: 3, // 3 CSRF failures
    windowSeconds: 300, // in 5 minutes
    blockDurationSeconds: 7200, // block for 2 hours
    enabled: true,
  },

  // SQL injection attempts
  SQL_INJECTION: {
    id: "SQL_INJECTION",
    type: "security",
    threshold: 1, // immediate block
    windowSeconds: 60,
    blockDurationSeconds: 0, // permanent block
    enabled: true,
  },

  // XSS attempts
  XSS_ATTEMPT: {
    id: "XSS_ATTEMPT",
    type: "security",
    threshold: 1, // immediate block
    windowSeconds: 60,
    blockDurationSeconds: 0, // permanent block
    enabled: true,
  },
};

// ============================================================================
// Redis Client
// ============================================================================

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
      lazyConnect: true,
    });

    redisClient.connect().catch((error) => {
      logger.error("[IPBlocker] Failed to connect to Redis:", error.message);
    });

    return redisClient;
  } catch (error) {
    logger.error("[IPBlocker] Failed to initialize Redis:", error);
    return null;
  }
}

// ============================================================================
// In-Memory Store (Fallback)
// ============================================================================

class InMemoryIPStore {
  private blockedIPs = new Map<string, BlockedIP>();
  private whitelist = new Set<string>();
  private blacklist = new Set<string>();
  private violations = new Map<string, Map<string, number[]>>(); // IP -> Rule -> Timestamps
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // Clean every 5 minutes
  }

  async isBlocked(ip: string): Promise<BlockedIP | null> {
    // Check whitelist first
    if (this.whitelist.has(ip)) {
      return null;
    }

    // Check blacklist
    if (this.blacklist.has(ip)) {
      return {
        ip,
        reason: "IP in blacklist",
        blockedAt: Date.now(),
        blockType: "permanent",
      };
    }

    // Check blocked IPs
    const blocked = this.blockedIPs.get(ip);
    if (!blocked) {
      return null;
    }

    // Check if temporary block has expired
    if (blocked.expiresAt && Date.now() > blocked.expiresAt) {
      this.blockedIPs.delete(ip);
      return null;
    }

    return blocked;
  }

  async blockIP(blocked: BlockedIP): Promise<void> {
    this.blockedIPs.set(blocked.ip, blocked);
  }

  async unblockIP(ip: string): Promise<void> {
    this.blockedIPs.delete(ip);
  }

  async addToWhitelist(ip: string): Promise<void> {
    this.whitelist.add(ip);
    // Remove from blocked if whitelisted
    this.blockedIPs.delete(ip);
  }

  async removeFromWhitelist(ip: string): Promise<void> {
    this.whitelist.delete(ip);
  }

  async addToBlacklist(ip: string): Promise<void> {
    this.blacklist.add(ip);
  }

  async removeFromBlacklist(ip: string): Promise<void> {
    this.blacklist.delete(ip);
  }

  async getWhitelist(): Promise<string[]> {
    return Array.from(this.whitelist);
  }

  async getBlacklist(): Promise<string[]> {
    return Array.from(this.blacklist);
  }

  async recordViolation(ip: string, ruleId: string): Promise<number> {
    if (!this.violations.has(ip)) {
      this.violations.set(ip, new Map());
    }

    const ipViolations = this.violations.get(ip)!;
    if (!ipViolations.has(ruleId)) {
      ipViolations.set(ruleId, []);
    }

    const timestamps = ipViolations.get(ruleId)!;
    timestamps.push(Date.now());

    return timestamps.length;
  }

  async getViolationCount(
    ip: string,
    ruleId: string,
    windowSeconds: number,
  ): Promise<number> {
    const ipViolations = this.violations.get(ip);
    if (!ipViolations) {
      return 0;
    }

    const timestamps = ipViolations.get(ruleId);
    if (!timestamps) {
      return 0;
    }

    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Filter violations within window
    const recentViolations = timestamps.filter((ts) => ts > windowStart);

    // Update stored violations
    ipViolations.set(ruleId, recentViolations);

    return recentViolations.length;
  }

  async getAllBlockedIPs(): Promise<BlockedIP[]> {
    const now = Date.now();
    const blocked: BlockedIP[] = [];

    for (const [ip, block] of this.blockedIPs.entries()) {
      // Skip expired blocks
      if (block.expiresAt && now > block.expiresAt) {
        this.blockedIPs.delete(ip);
        continue;
      }

      blocked.push(block);
    }

    return blocked;
  }

  private cleanup(): void {
    const now = Date.now();

    // Clean up expired blocks
    for (const [ip, block] of this.blockedIPs.entries()) {
      if (block.expiresAt && now > block.expiresAt) {
        this.blockedIPs.delete(ip);
      }
    }

    // Clean up old violations (older than 1 day)
    const oneDayAgo = now - 86400000;
    for (const [ip, rules] of this.violations.entries()) {
      for (const [ruleId, timestamps] of rules.entries()) {
        const recentTimestamps = timestamps.filter((ts) => ts > oneDayAgo);
        if (recentTimestamps.length === 0) {
          rules.delete(ruleId);
        } else {
          rules.set(ruleId, recentTimestamps);
        }
      }

      if (rules.size === 0) {
        this.violations.delete(ip);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.blockedIPs.clear();
    this.whitelist.clear();
    this.blacklist.clear();
    this.violations.clear();
  }
}

const inMemoryStore = new InMemoryIPStore();

// ============================================================================
// IP Blocker Implementation
// ============================================================================

export class IPBlocker {
  private redis: Redis | null;
  private useRedis: boolean;

  constructor() {
    this.redis = getRedisClient();
    this.useRedis = !!this.redis;
  }

  /**
   * Check if an IP is blocked
   */
  async isBlocked(ip: string): Promise<BlockedIP | null> {
    try {
      if (this.useRedis && this.redis) {
        return await this.isBlockedRedis(ip);
      } else {
        return await inMemoryStore.isBlocked(ip);
      }
    } catch (error) {
      logger.error("[IPBlocker] Error checking blocked IP:", error);
      this.useRedis = false;
      return await inMemoryStore.isBlocked(ip);
    }
  }

  /**
   * Check blocked status using Redis
   */
  private async isBlockedRedis(ip: string): Promise<BlockedIP | null> {
    if (!this.redis) return null;

    // Check whitelist
    const isWhitelisted = await this.redis.sismember("ip:whitelist", ip);
    if (isWhitelisted) {
      return null;
    }

    // Check blacklist
    const isBlacklisted = await this.redis.sismember("ip:blacklist", ip);
    if (isBlacklisted) {
      return {
        ip,
        reason: "IP in blacklist",
        blockedAt: Date.now(),
        blockType: "permanent",
      };
    }

    // Check blocked IPs
    const blockedData = await this.redis.get(`ip:blocked:${ip}`);
    if (!blockedData) {
      return null;
    }

    const blocked: BlockedIP = JSON.parse(blockedData);

    // Check if expired
    if (blocked.expiresAt && Date.now() > blocked.expiresAt) {
      await this.redis.del(`ip:blocked:${ip}`);
      return null;
    }

    return blocked;
  }

  /**
   * Block an IP address
   */
  async blockIP(
    ip: string,
    reason: string,
    durationSeconds: number = 0,
    metadata?: BlockedIP["metadata"],
  ): Promise<void> {
    const now = Date.now();
    const blockType = durationSeconds === 0 ? "permanent" : "temporary";
    const expiresAt =
      durationSeconds === 0 ? undefined : now + durationSeconds * 1000;

    const blocked: BlockedIP = {
      ip,
      reason,
      blockedAt: now,
      expiresAt,
      blockType,
      metadata,
    };

    try {
      if (this.useRedis && this.redis) {
        await this.redis.set(`ip:blocked:${ip}`, JSON.stringify(blocked));
        if (durationSeconds > 0) {
          await this.redis.expire(`ip:blocked:${ip}`, durationSeconds);
        }
        // Add to sorted set for tracking
        await this.redis.zadd("ip:blocked:all", now, ip);
      } else {
        await inMemoryStore.blockIP(blocked);
      }

      // REMOVED: console.log(`[IPBlocker] Blocked IP ${ip} (${blockType}): ${reason}`)
    } catch (error) {
      logger.error("[IPBlocker] Error blocking IP:", error);
      this.useRedis = false;
      await inMemoryStore.blockIP(blocked);
    }
  }

  /**
   * Unblock an IP address
   */
  async unblockIP(ip: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.del(`ip:blocked:${ip}`);
        await this.redis.zrem("ip:blocked:all", ip);
      } else {
        await inMemoryStore.unblockIP(ip);
      }

      // REMOVED: console.log(`[IPBlocker] Unblocked IP ${ip}`)
    } catch (error) {
      logger.error("[IPBlocker] Error unblocking IP:", error);
      this.useRedis = false;
      await inMemoryStore.unblockIP(ip);
    }
  }

  /**
   * Add IP to whitelist
   */
  async addToWhitelist(ip: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.sadd("ip:whitelist", ip);
        // Remove from blocked if exists
        await this.redis.del(`ip:blocked:${ip}`);
        await this.redis.zrem("ip:blocked:all", ip);
      } else {
        await inMemoryStore.addToWhitelist(ip);
      }

      // REMOVED: console.log(`[IPBlocker] Added IP ${ip} to whitelist`)
    } catch (error) {
      logger.error("[IPBlocker] Error adding to whitelist:", error);
      this.useRedis = false;
      await inMemoryStore.addToWhitelist(ip);
    }
  }

  /**
   * Remove IP from whitelist
   */
  async removeFromWhitelist(ip: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.srem("ip:whitelist", ip);
      } else {
        await inMemoryStore.removeFromWhitelist(ip);
      }
    } catch (error) {
      logger.error("[IPBlocker] Error removing from whitelist:", error);
      this.useRedis = false;
      await inMemoryStore.removeFromWhitelist(ip);
    }
  }

  /**
   * Add IP to blacklist
   */
  async addToBlacklist(ip: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.sadd("ip:blacklist", ip);
        // Also add to blocked
        await this.blockIP(ip, "Blacklisted", 0);
      } else {
        await inMemoryStore.addToBlacklist(ip);
      }

      // REMOVED: console.log(`[IPBlocker] Added IP ${ip} to blacklist`)
    } catch (error) {
      logger.error("[IPBlocker] Error adding to blacklist:", error);
      this.useRedis = false;
      await inMemoryStore.addToBlacklist(ip);
    }
  }

  /**
   * Remove IP from blacklist
   */
  async removeFromBlacklist(ip: string): Promise<void> {
    try {
      if (this.useRedis && this.redis) {
        await this.redis.srem("ip:blacklist", ip);
      } else {
        await inMemoryStore.removeFromBlacklist(ip);
      }
    } catch (error) {
      logger.error("[IPBlocker] Error removing from blacklist:", error);
      this.useRedis = false;
      await inMemoryStore.removeFromBlacklist(ip);
    }
  }

  /**
   * Record an abuse event and check if IP should be blocked
   */
  async recordAbuse(event: AbuseEvent): Promise<boolean> {
    const rule = DEFAULT_BLOCK_RULES[event.type];

    if (!rule || !rule.enabled) {
      return false;
    }

    try {
      // Record violation
      let violationCount: number;

      if (this.useRedis && this.redis) {
        const key = `ip:violations:${event.ip}:${rule.id}`;
        const now = Date.now();

        // Add violation
        await this.redis.zadd(key, now, `${now}:${Math.random()}`);

        // Remove old violations outside window
        const windowStart = now - rule.windowSeconds * 1000;
        await this.redis.zremrangebyscore(key, "-inf", windowStart);

        // Count violations in window
        violationCount = await this.redis.zcard(key);

        // Set expiry on violations key
        await this.redis.expire(key, rule.windowSeconds * 2);
      } else {
        await inMemoryStore.recordViolation(event.ip, rule.id);
        violationCount = await inMemoryStore.getViolationCount(
          event.ip,
          rule.id,
          rule.windowSeconds,
        );
      }

      // Check if threshold exceeded
      if (violationCount >= rule.threshold) {
        await this.blockIP(
          event.ip,
          `${rule.type.toUpperCase()}: ${event.type} (${violationCount} violations)`,
          rule.blockDurationSeconds,
          {
            lastViolation: event.type,
            requestCount: violationCount,
            ...event.metadata,
          },
        );

        return true;
      }

      return false;
    } catch (error) {
      logger.error("[IPBlocker] Error recording abuse:", error);
      return false;
    }
  }

  /**
   * Get whitelist
   */
  async getWhitelist(): Promise<string[]> {
    try {
      if (this.useRedis && this.redis) {
        return await this.redis.smembers("ip:whitelist");
      } else {
        return await inMemoryStore.getWhitelist();
      }
    } catch (error) {
      logger.error("[IPBlocker] Error getting whitelist:", error);
      this.useRedis = false;
      return await inMemoryStore.getWhitelist();
    }
  }

  /**
   * Get blacklist
   */
  async getBlacklist(): Promise<string[]> {
    try {
      if (this.useRedis && this.redis) {
        return await this.redis.smembers("ip:blacklist");
      } else {
        return await inMemoryStore.getBlacklist();
      }
    } catch (error) {
      logger.error("[IPBlocker] Error getting blacklist:", error);
      this.useRedis = false;
      return await inMemoryStore.getBlacklist();
    }
  }

  /**
   * Get all blocked IPs
   */
  async getAllBlockedIPs(): Promise<BlockedIP[]> {
    try {
      if (this.useRedis && this.redis) {
        const ips = await this.redis.zrange("ip:blocked:all", 0, -1);
        const blocked: BlockedIP[] = [];

        for (const ip of ips) {
          const data = await this.redis.get(`ip:blocked:${ip}`);
          if (data) {
            const block: BlockedIP = JSON.parse(data);
            // Skip expired
            if (!block.expiresAt || Date.now() <= block.expiresAt) {
              blocked.push(block);
            }
          }
        }

        return blocked;
      } else {
        return await inMemoryStore.getAllBlockedIPs();
      }
    } catch (error) {
      logger.error("[IPBlocker] Error getting blocked IPs:", error);
      this.useRedis = false;
      return await inMemoryStore.getAllBlockedIPs();
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

export const ipBlocker = new IPBlocker();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
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
 * Check if IP should be blocked (middleware helper)
 */
export async function checkIPBlock(
  request: NextRequest,
): Promise<BlockedIP | null> {
  const ip = getClientIp(request);

  // Skip localhost in development
  if (
    process.env.NODE_ENV === "development" &&
    (ip === "127.0.0.1" || ip === "localhost" || ip === "::1")
  ) {
    return null;
  }

  return await ipBlocker.isBlocked(ip);
}

/**
 * Record abuse event from request
 */
export async function recordAbuseFromRequest(
  request: NextRequest,
  type: string,
  severity: AbuseEvent["severity"] = "medium",
): Promise<boolean> {
  const ip = getClientIp(request);

  return await ipBlocker.recordAbuse({
    ip,
    type,
    severity,
    metadata: {
      userAgent: request.headers.get("user-agent") || undefined,
      endpoint: new URL(request.url).pathname,
    },
  });
}
