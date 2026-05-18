/**
 * Abuse Appeals API Route
 *
 * POST /api/billing/abuse/appeals - Submit an appeal
 * GET  /api/billing/abuse/appeals - List appeals
 *
 * @module @/app/api/billing/abuse/appeals/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import type { AppealStatus } from "@/lib/billing/abuse/types";
import { getAbusePreventionService } from "@/services/billing/abuse-prevention.service";

const VALID_STATUSES: AppealStatus[] = [
  "pending",
  "under_review",
  "approved",
  "denied",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("accountId") || undefined;
    const status = searchParams.get("status") as AppealStatus | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid appeal status",
          validStatuses: VALID_STATUSES,
        },
        { status: 400 },
      );
    }

    const service = getAbusePreventionService();
    const appeals = service.listAppeals({
      accountId,
      status: status || undefined,
      limit: Math.min(limit, 100),
    });

    return NextResponse.json({
      appeals: appeals.map((a) => ({
        id: a.id,
        reportId: a.reportId,
        accountId: a.accountId,
        status: a.status,
        reason: a.reason,
        submittedAt: a.submittedAt,
        reviewedAt: a.reviewedAt,
        reviewedBy: a.reviewedBy,
        resolution: a.resolution,
        restoredAccess: a.restoredAccess,
      })),
      total: appeals.length,
    });
  } catch (error) {
    console.error("List appeals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { reportId, accountId, reason, evidence } = body;

    // Validate required fields
    if (!reportId || !accountId || !reason) {
      return NextResponse.json(
        {
          error: "Missing required fields: reportId, accountId, reason",
        },
        { status: 400 },
      );
    }

    if (typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Reason must be a non-empty string" },
        { status: 400 },
      );
    }

    const service = getAbusePreventionService();
    const appeal = service.submitAppeal(
      reportId,
      accountId,
      reason.trim(),
      evidence?.trim() || undefined,
    );

    if (!appeal) {
      return NextResponse.json(
        { error: "Report not found or account mismatch" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        appeal: {
          id: appeal.id,
          reportId: appeal.reportId,
          accountId: appeal.accountId,
          status: appeal.status,
          reason: appeal.reason,
          submittedAt: appeal.submittedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Submit appeal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
