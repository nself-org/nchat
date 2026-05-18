/**
 * Tenor API Client
 *
 * Production-ready Tenor (Google) API integration for GIF search and trending.
 * API Documentation: https://developers.google.com/tenor/guides/quickstart
 *
 * Features:
 * - Search GIFs with filters
 * - Featured/Trending GIFs
 * - Categories
 * - Autocomplete suggestions
 * - Trending search terms
 * - Share registration (analytics)
 * - Rate limiting and error handling
 * - Response caching
 *
 * @example
 * ```typescript
 * import { tenorClient } from '@/lib/media/tenor-api'
 *
 * // Search for GIFs
 * const results = await tenorClient.search('cats', { limit: 20 })
 *
 * // Get featured GIFs
 * const featured = await tenorClient.featured({ limit: 25 })
 * ```
 */

import type {
  Gif,
  GifSearchParams,
  GifSearchResponse,
  GifTrendingParams,
  GifTrendingResponse,
  GifCategoriesResponse,
  TenorGif,
  TenorSearchResponse,
  TenorCategory,
  TenorCategoriesResponse,
} from "@/types/gif";
import { logger } from "@/lib/logger";

// ============================================================================
// Constants
// ============================================================================

const TENOR_API_BASE = "https://tenor.googleapis.com/v2";
const DEFAULT_CLIENT_KEY = "nself-chat";
const DEFAULT_LOCALE = "en_US";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const DEFAULT_CONTENT_FILTER = "medium";

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
  resetTime: Date.now() + 60000,
  isLimited: false,
};

const RATE_LIMIT_MAX = 100; // requests per minute

