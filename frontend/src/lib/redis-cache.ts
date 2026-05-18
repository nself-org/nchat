/**
 * Redis Caching Layer
 *
 * Provides high-performance caching for GraphQL queries, API responses,
 * and frequently accessed data to reduce database load and improve response times.
 */

import Redis, { RedisOptions } from "ioredis";
import { createLogger } from "./logger";

const log = createLogger("Redis");

// ============================================================================
// Configuration
// ============================================================================

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  enableOfflineQueue?: boolean;
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | void;
  defaultTTL: number; // seconds
}

const DEFAULT_CONFIG: CacheConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
  keyPrefix: "nchat:",
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  defaultTTL: 300, // 5 minutes
};

// ============================================================================
// Cache Key Patterns
// ============================================================================

export const CacheKeys = {
  // User data
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userPresence: (userId: string) => `user:presence:${userId}`,
  userSettings: (userId: string) => `user:settings:${userId}`,

  // Channel data
  channel: (channelId: string) => `channel:${channelId}`,
  channelMembers: (channelId: string) => `channel:members:${channelId}`,
  channelUnread: (userId: string, channelId: string) =>
    `channel:unread:${userId}:${channelId}`,
  channelStats: (channelId: string) => `channel:stats:${channelId}`,

  // Message data
  message: (messageId: string) => `message:${messageId}`,
  messageReactions: (messageId: string) => `message:reactions:${messageId}`,
  messageThread: (messageId: string) => `message:thread:${messageId}`,
  channelMessages: (channelId: string, page: number) =>
    `channel:messages:${channelId}:${page}`,

  // Direct messages
  dm: (dmId: string) => `dm:${dmId}`,
  dmMessages: (dmId: string, page: number) => `dm:messages:${dmId}:${page}`,

  // Search results
  searchMessages: (query: string, page: number) =>
    `search:messages:${query}:${page}`,
  searchChannels: (query: string) => `search:channels:${query}`,
  searchUsers: (query: string) => `search:users:${query}`,

  // Analytics
  onlineUsers: () => `analytics:online_users`,
  activeChannels: () => `analytics:active_channels`,
  messageStats: (date: string) => `analytics:messages:${date}`,

  // Session data
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `sessions:${userId}`,

  // Rate limiting
  rateLimit: (userId: string, endpoint: string) =>
    `ratelimit:${userId}:${endpoint}`,
  complexity: (userId: string) => `complexity:${userId}`,

  // App configuration
  appConfig: () => `config:app`,
  featureFlags: () => `config:features`,
};

// ============================================================================
// Cache TTL Strategies (in seconds)
// ============================================================================

export const CacheTTL = {
  // Very short (1-5 minutes)
  userPresence: 60, // 1 minute
  onlineUsers: 60,
  typingIndicators: 30,

  // Short (5-15 minutes)
  channelMessages: 300, // 5 minutes
  messageReactions: 300,
  userSettings: 600, // 10 minutes

  // Medium (15-60 minutes)
  channelMembers: 900, // 15 minutes
  channelStats: 1800, // 30 minutes
  userProfile: 1800,

  // Long (1-24 hours)
  channel: 3600, // 1 hour
  searchResults: 3600,
  analytics: 7200, // 2 hours

  // Very long (1+ days)
  appConfig: 86400, // 24 hours
  featureFlags: 86400,

  // Session-based
  session: 3600, // 1 hour
  rateLimit: 60, // 1 minute
};

// ============================================================================
// Redis Cache Service
// ============================================================================

