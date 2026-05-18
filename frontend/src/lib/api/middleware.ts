/**
 * API Middleware Utilities
 *
 * Provides authentication, rate limiting, error handling, and logging
 * for API routes. Can be used individually or composed together.
 *
 * @example
 * ```typescript
 * import { withAuth, withRateLimit, withErrorHandler, compose } from '@/lib/api/middleware'
 *
 * // Single middleware
 * export const GET = withAuth(async (request, context) => {
 *   return successResponse({ message: 'Hello' })
 * })
 *
 * // Composed middleware
 * export const POST = compose(
 *   withErrorHandler,
 *   withRateLimit({ limit: 10, window: 60 }),
 *   withAuth
 * )(async (request, context) => {
 *   return successResponse({ message: 'Protected endpoint' })
 * })
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  rateLimitResponse,
  internalErrorResponse,
} from "./response";
import { logger } from "@/lib/logger";
import {
  getRateLimitService,
  checkEndpointRateLimit,
  type RateLimitMetadata,
  type UserTier,
  type RateLimitResult,
} from "@/services/rate-limit";

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName?: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  avatarUrl?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

export interface RouteContext<
  TParams extends Record<string, string> = Record<string, string>,
> {
  params: Promise<TParams>;
}

export type ApiHandler<
  TRequest = NextRequest,
  TParams extends Record<string, string> = Record<string, string>,
> = (
  request: TRequest,
  context: RouteContext<TParams>,
) => Promise<NextResponse> | NextResponse;

export type Middleware<TIn = NextRequest, TOut = NextRequest> = (
  handler: ApiHandler<TOut, any>,
) => ApiHandler<TIn, any>;

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  return "127.0.0.1";
}

/**
 * Get user tier from request for rate limiting
 */
function getUserTierFromRequest(request: NextRequest): UserTier | undefined {
  // Check session cookie for role
  const sessionCookie =
    request.cookies.get("nchat-session")?.value ||
    request.cookies.get("nhostSession")?.value ||
    request.cookies.get("nchat-dev-session")?.value;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      const role = parsed.role || parsed["x-hasura-default-role"];
      if (role === "owner" || role === "admin") return "admin";
      if (role === "premium") return "premium";
      if (role === "enterprise") return "enterprise";
      if (role === "guest") return "guest";
      return "member";
    } catch {
      // Ignore
    }
  }

  // Check for internal service
  const internalKey = request.headers.get("x-internal-key");
  if (internalKey === process.env.INTERNAL_SERVICE_KEY) {
    return "internal";
  }

  return undefined;
}

/**
 * Build rate limit metadata from request
 */
function buildRateLimitMetadata(request: NextRequest): RateLimitMetadata {
  const userId = getUserIdFromRequest(request);
  const ip = getClientIp(request);
  const tier = getUserTierFromRequest(request);
  const apiKey = request.headers.get("x-api-key") || undefined;

  return {
    userId: userId || undefined,
    ip,
    userRole: tier,
    path: new URL(request.url).pathname,
    method: request.method,
    apiKey,
  };
}

/**
 * Get user ID from request
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const sessionCookie =
    request.cookies.get("nchat-session")?.value ||
    request.cookies.get("nhostSession")?.value ||
    request.cookies.get("nchat-dev-session")?.value;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      return parsed.userId || parsed.sub || null;
    } catch {
      // Ignore
    }
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7);
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.sub || payload.userId || null;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Rate limiting middleware
 *
 * Uses the centralized rate limit service with Redis support,
 * automatic fallback to memory, user tier-based limits, and penalty box.
 */
export interface RateLimitOptions {
  /** Maximum requests per window (overrides default) */
  limit?: number;
  /** Window size in seconds (overrides default) */
  window?: number;
  /** Custom key generator (default: auto from request) */
  keyGenerator?: (request: NextRequest) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (request: NextRequest) => boolean;
  /** Use distributed store (Redis) if available */
  useDistributed?: boolean;
}

