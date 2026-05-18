/**
 * Channel Read API Route
 *
 * Marks all messages in a channel as read for a user.
 *
 * POST /api/channels/[id]/read - Mark all messages in channel as read
 * GET /api/channels/[id]/read - Get unread count for channel
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getReceiptService } from "@/services/messages/receipt.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const MarkChannelReadSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

// ============================================================================
// SERVICES
// ============================================================================

const receiptService = getReceiptService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// GET /api/channels/[id]/read - Get unread count
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    logger.info("GET /api/channels/[id]/read - Get unread count", {
      channelId,
      userId,
    });

    if (!validateUUID(channelId)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    if (!userId || !validateUUID(userId)) {
      return NextResponse.json(
        { success: false, error: "Valid userId query parameter required" },
        { status: 400 },
      );
    }

    const result = await receiptService.getUnreadCount(channelId, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to get unread count",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("GET /api/channels/[id]/read - Success", {
      channelId,
      userId,
      unreadCount: result.data?.count,
    });

    return NextResponse.json({
      success: true,
      channelId,
      userId,
      unreadCount: result.data?.count || 0,
    });
  } catch (error) {
    logger.error("GET /api/channels/[id]/read - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get unread count",
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
// POST /api/channels/[id]/read - Mark channel as read
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await params;

    logger.info("POST /api/channels/[id]/read - Mark channel as read", {
      channelId,
    });

    if (!validateUUID(channelId)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = MarkChannelReadSchema.safeParse(body);
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

    const { userId } = validation.data;

    const result = await receiptService.markChannelRead(channelId, userId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to mark channel as read",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("POST /api/channels/[id]/read - Success", {
      channelId,
      userId,
      affectedRows: result.data?.affectedRows,
    });

    return NextResponse.json({
      success: true,
      channelId,
      userId,
      affectedRows: result.data?.affectedRows,
      lastReadAt: result.data?.lastReadAt,
    });
  } catch (error) {
    logger.error("POST /api/channels/[id]/read - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to mark channel as read",
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
