/**
 * Link Preview Module
 *
 * Provides URL unfurling and link preview generation for rich message embeds.
 * Supports Open Graph, Twitter Card, and basic HTML metadata extraction.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Link preview content type
 */
export type LinkPreviewType =
  | "article"
  | "video"
  | "image"
  | "website"
  | "audio"
  | "product"
  | "profile";

/**
 * Link preview data structure
 */
export interface LinkPreview {
  /** The original URL */
  url: string;
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Preview image URL */
  image?: string;
  /** Image width in pixels */
  imageWidth?: number;
  /** Image height in pixels */
  imageHeight?: number;
  /** Image alt text */
  imageAlt?: string;
  /** Site name (e.g., "YouTube", "Twitter") */
  siteName?: string;
  /** Favicon URL */
  favicon?: string;
  /** Content type */
  type: LinkPreviewType;
  /** Video URL for video content */
  video?: string;
  /** Video width */
  videoWidth?: number;
  /** Video height */
  videoHeight?: number;
  /** Audio URL for audio content */
  audio?: string;
  /** Author name */
  author?: string;
  /** Author URL */
  authorUrl?: string;
  /** Publication date */
  publishedDate?: string;
  /** Domain of the URL */
  domain: string;
  /** Theme/brand color */
  themeColor?: string;
  /** When the preview was fetched */
  fetchedAt: number;
}

/**
 * Open Graph metadata
 */
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
}

/**
 * Twitter Card metadata
 */
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

/**
 * Link preview fetch result
 */
export interface LinkPreviewResult {
  success: boolean;
  preview?: LinkPreview;
  error?: string;
  errorCode?: LinkPreviewErrorCode;
  cached?: boolean;
}

/**
 * Error codes for link preview fetch failures
 */
export type LinkPreviewErrorCode =
  | "INVALID_URL"
  | "FETCH_FAILED"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PARSE_ERROR"
  | "NOT_FOUND"
  | "BLOCKED"
  | "UNKNOWN";

// ============================================================================
// Constants
// ============================================================================

/** Default cache TTL in milliseconds (1 hour) */
export const DEFAULT_CACHE_TTL = 60 * 60 * 1000;

/** Maximum cache size */
export const MAX_CACHE_SIZE = 500;

/** Rate limit: requests per minute per domain */
export const RATE_LIMIT_REQUESTS = 10;

/** Rate limit window in milliseconds */
export const RATE_LIMIT_WINDOW = 60 * 1000;

/** Default fetch timeout in milliseconds */
export const DEFAULT_FETCH_TIMEOUT = 10000;

/** Domains that should be blocked from preview */
export const BLOCKED_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0"];

/** Private IP address patterns for SSRF protection */
const PRIVATE_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
  /^192\.168\./, // Private Class C
  /^169\.254\./, // Link-local
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 unique local
  /^fe80:/i, // IPv6 link-local
  /^0\.0\.0\.0/, // Unspecified
  /^224\./, // Multicast
  /^240\./, // Reserved
];

/**
 * Check if a hostname looks like a private/internal IP address
 */
function isPrivateIpAddress(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

/** Domains with special handling */
export const SPECIAL_DOMAINS: Record<string, string> = {
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "twitter.com": "Twitter",
  "x.com": "X",
  "github.com": "GitHub",
  "linkedin.com": "LinkedIn",
  "facebook.com": "Facebook",
  "instagram.com": "Instagram",
  "tiktok.com": "TikTok",
  "reddit.com": "Reddit",
  "medium.com": "Medium",
};

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  preview: LinkPreview;
  cachedAt: number;
  expiresAt: number;
}

/** In-memory cache for link previews */
const previewCache = new Map<string, CacheEntry>();

/**
 * Get a cached preview for a URL
 */
export function getCachedPreview(url: string): LinkPreview | null {
  const normalizedUrl = normalizeUrl(url);
  const entry = previewCache.get(normalizedUrl);

  if (!entry) return null;

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    previewCache.delete(normalizedUrl);
    return null;
  }

  return entry.preview;
}

/**
 * Cache a link preview
 */
