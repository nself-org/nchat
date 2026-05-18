/**
 * Request ID Tracking
 *
 * Provides unique request IDs for distributed tracing and log correlation.
 */

import { NextRequest } from "next/server";
import { nanoid } from "nanoid";

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req-${nanoid(12)}`;
}

/**
 * Get or generate request ID from request
 */
export function getRequestId(req: NextRequest | Request): string {
  // Check if request already has an ID (from middleware or external source)
  const existingId =
    req.headers.get("x-request-id") || req.headers.get("x-correlation-id");

  if (existingId) {
    return existingId;
  }

  // Generate new ID
  return generateRequestId();
}

/**
 * Add request ID to headers
 */
export function addRequestIdHeader(
  headers: Headers,
  requestId?: string,
): Headers {
  const id = requestId || generateRequestId();
  headers.set("x-request-id", id);
  return headers;
}

/**
 * Example usage in API route:
 *
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   const requestId = getRequestId(req)
 *
 *   logger.info('Processing request', { requestId })
 *
 *   const response = NextResponse.json({ data: 'success' })
 *   response.headers.set('x-request-id', requestId)
 *   return response
 * }
 * ```
 */
