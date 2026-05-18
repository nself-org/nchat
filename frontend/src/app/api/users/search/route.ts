/**
 * User Search API Routes
 *
 * Handles user profile discovery and search.
 *
 * GET /api/users/search?q=<query> - Search for users
 *
 * @module app/api/users/search
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
} from "@/lib/api/response";
import {
  withAuth,
  withErrorHandler,
  withRateLimit,
  compose,
  type AuthenticatedRequest,
  type RouteContext,
} from "@/lib/api/middleware";
import { logger } from "@/lib/logger";
import { profileService } from "@/services/profile";

// ============================================================================
// Validation Schemas
// ============================================================================

const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query too long"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/users/search
 *
 * Search for users by username or display name
 * Query params:
 * - q: Search query (required)
 * - limit: Number of results (default: 20, max: 50)
 * - offset: Pagination offset (default: 0)
 */
async function getHandler(
  request: AuthenticatedRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const userId = request.user.id;
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameters
  const queryParams = {
    q: searchParams.get("q") || "",
    limit: searchParams.get("limit") || "20",
    offset: searchParams.get("offset") || "0",
  };

  // Validate
  const validation = SearchQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequestResponse(
      errors.q?.[0] || "Invalid query parameters",
      "VALIDATION_ERROR",
      { errors },
    );
  }

  const { q, limit, offset } = validation.data;

  try {
    const results = await profileService.searchProfiles(q, {
      limit,
      offset,
      viewerId: userId,
    });

    return successResponse({
      query: q,
      results,
      pagination: {
        limit,
        offset,
        count: results.length,
        hasMore: results.length === limit,
      },
    });
  } catch (error) {
    logger.error("[UserSearch] Error searching users:", error);
    return errorResponse("Failed to search users", "INTERNAL_ERROR", 500);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const GET = compose(
  withErrorHandler,
  withRateLimit({ limit: 60, window: 60 }),
  withAuth,
)(getHandler);
