/**
 * URL Unfurl API Route
 *
 * Secure URL unfurling with comprehensive SSRF protection.
 * Fetches URL metadata server-side to avoid CORS issues.
 *
 * SSRF Protection includes:
 * - Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
 * - Block localhost (127.0.0.1, ::1, localhost)
 * - Block link-local addresses (169.254.x.x)
 * - Block multicast addresses (224.x.x.x - 239.x.x.x)
 * - DNS resolution validation before fetch
 * - Redirect limit enforcement (5)
 * - Request timeout (5 seconds)
 * - User agent identification
 *
 * @endpoint POST /api/unfurl { url: string }
 * @returns { success: boolean, data?: LinkPreviewData, error?: string, cached?: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getLinkUnfurlService,
  hashUrl,
  type LinkPreviewData,
  type UnfurlResult,
} from "@/services/messages/link-unfurl.service";
import { logger } from "@/lib/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Rate limiting: requests per minute per user
  RATE_LIMIT_PER_MINUTE: 20,
  // Cache duration in hours
  CACHE_TTL_HOURS: 24,
  // Request timeout in milliseconds
  TIMEOUT_MS: 5000,
  // Maximum redirects
  MAX_REDIRECTS: 5,
  // Maximum content size (5 MB)
  MAX_CONTENT_SIZE: 5 * 1024 * 1024,
  // Cache control header
  CACHE_CONTROL:
    "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
};

// ============================================================================
// RATE LIMITING (In-memory, use Redis in production)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
  requests: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check and update rate limit for a client
 */
function checkRateLimit(clientId: string): {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  let entry = rateLimitMap.get(clientId);

  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, e] of rateLimitMap.entries()) {
      if (now > e.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!entry) {
    entry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      requests: [now],
    };
    rateLimitMap.set(clientId, entry);
    return { allowed: true, remaining: CONFIG.RATE_LIMIT_PER_MINUTE - 1 };
  }

  // Sliding window: remove old requests
  entry.requests = entry.requests.filter((t) => t > windowStart);
  const currentCount = entry.requests.length;

  if (currentCount >= CONFIG.RATE_LIMIT_PER_MINUTE) {
    const oldestRequest = entry.requests[0];
    const retryAfter = Math.ceil(
      (oldestRequest + RATE_LIMIT_WINDOW_MS - now) / 1000,
    );
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.requests.push(now);
  entry.count = entry.requests.length;

  return {
    allowed: true,
    remaining: CONFIG.RATE_LIMIT_PER_MINUTE - entry.count,
  };
}

// ============================================================================
// SERVER CACHE (In-memory, use Redis in production)
// ============================================================================

interface CacheEntry {
  data: LinkPreviewData;
  expiresAt: number;
}

const serverCache = new Map<string, CacheEntry>();
const MAX_CACHE_SIZE = 1000;
const CACHE_DURATION_MS = CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000;

/**
 * Get cached preview by URL hash
 */
function getCachedPreview(urlHash: string): LinkPreviewData | null {
  const entry = serverCache.get(urlHash);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    serverCache.delete(urlHash);
    return null;
  }

  return entry.data;
}

/**
 * Cache a preview by URL hash
 */
