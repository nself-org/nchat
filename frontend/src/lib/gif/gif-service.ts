/**
 * GIF Service - API integration for Giphy and Tenor
 *
 * Provides a unified interface for searching, trending, and category GIF operations.
 * Supports both Giphy and Tenor providers with automatic transformation.
 *
 * @example
 * ```typescript
 * import { gifService } from '@/lib/gif/gif-service'
 *
 * // Search for GIFs
 * const results = await gifService.search({ query: 'cats', limit: 20 })
 *
 * // Get trending GIFs
 * const trending = await gifService.getTrending({ limit: 25 })
 *
 * // Get categories
 * const categories = await gifService.getCategories()
 * ```
 */

import type {
  Gif,
  GifProvider,
  GifSearchParams,
  GifSearchResponse,
  GifTrendingParams,
  GifTrendingResponse,
  GifCategory,
  GifCategoriesResponse,
  GiphyGif,
  GiphySearchResponse,
  GiphyCategory,
  GiphyCategoriesResponse,
  TenorGif,
  TenorSearchResponse,
  TenorCategory,
  TenorCategoriesResponse,
} from "@/types/gif";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get the configured GIF provider from environment
 */
export function getGifProvider(): GifProvider {
  const provider = process.env.NEXT_PUBLIC_GIF_PROVIDER?.toLowerCase();
  if (provider === "tenor") return "tenor";
  return "giphy"; // Default to Giphy
}

/**
 * Check if GIF service is configured and available
 */
export function isGifServiceAvailable(): boolean {
  const provider = getGifProvider();
  if (provider === "giphy") {
    return (
      !!process.env.NEXT_PUBLIC_GIPHY_API_KEY || !!process.env.GIPHY_API_KEY
    );
  }
  if (provider === "tenor") {
    return (
      !!process.env.NEXT_PUBLIC_TENOR_API_KEY || !!process.env.TENOR_API_KEY
    );
  }
  return false;
}

// ============================================================================
// API Base URLs
// ============================================================================

const GIPHY_API_BASE = "https://api.giphy.com/v1/gifs";
const GIPHY_STICKERS_API_BASE = "https://api.giphy.com/v1/stickers";
const TENOR_API_BASE = "https://tenor.googleapis.com/v2";

// ============================================================================
// Transformation Functions - Giphy
// ============================================================================

/**
 * Transform Giphy GIF response to unified Gif type
 */
function transformGiphyGif(gif: GiphyGif): Gif {
  const original = gif.images.original;
  const width = parseInt(original.width, 10);
  const height = parseInt(original.height, 10);

  return {
    id: gif.id,
    title: gif.title || "GIF",
    provider: "giphy",
    url: gif.images.fixed_height.url,
    previewUrl:
      gif.images.fixed_height_still?.url || gif.images.fixed_height.url,
    previewGifUrl: gif.images.preview_gif?.url || gif.images.fixed_height.url,
    originalUrl: original.url,
    width,
    height,
    size: parseInt(original.size, 10) || undefined,
    aspectRatio: width / height,
    rating: gif.rating,
    sourceUrl: gif.source || gif.url,
    importDatetime: gif.import_datetime,
  };
}

/**
 * Transform Giphy category response to unified GifCategory type
 */
function transformGiphyCategory(category: GiphyCategory): GifCategory {
  return {
    id: category.name_encoded,
    name: category.name,
    slug: category.name_encoded,
    previewGif: category.gif ? transformGiphyGif(category.gif) : undefined,
    subcategories: category.subcategories?.map((sub) => ({
      id: sub.name_encoded,
      name: sub.name,
      slug: sub.name_encoded,
    })),
  };
}

// ============================================================================
// Transformation Functions - Tenor
// ============================================================================

/**
 * Transform Tenor GIF response to unified Gif type
 */
