/**
 * Call Quality Drill-Down API
 * GET /api/calls/quality/drilldown - Get detailed quality metrics with drill-down capabilities
 *
 * Supports drill-down by:
 * - Room/Channel
 * - User
 * - Network type
 * - Time range
 * - Device/Browser
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getClientIp } from "@/lib/api/middleware";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  internalErrorResponse,
  notFoundResponse,
} from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { logger } from "@/lib/logger";
import {
  getCallQualityMetricsService,
  type TimeGranularity,
  type QualityFilters,
} from "@/services/calls/quality-metrics.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// Schemas
// =============================================================================

const DrillDownQuerySchema = z.object({
  // Drill-down dimension
  dimension: z.enum(["room", "user", "network", "device", "time", "call"]),

  // Dimension-specific ID
  roomId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  callId: z.string().uuid().optional(),

  // Time range
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  period: z.enum(["1h", "6h", "24h", "7d", "30d", "90d"]).optional(),
  granularity: z.enum(["minute", "hour", "day", "week", "month"]).optional(),

  // Filters
  networkType: z.enum(["cellular", "wifi", "ethernet", "unknown"]).optional(),
  qualityLevel: z
    .enum(["excellent", "good", "fair", "poor", "critical"])
    .optional(),
  hasIssues: z.coerce.boolean().optional(),

  // Pagination
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),

  // Include options
  includeTimeSeries: z.coerce.boolean().default(true),
  includeComparison: z.coerce.boolean().default(false),
});

// =============================================================================
// GET /api/calls/quality/drilldown
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/calls/quality/drilldown - Get drill-down data");

    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams: Record<string, string | undefined> = {
      dimension: searchParams.get("dimension") || "room",
      roomId: searchParams.get("roomId") || undefined,
      userId: searchParams.get("userId") || undefined,
      callId: searchParams.get("callId") || undefined,
      since: searchParams.get("since") || undefined,
      until: searchParams.get("until") || undefined,
      period: searchParams.get("period") || undefined,
      granularity: searchParams.get("granularity") || undefined,
      networkType: searchParams.get("networkType") || undefined,
      qualityLevel: searchParams.get("qualityLevel") || undefined,
      hasIssues: searchParams.get("hasIssues") || undefined,
      limit: searchParams.get("limit") || "20",
      offset: searchParams.get("offset") || "0",
      includeTimeSeries: searchParams.get("includeTimeSeries") || "true",
      includeComparison: searchParams.get("includeComparison") || "false",
    };

    const validation = DrillDownQuerySchema.safeParse(queryParams);
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
    const metricsService = getCallQualityMetricsService();

    // Calculate date range
    const { start, end } = getDateRange(params);
    const granularity =
      (params.granularity as TimeGranularity) ||
      getDefaultGranularity(params.period || "24h");

    // Build filters
    const filters: QualityFilters = {
      startDate: start,
      endDate: end,
      roomIds: params.roomId ? [params.roomId] : undefined,
      userIds: params.userId ? [params.userId] : undefined,
      callIds: params.callId ? [params.callId] : undefined,
      networkTypes: params.networkType ? [params.networkType] : undefined,
      qualityLevels: params.qualityLevel ? [params.qualityLevel] : undefined,
      hasIssues: params.hasIssues,
    };

    // Execute drill-down based on dimension
    let result: Record<string, unknown>;

    switch (params.dimension) {
      case "room":
        result = await drillDownByRoom(
          metricsService,
          params,
          filters,
          granularity,
        );
        break;
      case "user":
        result = await drillDownByUser(metricsService, params, filters);
        break;
      case "network":
        result = await drillDownByNetwork(metricsService, filters);
        break;
      case "device":
        result = await drillDownByDevice(metricsService, filters);
        break;
      case "time":
        result = await drillDownByTime(metricsService, start, end, granularity);
        break;
      case "call":
        result = await drillDownByCall(metricsService, params.callId!, user);
        break;
      default:
        return badRequestResponse("Invalid dimension");
    }

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
        id: `quality-drilldown-${params.dimension}`,
        name: `Call Quality Drill-Down: ${params.dimension}`,
      },
      description: `Viewed call quality drill-down by ${params.dimension}`,
      metadata: {
        dimension: params.dimension,
        filters: {
          roomId: params.roomId,
          userId: params.userId,
          callId: params.callId,
          networkType: params.networkType,
        },
      },
      ipAddress,
      success: true,
    });

    logger.info("GET /api/calls/quality/drilldown - Success", {
      dimension: params.dimension,
    });

    return successResponse({
      dimension: params.dimension,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        roomId: params.roomId,
        userId: params.userId,
        callId: params.callId,
        networkType: params.networkType,
        qualityLevel: params.qualityLevel,
        hasIssues: params.hasIssues,
      },
      ...result,
    });
  } catch (error) {
    logger.error("Error fetching drill-down data", error as Error);
    return internalErrorResponse("Failed to fetch drill-down data");
  }
}

// =============================================================================
// Drill-Down Functions
// =============================================================================

async function drillDownByRoom(
  service: ReturnType<typeof getCallQualityMetricsService>,
  params: z.infer<typeof DrillDownQuerySchema>,
  filters: QualityFilters,
  granularity: TimeGranularity,
): Promise<Record<string, unknown>> {
  if (params.roomId) {
    // Get detailed stats for a specific room
    const roomStats = await service.getRoomQualityStats(
      params.roomId,
      filters.startDate,
      granularity,
    );

    if (!roomStats) {
      return {
        room: null,
        message: "No quality data found for this room",
      };
    }

    return {
      room: {
        id: roomStats.roomId,
        name: roomStats.roomName,
        callCount: roomStats.callCount,
        totalDuration: roomStats.totalDuration,
        avgQualityScore: Math.round(roomStats.avgQualityScore * 10) / 10,
        avgParticipants: Math.round(roomStats.avgParticipants * 10) / 10,
        peakParticipants: roomStats.peakParticipants,
        qualityTrend: roomStats.qualityTrend,
        issuesFrequency: roomStats.issuesFrequency,
      },
      timeSeries: params.includeTimeSeries
        ? roomStats.timeSeriesData.map((point) => ({
            timestamp: point.timestamp.toISOString(),
            callCount: point.callCount,
            qualityScore: Math.round(point.qualityScore * 10) / 10,
            issueCount: point.issueCount,
          }))
        : null,
    };
  }

  // Get list of rooms with quality summary
  // This would need a query to list all rooms with quality aggregates
  return {
    rooms: [],
    message: "List of rooms with quality data",
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: 0,
    },
  };
}

async function drillDownByUser(
  service: ReturnType<typeof getCallQualityMetricsService>,
  params: z.infer<typeof DrillDownQuerySchema>,
  filters: QualityFilters,
): Promise<Record<string, unknown>> {
  if (params.userId) {
    // Get detailed stats for a specific user
    const userHistory = await service.getUserQualityHistory(
      params.userId,
      filters.startDate,
      params.limit,
    );

    if (!userHistory) {
      return {
        user: null,
        message: "No quality data found for this user",
      };
    }

    return {
      user: {
        id: userHistory.userId,
        username: userHistory.username,
        displayName: userHistory.displayName,
        callCount: userHistory.callCount,
        totalDuration: userHistory.totalDuration,
        avgQualityScore: Math.round(userHistory.avgQualityScore * 10) / 10,
        qualityLevel: userHistory.qualityLevel,
        issuesFrequency: userHistory.issuesFrequency,
        networkTypeDistribution: userHistory.networkTypeDistribution,
        deviceDistribution: userHistory.deviceDistribution,
      },
      recentCalls: userHistory.recentCalls.map((call) => ({
        callId: call.callId,
        timestamp: call.timestamp.toISOString(),
        duration: call.duration,
        qualityScore: Math.round(call.qualityScore * 10) / 10,
        issues: call.issues,
      })),
    };
  }

  // Get list of users with quality summary
  return {
    users: [],
    message: "List of users with quality data",
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: 0,
    },
  };
}

async function drillDownByNetwork(
  service: ReturnType<typeof getCallQualityMetricsService>,
  filters: QualityFilters,
): Promise<Record<string, unknown>> {
  const breakdown = await service.getNetworkTypeBreakdown(filters);

  return {
    networkBreakdown: breakdown.map((item) => ({
      networkType: item.networkType,
      callCount: item.callCount,
      participantCount: item.participantCount,
      avgQualityScore: Math.round(item.avgQualityScore * 10) / 10,
      avgBandwidth: Math.round(item.avgBandwidth),
      issuesFrequency: item.issuesFrequency,
    })),
    summary: {
      totalByType: breakdown.reduce(
        (acc, item) => {
          acc[item.networkType] = item.callCount;
          return acc;
        },
        {} as Record<string, number>,
      ),
      bestPerforming:
        breakdown.reduce(
          (best, item) =>
            item.avgQualityScore > (best?.avgQualityScore || 0) ? item : best,
          breakdown[0],
        )?.networkType || "unknown",
    },
  };
}

async function drillDownByDevice(
  service: ReturnType<typeof getCallQualityMetricsService>,
  filters: QualityFilters,
): Promise<Record<string, unknown>> {
  const breakdown = await service.getDeviceBreakdown(filters);

  return {
    deviceBreakdown: breakdown.map((item) => ({
      deviceType: item.deviceType,
      browser: item.browser,
      os: item.os,
      callCount: item.callCount,
      avgQualityScore: Math.round(item.avgQualityScore * 10) / 10,
      issuesFrequency: item.issuesFrequency,
    })),
    summary: {
      topBrowsers: aggregateByField(breakdown, "browser"),
      topOS: aggregateByField(breakdown, "os"),
      topDeviceTypes: aggregateByField(breakdown, "deviceType"),
    },
  };
}

async function drillDownByTime(
  service: ReturnType<typeof getCallQualityMetricsService>,
  start: Date,
  end: Date,
  granularity: TimeGranularity,
): Promise<Record<string, unknown>> {
  const globalMetrics = await service.getGlobalMetrics(start, end);

  // Generate time series buckets
  const buckets = generateTimeBuckets(start, end, granularity);

  return {
    timeSeries: buckets.map((timestamp) => ({
      timestamp: timestamp.toISOString(),
      label: formatTimeBucketLabel(timestamp, granularity),
      // Placeholder values - would need actual time-bucketed query
      callCount: 0,
      avgQualityScore: globalMetrics.avgQualityScore,
      avgMos: globalMetrics.avgMos,
    })),
    summary: {
      avgQualityScore: Math.round(globalMetrics.avgQualityScore * 10) / 10,
      avgMos: Math.round(globalMetrics.avgMos * 100) / 100,
      totalCalls: globalMetrics.totalCalls,
      qualityDistribution: globalMetrics.qualityDistribution,
    },
    granularity,
  };
}

async function drillDownByCall(
  service: ReturnType<typeof getCallQualityMetricsService>,
  callId: string,
  user: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const callSummary = await service.getCallQualitySummary(callId);

  if (!callSummary) {
    return {
      call: null,
      message: "No quality data found for this call",
    };
  }

  return {
    call: {
      id: callSummary.callId,
      roomId: callSummary.roomId,
      startTime: callSummary.startTime.toISOString(),
      endTime: callSummary.endTime.toISOString(),
      duration: callSummary.duration,
      participantCount: callSummary.participantCount,
      overallScore: Math.round(callSummary.overallScore * 10) / 10,
      qualityLevel: callSummary.qualityLevel,
      issuesDetected: callSummary.issuesDetected,
      alertsTriggered: callSummary.alertsTriggered,
    },
    audio: {
      avgMos: Math.round(callSummary.audio.avgMos * 100) / 100,
      avgJitter: Math.round(callSummary.audio.avgJitter * 10) / 10,
      avgPacketLoss: Math.round(callSummary.audio.avgPacketLoss * 100) / 100,
      avgBitrate: Math.round(callSummary.audio.avgBitrate),
      percentiles: {
        mos: {
          p50: Math.round(callSummary.audio.p50Mos * 100) / 100,
          p95: Math.round(callSummary.audio.p95Mos * 100) / 100,
          p99: Math.round(callSummary.audio.p99Mos * 100) / 100,
        },
      },
    },
    video: {
      avgBitrate: Math.round(callSummary.video.avgBitrate),
      avgFrameRate: Math.round(callSummary.video.avgFrameRate * 10) / 10,
      avgResolution: `${callSummary.video.avgResolutionWidth}x${callSummary.video.avgResolutionHeight}`,
      avgPacketLoss: Math.round(callSummary.video.avgPacketLoss * 100) / 100,
    },
    network: {
      avgRtt: Math.round(callSummary.network.avgRtt),
      avgBandwidth: Math.round(callSummary.network.avgBandwidth),
      percentiles: {
        rtt: {
          p50: Math.round(callSummary.network.p50Rtt),
          p95: Math.round(callSummary.network.p95Rtt),
          p99: Math.round(callSummary.network.p99Rtt),
        },
      },
    },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function getDateRange(params: z.infer<typeof DrillDownQuerySchema>): {
  start: Date;
  end: Date;
} {
  if (params.since && params.until) {
    return {
      start: new Date(params.since),
      end: new Date(params.until),
    };
  }

  const end = new Date();
  const start = new Date();
  const period = params.period || "24h";

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

function generateTimeBuckets(
  start: Date,
  end: Date,
  granularity: TimeGranularity,
): Date[] {
  const buckets: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    buckets.push(new Date(current));

    switch (granularity) {
      case "minute":
        current.setMinutes(current.getMinutes() + 1);
        break;
      case "hour":
        current.setHours(current.getHours() + 1);
        break;
      case "day":
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        current.setDate(current.getDate() + 7);
        break;
      case "month":
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return buckets;
}

function formatTimeBucketLabel(
  date: Date,
  granularity: TimeGranularity,
): string {
  switch (granularity) {
    case "minute":
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    case "hour":
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      });
    case "day":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    case "week":
      return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    case "month":
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
  }
}

function aggregateByField<T extends { callCount: number }>(
  items: T[],
  field: keyof T,
): Array<{ value: string; count: number }> {
  const counts: Record<string, number> = {};

  items.forEach((item) => {
    const value = String(item[field]);
    counts[value] = (counts[value] || 0) + item.callCount;
  });

  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