export function withRateLimit(options: RateLimitOptions = {}): Middleware {
  const { limit, window, skip, useDistributed = true } = options;

  return (handler) => async (request, context) => {
    // Check if should skip rate limiting
    if (skip && skip(request)) {
      return handler(request, context);
    }

    // Check for internal service bypass
    const internalKey = request.headers.get("x-internal-key");
    if (internalKey === process.env.INTERNAL_SERVICE_KEY) {
      return handler(request, context);
    }

    // Check for bypass token
    const bypassToken = request.headers.get("x-ratelimit-bypass");
    if (bypassToken === process.env.RATELIMIT_BYPASS_TOKEN) {
      return handler(request, context);
    }

    try {
      const metadata = buildRateLimitMetadata(request);
      const path = new URL(request.url).pathname;
      const method = request.method;

      let result: RateLimitResult;

      if (useDistributed) {
        // Use the distributed rate limit service
        result = await checkEndpointRateLimit(path, method, metadata);
      } else {
        // Fall back to simple in-memory limiting
        const service = getRateLimitService({ storeType: "memory" });
        result = await service.checkEndpoint(path, method, metadata);
      }

      // Check if blocked (penalty box)
      if (!result.allowed && result.limit === 0) {
        // In penalty box - return 403
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: "Access temporarily blocked",
            errorCode: "IP_BLOCKED",
            retryAfter: result.retryAfter,
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(result.retryAfter || 3600),
            },
          },
        );
      }

      if (!result.allowed) {
        const response = rateLimitResponse(result.retryAfter);

        // Add detailed rate limit headers
        response.headers.set("X-RateLimit-Limit", String(result.limit));
        response.headers.set("X-RateLimit-Remaining", "0");
        response.headers.set("X-RateLimit-Reset", String(result.reset));

        return response;
      }

      // Execute handler
      const response = await handler(request, context);

      // Add rate limit headers to successful response
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(result.reset));

      return response;
    } catch (error) {
      logger.error("[withRateLimit] Error:", error);
      // On rate limit service error, allow request (fail open)
      return handler(request, context);
    }
  };
}

/**
 * Strict rate limiting for sensitive endpoints (auth, password changes, etc.)
 */
export function withStrictRateLimit(
  options: RateLimitOptions = {},
): Middleware {
  return withRateLimit({
    ...options,
    // Sensitive endpoints never skip rate limiting
    skip: () => false,
  });
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Extract and validate authentication token from request
 */
export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  // Check Authorization header
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return validateToken(token);
  }

  // Check cookie-based auth
  const sessionCookie = request.cookies.get("nhost-session");
  if (sessionCookie?.value) {
    return validateSession(sessionCookie.value);
  }

  return null;
}

/**
 * Validate JWT token with Nhost
 */
async function validateToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    // In development mode, check for test tokens
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true"
    ) {
      const devUser = getDevUser(token);
      if (devUser) return devUser;
    }

    // Production JWT validation
    // Verify JWT token with Hasura/Nhost backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.id || !data.email) {
      return null;
    }

    // Map Nhost user to AuthenticatedUser
    return {
      id: data.id,
      email: data.email,
      displayName: data.displayName || data.metadata?.displayName || data.email,
      role: data.metadata?.role || "member",
      avatarUrl: data.avatarUrl || data.metadata?.avatarUrl,
    };
  } catch (error) {
    logger.error("Token validation error:", error);
    return null;
  }
}

/**
 * Validate session with Nhost
 */
