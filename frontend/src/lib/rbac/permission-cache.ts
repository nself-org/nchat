/**
 * Permission Cache - LRU cache for permission check results
 *
 * Provides high-performance caching for permission checks with
 * automatic invalidation on role changes and batch checking support.
 */

import { type Permission, type Role } from "@/types/rbac";
import { type PermissionResult } from "./permission-builder";

// ============================================================================
// Types
// ============================================================================

/**
 * Cache key components
 */
export interface CacheKey {
  userId: string;
  permission: Permission;
  channelId?: string;
  resourceId?: string;
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry {
  key: string;
  result: PermissionResult;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  invalidations: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
  enableStats: boolean;
}

/**
 * Batch permission check request
 */
export interface BatchPermissionRequest {
  userId: string;
  permissions: Permission[];
  channelId?: string;
}

/**
 * Batch permission check result
 */
export interface BatchPermissionResult {
  results: Map<Permission, PermissionResult>;
  cached: number;
  computed: number;
}

// ============================================================================
// LRU Node for doubly-linked list
// ============================================================================

interface LRUNode {
  key: string;
  entry: CacheEntry;
  prev: LRUNode | null;
  next: LRUNode | null;
}

// ============================================================================
// Permission Cache Implementation
// ============================================================================

/**
 * LRU Cache for permission check results
 */
export class PermissionCache {
  private cache: Map<string, LRUNode> = new Map();
  private head: LRUNode | null = null;
  private tail: LRUNode | null = null;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    invalidations: number;
  };

