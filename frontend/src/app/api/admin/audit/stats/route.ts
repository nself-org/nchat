/**
 * GET /api/admin/audit/stats
 *
 * Get audit log statistics and aggregations
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuditQueryService } from "@/services/audit/audit-query.service";
import { logger } from "@/lib/logger";
import type {
  AuditLogFilters,
  AuditCategory,
  AuditSeverity,
} from "@/lib/audit/audit-types";

/**
 * GET /api/admin/audit/stats
 *
 * Get comprehensive audit log statistics
 *
 * Query parameters:
 * - category: Filter by category (comma-separated)
 * - severity: Filter by severity (comma-separated)
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - granularity: Time aggregation granularity ('hour', 'day', 'week', 'month')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse filters
    const filters: AuditLogFilters = {};

    const category = searchParams.get("category");
    if (category) {
      filters.category = category.split(",") as AuditCategory[];
    }

    const severity = searchParams.get("severity");
    if (severity) {
      filters.severity = severity.split(",") as AuditSeverity[];
    }

    const startDate = searchParams.get("startDate");
    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    const endDate = searchParams.get("endDate");
    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    const granularity =
      (searchParams.get("granularity") as "hour" | "day" | "week" | "month") ||
      "day";

    const queryService = getAuditQueryService();

    // Get statistics
    const stats = await queryService.getStatistics(
      Object.keys(filters).length > 0 ? filters : undefined,
    );

    // Get time aggregations
    const timeAggregations = queryService.getTimeAggregations({
      granularity,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    // Get query result for aggregations
    const result = await queryService.query({
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      includeAggregations: true,
      pagination: { page: 1, pageSize: 1 },
    });

    return NextResponse.json({
      success: true,
      statistics: {
        total: stats.totalEvents,
        byCategory: stats.eventsByCategory,
        bySeverity: stats.eventsBySeverity,
        successRate: stats.successRate,
        failedEvents: stats.failedEvents,
      },
      topActors: stats.topActors.slice(0, 10).map((a) => ({
        actorId: a.actor.id,
        actorType: a.actor.type,
        displayName: a.actor.displayName || a.actor.username,
        count: a.count,
      })),
      topActions: stats.topActions.slice(0, 10),
      timeline: timeAggregations,
      aggregations: result.aggregations
        ? {
            byHour: result.aggregations.byHour,
            byDay: result.aggregations.byDay,
            topResources: result.aggregations.topResources,
          }
        : undefined,
      metadata: {
        generatedAt: new Date().toISOString(),
        granularity,
        filters: {
          category: filters.category,
          severity: filters.severity,
          startDate: filters.startDate?.toISOString(),
          endDate: filters.endDate?.toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error("[Audit Stats API] Error", error);
    return NextResponse.json(
      { success: false, error: "Failed to get audit statistics" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
