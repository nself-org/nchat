/**
 * Sticker Service
 *
 * Provides client-side operations for sticker management including
 * fetching packs, searching, and managing user collections.
 */

import type {
  Sticker,
  StickerPack,
  UserStickerPack,
  RecentSticker,
  FavoriteSticker,
} from "@/graphql/stickers";

// ============================================================================
// TYPES
// ============================================================================

export interface StickerServiceConfig {
  baseUrl?: string;
  cacheTimeout?: number;
}

export interface FetchPacksOptions {
  limit?: number;
  offset?: number;
  searchQuery?: string;
  official?: boolean;
}

export interface SearchStickersOptions {
  limit?: number;
  includePackInfo?: boolean;
}

export interface StickerWithPack extends Sticker {
  pack?: {
    id: string;
    name: string;
    thumbnail_url: string;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const DEFAULT_FETCH_LIMIT = 50;
const RECENT_STICKERS_LIMIT = 30;

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, timeout: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > timeout;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(prefix?: string): void {
  if (prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class StickerService {
  private config: Required<StickerServiceConfig>;

  constructor(config: StickerServiceConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || "",
      cacheTimeout: config.cacheTimeout || DEFAULT_CACHE_TIMEOUT,
    };
  }

  // --------------------------------------------------------------------------
  // Pack Operations
  // --------------------------------------------------------------------------

  /**
   * Fetch available sticker packs
   */
  async fetchAvailablePacks(options: FetchPacksOptions = {}): Promise<{
    packs: StickerPack[];
    total: number;
  }> {
    const {
      limit = DEFAULT_FETCH_LIMIT,
      offset = 0,
      searchQuery,
      official,
    } = options;

    const cacheKey = `packs:${limit}:${offset}:${searchQuery || ""}:${official ?? ""}`;
    const cached = getCached<{ packs: StickerPack[]; total: number }>(
      cacheKey,
      this.config.cacheTimeout,
    );
    if (cached) return cached;

    // This would be called via Apollo Client in actual usage
    // Here we provide the interface for the service layer
    throw new Error(
      "fetchAvailablePacks must be implemented with Apollo Client",
    );
  }

  /**
   * Fetch stickers for a specific pack
   */
  async fetchPackStickers(packId: string): Promise<{
    stickers: Sticker[];
    pack: StickerPack | null;
  }> {
    const cacheKey = `pack-stickers:${packId}`;
    const cached = getCached<{ stickers: Sticker[]; pack: StickerPack | null }>(
      cacheKey,
      this.config.cacheTimeout,
    );
    if (cached) return cached;

    throw new Error("fetchPackStickers must be implemented with Apollo Client");
  }

  /**
   * Get a single pack by ID
   */
  async fetchPack(packId: string): Promise<StickerPack | null> {
    const cacheKey = `pack:${packId}`;
    const cached = getCached<StickerPack | null>(
      cacheKey,
      this.config.cacheTimeout,
    );
    if (cached) return cached;

    throw new Error("fetchPack must be implemented with Apollo Client");
  }

  /**
   * Fetch trending/popular packs
   */
  async fetchTrendingPacks(limit = 10): Promise<StickerPack[]> {
    const cacheKey = `trending-packs:${limit}`;
    const cached = getCached<StickerPack[]>(cacheKey, this.config.cacheTimeout);
    if (cached) return cached;

    throw new Error(
      "fetchTrendingPacks must be implemented with Apollo Client",
    );
  }

  // --------------------------------------------------------------------------
  // User Collection Operations
  // --------------------------------------------------------------------------

  /**
   * Fetch user's installed packs
   */
  async fetchUserPacks(userId: string): Promise<UserStickerPack[]> {
    throw new Error("fetchUserPacks must be implemented with Apollo Client");
  }

  /**
   * Add a pack to user's collection
   */
  async addPackToCollection(
    userId: string,
    packId: string,
    position?: number,
  ): Promise<UserStickerPack> {
    // Clear relevant caches
    clearCache(`user-packs:${userId}`);
    throw new Error(
      "addPackToCollection must be implemented with Apollo Client",
    );
  }

  /**
   * Remove a pack from user's collection
   */
  async removePackFromCollection(
    userId: string,
    packId: string,
  ): Promise<boolean> {
    clearCache(`user-packs:${userId}`);
    throw new Error(
      "removePackFromCollection must be implemented with Apollo Client",
    );
  }

  /**
   * Check if user has a pack installed
   */
  async checkUserHasPack(userId: string, packId: string): Promise<boolean> {
    throw new Error("checkUserHasPack must be implemented with Apollo Client");
  }

  /**
   * Reorder user's packs
   */
  async reorderUserPacks(
    userId: string,
    packIds: string[],
  ): Promise<{ success: boolean; packs: { id: string; position: number }[] }> {
    clearCache(`user-packs:${userId}`);
    throw new Error("reorderUserPacks must be implemented with Apollo Client");
  }

  // --------------------------------------------------------------------------
  // Recent Stickers Operations
  // --------------------------------------------------------------------------

  /**
   * Fetch user's recently used stickers
   */
  async fetchRecentStickers(
    userId: string,
    limit = RECENT_STICKERS_LIMIT,
  ): Promise<RecentSticker[]> {
    throw new Error(
      "fetchRecentStickers must be implemented with Apollo Client",
    );
  }

  /**
   * Add/update a recent sticker
   */
  async addRecentSticker(userId: string, stickerId: string): Promise<void> {
    throw new Error("addRecentSticker must be implemented with Apollo Client");
  }

  /**
   * Clear all recent stickers
   */
  async clearRecentStickers(userId: string): Promise<void> {
    throw new Error(
      "clearRecentStickers must be implemented with Apollo Client",
    );
  }

  // --------------------------------------------------------------------------
  // Favorite Stickers Operations
  // --------------------------------------------------------------------------

  /**
   * Fetch user's favorite stickers
   */
  async fetchFavoriteStickers(userId: string): Promise<FavoriteSticker[]> {
    throw new Error(
      "fetchFavoriteStickers must be implemented with Apollo Client",
    );
  }

  /**
   * Add a sticker to favorites
   */
  async addFavoriteSticker(
    userId: string,
    stickerId: string,
    position?: number,
  ): Promise<FavoriteSticker> {
    throw new Error(
      "addFavoriteSticker must be implemented with Apollo Client",
    );
  }

  /**
   * Remove a sticker from favorites
   */
  async removeFavoriteSticker(
    userId: string,
    stickerId: string,
  ): Promise<boolean> {
    throw new Error(
      "removeFavoriteSticker must be implemented with Apollo Client",
    );
  }

  // --------------------------------------------------------------------------
  // Search Operations
  // --------------------------------------------------------------------------

  /**
   * Search stickers by name or emoji
   */
  async searchStickers(
    query: string,
    options: SearchStickersOptions = {},
  ): Promise<StickerWithPack[]> {
    const { limit = DEFAULT_FETCH_LIMIT } = options;

    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = `search:${query}:${limit}`;
    const cached = getCached<StickerWithPack[]>(
      cacheKey,
      this.config.cacheTimeout,
    );
    if (cached) return cached;

    throw new Error("searchStickers must be implemented with Apollo Client");
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    clearCache();
  }

  /**
   * Clear pack-related caches
   */
  clearPackCaches(): void {
    clearCache("pack");
  }

  /**
   * Clear user-related caches
   */
  clearUserCaches(userId: string): void {
    clearCache(`user-packs:${userId}`);
  }

  /**
   * Validate sticker URL
   */
  static isValidStickerUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const validExtensions = [".webp", ".png", ".gif", ".json", ".tgs"];
      return validExtensions.some((ext) =>
        parsed.pathname.toLowerCase().endsWith(ext),
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if sticker is animated (Lottie)
   */
  static isAnimatedSticker(sticker: Sticker): boolean {
    if (sticker.is_animated) return true;

    const url = sticker.url.toLowerCase();
    return (
      url.endsWith(".json") || url.endsWith(".tgs") || url.endsWith(".gif")
    );
  }

  /**
   * Get sticker file type
   */
  static getStickerType(
    sticker: Sticker,
  ): "lottie" | "gif" | "webp" | "png" | "unknown" {
    const url = sticker.url.toLowerCase();

    if (url.endsWith(".json") || url.endsWith(".tgs")) return "lottie";
    if (url.endsWith(".gif")) return "gif";
    if (url.endsWith(".webp")) return "webp";
    if (url.endsWith(".png")) return "png";

    return "unknown";
  }

  /**
   * Get optimal thumbnail URL
   */
  static getThumbnailUrl(sticker: Sticker): string {
    // Prefer thumbnail if available
    if (sticker.thumbnail_url) {
      return sticker.thumbnail_url;
    }

    // For Lottie stickers, we might want to show a static preview
    // In production, this would be a generated thumbnail
    return sticker.url;
  }

  /**
   * Format sticker dimensions for display
   */
  static formatDimensions(sticker: Sticker): string {
    return `${sticker.width}x${sticker.height}`;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return "Unknown";

    const units = ["B", "KB", "MB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const stickerService = new StickerService();

export default stickerService;
