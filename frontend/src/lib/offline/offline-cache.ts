/**
 * Offline Cache - High-level cache management for offline data
 *
 * Provides cache invalidation, expiration, and size management
 * on top of the offline storage layer.
 */

import {
  channelStorage,
  messageStorage,
  userStorage,
  cacheMetaStorage,
  getStorageStats,
} from "./offline-storage";
import type {
  CachedChannel,
  CachedMessage,
  CachedUser,
  CacheStats,
  OfflineConfig,
  DEFAULT_OFFLINE_CONFIG,
} from "./offline-types";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Cache event types
 */
export type CacheEventType =
  | "cache_hit"
  | "cache_miss"
  | "cache_set"
  | "cache_delete"
  | "cache_clear"
  | "cache_expired"
  | "storage_warning";

/**
 * Cache event listener
 */
export type CacheEventListener = (event: {
  type: CacheEventType;
  key?: string;
  details?: Record<string, unknown>;
}) => void;

// =============================================================================
// Cache Manager Class
// =============================================================================

class OfflineCache {
  private config: OfflineConfig;
  private listeners: Set<CacheEventListener> = new Set();
  private hitCount: number = 0;
  private missCount: number = 0;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<OfflineConfig>) {
    // Import default config inline to avoid circular dependency issues
    this.config = {
      cacheEnabled: true,
      maxCacheSize: 50 * 1024 * 1024,
      maxCacheAge: 7 * 24 * 60 * 60 * 1000,
      cacheChannelMessages: 100,
      cacheChannels: 50,
      queueEnabled: true,
      maxQueueSize: 100,
      maxQueueAge: 24 * 60 * 60 * 1000,
      autoSync: true,
      syncInterval: 30 * 1000,
      syncOnReconnect: true,
      backgroundSync: true,
      retry: {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        strategy: "exponential",
        factor: 2,
        jitter: true,
        retryOn: [408, 429, 500, 502, 503, 504],
      },
      networkCheckInterval: 10000,
      networkCheckUrl: "/api/health",
      storageWarningThreshold: 40 * 1024 * 1024,
      storageCriticalThreshold: 48 * 1024 * 1024,
      ...config,
    };
  }

  /**
   * Initialize the cache manager
   */
  public initialize(): void {
    if (!this.config.cacheEnabled) return;

    // Start periodic cleanup
    this.cleanupInterval = setInterval(
      () => this.runCleanup(),
      60 * 1000, // Every minute
    );

    // Initial cleanup
    this.runCleanup();
  }

  /**
   * Cleanup the cache manager
   */
  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.listeners.clear();
  }

  // ===========================================================================
  // Channel Cache
  // ===========================================================================

  /**
   * Get a cached channel
   */
  async getChannel(id: string): Promise<CachedChannel | undefined> {
    if (!this.config.cacheEnabled) return undefined;

    const channel = await channelStorage.get(id);

    if (channel) {
      this.hitCount++;
      this.emit({ type: "cache_hit", key: `channel:${id}` });
      await this.updateAccessTime(`channel:${id}`);
      return channel;
    }

    this.missCount++;
    this.emit({ type: "cache_miss", key: `channel:${id}` });
    return undefined;
  }

  /**
   * Get all cached channels
   */
  async getAllChannels(): Promise<CachedChannel[]> {
    if (!this.config.cacheEnabled) return [];
    return channelStorage.getAll();
  }

  /**
   * Cache a channel
   */
  async setChannel(channel: CachedChannel): Promise<void> {
    if (!this.config.cacheEnabled) return;

    await channelStorage.save(channel);
    await this.updateCacheMeta(`channel:${channel.id}`, 500);
    this.emit({ type: "cache_set", key: `channel:${channel.id}` });

    // Check storage limits
    await this.checkStorageLimits();
  }

  /**
   * Cache multiple channels
   */
  async setChannels(channels: CachedChannel[]): Promise<void> {
    if (!this.config.cacheEnabled) return;

    // Limit to configured max
    const toCache = channels.slice(0, this.config.cacheChannels);

    await channelStorage.saveMany(toCache);

    for (const channel of toCache) {
      await this.updateCacheMeta(`channel:${channel.id}`, 500);
    }

    this.emit({
      type: "cache_set",
      details: { count: toCache.length, type: "channels" },
    });

    await this.checkStorageLimits();
  }

  /**
   * Remove a cached channel
   */
  async removeChannel(id: string): Promise<void> {
    await channelStorage.remove(id);
    await cacheMetaStorage.remove(`channel:${id}`);
    this.emit({ type: "cache_delete", key: `channel:${id}` });
  }

  // ===========================================================================
  // Message Cache
  // ===========================================================================

  /**
   * Get cached messages for a channel
   */
  async getMessages(
    channelId: string,
    limit?: number,
  ): Promise<CachedMessage[]> {
    if (!this.config.cacheEnabled) return [];

    const messages = await messageStorage.getByChannel(
      channelId,
      limit ?? this.config.cacheChannelMessages,
    );

    if (messages.length > 0) {
      this.hitCount++;
      this.emit({ type: "cache_hit", key: `messages:${channelId}` });
      await this.updateAccessTime(`messages:${channelId}`);
    } else {
      this.missCount++;
      this.emit({ type: "cache_miss", key: `messages:${channelId}` });
    }

    return messages;
  }

  /**
   * Get a single cached message
   */
  async getMessage(id: string): Promise<CachedMessage | undefined> {
    if (!this.config.cacheEnabled) return undefined;

    const message = await messageStorage.get(id);

    if (message) {
      this.hitCount++;
      this.emit({ type: "cache_hit", key: `message:${id}` });
      return message;
    }

    this.missCount++;
    this.emit({ type: "cache_miss", key: `message:${id}` });
    return undefined;
  }

  /**
   * Get pending (unsent) messages
   */
  async getPendingMessages(): Promise<CachedMessage[]> {
    if (!this.config.cacheEnabled) return [];
    return messageStorage.getPending();
  }

  /**
   * Cache a message
   */
  async setMessage(message: CachedMessage): Promise<void> {
    if (!this.config.cacheEnabled) return;

    await messageStorage.save(message);
    await this.updateCacheMeta(`message:${message.id}`, 1000);
    this.emit({ type: "cache_set", key: `message:${message.id}` });

    // Trim messages if over limit
    await this.trimChannelMessages(message.channelId);
  }

  /**
   * Cache multiple messages
   */
  async setMessages(messages: CachedMessage[]): Promise<void> {
    if (!this.config.cacheEnabled || messages.length === 0) return;

    await messageStorage.saveMany(messages);

    for (const message of messages) {
      await this.updateCacheMeta(`message:${message.id}`, 1000);
    }

    this.emit({
      type: "cache_set",
      details: { count: messages.length, type: "messages" },
    });

    // Trim messages for affected channels
    const channelIds = [...new Set(messages.map((m) => m.channelId))];
    for (const channelId of channelIds) {
      await this.trimChannelMessages(channelId);
    }
  }

  /**
   * Remove a cached message
   */
  async removeMessage(id: string): Promise<void> {
    await messageStorage.remove(id);
    await cacheMetaStorage.remove(`message:${id}`);
    this.emit({ type: "cache_delete", key: `message:${id}` });
  }

  /**
   * Remove all messages for a channel
   */
  async removeChannelMessages(channelId: string): Promise<void> {
    await messageStorage.removeByChannel(channelId);
    await cacheMetaStorage.remove(`messages:${channelId}`);
    this.emit({ type: "cache_delete", key: `messages:${channelId}` });
  }

  /**
   * Trim messages for a channel to configured limit
   */
  private async trimChannelMessages(channelId: string): Promise<void> {
    const count = await messageStorage.countByChannel(channelId);

    if (count > this.config.cacheChannelMessages) {
      const messages = await messageStorage.getByChannel(channelId);
      const toRemove = messages.slice(this.config.cacheChannelMessages);

      for (const message of toRemove) {
        await messageStorage.remove(message.id);
        await cacheMetaStorage.remove(`message:${message.id}`);
      }

      // REMOVED: console.log(`[OfflineCache] Trimmed ${toRemove.length} messages from channel ${channelId}`)
    }
  }

  // ===========================================================================
  // User Cache
  // ===========================================================================

  /**
   * Get a cached user
   */
  async getUser(id: string): Promise<CachedUser | undefined> {
    if (!this.config.cacheEnabled) return undefined;

    const user = await userStorage.get(id);

    if (user) {
      this.hitCount++;
      this.emit({ type: "cache_hit", key: `user:${id}` });
      await this.updateAccessTime(`user:${id}`);
      return user;
    }

    this.missCount++;
    this.emit({ type: "cache_miss", key: `user:${id}` });
    return undefined;
  }

  /**
   * Get all cached users
   */
  async getAllUsers(): Promise<CachedUser[]> {
    if (!this.config.cacheEnabled) return [];
    return userStorage.getAll();
  }

  /**
   * Cache a user
   */
  async setUser(user: CachedUser): Promise<void> {
    if (!this.config.cacheEnabled) return;

    await userStorage.save(user);
    await this.updateCacheMeta(`user:${user.id}`, 300);
    this.emit({ type: "cache_set", key: `user:${user.id}` });
  }

  /**
   * Cache multiple users
   */
  async setUsers(users: CachedUser[]): Promise<void> {
    if (!this.config.cacheEnabled) return;

    await userStorage.saveMany(users);

    for (const user of users) {
      await this.updateCacheMeta(`user:${user.id}`, 300);
    }

    this.emit({
      type: "cache_set",
      details: { count: users.length, type: "users" },
    });
  }

  /**
   * Remove a cached user
   */
  async removeUser(id: string): Promise<void> {
    await userStorage.remove(id);
    await cacheMetaStorage.remove(`user:${id}`);
    this.emit({ type: "cache_delete", key: `user:${id}` });
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      channelStorage.clear(),
      messageStorage.clear(),
      userStorage.clear(),
      cacheMetaStorage.clear(),
    ]);

    this.hitCount = 0;
    this.missCount = 0;

    this.emit({ type: "cache_clear" });
  }

  /**
   * Run cache cleanup
   */
  async runCleanup(): Promise<void> {
    if (!this.config.cacheEnabled) return;

    try {
      // Remove expired entries
      const expired = await cacheMetaStorage.getExpired();
      for (const meta of expired) {
        await this.removeByMetaKey(meta.key);
        this.emit({ type: "cache_expired", key: meta.key });
      }

      if (expired.length > 0) {
      }

      // Check and handle storage limits
      await this.checkStorageLimits();
    } catch (error) {
      logger.error("[OfflineCache] Cleanup error:", error);
    }
  }

  /**
   * Remove cache entry by meta key
   */
  private async removeByMetaKey(key: string): Promise<void> {
    const [type, id] = key.split(":");

    switch (type) {
      case "channel":
        await channelStorage.remove(id);
        break;
      case "message":
        await messageStorage.remove(id);
        break;
      case "user":
        await userStorage.remove(id);
        break;
    }

    await cacheMetaStorage.remove(key);
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMeta(key: string, size: number): Promise<void> {
    const expiresAt = new Date(Date.now() + this.config.maxCacheAge);
    await cacheMetaStorage.set(key, { size, expiresAt });
  }

  /**
   * Update access time for cache entry
   */
  private async updateAccessTime(key: string): Promise<void> {
    const meta = await cacheMetaStorage.get(key);
    if (meta) {
      await cacheMetaStorage.set(key, {
        ...meta,
        accessCount: meta.accessCount + 1,
      });
    }
  }

  /**
   * Check storage limits and evict if necessary
   */
  private async checkStorageLimits(): Promise<void> {
    const stats = await getStorageStats();

    // Warning threshold
    if (stats.estimatedSize > this.config.storageWarningThreshold) {
      this.emit({
        type: "storage_warning",
        details: {
          currentSize: stats.estimatedSize,
          threshold: this.config.storageWarningThreshold,
        },
      });
      console.warn(
        `[OfflineCache] Storage warning: ${Math.round(stats.estimatedSize / 1024 / 1024)}MB used`,
      );
    }

    // Critical threshold - evict old entries
    if (stats.estimatedSize > this.config.storageCriticalThreshold) {
      logger.warn(
        "[OfflineCache] Critical storage threshold reached, evicting old entries",
      );
      await this.evictOldEntries();
    }
  }

  /**
   * Evict oldest cache entries to free space
   */
  private async evictOldEntries(): Promise<void> {
    // Get all channels sorted by cachedAt
    const channels = await channelStorage.getAll();
    channels.sort(
      (a, b) => new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime(),
    );

    // Remove oldest 20% of channels and their messages
    const toRemove = Math.ceil(channels.length * 0.2);
    for (let i = 0; i < toRemove && i < channels.length; i++) {
      const channel = channels[i];
      await this.removeChannel(channel.id);
      await this.removeChannelMessages(channel.id);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const stats = await getStorageStats();
    const hitRate =
      this.hitCount + this.missCount > 0
        ? this.hitCount / (this.hitCount + this.missCount)
        : 0;

    // Get date range
    const channels = await channelStorage.getAll();
    const dates = channels
      .map((c) => new Date(c.cachedAt).getTime())
      .filter((d) => !isNaN(d));

    return {
      totalEntries: stats.channels + stats.messages + stats.users,
      totalSize: stats.estimatedSize,
      channelCount: stats.channels,
      messageCount: stats.messages,
      userCount: stats.users,
      oldestEntry: dates.length > 0 ? new Date(Math.min(...dates)) : null,
      newestEntry: dates.length > 0 ? new Date(Math.max(...dates)) : null,
      hitRate,
      missRate: 1 - hitRate,
    };
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
  private emit(event: {
    type: CacheEventType;
    key?: string;
    details?: Record<string, unknown>;
  }): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("[OfflineCache] Event listener error:", error);
      }
    });
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  /**
   * Update configuration
   */
  public setConfig(config: Partial<OfflineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): OfflineConfig {
    return { ...this.config };
  }

  /**
   * Check if cache is enabled
   */
  public isEnabled(): boolean {
    return this.config.cacheEnabled;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let offlineCache: OfflineCache | null = null;

/**
 * Get or create the offline cache singleton
 */
export function getOfflineCache(config?: Partial<OfflineConfig>): OfflineCache {
  if (!offlineCache) {
    offlineCache = new OfflineCache(config);
  }
  return offlineCache;
}

/**
 * Initialize the offline cache
 */
export function initializeOfflineCache(
  config?: Partial<OfflineConfig>,
): OfflineCache {
  const cache = getOfflineCache(config);
  cache.initialize();
  return cache;
}

/**
 * Cleanup the offline cache
 */
export function cleanupOfflineCache(): void {
  if (offlineCache) {
    offlineCache.cleanup();
    offlineCache = null;
  }
}

export { OfflineCache };
export default getOfflineCache;
