/**
 * Call Quality Incident Analysis Service
 *
 * Provides incident analysis, call timeline replay, event correlation,
 * and root cause suggestions for call quality issues.
 */

import { gql } from "@apollo/client";
import { getServerApolloClient } from "@/lib/apollo-client";
import { logger } from "@/lib/logger";
import {
  getCallQualityMetricsService,
  type QualityMetricsSummary,
  type QualityLevel,
} from "./quality-metrics.service";
import {
  getCallQualityAlertingService,
  type Alert,
  type AlertType,
  type AlertSeverity,
} from "./quality-alerting.service";

// =============================================================================
// Types
// =============================================================================

export interface CallTimelineEvent {
  id: string;
  timestamp: Date;
  type:
    | "call_started"
    | "participant_joined"
    | "participant_left"
    | "quality_changed"
    | "alert_triggered"
    | "connection_issue"
    | "network_change"
    | "media_change"
    | "call_ended"
    | "metric_sample";
  userId?: string;
  participantId?: string;
  data: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | "critical";
  description: string;
}

export interface CallReplayData {
  callId: string;
  roomId?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  participants: ParticipantInfo[];
  timeline: CallTimelineEvent[];
  qualitySummary: QualityMetricsSummary | null;
  alerts: Alert[];
  incidents: Incident[];
}

export interface ParticipantInfo {
  id: string;
  participantId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  joinedAt: Date;
  leftAt?: Date;
  duration: number;
  networkType?: string;
  deviceInfo?: Record<string, unknown>;
  avgQualityScore: number;
  issues: string[];
}

export interface Incident {
  id: string;
  callId: string;
  type: IncidentType;
  severity: AlertSeverity;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  affectedParticipants: string[];
  rootCauses: RootCause[];
  correlatedEvents: string[];
  impact: ImpactAssessment;
  resolved: boolean;
  resolution?: string;
}

export type IncidentType =
  | "quality_degradation"
  | "connection_failure"
  | "audio_issues"
  | "video_issues"
  | "network_instability"
  | "participant_drop"
  | "call_failure";

export interface RootCause {
  type: RootCauseType;
  confidence: number; // 0-100
  description: string;
  evidence: string[];
  recommendations: string[];
}

export type RootCauseType =
  | "network_congestion"
  | "insufficient_bandwidth"
  | "high_latency"
  | "packet_loss"
  | "server_issue"
  | "client_issue"
  | "codec_issue"
  | "firewall_issue"
  | "nat_issue"
  | "device_issue"
  | "browser_issue"
  | "unknown";

export interface ImpactAssessment {
  severity: "low" | "medium" | "high" | "critical";
  affectedUsers: number;
  qualityDrop: number; // Percentage drop in quality
  durationAffected: number; // Seconds of affected call time
  userExperience: "minimal" | "noticeable" | "significant" | "severe";
}

export interface IncidentComparison {
  currentIncident: Incident;
  similarIncidents: SimilarIncident[];
  patterns: IncidentPattern[];
  recommendations: string[];
}

export interface SimilarIncident {
  incidentId: string;
  callId: string;
  similarity: number; // 0-100
  timestamp: Date;
  rootCauses: RootCauseType[];
  resolution?: string;
}

export interface IncidentPattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  affectedCalls: number;
  commonRootCause: RootCauseType;
}

export interface AnalysisFilters {
  callId?: string;
  roomId?: string;
  userId?: string;
  since?: Date;
  until?: Date;
  incidentTypes?: IncidentType[];
  severities?: AlertSeverity[];
}

// =============================================================================
// GraphQL Operations
// =============================================================================

const GET_CALL_TIMELINE = gql`
  query GetCallTimeline($callId: uuid!) {
    nchat_calls_by_pk(id: $callId) {
      id
      room_id
      caller_id
      status
      type
      started_at
      ended_at
      metadata
    }
    nchat_call_participants(
      where: { call_id: { _eq: $callId } }
      order_by: { joined_at: asc }
    ) {
      id
      user_id
      joined_at
      left_at
      connection_quality
      avg_packet_loss
      avg_jitter
      avg_round_trip_time
      network_type
      device_info
      user {
        id
        username
        display_name
        avatar_url
      }
    }
    nchat_call_events(
      where: { call_id: { _eq: $callId } }
      order_by: { created_at: asc }
    ) {
      id
      event_type
      user_id
      data
      created_at
    }
    nchat_call_quality_reports(
      where: { call_id: { _eq: $callId } }
      order_by: { reported_at: asc }
    ) {
      id
      participant_id
      reported_at
      packet_loss_rate
      jitter
      round_trip_time
      bitrate_sent
      bitrate_received
      audio_level
      connection_state
    }
  }
`;

