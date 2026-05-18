/**
 * Message Reactions API Route
 *
 * Handles reaction operations on a specific message.
 *
 * GET /api/messages/[id]/reactions - Get reactions for a message
 * POST /api/messages/[id]/reactions - Add a reaction
 * DELETE /api/messages/[id]/reactions - Remove a reaction
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import { getReactionService } from "@/services/messages/reaction.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const AddReactionSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  emoji: z.string().min(1).max(50, "Emoji too long"),
});

const RemoveReactionSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  emoji: z.string().min(1).max(50, "Emoji too long"),
});

// ============================================================================
// SERVICES
// ============================================================================

const reactionService = getReactionService(apolloClient);

// ============================================================================
// HELPERS
// ============================================================================

function validateUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// GET /api/messages/[id]/reactions - Get message reactions
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("GET /api/messages/[id]/reactions - Get reactions", {
      messageId,
    });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const result = await reactionService.getMessageReactions(messageId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to fetch reactions",
        },
        { status: result.error?.status || 500 },
      );
    }

    return NextResponse.json({
      success: true,
      reactions: result.data || [],
    });
  } catch (error) {
    logger.error("GET /api/messages/[id]/reactions - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reactions",
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
// POST /api/messages/[id]/reactions - Add reaction
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("POST /api/messages/[id]/reactions - Add reaction", {
      messageId,
    });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = AddReactionSchema.safeParse(body);
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

    const result = await reactionService.addReaction({
      messageId,
      userId: data.userId,
      emoji: data.emoji,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to add reaction",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("POST /api/messages/[id]/reactions - Reaction added", {
      messageId,
      emoji: data.emoji,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("POST /api/messages/[id]/reactions - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add reaction",
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
// DELETE /api/messages/[id]/reactions - Remove reaction
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("DELETE /api/messages/[id]/reactions - Remove reaction", {
      messageId,
    });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    // Get userId and emoji from query params or body
    const searchParams = request.nextUrl.searchParams;
    let userId = searchParams.get("userId");
    let emoji = searchParams.get("emoji");

    // Also support body for DELETE
    if (!userId || !emoji) {
      try {
        const body = await request.json();
        userId = userId || body.userId;
        emoji = emoji || body.emoji;
      } catch {
        // Body parsing failed, continue with query params
      }
    }

    // Validate
    const validation = RemoveReactionSchema.safeParse({ userId, emoji });
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

    const result = await reactionService.removeReaction({
      messageId,
      userId: data.userId,
      emoji: data.emoji,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to remove reaction",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("DELETE /api/messages/[id]/reactions - Reaction removed", {
      messageId,
      emoji: data.emoji,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error("DELETE /api/messages/[id]/reactions - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove reaction",
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
// PATCH /api/messages/[id]/reactions - Toggle reaction
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await params;

    logger.info("PATCH /api/messages/[id]/reactions - Toggle reaction", {
      messageId,
    });

    if (!validateUUID(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message ID format" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = AddReactionSchema.safeParse(body);
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

    const result = await reactionService.toggleReaction(
      messageId,
      data.userId,
      data.emoji,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || "Failed to toggle reaction",
        },
        { status: result.error?.status || 500 },
      );
    }

    logger.info("PATCH /api/messages/[id]/reactions - Reaction toggled", {
      messageId,
      emoji: data.emoji,
      action: result.data?.action,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error("PATCH /api/messages/[id]/reactions - Error", error as Error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to toggle reaction",
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
