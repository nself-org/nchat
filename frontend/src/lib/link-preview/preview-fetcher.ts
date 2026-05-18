/**
 * Preview Fetcher - Handles fetching metadata from URLs
 *
 * Coordinates between the API route and client-side processing
 */

import type {
  LinkPreviewData,
  UnfurlRequest,
  UnfurlResponse,
  BatchUnfurlRequest,
  BatchUnfurlResponse,
  PreviewError,
  PREVIEW_ERROR_CODES,
} from "./preview-types";
import { getPreviewCache } from "./preview-cache";
import {
  isDirectImageUrl,
  isDirectVideoUrl,
  getImageFormat,
  getVideoFormat,
} from "./domain-handlers";
import {
  extractDomain,
  isDomainBlocked,
  isDomainAllowed,
} from "./preview-sanitizer";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT = 10000;
const API_ENDPOINT = "/api/unfurl";

// ============================================================================
// Types
// ============================================================================

export interface FetchOptions {
  forceRefresh?: boolean;
  timeout?: number;
  blockedDomains?: string[];
  allowedDomains?: string[];
  whitelistMode?: boolean;
}

// ============================================================================
// URL Validation
// ============================================================================

/**
 * Validate that a string is a valid URL
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
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  // More comprehensive URL regex
  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

  const matches = text.match(urlRegex) || [];
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Check if URL should be unfurled based on settings
 */
export function shouldUnfurl(
  url: string,
  blockedDomains: string[] = [],
  allowedDomains: string[] = [],
  whitelistMode: boolean = false,
): { allowed: boolean; reason?: string } {
  // Validate URL
  if (!isValidUrl(url)) {
    return { allowed: false, reason: "Invalid URL" };
  }

  // Check blocklist
  if (isDomainBlocked(url, blockedDomains)) {
    return { allowed: false, reason: "Domain is blocked" };
  }

  // Check whitelist mode
  if (whitelistMode && !isDomainAllowed(url, allowedDomains)) {
    return { allowed: false, reason: "Domain not in allowed list" };
  }

  return { allowed: true };
}

// ============================================================================
// Direct Media Handling
// ============================================================================

/**
 * Create preview for direct image URL
 */
export function createImagePreview(url: string): LinkPreviewData {
  const format = getImageFormat(url) || "unknown";
  const domain = extractDomain(url) || "unknown";

  return {
    url,
    type: "image",
    status: "success",
    domain,
    isSecure: url.startsWith("https"),
    image: url,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    title: `Image (${format.toUpperCase()})`,
  } as LinkPreviewData;
}

/**
 * Create preview for direct video URL
 */
export function createVideoPreview(url: string): LinkPreviewData {
  const format = getVideoFormat(url) || "unknown";
  const domain = extractDomain(url) || "unknown";

  return {
    url,
    type: "video",
    status: "success",
    domain,
    isSecure: url.startsWith("https"),
    fetchedAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    title: `Video (${format.toUpperCase()})`,
  } as LinkPreviewData;
}

// ============================================================================
// Fetch Functions
// ============================================================================

/**
 * Fetch preview for a single URL
 */
export async function fetchPreview(
  url: string,
  options: FetchOptions = {},
): Promise<UnfurlResponse> {
  const {
    forceRefresh = false,
    timeout = DEFAULT_TIMEOUT,
    blockedDomains = [],
    allowedDomains = [],
    whitelistMode = false,
  } = options;

  // Check if URL should be unfurled
  const { allowed, reason } = shouldUnfurl(
    url,
    blockedDomains,
    allowedDomains,
    whitelistMode,
  );
  if (!allowed) {
    return {
      success: false,
      cached: false,
      error: {
        code: "BLOCKED_DOMAIN",
        message: reason || "URL cannot be unfurled",
        retryable: false,
      },
    };
  }

  // Handle direct media URLs locally
  if (isDirectImageUrl(url)) {
    const preview = createImagePreview(url);
    return { success: true, data: preview, cached: false };
  }

  if (isDirectVideoUrl(url)) {
    const preview = createVideoPreview(url);
    return { success: true, data: preview, cached: false };
  }

  // Check cache first (unless force refresh)
  const cache = getPreviewCache();
  if (!forceRefresh) {
    const cached = cache.get(url);
    if (cached) {
      return { success: true, data: cached, cached: true };
    }
  }

  // Fetch from API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, forceRefresh } as UnfurlRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        cached: false,
        error: {
          code: response.status === 404 ? "NOT_FOUND" : "SERVER_ERROR",
          message: errorData.message || `HTTP ${response.status}`,
          retryable: response.status >= 500,
        },
      };
    }

    const result: UnfurlResponse = await response.json();

    // Cache successful results
    if (result.success && result.data) {
      cache.set(url, result.data);
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          cached: false,
          error: {
            code: "TIMEOUT",
            message: "Request timed out",
            retryable: true,
          },
        };
      }

      return {
        success: false,
        cached: false,
        error: {
          code: "NETWORK_ERROR",
          message: error.message,
          retryable: true,
        },
      };
    }

    return {
      success: false,
      cached: false,
      error: {
        code: "FETCH_FAILED",
        message: "Unknown error occurred",
        retryable: true,
      },
    };
  }
}

/**
 * Fetch previews for multiple URLs
 */
export async function fetchPreviews(
  urls: string[],
  options: FetchOptions = {},
): Promise<BatchUnfurlResponse> {
  const results: Record<string, UnfurlResponse> = {};

  // Deduplicate URLs
  const uniqueUrls = [...new Set(urls)];

  // Fetch all in parallel
  const promises = uniqueUrls.map(async (url) => {
    const result = await fetchPreview(url, options);
    results[url] = result;
  });

  await Promise.all(promises);

  return { results };
}

/**
 * Prefetch previews for URLs (fire and forget)
 */
export function prefetchPreviews(
  urls: string[],
  options: FetchOptions = {},
): void {
  // Only prefetch URLs not in cache
  const cache = getPreviewCache();
  const uncachedUrls = urls.filter((url) => !cache.has(url));

  if (uncachedUrls.length === 0) return;

  // Fetch in background
  fetchPreviews(uncachedUrls, options).catch(() => {
    // Silently ignore errors in prefetch
  });
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Create a preview error object
 */
export function createPreviewError(
  code: keyof typeof PREVIEW_ERROR_CODES,
  message: string,
  retryable: boolean = false,
): PreviewError {
  return { code, message, retryable };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: PreviewError): boolean {
  return error.retryable;
}

/**
 * Get human-readable error message
 */
export function getErrorMessage(error: PreviewError): string {
  switch (error.code) {
    case "FETCH_FAILED":
      return "Failed to fetch preview";
    case "TIMEOUT":
      return "Request timed out";
    case "INVALID_URL":
      return "Invalid URL";
    case "BLOCKED_DOMAIN":
      return "This domain is blocked";
    case "RATE_LIMITED":
      return "Too many requests, please try again later";
    case "NO_METADATA":
      return "No preview available";
    case "PARSE_ERROR":
      return "Could not parse page content";
    case "NETWORK_ERROR":
      return "Network error occurred";
    case "SERVER_ERROR":
      return "Server error occurred";
    case "NOT_FOUND":
      return "Page not found";
    case "FORBIDDEN":
      return "Access denied";
    default:
      return error.message || "An error occurred";
  }
}
