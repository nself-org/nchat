/**
 * Preview Cache - Client-side caching for link previews
 *
 * Uses localStorage with LRU eviction strategy
 * Supports TTL-based expiration
 */

import type {
  LinkPreviewData,
  CachedPreview,
  PreviewCacheStats,
} from "./preview-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const CACHE_KEY_PREFIX = "nchat-link-preview:";
const CACHE_INDEX_KEY = "nchat-link-preview-index";
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_MAX_ENTRIES = 500;
const CLEANUP_THRESHOLD = 50; // Run cleanup when this many entries over max

// ============================================================================
// Types
// ============================================================================

interface CacheIndex {
  entries: Record<
    string,
    { fetchedAt: number; expiresAt: number; size: number }
  >;
  stats: {
    hits: number;
    misses: number;
  };
}

// ============================================================================
// Cache Class
// ============================================================================

export class PreviewCache {
  private maxEntries: number;
  private defaultTtl: number;
  private memoryCache: Map<string, CachedPreview>;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES, defaultTtl = DEFAULT_TTL) {
    this.maxEntries = maxEntries;
    this.defaultTtl = defaultTtl;
    this.memoryCache = new Map();
  }

  /**
   * Get a cached preview by URL
   */
  get(url: string): LinkPreviewData | null {
    const key = this.getKey(url);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      if (Date.now() < memoryEntry.expiresAt) {
        memoryEntry.hitCount++;
        this.updateStats(true);
        return memoryEntry.data;
      }
      // Expired in memory cache
      this.memoryCache.delete(key);
    }

    // Check localStorage
    if (typeof window === "undefined") {
      this.updateStats(false);
      return null;
    }

    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        this.updateStats(false);
        return null;
      }

      const cached: CachedPreview = JSON.parse(stored);

      // Check expiration
      if (Date.now() >= cached.expiresAt) {
        this.remove(url);
        this.updateStats(false);
        return null;
      }

      // Update hit count
      cached.hitCount++;

      // Store in memory cache for faster subsequent access
      this.memoryCache.set(key, cached);

      // Update localStorage with new hit count
      localStorage.setItem(key, JSON.stringify(cached));

      this.updateStats(true);
      return cached.data;
    } catch (error) {
      logger.warn("Failed to read from preview cache:", { context: error });
      this.updateStats(false);
      return null;
    }
  }

  /**
   * Store a preview in cache
   */
  set(url: string, data: LinkPreviewData, ttl?: number): void {
    const key = this.getKey(url);
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTtl);

    const cached: CachedPreview = {
      data,
      fetchedAt: now,
      expiresAt,
      hitCount: 0,
    };

    // Store in memory cache
    this.memoryCache.set(key, cached);

    if (typeof window === "undefined") return;

    try {
      // Store in localStorage
      const serialized = JSON.stringify(cached);
      localStorage.setItem(key, serialized);

      // Update index
      this.updateIndex(url, now, expiresAt, serialized.length);

      // Run cleanup if needed
      this.maybeCleanup();
    } catch (error) {
      // Handle quota exceeded
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        this.evictOldest(10);
        try {
          localStorage.setItem(key, JSON.stringify(cached));
          this.updateIndex(url, now, expiresAt, JSON.stringify(cached).length);
        } catch {
          logger.warn("Failed to store preview in cache after eviction");
        }
      } else {
        logger.warn("Failed to write to preview cache:", { context: error });
      }
    }
  }

  /**
   * Remove a preview from cache
   */
  remove(url: string): void {
    const key = this.getKey(url);

    // Remove from memory cache
    this.memoryCache.delete(key);

    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(key);
      this.removeFromIndex(url);
    } catch (error) {
      logger.warn("Failed to remove from preview cache:", { context: error });
    }
  }

  /**
   * Check if a URL is cached
   */
  has(url: string): boolean {
    const key = this.getKey(url);

    // Check memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
      return true;
    }

    if (typeof window === "undefined") return false;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return false;

      const cached: CachedPreview = JSON.parse(stored);
      return Date.now() < cached.expiresAt;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cached previews
   */
  clear(): void {
    this.memoryCache.clear();

    if (typeof window === "undefined") return;

    try {
      const index = this.getIndex();
      for (const url of Object.keys(index.entries)) {
        localStorage.removeItem(this.getKey(url));
      }
      localStorage.removeItem(CACHE_INDEX_KEY);
    } catch (error) {
      logger.warn("Failed to clear preview cache:", { context: error });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): PreviewCacheStats {
    const index = this.getIndex();
    const entries = Object.entries(index.entries);

    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const [, entry] of entries) {
      totalSize += entry.size;
      if (entry.fetchedAt < oldestEntry) oldestEntry = entry.fetchedAt;
      if (entry.fetchedAt > newestEntry) newestEntry = entry.fetchedAt;
    }

    const hitCount = index.stats.hits;
    const missCount = index.stats.misses;
    const totalRequests = hitCount + missCount;

    return {
      totalEntries: entries.length,
      hitCount,
      missCount,
      hitRate: totalRequests > 0 ? hitCount / totalRequests : 0,
      oldestEntry: entries.length > 0 ? oldestEntry : 0,
      newestEntry: entries.length > 0 ? newestEntry : 0,
      totalSize,
    };
  }

  /**
   * Remove expired entries
   */
  pruneExpired(): number {
    const index = this.getIndex();
    const now = Date.now();
    let removed = 0;

    for (const [url, entry] of Object.entries(index.entries)) {
      if (entry.expiresAt <= now) {
        this.remove(url);
        removed++;
      }
    }

    return removed;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getKey(url: string): string {
    // Create a stable hash for the URL
    return CACHE_KEY_PREFIX + this.hashUrl(url);
  }

  private hashUrl(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash.toString(36);
  }

  private getIndex(): CacheIndex {
    if (typeof window === "undefined") {
      return { entries: {}, stats: { hits: 0, misses: 0 } };
    }

    try {
      const stored = localStorage.getItem(CACHE_INDEX_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }

    return { entries: {}, stats: { hits: 0, misses: 0 } };
  }

  private saveIndex(index: CacheIndex): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    } catch {
      // Ignore storage errors
    }
  }

  private updateIndex(
    url: string,
    fetchedAt: number,
    expiresAt: number,
    size: number,
  ): void {
    const index = this.getIndex();
    index.entries[url] = { fetchedAt, expiresAt, size };
    this.saveIndex(index);
  }

  private removeFromIndex(url: string): void {
    const index = this.getIndex();
    delete index.entries[url];
    this.saveIndex(index);
  }

  private updateStats(hit: boolean): void {
    const index = this.getIndex();
    if (hit) {
      index.stats.hits++;
    } else {
      index.stats.misses++;
    }
    this.saveIndex(index);
  }

  private maybeCleanup(): void {
    const index = this.getIndex();
    const count = Object.keys(index.entries).length;

    if (count > this.maxEntries + CLEANUP_THRESHOLD) {
      this.pruneExpired();
      this.evictOldest(count - this.maxEntries);
    }
  }

  private evictOldest(count: number): void {
    const index = this.getIndex();
    const entries = Object.entries(index.entries);

    // Sort by fetchedAt (oldest first)
    entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);

    // Remove oldest entries
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.remove(entries[i][0]);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let cacheInstance: PreviewCache | null = null;

/**
 * Get the global preview cache instance
 */
export function getPreviewCache(): PreviewCache {
  if (!cacheInstance) {
    cacheInstance = new PreviewCache();
  }
  return cacheInstance;
}

/**
 * Configure the global preview cache
 */
export function configurePreviewCache(
  maxEntries?: number,
  defaultTtl?: number,
): void {
  cacheInstance = new PreviewCache(maxEntries, defaultTtl);
}
