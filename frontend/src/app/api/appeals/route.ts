/**
 * Appeals API
 * POST /api/appeals - Submit an appeal
 * GET /api/appeals - Get appeals
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getAppealQueue } from "@/lib/moderation/appeal-system";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action_id, user_id, username, reason, evidence, metadata } = body;

    // Validate required fields
    if (!action_id || !user_id || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: action_id, user_id, reason" },
        { status: 400 },
      );
    }

    const appealQueue = getAppealQueue();
    const result = await appealQueue.submitAppeal({
      actionId: action_id,
      userId: user_id,
      username,
      reason,
      evidence,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        appeal: result.appeal,
        message:
          "Appeal submitted successfully. It will be reviewed by a moderator.",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[Appeals] Error submitting appeal:", error);
    return NextResponse.json(
      { error: "Failed to submit appeal" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assigned_to");
    const priority = searchParams.get("priority");

    const appealQueue = getAppealQueue();
    const appeals = appealQueue.getAppeals({
      userId: userId || undefined,
      status: status as any,
      assignedTo: assignedTo || undefined,
      priority: priority as any,
    });

    const stats = appealQueue.getStatistics();

    return NextResponse.json({
      appeals,
      stats,
      total: appeals.length,
    });
  } catch (error) {
    logger.error("[Appeals] Error fetching appeals:", error);
    return NextResponse.json(
      { error: "Failed to fetch appeals" },
      { status: 500 },
    );
  }
}
