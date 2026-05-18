/**
 * Reports API - User reporting system
 * POST /api/reports - Create a new report
 * GET /api/reports - Get user's reports
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  defaultReportQueue,
  createReportInput,
} from "@/lib/moderation/report-system";
import type { ReportTargetType } from "@/lib/moderation/report-system";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reporter_id,
      reporter_name,
      target_type,
      target_id,
      target_name,
      category_id,
      description,
      evidence,
      metadata,
    } = body;

    // Validate required fields
    if (
      !reporter_id ||
      !target_type ||
      !target_id ||
      !category_id ||
      !description
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: reporter_id, target_type, target_id, category_id, description",
        },
        { status: 400 },
      );
    }

    // Create report input
    const reportInput = createReportInput(
      reporter_id,
      target_type as ReportTargetType,
      target_id,
      category_id,
      description,
      {
        reporterName: reporter_name,
        targetName: target_name,
        evidence,
        metadata,
      },
    );

    // Submit report
    const result = defaultReportQueue.createReport(reportInput);

    if (!result.success) {
      return NextResponse.json({ errors: result.errors }, { status: 400 });
    }

    return NextResponse.json(
      {
        id: result.report?.id,
        status: result.report?.status,
        priority: result.report?.priority,
        message:
          "Report submitted successfully. Our moderation team will review it shortly.",
        estimated_review_time: "24 hours",
        report: result.report,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const targetId = searchParams.get("target_id");
    const categoryId = searchParams.get("category_id");

    // Build filter
    const filter: any = {};
    if (userId) filter.reporterId = userId;
    if (status) filter.status = status;
    if (targetId) filter.targetId = targetId;
    if (categoryId) filter.categoryId = categoryId;

    // Get reports
    const reports = defaultReportQueue.getReports(filter);

    // Get statistics
    const stats = defaultReportQueue.getStats();

    return NextResponse.json({
      reports,
      stats,
      total: reports.length,
    });
  } catch (error) {
    logger.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}
