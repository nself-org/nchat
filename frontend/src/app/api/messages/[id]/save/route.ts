/**
 * Save Message API Route
 *
 * POST /api/messages/[id]/save - Save a message
 * DELETE /api/messages/[id]/save - Unsave a message
 * PATCH /api/messages/[id]/save - Update saved message settings
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type { SavedMessage } from "@/lib/saved";
import { savedManager } from "@/lib/saved";

// In-memory store for demo (would be database in production)
const savedMessages = new Map<string, SavedMessage>();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST - Save a message
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;
    const body = await request.json();

    const {
      channelId,
      note,
      collectionIds = [],
      tags = [],
      isStarred = false,
      reminderAt,
    } = body;

    // Validate input
    const validation = savedManager.validateSaveInput({
      messageId,
      channelId,
      note,
      collectionIds,
      tags,
      isStarred,
      reminderAt: reminderAt ? new Date(reminderAt) : undefined,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 },
      );
    }

    // Check if already saved
    const existingSaved = Array.from(savedMessages.values()).find(
      (s) => s.messageId === messageId,
    );
    if (existingSaved) {
      return NextResponse.json(
        { success: false, error: "Message is already saved" },
        { status: 409 },
      );
    }

    // Create saved message
    const savedMessage: SavedMessage = {
      id: `saved-${Date.now()}-${randomBytes(5).toString("hex")}`,
      userId: "current-user-id", // Would come from auth
      messageId,
      channelId,
      collectionIds,
      savedAt: new Date(),
      message: {} as any, // Would be fetched from database
      note,
      tags,
      isStarred,
      reminderAt: reminderAt ? new Date(reminderAt) : undefined,
      reminderTriggered: false,
    };

    savedMessages.set(savedMessage.id, savedMessage);

    return NextResponse.json({
      success: true,
      data: savedMessage,
    });
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save message" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Unsave a message
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;

    // Find the saved message by message ID
    const savedEntry = Array.from(savedMessages.entries()).find(
      ([, saved]) => saved.messageId === messageId,
    );

    if (!savedEntry) {
      return NextResponse.json(
        { success: false, error: "Saved message not found" },
        { status: 404 },
      );
    }

    savedMessages.delete(savedEntry[0]);

    return NextResponse.json({
      success: true,
      data: { messageId },
    });
  } catch (error) {
    console.error("Error unsaving message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unsave message" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update saved message settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;
    const body = await request.json();

    const { note, tags, isStarred, reminderAt } = body;

    // Find the saved message by message ID
    const savedEntry = Array.from(savedMessages.entries()).find(
      ([, saved]) => saved.messageId === messageId,
    );

    if (!savedEntry) {
      return NextResponse.json(
        { success: false, error: "Saved message not found" },
        { status: 404 },
      );
    }

    const [savedId, existingSaved] = savedEntry;

    // Validate updates
    if (note !== undefined && note.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Note cannot exceed 1000 characters" },
        { status: 400 },
      );
    }

    if (tags && tags.length > 20) {
      return NextResponse.json(
        { success: false, error: "Cannot have more than 20 tags" },
        { status: 400 },
      );
    }

    if (reminderAt) {
      const reminderDate = new Date(reminderAt);
      if (reminderDate < new Date()) {
        return NextResponse.json(
          { success: false, error: "Reminder date must be in the future" },
          { status: 400 },
        );
      }
    }

    // Update the saved message
    const updatedSaved: SavedMessage = {
      ...existingSaved,
      ...(note !== undefined && { note }),
      ...(tags !== undefined && { tags }),
      ...(isStarred !== undefined && { isStarred }),
      ...(reminderAt !== undefined && {
        reminderAt: reminderAt ? new Date(reminderAt) : undefined,
        reminderTriggered: false,
      }),
    };

    savedMessages.set(savedId, updatedSaved);

    return NextResponse.json({
      success: true,
      data: updatedSaved,
    });
  } catch (error) {
    console.error("Error updating saved message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update saved message" },
      { status: 500 },
    );
  }
}

/**
 * GET - Get save status for a message
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;

    const saved = Array.from(savedMessages.values()).find(
      (s) => s.messageId === messageId,
    );

    if (!saved) {
      return NextResponse.json({
        success: true,
        data: { isSaved: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isSaved: true,
        saved,
      },
    });
  } catch (error) {
    console.error("Error getting save status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get save status" },
      { status: 500 },
    );
  }
}
