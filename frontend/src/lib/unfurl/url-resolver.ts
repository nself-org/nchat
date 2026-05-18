/**
 * URL Resolver for Link Unfurling
 *
 * Handles URL shortener resolution and redirect following
 * with security protections (SSRF prevention).
 *
 * @module lib/unfurl/url-resolver
 */

import { URL_SHORTENERS, parseUrl } from "./url-parser";
import { validateUrl } from "@/services/messages/link-unfurl.service";

// ============================================================================
// Types
// ============================================================================

export interface UrlResolutionResult {
  /** Original URL */
  originalUrl: string;
  /** Final resolved URL */
  resolvedUrl: string;
  /** Chain of redirects */
  redirectChain: string[];
  /** Whether the URL was shortened */
  wasShortened: boolean;
  /** Whether resolution was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Resolution time in ms */
  durationMs: number;
}

export interface UrlResolverOptions {
  /** Maximum redirects to follow */
  maxRedirects?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** User agent string */
  userAgent?: string;
  /** Whether to validate each URL in chain for SSRF */
  validateEachRedirect?: boolean;
  /** Custom fetch function */
  customFetch?: typeof fetch;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_REDIRECTS = 10;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_USER_AGENT = "nchat-url-resolver/1.0 (+https://nself.org/bot)";

// Well-known shortener patterns
const SHORTENER_PATTERNS = [
  /^https?:\/\/bit\.ly\//i,
  /^https?:\/\/goo\.gl\//i,
  /^https?:\/\/t\.co\//i,
  /^https?:\/\/tinyurl\.com\//i,
  /^https?:\/\/ow\.ly\//i,
  /^https?:\/\/is\.gd\//i,
  /^https?:\/\/buff\.ly\//i,
  /^https?:\/\/j\.mp\//i,
  /^https?:\/\/fb\.me\//i,
  /^https?:\/\/lnkd\.in\//i,
  /^https?:\/\/youtu\.be\//i,
  /^https?:\/\/amzn\.to\//i,
  /^https?:\/\/rb\.gy\//i,
  /^https?:\/\/cutt\.ly\//i,
];

// ============================================================================
// URL Resolution Functions
// ============================================================================

/**
 * Check if a URL is from a known shortener
 */
export function isShortenerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase().replace(/^www\./, "");

    // Check exact domain match
    if (URL_SHORTENERS.has(domain)) {
      return true;
    }

    // Check patterns
    return SHORTENER_PATTERNS.some((pattern) => pattern.test(url));
  } catch {
    return false;
  }
}

/**
 * Resolve a shortened URL to its final destination
 */
