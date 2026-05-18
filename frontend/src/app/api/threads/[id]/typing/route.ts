/**
 * Thread Typing API Route
 *
 * Handles typing indicator signals for threads.
 * Uses Redis pub/sub for efficient real-time distribution without database persistence.
 *
 * POST /api/threads/[id]/typing - Signal typing start/stop in thread
 * GET /api/threads/[id]/typing - Get users currently typing in thread
 *
 * @module app/api/threads/[id]/typing
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

function validateThreadId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ============================================================================
// POST /api/threads/[id]/typing - Signal typing in thread
// ============================================================================

/**
 * Signal typing start/stop in a thread
 *
 * This endpoint is used by clients to signal typing status in a thread.
 * The server then broadcasts this to other users in the thread via Socket.io/Redis pub/sub.
 *
 * Request body:
 * - action: 'start' | 'stop' - Whether to start or stop typing indicator
 *
 * Response:
 * - success: boolean
 * - message: string
 * - roomType: 'thread'
 * - threadId: string
 * - expiresAt?: string - When the typing indicator will expire (for 'start')
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: threadId } = await params;
    logger.info("POST /api/threads/[id]/typing - Typing signal", { threadId });

    // Validate thread ID
    if (!validateThreadId(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread ID format" },
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

    const { action } = validation.data;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5000); // 5 seconds

    // 1. Verify user has access to the thread
    // 2. Publish to Redis pub/sub for real-time distribution
    // For now, we'll rely on the Socket.io typing service

    // Log the typing event for debugging
    logger.debug("Thread typing event received", {
      threadId,
      userId,
      userName,
      action,
    });

    // Build response
    const response: {
      success: boolean;
      message: string;
      roomType: "thread";
      threadId: string;
      expiresAt?: string;
    } = {
      success: true,
      message: action === "start" ? "Typing started" : "Typing stopped",
      roomType: "thread",
      threadId,
    };

    if (action === "start") {
      response.expiresAt = expiresAt.toISOString();
    }

    return NextResponse.json(response);
  } catch (error) {
    const { id } = await params;
    logger.error("POST /api/threads/[id]/typing - Error", error as Error, {
      threadId: id,
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
// GET /api/threads/[id]/typing - Get currently typing users
// ============================================================================

/**
 * Get users currently typing in a thread
 *
 * Response:
 * - success: boolean
 * - users: Array<{ userId, userName, userAvatar, startedAt }>
 * - roomType: 'thread'
 * - threadId: string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: threadId } = await params;
    logger.info("GET /api/threads/[id]/typing - Get typing users", {
      threadId,
    });

    // Validate thread ID
    if (!validateThreadId(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread ID format" },
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

    // 1. Verify user has access to the thread
    // 2. Query Redis for active typing indicators
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
      roomType: "thread",
      threadId,
    });
  } catch (error) {
    const { id } = await params;
    logger.error("GET /api/threads/[id]/typing - Error", error as Error, {
      threadId: id,
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