export class RedisCacheService {
  private client: Redis;
  private config: CacheConfig;
  private isConnected: boolean = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const redisOptions: RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      enableOfflineQueue: this.config.enableOfflineQueue,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      retryStrategy: this.config.retryStrategy,
      lazyConnect: true, // Don't connect immediately
    };

    this.client = new Redis(redisOptions);

    this.client.on("connect", () => {
      this.isConnected = true;
      log.info("Connected to Redis server");
    });

    this.client.on("error", (error) => {
      this.isConnected = false;
      log.error("Connection error", error);
    });

    this.client.on("close", () => {
      this.isConnected = false;
      log.info("Connection closed");
    });

    this.client.on("reconnecting", () => {
      log.info("Reconnecting...");
    });
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // ============================================================================
  // Basic Cache Operations
  // ============================================================================

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      log.error(`Error getting key ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const ttlSeconds = ttl || this.config.defaultTTL;

      if (ttlSeconds > 0) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      return true;
    } catch (error) {
      log.error(`Error setting key ${key}`, error);
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      return await this.client.del(...keys);
    } catch (error) {
      log.error(`Error deleting key(s):`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      log.error(`Error checking key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      log.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      log.error(`Error setting expiry for key ${key}:`, error);
      return false;
    }
  }

  // ============================================================================
  // Advanced Cache Operations
  // ============================================================================

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values.map((val) => (val ? JSON.parse(val) : null));
    } catch (error) {
      log.error(`Error getting multiple keys:`, error);
      return keys.map(() => null);
    }
  }

  async mset(
    keyValuePairs: Record<string, any>,
    ttl?: number,
  ): Promise<boolean> {
    try {
      const pipeline = this.client.pipeline();
      const ttlSeconds = ttl || this.config.defaultTTL;

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          pipeline.setex(key, ttlSeconds, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      log.error(`Error setting multiple keys:`, error);
      return false;
    }
  }

  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.client.incr(key);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      log.error(`Error incrementing key ${key}:`, error);
      return 0;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      log.error(`Error decrementing key ${key}:`, error);
      return 0;
    }
  }

  // ============================================================================
  // Hash Operations
  // ============================================================================

  async hget<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      log.error(`Error getting hash field ${key}:${field}:`, error);
      return null;
    }
  }

  async hset<T>(key: string, field: string, value: T): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.hset(key, field, serialized);
      return true;
    } catch (error) {
      log.error(`Error setting hash field ${key}:${field}:`, error);
      return false;
    }
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    try {
      const hash = await this.client.hgetall(key);
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      log.error(`Error getting all hash fields ${key}:`, error);
      return {};
    }
  }

  async hdel(key: string, fields: string | string[]): Promise<number> {
    try {
      const fieldArray = Array.isArray(fields) ? fields : [fields];
      return await this.client.hdel(key, ...fieldArray);
    } catch (error) {
      log.error(`Error deleting hash fields ${key}:`, error);
      return 0;
    }
  }

  // ============================================================================
  // Set Operations
  // ============================================================================

  async sadd(key: string, members: string | string[]): Promise<number> {
    try {
      const memberArray = Array.isArray(members) ? members : [members];
      return await this.client.sadd(key, ...memberArray);
    } catch (error) {
      log.error(`Error adding to set ${key}:`, error);
      return 0;
    }
  }

  async srem(key: string, members: string | string[]): Promise<number> {
    try {
      const memberArray = Array.isArray(members) ? members : [members];
      return await this.client.srem(key, ...memberArray);
    } catch (error) {
      log.error(`Error removing from set ${key}:`, error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      log.error(`Error getting set members ${key}:`, error);
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      log.error(`Error checking set member ${key}:`, error);
      return false;
    }
  }

  // ============================================================================
  // Pattern-based Operations
  // ============================================================================

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      log.error(`Error getting keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.del(keys);
    } catch (error) {
      log.error(`Error deleting pattern ${pattern}:`, error);
      return 0;
    }
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  async invalidateUser(userId: string): Promise<void> {
    await this.deletePattern(`*user:*${userId}*`);
  }

  async invalidateChannel(channelId: string): Promise<void> {
    await this.deletePattern(`*channel:*${channelId}*`);
  }

  async invalidateMessage(messageId: string): Promise<void> {
    await this.deletePattern(`*message:*${messageId}*`);
  }

  async flushAll(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (error) {
      log.error(`Error flushing database:`, error);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      log.error(`Ping failed:`, error);
      return false;
    }
  }

  async info(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      log.error(`Error getting info:`, error);
      return "";
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cacheInstance: RedisCacheService | null = null;

export function getCache(): RedisCacheService {
  if (!cacheInstance) {
    cacheInstance = new RedisCacheService();
    // Auto-connect in development
    if (process.env.NODE_ENV !== "production") {
      cacheInstance.connect().catch(log.error);
    }
  }
  return cacheInstance;
}

export function resetCache(): void {
  if (cacheInstance) {
    cacheInstance.disconnect();
    cacheInstance = null;
  }
}

// ============================================================================
// Cache Decorator (for function memoization)
// ============================================================================

export function cached<T>(
  keyFn: (...args: any[]) => string,
  ttl: number = CacheTTL.channelMessages,
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cache = getCache();
      const key = keyFn(...args);

      // Try to get from cache
      const cached = await cache.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cache.set(key, result, ttl);

      return result;
    };

    return descriptor;
  };
}
