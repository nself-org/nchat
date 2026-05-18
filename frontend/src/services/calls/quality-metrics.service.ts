/**
 * Call Quality Metrics Service
 *
 * Provides comprehensive metrics aggregation for call quality observability.
 * Supports per-call, per-user, per-room, and time-series aggregations.
 * Calculates percentiles (P50, P95, P99) for quality metrics.
 */

import { gql } from "@apollo/client";
import { getServerApolloClient } from "@/lib/apollo-client";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type QualityLevel = "excellent" | "good" | "fair" | "poor" | "critical";

export type NetworkType = "cellular" | "wifi" | "ethernet" | "unknown";

export type TimeGranularity = "minute" | "hour" | "day" | "week" | "month";

export interface QualityMetricsSummary {
  callId: string;
  roomId?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  participantCount: number;

  // Audio quality
  audio: {
    avgMos: number;
    avgJitter: number;
    avgPacketLoss: number;
    avgBitrate: number;
    p50Mos: number;
    p95Mos: number;
    p99Mos: number;
  };

  // Video quality
  video: {
    avgBitrate: number;
    avgFrameRate: number;
    avgResolutionWidth: number;
    avgResolutionHeight: number;
    avgPacketLoss: number;
    p50FrameRate: number;
    p95FrameRate: number;
  };

  // Network metrics
  network: {
    avgRtt: number;
    avgBandwidth: number;
    p50Rtt: number;
    p95Rtt: number;
    p99Rtt: number;
  };

  // Overall quality
  overallScore: number;
  qualityLevel: QualityLevel;
  issuesDetected: string[];
  alertsTriggered: number;
}

export interface UserQualityHistory {
  userId: string;
  username: string;
  displayName: string;
  callCount: number;
  totalDuration: number;
  avgQualityScore: number;
  qualityLevel: QualityLevel;
  issuesFrequency: Record<string, number>;
  networkTypeDistribution: Record<NetworkType, number>;
  deviceDistribution: Record<string, number>;
  recentCalls: Array<{
    callId: string;
    timestamp: Date;
    duration: number;
    qualityScore: number;
    issues: string[];
  }>;
}

export interface RoomQualityStats {
  roomId: string;
  roomName: string;
  callCount: number;
  totalDuration: number;
  avgQualityScore: number;
  avgParticipants: number;
  peakParticipants: number;
  issuesFrequency: Record<string, number>;
  qualityTrend: "improving" | "stable" | "degrading";
  timeSeriesData: Array<{
    timestamp: Date;
    qualityScore: number;
    callCount: number;
    issueCount: number;
  }>;
}

export interface QualityTimeSeriesPoint {
  timestamp: Date;
  callCount: number;
  avgQualityScore: number;
  avgMos: number;
  avgPacketLoss: number;
  avgJitter: number;
  avgRtt: number;
  issueCount: number;
  alertCount: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
}

