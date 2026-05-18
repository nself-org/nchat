/**
 * Broadcast Send API Route
 *
 * Handles sending broadcasts to all recipients in a list.
 *
 * POST /api/broadcasts/[id]/send - Send broadcast message
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { apolloClient } from "@/lib/apollo-client";
import {
  createBroadcastService,
  BROADCASTS_PER_MINUTE,
} from "@/services/broadcasts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SendBroadcastSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(4000, "Content must be 4000 characters or less"),
  contentHtml: z
    .string()
    .max(8000, "HTML content must be 8000 characters or less")
    .optional(),
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
// POST /api/broadcasts/[id]/send - Send broadcast
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    logger.info("POST /api/broadcasts/[id]/send - Send broadcast request", {
      listId: id,
    });

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
    const validation = SendBroadcastSchema.safeParse(body);
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

    const { content, contentHtml } = validation.data;

    const broadcastService = createBroadcastService(apolloClient);

    // Check rate limit before proceeding
    const remainingBroadcasts = broadcastService.getRemainingBroadcasts(userId);
    if (remainingBroadcasts === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Maximum ${BROADCASTS_PER_MINUTE} broadcasts per minute.`,
          retryAfter: 60,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": String(BROADCASTS_PER_MINUTE),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // Verify list exists and user owns it
    const list = await broadcastService.getBroadcastList(id);
    if (!list) {
      return NextResponse.json(
        { success: false, error: "Broadcast list not found" },
        { status: 404 },
      );
    }

    if (list.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Only the list owner can send broadcasts" },
        { status: 403 },
      );
    }

    if (list.recipientCount === 0) {
      return NextResponse.json(
        { success: false, error: "Broadcast list has no recipients" },
        { status: 400 },
      );
    }

    // Send the broadcast
    const result = await broadcastService.sendBroadcast(
      id,
      { content, contentHtml },
      userId,
    );

    logger.info("POST /api/broadcasts/[id]/send - Broadcast sent", {
      listId: id,
      broadcastId: result.broadcast.id,
      deliveryCount: result.deliveryCount,
      failedCount: result.failedRecipients.length,
      senderId: userId,
    });

    // Include rate limit info in response
    const newRemainingBroadcasts =
      broadcastService.getRemainingBroadcasts(userId);

    const response = NextResponse.json(
      {
        success: true,
        broadcast: result.broadcast,
        deliveryCount: result.deliveryCount,
        recipientCount: list.recipientCount,
        failedRecipients: result.failedRecipients,
        message:
          result.failedRecipients.length > 0
            ? `Broadcast sent to ${result.deliveryCount}/${list.recipientCount} recipients`
            : "Broadcast sent successfully to all recipients",
      },
      { status: 201 },
    );

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", String(BROADCASTS_PER_MINUTE));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(newRemainingBroadcasts),
    );

    return response;
  } catch (error) {
    const { id } = await params;
    logger.error("POST /api/broadcasts/[id]/send - Error", error as Error, {
      listId: id,
    });

    // Handle specific errors
    if (error instanceof Error) {
      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "Rate limit",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            retryAfter: 60,
          },
          {
            status: 429,
            headers: {
              "Retry-After": "60",
            },
          },
        );
      }

      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "not found",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 404 },
        );
      }

      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "Only the list owner",
        ) ||
        (error instanceof Error ? error.message : String(error)).includes(
          "Access denied",
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
          { status: 403 },
        );
      }

      if (
        (error instanceof Error ? error.message : String(error)).includes(
          "no recipients",
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
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send broadcast",
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
