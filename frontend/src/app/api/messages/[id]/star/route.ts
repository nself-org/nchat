/**
 * Star Message API Route
 *
 * POST /api/messages/[id]/star - Star a message
 * DELETE /api/messages/[id]/star - Unstar a message
 * PATCH /api/messages/[id]/star - Update star settings
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type { StarColor, StarPriority, StarredMessage } from "@/lib/stars";
import { STAR_COLORS, starManager } from "@/lib/stars";

// In-memory store for demo (would be database in production)
const starredMessages = new Map<string, StarredMessage>();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST - Star a message
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;
    const body = await request.json();

    const {
      channelId,
      color = "yellow" as StarColor,
      priority,
      note,
      quickAccess = false,
      category,
    } = body;

    // Validate input
    const validation = starManager.validateStarInput({
      messageId,
      channelId,
      color,
      note,
      quickAccess,
      category,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 },
      );
    }

    // Check if already starred
    const existingKey = Array.from(starredMessages.keys()).find(
      (key) => starredMessages.get(key)?.messageId === messageId,
    );
    if (existingKey) {
      return NextResponse.json(
        { success: false, error: "Message is already starred" },
        { status: 409 },
      );
    }

    // Create starred message
    const starredMessage: StarredMessage = {
      id: `star-${Date.now()}-${randomBytes(5).toString("hex")}`,
      userId: "current-user-id", // Would come from auth
      messageId,
      channelId,
      starredAt: new Date(),
      message: {} as any, // Would be fetched from database
      color,
      priority: priority ?? starManager.getPriorityForColor(color),
      note,
      quickAccess,
      category,
    };

    starredMessages.set(starredMessage.id, starredMessage);

    return NextResponse.json({
      success: true,
      data: starredMessage,
    });
  } catch (error) {
    console.error("Error starring message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to star message" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Unstar a message
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;

    // Find the star by message ID
    const starEntry = Array.from(starredMessages.entries()).find(
      ([, star]) => star.messageId === messageId,
    );

    if (!starEntry) {
      return NextResponse.json(
        { success: false, error: "Star not found" },
        { status: 404 },
      );
    }

    starredMessages.delete(starEntry[0]);

    return NextResponse.json({
      success: true,
      data: { messageId },
    });
  } catch (error) {
    console.error("Error unstarring message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unstar message" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update star settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;
    const body = await request.json();

    const { color, priority, note, quickAccess, category } = body;

    // Find the star by message ID
    const starEntry = Array.from(starredMessages.entries()).find(
      ([, star]) => star.messageId === messageId,
    );

    if (!starEntry) {
      return NextResponse.json(
        { success: false, error: "Star not found" },
        { status: 404 },
      );
    }

    const [starId, existingStar] = starEntry;

    // Validate color if provided
    if (color && !STAR_COLORS[color as StarColor]) {
      return NextResponse.json(
        { success: false, error: "Invalid star color" },
        { status: 400 },
      );
    }

    // Update the star
    const updatedStar: StarredMessage = {
      ...existingStar,
      ...(color !== undefined && { color }),
      ...(priority !== undefined && { priority }),
      ...(note !== undefined && { note }),
      ...(quickAccess !== undefined && { quickAccess }),
      ...(category !== undefined && { category }),
    };

    // If color changed but priority wasn't explicitly set, update priority
    if (color && priority === undefined) {
      updatedStar.priority = starManager.getPriorityForColor(color);
    }

    starredMessages.set(starId, updatedStar);

    return NextResponse.json({
      success: true,
      data: updatedStar,
    });
  } catch (error) {
    console.error("Error updating star:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update star" },
      { status: 500 },
    );
  }
}

/**
 * GET - Get star status for a message
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;

    const star = Array.from(starredMessages.values()).find(
      (s) => s.messageId === messageId,
    );

    if (!star) {
      return NextResponse.json({
        success: true,
        data: { isStarred: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isStarred: true,
        star,
      },
    });
  } catch (error) {
    console.error("Error getting star status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get star status" },
      { status: 500 },
    );
  }
}
