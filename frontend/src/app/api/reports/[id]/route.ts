/**
 * Report Detail API
 * GET /api/reports/[id] - Get specific report
 * PATCH /api/reports/[id] - Update report status
 * DELETE /api/reports/[id] - Delete report
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { defaultReportQueue } from "@/lib/moderation/report-system";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const report = defaultReportQueue.getReport(id);

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    logger.error("[ReportDetail] Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
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
      status,
      priority,
      assigned_to,
      assigned_to_name,
      resolution,
      updated_by,
    } = body;

    if (!updated_by) {
      return NextResponse.json(
        { error: "updated_by is required" },
        { status: 400 },
      );
    }

    const result = defaultReportQueue.updateReport(
      id,
      {
        status,
        priority,
        assignedTo: assigned_to,
        assignedToName: assigned_to_name,
        resolution,
      },
      updated_by,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ report: result.report });
  } catch (error) {
    logger.error("[ReportDetail] Error updating report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
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
    const success = defaultReportQueue.deleteReport(id);

    if (!success) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    logger.error("[ReportDetail] Error deleting report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 },
    );
  }
}
