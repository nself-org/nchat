/**
 * Broadcasts API Route
 *
 * Handles CRUD operations for broadcast lists.
 *
 * GET /api/broadcasts - List user's broadcast lists
 * POST /api/broadcasts - Create a new broadcast list
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import {
  createBroadcastService,
  MAX_RECIPIENTS_PER_LIST,
} from "@/services/broadcasts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateBroadcastListSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim(),
  recipientIds: z
    .array(z.string().uuid("Each recipient ID must be a valid UUID"))
    .min(1, "At least one recipient is required")
    .max(
      MAX_RECIPIENTS_PER_LIST,
      `Maximum ${MAX_RECIPIENTS_PER_LIST} recipients allowed`,
    ),
});

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user ID from request headers (set by auth middleware)
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  // Check x-user-id header (set by middleware)
  const userId = request.headers.get("x-user-id");
  if (userId) return userId;

  // Check session cookie
  const sessionCookie =
    request.cookies.get("nchat-session")?.value ||
    request.cookies.get("nhostSession")?.value ||
    request.cookies.get("nchat-dev-session")?.value;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      return parsed.userId || parsed.sub || null;
    } catch {
      return null;
    }
  }

  // Check Bearer token
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
      return null;
    }
  }

  return null;
}

// ============================================================================
// GET /api/broadcasts - List broadcast lists
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/broadcasts - List broadcast lists request");

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    const validation = ListQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { limit, offset } = validation.data;

    const broadcastService = createBroadcastService(apolloClient);

    const result = await broadcastService.getBroadcastLists(
      userId,
      limit,
      offset,
    );

    logger.info("GET /api/broadcasts - Success", {
      total: result.total,
      returned: result.lists.length,
      offset,
      limit,
    });

    return NextResponse.json({
      success: true,
      lists: result.lists,
      pagination: {
        total: result.total,
        offset,
        limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    logger.error("GET /api/broadcasts - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch broadcast lists",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST /api/broadcasts - Create broadcast list
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/broadcasts - Create broadcast list request");

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = CreateBroadcastListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, recipientIds } = validation.data;

    const broadcastService = createBroadcastService(apolloClient);

    const list = await broadcastService.createBroadcastList(
      { name, recipientIds },
      userId,
    );

    logger.info("POST /api/broadcasts - Broadcast list created", {
      listId: list.id,
      name: list.name,
      recipientCount: list.recipientCount,
      ownerId: userId,
    });

    return NextResponse.json(
      {
        success: true,
        list,
        message: "Broadcast list created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/broadcasts - Error", error as Error);

    // Handle specific errors
    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "Maximum",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create broadcast list",
        message:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
