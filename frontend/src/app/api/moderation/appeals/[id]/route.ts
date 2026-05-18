/**
 * API Route: Individual Appeal Management
 * GET /api/moderation/appeals/[id] - Get appeal by ID
 * PUT /api/moderation/appeals/[id] - Update/resolve appeal
 * DELETE /api/moderation/appeals/[id] - Withdraw appeal
 */

import { NextRequest, NextResponse } from "next/server";
import { getModerationEngine } from "@/services/moderation/moderation-engine.service";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Get appeal by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const engine = getModerationEngine();

    const appeal = engine.getAppeal(id);

    if (!appeal) {
      return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      appeal,
    });
  } catch (error) {
    logger.error("Get appeal error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "appeal-get" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch appeal",
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
 * PUT: Update or resolve appeal
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      action,
      moderatorId,
      moderatorName,
      decision,
      resolution,
      outcome,
    } = body;

    if (!moderatorId) {
      return NextResponse.json(
        { error: "Moderator ID is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();

    let result: { success: boolean; appeal?: any; error?: string };

    switch (action) {
      case "assign":
        result = engine.assignAppeal(id, moderatorId, moderatorName);
        break;

      case "resolve":
        if (
          !decision ||
          !["approve", "reject", "partially_approve"].includes(decision)
        ) {
          return NextResponse.json(
            {
              error:
                "Valid decision is required (approve, reject, partially_approve)",
            },
            { status: 400 },
          );
        }
        if (!resolution) {
          return NextResponse.json(
            { error: "Resolution explanation is required" },
            { status: 400 },
          );
        }
        result = engine.resolveAppeal(
          id,
          moderatorId,
          decision,
          resolution,
          outcome,
        );
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      appeal: result.appeal,
      message: `Appeal ${action}d successfully`,
    });
  } catch (error) {
    logger.error("Update appeal error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "appeal-put" },
    });

    return NextResponse.json(
      {
        error: "Failed to update appeal",
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
 * DELETE: Withdraw appeal (user only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();

    const result = engine.withdrawAppeal(id, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Appeal withdrawn successfully",
    });
  } catch (error) {
    logger.error("Withdraw appeal error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "appeal-delete" },
    });

    return NextResponse.json(
      {
        error: "Failed to withdraw appeal",
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
