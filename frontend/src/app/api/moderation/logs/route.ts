/**
 * API Route: Moderation Logs
 * GET /api/moderation/logs - Get moderation action logs
 */

import { NextRequest, NextResponse } from "next/server";
import { getModerationEngine } from "@/services/moderation/moderation-engine.service";
import type { ModerationActionType } from "@/services/moderation/moderation-engine.service";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Get moderation logs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actionType = searchParams.get(
      "actionType",
    ) as ModerationActionType | null;
    const moderatorId = searchParams.get("moderatorId");
    const targetId = searchParams.get("targetId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 100;

    const engine = getModerationEngine();

    const logs = engine.getModerationLogs({
      actionType: actionType || undefined,
      moderatorId: moderatorId || undefined,
      targetId: targetId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      filters: {
        actionType,
        moderatorId,
        targetId,
        startDate,
        endDate,
        limit,
      },
    });
  } catch (error) {
    logger.error("Get moderation logs error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "logs" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch moderation logs",
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
