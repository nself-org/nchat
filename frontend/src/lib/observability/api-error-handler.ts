/**
 * API Error Handler Middleware
 *
 * Provides centralized error handling for API routes with:
 * - Automatic error logging
 * - Sentry error capture
 * - Request context tracking
 * - Consistent error responses
 */

import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";
import { getRequestId } from "./request-id";

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
  isOperational?: boolean; // Known/expected errors
}

export class ApiErrorResponse extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiErrorResponse";
  }
}

/**
 * Create operational error (known, expected errors)
 */
export function createOperationalError(
  statusCode: number,
  message: string,
  code?: string,
  details?: Record<string, unknown>,
): ApiErrorResponse {
  const error = new ApiErrorResponse(statusCode, message, code, details);
  (error as any).isOperational = true;
  return error;
}

/**
 * Common operational errors
 */
export const ApiErrors = {
  BadRequest: (message: string, details?: Record<string, unknown>) =>
    createOperationalError(400, message, "BAD_REQUEST", details),

  Unauthorized: (message = "Unauthorized") =>
    createOperationalError(401, message, "UNAUTHORIZED"),

  Forbidden: (message = "Forbidden") =>
    createOperationalError(403, message, "FORBIDDEN"),

  NotFound: (message = "Resource not found") =>
    createOperationalError(404, message, "NOT_FOUND"),

  Conflict: (message: string, details?: Record<string, unknown>) =>
    createOperationalError(409, message, "CONFLICT", details),

  ValidationError: (details: Record<string, unknown>) =>
    createOperationalError(
      422,
      "Validation failed",
      "VALIDATION_ERROR",
      details,
    ),

  TooManyRequests: (retryAfter?: number) =>
    createOperationalError(429, "Too many requests", "RATE_LIMIT_EXCEEDED", {
      retryAfter,
    }),

  InternalServerError: (message = "Internal server error") =>
    createOperationalError(500, message, "INTERNAL_ERROR"),

  ServiceUnavailable: (message = "Service temporarily unavailable") =>
    createOperationalError(503, message, "SERVICE_UNAVAILABLE"),
};

/**
 * Extract user context from request
 */
function getUserContext(req: NextRequest): Record<string, unknown> {
  // Try to extract user ID from authorization header or cookies
  const authHeader = req.headers.get("authorization");
  const userId = req.cookies.get("userId")?.value;

  return {
    userId: userId || "anonymous",
    hasAuth: !!authHeader,
  };
}

/**
 * Extract request context
 */
function getRequestContext(req: NextRequest): Record<string, unknown> {
  const url = new URL(req.url);

  return {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userAgent: req.headers.get("user-agent") || undefined,
    referer: req.headers.get("referer") || undefined,
    ip:
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown",
  };
}

/**
 * Main error handler wrapper for API routes
 */
export function withErrorHandler<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>,
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    try {
      const response = await handler(req, context);

      // Log successful requests in development
      if (process.env.NODE_ENV === "development") {
        const duration = Date.now() - startTime;
        logger.info("API Request", {
          requestId,
          method: req.method,
          path: new URL(req.url).pathname,
          status: response.status,
          duration,
        });
      }

      // Add request ID to response headers
      response.headers.set("x-request-id", requestId);

      return response;
    } catch (error: unknown) {
      // Get error details
      const err = error as ApiError;
      const isOperational =
        err.isOperational || error instanceof ApiErrorResponse;
      const statusCode = err.statusCode || 500;
      const duration = Date.now() - startTime;

      // Get context
      const userContext = getUserContext(req);
      const requestContext = getRequestContext(req);

      // Log error
      logger.error("API Error", err, {
        requestId,
        ...requestContext,
        ...userContext,
        duration,
        statusCode,
        isOperational,
      });

      // Capture to Sentry (skip operational errors in production)
      if (!isOperational || process.env.NODE_ENV !== "production") {
        captureError(err, {
          tags: {
            requestId,
            endpoint: requestContext.path as string,
            method: requestContext.method as string,
            statusCode: statusCode.toString(),
          },
          extra: {
            ...requestContext,
            ...userContext,
            duration,
          },
          level: statusCode >= 500 ? "error" : "warning",
        });
      }

      // Build error response
      const errorResponse = {
        error: {
          message: err.message || "An error occurred",
          code: (err as ApiErrorResponse).code || "UNKNOWN_ERROR",
          requestId,
          ...(process.env.NODE_ENV === "development" && {
            stack: err.stack,
            details: (err as ApiErrorResponse).details,
          }),
        },
      };

      // Return error response
      return NextResponse.json(errorResponse, {
        status: statusCode,
        headers: {
          "x-request-id": requestId,
        },
      });
    }
  };
}

/**
 * Async error handler for use in route handlers
 */
export async function handleApiError(
  error: unknown,
  req: NextRequest,
): Promise<NextResponse> {
  const err = error as ApiError;
  const isOperational = err.isOperational || error instanceof ApiErrorResponse;
  const statusCode = err.statusCode || 500;
  const requestId = getRequestId(req);

  // Get context
  const userContext = getUserContext(req);
  const requestContext = getRequestContext(req);

  // Log error
  logger.error("API Error (manual handler)", err, {
    requestId,
    ...requestContext,
    ...userContext,
    statusCode,
    isOperational,
  });

  // Capture to Sentry
  if (!isOperational || process.env.NODE_ENV !== "production") {
    captureError(err, {
      tags: {
        requestId,
        endpoint: requestContext.path as string,
        method: requestContext.method as string,
        statusCode: statusCode.toString(),
      },
      extra: {
        ...requestContext,
        ...userContext,
      },
      level: statusCode >= 500 ? "error" : "warning",
    });
  }

  // Build error response
  const errorResponse = {
    error: {
      message: err.message || "An error occurred",
      code: (err as ApiErrorResponse).code || "UNKNOWN_ERROR",
      requestId,
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack,
        details: (err as ApiErrorResponse).details,
      }),
    },
  };

  return NextResponse.json(errorResponse, {
    status: statusCode,
    headers: {
      "x-request-id": requestId,
    },
  });
}

/**
 * Example usage:
 *
 * ```typescript
 * // Wrap entire route handler
 * export const GET = withErrorHandler(async (req) => {
 *   // Your handler code
 *   return NextResponse.json({ data: 'success' })
 * })
 *
 * // Or handle errors manually
 * export async function POST(req: NextRequest) {
 *   try {
 *     // Your code
 *     if (!valid) {
 *       throw ApiErrors.BadRequest('Invalid input')
 *     }
 *     return NextResponse.json({ success: true })
 *   } catch (error) {
 *     return handleApiError(error, req)
 *   }
 * }
 * ```
 */
