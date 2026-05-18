/**
 * Single Broadcast List API Route
 *
 * Handles operations on a specific broadcast list.
 *
 * GET /api/broadcasts/[id] - Get broadcast list details
 * PATCH /api/broadcasts/[id] - Update broadcast list
 * DELETE /api/broadcasts/[id] - Delete broadcast list
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

const UpdateBroadcastListSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim()
    .optional(),
  recipientIds: z
    .array(z.string().uuid("Each recipient ID must be a valid UUID"))
    .min(1, "At least one recipient is required")
    .max(
      MAX_RECIPIENTS_PER_LIST,
      `Maximum ${MAX_RECIPIENTS_PER_LIST} recipients allowed`,
    )
    .optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user ID from request headers (set by auth middleware)
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get("x-user-id");
  if (userId) return userId;

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

/**
 * Validate broadcast list ID format
 */
function validateListId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// GET /api/broadcasts/[id] - Get broadcast list details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("GET /api/broadcasts/[id] - Get broadcast list request", {
      listId: id,
    });

    // Validate list ID format
    if (!validateListId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid broadcast list ID format" },
        { status: 400 },
      );
    }

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const broadcastService = createBroadcastService(apolloClient);

    // Check if should include recipient details
    const includeRecipients =
      request.nextUrl.searchParams.get("includeRecipients") === "true";

    if (includeRecipients) {
      const result = await broadcastService.getBroadcastListWithRecipients(id);

      if (!result) {
        return NextResponse.json(
          { success: false, error: "Broadcast list not found" },
          { status: 404 },
        );
      }

      // Verify ownership
      if (result.list.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 },
        );
      }

      logger.info("GET /api/broadcasts/[id] - Success (with recipients)", {
        listId: id,
        recipientCount: result.recipients.length,
      });

      return NextResponse.json({
        success: true,
        list: result.list,
        recipients: result.recipients,
      });
    } else {
      const list = await broadcastService.getBroadcastList(id);

      if (!list) {
        return NextResponse.json(
          { success: false, error: "Broadcast list not found" },
          { status: 404 },
        );
      }

      // Verify ownership
      if (list.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Access denied" },
          { status: 403 },
        );
      }

      logger.info("GET /api/broadcasts/[id] - Success", { listId: id });

      return NextResponse.json({
        success: true,
        list,
      });
    }
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/broadcasts/[id] - Error", error as Error, {
      listId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch broadcast list",
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
// PATCH /api/broadcasts/[id] - Update broadcast list
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("PATCH /api/broadcasts/[id] - Update broadcast list request", {
      listId: id,
    });

    // Validate list ID format
    if (!validateListId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid broadcast list ID format" },
        { status: 400 },
      );
    }

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
    const validation = UpdateBroadcastListSchema.safeParse(body);
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

    const updates = validation.data;

    // Check if there are any updates
    if (!updates.name && !updates.recipientIds) {
      return NextResponse.json(
        { success: false, error: "No updates provided" },
        { status: 400 },
      );
    }

    const broadcastService = createBroadcastService(apolloClient);

    // Verify ownership
    const existingList = await broadcastService.getBroadcastList(id);
    if (!existingList) {
      return NextResponse.json(
        { success: false, error: "Broadcast list not found" },
        { status: 404 },
      );
    }

    if (existingList.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the list owner can update it" },
        { status: 403 },
      );
    }

    // Update the list
    const list = await broadcastService.updateBroadcastList(id, updates);

    logger.info("PATCH /api/broadcasts/[id] - Broadcast list updated", {
      listId: id,
      updatedBy: userId,
      updates: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      list,
      message: "Broadcast list updated successfully",
    });
  } catch (error) {
    const { id } = await params;
    logger.error("PATCH /api/broadcasts/[id] - Error", error as Error, {
      listId: id,
    });

    if (
      error instanceof Error &&
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

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update broadcast list",
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
// DELETE /api/broadcasts/[id] - Delete broadcast list
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("DELETE /api/broadcasts/[id] - Delete broadcast list request", {
      listId: id,
    });

    // Validate list ID format
    if (!validateListId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid broadcast list ID format" },
        { status: 400 },
      );
    }

    // Get user from auth
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const broadcastService = createBroadcastService(apolloClient);

    // Verify ownership
    const existingList = await broadcastService.getBroadcastList(id);
    if (!existingList) {
      return NextResponse.json(
        { success: false, error: "Broadcast list not found" },
        { status: 404 },
      );
    }

    if (existingList.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the list owner can delete it" },
        { status: 403 },
      );
    }

    // Delete the list
    const deleted = await broadcastService.deleteBroadcastList(id);

    logger.info("DELETE /api/broadcasts/[id] - Broadcast list deleted", {
      listId: id,
      listName: deleted.name,
      deletedBy: userId,
    });

    return NextResponse.json({
      success: true,
      message: "Broadcast list deleted successfully",
      listId: deleted.id,
      listName: deleted.name,
    });
  } catch (error) {
    const { id } = await params;
    logger.error("DELETE /api/broadcasts/[id] - Error", error as Error, {
      listId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete broadcast list",
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