const GET_HISTORICAL_INCIDENTS = gql`
  query GetHistoricalIncidents(
    $roomId: uuid
    $userId: uuid
    $since: timestamptz
    $limit: Int!
  ) {
    nchat_call_incidents(
      where: {
        _and: [{ room_id: { _eq: $roomId } }, { created_at: { _gte: $since } }]
      }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      id
      call_id
      room_id
      incident_type
      severity
      started_at
      ended_at
      affected_participants
      root_causes
      resolution
      created_at
    }
  }
`;

const INSERT_INCIDENT = gql`
  mutation InsertIncident($incident: nchat_call_incidents_insert_input!) {
    insert_nchat_call_incidents_one(object: $incident) {
      id
      call_id
      incident_type
      severity
      started_at
    }
  }
`;

// =============================================================================
// Service Implementation
// =============================================================================

export class IncidentAnalysisService {
  private client: ReturnType<typeof getServerApolloClient>;
  private metricsService: ReturnType<typeof getCallQualityMetricsService>;
  private alertingService: ReturnType<typeof getCallQualityAlertingService>;

  constructor() {
    this.client = getServerApolloClient();
    this.metricsService = getCallQualityMetricsService();
    this.alertingService = getCallQualityAlertingService();
  }

  /**
   * Get complete call replay data for incident analysis
   */
  async getCallReplayData(callId: string): Promise<CallReplayData | null> {
    try {
      const { data, errors } = await this.client.query({
        query: GET_CALL_TIMELINE,
        variables: { callId },
        fetchPolicy: "no-cache",
      });

      if (errors?.length) {
        logger.error("[IncidentAnalysis] Error fetching call data:", errors);
        return null;
      }

      const call = data?.nchat_calls_by_pk;
      if (!call) {
        return null;
      }

      const participants = data?.nchat_call_participants || [];
      const events = data?.nchat_call_events || [];
      const qualityReports = data?.nchat_call_quality_reports || [];

      // Build timeline
      const timeline = this.buildCallTimeline(
        call,
        participants,
        events,
        qualityReports,
      );

      // Get quality summary
      const qualitySummary =
        await this.metricsService.getCallQualitySummary(callId);

      // Get alerts
      const alertHistory = await this.alertingService.getAlertHistory({
        callId,
        limit: 100,
      });

      // Analyze incidents
      const incidents = this.analyzeIncidents(
        timeline,
        qualitySummary,
        alertHistory.alerts,
      );

      // Build participant info
      const participantInfos: ParticipantInfo[] = participants.map(
        (p: Record<string, unknown>) => {
          const user = p.user as Record<string, unknown>;
          const joinedAt = new Date(p.joined_at as string);
          const leftAt = p.left_at ? new Date(p.left_at as string) : undefined;
          const duration = leftAt
            ? (leftAt.getTime() - joinedAt.getTime()) / 1000
            : (new Date().getTime() - joinedAt.getTime()) / 1000;

          return {
            id: p.id as string,
            participantId: p.id as string,
            userId: p.user_id as string,
            username: (user?.username as string) || "",
            displayName: (user?.display_name as string) || "",
            avatarUrl: user?.avatar_url as string | undefined,
            joinedAt,
            leftAt,
            duration,
            networkType: p.network_type as string | undefined,
            deviceInfo: p.device_info as Record<string, unknown> | undefined,
            avgQualityScore: this.calculateParticipantQualityScore(p),
            issues: this.detectParticipantIssues(p),
          };
        },
      );

      const startTime = new Date(call.started_at);
      const endTime = call.ended_at ? new Date(call.ended_at) : new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      return {
        callId,
        roomId: call.room_id,
        startTime,
        endTime,
        duration,
        participants: participantInfos,
        timeline,
        qualitySummary,
        alerts: alertHistory.alerts,
        incidents,
      };
    } catch (error) {
      logger.error("[IncidentAnalysis] Error getting call replay data:", error);
      return null;
    }
  }

