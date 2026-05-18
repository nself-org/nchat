/**
 * Appeal Detail API
 * GET /api/appeals/[id] - Get specific appeal
 * PATCH /api/appeals/[id] - Update appeal (assign, resolve, etc.)
 * DELETE /api/appeals/[id] - Withdraw appeal
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getAppealQueue } from "@/lib/moderation/appeal-system";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const appealQueue = getAppealQueue();
    const appeal = appealQueue.getAppeal(id);

    if (!appeal) {
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
    }

    return NextResponse.json({ appeal });
  } catch (error) {
    logger.error("[AppealDetail] Error fetching appeal:", error);
    return NextResponse.json(
      { error: "Failed to fetch appeal" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      action,
      moderator_id,
      moderator_name,
      decision,
      resolution,
      outcome,
    } = body;

    const appealQueue = getAppealQueue();

    if (action === "assign") {
      if (!moderator_id) {
        return NextResponse.json(
          { error: "moderator_id is required" },
          { status: 400 },
        );
      }

      const result = await appealQueue.assignAppeal(
        id,
        moderator_id,
        moderator_name,
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ appeal: result.appeal });
    } else if (action === "resolve") {
      if (!moderator_id || !decision || !resolution) {
        return NextResponse.json(
          { error: "moderator_id, decision, and resolution are required" },
          { status: 400 },
        );
      }

      const result = await appealQueue.resolveAppeal(
        id,
        moderator_id,
        decision,
        resolution,
        outcome,
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ appeal: result.appeal });
    } else if (action === "add_note") {
      const { author_id, author_name, content, is_internal } = body;

      if (!author_id || !content) {
        return NextResponse.json(
          { error: "author_id and content are required" },
          { status: 400 },
        );
      }

      const result = await appealQueue.addReviewNote(
        id,
        author_id,
        content,
        is_internal ?? true,
        author_name,
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ note: result.note });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[AppealDetail] Error updating appeal:", error);
    return NextResponse.json(
      { error: "Failed to update appeal" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 },
      );
    }

    const appealQueue = getAppealQueue();
    const result = await appealQueue.withdrawAppeal(id, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      appeal: result.appeal,
      message: "Appeal withdrawn successfully",
    });
  } catch (error) {
    logger.error("[AppealDetail] Error withdrawing appeal:", error);
    return NextResponse.json(
      { error: "Failed to withdraw appeal" },
      { status: 500 },
    );
  }
}
