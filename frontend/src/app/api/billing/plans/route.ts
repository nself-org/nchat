/**
 * GET /api/billing/plans
 *
 * Get available subscription plans
 */

import { NextRequest, NextResponse } from "next/server";
import { getAvailablePlans, getPlanConfig } from "@/lib/billing/plan-config";
import type { PlanTier } from "@/types/subscription.types";

import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tier = searchParams.get("tier") as PlanTier | null;

    // Get specific plan
    if (tier) {
      const plan = getPlanConfig(tier);
      return NextResponse.json({ plan });
    }

    // Get all available plans
    const plans = getAvailablePlans();
    return NextResponse.json({ plans });
  } catch (error) {
    logger.error("Error fetching plans:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch plans",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
