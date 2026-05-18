/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Implements CSRF token generation and validation using the
 * synchronizer token pattern (double-submit cookie).
 *
 * @module lib/security/csrf
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHmac } from "crypto";
import { ApiError } from "@/lib/api/middleware";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Lazy validation of CSRF_SECRET
 *
 * This function validates the CSRF secret only when it's actually needed,
 * preventing build-time failures. During `next build`, this validation is
 * skipped if SKIP_ENV_VALIDATION=true is set.
 */
function getCsrfSecret(): string {
  // Skip validation during build if requested
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return "build-time-placeholder-secret";
  }

  const csrfSecret = process.env.CSRF_SECRET;

  // Production validation
  if (process.env.NODE_ENV === "production") {
    if (!csrfSecret) {
      throw new Error(
        "FATAL: CSRF_SECRET environment variable must be set in production",
      );
    }
    if (csrfSecret.length < 32) {
      throw new Error(
        "FATAL: CSRF_SECRET must be at least 32 characters in production",
      );
    }
  }

  // Development warnings
  if (process.env.NODE_ENV !== "production") {
    if (!csrfSecret) {
      logger.warn(
        "WARNING: CSRF_SECRET not set - using development-only default",
      );
    } else if (csrfSecret.length < 32) {
      logger.warn(
        "WARNING: CSRF_SECRET is too short - use at least 32 characters",
      );
    }
  }

  return csrfSecret || "dev-only-insecure-change-in-production";
}

const CSRF_CONFIG = {
  // Token length in bytes (will be hex-encoded to double length)
  TOKEN_LENGTH: 32,

  // Cookie name for CSRF token
  COOKIE_NAME: "nchat-csrf-token",

  // Header name for CSRF token
  HEADER_NAME: "X-CSRF-Token",

  // Token expiry (24 hours)
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000,

  // Secret for HMAC signing - lazily evaluated
  get SECRET() {
    return getCsrfSecret();
  },
} as const;

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a cryptographically secure CSRF token
 *
 * @returns Hex-encoded random token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString("hex");
}

/**
 * Sign a CSRF token with HMAC
 *
 * @param token - Token to sign
 * @returns Signed token (token:signature)
 */
function signToken(token: string): string {
  const signature = createHmac("sha256", CSRF_CONFIG.SECRET)
    .update(token)
    .digest("hex");

  return `${token}:${signature}`;
}

/**
 * Verify a signed CSRF token
 *
 * @param signedToken - Signed token (token:signature)
 * @returns Original token if valid, null otherwise
 */
function verifyToken(signedToken: string): string | null {
  const parts = signedToken.split(":");

  if (parts.length !== 2) {
    return null;
  }

  const [token, signature] = parts;

  const expectedSignature = createHmac("sha256", CSRF_CONFIG.SECRET)
    .update(token)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  return token;
}

/**
 * Timing-safe string comparison
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Get CSRF token from request
 *
 * Checks both header and cookie for the token.
 *
 * @param request - NextRequest to extract token from
 * @returns CSRF token or null
 */
export function getCsrfToken(request: NextRequest): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_CONFIG.HEADER_NAME);

  if (headerToken) {
    const verified = verifyToken(headerToken);
    if (verified) return verified;
  }

  // Check cookie (use optional chaining: cookies may be undefined in test environments)
  const cookieToken = request.cookies?.get(CSRF_CONFIG.COOKIE_NAME)?.value;

  if (cookieToken) {
    const verified = verifyToken(cookieToken);
    if (verified) return verified;
  }

  return null;
}

/**
 * Set CSRF token in response cookie
 *
 * @param response - NextResponse to set cookie in
 * @param token - CSRF token to set (if not provided, generates new one)
 * @returns The token that was set
 */
export function setCsrfToken(response: NextResponse, token?: string): string {
  const csrfToken = token || generateCsrfToken();
  const signedToken = signToken(csrfToken);

  response.cookies.set(CSRF_CONFIG.COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CSRF_CONFIG.TOKEN_EXPIRY / 1000, // Convert to seconds
    path: "/",
  });

  return csrfToken;
}

/**
 * Validate CSRF token from request
 *
 * @param request - NextRequest to validate
 * @returns True if token is valid
 */
export function validateCsrfToken(request: NextRequest): boolean {
  // Skip CSRF validation for safe methods
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  // Skip in development mode (optional)
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_CSRF === "true"
  ) {
    return true;
  }

  // Get token from request
  const requestToken = getCsrfToken(request);

  if (!requestToken) {
    return false;
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_CONFIG.COOKIE_NAME)?.value;

  if (!cookieToken) {
    return false;
  }

  const verifiedCookieToken = verifyToken(cookieToken);

  if (!verifiedCookieToken) {
    return false;
  }

  // Double-submit cookie: tokens must match
  return requestToken === verifiedCookieToken;
}

/**
 * CSRF protection middleware
 *
 * Validates CSRF token for state-changing requests (POST, PUT, DELETE, PATCH).
 *
 * @example
 * ```typescript
 * export const POST = compose(
 *   withErrorHandler,
 *   withCsrfProtection,
 *   withAuth
 * )(handler)
 * ```
 */
export function withCsrfProtection(
  handler: (
    request: NextRequest,
    context: any,
  ) => Promise<NextResponse> | NextResponse,
): (request: NextRequest, context: any) => Promise<NextResponse> {
  return async (request, context) => {
    // Validate CSRF token
    if (!validateCsrfToken(request)) {
      throw new ApiError(
        "Invalid or missing CSRF token",
        "CSRF_VALIDATION_FAILED",
        403,
      );
    }

    // Call handler (await to handle both sync and async handlers)
    const response = await handler(request, context);

    // Ensure CSRF token is set in response
    const existingToken = getCsrfToken(request);
    if (!existingToken) {
      setCsrfToken(response);
    }

    return response;
  };
}

/**
 * Generate CSRF token for client use
 *
 * This should be called from a GET endpoint to provide the token to clients.
 *
 * @example
 * ```typescript
 * // API route: /api/csrf
 * export async function GET(request: NextRequest) {
 *   const token = generateCsrfToken()
 *   const response = NextResponse.json({ csrfToken: token })
 *   setCsrfToken(response, token)
 *   return response
 * }
 * ```
 */
export function getCsrfTokenForClient(request: NextRequest): {
  token: string;
  headerName: string;
  cookieName: string;
} {
  const existingToken = getCsrfToken(request);
  const token = existingToken || generateCsrfToken();

  return {
    token,
    headerName: CSRF_CONFIG.HEADER_NAME,
    cookieName: CSRF_CONFIG.COOKIE_NAME,
  };
}

// ============================================================================
// Client Helpers
// ============================================================================

/**
 * Get CSRF token configuration for client-side usage
 */
export function getCsrfConfig() {
  return {
    headerName: CSRF_CONFIG.HEADER_NAME,
    cookieName: CSRF_CONFIG.COOKIE_NAME,
  };
}