function transformTenorGif(gif: TenorGif): Gif {
  const mainGif = gif.media_formats.gif || gif.media_formats.mediumgif;
  const preview = gif.media_formats.tinygif || gif.media_formats.nanogif;
  const [width, height] = mainGif?.dims || [0, 0];

  return {
    id: gif.id,
    title: gif.title || gif.content_description || "GIF",
    provider: "tenor",
    url: preview?.url || mainGif?.url || "",
    previewUrl: gif.media_formats.gifpreview?.url || preview?.url || "",
    previewGifUrl: gif.media_formats.nanogif?.url || preview?.url || "",
    originalUrl: mainGif?.url || "",
    width,
    height,
    size: mainGif?.size,
    aspectRatio: height > 0 ? width / height : 1,
    backgroundColor: gif.bg_color,
    rating: gif.content_rating,
    tags: gif.tags,
    sourceUrl: gif.itemurl,
    importDatetime: new Date(gif.created * 1000).toISOString(),
  };
}

/**
 * Transform Tenor category response to unified GifCategory type
 */
function transformTenorCategory(category: TenorCategory): GifCategory {
  return {
    id: category.searchterm,
    name: category.name || category.searchterm,
    slug: category.searchterm,
    // Tenor provides an image URL directly, not a full GIF object
  };
}

// ============================================================================
// API Functions - Giphy
// ============================================================================

async function giphySearch(
  params: GifSearchParams,
): Promise<GifSearchResponse> {
  const apiKey =
    process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    throw new Error("Giphy API key not configured");
  }

  const searchParams = new URLSearchParams({
    api_key: apiKey,
    q: params.query,
    limit: String(params.limit || 25),
    offset: String(params.offset || 0),
    rating: params.rating || "pg-13",
    lang: params.lang || "en",
  });

  if (params.randomId) {
    searchParams.set("random_id", params.randomId);
  }

  const response = await fetch(`${GIPHY_API_BASE}/search?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Giphy search failed: ${response.statusText}`);
  }

  const data: GiphySearchResponse = await response.json();

  return {
    gifs: data.data.map(transformGiphyGif),
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

async function giphyTrending(
  params: GifTrendingParams = {},
): Promise<GifTrendingResponse> {
  const apiKey =
    process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    throw new Error("Giphy API key not configured");
  }

  const searchParams = new URLSearchParams({
    api_key: apiKey,
    limit: String(params.limit ?? 25),
    offset: String(params.offset ?? 0),
    rating: params.rating ?? "pg-13",
  });

  const response = await fetch(`${GIPHY_API_BASE}/trending?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Giphy trending failed: ${response.statusText}`);
  }

  const data: GiphySearchResponse = await response.json();

  return {
    gifs: data.data.map(transformGiphyGif),
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

async function giphyCategories(): Promise<GifCategoriesResponse> {
  const apiKey =
    process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    throw new Error("Giphy API key not configured");
  }

  const searchParams = new URLSearchParams({
    api_key: apiKey,
  });

  const response = await fetch(
    `${GIPHY_API_BASE.replace("/gifs", "")}/gifs/categories?${searchParams}`,
  );
  if (!response.ok) {
    throw new Error(`Giphy categories failed: ${response.statusText}`);
  }

  const data: GiphyCategoriesResponse = await response.json();

  return {
    categories: data.data.map(transformGiphyCategory),
    provider: "giphy",
  };
}

async function giphyRandom(tag?: string): Promise<Gif> {
  const apiKey =
    process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY;
  if (!apiKey) {
    throw new Error("Giphy API key not configured");
  }

  const searchParams = new URLSearchParams({
    api_key: apiKey,
    rating: "pg-13",
  });

  if (tag) {
    searchParams.set("tag", tag);
  }

  const response = await fetch(`${GIPHY_API_BASE}/random?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Giphy random failed: ${response.statusText}`);
  }

  const data: { data: GiphyGif } = await response.json();

  return transformGiphyGif(data.data);
}