  // Invalidation subscriptions
  private userInvalidationTags: Map<string, Set<string>> = new Map();
  private roleInvalidationTags: Map<string, Set<string>> = new Map();
  private channelInvalidationTags: Map<string, Set<string>> = new Map();

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize ?? 1000,
      ttlMs: config?.ttlMs ?? 60000, // 1 minute default
      enableStats: config?.enableStats ?? true,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
    };
  }

  // -------------------------------------------------------------------------
  // Cache Operations
  // -------------------------------------------------------------------------

  /**
   * Get a cached permission result
   */
  get(key: CacheKey): PermissionResult | undefined {
    const cacheKey = this.buildCacheKey(key);
    const node = this.cache.get(cacheKey);

    if (!node) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // Check TTL
    if (this.isExpired(node.entry)) {
      this.remove(cacheKey);
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // Update access info
    node.entry.accessedAt = Date.now();
    node.entry.accessCount++;

    // Move to front (most recently used)
    this.moveToFront(node);

    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return node.entry.result;
  }

  /**
   * Set a cached permission result
   */
  set(key: CacheKey, result: PermissionResult): void {
    const cacheKey = this.buildCacheKey(key);

    // Check if already exists
    const existingNode = this.cache.get(cacheKey);
    if (existingNode) {
      // Update existing entry
      existingNode.entry.result = result;
      existingNode.entry.accessedAt = Date.now();
      this.moveToFront(existingNode);
      return;
    }

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Create new entry
    const entry: CacheEntry = {
      key: cacheKey,
      result,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 0,
    };

    const node: LRUNode = {
      key: cacheKey,
      entry,
      prev: null,
      next: null,
    };

    // Add to cache and front of list
    this.cache.set(cacheKey, node);
    this.addToFront(node);

    // Track invalidation tags
    this.trackInvalidationTags(key, cacheKey);
  }

  /**
   * Remove a specific entry
   */
  remove(cacheKey: string): boolean {
    const node = this.cache.get(cacheKey);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(cacheKey);
    return true;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: CacheKey): boolean {
    const cacheKey = this.buildCacheKey(key);
    const node = this.cache.get(cacheKey);

    if (!node) return false;
    if (this.isExpired(node.entry)) {
      this.remove(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.userInvalidationTags.clear();
    this.roleInvalidationTags.clear();
    this.channelInvalidationTags.clear();
  }

  // -------------------------------------------------------------------------
  // Invalidation
  // -------------------------------------------------------------------------

  /**
   * Invalidate all cache entries for a user
   */
  invalidateUser(userId: string): number {
    return this.invalidateByTag(this.userInvalidationTags, userId);
  }

  /**
   * Invalidate all cache entries for a role
   */
  invalidateRole(role: Role): number {
    return this.invalidateByTag(this.roleInvalidationTags, role);
  }

  /**
   * Invalidate all cache entries for a channel
   */
  invalidateChannel(channelId: string): number {
    return this.invalidateByTag(this.channelInvalidationTags, channelId);
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    const keysToRemove: string[] = [];

    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach((key) => {
      if (this.remove(key)) {
        count++;
      }
    });

    if (this.config.enableStats) {
      this.stats.invalidations += count;
    }

    return count;
  }

  /**
   * Invalidate entries by tag
   */
  private invalidateByTag(
    tagMap: Map<string, Set<string>>,
    tag: string,
  ): number {
    const keys = tagMap.get(tag);
    if (!keys) return 0;

    let count = 0;
    keys.forEach((key) => {
      if (this.remove(key)) {
        count++;
      }
    });

    tagMap.delete(tag);

    if (this.config.enableStats) {
      this.stats.invalidations += count;
    }

    return count;
  }

  // -------------------------------------------------------------------------
  // Batch Operations
  // -------------------------------------------------------------------------

  /**
   * Check multiple permissions in batch
   */
  getBatch(request: BatchPermissionRequest): BatchPermissionResult {
    const results = new Map<Permission, PermissionResult>();
    let cached = 0;
    let computed = 0;

    for (const permission of request.permissions) {
      const key: CacheKey = {
        userId: request.userId,
        permission,
        channelId: request.channelId,
      };

      const result = this.get(key);
      if (result) {
        results.set(permission, result);
        cached++;
      } else {
        computed++;
      }
    }

    return { results, cached, computed };
  }

  /**
   * Set multiple permission results in batch
   */
  setBatch(
    request: BatchPermissionRequest,
    results: Map<Permission, PermissionResult>,
  ): void {
    results.forEach((result, permission) => {
      const key: CacheKey = {
        userId: request.userId,
        permission,
        channelId: request.channelId,
      };
      this.set(key, result);
    });
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      evictions: this.stats.evictions,
      invalidations: this.stats.invalidations,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      invalidations: 0,
    };
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------

  /**
   * Update cache configuration
   */
  configure(config: Partial<CacheConfig>): void {
    if (config.maxSize !== undefined) {
      this.config.maxSize = config.maxSize;
      // Evict if over new limit
      while (this.cache.size > this.config.maxSize) {
        this.evictLRU();
      }
    }

    if (config.ttlMs !== undefined) {
      this.config.ttlMs = config.ttlMs;
    }

    if (config.enableStats !== undefined) {
      this.config.enableStats = config.enableStats;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // -------------------------------------------------------------------------
  // Helper Methods
  // -------------------------------------------------------------------------

  /**
   * Build a cache key from components
   */
  buildCacheKey(key: CacheKey): string {
    const parts = [key.userId, key.permission];
    if (key.channelId) parts.push(`ch:${key.channelId}`);
    if (key.resourceId) parts.push(`res:${key.resourceId}`);
    return parts.join(":");
  }

  /**
   * Parse a cache key into components
   */
  parseCacheKey(cacheKey: string): CacheKey | null {
    const parts = cacheKey.split(":");
    if (parts.length < 2) return null;

    const result: CacheKey = {
      userId: parts[0],
      permission: parts[1] as Permission,
    };

    // Process remaining parts in pairs (prefix:value)
    for (let i = 2; i < parts.length; i++) {
      if (parts[i] === "ch" && i + 1 < parts.length) {
        result.channelId = parts[i + 1];
        i++; // Skip the value part
      } else if (parts[i] === "res" && i + 1 < parts.length) {
        result.resourceId = parts[i + 1];
        i++; // Skip the value part
      }
    }

    return result;
  }

  /**
   * Check if an entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.createdAt > this.config.ttlMs;
  }

  /**
   * Track invalidation tags for a cache entry
   */
  private trackInvalidationTags(key: CacheKey, cacheKey: string): void {
    // Track by user
    if (!this.userInvalidationTags.has(key.userId)) {
      this.userInvalidationTags.set(key.userId, new Set());
    }
    this.userInvalidationTags.get(key.userId)!.add(cacheKey);

    // Track by channel
    if (key.channelId) {
      if (!this.channelInvalidationTags.has(key.channelId)) {
        this.channelInvalidationTags.set(key.channelId, new Set());
      }
      this.channelInvalidationTags.get(key.channelId)!.add(cacheKey);
    }
  }

  // -------------------------------------------------------------------------
  // LRU Linked List Operations
  // -------------------------------------------------------------------------

  /**
   * Add a node to the front of the list
   */
  private addToFront(node: LRUNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Move a node to the front of the list
   */
  private moveToFront(node: LRUNode): void {
    if (node === this.head) return;

    this.removeNode(node);
    this.addToFront(node);
  }

  /**
   * Remove a node from the list
   */
  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictLRU(): void {
    if (!this.tail) return;

    const key = this.tail.key;
    this.removeNode(this.tail);
    this.cache.delete(key);

    // Clean up invalidation tags
    const parsed = this.parseCacheKey(key);
    if (parsed) {
      this.userInvalidationTags.get(parsed.userId)?.delete(key);
      if (parsed.channelId) {
        this.channelInvalidationTags.get(parsed.channelId)?.delete(key);
      }
    }

    if (this.config.enableStats) {
      this.stats.evictions++;
    }
  }

  // -------------------------------------------------------------------------
  // Debug Methods
  // -------------------------------------------------------------------------

  /**
   * Get all cache entries (for debugging)
   */
  getAllEntries(): CacheEntry[] {
    const entries: CacheEntry[] = [];
    let current = this.head;

    while (current) {
      entries.push(current.entry);
      current = current.next;
    }

    return entries;
  }

  /**
   * Get entries as a map (for debugging)
   */
  toMap(): Map<string, CacheEntry> {
    const map = new Map<string, CacheEntry>();
    this.cache.forEach((node, key) => {
      map.set(key, node.entry);
    });
    return map;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new permission cache
 */
export function createPermissionCache(
  config?: Partial<CacheConfig>,
): PermissionCache {
  return new PermissionCache(config);
}

/**
 * Create a high-performance cache with larger capacity
 */
export function createHighPerformanceCache(): PermissionCache {
  return new PermissionCache({
    maxSize: 10000,
    ttlMs: 300000, // 5 minutes
    enableStats: true,
  });
}

/**
 * Create a short-lived cache for real-time scenarios
 */
export function createRealtimeCache(): PermissionCache {
  return new PermissionCache({
    maxSize: 500,
    ttlMs: 5000, // 5 seconds
    enableStats: false,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a cached permission checker that wraps a check function
 */
export function withCache<T extends (key: CacheKey) => PermissionResult>(
  cache: PermissionCache,
  checkFn: T,
): T {
  return ((key: CacheKey): PermissionResult => {
    // Check cache first
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    // Compute and cache
    const result = checkFn(key);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Create a batch cached permission checker
 */
export function withBatchCache(
  cache: PermissionCache,
  checkFn: (key: CacheKey) => PermissionResult,
): (request: BatchPermissionRequest) => BatchPermissionResult {
  return (request: BatchPermissionRequest): BatchPermissionResult => {
    // Get cached results first
    const batchResult = cache.getBatch(request);

    // Compute missing permissions
    const missingPermissions = request.permissions.filter(
      (p) => !batchResult.results.has(p),
    );

    for (const permission of missingPermissions) {
      const key: CacheKey = {
        userId: request.userId,
        permission,
        channelId: request.channelId,
      };

      const result = checkFn(key);
      batchResult.results.set(permission, result);
      cache.set(key, result);
    }

    return batchResult;
  };
}
