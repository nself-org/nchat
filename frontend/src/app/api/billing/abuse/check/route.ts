/**
 * Abuse Check API Route
 *
 * POST /api/billing/abuse/check
 *
 * Runs an abuse check on an account and returns the abuse report.
 *
 * @module @/app/api/billing/abuse/check/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import type { PlanTier } from "@/types/subscription.types";
import { getAbusePreventionService } from "@/services/billing/abuse-prevention.service";

const VALID_PLAN_TIERS: PlanTier[] = [
  "free",
  "starter",
  "professional",
  "enterprise",
  "custom",
];

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

    // Validate plan tier
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

    return NextResponse.json({
      report: {
        id: report.id,
        riskScore: report.riskScore,
        riskLevel: report.riskLevel,
        signalCount: report.signals.length,
        recommendedAction: report.recommendedAction,
        actionApplied: report.actionApplied,
        appliedAction: report.appliedAction,
        generatedAt: report.generatedAt,
      },
      signals: report.signals.map((s) => ({
        id: s.id,
        category: s.category,
        indicatorType: s.indicatorType,
        riskLevel: s.riskLevel,
        confidence: s.confidence,
        description: s.description,
      })),
    });
  } catch (error) {
    console.error("Abuse check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
