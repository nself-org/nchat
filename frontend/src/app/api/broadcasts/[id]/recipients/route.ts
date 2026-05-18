/**
 * Broadcast Recipients API Route
 *
 * Handles recipient management for broadcast lists.
 *
 * GET /api/broadcasts/[id]/recipients - List recipients
 * POST /api/broadcasts/[id]/recipients - Add recipients
 * DELETE /api/broadcasts/[id]/recipients - Remove recipients
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

const ModifyRecipientsSchema = z.object({
  recipientIds: z
    .array(z.string().uuid("Each recipient ID must be a valid UUID"))
    .min(1, "At least one recipient ID is required")
    .max(
      MAX_RECIPIENTS_PER_LIST,
      `Maximum ${MAX_RECIPIENTS_PER_LIST} recipients can be modified at once`,
    ),
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
// GET /api/broadcasts/[id]/recipients - List recipients
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info(
      "GET /api/broadcasts/[id]/recipients - List recipients request",
      { listId: id },
    );

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

    // Get list with recipients
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

    logger.info("GET /api/broadcasts/[id]/recipients - Success", {
      listId: id,
      recipientCount: result.recipients.length,
    });

    return NextResponse.json({
      success: true,
      recipients: result.recipients,
      total: result.recipients.length,
      maxAllowed: MAX_RECIPIENTS_PER_LIST,
      canAddMore: result.recipients.length < MAX_RECIPIENTS_PER_LIST,
      remainingSlots: MAX_RECIPIENTS_PER_LIST - result.recipients.length,
    });
  } catch (error) {
    const { id } = await params;
    logger.error(
      "GET /api/broadcasts/[id]/recipients - Error",
      error as Error,
      { listId: id },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch recipients",
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
// POST /api/broadcasts/[id]/recipients - Add recipients
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info(
      "POST /api/broadcasts/[id]/recipients - Add recipients request",
      { listId: id },
    );

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
    const validation = ModifyRecipientsSchema.safeParse(body);
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

    const { recipientIds } = validation.data;

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
        { success: false, error: "Only the list owner can modify recipients" },
        { status: 403 },
      );
    }

    // Check if adding would exceed limit
    const newTotal = new Set([...existingList.recipientIds, ...recipientIds])
      .size;
    if (newTotal > MAX_RECIPIENTS_PER_LIST) {
      const canAdd = MAX_RECIPIENTS_PER_LIST - existingList.recipientCount;
      return NextResponse.json(
        {
          success: false,
          error:
            `Cannot add ${recipientIds.length} recipients. Maximum ${MAX_RECIPIENTS_PER_LIST} recipients allowed. ` +
            `Current: ${existingList.recipientCount}, Can add: ${canAdd}`,
        },
        { status: 400 },
      );
    }

    // Filter out owner from recipients
    const filteredRecipientIds = recipientIds.filter((rid) => rid !== userId);
    if (filteredRecipientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot add yourself as a recipient" },
        { status: 400 },
      );
    }

    // Add recipients
    const list = await broadcastService.addRecipients(id, filteredRecipientIds);

    const addedCount = list.recipientCount - existingList.recipientCount;

    logger.info("POST /api/broadcasts/[id]/recipients - Recipients added", {
      listId: id,
      requestedCount: filteredRecipientIds.length,
      addedCount,
      newTotal: list.recipientCount,
    });

    return NextResponse.json({
      success: true,
      list,
      addedCount,
      message: `${addedCount} recipient(s) added successfully`,
    });
  } catch (error) {
    const { id } = await params;
    logger.error(
      "POST /api/broadcasts/[id]/recipients - Error",
      error as Error,
      { listId: id },
    );

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
        error: "Failed to add recipients",
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
// DELETE /api/broadcasts/[id]/recipients - Remove recipients
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info(
      "DELETE /api/broadcasts/[id]/recipients - Remove recipients request",
      {
        listId: id,
      },
    );

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
    const validation = ModifyRecipientsSchema.safeParse(body);
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

    const { recipientIds } = validation.data;

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
        { success: false, error: "Only the list owner can modify recipients" },
        { status: 403 },
      );
    }

    // Remove recipients
    const list = await broadcastService.removeRecipients(id, recipientIds);

    const removedCount = existingList.recipientCount - list.recipientCount;

    logger.info("DELETE /api/broadcasts/[id]/recipients - Recipients removed", {
      listId: id,
      requestedCount: recipientIds.length,
      removedCount,
      remainingCount: list.recipientCount,
    });

    return NextResponse.json({
      success: true,
      list,
      removedCount,
      message: `${removedCount} recipient(s) removed successfully`,
    });
  } catch (error) {
    const { id } = await params;
    logger.error(
      "DELETE /api/broadcasts/[id]/recipients - Error",
      error as Error,
      { listId: id },
    );
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove recipients",
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
