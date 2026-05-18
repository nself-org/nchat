/**
 * Giphy API Client
 *
 * Production-ready Giphy API integration for GIF search, trending, and categories.
 * API Documentation: https://developers.giphy.com/docs/api
 *
 * Features:
 * - Search GIFs with filters
 * - Trending GIFs
 * - Categories/Tags
 * - Random GIFs
 * - Autocomplete suggestions
 * - Rate limiting and error handling
 * - Response caching
 *
 * @example
 * ```typescript
 * import { giphyClient } from '@/lib/media/giphy-api'
 *
 * // Search for GIFs
 * const results = await giphyClient.search('cats', { limit: 20 })
 *
 * // Get trending
 * const trending = await giphyClient.trending({ limit: 25 })
 * ```
 */

import type {
  Gif,
  GifSearchParams,
  GifSearchResponse,
  GifTrendingParams,
  GifTrendingResponse,
  GifCategoriesResponse,
  GiphyGif,
  GiphySearchResponse,
  GiphyCategory,
  GiphyCategoriesResponse,
} from "@/types/gif";
import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const GIPHY_API_BASE = "https://api.giphy.com/v1";
const GIPHY_API_VERSION = "v1";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const DEFAULT_RATING = "pg-13";

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitState {
  requestCount: number;
  resetTime: number;
  isLimited: boolean;
}

const rateLimitState: RateLimitState = {
  requestCount: 0,
  resetTime: Date.now() + 60000, // 1 minute window
  isLimited: false,
};

const RATE_LIMIT_MAX = 100; // requests per minute (adjust based on your API tier)

