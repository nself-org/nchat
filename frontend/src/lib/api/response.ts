/**
 * API Response Helpers
 *
 * Standardized response utilities for all API routes.
 * Provides consistent JSON response formatting with proper headers.
 *
 * @example
 * ```typescript
 * import { successResponse, errorResponse, paginatedResponse } from '@/lib/api/response'
 *
 * // Success response
 * return successResponse({ user: { id: '123', name: 'John' } })
 *
 * // Error response
 * return errorResponse('User not found', 'USER_NOT_FOUND', 404)
 *
 * // Paginated response
 * return paginatedResponse(items, { total: 100, page: 1, limit: 20 })
 * ```
 */

import { NextResponse } from "next/server";

// ============================================================================
// Types
// ============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedApiResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  options?: {
    status?: number;
    headers?: HeadersInit;
    meta?: Record<string, unknown>;
  },
): NextResponse<ApiSuccessResponse<T>> {
  const { status = 200, headers = {}, meta } = options || {};

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  errorCode?: string,
  status: number = 400,
  details?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
  };

  if (errorCode) {
    response.errorCode = errorCode;
  }

  if (details) {
    response.details = details;
  }

  return NextResponse.json(response, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  options: {
    total: number;
    page: number;
    limit: number;
    headers?: HeadersInit;
  },
): NextResponse<PaginatedApiResponse<T>> {
  const { total, page, limit, headers = {} } = options;

  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const pagination: PaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };

  return NextResponse.json(
    {
      success: true,
      data,
      pagination,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    },
  );
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(
  data: T,
  headers?: HeadersInit,
): NextResponse<ApiSuccessResponse<T>> {
  return successResponse(data, { status: 201, headers });
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Create a redirect response
 */
export function redirectResponse(
  url: string,
  status: number = 302,
): NextResponse {
  return NextResponse.redirect(url, status);
}

// ============================================================================
// Common Error Responses
// ============================================================================

/**
 * 400 Bad Request
 */
export function badRequestResponse(
  message: string = "Bad request",
  errorCode: string = "BAD_REQUEST",
  details?: Record<string, unknown>,
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, errorCode, 400, details);
}

/**
 * 401 Unauthorized
 */
export function unauthorizedResponse(
  message: string = "Unauthorized",
  errorCode: string = "UNAUTHORIZED",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, errorCode, 401);
}

/**
 * 403 Forbidden
 */
export function forbiddenResponse(
  message: string = "Forbidden",
  errorCode: string = "FORBIDDEN",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, errorCode, 403);
}

/**
 * 404 Not Found
 */
export function notFoundResponse(
  message: string = "Not found",
  errorCode: string = "NOT_FOUND",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, errorCode, 404);
}

/**
 * 405 Method Not Allowed
 */
export function methodNotAllowedResponse(
  allowedMethods: string[],
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      errorCode: "METHOD_NOT_ALLOWED",
    },
    {
      status: 405,
      headers: {
        Allow: allowedMethods.join(", "),
      },
    },
  );
}

/**
 * 409 Conflict
 */
export function conflictResponse(
  message: string = "Conflict",
  errorCode: string = "CONFLICT",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, errorCode, 409);
}

/**
 * 422 Unprocessable Entity (validation errors)
 */
export function validationErrorResponse(
  errors: Record<string, string[]>,
): NextResponse<ApiErrorResponse> {
  return errorResponse("Validation failed", "VALIDATION_ERROR", 422, {
    errors,
  });
}

/**
 * 429 Too Many Requests
 */
export function rateLimitResponse(
  retryAfter?: number,
): NextResponse<ApiErrorResponse> {
  const headers: HeadersInit = {};
  if (retryAfter) {
    headers["Retry-After"] = String(retryAfter);
  }

  return NextResponse.json(
    {
      success: false,
      error: "Too many requests",
      errorCode: "RATE_LIMITED",
    },
    {
      status: 429,
      headers,
    },
  );
}

/**
 * 500 Internal Server Error
 */
export function internalErrorResponse(
  message: string = "Internal server error",
  errorCode: string = "INTERNAL_ERROR",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, errorCode, 500);
}

/**
 * 503 Service Unavailable
 */
export function serviceUnavailableResponse(
  message: string = "Service unavailable",
  errorCode: string = "SERVICE_UNAVAILABLE",
): NextResponse<ApiErrorResponse> {
  return errorResponse(message, errorCode, 503);
}

// ============================================================================
// Response with Cache Headers
// ============================================================================

/**
 * Create a response with cache control headers
 */
export function cachedResponse<T>(
  data: T,
  options: {
    maxAge?: number;
    sMaxAge?: number;
    staleWhileRevalidate?: number;
    private?: boolean;
  } = {},
): NextResponse<ApiSuccessResponse<T>> {
  const {
    maxAge = 0,
    sMaxAge = maxAge,
    staleWhileRevalidate = 0,
    private: isPrivate = false,
  } = options;

  const cacheControl = [
    isPrivate ? "private" : "public",
    `max-age=${maxAge}`,
    `s-maxage=${sMaxAge}`,
  ];

  if (staleWhileRevalidate > 0) {
    cacheControl.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  return successResponse(data, {
    headers: {
      "Cache-Control": cacheControl.join(", "),
    },
  });
}

/**
 * Create a no-cache response
 */
export function noCacheResponse<T>(
  data: T,
): NextResponse<ApiSuccessResponse<T>> {
  return successResponse(data, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
