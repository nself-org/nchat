/**
 * Cache Manager - High-level cache management for offline data
 *
 * Provides cache operations for messages, channels, and users with
 * eviction policies, TTL support, and storage management.
 */

import { IndexedDBWrapper, getIndexedDB } from "./indexed-db";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  data: T;
  key: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  accessCount: number;
  lastAccessedAt: number;
  size: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum cache size in bytes */
  maxSize: number;
  /** Default TTL in milliseconds (null = no expiration) */
  defaultTTL: number | null;
  /** Maximum number of messages per channel */
  maxMessagesPerChannel: number;
  /** Enable automatic cleanup */
  autoCleanup: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  channelCount: number;
  messageCount: number;
  userCount: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * Eviction policy type
 */
export type EvictionPolicy = "lru" | "lfu" | "fifo" | "ttl";

/**
 * Cache event types
 */
export type CacheEventType =
  | "set"
  | "get"
  | "delete"
  | "clear"
  | "hit"
  | "miss"
  | "evict"
  | "expire";

/**
 * Cache event
 */
export interface CacheEvent {
  type: CacheEventType;
  key?: string;
  store?: string;
  timestamp: number;
}

/**
 * Cache event listener
 */
export type CacheEventListener = (event: CacheEvent) => void;

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 50 * 1024 * 1024, // 50MB
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxMessagesPerChannel: 100,
  autoCleanup: true,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// Cache Manager Class
// =============================================================================

/**
 * CacheManager - Manages offline data cache
 */
export class CacheManager {
  private db: IndexedDBWrapper;
  private config: CacheConfig;
  private stats: {
    hitCount: number;
    missCount: number;
  };
  private listeners: Set<CacheEventListener>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private initialized: boolean = false;

