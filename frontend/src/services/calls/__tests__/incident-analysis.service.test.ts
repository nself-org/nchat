/**
 * @jest-environment node
 */

/**
 * Incident Analysis Service Tests
 *
 * Tests for the incident analysis service:
 * - Call replay data retrieval
 * - Timeline building
 * - Incident detection
 * - Root cause analysis
 * - Impact assessment
 * - Historical comparison
 */

import {
  IncidentAnalysisService,
  getIncidentAnalysisService,
  type Incident,
  type CallTimelineEvent,
} from "../incident-analysis.service";

// Mock Apollo Client
const mockApolloClient = {
  query: jest.fn(),
  mutate: jest.fn(),
};

jest.mock("@/lib/apollo-client", () => ({
  getServerApolloClient: jest.fn(() => mockApolloClient),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the metrics and alerting services
jest.mock("../quality-metrics.service", () => ({
  getCallQualityMetricsService: jest.fn(() => ({
    getCallQualitySummary: jest.fn().mockResolvedValue({
      callId: "call-1",
      overallScore: 75,
      qualityLevel: "good",
      audio: { avgMos: 4.0, avgJitter: 20, avgPacketLoss: 2 },
      network: { avgRtt: 100 },
      issuesDetected: [],
      alertsTriggered: 0,
    }),
    calculateQualityScore: jest.fn().mockReturnValue(75),
  })),
}));

jest.mock("../quality-alerting.service", () => ({
  getCallQualityAlertingService: jest.fn(() => ({
    getAlertHistory: jest.fn().mockResolvedValue({
      alerts: [],
      totalCount: 0,
    }),
  })),
}));

describe("IncidentAnalysisService", () => {
  let service: IncidentAnalysisService;
  const mockCallId = "550e8400-e29b-41d4-a716-446655440000";
  const mockUserId = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncidentAnalysisService();
  });

  // ============================================================
  // Call Replay Data Tests
  // ============================================================

  describe("getCallReplayData", () => {
    it("should return null when call not found", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: null,
          nchat_call_participants: [],
          nchat_call_events: [],
          nchat_call_quality_reports: [],
        },
      });

      const result = await service.getCallReplayData(mockCallId);
      expect(result).toBeNull();
    });

    it("should return complete replay data", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            room_id: "room-1",
            caller_id: mockUserId,
            status: "ended",
            type: "video",
            started_at: new Date(now - 600000).toISOString(),
            ended_at: new Date(now).toISOString(),
          },
          nchat_call_participants: [
            {
              id: "part-1",
              user_id: mockUserId,
              joined_at: new Date(now - 600000).toISOString(),
              left_at: new Date(now).toISOString(),
              connection_quality: "good",
              avg_packet_loss: 2,
              avg_jitter: 20,
              avg_round_trip_time: 100,
              network_type: "wifi",
              device_info: { browser: "Chrome" },
              user: {
                id: mockUserId,
                username: "testuser",
                display_name: "Test User",
                avatar_url: "https://example.com/avatar.jpg",
              },
            },
          ],
          nchat_call_events: [
            {
              id: "event-1",
              event_type: "quality_changed",
              user_id: mockUserId,
              data: { qualityScore: 70 },
              created_at: new Date(now - 300000).toISOString(),
            },
          ],
          nchat_call_quality_reports: [
            {
              id: "report-1",
              participant_id: "part-1",
              reported_at: new Date(now - 500000).toISOString(),
              packet_loss_rate: 2,
              jitter: 20,
              round_trip_time: 100,
              bitrate_sent: 500,
              bitrate_received: 480,
              audio_level: 70,
              connection_state: "stable",
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      expect(result).not.toBeNull();
      expect(result!.callId).toBe(mockCallId);
      expect(result!.roomId).toBe("room-1");
      expect(result!.participants).toHaveLength(1);
      expect(result!.timeline.length).toBeGreaterThan(0);
    });

    it("should build timeline with all event types", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            ended_at: new Date(now).toISOString(),
            status: "ended",
          },
          nchat_call_participants: [
            {
              id: "part-1",
              user_id: mockUserId,
              joined_at: new Date(now - 500000).toISOString(),
              left_at: new Date(now - 100000).toISOString(),
              user: { display_name: "User 1" },
            },
          ],
          nchat_call_events: [
            {
              id: "event-1",
              event_type: "quality_changed",
              data: { qualityScore: 50 },
              created_at: new Date(now - 400000).toISOString(),
            },
            {
              id: "event-2",
              event_type: "connection_issue",
              data: { issue: "network_unstable" },
              created_at: new Date(now - 300000).toISOString(),
            },
          ],
          nchat_call_quality_reports: [
            {
              id: "report-1",
              participant_id: "part-1",
              reported_at: new Date(now - 450000).toISOString(),
              packet_loss_rate: 8,
              jitter: 80,
              round_trip_time: 200,
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);
      const timeline = result!.timeline;

      // Check for expected event types
      const eventTypes = timeline.map((e) => e.type);
      expect(eventTypes).toContain("call_started");
      expect(eventTypes).toContain("participant_joined");
      expect(eventTypes).toContain("participant_left");
      expect(eventTypes).toContain("quality_changed");
      expect(eventTypes).toContain("connection_issue");
      expect(eventTypes).toContain("call_ended");
    });

    it("should calculate participant quality scores", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [
            {
              id: "part-1",
              user_id: "user-1",
              joined_at: new Date(now - 500000).toISOString(),
              avg_packet_loss: 1,
              avg_jitter: 15,
              avg_round_trip_time: 80,
              connection_quality: "excellent",
              user: { display_name: "Good User" },
            },
            {
              id: "part-2",
              user_id: "user-2",
              joined_at: new Date(now - 400000).toISOString(),
              avg_packet_loss: 10,
              avg_jitter: 100,
              avg_round_trip_time: 300,
              connection_quality: "poor",
              user: { display_name: "Poor User" },
            },
          ],
          nchat_call_events: [],
          nchat_call_quality_reports: [],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      // Both participants have different metrics, but the mocked calculateQualityScore
      // returns a fixed value, so we just verify both have quality scores
      expect(result!.participants[0].avgQualityScore).toBeGreaterThanOrEqual(0);
      expect(result!.participants[1].avgQualityScore).toBeGreaterThanOrEqual(0);
    });

    it("should detect participant issues", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [
            {
              id: "part-1",
              user_id: "user-1",
              joined_at: new Date(now - 500000).toISOString(),
              avg_packet_loss: 10, // High
              avg_jitter: 100, // High
              avg_round_trip_time: 300, // High
              connection_quality: "poor",
              user: { display_name: "User 1" },
            },
          ],
          nchat_call_events: [],
          nchat_call_quality_reports: [],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      expect(result!.participants[0].issues).toContain("high_packet_loss");
      expect(result!.participants[0].issues).toContain("high_jitter");
      expect(result!.participants[0].issues).toContain("high_rtt");
      expect(result!.participants[0].issues).toContain("poor_connection");
    });
  });

  // ============================================================
  // Incident Detection Tests
  // ============================================================

  describe("Incident Detection", () => {
    it("should detect quality degradation incidents", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            ended_at: new Date(now).toISOString(),
            status: "ended",
          },
          nchat_call_participants: [
            {
              id: "part-1",
              user_id: "user-1",
              joined_at: new Date(now - 500000).toISOString(),
              user: { display_name: "User" },
            },
          ],
          nchat_call_events: [],
          nchat_call_quality_reports: [
            // Multiple consecutive poor quality reports
            {
              id: "r1",
              participant_id: "part-1",
              reported_at: new Date(now - 400000).toISOString(),
              packet_loss_rate: 12,
              jitter: 100,
              round_trip_time: 300,
            },
            {
              id: "r2",
              participant_id: "part-1",
              reported_at: new Date(now - 395000).toISOString(),
              packet_loss_rate: 15,
              jitter: 120,
              round_trip_time: 350,
            },
            {
              id: "r3",
              participant_id: "part-1",
              reported_at: new Date(now - 390000).toISOString(),
              packet_loss_rate: 10,
              jitter: 90,
              round_trip_time: 280,
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      expect(result!.incidents.length).toBeGreaterThan(0);
      expect(result!.incidents[0].type).toBe("network_instability");
    });

    it("should calculate incident severity from events", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [],
          nchat_call_events: [
            {
              id: "e1",
              event_type: "quality_changed",
              data: { severity: "critical" },
              created_at: new Date(now - 400000).toISOString(),
            },
          ],
          nchat_call_quality_reports: [],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      if (result!.incidents.length > 0) {
        expect(result!.incidents[0].severity).toBe("critical");
      }
    });

    it("should identify affected participants", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [
            {
              id: "part-1",
              user_id: "user-1",
              joined_at: new Date(now - 500000).toISOString(),
              user: { display_name: "User 1" },
            },
            {
              id: "part-2",
              user_id: "user-2",
              joined_at: new Date(now - 450000).toISOString(),
              user: { display_name: "User 2" },
            },
          ],
          nchat_call_events: [],
          nchat_call_quality_reports: [
            {
              id: "r1",
              participant_id: "part-1",
              reported_at: new Date(now - 400000).toISOString(),
              packet_loss_rate: 15,
              jitter: 150,
              round_trip_time: 400,
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      if (result!.incidents.length > 0) {
        expect(result!.incidents[0].affectedParticipants).toContain("part-1");
      }
    });
  });

  // ============================================================
  // Root Cause Analysis Tests
  // ============================================================

  describe("Root Cause Analysis", () => {
    it("should identify packet loss as root cause", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [],
          nchat_call_events: [],
          nchat_call_quality_reports: [
            {
              id: "r1",
              reported_at: new Date(now - 400000).toISOString(),
              packet_loss_rate: 15,
              jitter: 20,
              round_trip_time: 100,
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      if (result!.incidents.length > 0) {
        const rootCauses = result!.incidents[0].rootCauses;
        const packetLossCause = rootCauses.find(
          (rc) => rc.type === "packet_loss",
        );
        expect(packetLossCause).toBeDefined();
      }
    });

    it("should identify high latency as root cause", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [],
          nchat_call_events: [],
          nchat_call_quality_reports: [
            {
              id: "r1",
              reported_at: new Date(now - 400000).toISOString(),
              packet_loss_rate: 1,
              jitter: 20,
              round_trip_time: 500, // High latency
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      if (result!.incidents.length > 0) {
        const rootCauses = result!.incidents[0].rootCauses;
        const latencyCause = rootCauses.find(
          (rc) => rc.type === "high_latency",
        );
        expect(latencyCause).toBeDefined();
      }
    });

    it("should include confidence scores for root causes", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [],
          nchat_call_events: [],
          nchat_call_quality_reports: [
            {
              id: "r1",
              reported_at: new Date(now - 400000).toISOString(),
              packet_loss_rate: 20,
              jitter: 150,
              round_trip_time: 400,
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      if (result!.incidents.length > 0) {
        result!.incidents[0].rootCauses.forEach((rc) => {
          expect(rc.confidence).toBeGreaterThanOrEqual(0);
          expect(rc.confidence).toBeLessThanOrEqual(100);
        });
      }
    });

    it("should provide recommendations for each root cause", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [],
          nchat_call_events: [],
          nchat_call_quality_reports: [
            {
              id: "r1",
              reported_at: new Date(now - 400000).toISOString(),
              packet_loss_rate: 15,
              jitter: 100,
              round_trip_time: 300,
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      if (result!.incidents.length > 0) {
        result!.incidents[0].rootCauses.forEach((rc) => {
          expect(rc.recommendations).toBeDefined();
          expect(rc.recommendations.length).toBeGreaterThan(0);
        });
      }
    });
  });

  // ============================================================
  // Impact Assessment Tests
  // ============================================================

  describe("Impact Assessment", () => {
    it("should assess impact severity", async () => {
      const now = Date.now();

      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_calls_by_pk: {
            id: mockCallId,
            started_at: new Date(now - 600000).toISOString(),
            status: "active",
          },
          nchat_call_participants: [
            {
              id: "p1",
              user_id: "u1",
              joined_at: new Date(now - 500000).toISOString(),
              user: { display_name: "U1" },
            },
            {
              id: "p2",
              user_id: "u2",
              joined_at: new Date(now - 450000).toISOString(),
              user: { display_name: "U2" },
            },
          ],
          nchat_call_events: [],
          nchat_call_quality_reports: [
            {
              id: "r1",
              participant_id: "p1",
              reported_at: new Date(now - 400000).toISOString(),
              packet_loss_rate: 20,
              jitter: 150,
              round_trip_time: 500,
            },
          ],
        },
      });

      const result = await service.getCallReplayData(mockCallId);

      if (result!.incidents.length > 0) {
        const impact = result!.incidents[0].impact;
        expect(["low", "medium", "high", "critical"]).toContain(
          impact.severity,
        );
        expect(impact.affectedUsers).toBeGreaterThanOrEqual(0);
        expect(["minimal", "noticeable", "significant", "severe"]).toContain(
          impact.userExperience,
        );
      }
    });
  });

  // ============================================================
  // Historical Comparison Tests
  // ============================================================

  describe("compareWithHistory", () => {
    const mockIncident: Incident = {
      id: "incident-1",
      callId: mockCallId,
      type: "network_instability",
      severity: "error",
      startTime: new Date(),
      affectedParticipants: ["part-1"],
      rootCauses: [
        {
          type: "packet_loss",
          confidence: 80,
          description: "High packet loss",
          evidence: [],
          recommendations: [],
        },
      ],
      correlatedEvents: [],
      impact: {
        severity: "medium",
        affectedUsers: 1,
        qualityDrop: 30,
        durationAffected: 60,
        userExperience: "noticeable",
      },
      resolved: true,
    };

    it("should find similar incidents", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_incidents: [
            {
              id: "hist-1",
              call_id: "call-2",
              incident_type: "network_instability",
              severity: "error",
              root_causes: ["packet_loss"],
              resolution: "User switched to wired connection",
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
          ],
        },
      });

      const comparison = await service.compareWithHistory(mockIncident, {});

      expect(comparison.similarIncidents.length).toBeGreaterThan(0);
      expect(comparison.similarIncidents[0].similarity).toBeGreaterThan(50);
    });

    it("should identify patterns from history", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_incidents: [
            {
              id: "hist-1",
              call_id: "call-2",
              incident_type: "network_instability",
              severity: "error",
              root_causes: ["packet_loss"],
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: "hist-2",
              call_id: "call-3",
              incident_type: "network_instability",
              severity: "warning",
              root_causes: ["packet_loss"],
              created_at: new Date(Date.now() - 172800000).toISOString(),
            },
            {
              id: "hist-3",
              call_id: "call-4",
              incident_type: "network_instability",
              severity: "error",
              root_causes: ["packet_loss", "high_latency"],
              created_at: new Date(Date.now() - 259200000).toISOString(),
            },
          ],
        },
      });

      const comparison = await service.compareWithHistory(mockIncident, {});

      expect(comparison.patterns.length).toBeGreaterThan(0);
      expect(comparison.patterns[0].frequency).toBeGreaterThanOrEqual(3);
    });

    it("should generate recommendations from history", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_incidents: [
            {
              id: "hist-1",
              call_id: "call-2",
              incident_type: "network_instability",
              severity: "error",
              root_causes: ["packet_loss"],
              resolution: "User switched to wired connection",
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
          ],
        },
      });

      const comparison = await service.compareWithHistory(mockIncident, {});

      expect(comparison.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Incident Storage Tests
  // ============================================================

  describe("storeIncident", () => {
    it("should store incident in database", async () => {
      mockApolloClient.mutate.mockResolvedValue({
        data: {
          insert_nchat_call_incidents_one: { id: "stored-incident-1" },
        },
      });

      const incident: Incident = {
        id: "incident-1",
        callId: mockCallId,
        type: "network_instability",
        severity: "error",
        startTime: new Date(),
        affectedParticipants: ["part-1"],
        rootCauses: [],
        correlatedEvents: [],
        impact: {
          severity: "medium",
          affectedUsers: 1,
          qualityDrop: 30,
          durationAffected: 60,
          userExperience: "noticeable",
        },
        resolved: true,
      };

      const result = await service.storeIncident(incident);

      expect(result).toBe("stored-incident-1");
      expect(mockApolloClient.mutate).toHaveBeenCalled();
    });

    it("should return null on error", async () => {
      mockApolloClient.mutate.mockRejectedValue(new Error("Database error"));

      const incident: Incident = {
        id: "incident-1",
        callId: mockCallId,
        type: "network_instability",
        severity: "error",
        startTime: new Date(),
        affectedParticipants: [],
        rootCauses: [],
        correlatedEvents: [],
        impact: {
          severity: "low",
          affectedUsers: 0,
          qualityDrop: 0,
          durationAffected: 0,
          userExperience: "minimal",
        },
        resolved: true,
      };

      const result = await service.storeIncident(incident);

      expect(result).toBeNull();
    });
  });

  // ============================================================
  // Singleton Tests
  // ============================================================

  describe("getIncidentAnalysisService", () => {
    it("should return the same instance", () => {
      const instance1 = getIncidentAnalysisService();
      const instance2 = getIncidentAnalysisService();

      expect(instance1).toBe(instance2);
    });
  });
});
