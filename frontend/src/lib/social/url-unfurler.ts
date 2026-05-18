/**
 * URL Unfurler Service
 *
 * Server-side service for fetching and parsing URL metadata.
 * Supports Open Graph, Twitter Cards, oEmbed, and domain-specific handlers.
 */

import {
  unfurlFromHtml,
  hasPreviewMetadata,
  mightHavePreview,
} from "@/lib/link-preview/unfurl";
import type { LinkPreviewData } from "@/lib/link-preview/preview-types";
import {
  isValidUrl,
  sanitizeUrl,
  extractDomain,
} from "@/lib/link-preview/preview-sanitizer";
import {
  isDirectImageUrl,
  isDirectVideoUrl,
  getImageFormat,
  getVideoFormat,
} from "@/lib/link-preview/domain-handlers";

// ============================================================================
// Constants
// ============================================================================

export const UNFURL_CONFIG = {
  /** Fetch timeout in milliseconds */
  FETCH_TIMEOUT: 10000,
  /** Maximum HTML size to parse (5MB) */
  MAX_HTML_SIZE: 5 * 1024 * 1024,
  /** User agent for requests */
  USER_AGENT: "Mozilla/5.0 (compatible; nchat-bot/1.0; +https://nchat.app/bot)",
  /** Cache duration in milliseconds (1 hour) */
  CACHE_DURATION: 60 * 60 * 1000,
  /** Rate limit per domain (requests per minute) */
  RATE_LIMIT_PER_DOMAIN: 10,
  /** Rate limit window in milliseconds */
  RATE_LIMIT_WINDOW: 60 * 1000,
} as const;

// ============================================================================
// SSRF Protection
// ============================================================================

const BLOCKED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254", // AWS metadata service
];

const BLOCKED_PORTS = [22, 23, 25, 3389, 5432, 3306, 6379, 27017];

/**
 * Check if a URL is safe to fetch (SSRF protection)
 */
