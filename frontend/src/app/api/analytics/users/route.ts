/**
 * GET /api/analytics/users
 *
 * Returns user analytics data
 */

import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsAggregator } from "@/lib/analytics/analytics-aggregator";
import type {
  AnalyticsFilters,
  DateRange,
  TimeGranularity,
} from "@/lib/analytics/analytics-types";

import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const aggregator = getAnalyticsAggregator();
    const dateRange: DateRange = aggregator.getDateRangePreset("last30days");
    const granularity = (searchParams.get("granularity") ||
      "day") as TimeGranularity;

    const filters: AnalyticsFilters = {
      dateRange,
      granularity,
    };

    const userData = await aggregator.aggregateUserData(filters);

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error) {
    logger.error("User analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user analytics" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
