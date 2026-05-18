/**
 * Trust & Safety Statistics API Route
 *
 * GET /api/trust-safety/statistics - Get comprehensive statistics
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEvidenceCollector,
  getLegalHoldService,
  getEvidenceExportService,
} from "@/services/trust-safety";

const collector = getEvidenceCollector();
const legalHoldService = getLegalHoldService(undefined, collector);
const exportService = getEvidenceExportService(undefined, collector);

/**
 * GET - Get comprehensive trust & safety statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const evidenceStats = collector.getStatistics(workspaceId);
    const legalHoldStats = legalHoldService.getStatistics();
    const exportStats = exportService.getStatistics();

    return NextResponse.json({
      success: true,
      statistics: {
        evidence: {
          total: evidenceStats.total,
          byStatus: evidenceStats.byStatus,
          byType: evidenceStats.byType,
          byPriority: evidenceStats.byPriority,
          totalSizeBytes: evidenceStats.totalSizeBytes,
          totalSizeMB:
            Math.round((evidenceStats.totalSizeBytes / (1024 * 1024)) * 100) /
            100,
          underLegalHold: evidenceStats.underLegalHold,
          lastCollectedAt: evidenceStats.lastCollectedAt,
        },
        legalHolds: {
          total: legalHoldStats.total,
          byStatus: legalHoldStats.byStatus,
          byScope: legalHoldStats.byScope,
          totalEvidenceCount: legalHoldStats.totalEvidenceCount,
          pendingApprovals: legalHoldStats.pendingApprovals,
          expiringWithin30Days: legalHoldStats.expiringWithin30Days,
        },
        exports: {
          totalRequests: exportStats.totalRequests,
          byStatus: exportStats.byStatus,
          byFormat: exportStats.byFormat,
          totalEvidenceExported: exportStats.totalEvidenceExported,
          averageProcessingTimeMs: Math.round(
            exportStats.averageProcessingTimeMs,
          ),
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Statistics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve statistics" },
      { status: 500 },
    );
  }
}