export function cachePreview(
  url: string,
  preview: LinkPreview,
  ttl = DEFAULT_CACHE_TTL,
): void {
  const normalizedUrl = normalizeUrl(url);

  // Enforce cache size limit
  if (previewCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries (first 20%)
    const entries = Array.from(previewCache.entries());
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    for (const [key] of toRemove) {
      previewCache.delete(key);
    }
  }

  previewCache.set(normalizedUrl, {
    preview,
    cachedAt: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Clear the preview cache
 */
export function clearPreviewCache(): void {
  previewCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: previewCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** Rate limit tracker by domain */
const rateLimits = new Map<string, RateLimitEntry>();

/**
 * Check if a domain is rate limited
 */
export function isRateLimited(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

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
  const domain = extractDomain(url);
  if (!domain) return;

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

/**
 * Clear rate limits
 */
export function clearRateLimits(): void {
  rateLimits.clear();
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Validate a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Normalize a URL for caching
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, lowercase hostname
    let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}`;
    if (parsed.port) normalized += `:${parsed.port}`;
    normalized += parsed.pathname.replace(/\/+$/, "") || "/";
    if (parsed.search) normalized += parsed.search;
    return normalized;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Get display domain (without www prefix)
 */
export function getDisplayDomain(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return "";
  return domain.replace(/^www\./, "");
}

/**
 * Check if a domain is blocked
 */
export function isBlockedDomain(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return true;

  // Block known blocked domains
  if (
    BLOCKED_DOMAINS.some(
      (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
    )
  ) {
    return true;
  }

  // Block private IP ranges to prevent SSRF attacks
  if (isPrivateIpAddress(domain)) {
    return true;
  }

  return false;
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

/**
 * Get the site name for a known domain
 */
export function getKnownSiteName(url: string): string | null {
  const domain = extractDomain(url);
  if (!domain) return null;

  // Check exact match first
  if (SPECIAL_DOMAINS[domain]) {
    return SPECIAL_DOMAINS[domain];
  }

  // Check without www
  const withoutWww = domain.replace(/^www\./, "");
  if (SPECIAL_DOMAINS[withoutWww]) {
    return SPECIAL_DOMAINS[withoutWww];
  }

  return null;
}

// ============================================================================
// URL Detection
// ============================================================================

/** Regular expression to detect URLs in text */
export const URL_REGEX =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/**
 * Extract all URLs from text
 */
export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Check if text contains any URLs
 */
export function containsUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

/**
 * Get the first URL from text
 */
export function getFirstUrl(text: string): string | null {
  const urls = extractUrls(text);
  return urls.length > 0 ? urls[0] : null;
}

// ============================================================================
// HTML Parsing
// ============================================================================

/**
 * Decode HTML entities in a string
 */
export function decodeHtmlEntities(text: string): string {
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
    "&#160;": " ",
  };

  // Handle numeric entities
  let result = text.replace(/&#(\d+);/g, (_, dec) =>
    String.fromCharCode(parseInt(dec, 10)),
  );

  // Handle hex entities
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );

  // Handle named entities
  return result.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

/**
 * Parse Open Graph meta tags from HTML
 */
export function parseOpenGraph(html: string): OpenGraphData {
  const og: OpenGraphData = {};

  // Match og: prefixed meta tags (property="og:xxx" content="...")
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
    }
  }

  // Also check for content="" property="" format (reversed attribute order)
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

  // Reversed format
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
export function parseBasicMeta(
  html: string,
  url: string,
): Partial<LinkPreview> {
  const data: Partial<LinkPreview> = {};

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
  if (descMatchReversed && !data.description) {
    data.description = decodeHtmlEntities(descMatchReversed[1]);
  }

  // Favicon
  const faviconMatch = html.match(
    /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
  );
  if (faviconMatch) {
    data.favicon = resolveUrl(url, faviconMatch[1]);
  }

  // Apple touch icon as fallback favicon
  const appleTouchMatch = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  );
  if (appleTouchMatch && !data.favicon) {
    data.favicon = resolveUrl(url, appleTouchMatch[1]);
  }

  // Default favicon fallback
  if (!data.favicon) {
    data.favicon = resolveUrl(url, "/favicon.ico");
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
 * Determine content type from metadata
 */
export function determineContentType(
  og: OpenGraphData,
  twitter: TwitterCardData,
): LinkPreviewType {
  // Check Open Graph type
  if (og.type) {
    if (og.type.includes("video")) return "video";
    if (og.type.includes("music") || og.type.includes("audio")) return "audio";
    if (og.type.includes("article") || og.type.includes("blog"))
      return "article";
    if (og.type.includes("product")) return "product";
    if (og.type.includes("profile")) return "profile";
  }

  // Check Twitter card type
  if (twitter.card === "player") return "video";
  if (twitter.card === "summary_large_image") return "article";

  // Check for video content
  if (og.video || twitter.player) return "video";

  // Check for audio content
  if (og.audio) return "audio";

  // Default to website
  return "website";
}

/**
 * Parse HTML and extract link preview data
 */
export function parseHtmlForPreview(html: string, url: string): LinkPreview {
  const og = parseOpenGraph(html);
  const twitter = parseTwitterCard(html);
  const basic = parseBasicMeta(html, url);

  const type = determineContentType(og, twitter);
  const domain = getDisplayDomain(url);

  // Merge data with priority: Twitter > Open Graph > Basic
  const preview: LinkPreview = {
    url,
    title: twitter.title || og.title || basic.title || domain,
    description: twitter.description || og.description || basic.description,
    image: resolveUrl(url, twitter.image || og.image || ""),
    imageWidth: og.imageWidth,
    imageHeight: og.imageHeight,
    imageAlt: twitter.imageAlt || og.imageAlt,
    siteName: getKnownSiteName(url) || og.siteName || domain,
    favicon: basic.favicon,
    type,
    video: resolveUrl(url, og.video || twitter.player || ""),
    videoWidth: og.videoWidth || twitter.playerWidth,
    videoHeight: og.videoHeight || twitter.playerHeight,
    audio: resolveUrl(url, og.audio || ""),
    author: basic.author || twitter.creator,
    authorUrl: basic.authorUrl,
    publishedDate: basic.publishedDate,
    domain,
    themeColor: basic.themeColor,
    fetchedAt: Date.now(),
  };

  // Remove empty optional fields
  if (!preview.image) delete preview.image;
  if (!preview.video) delete preview.video;
  if (!preview.audio) delete preview.audio;

  return preview;
}

// ============================================================================
// Fetch Link Preview
// ============================================================================

/**
 * Fetch link preview for a URL
 *
 * This function should be called from an API route to avoid CORS issues.
 * For client-side usage, use fetchLinkPreviewViaApi instead.
 */
export async function fetchLinkPreview(
  url: string,
  options: {
    skipCache?: boolean;
    cacheTtl?: number;
    timeout?: number;
  } = {},
): Promise<LinkPreviewResult> {
  const {
    skipCache = false,
    cacheTtl = DEFAULT_CACHE_TTL,
    timeout = DEFAULT_FETCH_TIMEOUT,
  } = options;

  // Validate URL
  if (!isValidUrl(url)) {
    return {
      success: false,
      error: "Invalid URL",
      errorCode: "INVALID_URL",
    };
  }

  // Check for blocked domain
  if (isBlockedDomain(url)) {
    return {
      success: false,
      error: "Domain is blocked",
      errorCode: "BLOCKED",
    };
  }

  // Check cache
  if (!skipCache) {
    const cached = getCachedPreview(url);
    if (cached) {
      return {
        success: true,
        preview: cached,
        cached: true,
      };
    }
  }

  // Check rate limit
  if (isRateLimited(url)) {
    return {
      success: false,
      error: "Rate limit exceeded",
      errorCode: "RATE_LIMITED",
    };
  }

  // Record request for rate limiting
  recordRequest(url);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Fetch the URL
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "User-Agent": "nchat-link-preview/1.0",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: "Page not found",
          errorCode: "NOT_FOUND",
        };
      }
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
        errorCode: "FETCH_FAILED",
      };
    }

    const html = await response.text();
    const preview = parseHtmlForPreview(html, url);

    // Cache the result
    cachePreview(url, preview, cacheTtl);

    return {
      success: true,
      preview,
      cached: false,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out",
        errorCode: "TIMEOUT",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "UNKNOWN",
    };
  }
}

/**
 * Fetch link preview via API route (client-side)
 */
export async function fetchLinkPreviewViaApi(
  url: string,
  options: {
    skipCache?: boolean;
  } = {},
): Promise<LinkPreviewResult> {
  const { skipCache = false } = options;

  // Validate URL
  if (!isValidUrl(url)) {
    return {
      success: false,
      error: "Invalid URL",
      errorCode: "INVALID_URL",
    };
  }

  // Check client-side cache first
  if (!skipCache) {
    const cached = getCachedPreview(url);
    if (cached) {
      return {
        success: true,
        preview: cached,
        cached: true,
      };
    }
  }

  try {
    const apiUrl = `/api/link-preview?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `API error: ${response.status}`,
        errorCode: errorData.errorCode || "FETCH_FAILED",
      };
    }

    const data = await response.json();

    if (data.success && data.preview) {
      // Cache on client side
      cachePreview(url, data.preview);
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "UNKNOWN",
    };
  }
}

/**
 * Batch fetch link previews for multiple URLs
 */
export async function fetchLinkPreviews(
  urls: string[],
  options: {
    skipCache?: boolean;
    concurrency?: number;
  } = {},
): Promise<Map<string, LinkPreviewResult>> {
  const { concurrency = 3 } = options;
  const results = new Map<string, LinkPreviewResult>();

  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)];

  // Process in batches
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((url) => fetchLinkPreviewViaApi(url, options)),
    );

    batch.forEach((url, index) => {
      results.set(url, batchResults[index]);
    });
  }

  return results;
}

// ============================================================================
// Fallback Preview Generation
// ============================================================================

/**
 * Generate a fallback preview when fetch fails
 */
export function generateFallbackPreview(url: string): LinkPreview {
  const domain = getDisplayDomain(url);

  return {
    url,
    title: domain,
    siteName: getKnownSiteName(url) || domain,
    domain,
    type: "website",
    favicon: resolveUrl(url, "/favicon.ico"),
    fetchedAt: Date.now(),
  };
}

/**
 * Create a preview from known data without fetching
 */
export function createPreviewFromData(
  url: string,
  data: Partial<Omit<LinkPreview, "url" | "domain" | "fetchedAt">>,
): LinkPreview {
  const domain = getDisplayDomain(url);

  return {
    url,
    title: data.title || domain,
    siteName: data.siteName || getKnownSiteName(url) || domain,
    domain,
    type: data.type || "website",
    fetchedAt: Date.now(),
    ...data,
  };
}
