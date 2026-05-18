/**
 * Call Quality Dashboard API
 * GET /api/calls/quality/dashboard - Get comprehensive dashboard data
 *
 * Provides aggregated quality metrics, trends, and insights for the admin dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getClientIp } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { logger } from "@/lib/logger";
import {
  getCallQualityMetricsService,
  type TimeGranularity,
} from "@/services/calls/quality-metrics.service";
import { getCallQualityAlertingService } from "@/services/calls/quality-alerting.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// Schemas
// =============================================================================

const DashboardQuerySchema = z.object({
  period: z.enum(["1h", "6h", "24h", "7d", "30d", "90d"]).default("24h"),
  granularity: z.enum(["minute", "hour", "day", "week", "month"]).optional(),
  includeAlerts: z.coerce.boolean().default(true),
  includeBreakdowns: z.coerce.boolean().default(true),
  includeTimeSeries: z.coerce.boolean().default(true),
});

// =============================================================================
// Helpers
// =============================================================================

function getPeriodDates(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "1h":
      start.setHours(start.getHours() - 1);
      break;
    case "6h":
      start.setHours(start.getHours() - 6);
      break;
    case "24h":
      start.setHours(start.getHours() - 24);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
  }

  return { start, end };
}

function getDefaultGranularity(period: string): TimeGranularity {
  switch (period) {
    case "1h":
      return "minute";
    case "6h":
    case "24h":
      return "hour";
    case "7d":
    case "30d":
      return "day";
    case "90d":
      return "week";
    default:
      return "hour";
  }
}

// =============================================================================
// GET /api/calls/quality/dashboard
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/calls/quality/dashboard - Get dashboard data");

    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    // Check if user has admin role
    if (!["admin", "owner"].includes(user.role)) {
      return unauthorizedResponse("Admin access required");
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      period: searchParams.get("period") || "24h",
      granularity: searchParams.get("granularity") || undefined,
      includeAlerts: searchParams.get("includeAlerts") || "true",
      includeBreakdowns: searchParams.get("includeBreakdowns") || "true",
      includeTimeSeries: searchParams.get("includeTimeSeries") || "true",
    };

    const validation = DashboardQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return badRequestResponse(
        "Invalid query parameters",
        "VALIDATION_ERROR",
        {
          errors: validation.error.flatten().fieldErrors,
        },
      );
    }

    const params = validation.data;
    const { start, end } = getPeriodDates(params.period);
    const granularity =
      (params.granularity as TimeGranularity) ||
      getDefaultGranularity(params.period);

    const metricsService = getCallQualityMetricsService();
    const alertingService = getCallQualityAlertingService();

    // Fetch all dashboard data in parallel
    const [globalMetrics, alertMetrics, alertHistory] = await Promise.all([
      metricsService.getGlobalMetrics(start, end),
      params.includeAlerts ? alertingService.getAlertMetrics(start) : null,
      params.includeAlerts
        ? alertingService.getAlertHistory({ since: start, limit: 10 })
        : null,
    ]);

    // Calculate quality score trend
    const qualityTrend = calculateQualityTrend(globalMetrics.avgQualityScore);

    // Generate dashboard response
    const dashboardData = {
      period: params.period,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },

      // Summary metrics
      summary: {
        totalCalls: globalMetrics.totalCalls,
        totalDuration: globalMetrics.totalDuration,
        avgQualityScore: Math.round(globalMetrics.avgQualityScore * 10) / 10,
        avgMos: Math.round(globalMetrics.avgMos * 100) / 100,
        qualityTrend,
        qualityDistribution: globalMetrics.qualityDistribution,
      },

      // Percentile metrics
      percentiles: globalMetrics.percentiles,

      // Top issues
      topIssues: globalMetrics.topIssues,

      // Alert summary
      alerts:
        params.includeAlerts && alertMetrics
          ? {
              total: alertMetrics.totalAlerts,
              last24h: alertMetrics.alertsLast24h,
              lastHour: alertMetrics.alertsLastHour,
              avgResponseTime: Math.round(alertMetrics.avgResponseTime / 1000), // seconds
              avgResolutionTime: Math.round(
                alertMetrics.avgResolutionTime / 1000,
              ), // seconds
              topTypes: alertMetrics.topAlertTypes.slice(0, 5),
              topAffectedCalls: alertMetrics.topAffectedCalls.slice(0, 5),
              recentAlerts: alertHistory?.alerts.slice(0, 5).map((a) => ({
                id: a.id,
                type: a.type,
                severity: a.severity,
                message: a.message,
                callId: a.callId,
                createdAt: a.createdAt.toISOString(),
                acknowledged: !!a.acknowledgedAt,
                resolved: !!a.resolvedAt,
              })),
            }
          : null,

      // Health indicators
      health: {
        overallStatus: getOverallHealthStatus(globalMetrics.avgQualityScore),
        indicators: [
          {
            name: "Audio Quality",
            status: getHealthStatus(globalMetrics.avgMos, 3.5, 4.0),
            value: globalMetrics.avgMos.toFixed(2),
            unit: "MOS",
          },
          {
            name: "Packet Loss",
            status: getHealthStatusInverse(
              globalMetrics.percentiles?.packetLoss?.p95 || 0,
              5,
              2,
            ),
            value: (globalMetrics.percentiles?.packetLoss?.p95 || 0).toFixed(2),
            unit: "%",
          },
          {
            name: "Network Latency",
            status: getHealthStatusInverse(
              globalMetrics.percentiles?.rtt?.p95 || 0,
              200,
              100,
            ),
            value: Math.round(globalMetrics.percentiles?.rtt?.p95 || 0),
            unit: "ms",
          },
          {
            name: "Alert Rate",
            status: getHealthStatusInverse(
              alertMetrics?.alertsLast24h || 0,
              20,
              5,
            ),
            value: alertMetrics?.alertsLast24h || 0,
            unit: "alerts/24h",
          },
        ],
      },
    };

    // Log audit event
    const ipAddress = getClientIp(request);
    await logAuditEvent({
      action: "access",
      actor: {
        id: user.id,
        type: "user",
        email: user.email,
        displayName: user.displayName,
      },
      category: "admin",
      resource: {
        type: "setting",
        id: "call-quality-dashboard",
        name: "Call Quality Dashboard",
      },
      description: `Viewed call quality dashboard for ${params.period}`,
      metadata: {
        period: params.period,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
      },
      ipAddress,
      success: true,
    });

    logger.info("GET /api/calls/quality/dashboard - Success", {
      period: params.period,
      totalCalls: globalMetrics.totalCalls,
    });

    return successResponse(dashboardData);
  } catch (error) {
    logger.error("Error fetching dashboard data", error as Error);
    return internalErrorResponse("Failed to fetch dashboard data");
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateQualityTrend(
  avgScore: number,
): "excellent" | "good" | "fair" | "poor" | "critical" {
  if (avgScore >= 90) return "excellent";
  if (avgScore >= 75) return "good";
  if (avgScore >= 60) return "fair";
  if (avgScore >= 40) return "poor";
  return "critical";
}

function getOverallHealthStatus(
  score: number,
): "healthy" | "warning" | "critical" {
  if (score >= 70) return "healthy";
  if (score >= 50) return "warning";
  return "critical";
}

function getHealthStatus(
  value: number,
  warningThreshold: number,
  goodThreshold: number,
): "healthy" | "warning" | "critical" {
  if (value >= goodThreshold) return "healthy";
  if (value >= warningThreshold) return "warning";
  return "critical";
}

function getHealthStatusInverse(
  value: number,
  criticalThreshold: number,
  warningThreshold: number,
): "healthy" | "warning" | "critical" {
  if (value <= warningThreshold) return "healthy";
  if (value <= criticalThreshold) return "warning";
  return "critical";
}