async function validateSession(
  sessionToken: string,
): Promise<AuthenticatedUser | null> {
  try {
    // In development mode, check for test sessions
    if (
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_USE_DEV_AUTH === "true"
    ) {
      const devUser = getDevUser(sessionToken);
      if (devUser) return devUser;
    }

    // Production session validation
    // Verify session token with Nhost backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_URL}/user`, {
      headers: {
        Cookie: `nhost-session=${sessionToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.id || !data.email) {
      return null;
    }

    // Map Nhost user to AuthenticatedUser
    return {
      id: data.id,
      email: data.email,
      displayName: data.displayName || data.metadata?.displayName || data.email,
      role: data.metadata?.role || "member",
      avatarUrl: data.avatarUrl || data.metadata?.avatarUrl,
    };
  } catch (error) {
    logger.error("Session validation error:", error);
    return null;
  }
}

/**
 * Get development user from token (for testing)
 */
function getDevUser(token: string): AuthenticatedUser | null {
  const devUsers: Record<string, AuthenticatedUser> = {
    "dev-owner": {
      id: "dev-owner-id",
      email: "owner@nself.org",
      displayName: "Owner User",
      role: "owner",
    },
    "dev-admin": {
      id: "dev-admin-id",
      email: "admin@nself.org",
      displayName: "Admin User",
      role: "admin",
    },
    "dev-moderator": {
      id: "dev-moderator-id",
      email: "moderator@nself.org",
      displayName: "Moderator User",
      role: "moderator",
    },
    "dev-member": {
      id: "dev-member-id",
      email: "member@nself.org",
      displayName: "Member User",
      role: "member",
    },
    "dev-guest": {
      id: "dev-guest-id",
      email: "guest@nself.org",
      displayName: "Guest User",
      role: "guest",
    },
  };

  return devUsers[token] || null;
}

/**
 * Authentication middleware - requires valid authentication
 */
export function withAuth(
  handler: ApiHandler<AuthenticatedRequest>,
): ApiHandler {
  return async (request, context) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    // Extend request with user
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = user;

    return handler(authenticatedRequest, context);
  };
}

/**
 * Optional authentication middleware - adds user if authenticated but doesn't require it
 */
export function withOptionalAuth<T extends NextRequest>(
  handler: ApiHandler<T & { user?: AuthenticatedUser }>,
): ApiHandler<T> {
  return async (request, context) => {
    const user = await getAuthenticatedUser(request);

    // Extend request with user (if authenticated)
    const extendedRequest = request as T & { user?: AuthenticatedUser };
    if (user) {
      extendedRequest.user = user;
    }

    return handler(extendedRequest, context);
  };
}

/**
 * Role-based authorization middleware
 */
export function withRole(
  allowedRoles: AuthenticatedUser["role"][],
): Middleware<AuthenticatedRequest, AuthenticatedRequest> {
  return (handler) => async (request, context) => {
    const { user } = request;

    if (!allowedRoles.includes(user.role)) {
      return forbiddenResponse("Insufficient permissions");
    }

    return handler(request, context);
  };
}

/**
 * Admin-only middleware (owner or admin role)
 */
export function withAdmin(
  handler: ApiHandler<AuthenticatedRequest>,
): ApiHandler<AuthenticatedRequest> {
  return withRole(["owner", "admin"])(handler);
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Error handling middleware - catches errors and returns appropriate responses
 */
export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      logger.error("API Error:", error);

      // Handle known error types
      if (error instanceof ApiError) {
        return errorResponse(
          error.message,
          error.code,
          error.status,
          error.details,
        );
      }

      // Handle validation errors
      if (error instanceof ValidationError) {
        return errorResponse("Validation failed", "VALIDATION_ERROR", 422, {
          errors: error.errors,
        });
      }

      // Log unexpected errors
      logger.error("Unexpected API error:", error);

      // Return generic error for unexpected errors
      return internalErrorResponse();
    }
  };
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(public errors: Record<string, string[]>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

// ============================================================================
// Logging
// ============================================================================

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  ip?: string;
  userId?: string;
  userAgent?: string;
  error?: string;
}

/**
 * Logging middleware - logs request and response info
 */
export function withLogging(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    const startTime = Date.now();
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      method: request.method,
      path: new URL(request.url).pathname,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
    };

    try {
      const response = await handler(request, context);

      logEntry.status = response.status;
      logEntry.duration = Date.now() - startTime;

      // Log successful requests (can be disabled in production)
      if (process.env.NODE_ENV === "development") {
        // REMOVED: console.log(
        //   `[API] ${logEntry.method} ${logEntry.path} ${logEntry.status} ${logEntry.duration}ms`
        // )
      }

      return response;
    } catch (error) {
      logEntry.duration = Date.now() - startTime;
      logEntry.error = error instanceof Error ? error.message : "Unknown error";

      // Always log errors
      logger.error(`[API ERROR] ${logEntry.method} ${logEntry.path}:`, error);

      throw error;
    }
  };
}

// ============================================================================
// Middleware Composition
// ============================================================================

/**
 * Compose multiple middleware functions
 *
 * @example
 * ```typescript
 * const handler = compose(
 *   withErrorHandler,
 *   withLogging,
 *   withRateLimit({ limit: 10 }),
 *   withAuth
 * )(actualHandler)
 * ```
 */
export function compose<
  TRequest extends NextRequest = NextRequest,
  TParams extends Record<string, string> = Record<string, string>,
>(
  ...middlewares: Array<Middleware<any, any>>
): (handler: ApiHandler<any, TParams>) => ApiHandler<TRequest, TParams> {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => {
      return middleware(acc);
    }, handler) as ApiHandler<TRequest, TParams>;
  };
}

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Validate request body against a schema
 */
export async function validateBody<T>(
  request: NextRequest,
  validate: (body: unknown) => T | null | { errors: Record<string, string[]> },
): Promise<T> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ApiError("Invalid JSON body", "INVALID_JSON", 400);
  }

  const result = validate(body);

  if (result === null) {
    throw new ApiError("Invalid request body", "INVALID_BODY", 400);
  }

  if (typeof result === "object" && "errors" in result) {
    throw new ValidationError(result.errors);
  }

  return result;
}

/**
 * Get query parameters with defaults
 */
export function getQueryParams(
  request: NextRequest,
  defaults: Record<string, string | number | boolean | undefined> = {},
): Record<string, string | number | boolean | undefined> {
  const { searchParams } = new URL(request.url);
  const result: Record<string, string | number | boolean | undefined> = {
    ...defaults,
  };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    const value = searchParams.get(key);

    if (value !== null) {
      if (typeof defaultValue === "number") {
        result[key] = parseInt(value, 10) || defaultValue;
      } else if (typeof defaultValue === "boolean") {
        result[key] = value === "true" || value === "1";
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

// ============================================================================
// CORS Handling
// ============================================================================

/**
 * Validate origin against allowed origins
 */
function isOriginAllowed(
  requestOrigin: string | null,
  allowedOrigins: string | string[],
): boolean {
  if (!requestOrigin) return false;

  // Allow all origins in development (for localhost testing)
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // Wildcard allows all (NOT RECOMMENDED FOR PRODUCTION)
  if (allowedOrigins === "*") {
    console.warn(
      "[SECURITY WARNING] CORS configured with wildcard (*) - this is not secure for production",
    );
    return true;
  }

  // Check if origin is in allowed list
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.some((allowed) => {
      // Exact match
      if (allowed === requestOrigin) return true;

      // Pattern match (e.g., *.example.com)
      if (allowed.startsWith("*.")) {
        const domain = allowed.substring(2);
        return requestOrigin.endsWith(domain);
      }

      return false;
    });
  }

  // Single origin check
  return allowedOrigins === requestOrigin;
}

/**
 * Get allowed origin for response header
 */
function getAllowedOrigin(
  requestOrigin: string | null,
  allowedOrigins: string | string[],
): string | null {
  // In production, never return '*' when credentials are used
  // Instead, return the specific origin if it's allowed
  if (!requestOrigin) return null;

  if (isOriginAllowed(requestOrigin, allowedOrigins)) {
    return requestOrigin;
  }

  return null;
}

/**
 * Add CORS headers to response
 *
 * SECURITY NOTE: For production, always specify explicit origins.
 * Never use '*' with credentials enabled.
 */
export function withCors(
  options: {
    /** Allowed origins - use specific domains in production, NOT '*' */
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
    /** Enable credentials (cookies, auth headers) - requires specific origin, not '*' */
    credentials?: boolean;
  } = {},
): Middleware {
  const {
    origin = process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_APP_URL || "https://nchat.app"
      : "*",
    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    headers: allowedHeaders = ["Content-Type", "Authorization"],
    credentials = false,
  } = options;

  // Validate configuration
  if (credentials && origin === "*") {
    throw new Error(
      "[SECURITY ERROR] Cannot use credentials with wildcard CORS origin. " +
        "Specify explicit origins when credentials are enabled.",
    );
  }

  return (handler) => async (request, context) => {
    const requestOrigin = request.headers.get("origin");
    const allowedOrigin = getAllowedOrigin(requestOrigin, origin);

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      // Reject if origin not allowed
      if (requestOrigin && !allowedOrigin) {
        return new NextResponse(null, { status: 403 });
      }

      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin || "*",
          "Access-Control-Allow-Methods": methods.join(", "),
          "Access-Control-Allow-Headers": allowedHeaders.join(", "),
          "Access-Control-Allow-Credentials": String(credentials),
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        },
      });
    }

    // Reject actual request if origin not allowed and credentials required
    if (credentials && requestOrigin && !allowedOrigin) {
      return new NextResponse(
        JSON.stringify({ error: "CORS origin not allowed" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const response = await handler(request, context);

    // Set CORS headers
    if (allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set("Vary", "Origin");
    } else if (origin === "*" && !credentials) {
      response.headers.set("Access-Control-Allow-Origin", "*");
    }

    if (credentials) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    // Expose custom headers to client
    response.headers.set(
      "Access-Control-Expose-Headers",
      "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
    );

    return response;
  };
}
