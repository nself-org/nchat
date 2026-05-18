/**
 * API Cache Manager
 *
 * Provides intelligent caching for API responses with:
 * - Configurable TTL per endpoint
 * - Automatic cache invalidation
 * - Memory-efficient storage
 * - Cache warming strategies
 */

// =============================================================================
// Types
// =============================================================================

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  tags?: string[];
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[]; // Tags for bulk invalidation
  skipCache?: boolean; // Skip cache for this request
  forceRefresh?: boolean; // Force cache refresh
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export type CacheKeyFunction = (...args: unknown[]) => string;

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of entries
const CLEANUP_INTERVAL = 60 * 1000; // Clean up every minute

/**
 * TTL configuration for different data types
 */
export const CACHE_TTL = {
  // Static data (rarely changes)
  STATIC: 60 * 60 * 1000, // 1 hour
  USER_PROFILE: 15 * 60 * 1000, // 15 minutes
  CHANNEL_LIST: 10 * 60 * 1000, // 10 minutes

  // Semi-dynamic data
  CHANNEL_MEMBERS: 5 * 60 * 1000, // 5 minutes
  USER_SETTINGS: 5 * 60 * 1000, // 5 minutes
  PERMISSIONS: 5 * 60 * 1000, // 5 minutes

  // Dynamic data (changes frequently)
  MESSAGES: 30 * 1000, // 30 seconds
  PRESENCE: 10 * 1000, // 10 seconds
  TYPING: 5 * 1000, // 5 seconds

  // Real-time data (no cache)
  NONE: 0,
} as const;

// =============================================================================
// Cache Manager
// =============================================================================

/**
 * In-memory cache manager for API responses
 */
export class ApiCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanup();
  }

  /**
   * Get value from cache
   */
  get<T = unknown>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T = unknown>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? DEFAULT_TTL;

    // Don't cache if TTL is 0
    if (ttl === 0) return;

    // Check cache size limit
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags: options.tags,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string): number {
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }

    this.stats.size = this.cache.size;
    return count;
  }

  /**
   * Invalidate multiple tags at once
   */
  invalidateTags(tags: string[]): number {
    const tagSet = new Set(tags);
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.some((tag) => tagSet.has(tag))) {
        this.cache.delete(key);
        count++;
      }
    }

    this.stats.size = this.cache.size;
    return count;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    if (typeof window === "undefined") return; // Server-side only

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let apiCacheInstance: ApiCacheManager | null = null;

/**
 * Get singleton cache instance
 */
export function getApiCache(): ApiCacheManager {
  if (!apiCacheInstance) {
    apiCacheInstance = new ApiCacheManager();
  }
  return apiCacheInstance;
}

/**
 * Clear and reset cache instance
 */
export function resetApiCache(): void {
  if (apiCacheInstance) {
    apiCacheInstance.destroy();
    apiCacheInstance = null;
  }
}

// =============================================================================
// Cache Key Generators
// =============================================================================

/**
 * Generate cache key for user data
 */
export function userCacheKey(userId: string, field?: string): string {
  return field ? `user:${userId}:${field}` : `user:${userId}`;
}

/**
 * Generate cache key for channel data
 */
export function channelCacheKey(channelId: string, field?: string): string {
  return field ? `channel:${channelId}:${field}` : `channel:${channelId}`;
}

/**
 * Generate cache key for message data
 */
export function messageCacheKey(messageId: string): string {
  return `message:${messageId}`;
}

/**
 * Generate cache key for channel messages
 */
export function channelMessagesCacheKey(
  channelId: string,
  options?: { limit?: number; offset?: number },
): string {
  const params = options
    ? `:${options.limit ?? ""}:${options.offset ?? ""}`
    : "";
  return `channel:${channelId}:messages${params}`;
}

/**
 * Generate cache key for user permissions
 */
export function permissionsCacheKey(userId: string, resource?: string): string {
  return resource
    ? `permissions:${userId}:${resource}`
    : `permissions:${userId}`;
}

// =============================================================================
// Exports
// =============================================================================

export default getApiCache();
