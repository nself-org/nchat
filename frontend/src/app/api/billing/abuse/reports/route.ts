/**
 * Abuse Reports API Route
 *
 * GET  /api/billing/abuse/reports - List abuse reports
 * POST /api/billing/abuse/reports - Create a manual abuse report
 *
 * @module @/app/api/billing/abuse/reports/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import type { PlanTier } from "@/types/subscription.types";
import type { RiskLevel } from "@/lib/billing/abuse/types";
import { getAbusePreventionService } from "@/services/billing/abuse-prevention.service";

const VALID_RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];
const VALID_PLAN_TIERS: PlanTier[] = [
  "free",
  "starter",
  "professional",
  "enterprise",
  "custom",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("accountId") || undefined;
    const workspaceId = searchParams.get("workspaceId") || undefined;
    const riskLevel = searchParams.get("riskLevel") as RiskLevel | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Validate risk level if provided
    if (riskLevel && !VALID_RISK_LEVELS.includes(riskLevel)) {
      return NextResponse.json(
        {
          error: "Invalid riskLevel",
          validLevels: VALID_RISK_LEVELS,
        },
        { status: 400 },
      );
    }

    const service = getAbusePreventionService();
    const reports = service.listReports({
      accountId,
      workspaceId,
      riskLevel: riskLevel || undefined,
      limit: Math.min(limit, 100),
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        accountId: r.accountId,
        subscriptionId: r.subscriptionId,
        workspaceId: r.workspaceId,
        planTier: r.planTier,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
        signalCount: r.signals.length,
        recommendedAction: r.recommendedAction,
        actionApplied: r.actionApplied,
        appliedAction: r.appliedAction,
        hasAppeal: r.appeal !== null,
        generatedAt: r.generatedAt,
      })),
      total: reports.length,
    });
  } catch (error) {
    console.error("List abuse reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { accountId, subscriptionId, workspaceId, userId, planTier } = body;

    // Validate required fields
    if (!accountId || !subscriptionId || !workspaceId || !userId || !planTier) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: accountId, subscriptionId, workspaceId, userId, planTier",
        },
        { status: 400 },
      );
    }

    if (!VALID_PLAN_TIERS.includes(planTier as PlanTier)) {
      return NextResponse.json(
        {
          error: "Invalid planTier",
          validTiers: VALID_PLAN_TIERS,
        },
        { status: 400 },
      );
    }

    const service = getAbusePreventionService();
    const report = await service.checkAccount({
      accountId,
      subscriptionId,
      workspaceId,
      userId,
      planTier: planTier as PlanTier,
    });

    return NextResponse.json(
      {
        report: {
          id: report.id,
          riskScore: report.riskScore,
          riskLevel: report.riskLevel,
          signalCount: report.signals.length,
          recommendedAction: report.recommendedAction,
          actionApplied: report.actionApplied,
          generatedAt: report.generatedAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create abuse report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