export async function resolveUrl(
  url: string,
  options: UrlResolverOptions = {},
): Promise<UrlResolutionResult> {
  const {
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    timeout = DEFAULT_TIMEOUT,
    userAgent = DEFAULT_USER_AGENT,
    validateEachRedirect = true,
    customFetch = fetch,
  } = options;

  const startTime = Date.now();
  const redirectChain: string[] = [];
  let currentUrl = url;
  let wasShortened = isShortenerUrl(url);

  try {
    // Validate initial URL
    const initialValidation = await validateUrl(url);
    if (!initialValidation.valid) {
      return {
        originalUrl: url,
        resolvedUrl: url,
        redirectChain: [],
        wasShortened: false,
        success: false,
        error: initialValidation.error,
        durationMs: Date.now() - startTime,
      };
    }

    // Follow redirects
    for (let i = 0; i < maxRedirects; i++) {
      redirectChain.push(currentUrl);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await customFetch(currentUrl, {
          method: "HEAD",
          headers: {
            "User-Agent": userAgent,
            Accept: "*/*",
          },
          redirect: "manual",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check for redirect
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) {
            // No location header, we're done
            break;
          }

          // Resolve relative URLs
          const nextUrl = new URL(location, currentUrl).href;

          // Check if this is another shortener
          if (isShortenerUrl(nextUrl)) {
            wasShortened = true;
          }

          // Validate the redirect URL if enabled
          if (validateEachRedirect) {
            const redirectValidation = await validateUrl(nextUrl);
            if (!redirectValidation.valid) {
              return {
                originalUrl: url,
                resolvedUrl: currentUrl, // Return last valid URL
                redirectChain,
                wasShortened,
                success: false,
                error: `Redirect blocked: ${redirectValidation.error}`,
                durationMs: Date.now() - startTime,
              };
            }
          }

          currentUrl = nextUrl;
        } else {
          // Not a redirect, we're done
          break;
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          return {
            originalUrl: url,
            resolvedUrl: currentUrl,
            redirectChain,
            wasShortened,
            success: false,
            error: "Request timed out",
            durationMs: Date.now() - startTime,
          };
        }

        // Try GET request as fallback (some servers don't support HEAD)
        try {
          const response = await customFetch(currentUrl, {
            method: "GET",
            headers: {
              "User-Agent": userAgent,
              Accept: "*/*",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(timeout),
          });

          // Final URL after all redirects
          currentUrl = response.url;
          break;
        } catch {
          // Give up
          break;
        }
      }
    }

    return {
      originalUrl: url,
      resolvedUrl: currentUrl,
      redirectChain,
      wasShortened,
      success: true,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      originalUrl: url,
      resolvedUrl: url,
      redirectChain,
      wasShortened,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Resolve multiple URLs in parallel
 */
export async function resolveUrls(
  urls: string[],
  options: UrlResolverOptions = {},
): Promise<Map<string, UrlResolutionResult>> {
  const results = new Map<string, UrlResolutionResult>();

  // Filter to only resolve shortener URLs for efficiency
  const urlsToResolve = urls.filter((url) => isShortenerUrl(url));

  // Resolve in parallel with a concurrency limit
  const concurrency = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < urlsToResolve.length; i += concurrency) {
    chunks.push(urlsToResolve.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map((url) => resolveUrl(url, options)),
    );

    for (let i = 0; i < chunk.length; i++) {
      results.set(chunk[i], chunkResults[i]);
    }
  }

  // Add non-shortener URLs with passthrough result
  for (const url of urls) {
    if (!results.has(url)) {
      results.set(url, {
        originalUrl: url,
        resolvedUrl: url,
        redirectChain: [url],
        wasShortened: false,
        success: true,
        durationMs: 0,
      });
    }
  }

  return results;
}

/**
 * Get the canonical URL (after following redirects)
 */
export async function getCanonicalUrl(
  url: string,
  options?: UrlResolverOptions,
): Promise<string> {
  const result = await resolveUrl(url, options);
  return result.success ? result.resolvedUrl : url;
}

/**
 * Expand all shortened URLs in a text
 */
export async function expandShortenedUrls(
  text: string,
  options?: UrlResolverOptions,
): Promise<{ text: string; expansions: Map<string, string> }> {
  // Extract URLs from text
  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
  const urls = text.match(urlRegex) || [];

  // Resolve all shortened URLs
  const resolutions = await resolveUrls(urls, options);

  // Build expansion map
  const expansions = new Map<string, string>();
  let expandedText = text;

  for (const [originalUrl, result] of resolutions) {
    if (
      result.wasShortened &&
      result.success &&
      result.resolvedUrl !== originalUrl
    ) {
      expansions.set(originalUrl, result.resolvedUrl);
      expandedText = expandedText.replace(originalUrl, result.resolvedUrl);
    }
  }

  return { text: expandedText, expansions };
}

// ============================================================================
// Caching Layer
// ============================================================================

interface CachedResolution {
  result: UrlResolutionResult;
  timestamp: number;
}

const resolutionCache = new Map<string, CachedResolution>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000;

/**
 * Resolve URL with caching
 */
export async function resolveUrlCached(
  url: string,
  options?: UrlResolverOptions,
): Promise<UrlResolutionResult> {
  const now = Date.now();

  // Check cache
  const cached = resolutionCache.get(url);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Resolve URL
  const result = await resolveUrl(url, options);

  // Cache successful resolutions
  if (result.success) {
    // Evict old entries if cache is full
    if (resolutionCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = [...resolutionCache.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )[0][0];
      resolutionCache.delete(oldestKey);
    }

    resolutionCache.set(url, { result, timestamp: now });
  }

  return result;
}

/**
 * Clear the resolution cache
 */
export function clearResolutionCache(): void {
  resolutionCache.clear();
}

/**
 * Get cache statistics
 */
export function getResolutionCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
} {
  return {
    size: resolutionCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}
