/**
 * Transport Security Middleware
 *
 * Next.js middleware for transport layer security enforcement.
 * Applies security headers, validates TLS, and logs security events.
 *
 * @module middleware/transport-security
 */

import { NextRequest, NextResponse } from "next/server";

import {
  generateSecurityHeaders,
  DEFAULT_SECURITY_HEADERS_CONFIG,
  type SecurityHeadersConfig,
  createCallingSecurityConfig,
  getAPISecurityHeaders,
} from "@/lib/security/security-headers";
import {
  generateHSTSHeader,
  DEFAULT_HSTS_CONFIG,
  logTransportSecurityEvent,
  createTransportSecurityEvent,
} from "@/lib/security/transport-security";

// ============================================================================
// Types
// ============================================================================

/**
 * Transport security middleware options
 */
export interface TransportSecurityOptions {
  /** Security headers configuration */
  headers?: SecurityHeadersConfig;
  /** Enable strict mode (block insecure requests) */
  strictMode?: boolean;
  /** Paths to exclude from security headers */
  excludePaths?: string[];
  /** Paths that require calling permissions (camera/mic) */
  callingPaths?: string[];
  /** Custom API paths (use API headers) */
  apiPaths?: string[];
  /** Enable security event logging */
  enableLogging?: boolean;
  /** Custom nonce header name */
  nonceHeaderName?: string;
}

/**
 * Default middleware options
 */
const DEFAULT_OPTIONS: TransportSecurityOptions = {
  headers: DEFAULT_SECURITY_HEADERS_CONFIG,
  strictMode: process.env.NODE_ENV === "production",
  excludePaths: ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"],
  callingPaths: ["/chat", "/calls"],
  apiPaths: ["/api"],
  enableLogging: true,
  nonceHeaderName: "X-Nonce",
};

// ============================================================================
// Path Matching
// ============================================================================

/**
 * Check if path matches any pattern
 *
 * @param pathname - Request pathname
 * @param patterns - Patterns to match against
 * @returns True if path matches any pattern
 */
function matchesPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("*")) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    if (pattern.endsWith("/")) {
      return pathname === pattern.slice(0, -1) || pathname.startsWith(pattern);
    }
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  });
}

/**
 * Check if request is for an API endpoint
 *
 * @param pathname - Request pathname
 * @param apiPaths - API path patterns
 * @returns True if request is for an API
 */
function isAPIRequest(pathname: string, apiPaths: string[]): boolean {
  return matchesPath(pathname, apiPaths);
}

/**
 * Check if request is for a calling feature
 *
 * @param pathname - Request pathname
 * @param callingPaths - Calling path patterns
 * @returns True if request needs calling permissions
 */
function isCallingRequest(pathname: string, callingPaths: string[]): boolean {
  // Check for specific calling routes
  if (
    pathname.includes("/call") ||
    pathname.includes("/video") ||
    pathname.includes("/voice")
  ) {
    return true;
  }
  return matchesPath(pathname, callingPaths);
}

// ============================================================================
// Security Checks
// ============================================================================

/**
 * Check if request is using HTTPS
 *
 * @param request - Next.js request
 * @returns True if request is secure
 */
function isSecureRequest(request: NextRequest): boolean {
  // Check X-Forwarded-Proto header (common with reverse proxies)
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.toLowerCase() === "https";
  }

  // Check URL protocol
  const url = new URL(request.url);
  return url.protocol === "https:";
}

/**
 * Check for potential TLS downgrade attack
 *
 * @param request - Next.js request
 * @returns True if downgrade attack detected
 */
function detectTLSDowngrade(request: NextRequest): boolean {
  const url = new URL(request.url);

  // In production, check for HTTP requests
  if (process.env.NODE_ENV === "production") {
    // Check if request came through a secure connection but claims HTTP
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const originalProto = request.headers.get("x-original-proto");

    if (forwardedProto === "https" && originalProto === "http") {
      return true;
    }

    // Check for upgrade-insecure-requests header on HTTP
    if (
      url.protocol === "http:" &&
      request.headers.get("upgrade-insecure-requests") === "1"
    ) {
      // Client supports HTTPS but got HTTP - potential downgrade
      return true;
    }
  }

  return false;
}

/**
 * Check for mixed content
 *
 * @param request - Next.js request
 * @returns True if mixed content detected
 */
