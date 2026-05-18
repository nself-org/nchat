/**
 * AI Cost Analysis API
 * GET /api/admin/ai/costs
 */

import { NextRequest, NextResponse } from "next/server";
import { getCostTracker, MODEL_PRICING } from "@/lib/ai/cost-tracker";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const orgId = searchParams.get("orgId") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "startDate and endDate are required",
        },
        { status: 400 },
      );
    }

    const costTracker = getCostTracker();

    // Get cost statistics
    const start = new Date(startDate);
    const end = new Date(endDate);

    let stats;
    if (userId) {
      stats = await costTracker.getUserStats(userId, start, end);
    } else if (orgId) {
      stats = await costTracker.getOrgStats(orgId, start, end);
    } else {
      stats = await costTracker.getGlobalStats(start, end);
    }

    // Get top users (if no userId specified)
    let topUsers: Array<{
      userId: string;
      totalCost: number;
      requestCount: number;
    }> = [];
    if (!userId) {
      const topUsersStats = await costTracker.getTopUsers(start, end, 10);
      topUsers = topUsersStats.map(({ userId, stats }) => ({
        userId,
        totalCost: stats.totalCost,
        requestCount: stats.totalRequests,
      }));
    }

    // Get model pricing for reference
    const pricing = MODEL_PRICING;

    return NextResponse.json({
      success: true,
      data: {
        stats,
        topUsers,
        pricing,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error("Error getting AI costs:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error instanceof Error
              ? error.message
              : String(error)
            : "Failed to get AI costs",
      },
      { status: 500 },
    );
  }
}
