/**
 * AI Response Cache
 * - Redis cache for repeated AI queries
 * - Cache key generation (hash of prompt/request)
 * - TTL configuration per operation type
 * - Cache hit rate tracking
 * - Smart invalidation strategies
 */

import { getCache, type RedisCacheService } from "@/lib/redis-cache";
import { addSentryBreadcrumb } from "@/lib/sentry-utils";
import crypto from "crypto";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize?: number; // Maximum cache size (number of entries)
  keyPrefix?: string;
}

export interface CachedResponse<T = any> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export enum CacheStrategy {
  /** Cache indefinitely (until manually invalidated) */
  PERMANENT = "permanent",
  /** Cache with TTL */
  TTL = "ttl",
  /** Cache with LRU eviction */
  LRU = "lru",
  /** Don't cache */
  NONE = "none",
}

// ============================================================================
// Cache TTL Presets (in seconds)
// ============================================================================

export const AI_CACHE_TTL = {
  // Short-lived (1-5 minutes)
  REALTIME: 60, // 1 minute - for real-time data
  CHAT: 300, // 5 minutes - chat completions

  // Medium-lived (15-60 minutes)
  SUMMARIZATION: 1800, // 30 minutes - message summaries
  SEARCH: 3600, // 1 hour - search results

  // Long-lived (1-24 hours)
  EMBEDDINGS: 7200, // 2 hours - embeddings rarely change
  ANALYSIS: 14400, // 4 hours - content analysis

  // Very long-lived (1+ days)
  TRANSLATION: 86400, // 24 hours - translations don't change
  CLASSIFICATION: 86400, // 24 hours - classifications
};

// ============================================================================
// Response Cache Class
// ============================================================================

export class ResponseCache {
  private cache: RedisCacheService;
  private config: Required<CacheConfig>;
  private statsKey: string;

  constructor(namespace: string, config?: Partial<CacheConfig>) {
    this.config = {
      enabled: true,
      ttl: AI_CACHE_TTL.CHAT,
      keyPrefix: `ai:cache:${namespace}`,
      ...config,
    } as Required<CacheConfig>;

    this.cache = getCache();
    this.statsKey = `${this.config.keyPrefix}:stats`;
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    const cacheKey = this.generateCacheKey(key);

    try {
      const cached = await this.cache.get<CachedResponse<T>>(cacheKey);

      if (cached) {
        // Check if expired
        if (new Date() > new Date(cached.expiresAt)) {
          await this.delete(key);
          await this.recordMiss();
          return null;
        }

        // Update hit count
        cached.hitCount++;
        await this.cache.set(cacheKey, cached, this.getRemainingTTL(cached));

        await this.recordHit();

        addSentryBreadcrumb("ai", "Cache hit", {
          key: cacheKey,
          hitCount: cached.hitCount,
        });

        return cached.data;
      }

      await this.recordMiss();
      return null;
    } catch (error) {
      logger.error("[ResponseCache] Error getting from cache:", error);
      return null;
    }
  }

  async set<T = any>(
    key: string,
    data: T,
    options?: {
      ttl?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    if (!this.config.enabled) return;

    const cacheKey = this.generateCacheKey(key);
    const ttl = options?.ttl || this.config.ttl;
    const now = new Date();

    const cached: CachedResponse<T> = {
      data,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      hitCount: 0,
      metadata: options?.metadata,
    };

    try {
      await this.cache.set(cacheKey, cached, ttl);

      addSentryBreadcrumb("ai", "Cached response", {
        key: cacheKey,
        ttl,
      });
    } catch (error) {
      logger.error("[ResponseCache] Error setting cache:", error);
    }
  }

  async delete(key: string): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    await this.cache.del(cacheKey);
  }

  async exists(key: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(key);
    return await this.cache.exists(cacheKey);
  }

  // ============================================================================
  // Smart Caching with Hash
  // ============================================================================

  /**
   * Cache based on request payload hash
   */
  async getByPayload<T = any>(payload: any): Promise<T | null> {
    const hash = this.hashPayload(payload);
    return this.get<T>(hash);
  }