  constructor(config: Partial<CacheConfig> = {}, db?: IndexedDBWrapper) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = db || getIndexedDB();
    this.stats = { hitCount: 0, missCount: 0 };
    this.listeners = new Set();
  }

  /**
   * Initialize the cache manager
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.db.open();

    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }

    this.initialized = true;
  }

  /**
   * Destroy the cache manager
   */
  public destroy(): void {
    this.stopCleanupTimer();
    this.listeners.clear();
    this.initialized = false;
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  // ===========================================================================
  // Message Cache Operations
  // ===========================================================================

  /**
   * Cache a message
   */
  public async cacheMessage(message: {
    id: string;
    channelId: string;
    content: string;
    authorId: string;
    createdAt: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.ensureInitialized();

    const entry: CacheEntry<typeof message> = {
      data: message,
      key: message.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: this.config.defaultTTL
        ? Date.now() + this.config.defaultTTL
        : null,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      size: this.estimateSize(message),
    };

    await this.db.put("messages", entry);
    this.emit({
      type: "set",
      key: message.id,
      store: "messages",
      timestamp: Date.now(),
    });

    // Trim channel messages if over limit
    await this.trimChannelMessages(message.channelId);
  }

  /**
   * Cache multiple messages
   */
  public async cacheMessages(
    messages: Array<{
      id: string;
      channelId: string;
      content: string;
      authorId: string;
      createdAt: string;
      [key: string]: unknown;
    }>,
  ): Promise<void> {
    await this.ensureInitialized();

    const entries = messages.map((message) => ({
      data: message,
      key: message.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: this.config.defaultTTL
        ? Date.now() + this.config.defaultTTL
        : null,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      size: this.estimateSize(message),
    }));

    await this.db.putMany("messages", entries);

    // Trim messages for each affected channel
    const channelIds = [...new Set(messages.map((m) => m.channelId))];
    for (const channelId of channelIds) {
      await this.trimChannelMessages(channelId);
    }
  }

  /**
   * Get a cached message
   */
  public async getMessage(id: string): Promise<unknown | null> {
    await this.ensureInitialized();

    const entry = await this.db.get<CacheEntry<unknown>>("messages", id);

    if (!entry) {
      this.stats.missCount++;
      this.emit({
        type: "miss",
        key: id,
        store: "messages",
        timestamp: Date.now(),
      });
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      await this.db.delete("messages", id);
      this.emit({
        type: "expire",
        key: id,
        store: "messages",
        timestamp: Date.now(),
      });
      this.stats.missCount++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    await this.db.put("messages", entry);

    this.stats.hitCount++;
    this.emit({
      type: "hit",
      key: id,
      store: "messages",
      timestamp: Date.now(),
    });

    return entry.data;
  }

  /**
   * Get cached messages for a channel
   */
  public async getChannelMessages(
    channelId: string,
    limit?: number,
  ): Promise<unknown[]> {
    await this.ensureInitialized();

    const entries = await this.db.getByIndex<
      CacheEntry<{ channelId: string; createdAt: string }>
    >("messages", "channelId", channelId);

    // Filter expired entries and sort by createdAt
    const now = Date.now();
    const validEntries = entries
      .filter((entry) => !entry.expiresAt || entry.expiresAt > now)
      .sort((a, b) => {
        const aTime = new Date(a.data.createdAt).getTime();
        const bTime = new Date(b.data.createdAt).getTime();
        return bTime - aTime;
      });

    const result = limit ? validEntries.slice(0, limit) : validEntries;

    if (result.length > 0) {
      this.stats.hitCount++;
      this.emit({ type: "hit", store: "messages", timestamp: Date.now() });
    } else {
      this.stats.missCount++;
      this.emit({ type: "miss", store: "messages", timestamp: Date.now() });
    }

    return result.map((entry) => entry.data);
  }

  /**
   * Delete a cached message
   */
  public async deleteMessage(id: string): Promise<void> {
    await this.ensureInitialized();

    await this.db.delete("messages", id);
    this.emit({
      type: "delete",
      key: id,
      store: "messages",
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all messages for a channel
   */
  public async clearChannelMessages(channelId: string): Promise<void> {
    await this.ensureInitialized();

    const entries = await this.db.getByIndex<CacheEntry<{ id: string }>>(
      "messages",
      "channelId",
      channelId,
    );

    await this.db.deleteMany(
      "messages",
      entries.map((e) => e.key),
    );

    this.emit({ type: "clear", store: "messages", timestamp: Date.now() });
  }

  // ===========================================================================
  // Channel Cache Operations
  // ===========================================================================

  /**
   * Cache a channel
   */
  public async cacheChannel(channel: {
    id: string;
    name: string;
    type: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.ensureInitialized();

    const entry: CacheEntry<typeof channel> = {
      data: channel,
      key: channel.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: this.config.defaultTTL
        ? Date.now() + this.config.defaultTTL
        : null,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      size: this.estimateSize(channel),
    };

    await this.db.put("channels", entry);
    this.emit({
      type: "set",
      key: channel.id,
      store: "channels",
      timestamp: Date.now(),
    });
  }

  /**
   * Get a cached channel
   */
  public async getChannel(id: string): Promise<unknown | null> {
    await this.ensureInitialized();

    const entry = await this.db.get<CacheEntry<unknown>>("channels", id);

    if (!entry) {
      this.stats.missCount++;
      this.emit({
        type: "miss",
        key: id,
        store: "channels",
        timestamp: Date.now(),
      });
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      await this.db.delete("channels", id);
      this.emit({
        type: "expire",
        key: id,
        store: "channels",
        timestamp: Date.now(),
      });
      this.stats.missCount++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    await this.db.put("channels", entry);

    this.stats.hitCount++;
    this.emit({
      type: "hit",
      key: id,
      store: "channels",
      timestamp: Date.now(),
    });

    return entry.data;
  }

  /**
   * Get all cached channels
   */
  public async getAllChannels(): Promise<unknown[]> {
    await this.ensureInitialized();

    const entries = await this.db.getAll<CacheEntry<unknown>>("channels");

    // Filter expired entries
    const now = Date.now();
    const validEntries = entries.filter(
      (entry) => !entry.expiresAt || entry.expiresAt > now,
    );

    return validEntries.map((entry) => entry.data);
  }

  /**
   * Delete a cached channel
   */
  public async deleteChannel(id: string): Promise<void> {
    await this.ensureInitialized();

    await this.db.delete("channels", id);
    this.emit({
      type: "delete",
      key: id,
      store: "channels",
      timestamp: Date.now(),
    });
  }

  // ===========================================================================
  // User Cache Operations
  // ===========================================================================

  /**
   * Cache a user
   */
  public async cacheUser(user: {
    id: string;
    username: string;
    [key: string]: unknown;
  }): Promise<void> {
    await this.ensureInitialized();

    const entry: CacheEntry<typeof user> = {
      data: user,
      key: user.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: this.config.defaultTTL
        ? Date.now() + this.config.defaultTTL
        : null,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      size: this.estimateSize(user),
    };

    await this.db.put("users", entry);
    this.emit({
      type: "set",
      key: user.id,
      store: "users",
      timestamp: Date.now(),
    });
  }

  /**
   * Get a cached user
   */
  public async getUser(id: string): Promise<unknown | null> {
    await this.ensureInitialized();

    const entry = await this.db.get<CacheEntry<unknown>>("users", id);

    if (!entry) {
      this.stats.missCount++;
      this.emit({
        type: "miss",
        key: id,
        store: "users",
        timestamp: Date.now(),
      });
      return null;
    }

    // Check expiration
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      await this.db.delete("users", id);
      this.emit({
        type: "expire",
        key: id,
        store: "users",
        timestamp: Date.now(),
      });
      this.stats.missCount++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    await this.db.put("users", entry);

    this.stats.hitCount++;
    this.emit({ type: "hit", key: id, store: "users", timestamp: Date.now() });

    return entry.data;
  }

  /**
   * Get all cached users
   */
  public async getAllUsers(): Promise<unknown[]> {
    await this.ensureInitialized();

    const entries = await this.db.getAll<CacheEntry<unknown>>("users");

    // Filter expired entries
    const now = Date.now();
    const validEntries = entries.filter(
      (entry) => !entry.expiresAt || entry.expiresAt > now,
    );

    return validEntries.map((entry) => entry.data);
  }

  /**
   * Delete a cached user
   */
  public async deleteUser(id: string): Promise<void> {
    await this.ensureInitialized();

    await this.db.delete("users", id);
    this.emit({
      type: "delete",
      key: id,
      store: "users",
      timestamp: Date.now(),
    });
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<CacheStats> {
    await this.ensureInitialized();

    const [messages, channels, users] = await Promise.all([
      this.db.getAll<CacheEntry<unknown>>("messages"),
      this.db.getAll<CacheEntry<unknown>>("channels"),
      this.db.getAll<CacheEntry<unknown>>("users"),
    ]);

    const allEntries = [...messages, ...channels, ...users];
    const totalSize = allEntries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = allEntries.map((e) => e.createdAt).filter(Boolean);

    const totalHits = this.stats.hitCount;
    const totalMisses = this.stats.missCount;
    const total = totalHits + totalMisses;

    return {
      totalEntries: allEntries.length,
      totalSize,
      hitCount: totalHits,
      missCount: totalMisses,
      hitRate: total > 0 ? totalHits / total : 0,
      channelCount: channels.length,
      messageCount: messages.length,
      userCount: users.length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  /**
   * Clear all cached data
   */
  public async clearAll(): Promise<void> {
    await this.ensureInitialized();

    await Promise.all([
      this.db.clear("messages"),
      this.db.clear("channels"),
      this.db.clear("users"),
    ]);

    this.stats.hitCount = 0;
    this.stats.missCount = 0;

    this.emit({ type: "clear", timestamp: Date.now() });
  }

  /**
   * Evict entries based on policy
   */
  public async evict(
    policy: EvictionPolicy,
    count: number = 10,
  ): Promise<number> {
    await this.ensureInitialized();

    const stores = ["messages", "channels", "users"];
    let totalEvicted = 0;

    for (const store of stores) {
      const entries = await this.db.getAll<CacheEntry<{ id: string }>>(store);

      let sorted: typeof entries;

      switch (policy) {
        case "lru":
          // Least Recently Used
          sorted = entries.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
          break;
        case "lfu":
          // Least Frequently Used
          sorted = entries.sort((a, b) => a.accessCount - b.accessCount);
          break;
        case "fifo":
          // First In First Out
          sorted = entries.sort((a, b) => a.createdAt - b.createdAt);
          break;
        case "ttl":
          // Closest to expiration
          sorted = entries
            .filter((e) => e.expiresAt !== null)
            .sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0));
          break;
        default:
          sorted = entries;
      }

      const toEvict = sorted.slice(0, count);
      await this.db.deleteMany(
        store,
        toEvict.map((e) => e.key),
      );

      for (const entry of toEvict) {
        this.emit({
          type: "evict",
          key: entry.key,
          store,
          timestamp: Date.now(),
        });
      }

      totalEvicted += toEvict.length;
    }

    return totalEvicted;
  }

  /**
   * Remove expired entries
   */
  public async removeExpired(): Promise<number> {
    await this.ensureInitialized();

    const now = Date.now();
    const stores = ["messages", "channels", "users"];
    let totalRemoved = 0;

    for (const store of stores) {
      const entries = await this.db.getAll<CacheEntry<{ id: string }>>(store);
      const expired = entries.filter((e) => e.expiresAt && e.expiresAt < now);

      await this.db.deleteMany(
        store,
        expired.map((e) => e.key),
      );

      for (const entry of expired) {
        this.emit({
          type: "expire",
          key: entry.key,
          store,
          timestamp: Date.now(),
        });
      }

      totalRemoved += expired.length;
    }

    return totalRemoved;
  }

  // ===========================================================================
  // Event System
  // ===========================================================================

  /**
   * Subscribe to cache events
   */
  public subscribe(listener: CacheEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit a cache event
   */
  private emit(event: CacheEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[CacheManager] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart cleanup timer if interval changed
    if (
      config.cleanupInterval !== undefined ||
      config.autoCleanup !== undefined
    ) {
      this.stopCleanupTimer();
      if (this.config.autoCleanup) {
        this.startCleanupTimer();
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  /**
   * Ensure the cache manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Estimate the size of an object in bytes
   */
  private estimateSize(obj: unknown): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      // Fallback estimate
      return JSON.stringify(obj).length * 2;
    }
  }

  /**
   * Trim channel messages to max limit
   */
  private async trimChannelMessages(channelId: string): Promise<void> {
    const entries = await this.db.getByIndex<
      CacheEntry<{ id: string; createdAt: string }>
    >("messages", "channelId", channelId);

    if (entries.length <= this.config.maxMessagesPerChannel) {
      return;
    }

    // Sort by createdAt (newest first) and remove oldest
    const sorted = entries.sort((a, b) => {
      const aTime = new Date(a.data.createdAt).getTime();
      const bTime = new Date(b.data.createdAt).getTime();
      return bTime - aTime;
    });

    const toRemove = sorted.slice(this.config.maxMessagesPerChannel);
    await this.db.deleteMany(
      "messages",
      toRemove.map((e) => e.key),
    );

    for (const entry of toRemove) {
      this.emit({
        type: "evict",
        key: entry.key,
        store: "messages",
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.removeExpired();
      } catch (error) {
        logger.error("[CacheManager] Cleanup error:", error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let cacheInstance: CacheManager | null = null;

/**
 * Get the default cache manager instance
 */
export function getCacheManager(config?: Partial<CacheConfig>): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(config);
  }
  return cacheInstance;
}

/**
 * Reset the default cache manager instance
 */
export function resetCacheManager(): void {
  if (cacheInstance) {
    cacheInstance.destroy();
    cacheInstance = null;
  }
}

export default CacheManager;
