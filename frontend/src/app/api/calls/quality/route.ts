/**
 * Call Quality Monitoring API
 * POST /api/calls/quality - Report connection quality metrics
 * GET /api/calls/quality - Get quality statistics for debugging
 *
 * All operations use real database queries via GraphQL and include:
 * - Authentication checks
 * - Participant verification
 * - Timeseries storage for metrics
 * - Quality degradation alerting
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gql } from "@apollo/client";
import { getServerApolloClient } from "@/lib/apollo-client";
import { getAuthenticatedUser, getClientIp } from "@/lib/api/middleware";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
} from "@/lib/api/response";
import { logAuditEvent } from "@/lib/audit/audit-logger";
import { logger } from "@/lib/logger";
import { getAPIEventBroadcaster } from "@/services/realtime/api-event-broadcaster";
import { getUserRoom, REALTIME_EVENTS } from "@/services/realtime/events.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const CHECK_CALL_PARTICIPANT = gql`
  query CheckCallParticipant($callId: uuid!, $userId: uuid!) {
    nchat_call_participants(
      where: {
        call_id: { _eq: $callId }
        user_id: { _eq: $userId }
        left_at: { _is_null: true }
      }
      limit: 1
    ) {
      id
      call_id
      user_id
      joined_at
    }
    nchat_calls_by_pk(id: $callId) {
      id
      status
      caller_id
    }
  }
`;

const INSERT_QUALITY_REPORT = gql`
  mutation InsertQualityReport(
    $report: nchat_call_quality_reports_insert_input!
  ) {
    insert_nchat_call_quality_reports_one(object: $report) {
      id
      call_id
      participant_id
      reported_at
      packet_loss_rate
      jitter
      round_trip_time
    }
  }
`;

const GET_QUALITY_REPORTS = gql`
  query GetQualityReports(
    $callId: uuid
    $participantId: uuid
    $since: timestamptz
    $limit: Int!
  ) {
    nchat_call_quality_reports(
      where: {
        _and: [
          { call_id: { _eq: $callId } }
          { participant_id: { _eq: $participantId } }
          { reported_at: { _gte: $since } }
        ]
      }
      order_by: { reported_at: desc }
      limit: $limit
    ) {
      id
      call_id
      participant_id
      reported_at
      audio_level
      packets_sent
      packets_received
      packets_lost
      packet_loss_rate
      jitter
      round_trip_time
      bytes_sent
      bytes_received
      bitrate_sent
      bitrate_received
      ice_connection_state
      connection_state
      rtc_stats
    }
  }
`;

const GET_QUALITY_AGGREGATES = gql`
  query GetQualityAggregates($callId: uuid!, $since: timestamptz) {
    nchat_call_quality_reports_aggregate(
      where: { call_id: { _eq: $callId }, reported_at: { _gte: $since } }
    ) {
      aggregate {
        avg {
          packet_loss_rate
          jitter
          round_trip_time
          audio_level
          bitrate_sent
          bitrate_received
        }
        count
      }
    }
  }
`;

const UPDATE_PARTICIPANT_QUALITY = gql`
  mutation UpdateParticipantQuality(
    $participantId: uuid!
    $connectionQuality: String!
    $avgPacketLoss: numeric
    $avgJitter: numeric
    $avgRtt: numeric
  ) {
    update_nchat_call_participants_by_pk(
      pk_columns: { id: $participantId }
      _set: {
        connection_quality: $connectionQuality
        avg_packet_loss: $avgPacketLoss
        avg_jitter: $avgJitter
        avg_round_trip_time: $avgRtt
      }
    ) {
      id
      connection_quality
    }
  }
`;

const INSERT_CALL_EVENT = gql`
  mutation InsertCallEvent(
    $callId: uuid!
    $userId: uuid
    $eventType: String!
    $data: jsonb
  ) {
    insert_nchat_call_events_one(
      object: {
        call_id: $callId
        user_id: $userId
        event_type: $eventType
        data: $data
      }
    ) {
      id
    }
  }
`;

const GET_CALL_PARTICIPANT_USER_IDS = gql`
  query GetCallParticipantUserIds($callId: uuid!) {
    nchat_call_participants(
      where: { call_id: { _eq: $callId }, left_at: { _is_null: true } }
    ) {
      user_id
    }
    nchat_calls_by_pk(id: $callId) {
      caller_id
    }
  }
`;

// ============================================================================
// SCHEMAS
// ============================================================================

const QualityMetricsSchema = z.object({
  callId: z.string().uuid(),
  participantId: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),

  // Network metrics
  connectionType: z
    .enum(["cellular", "wifi", "ethernet", "unknown"])
    .optional(),
  bandwidth: z
    .object({
      upload: z.number().positive(), // in kbps
      download: z.number().positive(), // in kbps
    })
    .optional(),

  // Audio metrics
  audio: z
    .object({
      bitrate: z.number().positive().optional(),
      packetsLost: z.number().int().min(0).optional(),
      packetsReceived: z.number().int().min(0).optional(),
      jitter: z.number().min(0).optional(), // in ms
      rtt: z.number().min(0).optional(), // round-trip time in ms
      mos: z.number().min(1).max(5).optional(), // Mean Opinion Score
      audioLevel: z.number().min(0).max(100).optional(),
    })
    .optional(),

  // Video metrics
  video: z
    .object({
      bitrate: z.number().positive().optional(),
      frameRate: z.number().positive().optional(),
      resolution: z.string().optional(), // e.g., "1920x1080"
      packetsLost: z.number().int().min(0).optional(),
      packetsReceived: z.number().int().min(0).optional(),
      jitter: z.number().min(0).optional(),
      rtt: z.number().min(0).optional(),
    })
    .optional(),

  // Overall quality score
  qualityScore: z.number().min(0).max(100).optional(),

  // Issues
  issues: z
    .array(
      z.enum([
        "high_packet_loss",
        "high_jitter",
        "high_rtt",
        "low_bandwidth",
        "cpu_overload",
        "network_congestion",
      ]),
    )
    .optional(),

  // Raw WebRTC stats
  rtcStats: z.record(z.unknown()).optional(),
});

const QualityQuerySchema = z.object({
  callId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  includeAggregates: z.coerce.boolean().default(true),
});

// ============================================================================
// TYPES
// ============================================================================

interface ParticipantCheckResult {
  isParticipant: boolean;
  participantId: string | null;
  callStatus: string | null;
  callerId: string | null;
}

type QualityIssue =
  | "high_packet_loss"
  | "high_jitter"
  | "high_rtt"
  | "low_bandwidth"
  | "cpu_overload"
  | "network_congestion";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user is a participant in the call
 */