function isSafeUrl(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    // Only allow HTTP/HTTPS
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: "Only HTTP/HTTPS protocols are allowed" };
    }

    // Check for blocked domains
    const hostname = parsed.hostname.toLowerCase();
    if (
      BLOCKED_DOMAINS.some(
        (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`),
      )
    ) {
      return { safe: false, reason: "Domain is blocked" };
    }

    // Check for private IP ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);

      // Private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
      if (
        a === 10 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a === 127 || // Loopback
        (a === 169 && b === 254) // Link-local
      ) {
        return { safe: false, reason: "Private IP addresses are not allowed" };
      }
    }

    // Check for blocked ports
    const port = parsed.port
      ? parseInt(parsed.port, 10)
      : parsed.protocol === "https:"
        ? 443
        : 80;
    if (BLOCKED_PORTS.includes(port)) {
      return { safe: false, reason: "Port is blocked" };
    }

    return { safe: true };
  } catch (error) {
    return { safe: false, reason: "Invalid URL" };
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if a domain is rate limited
 */
function isRateLimited(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

  const now = Date.now();
  const entry = rateLimitMap.get(domain);

  if (!entry) return false;

  // Reset if window expired
  if (now > entry.resetAt) {
    rateLimitMap.delete(domain);
    return false;
  }

  return entry.count >= UNFURL_CONFIG.RATE_LIMIT_PER_DOMAIN;
}

/**
 * Record a request for rate limiting
 */
function recordRequest(url: string): void {
  const domain = extractDomain(url);
  if (!domain) return;

  const now = Date.now();
  const entry = rateLimitMap.get(domain);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(domain, {
      count: 1,
      resetAt: now + UNFURL_CONFIG.RATE_LIMIT_WINDOW,
    });
  } else {
    entry.count++;
  }
}

/**
 * Clear rate limits (for testing)
 */
export function clearRateLimits(): void {
  rateLimitMap.clear();
}

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  data: LinkPreviewData;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Get cached preview data
 */
function getCached(url: string): LinkPreviewData | null {
  const entry = cache.get(url);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(url);
    return null;
  }

  return entry.data;
}

/**
 * Set cached preview data
 */
function setCache(
  url: string,
  data: LinkPreviewData,
  ttl = UNFURL_CONFIG.CACHE_DURATION,
): void {
  // Limit cache size
  if (cache.size > 1000) {
    // Remove oldest 20%
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2));
    toRemove.forEach(([key]) => cache.delete(key));
  }

  cache.set(url, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  cache.clear();
}

// ============================================================================
// Fetch with Protection
// ============================================================================

/**
 * Fetch URL with timeout, size limits, and security checks
 */
async function fetchWithProtection(url: string): Promise<string> {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    UNFURL_CONFIG.FETCH_TIMEOUT,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": UNFURL_CONFIG.USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error("Response is not HTML");
    }

    // Check content length
    const contentLength = response.headers.get("content-length");
    if (
      contentLength &&
      parseInt(contentLength, 10) > UNFURL_CONFIG.MAX_HTML_SIZE
    ) {
      throw new Error("Response too large");
    }

    // Read body with size limit
    const text = await response.text();
    if (text.length > UNFURL_CONFIG.MAX_HTML_SIZE) {
      return text.substring(0, UNFURL_CONFIG.MAX_HTML_SIZE);
    }

    return text;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  }
}

// ============================================================================
// Direct Media Handlers
// ============================================================================

/**
 * Create preview for direct image URLs
 */
function createImagePreview(url: string): LinkPreviewData {
  const domain = extractDomain(url) || "";
  const format = getImageFormat(url);

  return {
    url,
    type: "image",
    status: "success",
    domain,
    isSecure: url.startsWith("https"),
    title: url.split("/").pop() || "Image",
    image: url,
    imageWidth: undefined,
    imageHeight: undefined,
    siteName: domain,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + UNFURL_CONFIG.CACHE_DURATION,
  };
}

/**
 * Create preview for direct video URLs
 */
function createVideoPreview(url: string): LinkPreviewData {
  const domain = extractDomain(url) || "";
  const format = getVideoFormat(url);

  return {
    url,
    type: "video",
    status: "success",
    domain,
    isSecure: url.startsWith("https"),
    title: url.split("/").pop() || "Video",
    siteName: domain,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + UNFURL_CONFIG.CACHE_DURATION,
  };
}

// ============================================================================
// Main Unfurl Function
// ============================================================================

export interface UnfurlOptions {
  /** Skip cache and force fresh fetch */
  forceRefresh?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Custom cache TTL in milliseconds */
  cacheTtl?: number;
}

export interface UnfurlResult {
  success: boolean;
  data?: LinkPreviewData;
  error?: string;
  errorCode?: string;
  cached?: boolean;
}

/**
 * Unfurl a URL and extract preview metadata
 */
export async function unfurlUrl(
  url: string,
  options: UnfurlOptions = {},
): Promise<UnfurlResult> {
  const { forceRefresh = false, cacheTtl = UNFURL_CONFIG.CACHE_DURATION } =
    options;

  // Validate URL
  if (!isValidUrl(url)) {
    return {
      success: false,
      error: "Invalid URL format",
      errorCode: "INVALID_URL",
    };
  }

  // Sanitize URL
  const sanitizedUrl = sanitizeUrl(url);
  if (!sanitizedUrl) {
    return {
      success: false,
      error: "URL sanitization failed",
      errorCode: "INVALID_URL",
    };
  }

  // Check cache
  if (!forceRefresh) {
    const cached = getCached(sanitizedUrl);
    if (cached) {
      return {
        success: true,
        data: cached,
        cached: true,
      };
    }
  }

  // Check if URL might have preview
  if (!mightHavePreview(sanitizedUrl)) {
    return {
      success: false,
      error: "URL is unlikely to have preview metadata",
      errorCode: "NO_PREVIEW",
    };
  }

  // SSRF protection
  const safetyCheck = isSafeUrl(sanitizedUrl);
  if (!safetyCheck.safe) {
    return {
      success: false,
      error: safetyCheck.reason || "URL is not safe to fetch",
      errorCode: "BLOCKED",
    };
  }

  // Rate limiting
  if (isRateLimited(sanitizedUrl)) {
    return {
      success: false,
      error: "Rate limit exceeded for this domain",
      errorCode: "RATE_LIMITED",
    };
  }

  // Record request
  recordRequest(sanitizedUrl);

  try {
    // Handle direct media URLs
    if (isDirectImageUrl(sanitizedUrl)) {
      const preview = createImagePreview(sanitizedUrl);
      setCache(sanitizedUrl, preview, cacheTtl);
      return {
        success: true,
        data: preview,
        cached: false,
      };
    }

    if (isDirectVideoUrl(sanitizedUrl)) {
      const preview = createVideoPreview(sanitizedUrl);
      setCache(sanitizedUrl, preview, cacheTtl);
      return {
        success: true,
        data: preview,
        cached: false,
      };
    }

    // Fetch HTML
    const html = await fetchWithProtection(sanitizedUrl);

    // Check if HTML has metadata
    if (!hasPreviewMetadata(html)) {
      return {
        success: false,
        error: "No preview metadata found",
        errorCode: "NO_METADATA",
      };
    }

    // Parse HTML and extract preview
    const result = unfurlFromHtml(sanitizedUrl, html);
    const preview = result.data;

    // Cache result
    setCache(sanitizedUrl, preview, cacheTtl);

    return {
      success: true,
      data: preview,
      cached: false,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    let errorCode = "FETCH_FAILED";

    if (errorMessage.includes("timeout")) {
      errorCode = "TIMEOUT";
    } else if (errorMessage.includes("too large")) {
      errorCode = "TOO_LARGE";
    } else if (errorMessage.includes("not HTML")) {
      errorCode = "INVALID_CONTENT_TYPE";
    }

    return {
      success: false,
      error: errorMessage,
      errorCode,
    };
  }
}

/**
 * Unfurl multiple URLs in parallel
 */
export async function unfurlUrls(
  urls: string[],
  options: UnfurlOptions & { concurrency?: number } = {},
): Promise<Map<string, UnfurlResult>> {
  const { concurrency = 3, ...unfurlOptions } = options;
  const results = new Map<string, UnfurlResult>();

  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)];

  // Process in batches to limit concurrency
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((url) => unfurlUrl(url, unfurlOptions)),
    );

    batch.forEach((url, index) => {
      results.set(url, batchResults[index]);
    });
  }

  return results;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: 1000,
    entries: Array.from(cache.entries()).map(([url, entry]) => ({
      url,
      expiresAt: entry.expiresAt,
      expiresIn: Math.max(0, entry.expiresAt - Date.now()),
    })),
  };
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats() {
  return {
    domains: Array.from(rateLimitMap.entries()).map(([domain, entry]) => ({
      domain,
      count: entry.count,
      resetAt: entry.resetAt,
      resetIn: Math.max(0, entry.resetAt - Date.now()),
    })),
  };
}
