/**
 * GET /api/analytics/messages
 *
 * Returns message analytics data
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

    // Parse parameters (same as dashboard)
    const aggregator = getAnalyticsAggregator();
    const dateRange: DateRange = aggregator.getDateRangePreset("last30days");
    const granularity = (searchParams.get("granularity") ||
      "day") as TimeGranularity;

    const filters: AnalyticsFilters = {
      dateRange,
      granularity,
    };

    // Fetch message data
    const messageData = await aggregator.aggregateMessageData(filters);

    return NextResponse.json({
      success: true,
      data: messageData,
    });
  } catch (error) {
    logger.error("Message analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch message analytics" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
