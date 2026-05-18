/**
 * Security Statistics API
 *
 * Provides endpoints for security metrics and reporting.
 *
 * GET /api/security/stats - Get security statistics and metrics
 */

import { NextResponse } from "next/server";
import {
  createVulnerabilityTracker,
  generateRemediationReport,
} from "@/lib/security/vulnerability-tracker";

// In-memory tracker instance
const tracker = createVulnerabilityTracker();

// ============================================================================
// GET /api/security/stats
// ============================================================================

export async function GET() {
  try {
    const stats = tracker.getStats();
    const blockStatus = tracker.shouldBlockDeployment();
    const overdue = tracker.getOverdue();
    const open = tracker.getOpen();

    // Calculate trends (in production, this would query historical data)
    const trends = {
      last7Days: {
        new: 0,
        fixed: 0,
        trend: "stable" as "improving" | "degrading" | "stable",
      },
      last30Days: {
        new: 0,
        fixed: 0,
        trend: "stable" as "improving" | "degrading" | "stable",
      },
    };

    // Calculate SLA compliance
    const slaCompliance = {
      critical: {
        total: stats.bySeverity.critical,
        overdue: overdue.filter((v) => v.severity === "critical").length,
        compliant:
          stats.bySeverity.critical -
          overdue.filter((v) => v.severity === "critical").length,
      },
      high: {
        total: stats.bySeverity.high,
        overdue: overdue.filter((v) => v.severity === "high").length,
        compliant:
          stats.bySeverity.high -
          overdue.filter((v) => v.severity === "high").length,
      },
      medium: {
        total: stats.bySeverity.medium,
        overdue: overdue.filter((v) => v.severity === "medium").length,
        compliant:
          stats.bySeverity.medium -
          overdue.filter((v) => v.severity === "medium").length,
      },
      low: {
        total: stats.bySeverity.low,
        overdue: overdue.filter((v) => v.severity === "low").length,
        compliant:
          stats.bySeverity.low -
          overdue.filter((v) => v.severity === "low").length,
      },
    };

    // Top affected files/packages
    const affectedFiles = new Map<string, number>();
    const affectedPackages = new Map<string, number>();

    for (const vuln of open) {
      if (vuln.location.file) {
        const count = affectedFiles.get(vuln.location.file) ?? 0;
        affectedFiles.set(vuln.location.file, count + 1);
      }
      if (vuln.location.package) {
        const key = `${vuln.location.package}@${vuln.location.version ?? "unknown"}`;
        const count = affectedPackages.get(key) ?? 0;
        affectedPackages.set(key, count + 1);
      }
    }

    const topAffectedFiles = Array.from(affectedFiles.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));

    const topAffectedPackages = Array.from(affectedPackages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pkg, count]) => ({ package: pkg, count }));

    return NextResponse.json({
      summary: {
        total: stats.total,
        open:
          stats.byStatus.open +
          stats.byStatus.acknowledged +
          stats.byStatus.in_progress,
        fixed: stats.byStatus.fixed + stats.byStatus.verified,
        suppressed: stats.suppressedCount,
        overdue: stats.overdueCount,
      },
      bySeverity: stats.bySeverity,
      byStatus: stats.byStatus,
      bySource: stats.bySource,
      byPriority: stats.byPriority,
      slaCompliance,
      trends,
      topAffectedFiles,
      topAffectedPackages,
      policy: {
        deploymentBlocked: blockStatus.blocked,
        blockReasons: blockStatus.reasons,
      },
      metrics: {
        meanTimeToRemediation: stats.meanTimeToRemediation
          ? Math.round(stats.meanTimeToRemediation / (1000 * 60 * 60 * 24))
          : null,
        oldestOpenVulnerability: stats.oldestOpen?.toISOString() ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
