/**
 * Bookmark Message API Route
 *
 * POST /api/messages/[id]/bookmark - Bookmark a message
 * DELETE /api/messages/[id]/bookmark - Remove bookmark
 * PATCH /api/messages/[id]/bookmark - Update bookmark
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type { Bookmark } from "@/types/bookmark";

// In-memory store for demo (would be database in production)
const bookmarks = new Map<string, Bookmark>();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST - Bookmark a message
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;
    const body = await request.json();

    const { note, collectionIds = [], tags = [] } = body;

    // Check if already bookmarked
    const existingBookmark = Array.from(bookmarks.values()).find(
      (b) => b.messageId === messageId,
    );
    if (existingBookmark) {
      return NextResponse.json(
        { success: false, error: "Message is already bookmarked" },
        { status: 409 },
      );
    }

    // Validate note length
    if (note && note.length > 500) {
      return NextResponse.json(
        { success: false, error: "Note cannot exceed 500 characters" },
        { status: 400 },
      );
    }

    // Validate tags
    if (tags.length > 20) {
      return NextResponse.json(
        { success: false, error: "Cannot have more than 20 tags" },
        { status: 400 },
      );
    }

    // Create bookmark
    const bookmark: Bookmark = {
      id: `bookmark-${Date.now()}-${randomBytes(5).toString("hex")}`,
      messageId,
      userId: "current-user-id", // Would come from auth
      bookmarkedAt: new Date(),
      note,
      collectionIds,
      tags,
      message: {} as any, // Would be fetched from database
    };

    bookmarks.set(bookmark.id, bookmark);

    return NextResponse.json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    console.error("Error bookmarking message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bookmark message" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Remove bookmark
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;

    // Find the bookmark by message ID
    const bookmarkEntry = Array.from(bookmarks.entries()).find(
      ([, bookmark]) => bookmark.messageId === messageId,
    );

    if (!bookmarkEntry) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 },
      );
    }

    bookmarks.delete(bookmarkEntry[0]);

    return NextResponse.json({
      success: true,
      data: { messageId },
    });
  } catch (error) {
    console.error("Error removing bookmark:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove bookmark" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update bookmark
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;
    const body = await request.json();

    const { note, collectionIds, tags } = body;

    // Find the bookmark by message ID
    const bookmarkEntry = Array.from(bookmarks.entries()).find(
      ([, bookmark]) => bookmark.messageId === messageId,
    );

    if (!bookmarkEntry) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 },
      );
    }

    const [bookmarkId, existingBookmark] = bookmarkEntry;

    // Validate note length
    if (note !== undefined && note.length > 500) {
      return NextResponse.json(
        { success: false, error: "Note cannot exceed 500 characters" },
        { status: 400 },
      );
    }

    // Validate tags
    if (tags && tags.length > 20) {
      return NextResponse.json(
        { success: false, error: "Cannot have more than 20 tags" },
        { status: 400 },
      );
    }

    // Update the bookmark
    const updatedBookmark: Bookmark = {
      ...existingBookmark,
      ...(note !== undefined && { note }),
      ...(collectionIds !== undefined && { collectionIds }),
      ...(tags !== undefined && { tags }),
    };

    bookmarks.set(bookmarkId, updatedBookmark);

    return NextResponse.json({
      success: true,
      data: updatedBookmark,
    });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update bookmark" },
      { status: 500 },
    );
  }
}

/**
 * GET - Get bookmark status for a message
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: messageId } = await params;

    const bookmark = Array.from(bookmarks.values()).find(
      (b) => b.messageId === messageId,
    );

    if (!bookmark) {
      return NextResponse.json({
        success: true,
        data: { isBookmarked: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isBookmarked: true,
        bookmark,
      },
    });
  } catch (error) {
    console.error("Error getting bookmark status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get bookmark status" },
      { status: 500 },
    );
  }
}
