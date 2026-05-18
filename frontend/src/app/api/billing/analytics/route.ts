/**
 * Billing Analytics API Route
 *
 * GET /api/billing/analytics?type=revenue&start=...&end=...&granularity=monthly
 *
 * Returns billing analytics data for a given type and date range.
 *
 * @module @/app/api/billing/analytics/route
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  BillingReportType,
  AnalyticsGranularity,
} from "@/lib/billing/analytics-types";

const VALID_TYPES: BillingReportType[] = [
  "revenue",
  "churn",
  "customer",
  "entitlement_drift",
  "reconciliation",
  "comprehensive",
];

const VALID_GRANULARITIES: AnalyticsGranularity[] = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") as BillingReportType | null;
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const granularity = (searchParams.get("granularity") ||
      "monthly") as AnalyticsGranularity;

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: "Invalid analytics type",
          validTypes: VALID_TYPES,
        },
        { status: 400 },
      );
    }

    // Validate dates
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          error: "start and end date parameters are required (ISO 8601 format)",
        },
        { status: 400 },
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format." },
        { status: 400 },
      );
    }

    if (start >= end) {
      return NextResponse.json(
        { error: "Start date must be before end date." },
        { status: 400 },
      );
    }

    // Validate granularity
    if (!VALID_GRANULARITIES.includes(granularity)) {
      return NextResponse.json(
        {
          error: "Invalid granularity",
          validGranularities: VALID_GRANULARITIES,
        },
        { status: 400 },
      );
    }

    // In a real implementation, this would fetch data from the database
    // and use the BillingAnalyticsService. For now, return the validated params.
    return NextResponse.json({
      type,
      dateRange: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        granularity,
      },
      message:
        "Analytics endpoint ready. Connect to data source for live results.",
      status: "ok",
    });
  } catch (error) {
    console.error("Billing analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