// ============================================================================
// API Functions - Tenor
// ============================================================================

async function tenorSearch(
  params: GifSearchParams,
): Promise<GifSearchResponse> {
  const apiKey =
    process.env.TENOR_API_KEY || process.env.NEXT_PUBLIC_TENOR_API_KEY;
  if (!apiKey) {
    throw new Error("Tenor API key not configured");
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    q: params.query,
    limit: String(params.limit || 25),
    media_filter: "gif,tinygif,nanogif",
    contentfilter: mapRatingToTenor(params.rating || "pg-13"),
    locale: params.lang || "en_US",
  });

  if (params.offset) {
    searchParams.set("pos", String(params.offset));
  }

  const response = await fetch(`${TENOR_API_BASE}/search?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Tenor search failed: ${response.statusText}`);
  }

  const data: TenorSearchResponse = await response.json();

  return {
    gifs: data.results.map(transformTenorGif),
    pagination: {
      totalCount: -1, // Tenor doesn't provide total count
      count: data.results.length,
      offset: params.offset || 0,
      hasMore: !!data.next,
    },
    provider: "tenor",
  };
}

async function tenorTrending(
  params: GifTrendingParams = {},
): Promise<GifTrendingResponse> {
  const apiKey =
    process.env.TENOR_API_KEY || process.env.NEXT_PUBLIC_TENOR_API_KEY;
  if (!apiKey) {
    throw new Error("Tenor API key not configured");
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    limit: String(params.limit ?? 25),
    media_filter: "gif,tinygif,nanogif",
    contentfilter: mapRatingToTenor(params.rating ?? "pg-13"),
  });

  if (params.offset) {
    searchParams.set("pos", String(params.offset));
  }

  const response = await fetch(`${TENOR_API_BASE}/featured?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Tenor trending failed: ${response.statusText}`);
  }

  const data: TenorSearchResponse = await response.json();

  return {
    gifs: data.results.map(transformTenorGif),
    pagination: {
      totalCount: -1,
      count: data.results.length,
      offset: params.offset || 0,
      hasMore: !!data.next,
    },
    provider: "tenor",
  };
}

async function tenorCategories(): Promise<GifCategoriesResponse> {
  const apiKey =
    process.env.TENOR_API_KEY || process.env.NEXT_PUBLIC_TENOR_API_KEY;
  if (!apiKey) {
    throw new Error("Tenor API key not configured");
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    type: "featured",
  });

  const response = await fetch(`${TENOR_API_BASE}/categories?${searchParams}`);
  if (!response.ok) {
    throw new Error(`Tenor categories failed: ${response.statusText}`);
  }

  const data: TenorCategoriesResponse = await response.json();

  return {
    categories: data.tags.map(transformTenorCategory),
    provider: "tenor",
  };
}

async function tenorRandom(tag?: string): Promise<Gif> {
  // Tenor doesn't have a direct random endpoint, so we search with random offset
  const results = await tenorSearch({
    query: tag || "random",
    limit: 1,
    offset: Math.floor(Math.random() * 100),
  });

  if (results.gifs.length === 0) {
    throw new Error("No random GIF found");
  }

  return results.gifs[0];
}

/**
 * Map rating to Tenor content filter
 */
function mapRatingToTenor(rating: string): string {
  switch (rating) {
    case "g":
      return "high";
    case "pg":
      return "medium";
    case "pg-13":
      return "low";
    case "r":
      return "off";
    default:
      return "medium";
  }
}

// ============================================================================
// Unified GIF Service
// ============================================================================

export interface GifService {
  /** Search for GIFs by query */
  search: (params: GifSearchParams) => Promise<GifSearchResponse>;
  /** Get trending GIFs */
  getTrending: (params?: GifTrendingParams) => Promise<GifTrendingResponse>;
  /** Get GIF categories */
  getCategories: () => Promise<GifCategoriesResponse>;
  /** Get a random GIF, optionally by tag */
  getRandom: (tag?: string) => Promise<Gif>;
  /** Get current provider */
  getProvider: () => GifProvider;
  /** Check if service is available */
  isAvailable: () => boolean;
}

