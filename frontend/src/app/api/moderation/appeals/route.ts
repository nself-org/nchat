/**
 * API Route: Appeals Management
 * GET /api/moderation/appeals - Get appeals with filters
 * POST /api/moderation/appeals - Submit a new appeal
 */

import { NextRequest, NextResponse } from "next/server";
import { getModerationEngine } from "@/services/moderation/moderation-engine.service";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Fetch appeals with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const assignedTo = searchParams.get("assignedTo");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0;

    const engine = getModerationEngine();

    let appeals = engine.getAppeals({
      status: status as any,
      userId: userId || undefined,
      assignedTo: assignedTo || undefined,
    });

    // Apply pagination
    const total = appeals.length;
    appeals = appeals.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      appeals,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error("Get appeals error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "appeals-get" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch appeals",
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

/**
 * POST: Submit a new appeal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, actionId, penaltyId, reason, evidence } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    if (!actionId) {
      return NextResponse.json(
        { error: "Action ID is required" },
        { status: 400 },
      );
    }

    if (!reason?.trim()) {
      return NextResponse.json(
        { error: "Appeal reason is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();

    const result = engine.submitAppeal({
      userId,
      userName,
      actionId,
      penaltyId,
      reason,
      evidence,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      appeal: result.appeal,
      message: "Appeal submitted successfully",
    });
  } catch (error) {
    logger.error("Submit appeal error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "appeals-post" },
    });

    return NextResponse.json(
      {
        error: "Failed to submit appeal",
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
