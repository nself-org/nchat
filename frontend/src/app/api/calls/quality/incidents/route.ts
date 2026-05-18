/**
 * Call Quality Incidents API
 * GET /api/calls/quality/incidents - Get incident analysis for a call
 * POST /api/calls/quality/incidents - Analyze and store an incident
 *
 * Provides incident analysis, call replay timeline, root cause analysis,
 * and historical comparison for call quality issues.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getClientIp } from "@/lib/api/middleware";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { logger } from "@/lib/logger";
import { getIncidentAnalysisService } from "@/services/calls/incident-analysis.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// Schemas
// =============================================================================

const GetIncidentQuerySchema = z.object({
  callId: z.string().uuid(),
  includeTimeline: z.coerce.boolean().default(true),
  includeComparison: z.coerce.boolean().default(false),
  comparisonPeriod: z.enum(["7d", "30d", "90d"]).default("30d"),
});

const AnalyzeIncidentSchema = z.object({
  callId: z.string().uuid(),
  storeIncident: z.boolean().default(true),
  notifyAdmins: z.boolean().default(false),
});

// =============================================================================
// GET /api/calls/quality/incidents
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/calls/quality/incidents - Get incident analysis");

    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      callId: searchParams.get("callId") || "",
      includeTimeline: searchParams.get("includeTimeline") || "true",
      includeComparison: searchParams.get("includeComparison") || "false",
      comparisonPeriod: searchParams.get("comparisonPeriod") || "30d",
    };

    const validation = GetIncidentQuerySchema.safeParse(queryParams);
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
    const incidentService = getIncidentAnalysisService();

    // Get call replay data with incidents
    const replayData = await incidentService.getCallReplayData(params.callId);

    if (!replayData) {
      return notFoundResponse("Call not found or no quality data available");
    }

    // Build response
    const response: Record<string, unknown> = {
      callId: replayData.callId,
      roomId: replayData.roomId,
      startTime: replayData.startTime.toISOString(),
      endTime: replayData.endTime.toISOString(),
      duration: replayData.duration,

      // Participants
      participants: replayData.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        joinedAt: p.joinedAt.toISOString(),
        leftAt: p.leftAt?.toISOString(),
        duration: p.duration,
        networkType: p.networkType,
        avgQualityScore: Math.round(p.avgQualityScore * 10) / 10,
        issues: p.issues,
      })),

      // Quality summary
      qualitySummary: replayData.qualitySummary
        ? {
            overallScore:
              Math.round(replayData.qualitySummary.overallScore * 10) / 10,
            qualityLevel: replayData.qualitySummary.qualityLevel,
            audio: {
              avgMos:
                Math.round(replayData.qualitySummary.audio.avgMos * 100) / 100,
              avgJitter:
                Math.round(replayData.qualitySummary.audio.avgJitter * 10) / 10,
              avgPacketLoss:
                Math.round(
                  replayData.qualitySummary.audio.avgPacketLoss * 100,
                ) / 100,
            },
            network: {
              avgRtt: Math.round(replayData.qualitySummary.network.avgRtt),
            },
            issuesDetected: replayData.qualitySummary.issuesDetected,
            alertsTriggered: replayData.qualitySummary.alertsTriggered,
          }
        : null,

      // Incidents
      incidents: replayData.incidents.map((inc) => ({
        id: inc.id,
        type: inc.type,
        severity: inc.severity,
        startTime: inc.startTime.toISOString(),
        endTime: inc.endTime?.toISOString(),
        duration: inc.duration,
        affectedParticipants: inc.affectedParticipants,
        rootCauses: inc.rootCauses.map((rc) => ({
          type: rc.type,
          confidence: rc.confidence,
          description: rc.description,
          evidence: rc.evidence,
          recommendations: rc.recommendations,
        })),
        impact: inc.impact,
        resolved: inc.resolved,
      })),

      // Alerts
      alertCount: replayData.alerts.length,
      alerts: replayData.alerts.slice(0, 10).map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),
    };

    // Include timeline if requested
    if (params.includeTimeline) {
      response.timeline = replayData.timeline.map((event) => ({
        id: event.id,
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        userId: event.userId,
        participantId: event.participantId,
        severity: event.severity,
        description: event.description,
        data: event.data,
      }));
    }

    // Include historical comparison if requested
    if (params.includeComparison && replayData.incidents.length > 0) {
      const comparisonPeriodMs =
        params.comparisonPeriod === "7d"
          ? 7 * 24 * 60 * 60 * 1000
          : params.comparisonPeriod === "30d"
            ? 30 * 24 * 60 * 60 * 1000
            : 90 * 24 * 60 * 60 * 1000;

      const comparison = await incidentService.compareWithHistory(
        replayData.incidents[0],
        {
          roomId: replayData.roomId,
          since: new Date(Date.now() - comparisonPeriodMs),
        },
      );

      response.comparison = {
        similarIncidents: comparison.similarIncidents.map((s) => ({
          incidentId: s.incidentId,
          callId: s.callId,
          similarity: s.similarity,
          timestamp: s.timestamp.toISOString(),
          rootCauses: s.rootCauses,
          resolution: s.resolution,
        })),
        patterns: comparison.patterns.map((p) => ({
          pattern: p.pattern,
          frequency: p.frequency,
          lastOccurrence: p.lastOccurrence.toISOString(),
          affectedCalls: p.affectedCalls,
          commonRootCause: p.commonRootCause,
        })),
        recommendations: comparison.recommendations,
      };
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
      category: "channel",
      resource: {
        type: "channel",
        id: params.callId,
        name: `Call ${params.callId.substring(0, 8)}`,
      },
      description: "Viewed call incident analysis",
      metadata: {
        callId: params.callId,
        incidentCount: replayData.incidents.length,
        includeTimeline: params.includeTimeline,
        includeComparison: params.includeComparison,
      },
      ipAddress,
      success: true,
    });

    logger.info("GET /api/calls/quality/incidents - Success", {
      callId: params.callId,
      incidentCount: replayData.incidents.length,
      timelineEvents: replayData.timeline.length,
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Error fetching incident analysis", error as Error);
    return internalErrorResponse("Failed to fetch incident analysis");
  }
}

// =============================================================================
// POST /api/calls/quality/incidents
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info(
      "POST /api/calls/quality/incidents - Analyze and store incident",
    );

    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    // Check admin permission
    if (!["admin", "owner"].includes(user.role)) {
      return unauthorizedResponse("Admin access required");
    }

    const body = await request.json();
    const validation = AnalyzeIncidentSchema.safeParse(body);

    if (!validation.success) {
      return badRequestResponse("Invalid request body", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const params = validation.data;
    const incidentService = getIncidentAnalysisService();

    // Get call replay data to analyze incidents
    const replayData = await incidentService.getCallReplayData(params.callId);

    if (!replayData) {
      return notFoundResponse("Call not found or no quality data available");
    }

    if (replayData.incidents.length === 0) {
      return successResponse({
        message: "No incidents detected in this call",
        callId: params.callId,
        analyzed: true,
        incidentsFound: 0,
      });
    }

    // Store incidents if requested
    const storedIncidentIds: string[] = [];
    if (params.storeIncident) {
      for (const incident of replayData.incidents) {
        const incidentId = await incidentService.storeIncident(incident);
        if (incidentId) {
          storedIncidentIds.push(incidentId);
        }
      }
    }

    // Log audit event
    const ipAddress = getClientIp(request);
    await logAuditEvent({
      action: "create",
      actor: {
        id: user.id,
        type: "user",
        email: user.email,
        displayName: user.displayName,
      },
      category: "admin",
      resource: {
        type: "setting",
        id: params.callId,
        name: `Call Incident Analysis ${params.callId.substring(0, 8)}`,
      },
      description: `Analyzed and stored ${replayData.incidents.length} incidents`,
      metadata: {
        callId: params.callId,
        incidentCount: replayData.incidents.length,
        storedIncidentIds,
        notifyAdmins: params.notifyAdmins,
      },
      ipAddress,
      success: true,
    });

    logger.info("POST /api/calls/quality/incidents - Success", {
      callId: params.callId,
      incidentsAnalyzed: replayData.incidents.length,
      incidentsStored: storedIncidentIds.length,
    });

    return createdResponse({
      message: "Incidents analyzed successfully",
      callId: params.callId,
      analyzed: true,
      incidentsFound: replayData.incidents.length,
      incidentsStored: storedIncidentIds.length,
      storedIncidentIds,
      summary: replayData.incidents.map((inc) => ({
        id: inc.id,
        type: inc.type,
        severity: inc.severity,
        startTime: inc.startTime.toISOString(),
        affectedParticipants: inc.affectedParticipants.length,
        topRootCause: inc.rootCauses[0]?.type,
      })),
    });
  } catch (error) {
    logger.error("Error analyzing incidents", error as Error);
    return internalErrorResponse("Failed to analyze incidents");
  }
}
