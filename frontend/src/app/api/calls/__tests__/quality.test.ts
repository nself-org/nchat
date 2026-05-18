/**
 * @jest-environment node
 */

/**
 * Call Quality API Tests
 *
 * Comprehensive test suite for the Call Quality API:
 * - POST /api/calls/quality - Report quality metrics
 * - GET /api/calls/quality - Get quality statistics
 *
 * Tests cover:
 * - Request validation
 * - Authentication and authorization
 * - Participant verification
 * - Quality metrics storage
 * - Quality aggregation
 * - Alert triggering on degradation
 */

import { NextRequest } from "next/server";
import { POST, GET } from "../quality/route";

// Mock UUIDs for testing
const validCallId = "550e8400-e29b-41d4-a716-446655440000";
const validUserId = "550e8400-e29b-41d4-a716-446655440001";
const validParticipantId = "550e8400-e29b-41d4-a716-446655440002";
const validReportId = "550e8400-e29b-41d4-a716-446655440003";

// Mock data stores
let mockCalls: Record<string, any> = {};
let mockParticipants: Record<string, any[]> = {};
let mockQualityReports: any[] = [];

// Mock Apollo Client
const mockApolloClient = {
  query: jest.fn(),
  mutate: jest.fn(),
};

jest.mock("@/lib/apollo-client", () => ({
  getServerApolloClient: jest.fn(() => mockApolloClient),
}));

// Mock auth middleware
const mockUser = {
  id: validUserId,
  email: "test@example.com",
  displayName: "Test User",
  role: "member" as const,
};

jest.mock("@/lib/api/middleware", () => ({
  getAuthenticatedUser: jest.fn(),
  getClientIp: jest.fn(() => "127.0.0.1"),
}));

