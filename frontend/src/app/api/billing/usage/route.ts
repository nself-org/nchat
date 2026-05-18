/**
 * GET /api/billing/usage
 *
 * Get current usage snapshot for an organization.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getUsageBillingService } from "@/services/billing/usage-billing.service";
import type { UsageDimensionType } from "@/lib/billing/usage-types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");
    const dimension = searchParams.get(
      "dimension",
    ) as UsageDimensionType | null;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const billingService = getUsageBillingService();
    const tracker = billingService.getTracker();

    // Get specific dimension usage
    if (dimension) {
      const checkResult = await tracker.checkUsage(organizationId, dimension);
      return NextResponse.json({
        dimension,
        ...checkResult,
      });
    }

    // Get full usage snapshot
    const snapshot = await tracker.getUsageSnapshot(organizationId);

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error instanceof Error
          ? error.message
          : String(error)
        : "Unknown error";
    logger.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage", details: errorMessage },
      { status: 500 },
    );
  }
}