function checkRateLimit(): void {
  const now = Date.now();

  if (now > rateLimitState.resetTime) {
    rateLimitState.requestCount = 0;
    rateLimitState.resetTime = now + 60000;
    rateLimitState.isLimited = false;
  }

  if (rateLimitState.requestCount >= RATE_LIMIT_MAX) {
    rateLimitState.isLimited = true;
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  rateLimitState.requestCount++;
}

// ============================================================================
// Response Cache
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
 * Transform Tenor GIF to unified Gif type
 */
function transformGif(tenorGif: TenorGif): Gif {
  const mainGif =
    tenorGif.media_formats.gif || tenorGif.media_formats.mediumgif;
  const preview =
    tenorGif.media_formats.tinygif || tenorGif.media_formats.nanogif;
  const [width, height] = mainGif?.dims || [0, 0];

  return {
    id: tenorGif.id,
    title: tenorGif.title || tenorGif.content_description || "GIF",
    provider: "tenor",
    url: preview?.url || mainGif?.url || "",
    previewUrl: tenorGif.media_formats.gifpreview?.url || preview?.url || "",
    previewGifUrl: tenorGif.media_formats.nanogif?.url || preview?.url || "",
    originalUrl: mainGif?.url || "",
    width,
    height,
    size: mainGif?.size,
    aspectRatio: height > 0 ? width / height : 1,
    backgroundColor: tenorGif.bg_color,
    rating: tenorGif.content_rating,
    tags: tenorGif.tags,
    sourceUrl: tenorGif.itemurl,
    importDatetime: new Date(tenorGif.created * 1000).toISOString(),
  };
}

/**
 * Transform Tenor category to unified type
 */
function transformCategory(category: TenorCategory) {
  return {
    id: category.searchterm,
    name: category.name || category.searchterm,
    slug: category.searchterm,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map rating to Tenor content filter
 */
function mapRatingToContentFilter(rating?: string): string {
  switch (rating?.toLowerCase()) {
    case "g":
      return "high";
    case "pg":
      return "medium";
    case "pg-13":
      return "low";
    case "r":
      return "off";
    default:
      return DEFAULT_CONTENT_FILTER;
  }
}

// ============================================================================
// Tenor Client Class
// ============================================================================

export class TenorClient {
  private apiKey: string;
  private clientKey: string;
  private locale: string;
  private baseUrl: string;

  constructor(apiKey?: string, clientKey?: string, locale?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_TENOR_API_KEY || "";
    this.clientKey = clientKey || DEFAULT_CLIENT_KEY;
    this.locale = locale || DEFAULT_LOCALE;
    this.baseUrl = TENOR_API_BASE;

    if (!this.apiKey) {
      console.warn(
        "TenorClient: No API key provided. Get a key at https://developers.google.com/tenor/guides/quickstart",
      );
    }
  }

  /**
   * Check if Tenor API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Build API URL with common parameters
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string> = {},
  ): string {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("client_key", this.clientKey);
    url.searchParams.set("locale", this.locale);

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
      throw new Error("Tenor API key not configured");
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
      throw new Error(`Tenor API error (${response.status}): ${errorText}`);
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
   * @param options - Search options
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
    const pos = options.offset ? String(options.offset) : undefined;
    const contentFilter = mapRatingToContentFilter(options.rating);

    const params: Record<string, string> = {
      q: query.trim(),
      limit: String(limit),
      contentfilter: contentFilter,
      media_filter: "gif,tinygif,nanogif,mp4,tinymp4",
    };

    if (pos) {
      params.pos = pos;
    }

    const url = this.buildUrl("search", params);

    const cacheKey = `search:${query}:${limit}:${pos}:${contentFilter}`;
    const data = await this.fetch<TenorSearchResponse>(url, cacheKey, 300000);

    return {
      gifs: data.results.map(transformGif),
      pagination: {
        totalCount: -1, // Tenor doesn't provide total count
        count: data.results.length,
        offset: options.offset || 0,
        hasMore: !!data.next,
      },
      provider: "tenor",
    };
  }

  /**
   * Get featured/trending GIFs
   *
   * @param options - Trending options
   * @returns Featured GIFs with pagination
   */
  async featured(
    options: Partial<GifTrendingParams> = {},
  ): Promise<GifTrendingResponse> {
    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const pos = options.offset ? String(options.offset) : undefined;
    const contentFilter = mapRatingToContentFilter(options.rating);

    const params: Record<string, string> = {
      limit: String(limit),
      contentfilter: contentFilter,
      media_filter: "gif,tinygif,nanogif,mp4,tinymp4",
    };

    if (pos) {
      params.pos = pos;
    }

    const url = this.buildUrl("featured", params);

    const cacheKey = `featured:${limit}:${pos}:${contentFilter}`;
    const data = await this.fetch<TenorSearchResponse>(url, cacheKey, 60000);

    return {
      gifs: data.results.map(transformGif),
      pagination: {
        totalCount: -1,
        count: data.results.length,
        offset: options.offset || 0,
        hasMore: !!data.next,
      },
      provider: "tenor",
    };
  }

  /**
   * Get trending GIFs (alias for featured)
   */
  async trending(
    options: Partial<GifTrendingParams> = {},
  ): Promise<GifTrendingResponse> {
    return this.featured(options);
  }

  /**
   * Get GIF categories
   *
   * @param type - Category type ('featured' or 'trending')
   * @returns List of categories
   */
  async categories(
    type: "featured" | "trending" = "featured",
  ): Promise<GifCategoriesResponse> {
    const url = this.buildUrl("categories", { type });

    const cacheKey = `categories:${type}`;
    const data = await this.fetch<TenorCategoriesResponse>(
      url,
      cacheKey,
      3600000,
    );

    return {
      categories: data.tags.map(transformCategory),
      provider: "tenor",
    };
  }

  /**
   * Get trending search terms
   *
   * @param limit - Number of terms to return
   * @returns Array of trending search terms
   */
  async trendingTerms(limit = 20): Promise<string[]> {
    const url = this.buildUrl("trending_terms", { limit: String(limit) });

    const cacheKey = `trending-terms:${limit}`;
    const data = await this.fetch<{ results: string[] }>(url, cacheKey, 300000);

    return data.results || [];
  }

  /**
   * Get autocomplete suggestions
   *
   * @param term - Partial search term
   * @param limit - Number of suggestions
   * @returns Array of suggestion strings
   */
  async autocomplete(term: string, limit = 10): Promise<string[]> {
    if (!term.trim()) {
      return [];
    }

    const url = this.buildUrl("autocomplete", {
      q: term.trim(),
      limit: String(limit),
    });

    const cacheKey = `autocomplete:${term}:${limit}`;
    const data = await this.fetch<{ results: string[] }>(url, cacheKey, 300000);

    return data.results || [];
  }

  /**
   * Get search suggestions (combines autocomplete with trending)
   *
   * @param term - Partial search term
   * @returns Array of suggestion strings
   */
  async searchSuggestions(term: string): Promise<string[]> {
    if (!term.trim()) {
      return this.trendingTerms(10);
    }

    const url = this.buildUrl("search_suggestions", {
      q: term.trim(),
      limit: "10",
    });

    const cacheKey = `suggestions:${term}`;
    const data = await this.fetch<{ results: string[] }>(url, cacheKey, 300000);

    return data.results || [];
  }

  /**
   * Register a share event (analytics)
   *
   * @param gifId - Tenor GIF ID
   * @param query - Original search query (optional)
   */
  async registerShare(gifId: string, query?: string): Promise<void> {
    if (!this.isConfigured()) {
      return; // Silently skip if not configured
    }

    const params: Record<string, string> = { id: gifId };
    if (query) {
      params.q = query;
    }

    const url = this.buildUrl("registershare", params);

    try {
      await fetch(url);
    } catch (error) {
      // Non-critical - just log the error
      logger.error("Failed to register Tenor share:", error);
    }
  }

  /**
   * Get a random GIF (simulated via search with random offset)
   *
   * @param tag - Optional tag to filter
   * @param rating - Content rating filter
   * @returns Single random GIF
   */
  async random(tag?: string, rating?: string): Promise<Gif> {
    const query = tag || "random";
    const randomOffset = Math.floor(Math.random() * 100);

    const results = await this.search(query, {
      limit: 1,
      offset: randomOffset,
      rating: rating as any,
    });

    if (results.gifs.length === 0) {
      throw new Error("No random GIF found");
    }

    return results.gifs[0];
  }

  /**
   * Get the best GIF URL for display
   *
   * @param gif - Tenor GIF object
   * @param size - Desired size
   * @returns URL string
   */
  getDisplayUrl(
    gif: TenorGif,
    size: "tiny" | "small" | "medium" | "large" = "medium",
  ): string {
    const formats = gif.media_formats;

    // Prefer MP4 for smaller size and better performance
    if (size === "tiny" && formats.tinymp4) return formats.tinymp4.url;
    if (size === "small" && formats.mp4) return formats.mp4.url;
    if (size === "medium" && formats.mp4) return formats.mp4.url;
    if (size === "large" && formats.mp4) return formats.mp4.url;

    // Fallback to GIF
    if (size === "tiny" && formats.nanogif) return formats.nanogif.url;
    if (size === "small" && formats.tinygif) return formats.tinygif.url;
    if (size === "medium" && formats.mediumgif) return formats.mediumgif.url;
    if (formats.gif) return formats.gif.url;

    return gif.url;
  }

  /**
   * Get thumbnail URL
   *
   * @param gif - Tenor GIF object
   * @returns Thumbnail URL
   */
  getThumbnailUrl(gif: TenorGif): string {
    const formats = gif.media_formats;
    return (
      formats.nanogif?.url ||
      formats.tinygif?.url ||
      formats.gifpreview?.url ||
      gif.url
    );
  }

  /**
   * Get GIF dimensions
   *
   * @param gif - Tenor GIF object
   * @returns Width and height
   */
  getDimensions(gif: TenorGif): { width: number; height: number } {
    const formats = gif.media_formats;
    const format = formats.gif || formats.mediumgif || formats.tinygif;

    if (format?.dims) {
      return { width: format.dims[0], height: format.dims[1] };
    }

    return { width: 0, height: 0 };
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
 * Default Tenor client instance
 * Uses NEXT_PUBLIC_TENOR_API_KEY from environment
 */
export const tenorClient = new TenorClient();

/**
 * Create a custom Tenor client with specific configuration
 *
 * @param apiKey - Your Tenor API key
 * @param clientKey - Your app identifier (optional)
 * @param locale - Locale code (optional)
 * @returns New TenorClient instance
 */
export function createTenorClient(
  apiKey: string,
  clientKey?: string,
  locale?: string,
): TenorClient {
  return new TenorClient(apiKey, clientKey, locale);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the best GIF URL from unified Gif type
 *
 * @param gif - The GIF object
 * @param size - Desired size
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