// Mock audit logger
jest.mock("@/lib/audit/audit-logger", () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import mocks after setting up
import { getAuthenticatedUser } from "@/lib/api/middleware";

// Helper to reset mocks between tests
function resetMocks() {
  jest.clearAllMocks();
  mockCalls = {};
  mockParticipants = {};
  mockQualityReports = [];
}

// Helper to set up authenticated session
function mockAuthenticated(userId: string = validUserId) {
  (getAuthenticatedUser as jest.Mock).mockResolvedValue({
    ...mockUser,
    id: userId,
  });
}

// Helper to set up unauthenticated session
function mockUnauthenticated() {
  (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);
}

// Helper to setup call data
function setupCall(
  callId: string,
  options: {
    status?: string;
    callerId?: string;
  } = {},
) {
  mockCalls[callId] = {
    id: callId,
    status: options.status || "connected",
    caller_id: options.callerId || validUserId,
  };
}

// Helper to setup participant
function setupParticipant(
  callId: string,
  userId: string,
  participantId?: string,
) {
  if (!mockParticipants[callId]) {
    mockParticipants[callId] = [];
  }
  mockParticipants[callId].push({
    id: participantId || validParticipantId,
    call_id: callId,
    user_id: userId,
    joined_at: new Date().toISOString(),
  });
}

// Helper to setup quality report
function setupQualityReport(
  options: Partial<{
    id: string;
    callId: string;
    participantId: string;
    packetLossRate: number;
    jitter: number;
    rtt: number;
    timestamp: string;
  }> = {},
) {
  const report = {
    id: options.id || validReportId,
    call_id: options.callId || validCallId,
    participant_id: options.participantId || validParticipantId,
    reported_at: options.timestamp || new Date().toISOString(),
    audio_level: 50,
    packets_sent: 1000,
    packets_received: 990,
    packets_lost: 10,
    packet_loss_rate: options.packetLossRate ?? 1,
    jitter: options.jitter ?? 20,
    round_trip_time: options.rtt ?? 50,
    bytes_sent: 100000,
    bytes_received: 95000,
    bitrate_sent: 64,
    bitrate_received: 60,
    ice_connection_state: "connected",
    connection_state: "stable",
    rtc_stats: null,
  };
  mockQualityReports.push(report);
  return report;
}

// Setup GraphQL mock responses
function setupGraphQLMock() {
  mockApolloClient.query.mockImplementation(({ query, variables }: any) => {
    const queryString = query?.loc?.source?.body || "";

    // Check participant access
    if (queryString.includes("CheckCallParticipant")) {
      const call = mockCalls[variables.callId];
      const participants = mockParticipants[variables.callId] || [];
      const userParticipant = participants.find(
        (p: any) => p.user_id === variables.userId,
      );

      return {
        data: {
          nchat_call_participants: userParticipant ? [userParticipant] : [],
          nchat_calls_by_pk: call || null,
        },
      };
    }

    // Get quality reports
    if (queryString.includes("GetQualityReports")) {
      let reports = [...mockQualityReports];

      if (variables.callId) {
        reports = reports.filter((r) => r.call_id === variables.callId);
      }
      if (variables.participantId) {
        reports = reports.filter(
          (r) => r.participant_id === variables.participantId,
        );
      }
      if (variables.since) {
        reports = reports.filter(
          (r) => new Date(r.reported_at) >= new Date(variables.since),
        );
      }
      reports = reports.slice(0, variables.limit);

      return {
        data: { nchat_call_quality_reports: reports },
      };
    }

    // Get quality aggregates
    if (queryString.includes("GetQualityAggregates")) {
      const reports = mockQualityReports.filter(
        (r) => r.call_id === variables.callId,
      );
      const count = reports.length;

      if (count === 0) {
        return {
          data: {
            nchat_call_quality_reports_aggregate: {
              aggregate: { avg: {}, count: 0 },
            },
          },
        };
      }

      const avgPacketLoss =
        reports.reduce((sum, r) => sum + (r.packet_loss_rate || 0), 0) / count;
      const avgJitter =
        reports.reduce((sum, r) => sum + (r.jitter || 0), 0) / count;
      const avgRtt =
        reports.reduce((sum, r) => sum + (r.round_trip_time || 0), 0) / count;

      return {
        data: {
          nchat_call_quality_reports_aggregate: {
            aggregate: {
              avg: {
                packet_loss_rate: avgPacketLoss.toFixed(2),
                jitter: avgJitter.toFixed(2),
                round_trip_time: avgRtt.toFixed(2),
                audio_level: "50.00",
                bitrate_sent: "64.00",
                bitrate_received: "60.00",
              },
              count: String(count),
            },
          },
        },
      };
    }

    return { data: null };
  });

  mockApolloClient.mutate.mockImplementation(({ mutation, variables }: any) => {
    const mutationString = mutation?.loc?.source?.body || "";

    // Insert quality report
    if (mutationString.includes("InsertQualityReport")) {
      const newReport = {
        id: validReportId,
        ...variables.report,
      };
      mockQualityReports.push(newReport);
      return {
        data: { insert_nchat_call_quality_reports_one: newReport },
      };
    }

    // Update participant quality
    if (mutationString.includes("UpdateParticipantQuality")) {
      return {
        data: {
          update_nchat_call_participants_by_pk: {
            id: variables.participantId,
            connection_quality: variables.connectionQuality,
          },
        },
      };
    }

    // Insert call event (for alerts)
    if (mutationString.includes("InsertCallEvent")) {
      return {
        data: { insert_nchat_call_events_one: { id: "event-1" } },
      };
    }

    return { data: null };
  });
}

describe("Call Quality API", () => {
  beforeEach(() => {
    resetMocks();
    setupGraphQLMock();
  });

  // ====================================
  // POST /api/calls/quality
  // ====================================
  describe("POST /api/calls/quality - Report Quality Metrics", () => {
    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({ callId: validCallId }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 for invalid call ID format", async () => {
      mockAuthenticated();

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({ callId: "invalid-id" }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid metrics data");
    });

    it("should return 403 if user is not a participant", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440099";
      mockAuthenticated(otherUserId);
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId); // Different user is participant

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({ callId: validCallId }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Not a participant in this call");
    });

    it("should return 400 if call is not active", async () => {
      mockAuthenticated();
      setupCall(validCallId, { status: "ended" });
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({ callId: validCallId }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Call is no longer active");
    });

    it("should store quality metrics successfully", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({
            callId: validCallId,
            audio: {
              bitrate: 64,
              packetsLost: 10,
              packetsReceived: 1000,
              jitter: 20,
              rtt: 50,
            },
            bandwidth: {
              upload: 1000,
              download: 1500,
            },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.qualityReport).toBeDefined();
      expect(data.data.qualityReport.id).toBe(validReportId);
      expect(data.data.qualityReport.qualityScore).toBeDefined();
    });

    it("should calculate quality score from metrics", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({
            callId: validCallId,
            audio: {
              bitrate: 64,
              packetsLost: 0,
              packetsReceived: 1000,
              jitter: 10,
              rtt: 30,
            },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      // With very good metrics, score should be high
      expect(data.data.qualityReport.qualityScore).toBeGreaterThanOrEqual(90);
    });

    it("should detect quality issues", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({
            callId: validCallId,
            audio: {
              packetsLost: 100, // High packet loss (10%)
              packetsReceived: 900,
              jitter: 100, // High jitter
              rtt: 200, // High RTT
            },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.qualityReport.issues).toContain("high_packet_loss");
      expect(data.data.qualityReport.issues).toContain("high_jitter");
      expect(data.data.qualityReport.issues).toContain("high_rtt");
    });

    it("should trigger alert on low quality", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({
            callId: validCallId,
            qualityScore: 25, // Very low quality
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify alert was triggered (InsertCallEvent was called)
      const insertEventCalls = mockApolloClient.mutate.mock.calls.filter(
        (call: any) =>
          call[0].mutation?.loc?.source?.body?.includes("InsertCallEvent"),
      );
      expect(insertEventCalls.length).toBeGreaterThan(0);
    });

    it("should allow caller to report quality", async () => {
      mockAuthenticated();
      setupCall(validCallId, { callerId: validUserId });
      // No participant entry, but user is caller

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({
            callId: validCallId,
            audio: { bitrate: 64 },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it("should handle video metrics", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality",
        {
          method: "POST",
          body: JSON.stringify({
            callId: validCallId,
            video: {
              bitrate: 1500,
              frameRate: 30,
              resolution: "1280x720",
              packetsLost: 5,
              packetsReceived: 500,
              jitter: 15,
              rtt: 40,
            },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.qualityReport.qualityScore).toBeDefined();
    });
  });

  // ====================================
  // GET /api/calls/quality
  // ====================================
  describe("GET /api/calls/quality - Get Quality Statistics", () => {
    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 for invalid call ID format", async () => {
      mockAuthenticated();

      const request = new NextRequest(
        "http://localhost:3000/api/calls/quality?callId=invalid",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid query parameters");
    });

    it("should return 403 if user is not a participant", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440099";
      mockAuthenticated(otherUserId);
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId); // Different user is participant

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You do not have access to this call data");
    });

    it("should return quality metrics for call", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);
      setupQualityReport({ callId: validCallId });
      setupQualityReport({ callId: validCallId, jitter: 30, rtt: 60 });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.metrics).toHaveLength(2);
      expect(data.data.count).toBe(2);
    });

    it("should include aggregates when requested", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);
      setupQualityReport({
        callId: validCallId,
        packetLossRate: 1,
        jitter: 20,
        rtt: 50,
      });
      setupQualityReport({
        callId: validCallId,
        packetLossRate: 2,
        jitter: 25,
        rtt: 60,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}&includeAggregates=true`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.aggregates).toBeDefined();
      expect(data.data.aggregates.averagePacketLossRate).toBeDefined();
      expect(data.data.aggregates.averageJitter).toBeDefined();
      expect(data.data.aggregates.averageRtt).toBeDefined();
      expect(data.data.aggregates.totalReports).toBe(2);
    });

    it("should calculate quality trend", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);
      // First reports have high packet loss (bad quality)
      setupQualityReport({ callId: validCallId, packetLossRate: 10 });
      setupQualityReport({ callId: validCallId, packetLossRate: 8 });
      // Later reports have low packet loss (good quality)
      setupQualityReport({ callId: validCallId, packetLossRate: 2 });
      setupQualityReport({ callId: validCallId, packetLossRate: 1 });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}&includeAggregates=true`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.aggregates.qualityTrend).toBeDefined();
    });

    it("should respect limit parameter", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);
      setupQualityReport({ callId: validCallId });
      setupQualityReport({ callId: validCallId });
      setupQualityReport({ callId: validCallId });
      setupQualityReport({ callId: validCallId });
      setupQualityReport({ callId: validCallId });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}&limit=3`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metrics).toHaveLength(3);
    });

    it("should filter by participant ID", async () => {
      const otherParticipantId = "550e8400-e29b-41d4-a716-446655440010";
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);
      setupQualityReport({
        callId: validCallId,
        participantId: validParticipantId,
      });
      setupQualityReport({
        callId: validCallId,
        participantId: otherParticipantId,
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}&participantId=${validParticipantId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metrics).toHaveLength(1);
      expect(data.data.metrics[0].participantId).toBe(validParticipantId);
    });

    it("should filter by since timestamp", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);

      const oldDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const recentDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

      setupQualityReport({ callId: validCallId, timestamp: oldDate });
      setupQualityReport({ callId: validCallId, timestamp: recentDate });

      const sinceDate = new Date(Date.now() - 1800000).toISOString(); // 30 minutes ago
      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}&since=${encodeURIComponent(sinceDate)}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metrics).toHaveLength(1);
    });

    it("should return empty results when no metrics exist", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);
      // No quality reports added

      const request = new NextRequest(
        `http://localhost:3000/api/calls/quality?callId=${validCallId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.metrics).toHaveLength(0);
      expect(data.data.count).toBe(0);
    });
  });
});
