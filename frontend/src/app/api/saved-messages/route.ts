/**
 * Saved Messages API Route
 *
 * GET /api/saved-messages - Get all saved messages for current user
 * This serves as the "Saved Messages" self-chat channel (Telegram-style)
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type {
  SavedMessage,
  SavedFilters,
  SavedSortBy,
  SavedSortOrder,
} from "@/lib/saved";
import { filterSavedMessages, sortSavedMessages } from "@/lib/saved";

// In-memory store for demo (would be database in production)
// This would be shared with the save route in production
const savedMessages = new Map<string, SavedMessage>();

// Add some demo data
function getSeedData(): SavedMessage[] {
  const now = new Date();
  return [
    {
      id: "saved-1",
      userId: "current-user-id",
      messageId: "msg-1",
      channelId: "channel-1",
      collectionIds: ["collection-1"],
      savedAt: new Date(now.getTime() - 86400000), // Yesterday
      message: {
        id: "msg-1",
        content: "Important meeting notes from today",
        type: "text",
        createdAt: new Date(now.getTime() - 86400000 * 2),
        userId: "user-1",
        user: {
          id: "user-1",
          displayName: "Alice",
          username: "alice",
        },
        channelId: "channel-1",
      } as any,
      note: "Review before next meeting",
      tags: ["meeting", "important"],
      isStarred: true,
      reminderAt: new Date(now.getTime() + 86400000), // Tomorrow
      reminderTriggered: false,
    },
    {
      id: "saved-2",
      userId: "current-user-id",
      messageId: "msg-2",
      channelId: "channel-2",
      collectionIds: [],
      savedAt: new Date(now.getTime() - 3600000), // 1 hour ago
      message: {
        id: "msg-2",
        content: "Code snippet for API integration",
        type: "code",
        createdAt: new Date(now.getTime() - 86400000),
        userId: "user-2",
        user: {
          id: "user-2",
          displayName: "Bob",
          username: "bob",
        },
        channelId: "channel-2",
      } as any,
      note: "",
      tags: ["code", "api"],
      isStarred: false,
    },
    {
      id: "saved-3",
      userId: "current-user-id",
      messageId: "msg-3",
      channelId: "channel-1",
      collectionIds: ["collection-1", "collection-2"],
      savedAt: new Date(now.getTime() - 7200000), // 2 hours ago
      message: {
        id: "msg-3",
        content: "Project deadline reminder: Feb 15th",
        type: "text",
        createdAt: new Date(now.getTime() - 86400000 * 3),
        userId: "user-3",
        user: {
          id: "user-3",
          displayName: "Charlie",
          username: "charlie",
        },
        channelId: "channel-1",
      } as any,
      tags: ["deadline", "project"],
      isStarred: true,
    },
  ];
}

/**
 * GET - Get all saved messages for current user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const collectionId = searchParams.get("collectionId");
    const channelId = searchParams.get("channelId");
    const starredOnly = searchParams.get("starredOnly") === "true";
    const hasReminder = searchParams.get("hasReminder") === "true";
    const searchQuery = searchParams.get("q");
    const sortBy = (searchParams.get("sortBy") as SavedSortBy) ?? "savedAt";
    const sortOrder =
      (searchParams.get("sortOrder") as SavedSortOrder) ?? "desc";
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);

    // Get saved messages (use seed data if store is empty)
    let messages =
      savedMessages.size > 0
        ? Array.from(savedMessages.values())
        : getSeedData();

    // Build filters
    const filters: SavedFilters = {
      ...(collectionId && { collectionId }),
      ...(channelId && { channelId }),
      ...(starredOnly && { starredOnly: true }),
      ...(hasReminder && { hasReminder: true }),
      ...(searchQuery && { searchQuery }),
      ...(tags && { tags }),
    };

    // Apply filters
    if (Object.keys(filters).length > 0) {
      messages = filterSavedMessages(messages, filters);
    }

    // Sort
    messages = sortSavedMessages(messages, sortBy, sortOrder);

    // Get total count before pagination
    const totalCount = messages.length;

    // Apply pagination
    const paginatedMessages = messages.slice(offset, offset + limit);

    // Calculate statistics
    const stats = {
      totalSaved: messages.length,
      totalStarred: messages.filter((m) => m.isStarred).length,
      totalWithReminders: messages.filter((m) => m.reminderAt).length,
      pendingReminders: messages.filter(
        (m) =>
          m.reminderAt && !m.reminderTriggered && m.reminderAt > new Date(),
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        messages: paginatedMessages,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching saved messages:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch saved messages" },
      { status: 500 },
    );
  }
}

/**
 * POST - Create a new saved message (for Saved Messages self-chat)
 * This allows users to write directly to their Saved Messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { content, note, tags = [], attachments = [] } = body;

    if (!content && attachments.length === 0) {
      return NextResponse.json(
        { success: false, error: "Content or attachments required" },
        { status: 400 },
      );
    }

    // Create a new message in the "Saved Messages" self-chat
    const messageId = `self-msg-${Date.now()}-${randomBytes(5).toString("hex")}`;
    const savedId = `saved-${Date.now()}-${randomBytes(5).toString("hex")}`;

    const savedMessage: SavedMessage = {
      id: savedId,
      userId: "current-user-id",
      messageId,
      channelId: "saved-messages", // Special channel ID for self-chat
      collectionIds: [],
      savedAt: new Date(),
      message: {
        id: messageId,
        content,
        type: "text",
        createdAt: new Date(),
        userId: "current-user-id",
        user: {
          id: "current-user-id",
          displayName: "You",
          username: "me",
        },
        channelId: "saved-messages",
        attachments,
      } as any,
      note,
      tags,
      isStarred: false,
    };

    savedMessages.set(savedId, savedMessage);

    return NextResponse.json({
      success: true,
      data: savedMessage,
    });
  } catch (error) {
    console.error("Error creating saved message:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create saved message" },
      { status: 500 },
    );
  }
}
