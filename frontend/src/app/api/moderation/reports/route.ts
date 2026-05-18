/**
 * API Route: Reports Management
 * GET /api/moderation/reports - Get reports with filters
 * POST /api/moderation/reports - Create a new report
 */

import { NextRequest, NextResponse } from "next/server";
import { getModerationEngine } from "@/services/moderation/moderation-engine.service";
import { captureError } from "@/lib/sentry-utils";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Fetch reports with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const targetId = searchParams.get("targetId");
    const assignedTo = searchParams.get("assignedTo");
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0;

    const engine = getModerationEngine();

    let reports = engine.getReports({
      status: status as any,
      priority: priority as any,
      category: category as any,
      targetId: targetId || undefined,
      assignedTo: assignedTo || undefined,
    });

    // Apply pagination
    const total = reports.length;
    reports = reports.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error("Get reports error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "reports-get" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch reports",
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
 * POST: Create a new report
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reporterId,
      reporterName,
      targetType,
      targetId,
      targetName,
      category,
      description,
      evidence,
      channelId,
      workspaceId,
    } = body;

    // Validate required fields
    if (!reporterId) {
      return NextResponse.json(
        { error: "Reporter ID is required" },
        { status: 400 },
      );
    }

    if (!targetType || !["user", "message", "channel"].includes(targetType)) {
      return NextResponse.json(
        { error: "Valid target type is required (user, message, channel)" },
        { status: 400 },
      );
    }

    if (!targetId) {
      return NextResponse.json(
        { error: "Target ID is required" },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Report category is required" },
        { status: 400 },
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();

    const result = engine.createReport({
      reporterId,
      reporterName,
      targetType,
      targetId,
      targetName,
      category,
      description,
      evidence,
      channelId,
      workspaceId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      report: result.report,
      message: "Report created successfully",
    });
  } catch (error) {
    logger.error("Create report error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "reports-post" },
    });

    return NextResponse.json(
      {
        error: "Failed to create report",
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