  /**
   * Build call timeline from events and metrics
   */
  private buildCallTimeline(
    call: Record<string, unknown>,
    participants: Array<Record<string, unknown>>,
    events: Array<Record<string, unknown>>,
    qualityReports: Array<Record<string, unknown>>,
  ): CallTimelineEvent[] {
    const timeline: CallTimelineEvent[] = [];

    // Call started event
    timeline.push({
      id: `call-start-${call.id}`,
      timestamp: new Date(call.started_at as string),
      type: "call_started",
      data: { callType: call.type, callerId: call.caller_id },
      description: "Call started",
    });

    // Participant events
    participants.forEach((p) => {
      const user = p.user as Record<string, unknown>;
      const displayName = (user?.display_name as string) || "Unknown";

      timeline.push({
        id: `join-${p.id}`,
        timestamp: new Date(p.joined_at as string),
        type: "participant_joined",
        userId: p.user_id as string,
        participantId: p.id as string,
        data: { networkType: p.network_type, deviceInfo: p.device_info },
        description: `${displayName} joined the call`,
      });

      if (p.left_at) {
        timeline.push({
          id: `leave-${p.id}`,
          timestamp: new Date(p.left_at as string),
          type: "participant_left",
          userId: p.user_id as string,
          participantId: p.id as string,
          data: {
            connectionQuality: p.connection_quality,
            avgPacketLoss: p.avg_packet_loss,
          },
          description: `${displayName} left the call`,
        });
      }
    });

    // Call events
    events.forEach((e) => {
      const eventType = e.event_type as string;
      const eventData = (e.data as Record<string, unknown>) || {};

      const severity = this.getEventSeverity(eventType, eventData);

      timeline.push({
        id: e.id as string,
        timestamp: new Date(e.created_at as string),
        type: this.mapEventType(eventType),
        userId: e.user_id as string | undefined,
        data: eventData,
        severity,
        description: this.generateEventDescription(eventType, eventData),
      });
    });

    // Quality metric samples (sample every 5th report for timeline)
    qualityReports
      .filter((_, index) => index % 5 === 0)
      .forEach((r, index) => {
        const packetLoss = r.packet_loss_rate as number;
        const jitter = r.jitter as number;
        const rtt = r.round_trip_time as number;

        let severity: "info" | "warning" | "error" | "critical" = "info";
        if (packetLoss > 10 || jitter > 100 || rtt > 500) severity = "critical";
        else if (packetLoss > 5 || jitter > 50 || rtt > 300) severity = "error";
        else if (packetLoss > 2 || jitter > 30 || rtt > 150)
          severity = "warning";

        timeline.push({
          id: `metric-${r.id}`,
          timestamp: new Date(r.reported_at as string),
          type: "metric_sample",
          participantId: r.participant_id as string,
          data: {
            packetLoss,
            jitter,
            rtt,
            bitrateSent: r.bitrate_sent,
            bitrateReceived: r.bitrate_received,
            audioLevel: r.audio_level,
          },
          severity,
          description: `Quality metrics: ${packetLoss?.toFixed(1)}% loss, ${jitter?.toFixed(0)}ms jitter, ${rtt?.toFixed(0)}ms RTT`,
        });
      });

    // Call ended event
    if (call.ended_at) {
      timeline.push({
        id: `call-end-${call.id}`,
        timestamp: new Date(call.ended_at as string),
        type: "call_ended",
        data: { status: call.status },
        description: "Call ended",
      });
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  }

  /**
   * Map event type to timeline event type
   */
  private mapEventType(eventType: string): CallTimelineEvent["type"] {
    const mapping: Record<string, CallTimelineEvent["type"]> = {
      quality_changed: "quality_changed",
      connection_issue: "connection_issue",
      network_changed: "network_change",
      media_changed: "media_change",
      alert_triggered: "alert_triggered",
    };
    return mapping[eventType] || "quality_changed";
  }

  /**
   * Get event severity
   */
  private getEventSeverity(
    eventType: string,
    data: Record<string, unknown>,
  ): "info" | "warning" | "error" | "critical" | undefined {
    if (eventType === "quality_changed") {
      const severity = data.severity as string;
      if (severity === "critical") return "critical";
      if (severity === "error" || severity === "warning")
        return severity as "warning" | "error";
      return "info";
    }

    if (eventType === "connection_issue") {
      return "error";
    }

    return "info";
  }

  /**
   * Generate human-readable event description
   */
  private generateEventDescription(
    eventType: string,
    data: Record<string, unknown>,
  ): string {
    switch (eventType) {
      case "quality_changed":
        return `Quality changed to ${data.qualityScore || "unknown"}%`;
      case "connection_issue":
        return `Connection issue: ${data.issue || "unknown"}`;
      case "network_changed":
        return `Network changed to ${data.networkType || "unknown"}`;
      case "media_changed":
        return `Media settings changed: ${data.change || "unknown"}`;
      default:
        return `Event: ${eventType}`;
    }
  }

  /**
   * Calculate participant quality score from metrics
   */
  private calculateParticipantQualityScore(
    participant: Record<string, unknown>,
  ): number {
    const packetLoss = (participant.avg_packet_loss as number) || 0;
    const jitter = (participant.avg_jitter as number) || 0;
    const rtt = (participant.avg_round_trip_time as number) || 0;

    return this.metricsService.calculateQualityScore(packetLoss, jitter, rtt);
  }

  /**
   * Detect issues for a participant
   */
  private detectParticipantIssues(
    participant: Record<string, unknown>,
  ): string[] {
    const issues: string[] = [];
    const packetLoss = (participant.avg_packet_loss as number) || 0;
    const jitter = (participant.avg_jitter as number) || 0;
    const rtt = (participant.avg_round_trip_time as number) || 0;

    if (packetLoss > 5) issues.push("high_packet_loss");
    if (jitter > 50) issues.push("high_jitter");
    if (rtt > 200) issues.push("high_rtt");
    if (participant.connection_quality === "poor")
      issues.push("poor_connection");

    return issues;
  }

  /**
   * Analyze incidents from timeline and alerts
   */
  private analyzeIncidents(
    timeline: CallTimelineEvent[],
    qualitySummary: QualityMetricsSummary | null,
    alerts: Alert[],
  ): Incident[] {
    const incidents: Incident[] = [];

    // Group consecutive quality degradation events
    const degradationEvents = timeline.filter(
      (e) => e.severity === "error" || e.severity === "critical",
    );

    if (degradationEvents.length > 0) {
      // Cluster events that are close in time (within 30 seconds)
      const clusters = this.clusterEvents(degradationEvents, 30000);

      clusters.forEach((cluster, index) => {
        const affectedParticipants = [
          ...new Set(
            cluster.map((e) => e.participantId).filter(Boolean) as string[],
          ),
        ];

        const rootCauses = this.analyzeRootCauses(cluster, qualitySummary);
        const impact = this.assessImpact(cluster, qualitySummary);

        incidents.push({
          id: `incident-${index}`,
          callId: qualitySummary?.callId || "",
          type: this.determineIncidentType(cluster),
          severity: this.determineIncidentSeverity(cluster),
          startTime: cluster[0].timestamp,
          endTime: cluster[cluster.length - 1].timestamp,
          duration:
            (cluster[cluster.length - 1].timestamp.getTime() -
              cluster[0].timestamp.getTime()) /
            1000,
          affectedParticipants,
          rootCauses,
          correlatedEvents: cluster.map((e) => e.id),
          impact,
          resolved: true,
        });
      });
    }

    return incidents;
  }

  /**
   * Cluster events by time proximity
   */
  private clusterEvents(
    events: CallTimelineEvent[],
    maxGapMs: number,
  ): CallTimelineEvent[][] {
    if (events.length === 0) return [];

    const clusters: CallTimelineEvent[][] = [[events[0]]];

    for (let i = 1; i < events.length; i++) {
      const currentCluster = clusters[clusters.length - 1];
      const lastEvent = currentCluster[currentCluster.length - 1];
      const gap = events[i].timestamp.getTime() - lastEvent.timestamp.getTime();

      if (gap <= maxGapMs) {
        currentCluster.push(events[i]);
      } else {
        clusters.push([events[i]]);
      }
    }

    return clusters;
  }

  /**
   * Determine incident type from events
   */
  private determineIncidentType(events: CallTimelineEvent[]): IncidentType {
    const types = events.map((e) => e.type);

    if (types.includes("connection_issue")) return "connection_failure";
    if (types.some((t) => t === "participant_left")) return "participant_drop";

    // Check metric data for specific issues
    const metricEvents = events.filter((e) => e.type === "metric_sample");
    if (metricEvents.length > 0) {
      const hasHighPacketLoss = metricEvents.some(
        (e) => ((e.data.packetLoss as number) || 0) > 5,
      );
      const hasHighJitter = metricEvents.some(
        (e) => ((e.data.jitter as number) || 0) > 50,
      );

      if (hasHighPacketLoss || hasHighJitter) {
        return "network_instability";
      }
    }

    return "quality_degradation";
  }

  /**
   * Determine incident severity
   */
  private determineIncidentSeverity(
    events: CallTimelineEvent[],
  ): AlertSeverity {
    const severities = events.map((e) => e.severity).filter(Boolean) as Array<
      "info" | "warning" | "error" | "critical"
    >;

    if (severities.includes("critical")) return "critical";
    if (severities.includes("error")) return "error";
    if (severities.includes("warning")) return "warning";
    return "info";
  }

  /**
   * Analyze root causes from events and metrics
   */
  private analyzeRootCauses(
    events: CallTimelineEvent[],
    qualitySummary: QualityMetricsSummary | null,
  ): RootCause[] {
    const rootCauses: RootCause[] = [];

    // Check for packet loss issues
    const metricEvents = events.filter((e) => e.type === "metric_sample");
    const avgPacketLoss =
      metricEvents.length > 0
        ? metricEvents.reduce(
            (sum, e) => sum + ((e.data.packetLoss as number) || 0),
            0,
          ) / metricEvents.length
        : 0;

    if (avgPacketLoss > 5) {
      rootCauses.push({
        type: "packet_loss",
        confidence: Math.min(90, 50 + avgPacketLoss * 4),
        description: "High packet loss detected",
        evidence: [
          `Average packet loss: ${avgPacketLoss.toFixed(1)}%`,
          `${metricEvents.filter((e) => ((e.data.packetLoss as number) || 0) > 5).length} samples with high packet loss`,
        ],
        recommendations: [
          "Check network connection stability",
          "Reduce video quality to conserve bandwidth",
          "Switch to wired connection if possible",
        ],
      });
    }

    // Check for high latency
    const avgRtt =
      metricEvents.length > 0
        ? metricEvents.reduce(
            (sum, e) => sum + ((e.data.rtt as number) || 0),
            0,
          ) / metricEvents.length
        : 0;

    if (avgRtt > 200) {
      rootCauses.push({
        type: "high_latency",
        confidence: Math.min(85, 40 + avgRtt / 5),
        description: "High network latency detected",
        evidence: [
          `Average RTT: ${avgRtt.toFixed(0)}ms`,
          `Peak RTT: ${Math.max(...metricEvents.map((e) => (e.data.rtt as number) || 0)).toFixed(0)}ms`,
        ],
        recommendations: [
          "Check for network congestion",
          "Disable VPN if in use",
          "Connect to a closer server region",
        ],
      });
    }

    // Check for bandwidth issues
    const avgBitrate =
      metricEvents.length > 0
        ? metricEvents.reduce(
            (sum, e) => sum + ((e.data.bitrateSent as number) || 0),
            0,
          ) / metricEvents.length
        : 0;

    if (avgBitrate < 100 && avgBitrate > 0) {
      rootCauses.push({
        type: "insufficient_bandwidth",
        confidence: Math.min(80, 30 + (100 - avgBitrate)),
        description: "Insufficient bandwidth detected",
        evidence: [
          `Average bitrate: ${avgBitrate.toFixed(0)}kbps`,
          "Bitrate below minimum threshold for quality calls",
        ],
        recommendations: [
          "Disable video to reduce bandwidth usage",
          "Close other bandwidth-intensive applications",
          "Check internet connection speed",
        ],
      });
    }

    // Check for connection events
    const connectionIssues = events.filter(
      (e) => e.type === "connection_issue",
    );
    if (connectionIssues.length > 0) {
      rootCauses.push({
        type: "network_congestion",
        confidence: 70,
        description: "Network connection issues detected",
        evidence: [
          `${connectionIssues.length} connection issues recorded`,
          `Issues at: ${connectionIssues.map((e) => e.timestamp.toISOString()).join(", ")}`,
        ],
        recommendations: [
          "Check network stability",
          "Restart router if issues persist",
          "Contact ISP if problem continues",
        ],
      });
    }

    // If no specific root cause found
    if (rootCauses.length === 0) {
      rootCauses.push({
        type: "unknown",
        confidence: 30,
        description: "Unable to determine specific root cause",
        evidence: ["Multiple factors may have contributed to the incident"],
        recommendations: [
          "Monitor for recurring issues",
          "Check system resources during calls",
          "Review network configuration",
        ],
      });
    }

    // Sort by confidence
    rootCauses.sort((a, b) => b.confidence - a.confidence);

    return rootCauses;
  }

  /**
   * Assess incident impact
   */
  private assessImpact(
    events: CallTimelineEvent[],
    qualitySummary: QualityMetricsSummary | null,
  ): ImpactAssessment {
    const affectedParticipants = [
      ...new Set(events.map((e) => e.participantId).filter(Boolean)),
    ].length;

    const duration =
      events.length > 1
        ? (events[events.length - 1].timestamp.getTime() -
            events[0].timestamp.getTime()) /
          1000
        : 0;

    const criticalEvents = events.filter(
      (e) => e.severity === "critical",
    ).length;
    const errorEvents = events.filter((e) => e.severity === "error").length;

    // Determine severity
    let severity: "low" | "medium" | "high" | "critical";
    if (criticalEvents > 0 || (errorEvents > 5 && duration > 60)) {
      severity = "critical";
    } else if (errorEvents > 2 || duration > 30) {
      severity = "high";
    } else if (errorEvents > 0 || duration > 10) {
      severity = "medium";
    } else {
      severity = "low";
    }

    // Calculate quality drop
    const qualityDrop = qualitySummary
      ? Math.max(0, 100 - qualitySummary.overallScore)
      : 0;

    // Determine user experience impact
    let userExperience: "minimal" | "noticeable" | "significant" | "severe";
    if (severity === "critical") userExperience = "severe";
    else if (severity === "high") userExperience = "significant";
    else if (severity === "medium") userExperience = "noticeable";
    else userExperience = "minimal";

    return {
      severity,
      affectedUsers: affectedParticipants,
      qualityDrop,
      durationAffected: duration,
      userExperience,
    };
  }

  /**
   * Compare incident with historical data
   */
  async compareWithHistory(
    incident: Incident,
    filters: AnalysisFilters,
  ): Promise<IncidentComparison> {
    try {
      const { data } = await this.client.query({
        query: GET_HISTORICAL_INCIDENTS,
        variables: {
          roomId: filters.roomId || null,
          userId: filters.userId || null,
          since:
            filters.since?.toISOString() ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          limit: 50,
        },
        fetchPolicy: "no-cache",
      });

      const historicalIncidents = data?.nchat_call_incidents || [];

      // Find similar incidents
      const similarIncidents: SimilarIncident[] = historicalIncidents
        .map((h: Record<string, unknown>) => {
          const similarity = this.calculateIncidentSimilarity(incident, h);
          return {
            incidentId: h.id as string,
            callId: h.call_id as string,
            similarity,
            timestamp: new Date(h.created_at as string),
            rootCauses: ((h.root_causes as string[]) || []) as RootCauseType[],
            resolution: h.resolution as string | undefined,
          };
        })
        .filter((s: SimilarIncident) => s.similarity > 50)
        .sort(
          (a: SimilarIncident, b: SimilarIncident) =>
            b.similarity - a.similarity,
        )
        .slice(0, 5);

      // Identify patterns
      const patterns = this.identifyPatterns(incident, historicalIncidents);

      // Generate recommendations based on history
      const recommendations = this.generateHistoricalRecommendations(
        incident,
        similarIncidents,
      );

      return {
        currentIncident: incident,
        similarIncidents,
        patterns,
        recommendations,
      };
    } catch (error) {
      logger.error("[IncidentAnalysis] Error comparing with history:", error);
      return {
        currentIncident: incident,
        similarIncidents: [],
        patterns: [],
        recommendations: incident.rootCauses[0]?.recommendations || [],
      };
    }
  }

  /**
   * Calculate similarity between incidents
   */
  private calculateIncidentSimilarity(
    current: Incident,
    historical: Record<string, unknown>,
  ): number {
    let similarity = 0;

    // Same incident type
    if (current.type === historical.incident_type) {
      similarity += 40;
    }

    // Same severity
    if (current.severity === historical.severity) {
      similarity += 20;
    }

    // Similar root causes
    const historicalCauses = (historical.root_causes as string[]) || [];
    const currentCauses = current.rootCauses.map((rc) => rc.type);
    const commonCauses = currentCauses.filter((c) =>
      historicalCauses.includes(c),
    );
    similarity += Math.min(30, commonCauses.length * 15);

    // Similar affected participant count
    const histAffected = ((historical.affected_participants as string[]) || [])
      .length;
    const diffParticipants = Math.abs(
      current.affectedParticipants.length - histAffected,
    );
    if (diffParticipants === 0) similarity += 10;
    else if (diffParticipants <= 2) similarity += 5;

    return Math.min(100, similarity);
  }

  /**
   * Identify incident patterns
   */
  private identifyPatterns(
    current: Incident,
    historical: Array<Record<string, unknown>>,
  ): IncidentPattern[] {
    const patterns: IncidentPattern[] = [];

    // Group by incident type
    const typeGroups: Record<string, Array<Record<string, unknown>>> = {};
    historical.forEach((h) => {
      const type = h.incident_type as string;
      if (!typeGroups[type]) typeGroups[type] = [];
      typeGroups[type].push(h);
    });

    // Identify frequent incident types
    Object.entries(typeGroups).forEach(([type, incidents]) => {
      if (incidents.length >= 3) {
        // Find most common root cause
        const causeCounts: Record<string, number> = {};
        incidents.forEach((inc) => {
          const causes = (inc.root_causes as string[]) || [];
          causes.forEach((c) => {
            causeCounts[c] = (causeCounts[c] || 0) + 1;
          });
        });

        const commonCause = Object.entries(causeCounts).sort(
          (a, b) => b[1] - a[1],
        )[0];

        patterns.push({
          pattern: `Recurring ${type} incidents`,
          frequency: incidents.length,
          lastOccurrence: new Date(
            Math.max(
              ...incidents.map((i) =>
                new Date(i.created_at as string).getTime(),
              ),
            ),
          ),
          affectedCalls: incidents.length,
          commonRootCause: (commonCause?.[0] as RootCauseType) || "unknown",
        });
      }
    });

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate recommendations based on historical data
   */
  private generateHistoricalRecommendations(
    current: Incident,
    similar: SimilarIncident[],
  ): string[] {
    const recommendations: string[] = [];

    // Get resolutions from similar incidents
    const resolutions = similar
      .filter((s) => s.resolution)
      .map((s) => s.resolution!);
    if (resolutions.length > 0) {
      recommendations.push(
        `Previous resolution that worked: ${resolutions[0]}`,
      );
    }

    // Add recommendations based on patterns
    const commonCauses = similar.flatMap((s) => s.rootCauses);
    const causeCounts: Record<string, number> = {};
    commonCauses.forEach((c) => {
      causeCounts[c] = (causeCounts[c] || 0) + 1;
    });

    const topCause = Object.entries(causeCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCause) {
      recommendations.push(
        `Most common root cause in similar incidents: ${topCause[0]} (${topCause[1]} occurrences)`,
      );
    }

    // Add current incident's root cause recommendations
    if (current.rootCauses.length > 0) {
      recommendations.push(...current.rootCauses[0].recommendations);
    }

    return [...new Set(recommendations)];
  }

  /**
   * Store incident for future analysis
   */
  async storeIncident(incident: Incident): Promise<string | null> {
    try {
      const { data, errors } = await this.client.mutate({
        mutation: INSERT_INCIDENT,
        variables: {
          incident: {
            call_id: incident.callId,
            room_id: incident.callId, // Would need actual room_id
            incident_type: incident.type,
            severity: incident.severity,
            started_at: incident.startTime.toISOString(),
            ended_at: incident.endTime?.toISOString(),
            affected_participants: incident.affectedParticipants,
            root_causes: incident.rootCauses.map((rc) => rc.type),
            resolution: incident.resolution,
          },
        },
      });

      if (errors?.length) {
        logger.error("[IncidentAnalysis] Error storing incident:", errors);
        return null;
      }

      return data?.insert_nchat_call_incidents_one?.id || null;
    } catch (error) {
      logger.error("[IncidentAnalysis] Error storing incident:", error);
      return null;
    }
  }
}

// Singleton instance
let serviceInstance: IncidentAnalysisService | null = null;

export function getIncidentAnalysisService(): IncidentAnalysisService {
  if (!serviceInstance) {
    serviceInstance = new IncidentAnalysisService();
  }
  return serviceInstance;
}

export default IncidentAnalysisService;
