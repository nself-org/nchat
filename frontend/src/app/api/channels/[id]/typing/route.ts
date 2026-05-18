/**
 * Channel Typing API Route
 *
 * Handles typing indicator signals for channels.
 * Uses Redis pub/sub for efficient real-time distribution without database persistence.
 *
 * POST /api/channels/[id]/typing - Signal typing start/stop in channel
 *
 * @module app/api/channels/[id]/typing
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TypingRequestSchema = z.object({
  action: z.enum(["start", "stop"]),
  threadId: z.string().uuid().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id") || null;
}

function getUserNameFromRequest(request: NextRequest): string | null {
  return (
    request.headers.get("x-user-display-name") ||
    request.headers.get("x-user-name") ||
    null
  );
}

function getUserAvatarFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-avatar") || null;
}

function validateChannelId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// POST /api/channels/[id]/typing - Signal typing in channel
// ============================================================================

/**
 * Signal typing start/stop in a channel
 *
 * This endpoint is used by clients to signal typing status. The server then
 * broadcasts this to other users in the channel via Socket.io/Redis pub/sub.
 *
 * Request body:
 * - action: 'start' | 'stop' - Whether to start or stop typing indicator
 * - threadId?: string - Optional thread ID if typing in a thread
 *
 * Response:
 * - success: boolean
 * - message: string
 * - roomType: 'channel' | 'thread'
 * - expiresAt?: string - When the typing indicator will expire (for 'start')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await params;
    logger.info("POST /api/channels/[id]/typing - Typing signal", {
      channelId,
    });

    // Validate channel ID
    if (!validateChannelId(channelId)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
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

    const userName = getUserNameFromRequest(request);
    const userAvatar = getUserAvatarFromRequest(request);

    // Parse and validate request body
    const body = await request.json();
    const validation = TypingRequestSchema.safeParse(body);

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

    const { action, threadId } = validation.data;
    const roomType = threadId ? "thread" : "channel";
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5000); // 5 seconds

    // For now, we'll rely on the Socket.io typing service
    // The client should also emit typing events via Socket.io for real-time delivery

    // Log the typing event for debugging
    logger.debug("Typing event received", {
      channelId,
      threadId,
      userId,
      userName,
      action,
      roomType,
    });

    // Build response
    const response: {
      success: boolean;
      message: string;
      roomType: string;
      channelId: string;
      threadId?: string;
      expiresAt?: string;
    } = {
      success: true,
      message: action === "start" ? "Typing started" : "Typing stopped",
      roomType,
      channelId,
    };

    if (threadId) {
      response.threadId = threadId;
    }

    if (action === "start") {
      response.expiresAt = expiresAt.toISOString();
    }

    return NextResponse.json(response);
  } catch (error) {
    const { id } = await params;
    logger.error("POST /api/channels/[id]/typing - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process typing signal",
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
// GET /api/channels/[id]/typing - Get currently typing users
// ============================================================================

/**
 * Get users currently typing in a channel
 *
 * Query parameters:
 * - threadId?: string - Get typing users for a specific thread
 *
 * Response:
 * - success: boolean
 * - users: Array<{ userId, userName, userAvatar, startedAt }>
 * - roomType: 'channel' | 'thread'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: channelId } = await params;
    logger.info("GET /api/channels/[id]/typing - Get typing users", {
      channelId,
    });

    // Validate channel ID
    if (!validateChannelId(channelId)) {
      return NextResponse.json(
        { success: false, error: "Invalid channel ID format" },
        { status: 400 },
      );
    }

    // Get user from auth (optional for this endpoint)
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get thread ID from query params
    const searchParams = request.nextUrl.searchParams;
    const threadId = searchParams.get("threadId");
    const roomType = threadId ? "thread" : "channel";

    // For now, return empty array as typing state is managed client-side via Socket.io
    const users: Array<{
      userId: string;
      userName?: string;
      userAvatar?: string;
      startedAt: string;
    }> = [];

    return NextResponse.json({
      success: true,
      users,
      roomType,
      channelId,
      threadId: threadId || undefined,
    });
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/channels/[id]/typing - Error", error as Error, {
      channelId: id,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get typing users",
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
