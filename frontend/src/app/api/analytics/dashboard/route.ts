/**
 * GET /api/analytics/dashboard
 *
 * Returns aggregated dashboard analytics data
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

    // Parse date range
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const preset = searchParams.get("preset");
    const granularity = (searchParams.get("granularity") ||
      "day") as TimeGranularity;

    // Parse filters
    const channelIds = searchParams.get("channels")?.split(",").filter(Boolean);
    const userIds = searchParams.get("users")?.split(",").filter(Boolean);
    const includeBots = searchParams.get("includeBots") === "true";

    // Build date range
    const aggregator = getAnalyticsAggregator();
    let dateRange: DateRange;

    if (preset && preset !== "custom") {
      dateRange = aggregator.getDateRangePreset(preset as any);
    } else if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    } else {
      // Default to last 30 days
      dateRange = aggregator.getDateRangePreset("last30days");
    }

    // Build filters
    const filters: AnalyticsFilters = {
      dateRange,
      granularity,
      channelIds,
      userIds,
      includeBots,
    };

    // Fetch dashboard data
    const dashboardData = await aggregator.aggregateDashboardData(filters);

    return NextResponse.json({
      success: true,
      data: dashboardData,
      filters: {
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
          preset: dateRange.preset,
        },
        granularity,
        channelIds,
        userIds,
        includeBots,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        cached: false,
      },
    });
  } catch (error) {
    logger.error("Analytics dashboard error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
        message:
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

export const dynamic = "force-dynamic";
