/**
 * API Route: Moderation Queue Management
 * GET /api/moderation/queue - Get queue items
 * POST /api/moderation/queue - Add item to queue
 */

import { NextRequest, NextResponse } from "next/server";
import { getApolloClient } from "@/lib/apollo-client";
import { ModerationQueue } from "@/lib/moderation/moderation-queue";
import { captureError } from "@/lib/sentry-utils";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as any;
    const priority = searchParams.get("priority") as any;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0;

    const apolloClient = getApolloClient();
    const queue = new ModerationQueue(apolloClient);

    const items = await queue.getQueueItems({
      status,
      priority,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      items,
      count: items.length,
    });
  } catch (error) {
    logger.error("Get queue error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "queue-get" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch queue items",
        details:
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      contentType,
      contentId,
      userId,
      moderationResult,
      contentText,
      contentUrl,
      channelId,
      userDisplayName,
    } = body;

    if (!contentType || !contentId || !userId || !moderationResult) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const apolloClient = getApolloClient();
    const queue = new ModerationQueue(apolloClient);

    const queueId = await queue.addToQueue(
      contentType,
      contentId,
      userId,
      moderationResult,
      {
        contentText,
        contentUrl,
        channelId,
        userDisplayName,
      },
    );

    return NextResponse.json({
      success: true,
      queueId,
    });
  } catch (error) {
    logger.error("Add to queue error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "queue-post" },
    });

    return NextResponse.json(
      {
        error: "Failed to add item to queue",
        details:
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