async function checkCallParticipant(
  callId: string,
  userId: string,
): Promise<ParticipantCheckResult> {
  try {
    const client = getServerApolloClient();
    const { data } = await client.query({
      query: CHECK_CALL_PARTICIPANT,
      variables: { callId, userId },
      fetchPolicy: "no-cache",
    });

    const participant = data?.nchat_call_participants?.[0];
    const call = data?.nchat_calls_by_pk;

    return {
      isParticipant: !!participant || call?.caller_id === userId,
      participantId: participant?.id || null,
      callStatus: call?.status || null,
      callerId: call?.caller_id || null,
    };
  } catch (error) {
    logger.error("[checkCallParticipant] Error:", error);
    return {
      isParticipant: false,
      participantId: null,
      callStatus: null,
      callerId: null,
    };
  }
}

/**
 * Store quality metrics in the database
 */
async function storeQualityMetrics(report: {
  callId: string;
  participantId: string;
  userId: string;
  timestamp: string;
  audio?: z.infer<typeof QualityMetricsSchema>["audio"];
  video?: z.infer<typeof QualityMetricsSchema>["video"];
  bandwidth?: z.infer<typeof QualityMetricsSchema>["bandwidth"];
  qualityScore: number;
  issues: QualityIssue[];
  rtcStats?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  try {
    const client = getServerApolloClient();

    // Calculate packet loss rate
    let packetLossRate: number | null = null;
    if (
      report.audio?.packetsLost !== undefined &&
      report.audio?.packetsReceived !== undefined
    ) {
      const total = report.audio.packetsLost + report.audio.packetsReceived;
      packetLossRate = total > 0 ? (report.audio.packetsLost / total) * 100 : 0;
    }

    const dbReport = {
      call_id: report.callId,
      participant_id: report.participantId,
      reported_at: report.timestamp,
      audio_level: report.audio?.audioLevel || null,
      packets_sent: null, // Would come from rtcStats
      packets_received: report.audio?.packetsReceived || null,
      packets_lost: report.audio?.packetsLost || null,
      packet_loss_rate: packetLossRate,
      jitter: report.audio?.jitter || report.video?.jitter || null,
      round_trip_time: report.audio?.rtt || report.video?.rtt || null,
      bytes_sent: null, // Would come from rtcStats
      bytes_received: null, // Would come from rtcStats
      bitrate_sent: report.bandwidth?.upload || null,
      bitrate_received: report.bandwidth?.download || null,
      ice_connection_state: null, // Would come from rtcStats
      connection_state: null, // Would come from rtcStats
      rtc_stats: report.rtcStats || null,
    };

    const { data, errors } = await client.mutate({
      mutation: INSERT_QUALITY_REPORT,
      variables: { report: dbReport },
    });

    if (errors?.length) {
      logger.error("[storeQualityMetrics] GraphQL errors:", errors);
      return null;
    }

    return { id: data?.insert_nchat_call_quality_reports_one?.id };
  } catch (error) {
    logger.error("[storeQualityMetrics] Error:", error);
    return null;
  }
}

/**
 * Update participant's connection quality
 */
async function updateParticipantQuality(
  participantId: string,
  qualityScore: number,
  avgPacketLoss: number | null,
  avgJitter: number | null,
  avgRtt: number | null,
): Promise<void> {
  try {
    const client = getServerApolloClient();

    // Map score to quality label
    let connectionQuality = "good";
    if (qualityScore >= 90) connectionQuality = "excellent";
    else if (qualityScore >= 70) connectionQuality = "good";
    else if (qualityScore >= 50) connectionQuality = "fair";
    else connectionQuality = "poor";

    await client.mutate({
      mutation: UPDATE_PARTICIPANT_QUALITY,
      variables: {
        participantId,
        connectionQuality,
        avgPacketLoss,
        avgJitter,
        avgRtt,
      },
    });
  } catch (error) {
    logger.error("[updateParticipantQuality] Error:", error);
  }
}

/**
 * Trigger quality degradation alert
 */
async function triggerQualityAlert(
  callId: string,
  userId: string,
  qualityScore: number,
  issues: QualityIssue[],
): Promise<void> {
  try {
    const client = getServerApolloClient();

    // Log call event for quality degradation
    await client.mutate({
      mutation: INSERT_CALL_EVENT,
      variables: {
        callId,
        userId,
        eventType: "quality_changed",
        data: {
          qualityScore,
          issues,
          severity:
            qualityScore < 30
              ? "critical"
              : qualityScore < 50
                ? "warning"
                : "info",
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Log for monitoring
    logger.warn("[triggerQualityAlert] Quality degradation detected", {
      callId,
      userId,
      qualityScore,
      issues,
    });

    // Broadcast real-time quality alert to all active call participants via
    // Socket.io. The APIEventBroadcaster POSTs to the realtime server's
    // /api/broadcast endpoint which fans out to each user's personal room.
    const { data: participantsData } = await client.query({
      query: GET_CALL_PARTICIPANT_USER_IDS,
      variables: { callId },
      fetchPolicy: "no-cache",
    });

    const participantUserIds = new Set<string>();
    for (const p of participantsData?.nchat_call_participants || []) {
      participantUserIds.add(p.user_id);
    }
    // Always include the original caller
    if (participantsData?.nchat_calls_by_pk?.caller_id) {
      participantUserIds.add(participantsData.nchat_calls_by_pk.caller_id);
    }

    const broadcaster = getAPIEventBroadcaster();
    if (!broadcaster.initialized) {
      broadcaster.initialize();
    }

    const severity = qualityScore < 30 ? "critical" : "warning";
    const alertPayload = {
      callId,
      reportedBy: userId,
      qualityScore,
      issues,
      severity,
      message:
        qualityScore < 30
          ? "Call quality is very poor. Check your internet connection."
          : "Call quality has degraded. You may experience audio or video issues.",
      timestamp: new Date().toISOString(),
    };

    // Emit to every active participant so their UI can show a quality warning
    for (const participantId of participantUserIds) {
      await broadcaster.broadcast(
        REALTIME_EVENTS.NOTIFICATION,
        [getUserRoom(participantId)],
        {
          id: crypto.randomUUID(),
          type: "call_quality_alert",
          title: "Call quality alert",
          body: alertPayload.message,
          data: alertPayload,
          createdAt: new Date().toISOString(),
        },
      );
    }

    logger.info("[triggerQualityAlert] Quality alert broadcast sent", {
      callId,
      qualityScore,
      severity,
      participantCount: participantUserIds.size,
    });
  } catch (error) {
    logger.error("[triggerQualityAlert] Error:", error);
  }
}

/**
 * Calculate overall quality score from metrics
 */
function calculateQualityScore(
  metrics: z.infer<typeof QualityMetricsSchema>,
): number {
  let score = 100;

  // Audio quality (40% weight)
  if (metrics.audio) {
    const audioScore = calculateAudioScore(metrics.audio);
    score -= (100 - audioScore) * 0.4;
  }

  // Video quality (40% weight)
  if (metrics.video) {
    const videoScore = calculateVideoScore(metrics.video);
    score -= (100 - videoScore) * 0.4;
  }

  // Bandwidth (20% weight)
  if (metrics.bandwidth) {
    const bandwidthScore = calculateBandwidthScore(metrics.bandwidth);
    score -= (100 - bandwidthScore) * 0.2;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateAudioScore(
  audio: NonNullable<z.infer<typeof QualityMetricsSchema>["audio"]>,
): number {
  let score = 100;

  // Packet loss impact
  if (audio.packetsLost !== undefined && audio.packetsReceived !== undefined) {
    const total = audio.packetsReceived + audio.packetsLost;
    if (total > 0) {
      const lossRate = audio.packetsLost / total;
      score -= lossRate * 50; // Up to -50 for 100% loss
    }
  }

  // Jitter impact
  if (audio.jitter !== undefined) {
    if (audio.jitter > 100) score -= 30;
    else if (audio.jitter > 50) score -= 15;
    else if (audio.jitter > 30) score -= 5;
  }

  // RTT impact
  if (audio.rtt !== undefined) {
    if (audio.rtt > 300) score -= 30;
    else if (audio.rtt > 150) score -= 15;
    else if (audio.rtt > 100) score -= 5;
  }

  return Math.max(0, score);
}

function calculateVideoScore(
  video: NonNullable<z.infer<typeof QualityMetricsSchema>["video"]>,
): number {
  let score = 100;

  // Packet loss impact
  if (video.packetsLost !== undefined && video.packetsReceived !== undefined) {
    const total = video.packetsReceived + video.packetsLost;
    if (total > 0) {
      const lossRate = video.packetsLost / total;
      score -= lossRate * 40;
    }
  }

  // Frame rate impact
  if (video.frameRate !== undefined) {
    if (video.frameRate < 15) score -= 30;
    else if (video.frameRate < 24) score -= 15;
  }

  // Jitter impact
  if (video.jitter !== undefined) {
    if (video.jitter > 100) score -= 20;
    else if (video.jitter > 50) score -= 10;
  }

  return Math.max(0, score);
}

function calculateBandwidthScore(
  bandwidth: NonNullable<z.infer<typeof QualityMetricsSchema>["bandwidth"]>,
): number {
  let score = 100;

  // Upload bandwidth (important for video)
  if (bandwidth.upload < 500) score -= 40;
  else if (bandwidth.upload < 1000) score -= 20;

  // Download bandwidth
  if (bandwidth.download < 500) score -= 40;
  else if (bandwidth.download < 1000) score -= 20;

  return Math.max(0, score);
}

/**
 * Detect quality issues from metrics
 */
function detectQualityIssues(
  metrics: z.infer<typeof QualityMetricsSchema>,
): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check audio metrics
  if (metrics.audio) {
    const { packetsLost, packetsReceived, jitter, rtt } = metrics.audio;
    if (packetsLost !== undefined && packetsReceived !== undefined) {
      const total = packetsReceived + packetsLost;
      if (total > 0) {
        const lossRate = packetsLost / total;
        if (lossRate > 0.05 && !issues.includes("high_packet_loss")) {
          issues.push("high_packet_loss");
        }
      }
    }
    if (
      jitter !== undefined &&
      jitter > 50 &&
      !issues.includes("high_jitter")
    ) {
      issues.push("high_jitter");
    }
    if (rtt !== undefined && rtt > 150 && !issues.includes("high_rtt")) {
      issues.push("high_rtt");
    }
  }

  // Check video metrics
  if (metrics.video) {
    const { packetsLost, packetsReceived, jitter, rtt } = metrics.video;
    if (packetsLost !== undefined && packetsReceived !== undefined) {
      const total = packetsReceived + packetsLost;
      if (total > 0) {
        const lossRate = packetsLost / total;
        if (lossRate > 0.03 && !issues.includes("high_packet_loss")) {
          issues.push("high_packet_loss");
        }
      }
    }
    if (
      jitter !== undefined &&
      jitter > 50 &&
      !issues.includes("high_jitter")
    ) {
      issues.push("high_jitter");
    }
    if (rtt !== undefined && rtt > 150 && !issues.includes("high_rtt")) {
      issues.push("high_rtt");
    }
  }

  // Check bandwidth
  if (metrics.bandwidth) {
    if (
      (metrics.bandwidth.upload < 500 || metrics.bandwidth.download < 500) &&
      !issues.includes("low_bandwidth")
    ) {
      issues.push("low_bandwidth");
    }
  }

  return issues;
}

/**
 * Get most common issues from metrics array
 */
function getCommonIssues(
  metrics: Array<{ issues?: string[] }>,
): Record<string, number> {
  const issueCounts: Record<string, number> = {};

  metrics.forEach((m) => {
    if (m.issues) {
      m.issues.forEach((issue: string) => {
        issueCounts[issue] = (issueCounts[issue] || 0) + 1;
      });
    }
  });

  return issueCounts;
}

/**
 * Calculate quality trend (improving, stable, degrading)
 */
function calculateTrend(
  metrics: Array<{ qualityScore?: number; packet_loss_rate?: number }>,
): "improving" | "stable" | "degrading" {
  if (metrics.length < 2) return "stable";

  // Use packet loss rate if quality score is not available
  const values = metrics.map((m) => {
    if (m.qualityScore !== undefined) return m.qualityScore;
    if (m.packet_loss_rate !== undefined) return 100 - m.packet_loss_rate;
    return 75; // Default to 75 if no data
  });

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (diff > 5) return "improving";
  if (diff < -5) return "degrading";
  return "stable";
}

// ============================================================================
// POST /api/calls/quality - Report quality metrics
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    logger.info("POST /api/calls/quality - Report quality metrics");

    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    const body = await request.json();
    const validation = QualityMetricsSchema.safeParse(body);

    if (!validation.success) {
      return badRequestResponse("Invalid metrics data", "VALIDATION_ERROR", {
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const metrics = validation.data;

    // Verify user is participant in the call
    const participantCheck = await checkCallParticipant(
      metrics.callId,
      user.id,
    );
    if (!participantCheck.isParticipant) {
      return forbiddenResponse(
        "Not a participant in this call",
        "NOT_PARTICIPANT",
      );
    }

    // Check call is active
    if (
      participantCheck.callStatus === "ended" ||
      participantCheck.callStatus === "failed" ||
      participantCheck.callStatus === "cancelled"
    ) {
      return badRequestResponse("Call is no longer active", "CALL_INACTIVE");
    }

    // Calculate quality score if not provided
    let qualityScore = metrics.qualityScore;
    if (qualityScore === undefined && (metrics.audio || metrics.video)) {
      qualityScore = calculateQualityScore(metrics);
    }
    qualityScore = qualityScore ?? 75; // Default to 75 if still undefined

    // Detect issues
    const issues = detectQualityIssues(metrics);

    const now = new Date().toISOString();
    const participantId =
      metrics.participantId || participantCheck.participantId || user.id;

    // Store metrics in database
    const storedReport = await storeQualityMetrics({
      callId: metrics.callId,
      participantId,
      userId: user.id,
      timestamp: metrics.timestamp || now,
      audio: metrics.audio,
      video: metrics.video,
      bandwidth: metrics.bandwidth,
      qualityScore,
      issues,
      rtcStats: metrics.rtcStats,
    });

    if (!storedReport) {
      logger.error("[POST quality] Failed to store quality metrics");
      return internalErrorResponse("Failed to store quality metrics");
    }

    // Update participant's connection quality
    if (participantCheck.participantId) {
      await updateParticipantQuality(
        participantCheck.participantId,
        qualityScore,
        metrics.audio?.packetsLost !== undefined &&
          metrics.audio?.packetsReceived !== undefined
          ? (metrics.audio.packetsLost /
              (metrics.audio.packetsLost + metrics.audio.packetsReceived)) *
              100
          : null,
        metrics.audio?.jitter ?? null,
        metrics.audio?.rtt ?? null,
      );
    }

    // Trigger alert if quality is critically low
    if (qualityScore < 50) {
      await triggerQualityAlert(metrics.callId, user.id, qualityScore, issues);
    }

    // Log audit event - using 'update' action and 'channel' category for call quality tracking
    const ipAddress = getClientIp(request);
    await logAuditEvent({
      action: "update",
      actor: {
        id: user.id,
        type: "user",
        email: user.email,
        displayName: user.displayName,
      },
      category: "channel",
      resource: {
        type: "channel",
        id: metrics.callId,
        name: `Call ${metrics.callId.substring(0, 8)}`,
      },
      description: `Reported call quality: ${qualityScore}%`,
      metadata: {
        callId: metrics.callId,
        qualityScore,
        issues,
        reportId: storedReport.id,
        eventType: "call_quality_report",
      },
      ipAddress,
      success: true,
    });

    logger.info("POST /api/calls/quality - Success", {
      callId: metrics.callId,
      qualityScore,
      issueCount: issues.length,
      reportId: storedReport.id,
    });

    return createdResponse({
      qualityReport: {
        id: storedReport.id,
        qualityScore,
        issues,
        timestamp: metrics.timestamp || now,
      },
      message: "Quality metrics reported successfully",
    });
  } catch (error) {
    logger.error("Error reporting quality metrics", error as Error);
    return internalErrorResponse("Failed to report quality metrics");
  }
}

// ============================================================================
// GET /api/calls/quality - Get quality statistics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    logger.info("GET /api/calls/quality - Get quality statistics");

    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    const { searchParams } = new URL(request.url);
    const queryParams = {
      callId: searchParams.get("callId") || undefined,
      participantId: searchParams.get("participantId") || undefined,
      since: searchParams.get("since") || undefined,
      limit: searchParams.get("limit") || "100",
      includeAggregates: searchParams.get("includeAggregates") || "true",
    };

    const validation = QualityQuerySchema.safeParse(queryParams);
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

    // Verify user has access to this data (must be participant or caller)
    if (params.callId) {
      const participantCheck = await checkCallParticipant(
        params.callId,
        user.id,
      );
      if (!participantCheck.isParticipant) {
        return forbiddenResponse(
          "You do not have access to this call data",
          "ACCESS_DENIED",
        );
      }
    }

    // Fetch quality metrics from database
    const client = getServerApolloClient();
    const { data, errors } = await client.query({
      query: GET_QUALITY_REPORTS,
      variables: {
        callId: params.callId || null,
        participantId: params.participantId || null,
        since: params.since || null,
        limit: params.limit,
      },
      fetchPolicy: "no-cache",
    });

    if (errors?.length) {
      logger.error("[GET quality] GraphQL errors:", errors);
      return internalErrorResponse("Failed to fetch quality metrics");
    }

    const dbMetrics = data?.nchat_call_quality_reports || [];

    // Transform to response format
    const metrics = dbMetrics.map((m: Record<string, unknown>) => ({
      id: m.id,
      callId: m.call_id,
      participantId: m.participant_id,
      timestamp: m.reported_at,
      qualityScore: (() => {
        if (m.packet_loss_rate === null || m.packet_loss_rate === undefined)
          return null;
        const clampedLoss = Math.max(
          0,
          Math.min(100, m.packet_loss_rate as number),
        );
        return Math.round(100 - clampedLoss);
      })(),
      audio: {
        bitrate: m.bitrate_sent || null,
        packetsLost: m.packets_lost,
        packetsReceived: m.packets_received,
        jitter: m.jitter,
        rtt: m.round_trip_time,
        audioLevel: m.audio_level,
      },
      bandwidth: {
        upload: m.bitrate_sent,
        download: m.bitrate_received,
      },
      iceConnectionState: m.ice_connection_state,
      connectionState: m.connection_state,
      issues: detectIssuesFromDbMetrics(m),
    }));

    interface ResponseType {
      metrics: typeof metrics;
      count: number;
      aggregates?: {
        averageQualityScore: number | null;
        averagePacketLossRate: number | null;
        averageJitter: number | null;
        averageRtt: number | null;
        totalReports: number;
        qualityTrend: "improving" | "stable" | "degrading";
        commonIssues: Record<string, number>;
      };
    }

    const response: ResponseType = {
      metrics,
      count: metrics.length,
    };

    // Calculate aggregates if requested
    if (params.includeAggregates && params.callId && metrics.length > 0) {
      const { data: aggData } = await client.query({
        query: GET_QUALITY_AGGREGATES,
        variables: {
          callId: params.callId,
          since: params.since || null,
        },
        fetchPolicy: "no-cache",
      });

      const agg = aggData?.nchat_call_quality_reports_aggregate?.aggregate;
      if (agg) {
        response.aggregates = {
          averageQualityScore:
            agg.avg?.packet_loss_rate !== null
              ? Math.round(100 - parseFloat(agg.avg.packet_loss_rate))
              : null,
          averagePacketLossRate: agg.avg?.packet_loss_rate
            ? parseFloat(agg.avg.packet_loss_rate)
            : null,
          averageJitter: agg.avg?.jitter ? parseFloat(agg.avg.jitter) : null,
          averageRtt: agg.avg?.round_trip_time
            ? parseFloat(agg.avg.round_trip_time)
            : null,
          totalReports: parseInt(agg.count, 10) || 0,
          qualityTrend: calculateTrend(dbMetrics),
          commonIssues: getCommonIssues(metrics),
        };
      }
    }

    logger.info("GET /api/calls/quality - Success", {
      callId: params.callId,
      metricsCount: metrics.length,
    });

    return successResponse(response);
  } catch (error) {
    logger.error("Error fetching quality statistics", error as Error);
    return internalErrorResponse("Failed to fetch quality statistics");
  }
}

/**
 * Detect issues from database metrics
 */
function detectIssuesFromDbMetrics(m: Record<string, unknown>): QualityIssue[] {
  const issues: QualityIssue[] = [];

  const packetLossRate = m.packet_loss_rate as number | null;
  const jitter = m.jitter as number | null;
  const rtt = m.round_trip_time as number | null;
  const bitrateSent = m.bitrate_sent as number | null;
  const bitrateReceived = m.bitrate_received as number | null;

  if (packetLossRate !== null && packetLossRate > 5) {
    issues.push("high_packet_loss");
  }
  if (jitter !== null && jitter > 50) {
    issues.push("high_jitter");
  }
  if (rtt !== null && rtt > 150) {
    issues.push("high_rtt");
  }
  if (
    (bitrateSent !== null && bitrateSent < 500) ||
    (bitrateReceived !== null && bitrateReceived < 500)
  ) {
    issues.push("low_bandwidth");
  }

  return issues;
}