export interface PercentileMetrics {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface GeographicBreakdown {
  region: string;
  country: string;
  callCount: number;
  avgQualityScore: number;
  avgRtt: number;
  issuesFrequency: Record<string, number>;
}

export interface NetworkTypeBreakdown {
  networkType: NetworkType;
  callCount: number;
  participantCount: number;
  avgQualityScore: number;
  avgBandwidth: number;
  issuesFrequency: Record<string, number>;
}

export interface DeviceBreakdown {
  deviceType: string;
  browser: string;
  os: string;
  callCount: number;
  avgQualityScore: number;
  issuesFrequency: Record<string, number>;
}

export interface QualityFilters {
  startDate?: Date;
  endDate?: Date;
  callIds?: string[];
  roomIds?: string[];
  userIds?: string[];
  networkTypes?: NetworkType[];
  qualityLevels?: QualityLevel[];
  minQualityScore?: number;
  maxQualityScore?: number;
  hasIssues?: boolean;
}

// =============================================================================
// GraphQL Queries
// =============================================================================

const GET_CALL_QUALITY_REPORTS = gql`
  query GetCallQualityReports(
    $callId: uuid
    $since: timestamptz
    $until: timestamptz
    $limit: Int!
  ) {
    nchat_call_quality_reports(
      where: {
        _and: [
          { call_id: { _eq: $callId } }
          { reported_at: { _gte: $since } }
          { reported_at: { _lte: $until } }
        ]
      }
      order_by: { reported_at: asc }
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

const GET_CALL_EVENTS = gql`
  query GetCallEvents($callId: uuid!, $eventTypes: [String!]) {
    nchat_call_events(
      where: { call_id: { _eq: $callId }, event_type: { _in: $eventTypes } }
      order_by: { created_at: asc }
    ) {
      id
      call_id
      user_id
      event_type
      data
      created_at
    }
  }
`;

const GET_CALL_PARTICIPANTS = gql`
  query GetCallParticipants($callId: uuid!) {
    nchat_call_participants(where: { call_id: { _eq: $callId } }) {
      id
      call_id
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
  }
`;

const GET_CALLS_BY_ROOM = gql`
  query GetCallsByRoom($roomId: uuid!, $since: timestamptz, $limit: Int!) {
    nchat_calls(
      where: { room_id: { _eq: $roomId }, started_at: { _gte: $since } }
      order_by: { started_at: desc }
      limit: $limit
    ) {
      id
      room_id
      caller_id
      status
      started_at
      ended_at
      type
      participants_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

const GET_USER_CALL_HISTORY = gql`
  query GetUserCallHistory($userId: uuid!, $since: timestamptz, $limit: Int!) {
    nchat_call_participants(
      where: { user_id: { _eq: $userId }, joined_at: { _gte: $since } }
      order_by: { joined_at: desc }
      limit: $limit
    ) {
      id
      call_id
      joined_at
      left_at
      connection_quality
      avg_packet_loss
      avg_jitter
      avg_round_trip_time
      network_type
      device_info
      call {
        id
        room_id
        status
        started_at
        ended_at
        type
      }
    }
  }
`;

const GET_QUALITY_AGGREGATES_BY_TIME = gql`
  query GetQualityAggregatesByTime(
    $since: timestamptz!
    $until: timestamptz!
    $granularity: String!
  ) {
    nchat_call_quality_reports_aggregate(
      where: { reported_at: { _gte: $since, _lte: $until } }
    ) {
      aggregate {
        count
        avg {
          packet_loss_rate
          jitter
          round_trip_time
          bitrate_sent
          bitrate_received
          audio_level
        }
      }
    }
  }
`;

const INSERT_QUALITY_ALERT = gql`
  mutation InsertQualityAlert($alert: nchat_call_quality_alerts_insert_input!) {
    insert_nchat_call_quality_alerts_one(object: $alert) {
      id
      call_id
      severity
      alert_type
      message
      created_at
    }
  }
`;

// =============================================================================
// Service Implementation
// =============================================================================

export class CallQualityMetricsService {
  private client: ReturnType<typeof getServerApolloClient>;

  constructor() {
    this.client = getServerApolloClient();
  }

  /**
   * Calculate MOS (Mean Opinion Score) from metrics
   * Based on ITU-T G.107 E-model simplified
   */
  calculateMOS(packetLoss: number, jitter: number, rtt: number): number {
    // Base R-factor
    let r = 93.2;

    // Impact of delay (RTT)
    const d = rtt / 2; // One-way delay
    const id = 0.024 * d + 0.11 * (d - 177.3) * (d > 177.3 ? 1 : 0);
    r -= id;

    // Impact of packet loss
    const ie = 0 + 30 * Math.log(1 + 15 * packetLoss);
    r -= ie;

    // Impact of jitter (approximation)
    r -= jitter * 0.1;

    // Clamp R-factor
    r = Math.max(0, Math.min(100, r));

    // Convert R-factor to MOS
    if (r < 0) return 1;
    if (r > 100) return 4.5;

    const mos = 1 + 0.035 * r + 7e-6 * r * (r - 60) * (100 - r);
    return Math.max(1, Math.min(5, mos));
  }

  /**
   * Determine quality level from MOS score
   */
  getQualityLevelFromMOS(mos: number): QualityLevel {
    if (mos >= 4.3) return "excellent";
    if (mos >= 4.0) return "good";
    if (mos >= 3.6) return "fair";
    if (mos >= 3.1) return "poor";
    return "critical";
  }

  /**
   * Calculate quality score (0-100) from metrics
   */
  calculateQualityScore(
    packetLoss: number,
    jitter: number,
    rtt: number,
  ): number {
    const mos = this.calculateMOS(packetLoss, jitter, rtt);
    // Map MOS (1-5) to score (0-100)
    return Math.round(((mos - 1) / 4) * 100);
  }

  /**
   * Calculate percentiles from an array of values
   */
  calculatePercentiles(values: number[]): PercentileMetrics {
    if (values.length === 0) {
      return { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);

    const percentile = (p: number): number => {
      const index = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      if (lower === upper) return sorted[lower];
      return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
    };

    return {
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
    };
  }

  /**
   * Get call quality summary for a specific call
   */
  async getCallQualitySummary(
    callId: string,
  ): Promise<QualityMetricsSummary | null> {
    try {
      const [reportsResult, participantsResult, eventsResult] =
        await Promise.all([
          this.client.query({
            query: GET_CALL_QUALITY_REPORTS,
            variables: { callId, limit: 10000 },
            fetchPolicy: "no-cache",
          }),
          this.client.query({
            query: GET_CALL_PARTICIPANTS,
            variables: { callId },
            fetchPolicy: "no-cache",
          }),
          this.client.query({
            query: GET_CALL_EVENTS,
            variables: {
              callId,
              eventTypes: ["quality_changed", "connection_issue"],
            },
            fetchPolicy: "no-cache",
          }),
        ]);

      const reports = reportsResult.data?.nchat_call_quality_reports || [];
      const participants =
        participantsResult.data?.nchat_call_participants || [];
      const events = eventsResult.data?.nchat_call_events || [];

      if (reports.length === 0) {
        return null;
      }

      // Calculate metrics from reports
      const packetLossValues: number[] = [];
      const jitterValues: number[] = [];
      const rttValues: number[] = [];
      const bitrateValues: number[] = [];
      const audioLevelValues: number[] = [];

      reports.forEach((report: Record<string, unknown>) => {
        if (report.packet_loss_rate !== null) {
          packetLossValues.push(report.packet_loss_rate as number);
        }
        if (report.jitter !== null) {
          jitterValues.push(report.jitter as number);
        }
        if (report.round_trip_time !== null) {
          rttValues.push(report.round_trip_time as number);
        }
        if (report.bitrate_sent !== null) {
          bitrateValues.push(report.bitrate_sent as number);
        }
        if (report.audio_level !== null) {
          audioLevelValues.push(report.audio_level as number);
        }
      });

      // Calculate MOS scores
      const mosValues = packetLossValues.map((loss, i) =>
        this.calculateMOS(loss, jitterValues[i] || 0, rttValues[i] || 0),
      );

      const avgPacketLoss =
        packetLossValues.length > 0
          ? packetLossValues.reduce((a, b) => a + b, 0) /
            packetLossValues.length
          : 0;
      const avgJitter =
        jitterValues.length > 0
          ? jitterValues.reduce((a, b) => a + b, 0) / jitterValues.length
          : 0;
      const avgRtt =
        rttValues.length > 0
          ? rttValues.reduce((a, b) => a + b, 0) / rttValues.length
          : 0;
      const avgBitrate =
        bitrateValues.length > 0
          ? bitrateValues.reduce((a, b) => a + b, 0) / bitrateValues.length
          : 0;
      const avgMos =
        mosValues.length > 0
          ? mosValues.reduce((a, b) => a + b, 0) / mosValues.length
          : 0;

      const mosPercentiles = this.calculatePercentiles(mosValues);
      const rttPercentiles = this.calculatePercentiles(rttValues);

      // Determine issues and alerts
      const issues: string[] = [];
      if (avgPacketLoss > 5) issues.push("high_packet_loss");
      if (avgJitter > 50) issues.push("high_jitter");
      if (avgRtt > 200) issues.push("high_rtt");
      if (avgBitrate < 100) issues.push("low_bandwidth");

      const alertsTriggered = events.filter(
        (e: { event_type: string }) =>
          e.event_type === "quality_changed" ||
          e.event_type === "connection_issue",
      ).length;

      // Calculate timestamps
      const timestamps = reports.map(
        (r: { reported_at: string }) => new Date(r.reported_at),
      );
      const startTime = new Date(
        Math.min(...timestamps.map((t: Date) => t.getTime())),
      );
      const endTime = new Date(
        Math.max(...timestamps.map((t: Date) => t.getTime())),
      );
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      const overallScore = this.calculateQualityScore(
        avgPacketLoss,
        avgJitter,
        avgRtt,
      );

      return {
        callId,
        roomId: participants[0]?.call?.room_id,
        startTime,
        endTime,
        duration,
        participantCount: participants.length,
        audio: {
          avgMos,
          avgJitter,
          avgPacketLoss,
          avgBitrate,
          p50Mos: mosPercentiles.p50,
          p95Mos: mosPercentiles.p95,
          p99Mos: mosPercentiles.p99,
        },
        video: {
          avgBitrate: 0, // Would need separate video metrics
          avgFrameRate: 0,
          avgResolutionWidth: 0,
          avgResolutionHeight: 0,
          avgPacketLoss: 0,
          p50FrameRate: 0,
          p95FrameRate: 0,
        },
        network: {
          avgRtt,
          avgBandwidth: avgBitrate,
          p50Rtt: rttPercentiles.p50,
          p95Rtt: rttPercentiles.p95,
          p99Rtt: rttPercentiles.p99,
        },
        overallScore,
        qualityLevel: this.getQualityLevelFromMOS(avgMos),
        issuesDetected: issues,
        alertsTriggered,
      };
    } catch (error) {
      logger.error(
        "[CallQualityMetricsService] Error getting call summary:",
        error,
      );
      return null;
    }
  }

  /**
   * Get user quality history
   */
  async getUserQualityHistory(
    userId: string,
    since?: Date,
    limit: number = 50,
  ): Promise<UserQualityHistory | null> {
    try {
      const { data, errors } = await this.client.query({
        query: GET_USER_CALL_HISTORY,
        variables: {
          userId,
          since:
            since?.toISOString() ||
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          limit,
        },
        fetchPolicy: "no-cache",
      });

      if (errors?.length) {
        logger.error("[CallQualityMetricsService] GraphQL errors:", errors);
        return null;
      }

      const participations = data?.nchat_call_participants || [];

      if (participations.length === 0) {
        return null;
      }

      // Aggregate metrics
      const qualityScores: number[] = [];
      const issuesFrequency: Record<string, number> = {};
      const networkTypeDistribution: Record<NetworkType, number> = {
        cellular: 0,
        wifi: 0,
        ethernet: 0,
        unknown: 0,
      };
      const deviceDistribution: Record<string, number> = {};
      let totalDuration = 0;

      const recentCalls = participations
        .slice(0, 10)
        .map((p: Record<string, unknown>) => {
          const packetLoss = (p.avg_packet_loss as number) || 0;
          const jitter = (p.avg_jitter as number) || 0;
          const rtt = (p.avg_round_trip_time as number) || 0;
          const score = this.calculateQualityScore(packetLoss, jitter, rtt);
          qualityScores.push(score);

          // Track issues
          const issues: string[] = [];
          if (packetLoss > 5) {
            issues.push("high_packet_loss");
            issuesFrequency.high_packet_loss =
              (issuesFrequency.high_packet_loss || 0) + 1;
          }
          if (jitter > 50) {
            issues.push("high_jitter");
            issuesFrequency.high_jitter =
              (issuesFrequency.high_jitter || 0) + 1;
          }
          if (rtt > 200) {
            issues.push("high_rtt");
            issuesFrequency.high_rtt = (issuesFrequency.high_rtt || 0) + 1;
          }

          // Track network type
          const networkType = (p.network_type as NetworkType) || "unknown";
          networkTypeDistribution[networkType]++;

          // Track device
          const deviceInfo = p.device_info as Record<string, string> | null;
          if (deviceInfo?.browser) {
            deviceDistribution[deviceInfo.browser] =
              (deviceDistribution[deviceInfo.browser] || 0) + 1;
          }

          // Calculate duration
          if (p.joined_at && p.left_at) {
            const joined = new Date(p.joined_at as string);
            const left = new Date(p.left_at as string);
            totalDuration += (left.getTime() - joined.getTime()) / 1000;
          }

          const call = p.call as Record<string, unknown>;
          return {
            callId: p.call_id as string,
            timestamp: new Date(p.joined_at as string),
            duration: p.left_at
              ? (new Date(p.left_at as string).getTime() -
                  new Date(p.joined_at as string).getTime()) /
                1000
              : 0,
            qualityScore: score,
            issues,
          };
        });

      const avgQualityScore =
        qualityScores.length > 0
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          : 0;

      // Get user info from first participation
      const firstUser = participations[0]?.user as Record<string, unknown>;

      return {
        userId,
        username: (firstUser?.username as string) || "",
        displayName: (firstUser?.display_name as string) || "",
        callCount: participations.length,
        totalDuration,
        avgQualityScore,
        qualityLevel: this.getQualityLevelFromMOS(
          1 + (avgQualityScore / 100) * 4,
        ),
        issuesFrequency,
        networkTypeDistribution,
        deviceDistribution,
        recentCalls,
      };
    } catch (error) {
      logger.error(
        "[CallQualityMetricsService] Error getting user history:",
        error,
      );
      return null;
    }
  }

  /**
   * Get room quality statistics
   */
  async getRoomQualityStats(
    roomId: string,
    since?: Date,
    granularity: TimeGranularity = "hour",
  ): Promise<RoomQualityStats | null> {
    try {
      const sinceDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data, errors } = await this.client.query({
        query: GET_CALLS_BY_ROOM,
        variables: {
          roomId,
          since: sinceDate.toISOString(),
          limit: 1000,
        },
        fetchPolicy: "no-cache",
      });

      if (errors?.length) {
        logger.error("[CallQualityMetricsService] GraphQL errors:", errors);
        return null;
      }

      const calls = data?.nchat_calls || [];

      if (calls.length === 0) {
        return null;
      }

      // Get quality summaries for each call
      const qualitySummaries = await Promise.all(
        calls
          .slice(0, 50)
          .map((call: { id: string }) => this.getCallQualitySummary(call.id)),
      );

      const validSummaries = qualitySummaries.filter(
        (s) => s !== null,
      ) as QualityMetricsSummary[];

      if (validSummaries.length === 0) {
        return null;
      }

      // Aggregate statistics
      const qualityScores = validSummaries.map((s) => s.overallScore);
      const participantCounts = validSummaries.map((s) => s.participantCount);
      const durations = validSummaries.map((s) => s.duration);
      const issuesFrequency: Record<string, number> = {};

      validSummaries.forEach((s) => {
        s.issuesDetected.forEach((issue) => {
          issuesFrequency[issue] = (issuesFrequency[issue] || 0) + 1;
        });
      });

      const avgQualityScore =
        qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
      const avgParticipants =
        participantCounts.reduce((a, b) => a + b, 0) / participantCounts.length;
      const peakParticipants = Math.max(...participantCounts);
      const totalDuration = durations.reduce((a, b) => a + b, 0);

      // Generate time series data
      const rawTimeSeries = this.generateTimeSeries(
        validSummaries,
        sinceDate,
        new Date(),
        granularity,
      );

      // Map to the expected format for RoomQualityStats
      const timeSeriesData = rawTimeSeries.map((point) => ({
        timestamp: point.timestamp,
        qualityScore: point.avgQualityScore,
        callCount: point.callCount,
        issueCount: point.issueCount,
      }));

      // Calculate quality trend
      const qualityTrend = this.calculateQualityTrend(rawTimeSeries);

      return {
        roomId,
        roomName: "", // Would need to query room info
        callCount: calls.length,
        totalDuration,
        avgQualityScore,
        avgParticipants,
        peakParticipants,
        issuesFrequency,
        qualityTrend,
        timeSeriesData,
      };
    } catch (error) {
      logger.error(
        "[CallQualityMetricsService] Error getting room stats:",
        error,
      );
      return null;
    }
  }

  /**
   * Generate time series data from quality summaries
   */
  private generateTimeSeries(
    summaries: QualityMetricsSummary[],
    start: Date,
    end: Date,
    granularity: TimeGranularity,
  ): QualityTimeSeriesPoint[] {
    const buckets = new Map<string, QualityMetricsSummary[]>();

    // Group summaries by time bucket
    summaries.forEach((summary) => {
      const bucketKey = this.getTimeBucketKey(summary.startTime, granularity);
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(summary);
    });

    // Generate complete time series with all buckets
    const result: QualityTimeSeriesPoint[] = [];
    const current = new Date(start);

    while (current <= end) {
      const bucketKey = this.getTimeBucketKey(current, granularity);
      const bucketSummaries = buckets.get(bucketKey) || [];

      const qualityDistribution = {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        critical: 0,
      };
      let totalScore = 0;
      let totalMos = 0;
      let totalPacketLoss = 0;
      let totalJitter = 0;
      let totalRtt = 0;
      let issueCount = 0;
      let alertCount = 0;

      bucketSummaries.forEach((s) => {
        totalScore += s.overallScore;
        totalMos += s.audio.avgMos;
        totalPacketLoss += s.audio.avgPacketLoss;
        totalJitter += s.audio.avgJitter;
        totalRtt += s.network.avgRtt;
        issueCount += s.issuesDetected.length;
        alertCount += s.alertsTriggered;
        qualityDistribution[s.qualityLevel]++;
      });

      const count = bucketSummaries.length;

      result.push({
        timestamp: new Date(current),
        callCount: count,
        avgQualityScore: count > 0 ? totalScore / count : 0,
        avgMos: count > 0 ? totalMos / count : 0,
        avgPacketLoss: count > 0 ? totalPacketLoss / count : 0,
        avgJitter: count > 0 ? totalJitter / count : 0,
        avgRtt: count > 0 ? totalRtt / count : 0,
        issueCount,
        alertCount,
        qualityDistribution,
      });

      // Advance to next bucket
      this.advanceTimeBucket(current, granularity);
    }

    return result;
  }

  /**
   * Get time bucket key for a date
   */
  private getTimeBucketKey(date: Date, granularity: TimeGranularity): string {
    const d = new Date(date);
    switch (granularity) {
      case "minute":
        d.setSeconds(0, 0);
        break;
      case "hour":
        d.setMinutes(0, 0, 0);
        break;
      case "day":
        d.setHours(0, 0, 0, 0);
        break;
      case "week":
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        break;
      case "month":
        d.setHours(0, 0, 0, 0);
        d.setDate(1);
        break;
    }
    return d.toISOString();
  }

  /**
   * Advance date to next time bucket
   */
  private advanceTimeBucket(date: Date, granularity: TimeGranularity): void {
    switch (granularity) {
      case "minute":
        date.setMinutes(date.getMinutes() + 1);
        break;
      case "hour":
        date.setHours(date.getHours() + 1);
        break;
      case "day":
        date.setDate(date.getDate() + 1);
        break;
      case "week":
        date.setDate(date.getDate() + 7);
        break;
      case "month":
        date.setMonth(date.getMonth() + 1);
        break;
    }
  }

  /**
   * Calculate quality trend from time series data
   */
  private calculateQualityTrend(
    timeSeries: QualityTimeSeriesPoint[],
  ): "improving" | "stable" | "degrading" {
    if (timeSeries.length < 2) return "stable";

    const validPoints = timeSeries.filter((p) => p.callCount > 0);
    if (validPoints.length < 2) return "stable";

    const halfIndex = Math.floor(validPoints.length / 2);
    const firstHalf = validPoints.slice(0, halfIndex);
    const secondHalf = validPoints.slice(halfIndex);

    const firstAvg =
      firstHalf.reduce((sum, p) => sum + p.avgQualityScore, 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, p) => sum + p.avgQualityScore, 0) /
      secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 5) return "improving";
    if (diff < -5) return "degrading";
    return "stable";
  }

  /**
   * Get quality breakdown by network type
   */
  async getNetworkTypeBreakdown(
    filters: QualityFilters,
  ): Promise<NetworkTypeBreakdown[]> {
    try {
      // This would need a more complex query aggregating by network_type
      // For now, return mock structure
      const networkTypes: NetworkType[] = [
        "wifi",
        "cellular",
        "ethernet",
        "unknown",
      ];

      return networkTypes.map((networkType) => ({
        networkType,
        callCount: 0,
        participantCount: 0,
        avgQualityScore: 0,
        avgBandwidth: 0,
        issuesFrequency: {},
      }));
    } catch (error) {
      logger.error(
        "[CallQualityMetricsService] Error getting network breakdown:",
        error,
      );
      return [];
    }
  }

  /**
   * Get quality breakdown by device/browser
   */
  async getDeviceBreakdown(
    filters: QualityFilters,
  ): Promise<DeviceBreakdown[]> {
    try {
      // This would need aggregation by device_info
      return [];
    } catch (error) {
      logger.error(
        "[CallQualityMetricsService] Error getting device breakdown:",
        error,
      );
      return [];
    }
  }

  /**
   * Get quality breakdown by geographic region
   */
  async getGeographicBreakdown(
    filters: QualityFilters,
  ): Promise<GeographicBreakdown[]> {
    try {
      // This would need IP geolocation data
      return [];
    } catch (error) {
      logger.error(
        "[CallQualityMetricsService] Error getting geographic breakdown:",
        error,
      );
      return [];
    }
  }

  /**
   * Get global quality metrics for dashboard
   */
  async getGlobalMetrics(
    since: Date,
    until: Date = new Date(),
  ): Promise<{
    totalCalls: number;
    totalDuration: number;
    avgQualityScore: number;
    avgMos: number;
    qualityDistribution: Record<QualityLevel, number>;
    topIssues: Array<{ issue: string; count: number; percentage: number }>;
    percentiles: {
      qualityScore: PercentileMetrics;
      rtt: PercentileMetrics;
      packetLoss: PercentileMetrics;
    };
  }> {
    try {
      const { data } = await this.client.query({
        query: GET_QUALITY_AGGREGATES_BY_TIME,
        variables: {
          since: since.toISOString(),
          until: until.toISOString(),
          granularity: "day",
        },
        fetchPolicy: "no-cache",
      });

      const agg = data?.nchat_call_quality_reports_aggregate?.aggregate;

      const totalReports = parseInt(agg?.count || "0", 10);
      const avgPacketLoss = parseFloat(agg?.avg?.packet_loss_rate || "0");
      const avgJitter = parseFloat(agg?.avg?.jitter || "0");
      const avgRtt = parseFloat(agg?.avg?.round_trip_time || "0");

      const avgMos = this.calculateMOS(avgPacketLoss, avgJitter, avgRtt);
      const avgQualityScore = this.calculateQualityScore(
        avgPacketLoss,
        avgJitter,
        avgRtt,
      );

      return {
        totalCalls: totalReports,
        totalDuration: 0, // Would need duration tracking
        avgQualityScore,
        avgMos,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
          critical: 0,
        },
        topIssues: [],
        percentiles: {
          qualityScore: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
          rtt: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
          packetLoss: { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
        },
      };
    } catch (error) {
      logger.error(
        "[CallQualityMetricsService] Error getting global metrics:",
        error,
      );
      throw error;
    }
  }
}

// Singleton instance
let serviceInstance: CallQualityMetricsService | null = null;

export function getCallQualityMetricsService(): CallQualityMetricsService {
  if (!serviceInstance) {
    serviceInstance = new CallQualityMetricsService();
  }
  return serviceInstance;
}

export default CallQualityMetricsService;
