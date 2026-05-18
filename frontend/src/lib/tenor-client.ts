/**
 * Tenor API Client
 * Integration with Tenor GIF API for GIF search and trending
 * API Documentation: https://developers.google.com/tenor/guides/quickstart
 */

import { logger } from "@/lib/logger";

const TENOR_API_BASE = "https://tenor.googleapis.com/v2";

export interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif?: { url: string; dims: [number, number]; size: number };
    mediumgif?: { url: string; dims: [number, number]; size: number };
    tinygif?: { url: string; dims: [number, number]; size: number };
    nanogif?: { url: string; dims: [number, number]; size: number };
    mp4?: { url: string; dims: [number, number]; size: number };
    loopedmp4?: { url: string; dims: [number, number]; size: number };
    tinymp4?: { url: string; dims: [number, number]; size: number };
    nanomp4?: { url: string; dims: [number, number]; size: number };
    webm?: { url: string; dims: [number, number]; size: number };
    tinywebm?: { url: string; dims: [number, number]; size: number };
    nanowebm?: { url: string; dims: [number, number]; size: number };
    gifpreview?: { url: string; dims: [number, number]; size: number };
    webp?: { url: string; dims: [number, number]; size: number };
    tinywebp?: { url: string; dims: [number, number]; size: number };
    nanowebp?: { url: string; dims: [number, number]; size: number };
  };
  created: number;
  content_description: string;
  itemurl: string;
  url: string;
  tags: string[];
  flags: string[];
  hasaudio: boolean;
}

export interface TenorSearchResponse {
  results: TenorGif[];
  next: string;
}

export interface TenorCategory {
  searchterm: string;
  path: string;
  image: string;
  name: string;
}

export interface TenorCategoriesResponse {
  tags: TenorCategory[];
}

/**
 * Tenor API Client
 */
export class TenorClient {
  private apiKey: string;
  private clientKey: string;
  private locale: string;

  constructor(apiKey?: string, clientKey = "nself-chat", locale = "en_US") {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_TENOR_API_KEY || "";
    this.clientKey = clientKey;
    this.locale = locale;

    if (!this.apiKey) {
      console.warn(
        "TenorClient: No API key provided. GIF search will not work. Get a key at https://developers.google.com/tenor/guides/quickstart",
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
    const url = new URL(`${TENOR_API_BASE}/${endpoint}`);
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("client_key", this.clientKey);
    url.searchParams.set("locale", this.locale);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  /**
   * Search for GIFs
   * @param query - Search query
   * @param limit - Number of results (default: 20, max: 50)
   * @param pos - Position offset for pagination
   * @param contentFilter - Content filter level ('off', 'low', 'medium', 'high')
   */
  async search(
    query: string,
    limit = 20,
    pos?: string,
    contentFilter: "off" | "low" | "medium" | "high" = "medium",
  ): Promise<TenorSearchResponse> {
    if (!this.isConfigured()) {
      throw new Error("Tenor API key not configured");
    }

    const url = this.buildUrl("search", {
      q: query,
      limit: limit.toString(),
      ...(pos && { pos }),
      contentfilter: contentFilter,
      media_filter: "gif,tinygif,mp4,tinymp4",
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get featured/trending GIFs
   * @param limit - Number of results (default: 20, max: 50)
   * @param pos - Position offset for pagination
   * @param contentFilter - Content filter level
   */
  async featured(
    limit = 20,
    pos?: string,
    contentFilter: "off" | "low" | "medium" | "high" = "medium",
  ): Promise<TenorSearchResponse> {
    if (!this.isConfigured()) {
      throw new Error("Tenor API key not configured");
    }

    const url = this.buildUrl("featured", {
      limit: limit.toString(),
      ...(pos && { pos }),
      contentfilter: contentFilter,
      media_filter: "gif,tinygif,mp4,tinymp4",
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get trending search terms
   * @param limit - Number of results (default: 20)
   */
  async trendingTerms(limit = 20): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new Error("Tenor API key not configured");
    }

    const url = this.buildUrl("trending_terms", {
      limit: limit.toString(),
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get autocomplete suggestions
   * @param query - Partial search query
   * @param limit - Number of suggestions (default: 10)
   */
  async autocomplete(query: string, limit = 10): Promise<string[]> {
    if (!this.isConfigured()) {
      throw new Error("Tenor API key not configured");
    }

    const url = this.buildUrl("autocomplete", {
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get categories/tags
   * @param type - Category type ('featured' or 'trending')
   */
  async categories(
    type: "featured" | "trending" = "featured",
  ): Promise<TenorCategoriesResponse> {
    if (!this.isConfigured()) {
      throw new Error("Tenor API key not configured");
    }

    const url = this.buildUrl("categories", {
      type,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Register a share event (tracks GIF usage)
   * @param gifId - Tenor GIF ID
   */
  async registerShare(gifId: string): Promise<void> {
    if (!this.isConfigured()) {
      return; // Silently skip if not configured
    }

    const url = this.buildUrl("registershare", {
      id: gifId,
    });

    try {
      await fetch(url);
    } catch (error) {
      // Non-critical - just log the error
      logger.error("Failed to register Tenor share:", error);
    }
  }

  /**
   * Get the best GIF URL for display
   * Prefers MP4 for better performance, falls back to GIF
   */
  getDisplayUrl(
    gif: TenorGif,
    size: "tiny" | "medium" | "full" = "medium",
  ): string {
    const formats = gif.media_formats;

    // Prefer MP4 for smaller size and better performance
    if (size === "tiny" && formats.tinymp4) return formats.tinymp4.url;
    if (size === "medium" && formats.mp4) return formats.mp4.url;
    if (size === "full" && formats.loopedmp4) return formats.loopedmp4.url;

    // Fallback to GIF
    if (size === "tiny" && formats.tinygif) return formats.tinygif.url;
    if (size === "medium" && formats.mediumgif) return formats.mediumgif.url;
    if (formats.gif) return formats.gif.url;

    // Ultimate fallback
    return gif.url;
  }

  /**
   * Get thumbnail URL for preview
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
   */
  getDimensions(gif: TenorGif): { width: number; height: number } {
    const formats = gif.media_formats;
    const format = formats.gif || formats.mediumgif || formats.tinygif;

    if (format?.dims) {
      return { width: format.dims[0], height: format.dims[1] };
    }

    return { width: 0, height: 0 };
  }
}

// Export singleton instance
export const tenorClient = new TenorClient();

// Export factory function for custom instances
export function createTenorClient(
  apiKey?: string,
  clientKey?: string,
  locale?: string,
) {
  return new TenorClient(apiKey, clientKey, locale);
}