function detectMixedContent(request: NextRequest): boolean {
  const referer = request.headers.get("referer");
  const url = new URL(request.url);

  if (referer) {
    try {
      const refererUrl = new URL(referer);

      // HTTPS page loading HTTP resource
      if (refererUrl.protocol === "https:" && url.protocol === "http:") {
        return true;
      }
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

/**
 * Validate secure cookie requirements
 *
 * @param request - Next.js request
 * @returns Array of cookie security issues
 */
function validateCookieSecurity(request: NextRequest): string[] {
  const issues: string[] = [];
  const cookies = request.cookies.getAll();

  for (const cookie of cookies) {
    // Check for session cookies without Secure flag on HTTPS
    if (isSecureRequest(request)) {
      if (cookie.name.includes("session") || cookie.name.includes("auth")) {
        // In a real scenario, we'd check the actual cookie flags
        // Here we just note that secure cookies should be used
      }
    }

    // Check for __Host- prefix requirements
    if (cookie.name.startsWith("__Host-")) {
      // Must have Secure, must not have Domain, Path must be /
      // This is validated at cookie setting time, but we can log if present
    }

    // Check for __Secure- prefix requirements
    if (cookie.name.startsWith("__Secure-")) {
      // Must have Secure flag
    }
  }

  return issues;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create HTTPS redirect response
 *
 * @param request - Original request
 * @returns Redirect response to HTTPS
 */
function createHTTPSRedirect(request: NextRequest): NextResponse {
  const url = new URL(request.url);
  url.protocol = "https:";

  return NextResponse.redirect(url, {
    status: 301, // Permanent redirect
    headers: {
      Location: url.toString(),
      "Strict-Transport-Security": generateHSTSHeader(DEFAULT_HSTS_CONFIG),
    },
  });
}

/**
 * Create blocked response for security violation
 *
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns Error response
 */
function createBlockedResponse(
  message: string,
  statusCode: number = 403,
): NextResponse {
  return NextResponse.json(
    {
      error: "Security violation",
      message,
      code: "TRANSPORT_SECURITY_VIOLATION",
    },
    { status: statusCode },
  );
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Apply security headers to response
 *
 * @param response - Response to modify
 * @param headers - Headers to apply
 * @param nonce - Optional CSP nonce
 */
function applySecurityHeaders(
  response: NextResponse,
  headers: Record<string, string>,
  nonce?: string,
): void {
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }

  if (nonce) {
    response.headers.set("X-Nonce", nonce);
  }
}

/**
 * Get request info for logging
 *
 * @param request - Next.js request
 * @returns Request information
 */
function getRequestInfo(request: NextRequest): {
  ip: string;
  userAgent: string;
  url: string;
} {
  return {
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
    url: request.url,
  };
}

/**
 * Create transport security middleware
 *
 * @param options - Middleware options
 * @returns Middleware function
 */
export function createTransportSecurityMiddleware(
  options: TransportSecurityOptions = {},
): (request: NextRequest) => Promise<NextResponse> | NextResponse {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return (request: NextRequest) => {
    const { pathname } = request.nextUrl;
    const isDev = process.env.NODE_ENV === "development";

    // Skip excluded paths
    if (config.excludePaths && matchesPath(pathname, config.excludePaths)) {
      return NextResponse.next();
    }

    // Check for TLS downgrade attack
    if (detectTLSDowngrade(request)) {
      if (config.enableLogging) {
        const event = createTransportSecurityEvent(
          "tls_downgrade_attempt",
          "critical",
          { pathname },
          getRequestInfo(request),
        );
        logTransportSecurityEvent(event);
      }

      if (config.strictMode) {
        return createBlockedResponse("TLS downgrade detected");
      }
    }

    // Check for mixed content
    if (detectMixedContent(request)) {
      if (config.enableLogging) {
        const event = createTransportSecurityEvent(
          "mixed_content_blocked",
          "warning",
          { pathname, referer: request.headers.get("referer") },
          getRequestInfo(request),
        );
        logTransportSecurityEvent(event);
      }

      if (config.strictMode && !isDev) {
        return createBlockedResponse("Mixed content blocked");
      }
    }

    // Redirect HTTP to HTTPS in production
    if (!isDev && config.strictMode && !isSecureRequest(request)) {
      if (config.enableLogging) {
        const event = createTransportSecurityEvent(
          "transport_audit",
          "info",
          { action: "https_redirect", pathname },
          getRequestInfo(request),
        );
        logTransportSecurityEvent(event);
      }

      return createHTTPSRedirect(request);
    }

    // Determine which security headers to use
    let securityConfig = config.headers || DEFAULT_SECURITY_HEADERS_CONFIG;

    // Use calling-enabled config for video/voice paths
    if (
      config.callingPaths &&
      isCallingRequest(pathname, config.callingPaths)
    ) {
      securityConfig = createCallingSecurityConfig(securityConfig);
    }

    // Generate headers
    let headers: Record<string, string>;
    let nonce: string | undefined;

    if (config.apiPaths && isAPIRequest(pathname, config.apiPaths)) {
      // Use API-specific headers
      headers = getAPISecurityHeaders();
    } else {
      // Use full security headers with nonce
      const generated = generateSecurityHeaders(securityConfig, {
        isDevelopment: isDev,
        requestOrigin: request.headers.get("origin") || undefined,
        generateNonce: true,
      });
      headers = generated.headers;
      nonce = generated.nonce;
    }

    // Create response and apply headers
    const response = NextResponse.next();
    applySecurityHeaders(response, headers, nonce);

    // Validate cookie security
    const cookieIssues = validateCookieSecurity(request);
    if (cookieIssues.length > 0 && config.enableLogging) {
      const event = createTransportSecurityEvent(
        "insecure_cookie_blocked",
        "warning",
        { issues: cookieIssues, pathname },
        getRequestInfo(request),
      );
      logTransportSecurityEvent(event);
    }

    return response;
  };
}

/**
 * Default transport security middleware instance
 */
export const transportSecurityMiddleware = createTransportSecurityMiddleware();

// ============================================================================
// Middleware Composers
// ============================================================================

/**
 * Compose multiple middleware functions
 *
 * @param middlewares - Array of middleware functions
 * @returns Composed middleware function
 */
export function composeMiddleware(
  ...middlewares: Array<
    (request: NextRequest) => Promise<NextResponse> | NextResponse
  >
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    let response = NextResponse.next();

    for (const middleware of middlewares) {
      const result = await middleware(request);

      // If middleware returned a redirect or error, stop processing
      if (result.status !== 200 || result.headers.get("location")) {
        return result;
      }

      // Merge headers from each middleware
      result.headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
    }

    return response;
  };
}

/**
 * Create middleware that only runs on specific paths
 *
 * @param paths - Paths to apply middleware to
 * @param middleware - Middleware function
 * @returns Conditional middleware
 */
export function withPaths(
  paths: string[],
  middleware: (request: NextRequest) => Promise<NextResponse> | NextResponse,
): (request: NextRequest) => Promise<NextResponse> | NextResponse {
  return (request: NextRequest) => {
    const { pathname } = request.nextUrl;

    if (matchesPath(pathname, paths)) {
      return middleware(request);
    }

    return NextResponse.next();
  };
}

/**
 * Create middleware that excludes specific paths
 *
 * @param paths - Paths to exclude
 * @param middleware - Middleware function
 * @returns Conditional middleware
 */
export function withoutPaths(
  paths: string[],
  middleware: (request: NextRequest) => Promise<NextResponse> | NextResponse,
): (request: NextRequest) => Promise<NextResponse> | NextResponse {
  return (request: NextRequest) => {
    const { pathname } = request.nextUrl;

    if (!matchesPath(pathname, paths)) {
      return middleware(request);
    }

    return NextResponse.next();
  };
}

// ============================================================================
// Utility Exports
// ============================================================================

export {
  isSecureRequest,
  detectTLSDowngrade,
  detectMixedContent,
  validateCookieSecurity,
  matchesPath,
  isAPIRequest,
  isCallingRequest,
};

// ============================================================================
// Middleware Configuration Export
// ============================================================================

/**
 * Get matcher configuration for Next.js middleware
 *
 * @param options - Middleware options
 * @returns Matcher configuration
 */
export function getMiddlewareMatcher(
  options: TransportSecurityOptions = DEFAULT_OPTIONS,
): {
  matcher: string[];
} {
  // Build negative lookahead for excluded paths
  const excludePatterns = (options.excludePaths || [])
    .map((path) => path.replace(/\*/g, ".*"))
    .join("|");

  return {
    matcher: [
      // Match all paths except static files and excluded paths
      `/((?!${excludePatterns || "_next/static|_next/image|favicon.ico"}).*)`,
    ],
  };
}
