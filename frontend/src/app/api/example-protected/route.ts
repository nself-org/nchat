/**
 * Example Protected API Route
 *
 * Demonstrates comprehensive use of rate limiting, CSRF protection,
 * authentication, and error handling middleware.
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const csrfToken = await fetch('/api/csrf').then(r => r.json())
 *
 * const response = await fetch('/api/example-protected', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'X-CSRF-Token': csrfToken.csrfToken,
 *     'Authorization': `Bearer ${accessToken}`,
 *   },
 *   body: JSON.stringify({ data: 'example' }),
 * })
 * ```
 */

import { NextResponse } from "next/server";
import {
  compose,
  withErrorHandler,
  withAuth,
  withLogging,
  AuthenticatedRequest,
  RouteContext,
} from "@/lib/api/middleware";
import { withCsrfProtection } from "@/lib/security/csrf";
import { successResponse } from "@/lib/api/response";
import {
  applyRateLimit,
  RATE_LIMIT_PRESETS,
  getRateLimitHeaders,
} from "@/lib/api/rate-limiter";

/**
 * GET - Get protected data (no CSRF required for GET)
 *
 * Rate limited to 100 requests per minute per user.
 */
export const GET = compose(
  withErrorHandler,
  withLogging,
  withAuth,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  // Apply rate limit
  const rateLimitResult = await applyRateLimit(
    request,
    RATE_LIMIT_PRESETS.API_USER,
    `user:${request.user.id}`,
  );

  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...getRateLimitHeaders(rateLimitResult),
        },
      },
    );
  }

  // Your business logic here
  const data = {
    message: "This is protected data",
    user: {
      id: request.user.id,
      email: request.user.email,
      role: request.user.role,
    },
    timestamp: new Date().toISOString(),
  };

  const response = successResponse(data);

  // Add rate limit headers
  const headers = getRateLimitHeaders(rateLimitResult);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

/**
 * POST - Create/update data (requires CSRF token)
 *
 * Rate limited to 10 requests per minute per user.
 * Requires valid CSRF token in X-CSRF-Token header.
 */
export const POST = compose(
  withErrorHandler,
  withLogging,
  withCsrfProtection, // CSRF protection for state-changing requests
  withAuth,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  // Apply stricter rate limit for POST
  const rateLimitResult = await applyRateLimit(
    request,
    RATE_LIMIT_PRESETS.MESSAGE_SEND, // 10/min with burst
    `user:${request.user.id}`,
  );

  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...getRateLimitHeaders(rateLimitResult),
        },
      },
    );
  }

  // Parse request body
  const body = await request.json();

  // Your business logic here
  const result = {
    success: true,
    message: "Data created successfully",
    data: body,
    createdBy: {
      id: request.user.id,
      email: request.user.email,
    },
    timestamp: new Date().toISOString(),
  };

  const response = successResponse(result);

  // Add rate limit headers
  const headers = getRateLimitHeaders(rateLimitResult);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

/**
 * DELETE - Delete data (requires CSRF token and admin role)
 *
 * Rate limited to 50 requests per minute per user.
 * Requires valid CSRF token and admin role.
 */
export const DELETE = compose(
  withErrorHandler,
  withLogging,
  withCsrfProtection,
  withAuth,
)(async (request: AuthenticatedRequest, context: RouteContext) => {
  // Check admin role
  if (!["owner", "admin"].includes(request.user.role)) {
    return new NextResponse(
      JSON.stringify({
        error: "Forbidden",
        message: "Admin role required",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Apply rate limit
  const rateLimitResult = await applyRateLimit(
    request,
    RATE_LIMIT_PRESETS.GRAPHQL_MUTATION, // 50/min
    `user:${request.user.id}`,
  );

  if (!rateLimitResult.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...getRateLimitHeaders(rateLimitResult),
        },
      },
    );
  }

  // Your business logic here
  const result = {
    success: true,
    message: "Data deleted successfully",
    deletedBy: {
      id: request.user.id,
      email: request.user.email,
      role: request.user.role,
    },
    timestamp: new Date().toISOString(),
  };

  const response = successResponse(result);

  // Add rate limit headers
  const headers = getRateLimitHeaders(rateLimitResult);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});
