/**
 * URL Unfurling Service
 *
 * This service handles fetching and parsing metadata from URLs
 * to create rich link previews. It supports:
 * - Open Graph meta tags
 * - Twitter Card meta tags
 * - oEmbed endpoints
 * - Basic HTML metadata
 *
 * @example
 * ```typescript
 * import { unfurlUrl, UnfurlResult } from '@/lib/embeds/unfurl-service'
 *
 * const result = await unfurlUrl('https://example.com/article')
 * if (result.success) {
 *   // console.log(result.data.title, result.data.description)
 * }
 * ```
 */

import { detectEmbedType, type EmbedType } from "./embed-patterns";

// ============================================================================
// TYPES
// ============================================================================

export interface OpenGraphData {
  title?: string;
  type?: string;
  url?: string;
  description?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  siteName?: string;
  locale?: string;
  audio?: string;
  video?: string;
  videoWidth?: number;
  videoHeight?: number;
  videoType?: string;
  determiner?: string;
}

export interface TwitterCardData {
  card?: "summary" | "summary_large_image" | "app" | "player";
  site?: string;
  siteId?: string;
  creator?: string;
  creatorId?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  player?: string;
  playerWidth?: number;
  playerHeight?: number;
  playerStream?: string;
}

export interface OEmbedData {
  type: "photo" | "video" | "link" | "rich";
  version: string;
  title?: string;
  authorName?: string;
  authorUrl?: string;
  providerName?: string;
  providerUrl?: string;
  cacheAge?: number;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  width?: number;
  height?: number;
  html?: string;
  url?: string;
}

export interface UnfurlData {
  url: string;
  embedType: EmbedType;
  title?: string;
  description?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  favicon?: string;
  siteName?: string;
  author?: string;
  authorUrl?: string;
  publishedDate?: string;
  video?: string;
  videoWidth?: number;
  videoHeight?: number;
  audio?: string;
  themeColor?: string;
  openGraph?: OpenGraphData;
  twitterCard?: TwitterCardData;
  oEmbed?: OEmbedData;
}

export interface UnfurlSuccess {
  success: true;
  data: UnfurlData;
  cached: boolean;
  cachedAt?: number;
}

export interface UnfurlError {
  success: false;
  error: string;
  errorCode?: string;
}

export type UnfurlResult = UnfurlSuccess | UnfurlError;

// ============================================================================
// CACHE
// ============================================================================

interface CacheEntry {
  data: UnfurlData;
  cachedAt: number;
  expiresAt: number;
}

// In-memory cache for unfurled URLs
const cache = new Map<string, CacheEntry>();

// Default cache TTL: 1 hour
const DEFAULT_CACHE_TTL = 60 * 60 * 1000;

// Maximum cache size
const MAX_CACHE_SIZE = 500;

/**
 * Get cached unfurl data
 */
export function getCached(url: string): UnfurlData | null {
  const entry = cache.get(url);
  if (!entry) return null;

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(url);
    return null;
  }

  return entry.data;
}

/**
 * Set cached unfurl data
 */
export function setCache(
  url: string,
  data: UnfurlData,
  ttl = DEFAULT_CACHE_TTL,
): void {
  // Enforce cache size limit
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }

  cache.set(url, {
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Clear the unfurl cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

// Rate limit: 10 requests per minute per domain
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;

/**
 * Check if a domain is rate limited
 */
export function isRateLimited(url: string): boolean {
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    return false;
  }

  const entry = rateLimits.get(domain);
  if (!entry) return false;

  // Reset if window expired
  if (Date.now() > entry.resetAt) {
    rateLimits.delete(domain);
    return false;
  }

  return entry.count >= RATE_LIMIT_REQUESTS;
}

/**
 * Record a request for rate limiting
 */
export function recordRequest(url: string): void {
  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    return;
  }

  const entry = rateLimits.get(domain);

  if (!entry || Date.now() > entry.resetAt) {
    rateLimits.set(domain, {
      count: 1,
      resetAt: Date.now() + RATE_LIMIT_WINDOW,
    });
  } else {
    entry.count++;
  }
}