  async setByPayload<T = any>(
    payload: any,
    data: T,
    options?: {
      ttl?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    const hash = this.hashPayload(payload);
    await this.set(hash, data, options);
  }

  /**
   * Cache with semantic key (for similar prompts)
   */
  async getBySemantic<T = any>(
    prompt: string,
    threshold: number = 0.9,
  ): Promise<T | null> {
    // For now, use exact match
    return this.get<T>(prompt);
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.set(key, value);
        }
      }),
    );

    return results;
  }

  async setMany<T = any>(
    entries: Map<string, T>,
    options?: {
      ttl?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await Promise.all(
      Array.from(entries.entries()).map(([key, value]) =>
        this.set(key, value, options),
      ),
    );
  }

  // ============================================================================
  // Cache Invalidation
  // ============================================================================

  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = `${this.config.keyPrefix}:${pattern}`;
    return await this.cache.deletePattern(fullPattern);
  }

  async invalidateByUser(userId: string): Promise<number> {
    return await this.invalidatePattern(`*user:${userId}*`);
  }

  async invalidateByOrg(orgId: string): Promise<number> {
    return await this.invalidatePattern(`*org:${orgId}*`);
  }

  async clear(): Promise<void> {
    await this.cache.deletePattern(`${this.config.keyPrefix}:*`);
    await this.resetStats();
  }

  // ============================================================================
  // Cache Statistics
  // ============================================================================

  async getStats(): Promise<CacheStats> {
    const stats = await this.cache.get<{
      hits: number;
      misses: number;
    }>(this.statsKey);

    const hits = stats?.hits || 0;
    const misses = stats?.misses || 0;
    const totalRequests = hits + misses;
    const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

    // Get cache size
    const pattern = `${this.config.keyPrefix}:*`;
    const keys = await this.cache.keys(pattern);
    const cacheSize = keys.length;

    return {
      hits,
      misses,
      hitRate,
      totalRequests,
      cacheSize,
    };
  }

  async resetStats(): Promise<void> {
    await this.cache.del(this.statsKey);
  }

  private async recordHit(): Promise<void> {
    const stats = (await this.cache.get<{
      hits: number;
      misses: number;
    }>(this.statsKey)) || { hits: 0, misses: 0 };

    stats.hits++;
    await this.cache.set(this.statsKey, stats, 86400); // 24 hours
  }

  private async recordMiss(): Promise<void> {
    const stats = (await this.cache.get<{
      hits: number;
      misses: number;
    }>(this.statsKey)) || { hits: 0, misses: 0 };

    stats.misses++;
    await this.cache.set(this.statsKey, stats, 86400);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private generateCacheKey(key: string): string {
    // Use hash for long keys
    if (key.length > 100) {
      return `${this.config.keyPrefix}:${this.hashString(key)}`;
    }
    return `${this.config.keyPrefix}:${key}`;
  }

  private hashPayload(payload: any): string {
    const normalized = this.normalizePayload(payload);
    const str = JSON.stringify(normalized);
    return this.hashString(str);
  }

  private hashString(str: string): string {
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  private normalizePayload(payload: any): any {
    // Sort object keys for consistent hashing
    if (Array.isArray(payload)) {
      return payload.map(this.normalizePayload.bind(this));
    }

    if (payload && typeof payload === "object") {
      return Object.keys(payload)
        .sort()
        .reduce((acc, key) => {
          acc[key] = this.normalizePayload(payload[key]);
          return acc;
        }, {} as any);
    }

    return payload;
  }

  private getRemainingTTL(cached: CachedResponse): number {
    const now = Date.now();
    const expiresAt = new Date(cached.expiresAt).getTime();
    return Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  getConfig(): Required<CacheConfig> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...updates } as Required<CacheConfig>;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }
}

// ============================================================================
// Cache Manager
// ============================================================================

const caches = new Map<string, ResponseCache>();

export function getResponseCache(
  namespace: string,
  config?: Partial<CacheConfig>,
): ResponseCache {
  if (!caches.has(namespace)) {
    caches.set(namespace, new ResponseCache(namespace, config));
  }
  return caches.get(namespace)!;
}

// Pre-configured caches
export function getSummarizationCache(): ResponseCache {
  return getResponseCache("summarization", {
    ttl: AI_CACHE_TTL.SUMMARIZATION,
  });
}

export function getSearchCache(): ResponseCache {
  return getResponseCache("search", {
    ttl: AI_CACHE_TTL.SEARCH,
  });
}

export function getChatCache(): ResponseCache {
  return getResponseCache("chat", {
    ttl: AI_CACHE_TTL.CHAT,
  });
}

export function getEmbeddingsCache(): ResponseCache {
  return getResponseCache("embeddings", {
    ttl: AI_CACHE_TTL.EMBEDDINGS,
  });
}

// ============================================================================
// Decorator for Automatic Caching
// ============================================================================

export function cached(
  cache: ResponseCache,
  options?: {
    keyFn?: (...args: any[]) => string;
    ttl?: number;
  },
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Generate cache key
      const key = options?.keyFn
        ? options.keyFn(...args)
        : JSON.stringify(args);

      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cache.set(key, result, { ttl: options?.ttl });

      return result;
    };

    return descriptor;
  };
}
