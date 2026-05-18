/**
 * Message Pin API Route
 *
 * Handles pin/unpin operations on a specific message.
 *
 * POST /api/messages/[id]/pin - Pin message
 * DELETE /api/messages/[id]/pin - Unpin message
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getMessageService } from "@/services/messages/message.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PinMessageSchema = z.object({
  channelId: z.string().uuid("Invalid channel ID"),
  userId: z.string().uuid("Invalid user ID"),
});

const UnpinMessageSchema = z.object({
  channelId: z.string().uuid("Invalid channel ID"),
});

// ============================================================================
// SERVICES
// ============================================================================

const messageService = getMessageService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// POST /api/messages/[id]/pin - Pin message
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("POST /api/messages/[id]/pin - Pin message", { messageId });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = PinMessageSchema.safeParse(body);
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

    const data = validation.data;

    const result = await messageService.pinMessage(
      messageId,
      data.channelId,
      data.userId,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to pin message",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("POST /api/messages/[id]/pin - Message pinned", {
      messageId,
      channelId: data.channelId,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/messages/[id]/pin - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to pin message",
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
// DELETE /api/messages/[id]/pin - Unpin message
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("DELETE /api/messages/[id]/pin - Unpin message", { messageId });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    // Get channelId from query params or body
    const searchParams = request.nextUrl.searchParams;
    let channelId = searchParams.get("channelId");

    // Also support body for DELETE
    if (!channelId) {
      try {
        const body = await request.json();
        channelId = body.channelId;
      } catch {
        // Body parsing failed, continue with query params
      }
    }

    // Validate
    const validation = UnpinMessageSchema.safeParse({ channelId });
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    const result = await messageService.unpinMessage(messageId, data.channelId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to unpin message",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("DELETE /api/messages/[id]/pin - Message unpinned", {
      messageId,
      channelId: data.channelId,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error("DELETE /api/messages/[id]/pin - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to unpin message",
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
// GET /api/messages/[id]/pin - Get pin status
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("GET /api/messages/[id]/pin - Get pin status", { messageId });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    // Get message to check pin status
    const result = await messageService.getMessage(messageId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to get message",
        },
        { status: result.error?.status || 500 },
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      isPinned: result.data.isPinned || false,
      messageId,
    });
  } catch (error) {
    logger.error("GET /api/messages/[id]/pin - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get pin status",
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