// ============================================================================
// PARSING HELPERS
// ============================================================================

/**
 * Parse Open Graph meta tags from HTML
 */
export function parseOpenGraph(html: string): OpenGraphData {
  const og: OpenGraphData = {};

  // Match og: prefixed meta tags
  const ogRegex =
    /<meta\s+(?:property|name)=["']og:([^"']+)["']\s+content=["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = ogRegex.exec(html)) !== null) {
    const [, property, content] = match;
    const value = decodeHtmlEntities(content);

    switch (property) {
      case "title":
        og.title = value;
        break;
      case "type":
        og.type = value;
        break;
      case "url":
        og.url = value;
        break;
      case "description":
        og.description = value;
        break;
      case "image":
        og.image = value;
        break;
      case "image:width":
        og.imageWidth = parseInt(value, 10) || undefined;
        break;
      case "image:height":
        og.imageHeight = parseInt(value, 10) || undefined;
        break;
      case "image:alt":
        og.imageAlt = value;
        break;
      case "site_name":
        og.siteName = value;
        break;
      case "locale":
        og.locale = value;
        break;
      case "audio":
        og.audio = value;
        break;
      case "video":
        og.video = value;
        break;
      case "video:width":
        og.videoWidth = parseInt(value, 10) || undefined;
        break;
      case "video:height":
        og.videoHeight = parseInt(value, 10) || undefined;
        break;
      case "video:type":
        og.videoType = value;
        break;
      case "determiner":
        og.determiner = value;
        break;
    }
  }

  // Also check for content="" property="" format (reversed)
  const ogRegexReversed =
    /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["']og:([^"']+)["']/gi;

  while ((match = ogRegexReversed.exec(html)) !== null) {
    const [, content, property] = match;
    const value = decodeHtmlEntities(content);

    // Only set if not already set
    switch (property) {
      case "title":
        og.title = og.title || value;
        break;
      case "description":
        og.description = og.description || value;
        break;
      case "image":
        og.image = og.image || value;
        break;
      case "site_name":
        og.siteName = og.siteName || value;
        break;
    }
  }

  return og;
}

/**
 * Parse Twitter Card meta tags from HTML
 */
export function parseTwitterCard(html: string): TwitterCardData {
  const twitter: TwitterCardData = {};

  // Match twitter: prefixed meta tags
  const twitterRegex =
    /<meta\s+(?:property|name)=["']twitter:([^"']+)["']\s+content=["']([^"']*)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = twitterRegex.exec(html)) !== null) {
    const [, property, content] = match;
    const value = decodeHtmlEntities(content);

    switch (property) {
      case "card":
        twitter.card = value as TwitterCardData["card"];
        break;
      case "site":
        twitter.site = value;
        break;
      case "site:id":
        twitter.siteId = value;
        break;
      case "creator":
        twitter.creator = value;
        break;
      case "creator:id":
        twitter.creatorId = value;
        break;
      case "title":
        twitter.title = value;
        break;
      case "description":
        twitter.description = value;
        break;
      case "image":
        twitter.image = value;
        break;
      case "image:alt":
        twitter.imageAlt = value;
        break;
      case "player":
        twitter.player = value;
        break;
      case "player:width":
        twitter.playerWidth = parseInt(value, 10) || undefined;
        break;
      case "player:height":
        twitter.playerHeight = parseInt(value, 10) || undefined;
        break;
      case "player:stream":
        twitter.playerStream = value;
        break;
    }
  }

  // Also check reversed format
  const twitterRegexReversed =
    /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["']twitter:([^"']+)["']/gi;

  while ((match = twitterRegexReversed.exec(html)) !== null) {
    const [, content, property] = match;
    const value = decodeHtmlEntities(content);

    switch (property) {
      case "card":
        twitter.card = twitter.card || (value as TwitterCardData["card"]);
        break;
      case "title":
        twitter.title = twitter.title || value;
        break;
      case "description":
        twitter.description = twitter.description || value;
        break;
      case "image":
        twitter.image = twitter.image || value;
        break;
    }
  }

  return twitter;
}

