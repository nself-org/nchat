/**
 * DSAR Statistics API
 *
 * Compliance dashboard statistics for DSAR management.
 *
 * @module api/compliance/dsar/stats
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createDSARService, type DSARService } from "@/services/compliance";

// Service instance
let dsarService: DSARService | null = null;

async function getService(): Promise<DSARService> {
  if (!dsarService) {
    dsarService = createDSARService();
    await dsarService.initialize();
  }
  return dsarService;
}

/**
 * GET /api/compliance/dsar/stats
 * Get DSAR statistics
 */
export async function GET(request: NextRequest) {
  try {
    const service = await getService();
    const isAdmin = request.headers.get("x-user-role") === "admin";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const periodDays = parseInt(
      request.nextUrl.searchParams.get("period") || "30",
    );
    const statistics = service.getStatistics(periodDays);

    // Get additional data
    const overdueRequests = service.getOverdueRequests();
    const approachingDeadline = service.getApproachingDeadlineRequests(5);

    return NextResponse.json({
      success: true,
      statistics,
      alerts: {
        overdueCount: overdueRequests.length,
        overdueRequests: overdueRequests.map((r) => ({
          id: r.id,
          externalRef: r.externalRef,
          userId: r.userId,
          userEmail: r.userEmail,
          requestType: r.requestType,
          deadlineAt: r.deadlineAt,
          submittedAt: r.submittedAt,
        })),
        approachingDeadlineCount: approachingDeadline.length,
        approachingDeadline: approachingDeadline.map((r) => ({
          id: r.id,
          externalRef: r.externalRef,
          userId: r.userId,
          userEmail: r.userEmail,
          requestType: r.requestType,
          deadlineAt: r.deadlineAt,
          remainingDays: service.getRemainingDays(r.id),
        })),
      },
    });
  } catch (error) {
    logger.error("Error fetching DSAR statistics:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch DSAR statistics",
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