function setCachedPreview(urlHash: string, data: LinkPreviewData): void {
  // Enforce cache size limit
  if (serverCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest 20%
    const entries = Array.from(serverCache.entries());
    entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    for (const [key] of toRemove) {
      serverCache.delete(key);
    }
  }

  serverCache.set(urlHash, {
    data,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from session
  const sessionCookie =
    request.cookies.get("nchat-session")?.value ||
    request.cookies.get("nhostSession")?.value ||
    request.cookies.get("nchat-dev-session")?.value;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      if (parsed.userId || parsed.sub) {
        return `user:${parsed.userId || parsed.sub}`;
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Fall back to IP address
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "127.0.0.1";

  return `ip:${ip}`;
}

/**
 * Create error response
 */
function errorResponse(
  message: string,
  errorCode: string,
  status: number = 400,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      errorCode,
    },
    { status },
  );
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * POST /api/unfurl
 *
 * Unfurl a URL and return metadata with SSRF protection.
 *
 * Request body:
 * - url: string - The URL to unfurl
 * - skipCache?: boolean - Skip cache lookup
 *
 * Response:
 * - success: boolean
 * - data?: LinkPreviewData
 * - error?: string
 * - errorCode?: string
 * - cached?: boolean
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const log = logger.scope("API:unfurl");

  // Rate limiting
  const clientId = getClientId(request);
  const rateLimit = checkRateLimit(clientId);

  if (!rateLimit.allowed) {
    log.warn("Rate limit exceeded", {
      clientId,
      retryAfter: rateLimit.retryAfter,
    });
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
        errorCode: "RATE_LIMITED",
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
          "X-RateLimit-Limit": String(CONFIG.RATE_LIMIT_PER_MINUTE),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { url, skipCache = false } = body;

    // Validate URL
    if (!url || typeof url !== "string") {
      return errorResponse("URL is required", "MISSING_URL");
    }

    if (!isValidUrl(url)) {
      return errorResponse("Invalid URL format", "INVALID_URL");
    }

    log.debug("Unfurling URL", { url, clientId, skipCache });

    // Generate URL hash for caching
    const urlHash = hashUrl(url);

    // Check cache
    if (!skipCache) {
      const cached = getCachedPreview(urlHash);
      if (cached) {
        log.info("Returning cached preview", { url, urlHash });
        return NextResponse.json(
          {
            success: true,
            data: cached,
            cached: true,
          },
          {
            headers: {
              "Cache-Control": CONFIG.CACHE_CONTROL,
              "X-Cache": "HIT",
              "X-RateLimit-Limit": String(CONFIG.RATE_LIMIT_PER_MINUTE),
              "X-RateLimit-Remaining": String(rateLimit.remaining),
            },
          },
        );
      }
    }

    // Get the unfurl service and unfurl the URL
    const service = getLinkUnfurlService();
    const result: UnfurlResult = await service.unfurlUrl(url, {
      timeout: CONFIG.TIMEOUT_MS,
      maxRedirects: CONFIG.MAX_REDIRECTS,
      maxContentSize: CONFIG.MAX_CONTENT_SIZE,
      cacheTtlHours: CONFIG.CACHE_TTL_HOURS,
    });

    if (!result.success || !result.data) {
      log.warn("Unfurl failed", {
        url,
        error: result.error,
        errorCode: result.errorCode,
      });

      // Map error codes to HTTP status codes
      let status = 400;
      if (
        result.errorCode === "SSRF_BLOCKED" ||
        result.errorCode === "DNS_RESOLUTION_FAILED"
      ) {
        status = 403;
      } else if (result.errorCode === "TIMEOUT") {
        status = 504;
      } else if (result.errorCode === "NOT_FOUND") {
        status = 404;
      } else if (result.errorCode === "CONTENT_TOO_LARGE") {
        status = 413;
      }

      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to unfurl URL",
          errorCode: result.errorCode || "FETCH_FAILED",
        },
        {
          status,
          headers: {
            "X-RateLimit-Limit": String(CONFIG.RATE_LIMIT_PER_MINUTE),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        },
      );
    }

    // Cache the result
    setCachedPreview(urlHash, result.data);

    log.info("URL unfurled successfully", {
      url,
      title: result.data.title,
      type: result.data.type,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        cached: false,
      },
      {
        headers: {
          "Cache-Control": CONFIG.CACHE_CONTROL,
          "X-Cache": "MISS",
          "X-RateLimit-Limit": String(CONFIG.RATE_LIMIT_PER_MINUTE),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      },
    );
  } catch (error) {
    log.error(
      "Unexpected error in unfurl API",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        errorCode: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/unfurl?url=<url>
 *
 * Alternative GET endpoint for URL unfurling.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const skipCache = searchParams.get("skipCache") === "true";

  if (!url) {
    return errorResponse("URL parameter is required", "MISSING_URL");
  }

  // Create a POST-like request to reuse the handler
  const fakeRequest = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ url, skipCache }),
  });

  // Copy cookies
  for (const cookie of request.cookies.getAll()) {
    fakeRequest.cookies.set(cookie.name, cookie.value);
  }

  return POST(fakeRequest);
}