/**
 * Parse basic HTML metadata
 */
export function parseBasicMeta(html: string): Partial<UnfurlData> {
  const data: Partial<UnfurlData> = {};

  // Title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    data.title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // Description from meta tag
  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i,
  );
  if (descMatch) {
    data.description = decodeHtmlEntities(descMatch[1]);
  }

  // Reversed format
  const descMatchReversed = html.match(
    /<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i,
  );
  if (descMatchReversed) {
    data.description =
      data.description || decodeHtmlEntities(descMatchReversed[1]);
  }

  // Favicon
  const faviconMatch = html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
  );
  if (faviconMatch) {
    data.favicon = faviconMatch[1];
  }

  // Apple touch icon as fallback favicon
  const appleTouchMatch = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  );
  if (appleTouchMatch && !data.favicon) {
    data.favicon = appleTouchMatch[1];
  }

  // Theme color
  const themeColorMatch = html.match(
    /<meta\s+name=["']theme-color["']\s+content=["']([^"']*)["']/i,
  );
  if (themeColorMatch) {
    data.themeColor = themeColorMatch[1];
  }

  // Author
  const authorMatch = html.match(
    /<meta\s+name=["']author["']\s+content=["']([^"']*)["']/i,
  );
  if (authorMatch) {
    data.author = decodeHtmlEntities(authorMatch[1]);
  }

  // Published date
  const dateMatch = html.match(
    /<meta\s+(?:property|name)=["'](?:article:published_time|datePublished|pubdate)["']\s+content=["']([^"']*)["']/i,
  );
  if (dateMatch) {
    data.publishedDate = dateMatch[1];
  }

  return data;
}

/**
 * Find and fetch oEmbed data
 */
export async function fetchOEmbed(
  html: string,
  url: string,
): Promise<OEmbedData | null> {
  // Look for oEmbed link
  const oEmbedMatch = html.match(
    /<link[^>]+type=["']application\/json\+oembed["'][^>]+href=["']([^"']+)["']/i,
  );

  if (!oEmbedMatch) {
    // Try reversed format
    const oEmbedMatchReversed = html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/json\+oembed["']/i,
    );
    if (!oEmbedMatchReversed) {
      return null;
    }
    return fetchOEmbedFromUrl(oEmbedMatchReversed[1]);
  }

  return fetchOEmbedFromUrl(oEmbedMatch[1]);
}

/**
 * Fetch oEmbed data from a URL
 */
async function fetchOEmbedFromUrl(
  oEmbedUrl: string,
): Promise<OEmbedData | null> {
  try {
    // Decode HTML entities in the URL
    const decodedUrl = decodeHtmlEntities(oEmbedUrl);

    const response = await fetch(decodedUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as OEmbedData;
  } catch {
    return null;
  }
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#47;": "/",
    "&nbsp;": " ",
  };

  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

/**
 * Resolve a relative URL to absolute
 */
export function resolveUrl(base: string, relative: string): string {
  if (!relative) return "";
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  if (relative.startsWith("//")) {
    return `https:${relative}`;
  }

  try {
    const baseUrl = new URL(base);
    return new URL(relative, baseUrl).href;
  } catch {
    return relative;
  }
}

// ============================================================================
// MAIN UNFURL FUNCTION
// ============================================================================

/**
 * Unfurl a URL to get rich preview data
 *
 * This function is designed to be called from the client via an API route.
 * The actual HTML fetching should happen server-side to avoid CORS issues.
 *
 * @param url - The URL to unfurl
 * @param options - Optional configuration
 * @returns Promise resolving to UnfurlResult
 */
export async function unfurlUrl(
  url: string,
  options: {
    skipCache?: boolean;
    cacheTtl?: number;
  } = {},
): Promise<UnfurlResult> {
  const { skipCache = false, cacheTtl = DEFAULT_CACHE_TTL } = options;

  // Check cache first
  if (!skipCache) {
    const cached = getCached(url);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
        cachedAt: cache.get(url)?.cachedAt,
      };
    }
  }

  // Check rate limiting
  if (isRateLimited(url)) {
    return {
      success: false,
      error: "Rate limit exceeded for this domain",
      errorCode: "RATE_LIMITED",
    };
  }

  try {
    // Record the request for rate limiting
    recordRequest(url);

    // Fetch via our API route to avoid CORS
    const apiUrl = `/api/unfurl?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to fetch URL: ${response.status}`,
        errorCode: errorData.errorCode || "FETCH_FAILED",
      };
    }

    const data: UnfurlData = await response.json();

    // Cache the result
    setCache(url, data, cacheTtl);

    return {
      success: true,
      data,
      cached: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "UNKNOWN_ERROR",
    };
  }
}

/**
 * Parse HTML content and extract unfurl data
 * This is the server-side parsing function
 */
export async function parseHtmlForUnfurl(
  html: string,
  url: string,
): Promise<UnfurlData> {
  const embedType = detectEmbedType(url);

  // Parse all metadata sources
  const openGraph = parseOpenGraph(html);
  const twitterCard = parseTwitterCard(html);
  const basicMeta = parseBasicMeta(html);

  // Fetch oEmbed if available (optional, can be slow)
  let oEmbed: OEmbedData | null = null;
  try {
    oEmbed = await fetchOEmbed(html, url);
  } catch {
    // oEmbed is optional, ignore errors
  }

  // Merge data with priority: oEmbed > Twitter Card > Open Graph > Basic Meta
  const data: UnfurlData = {
    url,
    embedType,
    // Title priority
    title:
      oEmbed?.title || twitterCard.title || openGraph.title || basicMeta.title,
    // Description priority
    description:
      twitterCard.description || openGraph.description || basicMeta.description,
    // Image priority
    image: resolveUrl(
      url,
      twitterCard.image || openGraph.image || oEmbed?.thumbnailUrl || "",
    ),
    imageWidth:
      openGraph.imageWidth || oEmbed?.thumbnailWidth || twitterCard.playerWidth,
    imageHeight:
      openGraph.imageHeight ||
      oEmbed?.thumbnailHeight ||
      twitterCard.playerHeight,
    imageAlt: twitterCard.imageAlt || openGraph.imageAlt,
    // Site info
    favicon: resolveUrl(url, basicMeta.favicon || ""),
    siteName: oEmbed?.providerName || openGraph.siteName,
    // Author info
    author: oEmbed?.authorName || basicMeta.author || twitterCard.creator,
    authorUrl: oEmbed?.authorUrl,
    // Dates
    publishedDate: basicMeta.publishedDate,
    // Video
    video: resolveUrl(url, openGraph.video || twitterCard.player || ""),
    videoWidth:
      openGraph.videoWidth || twitterCard.playerWidth || oEmbed?.width,
    videoHeight:
      openGraph.videoHeight || twitterCard.playerHeight || oEmbed?.height,
    // Audio
    audio: resolveUrl(url, openGraph.audio || ""),
    // Theme
    themeColor: basicMeta.themeColor,
    // Raw data for advanced use
    openGraph,
    twitterCard,
    oEmbed: oEmbed || undefined,
  };

  return data;
}

/**
 * Batch unfurl multiple URLs
 */
export async function unfurlUrls(
  urls: string[],
  options: {
    skipCache?: boolean;
    cacheTtl?: number;
    concurrency?: number;
  } = {},
): Promise<Map<string, UnfurlResult>> {
  const { concurrency = 3 } = options;
  const results = new Map<string, UnfurlResult>();

  // Process in batches for concurrency control
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((url) => unfurlUrl(url, options)),
    );

    batch.forEach((url, index) => {
      results.set(url, batchResults[index]);
    });
  }

  return results;
}