/**
 * Create a GIF service instance for the configured provider
 */
function createGifService(): GifService {
  const provider = getGifProvider();

  if (provider === "tenor") {
    return {
      search: tenorSearch,
      getTrending: tenorTrending,
      getCategories: tenorCategories,
      getRandom: tenorRandom,
      getProvider: () => "tenor",
      isAvailable: isGifServiceAvailable,
    };
  }

  // Default to Giphy
  return {
    search: giphySearch,
    getTrending: giphyTrending,
    getCategories: giphyCategories,
    getRandom: giphyRandom,
    getProvider: () => "giphy",
    isAvailable: isGifServiceAvailable,
  };
}

/**
 * Singleton GIF service instance
 */
export const gifService = createGifService();

// ============================================================================
// Server-side proxy functions (for API routes)
// ============================================================================

/**
 * Proxy search request through API route (hides API key)
 */
export async function proxyGifSearch(
  params: GifSearchParams,
): Promise<GifSearchResponse> {
  const response = await fetch("/api/gif", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "search", ...params }),
  });

  if (!response.ok) {
    throw new Error("GIF search failed");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "GIF search failed");
  }

  return data.data;
}

/**
 * Proxy trending request through API route (hides API key)
 */
export async function proxyGifTrending(
  params?: GifTrendingParams,
): Promise<GifTrendingResponse> {
  const response = await fetch("/api/gif", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "trending", ...params }),
  });

  if (!response.ok) {
    throw new Error("GIF trending failed");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "GIF trending failed");
  }

  return data.data;
}

/**
 * Proxy categories request through API route (hides API key)
 */
export async function proxyGifCategories(): Promise<GifCategoriesResponse> {
  const response = await fetch("/api/gif", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "categories" }),
  });

  if (!response.ok) {
    throw new Error("GIF categories failed");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "GIF categories failed");
  }

  return data.data;
}

/**
 * Proxy random request through API route (hides API key)
 */
export async function proxyGifRandom(tag?: string): Promise<Gif> {
  const response = await fetch("/api/gif", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "random", query: tag }),
  });

  if (!response.ok) {
    throw new Error("GIF random failed");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "GIF random failed");
  }

  return data.data;
}

// ============================================================================
// Client-side service (uses proxy)
// ============================================================================

/**
 * Client-side GIF service that proxies requests through the API route
 * to keep API keys secure on the server
 */
export const gifClientService: GifService = {
  search: proxyGifSearch,
  getTrending: proxyGifTrending,
  getCategories: proxyGifCategories,
  getRandom: proxyGifRandom,
  getProvider: getGifProvider,
  isAvailable: () => true, // Always available client-side (server handles auth)
};

// ============================================================================
// Default Categories (fallback if API fails)
// ============================================================================

export const DEFAULT_GIF_CATEGORIES: GifCategory[] = [
  { id: "reactions", name: "Reactions", slug: "reactions" },
  { id: "entertainment", name: "Entertainment", slug: "entertainment" },
  { id: "sports", name: "Sports", slug: "sports" },
  { id: "stickers", name: "Stickers", slug: "stickers" },
  { id: "animals", name: "Animals", slug: "animals" },
  { id: "memes", name: "Memes", slug: "memes" },
  { id: "gaming", name: "Gaming", slug: "gaming" },
  { id: "emotions", name: "Emotions", slug: "emotions" },
  { id: "actions", name: "Actions", slug: "actions" },
  { id: "anime", name: "Anime", slug: "anime" },
  { id: "cartoons", name: "Cartoons", slug: "cartoons" },
  { id: "celebrities", name: "Celebrities", slug: "celebrities" },
];
