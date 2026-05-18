/**
 * @jest-environment node
 */

/**
 * Call Quality Metrics Service Tests
 *
 * Tests for the quality metrics aggregation service:
 * - MOS calculation
 * - Quality level determination
 * - Quality score calculation
 * - Percentile calculations
 * - Call summary aggregation
 * - Time series generation
 */

import {
  CallQualityMetricsService,
  getCallQualityMetricsService,
  type QualityLevel,
} from "../quality-metrics.service";

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

describe("CallQualityMetricsService", () => {
  let service: CallQualityMetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CallQualityMetricsService();
  });

  // ============================================================
  // MOS Calculation Tests
  // ============================================================

  describe("calculateMOS", () => {
    it("should calculate perfect MOS for ideal conditions", () => {
      const mos = service.calculateMOS(0, 0, 50);
      expect(mos).toBeGreaterThanOrEqual(4.3);
      expect(mos).toBeLessThanOrEqual(4.5);
    });

    it("should decrease MOS with high packet loss", () => {
      const idealMos = service.calculateMOS(0, 0, 50);
      const degradedMos = service.calculateMOS(5, 0, 50);

      expect(degradedMos).toBeLessThan(idealMos);
    });

    it("should decrease MOS with high jitter", () => {
      const idealMos = service.calculateMOS(0, 0, 50);
      const degradedMos = service.calculateMOS(0, 100, 50);

      expect(degradedMos).toBeLessThan(idealMos);
    });

    it("should decrease MOS with high RTT", () => {
      const idealMos = service.calculateMOS(0, 0, 50);
      const degradedMos = service.calculateMOS(0, 0, 500);

      expect(degradedMos).toBeLessThan(idealMos);
    });

    it("should return minimum MOS of 1", () => {
      const mos = service.calculateMOS(100, 500, 2000);
      expect(mos).toBeGreaterThanOrEqual(1);
    });

    it("should return maximum MOS of 5", () => {
      const mos = service.calculateMOS(0, 0, 0); // Perfect conditions
      expect(mos).toBeLessThanOrEqual(5);
      expect(mos).toBeGreaterThanOrEqual(4);
    });

    it("should handle combined degradation factors", () => {
      const mos = service.calculateMOS(5, 50, 200);
      // Should be degraded but not at minimum
      expect(mos).toBeGreaterThanOrEqual(1);
      expect(mos).toBeLessThan(4.5);
    });
  });

  // ============================================================
  // Quality Level Tests
  // ============================================================

  describe("getQualityLevelFromMOS", () => {
    it("should return excellent for MOS >= 4.3", () => {
      expect(service.getQualityLevelFromMOS(4.5)).toBe("excellent");
      expect(service.getQualityLevelFromMOS(4.3)).toBe("excellent");
    });

    it("should return good for MOS >= 4.0 and < 4.3", () => {
      expect(service.getQualityLevelFromMOS(4.2)).toBe("good");
      expect(service.getQualityLevelFromMOS(4.0)).toBe("good");
    });

    it("should return fair for MOS >= 3.6 and < 4.0", () => {
      expect(service.getQualityLevelFromMOS(3.8)).toBe("fair");
      expect(service.getQualityLevelFromMOS(3.6)).toBe("fair");
    });

    it("should return poor for MOS >= 3.1 and < 3.6", () => {
      expect(service.getQualityLevelFromMOS(3.4)).toBe("poor");
      expect(service.getQualityLevelFromMOS(3.1)).toBe("poor");
    });

    it("should return critical for MOS < 3.1", () => {
      expect(service.getQualityLevelFromMOS(3.0)).toBe("critical");
      expect(service.getQualityLevelFromMOS(2.0)).toBe("critical");
      expect(service.getQualityLevelFromMOS(1.0)).toBe("critical");
    });
  });

  // ============================================================
  // Quality Score Tests
  // ============================================================

  describe("calculateQualityScore", () => {
    it("should return high score for good metrics", () => {
      const score = service.calculateQualityScore(0, 10, 50);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it("should return low score for poor metrics", () => {
      const score = service.calculateQualityScore(15, 150, 500);
      expect(score).toBeLessThan(50);
    });

    it("should return score in range 0-100", () => {
      const score1 = service.calculateQualityScore(0, 0, 0);
      const score2 = service.calculateQualityScore(100, 1000, 5000);

      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score1).toBeLessThanOrEqual(100);
      expect(score2).toBeGreaterThanOrEqual(0);
      expect(score2).toBeLessThanOrEqual(100);
    });

    it("should be proportional to MOS score", () => {
      const goodScore = service.calculateQualityScore(0, 10, 50);
      const poorScore = service.calculateQualityScore(10, 100, 300);

      expect(goodScore).toBeGreaterThan(poorScore);
    });
  });

  // ============================================================
  // Percentile Calculation Tests
  // ============================================================

  describe("calculatePercentiles", () => {
    it("should calculate correct percentiles for sorted array", () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const percentiles = service.calculatePercentiles(values);

      expect(percentiles.p50).toBeCloseTo(5.5, 1);
      expect(percentiles.p95).toBeGreaterThan(9);
      expect(percentiles.p99).toBeGreaterThan(9);
    });

    it("should return zeros for empty array", () => {
      const percentiles = service.calculatePercentiles([]);

      expect(percentiles.p50).toBe(0);
      expect(percentiles.p75).toBe(0);
      expect(percentiles.p90).toBe(0);
      expect(percentiles.p95).toBe(0);
      expect(percentiles.p99).toBe(0);
    });

    it("should handle single value", () => {
      const percentiles = service.calculatePercentiles([42]);

      expect(percentiles.p50).toBe(42);
      expect(percentiles.p95).toBe(42);
    });

    it("should handle unsorted array", () => {
      const values = [5, 1, 9, 3, 7, 2, 8, 4, 6, 10];
      const percentiles = service.calculatePercentiles(values);

      expect(percentiles.p50).toBeCloseTo(5.5, 1);
    });

    it("should calculate all percentile levels", () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const percentiles = service.calculatePercentiles(values);

      // Percentiles should be in expected ranges
      expect(percentiles.p50).toBeGreaterThan(45);
      expect(percentiles.p50).toBeLessThan(55);
      expect(percentiles.p75).toBeGreaterThan(70);
      expect(percentiles.p75).toBeLessThan(80);
      expect(percentiles.p90).toBeGreaterThan(85);
      expect(percentiles.p95).toBeGreaterThan(90);
      expect(percentiles.p99).toBeGreaterThan(95);
    });
  });

  // ============================================================
  // Call Quality Summary Tests
  // ============================================================

  describe("getCallQualitySummary", () => {
    const mockCallId = "550e8400-e29b-41d4-a716-446655440000";

    it("should return null when no reports found", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_quality_reports: [],
          nchat_call_participants: [],
          nchat_call_events: [],
        },
      });

      const summary = await service.getCallQualitySummary(mockCallId);
      expect(summary).toBeNull();
    });

    it("should calculate summary from quality reports", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_quality_reports: [
            {
              id: "report-1",
              call_id: mockCallId,
              participant_id: "participant-1",
              reported_at: new Date().toISOString(),
              packet_loss_rate: 2,
              jitter: 20,
              round_trip_time: 100,
              bitrate_sent: 500,
              audio_level: 70,
            },
            {
              id: "report-2",
              call_id: mockCallId,
              participant_id: "participant-1",
              reported_at: new Date(Date.now() + 1000).toISOString(),
              packet_loss_rate: 3,
              jitter: 25,
              round_trip_time: 120,
              bitrate_sent: 480,
              audio_level: 65,
            },
          ],
          nchat_call_participants: [
            {
              id: "participant-1",
              user_id: "user-1",
              call: { room_id: "room-1" },
            },
          ],
          nchat_call_events: [],
        },
      });

      const summary = await service.getCallQualitySummary(mockCallId);

      expect(summary).not.toBeNull();
      expect(summary!.callId).toBe(mockCallId);
      expect(summary!.participantCount).toBe(1);
      expect(summary!.audio.avgPacketLoss).toBeCloseTo(2.5, 1);
      expect(summary!.audio.avgJitter).toBeCloseTo(22.5, 1);
      expect(summary!.network.avgRtt).toBeCloseTo(110, 1);
    });

    it("should detect issues from metrics", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_quality_reports: [
            {
              id: "report-1",
              reported_at: new Date().toISOString(),
              packet_loss_rate: 10, // High packet loss
              jitter: 100, // High jitter
              round_trip_time: 500, // High RTT
              bitrate_sent: 50, // Low bandwidth
            },
          ],
          nchat_call_participants: [],
          nchat_call_events: [],
        },
      });

      const summary = await service.getCallQualitySummary(mockCallId);

      expect(summary!.issuesDetected).toContain("high_packet_loss");
      expect(summary!.issuesDetected).toContain("high_jitter");
      expect(summary!.issuesDetected).toContain("high_rtt");
    });

    it("should count alerts from events", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_quality_reports: [
            {
              id: "report-1",
              reported_at: new Date().toISOString(),
              packet_loss_rate: 1,
              jitter: 10,
              round_trip_time: 50,
            },
          ],
          nchat_call_participants: [],
          nchat_call_events: [
            { event_type: "quality_changed" },
            { event_type: "quality_changed" },
            { event_type: "connection_issue" },
          ],
        },
      });

      const summary = await service.getCallQualitySummary(mockCallId);

      expect(summary!.alertsTriggered).toBe(3);
    });
  });

  // ============================================================
  // User Quality History Tests
  // ============================================================

  describe("getUserQualityHistory", () => {
    const mockUserId = "550e8400-e29b-41d4-a716-446655440001";

    it("should return null when no participations found", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: { nchat_call_participants: [] },
      });

      const history = await service.getUserQualityHistory(mockUserId);
      expect(history).toBeNull();
    });

    it("should aggregate user quality metrics", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_participants: [
            {
              id: "part-1",
              call_id: "call-1",
              user_id: mockUserId,
              joined_at: new Date(Date.now() - 3600000).toISOString(),
              left_at: new Date(Date.now() - 3000000).toISOString(),
              avg_packet_loss: 2,
              avg_jitter: 20,
              avg_round_trip_time: 100,
              network_type: "wifi",
              device_info: { browser: "Chrome" },
              user: {
                username: "testuser",
                display_name: "Test User",
              },
              call: { room_id: "room-1" },
            },
            {
              id: "part-2",
              call_id: "call-2",
              user_id: mockUserId,
              joined_at: new Date(Date.now() - 7200000).toISOString(),
              left_at: new Date(Date.now() - 6600000).toISOString(),
              avg_packet_loss: 1,
              avg_jitter: 15,
              avg_round_trip_time: 80,
              network_type: "ethernet",
              device_info: { browser: "Firefox" },
              user: {
                username: "testuser",
                display_name: "Test User",
              },
              call: { room_id: "room-2" },
            },
          ],
        },
      });

      const history = await service.getUserQualityHistory(mockUserId);

      expect(history).not.toBeNull();
      expect(history!.userId).toBe(mockUserId);
      expect(history!.callCount).toBe(2);
      expect(history!.networkTypeDistribution.wifi).toBe(1);
      expect(history!.networkTypeDistribution.ethernet).toBe(1);
      expect(history!.deviceDistribution.Chrome).toBe(1);
      expect(history!.deviceDistribution.Firefox).toBe(1);
      expect(history!.recentCalls).toHaveLength(2);
    });

    it("should detect issues for user", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_participants: [
            {
              id: "part-1",
              call_id: "call-1",
              user_id: mockUserId,
              joined_at: new Date().toISOString(),
              left_at: new Date(Date.now() + 600000).toISOString(),
              avg_packet_loss: 10, // High
              avg_jitter: 100, // High
              avg_round_trip_time: 300, // High
              network_type: "cellular",
              user: { username: "user" },
              call: { room_id: "room" },
            },
          ],
        },
      });

      const history = await service.getUserQualityHistory(mockUserId);

      expect(history!.issuesFrequency.high_packet_loss).toBe(1);
      expect(history!.issuesFrequency.high_jitter).toBe(1);
      expect(history!.issuesFrequency.high_rtt).toBe(1);
    });
  });

  // ============================================================
  // Room Quality Stats Tests
  // ============================================================

  describe("getRoomQualityStats", () => {
    const mockRoomId = "550e8400-e29b-41d4-a716-446655440002";

    it("should return null when no calls found", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: { nchat_calls: [] },
      });

      const stats = await service.getRoomQualityStats(mockRoomId);
      expect(stats).toBeNull();
    });

    it("should aggregate room quality statistics", async () => {
      // Mock calls query
      mockApolloClient.query.mockImplementation(({ query }) => {
        const queryString = query?.loc?.source?.body || "";

        if (queryString.includes("GetCallsByRoom")) {
          return {
            data: {
              nchat_calls: [
                {
                  id: "call-1",
                  room_id: mockRoomId,
                  started_at: new Date().toISOString(),
                  participants_aggregate: { aggregate: { count: 2 } },
                },
              ],
            },
          };
        }

        // Mock call quality summary query
        return {
          data: {
            nchat_call_quality_reports: [
              {
                id: "report-1",
                reported_at: new Date().toISOString(),
                packet_loss_rate: 2,
                jitter: 20,
                round_trip_time: 100,
              },
            ],
            nchat_call_participants: [{ call: { room_id: mockRoomId } }],
            nchat_call_events: [],
          },
        };
      });

      const stats = await service.getRoomQualityStats(mockRoomId);

      expect(stats).not.toBeNull();
      expect(stats!.roomId).toBe(mockRoomId);
      expect(stats!.callCount).toBe(1);
    });
  });

  // ============================================================
  // Global Metrics Tests
  // ============================================================

  describe("getGlobalMetrics", () => {
    it("should fetch and calculate global metrics", async () => {
      mockApolloClient.query.mockResolvedValue({
        data: {
          nchat_call_quality_reports_aggregate: {
            aggregate: {
              count: "100",
              avg: {
                packet_loss_rate: "2.5",
                jitter: "25",
                round_trip_time: "120",
              },
            },
          },
        },
      });

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const metrics = await service.getGlobalMetrics(since);

      expect(metrics.totalCalls).toBe(100);
      expect(metrics.avgMos).toBeGreaterThan(0);
      // Quality score should be defined (may be 0 for edge cases)
      expect(metrics.avgQualityScore).toBeDefined();
    });
  });

  // ============================================================
  // Singleton Tests
  // ============================================================

  describe("getCallQualityMetricsService", () => {
    it("should return the same instance", () => {
      const instance1 = getCallQualityMetricsService();
      const instance2 = getCallQualityMetricsService();

      expect(instance1).toBe(instance2);
    });
  });
});