function checkRateLimit(): void {
  const now = Date.now();

  // Reset counter if window expired
  if (now > rateLimitState.resetTime) {
    rateLimitState.requestCount = 0;
    rateLimitState.resetTime = now + 60000;
    rateLimitState.isLimited = false;
  }

  // Check if rate limited
  if (rateLimitState.requestCount >= RATE_LIMIT_MAX) {
    rateLimitState.isLimited = true;
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  rateLimitState.requestCount++;
}

// ============================================================================
// Response Cache (Simple in-memory cache)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, expiresIn = 300000): void {
    // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transform Giphy GIF to unified Gif type
 */
function transformGif(giphyGif: GiphyGif): Gif {
  const original = giphyGif.images.original;
  const width = parseInt(original.width, 10);
  const height = parseInt(original.height, 10);

  return {
    id: giphyGif.id,
    title: giphyGif.title || "GIF",
    provider: "giphy",
    url: giphyGif.images.fixed_height.url,
    previewUrl:
      giphyGif.images.fixed_height_still?.url ||
      giphyGif.images.fixed_height.url,
    previewGifUrl:
      giphyGif.images.preview_gif?.url || giphyGif.images.fixed_width.url,
    originalUrl: original.url,
    width,
    height,
    size: parseInt(original.size, 10) || undefined,
    aspectRatio: width / height,
    rating: giphyGif.rating,
    sourceUrl: giphyGif.source || giphyGif.url,
    importDatetime: giphyGif.import_datetime,
  };
}

/**
 * Transform Giphy category to unified type
 */
function transformCategory(category: GiphyCategory) {
  return {
    id: category.name_encoded,
    name: category.name,
    slug: category.name_encoded,
    previewGif: category.gif ? transformGif(category.gif) : undefined,
    subcategories: category.subcategories?.map((sub) => ({
      id: sub.name_encoded,
      name: sub.name,
      slug: sub.name_encoded,
    })),
  };
}

// ============================================================================
// Giphy Client Class
// ============================================================================

export class GiphyClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_GIPHY_API_KEY || "";
    this.baseUrl = GIPHY_API_BASE;

    if (!this.apiKey) {
      console.warn(
        "GiphyClient: No API key provided. Get a key at https://developers.giphy.com/dashboard/",
      );
    }
  }

  /**
   * Check if Giphy API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Build API URL with parameters
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string> = {},
  ): string {
    const url = new URL(`${this.baseUrl}/gifs/${endpoint}`);
    url.searchParams.set("api_key", this.apiKey);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    return url.toString();
  }

  /**
   * Make API request with error handling
   */
  private async fetch<T>(
    url: string,
    cacheKey?: string,
    cacheDuration?: number,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error("Giphy API key not configured");
    }

    // Check rate limit
    checkRateLimit();

    // Check cache
    if (cacheKey) {
      const cached = cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Giphy API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // Cache successful response
    if (cacheKey && data) {
      cache.set(cacheKey, data, cacheDuration);
    }

    return data;
  }

  /**
   * Search for GIFs
   *
   * @param query - Search query string
   * @param options - Search options (limit, offset, rating, lang)
   * @returns Search results with pagination
   */
  async search(
    query: string,
    options: Partial<GifSearchParams> = {},
  ): Promise<GifSearchResponse> {
    if (!query.trim()) {
      throw new Error("Search query cannot be empty");
    }

    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = options.offset || 0;
    const rating = options.rating || DEFAULT_RATING;
    const lang = options.lang || "en";

    const url = this.buildUrl("search", {
      q: query.trim(),
      limit: String(limit),
      offset: String(offset),
      rating,
      lang,
    });

    const cacheKey = `search:${query}:${limit}:${offset}:${rating}`;
    const data = await this.fetch<GiphySearchResponse>(url, cacheKey, 300000); // 5 min cache

    return {
      gifs: data.data.map(transformGif),
      pagination: {
        totalCount: data.pagination.total_count,
        count: data.pagination.count,
        offset: data.pagination.offset,
        hasMore:
          data.pagination.offset + data.pagination.count <
          data.pagination.total_count,
      },
      provider: "giphy",
    };
  }

  /**
   * Get trending GIFs
   *
   * @param options - Trending options (limit, offset, rating)
   * @returns Trending GIFs with pagination
   */
  async trending(
    options: Partial<GifTrendingParams> = {},
  ): Promise<GifTrendingResponse> {
    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const offset = options.offset || 0;
    const rating = options.rating || DEFAULT_RATING;

    const url = this.buildUrl("trending", {
      limit: String(limit),
      offset: String(offset),
      rating,
    });

    const cacheKey = `trending:${limit}:${offset}:${rating}`;
    const data = await this.fetch<GiphySearchResponse>(url, cacheKey, 60000); // 1 min cache

    return {
      gifs: data.data.map(transformGif),
      pagination: {
        totalCount: data.pagination.total_count,
        count: data.pagination.count,
        offset: data.pagination.offset,
        hasMore:
          data.pagination.offset + data.pagination.count <
          data.pagination.total_count,
      },
      provider: "giphy",
    };
  }

  /**
   * Get GIF categories
   *
   * @returns List of categories with preview GIFs
   */
  async categories(): Promise<GifCategoriesResponse> {
    const url = this.buildUrl("categories", {});

    const cacheKey = "categories";
    const data = await this.fetch<GiphyCategoriesResponse>(
      url,
      cacheKey,
      3600000,
    ); // 1 hour cache

    return {
      categories: data.data.map(transformCategory),
      provider: "giphy",
    };
  }

  /**
   * Get a random GIF
   *
   * @param tag - Optional tag to filter random GIF
   * @param rating - Content rating filter
   * @returns Single random GIF
   */
  async random(tag?: string, rating: string = DEFAULT_RATING): Promise<Gif> {
    const params: Record<string, string> = { rating };
    if (tag) {
      params.tag = tag.trim();
    }

    const url = this.buildUrl("random", params);

    // Don't cache random results
    const data = await this.fetch<{ data: GiphyGif }>(url);

    return transformGif(data.data);
  }

  /**
   * Get a GIF by ID
   *
   * @param gifId - Giphy GIF ID
   * @returns Single GIF object
   */
  async getById(gifId: string): Promise<Gif> {
    const url = this.buildUrl(gifId, {});

    const cacheKey = `gif:${gifId}`;
    const data = await this.fetch<{ data: GiphyGif }>(url, cacheKey, 3600000);

    return transformGif(data.data);
  }

  /**
   * Get autocomplete suggestions for search
   *
   * @param term - Partial search term
   * @param limit - Number of suggestions
   * @returns Array of suggestion strings
   */
  async autocomplete(term: string, limit = 10): Promise<string[]> {
    if (!term.trim()) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/gifs/search/tags`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("q", term.trim());
    url.searchParams.set("limit", String(limit));

    const cacheKey = `autocomplete:${term}:${limit}`;
    const data = await this.fetch<{ data: Array<{ name: string }> }>(
      url.toString(),
      cacheKey,
      300000,
    );

    return data.data.map((item) => item.name);
  }

  /**
   * Get trending search terms
   *
   * @returns Array of trending search terms
   */
  async trendingSearches(): Promise<string[]> {
    const url = new URL(`${this.baseUrl}/trending/searches`);
    url.searchParams.set("api_key", this.apiKey);

    const cacheKey = "trending-searches";
    const data = await this.fetch<{ data: string[] }>(
      url.toString(),
      cacheKey,
      300000,
    );

    return data.data;
  }

  /**
   * Translate text to GIF
   *
   * @param text - Text to translate to GIF
   * @param rating - Content rating filter
   * @returns Single GIF that represents the text
   */
  async translate(text: string, rating: string = DEFAULT_RATING): Promise<Gif> {
    if (!text.trim()) {
      throw new Error("Translation text cannot be empty");
    }

    const url = this.buildUrl("translate", {
      s: text.trim(),
      rating,
    });

    const data = await this.fetch<{ data: GiphyGif }>(url);

    return transformGif(data.data);
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    cache.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default Giphy client instance
 * Uses NEXT_PUBLIC_GIPHY_API_KEY from environment
 */
export const giphyClient = new GiphyClient();

/**
 * Create a custom Giphy client with specific API key
 *
 * @param apiKey - Your Giphy API key
 * @returns New GiphyClient instance
 */
export function createGiphyClient(apiKey: string): GiphyClient {
  return new GiphyClient(apiKey);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the best GIF URL for display based on size preference
 *
 * @param gif - The GIF object
 * @param size - Desired size (preview, small, medium, large, original)
 * @returns URL to the GIF
 */
export function getGifUrl(
  gif: Gif,
  size: "preview" | "small" | "medium" | "large" | "original" = "medium",
): string {
  switch (size) {
    case "preview":
      return gif.previewUrl;
    case "small":
      return gif.previewGifUrl;
    case "medium":
      return gif.url;
    case "large":
    case "original":
      return gif.originalUrl;
    default:
      return gif.url;
  }
}

/**
 * Check if GIF is safe for work based on rating
 *
 * @param gif - The GIF object
 * @returns True if SFW (G or PG rating)
 */
export function isGifSFW(gif: Gif): boolean {
  const rating = gif.rating?.toLowerCase();
  return rating === "g" || rating === "pg";
}

/**
 * Format GIF size for display
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.2 MB")
 */
export function formatGifSize(bytes: number): string {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
