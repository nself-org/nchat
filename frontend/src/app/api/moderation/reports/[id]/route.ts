/**
 * API Route: Individual Report Management
 * GET /api/moderation/reports/[id] - Get report by ID
 * PUT /api/moderation/reports/[id] - Update report
 * POST /api/moderation/reports/[id] - Add note to report
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
 * GET: Get report by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const engine = getModerationEngine();

    const report = engine.getReport(id);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    logger.error("Get report error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "report-get" },
    });

    return NextResponse.json(
      {
        error: "Failed to fetch report",
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
 * PUT: Update report (status, assignment, resolution)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      priority,
      assignedTo,
      assignedToName,
      resolution,
      moderatorId,
    } = body;

    if (!moderatorId) {
      return NextResponse.json(
        { error: "Moderator ID is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();

    const result = engine.updateReport(
      id,
      {
        status,
        priority,
        assignedTo,
        assignedToName,
        resolution,
      },
      moderatorId,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      report: result.report,
      message: "Report updated successfully",
    });
  } catch (error) {
    logger.error("Update report error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "report-put" },
    });

    return NextResponse.json(
      {
        error: "Failed to update report",
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
 * POST: Add a note to the report
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { authorId, authorName, content, isInternal } = body;

    if (!authorId) {
      return NextResponse.json(
        { error: "Author ID is required" },
        { status: 400 },
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 },
      );
    }

    const engine = getModerationEngine();

    const result = engine.addReportNote(
      id,
      authorId,
      content,
      isInternal ?? false,
      authorName,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      note: result.note,
      message: "Note added successfully",
    });
  } catch (error) {
    logger.error("Add report note error:", error);
    captureError(error as Error, {
      tags: { feature: "moderation", endpoint: "report-note-post" },
    });

    return NextResponse.json(
      {
        error: "Failed to add note",
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
