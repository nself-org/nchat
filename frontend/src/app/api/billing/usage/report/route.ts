/**
 * GET/POST /api/billing/usage/report
 *
 * Generate usage reports for billing periods.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getUsageBillingService } from "@/services/billing/usage-billing.service";
import type {
  UsageReportRequest,
  UsageDimensionType,
} from "@/lib/billing/usage-types";
import { DEFAULT_DIMENSION_CONFIGS } from "@/lib/billing/usage-types";

/**
 * GET /api/billing/usage/report
 *
 * Quick report with query parameters.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const dimensions = searchParams.get("dimensions");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Default to current month if dates not provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const reportRequest: UsageReportRequest = {
      organizationId,
      startDate: startDate ? new Date(startDate) : defaultStartDate,
      endDate: endDate ? new Date(endDate) : defaultEndDate,
      dimensions: dimensions
        ? (dimensions.split(",") as UsageDimensionType[])
        : undefined,
    };

    const billingService = getUsageBillingService();
    const report = await billingService.generateUsageReport(reportRequest);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    logger.error("Error generating usage report:", error);
    return NextResponse.json(
      { error: "Failed to generate usage report", details: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * POST /api/billing/usage/report
 *
 * Detailed report with full request body.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    // Validate dimensions if provided
    if (body.dimensions) {
      for (const dim of body.dimensions) {
        if (!DEFAULT_DIMENSION_CONFIGS[dim as UsageDimensionType]) {
          return NextResponse.json(
            { error: `Invalid dimension: ${dim}` },
            { status: 400 },
          );
        }
      }
    }

    const reportRequest: UsageReportRequest = {
      organizationId: body.organizationId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      dimensions: body.dimensions,
      groupBy: body.groupBy,
      includeProjections: body.includeProjections ?? true,
      includePreviousPeriod: body.includePreviousPeriod ?? false,
    };

    const billingService = getUsageBillingService();
    const report = await billingService.generateUsageReport(reportRequest);

    // Calculate billing period usage if requested
    let billingPeriodUsage;
    if (body.includeBillingPeriodUsage) {
      billingPeriodUsage = await billingService.getBillingPeriodUsage(
        body.organizationId,
        reportRequest.startDate,
        reportRequest.endDate,
      );
    }

    return NextResponse.json({
      success: true,
      report,
      billingPeriodUsage,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    logger.error("Error generating detailed usage report:", error);
    return NextResponse.json(
      { error: "Failed to generate usage report", details: errorMessage },
      { status: 500 },
    );
  }
}
