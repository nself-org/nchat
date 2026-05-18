/**
 * CSRF Protection Middleware
 * Phase 19 - Security Hardening (Task 125)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = "nchat_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

// Methods that require CSRF protection
const PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// Paths that don't need CSRF (public APIs, webhooks)
const CSRF_EXEMPT_PATHS = [
  "/api/webhooks/",
  "/api/auth/callback",
  "/api/health",
];

/**
 * Generate a secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Hash token for storage (prevents token fixation)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * CSRF Protection Middleware
 */
export async function csrfProtection(
  request: NextRequest,
): Promise<NextResponse | null> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  // Skip for safe methods
  if (!PROTECTED_METHODS.includes(method)) {
    return null;
  }

  // Skip for exempt paths
  if (CSRF_EXEMPT_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // No cookie token - generate one for next request
  if (!cookieToken) {
    return NextResponse.json(
      {
        error: "CSRF token missing",
        message:
          "CSRF token not found in cookies. Please refresh and try again.",
      },
      {
        status: 403,
        headers: {
          "Set-Cookie": `${CSRF_COOKIE_NAME}=${generateCsrfToken()}; Path=/; HttpOnly; Secure; SameSite=Strict`,
        },
      },
    );
  }

  // No header token
  if (!headerToken) {
    return NextResponse.json(
      {
        error: "CSRF token required",
        message: "CSRF token must be included in request header.",
      },
      { status: 403 },
    );
  }

  // Verify tokens match
  const cookieHash = hashToken(cookieToken);
  const headerHash = hashToken(headerToken);

  if (cookieHash !== headerHash) {
    return NextResponse.json(
      {
        error: "CSRF token mismatch",
        message: "Invalid CSRF token. Please refresh and try again.",
      },
      { status: 403 },
    );
  }

  // Valid - allow request
  return null;
}

/**
 * Double Submit Cookie Pattern
 * Alternative CSRF protection that doesn't require server-side state
 */
export async function doubleSubmitCookie(
  request: NextRequest,
): Promise<NextResponse | null> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (!PROTECTED_METHODS.includes(method)) {
    return null;
  }

  if (CSRF_EXEMPT_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 },
    );
  }

  return null;
}

/**
 * Origin validation (additional layer)
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!origin && !referer) {
    // No origin/referer header - potentially suspicious
    return false;
  }

  const allowedOrigins = [
    `https://${host}`,
    `http://${host}`, // For development
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    return false;
  }

  if (referer) {
    const refererUrl = new URL(referer);
    if (!allowedOrigins.some((o) => refererUrl.origin === o)) {
      return false;
    }
  }

  return true;
}

/**
 * Combined CSRF protection with origin validation
 */
export async function enhancedCsrfProtection(
  request: NextRequest,
): Promise<NextResponse | null> {
  // Check origin first
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  }

  // Then check CSRF token
  return csrfProtection(request);
}
