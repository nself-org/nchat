/**
 * @jest-environment node
 */

/**
 * Call Recording API Tests
 *
 * Comprehensive test suite for the Call Recording API:
 * - POST /api/calls/[id]/recording - Start recording
 * - GET /api/calls/[id]/recording - Get recording status
 * - DELETE /api/calls/[id]/recording - Stop recording
 *
 * Tests cover:
 * - Request validation (call ID format)
 * - Authentication and authorization
 * - Permission checks (participant/initiator only)
 * - Recording lifecycle (start, status, stop)
 * - Error handling
 * - LiveKit integration
 */

import { NextRequest } from "next/server";
import { POST, GET, DELETE } from "../[id]/recording/route";

// Mock UUIDs for testing
const validCallId = "550e8400-e29b-41d4-a716-446655440000";
const validUserId = "550e8400-e29b-41d4-a716-446655440001";
const validRecordingId = "550e8400-e29b-41d4-a716-446655440002";
const validEgressId = "EG_test123";
const validRoomName = "call-550e8400-e29b-41d4-a716-446655440000";

// Mock data stores
let mockCalls: Record<string, any> = {};
let mockRecordings: Record<string, any> = {};
let mockParticipants: Record<string, any[]> = {};
let mockEgresses: Record<string, any> = {};

// Mock nhost
jest.mock("@/lib/nhost.server", () => ({
  nhost: {
    auth: {
      getSession: jest.fn(),
    },
    graphql: {
      request: jest.fn(),
    },
  },
}));

// Mock LiveKit service
const mockLiveKitService = {
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  getEgressInfo: jest.fn(),
};

jest.mock("@/services/webrtc/livekit.service", () => ({
  getLiveKitService: jest.fn(() => mockLiveKitService),
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
import { nhost } from "@/lib/nhost.server";

// Helper to reset mocks between tests
function resetMocks() {
  jest.clearAllMocks();
  mockCalls = {};
  mockRecordings = {};
  mockParticipants = {};
  mockEgresses = {};
}

// Helper to set up authenticated session
function mockAuthenticated(userId: string = validUserId) {
  (nhost.auth.getSession as jest.Mock).mockResolvedValue({
    user: { id: userId },
  });
}

// Helper to set up unauthenticated session
function mockUnauthenticated() {
  (nhost.auth.getSession as jest.Mock).mockResolvedValue(null);
}

// Helper to setup call data
function setupCall(
  callId: string,
  options: {
    status?: string;
    initiatorId?: string;
    roomName?: string;
  } = {},
) {
  mockCalls[callId] = {
    id: callId,
    status: options.status || "active",
    initiator_id: options.initiatorId || validUserId,
    livekit_room_name: options.roomName || validRoomName,
    channel_id: "channel-1",
  };
}

// Helper to setup participant
function setupParticipant(callId: string, userId: string) {
  if (!mockParticipants[callId]) {
    mockParticipants[callId] = [];
  }
  mockParticipants[callId].push({
    id: `participant-${userId}`,
    status: "connected",
  });
}

// Helper to setup recording
function setupRecording(
  callId: string,
  options: {
    id?: string;
    status?: string;
    egressId?: string;
    recordedBy?: string;
    startedAt?: string;
    fileUrl?: string;
  } = {},
) {
  const recordingId = options.id || validRecordingId;
  mockRecordings[callId] = {
    id: recordingId,
    call_id: callId,
    recorded_by: options.recordedBy || validUserId,
    livekit_egress_id: options.egressId || validEgressId,
    status: options.status || "recording",
    started_at: options.startedAt || new Date().toISOString(),
    resolution: "1080p",
    layout_type: "grid",
    audio_only: false,
    file_url: options.fileUrl || null,
    call: mockCalls[callId],
  };
}

// Setup GraphQL mock responses
function setupGraphQLMock() {
  (nhost.graphql.request as jest.Mock).mockImplementation(
    (query: string, variables: any) => {
      // Get call for recording
      if (query.includes("GetCallForRecording")) {
        const call = mockCalls[variables.id];
        return {
          data: { nchat_calls_by_pk: call || null },
          error: call ? null : { message: "Not found" },
        };
      }

      // Check recording permission (get participants)
      if (query.includes("CheckRecordingPermission")) {
        const participants = mockParticipants[variables.callId] || [];
        const userParticipants = participants.filter(
          (p: any) => p.id === `participant-${variables.userId}`,
        );
        return {
          data: { nchat_call_participants: userParticipants },
        };
      }

      // Get active recording
      if (query.includes("GetActiveRecording")) {
        const recording = mockRecordings[variables.callId];
        if (recording && ["starting", "recording"].includes(recording.status)) {
          return { data: { nchat_call_recordings: [recording] } };
        }
        return { data: { nchat_call_recordings: [] } };
      }

      // Create call recording
      if (query.includes("CreateCallRecording")) {
        const newRecording = {
          id: validRecordingId,
          call_id: variables.object.call_id,
          recorded_by: variables.object.recorded_by,
          livekit_egress_id: variables.object.livekit_egress_id,
          status: "recording",
          resolution: variables.object.resolution,
          layout_type: variables.object.layout_type,
          audio_only: variables.object.audio_only,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        mockRecordings[variables.object.call_id] = newRecording;
        return {
          data: { insert_nchat_call_recordings_one: newRecording },
        };
      }

      // Check recording access
      if (query.includes("CheckRecordingAccess")) {
        const call = mockCalls[variables.callId];
        const participants = mockParticipants[variables.callId] || [];
        const userParticipants = participants.filter(
          (p: any) => p.id === `participant-${variables.userId}`,
        );
        return {
          data: {
            nchat_calls_by_pk: call || null,
            nchat_call_participants: userParticipants,
          },
        };
      }

      // Get call recording
      if (query.includes("GetCallRecording")) {
        const recording = mockRecordings[variables.callId];
        return {
          data: {
            nchat_call_recordings: recording ? [recording] : [],
          },
        };
      }

      // Get active recording to stop
      if (query.includes("GetActiveRecordingToStop")) {
        const recording = mockRecordings[variables.callId];
        if (recording && ["starting", "recording"].includes(recording.status)) {
          return { data: { nchat_call_recordings: [recording] } };
        }
        return { data: { nchat_call_recordings: [] } };
      }

      // Stop call recording
      if (query.includes("StopCallRecording")) {
        const recording = Object.values(mockRecordings).find(
          (r: any) => r.id === variables.id,
        );
        if (recording) {
          recording.status = "processing";
          recording.ended_at = new Date().toISOString();
          recording.duration_seconds = variables.duration;
          return {
            data: { update_nchat_call_recordings_by_pk: recording },
          };
        }
        return { data: { update_nchat_call_recordings_by_pk: null } };
      }

      return { data: null, error: { message: "Unknown query" } };
    },
  );
}

describe("Call Recording API", () => {
  beforeEach(() => {
    resetMocks();
    setupGraphQLMock();
  });

  // ====================================
  // POST /api/calls/[id]/recording
  // ====================================
  describe("POST /api/calls/[id]/recording - Start Recording", () => {
    it("should return 400 for invalid call ID format", async () => {
      mockAuthenticated();

      const request = new NextRequest(
        "http://localhost:3000/api/calls/invalid-id/recording",
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: "invalid-id" });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid call ID");
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for invalid request body", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "invalid-format" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid request body");
    });

    it("should return 404 if call does not exist", async () => {
      mockAuthenticated();

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Call not found");
    });

    it("should return 400 if call is not active", async () => {
      mockAuthenticated();
      setupCall(validCallId, { status: "ended" });
      setupParticipant(validCallId, validUserId);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Call is not active");
    });

    it("should return 403 if user is not a participant or initiator", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440099";
      mockAuthenticated(otherUserId);
      setupCall(validCallId, { initiatorId: validUserId });
      // No participants added for otherUserId

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });

    it("should return 409 if recording is already in progress", async () => {
      mockAuthenticated();
      setupCall(validCallId);
      setupParticipant(validCallId, validUserId);
      setupRecording(validCallId, { status: "recording" });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Recording already in progress");
    });

    it("should start recording successfully as initiator", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      mockLiveKitService.startRecording.mockResolvedValue(validEgressId);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({
            format: "mp4",
            quality: "1080p",
            layout: "grid",
          }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.recording).toBeDefined();
      expect(data.recording.callId).toBe(validCallId);
      expect(data.recording.status).toBe("recording");
      expect(data.message).toBe("Recording started successfully");
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith({
        roomName: validRoomName,
        layout: "grid",
        audioOnly: false,
        resolution: "1080p",
        outputFormat: "mp4",
      });
    });

    it("should start recording successfully as participant", async () => {
      const participantUserId = "550e8400-e29b-41d4-a716-446655440003";
      mockAuthenticated(participantUserId);
      setupCall(validCallId, { initiatorId: validUserId });
      setupParticipant(validCallId, participantUserId);
      mockLiveKitService.startRecording.mockResolvedValue(validEgressId);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "webm", quality: "720p" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it("should use default values when optional fields are omitted", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      mockLiveKitService.startRecording.mockResolvedValue(validEgressId);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith({
        roomName: validRoomName,
        layout: "grid",
        audioOnly: false,
        resolution: "1080p",
        outputFormat: "mp4",
      });
    });

    it("should return 500 if LiveKit recording fails to start", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      mockLiveKitService.startRecording.mockRejectedValue(
        new Error("LiveKit error"),
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to start recording service");
    });
  });

  // ====================================
  // GET /api/calls/[id]/recording
  // ====================================
  describe("GET /api/calls/[id]/recording - Get Recording Status", () => {
    it("should return 400 for invalid call ID format", async () => {
      mockAuthenticated();

      const request = new NextRequest(
        "http://localhost:3000/api/calls/invalid-id/recording",
      );
      const params = Promise.resolve({ id: "invalid-id" });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid call ID");
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user has no access to call", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440099";
      mockAuthenticated(otherUserId);
      setupCall(validCallId, { initiatorId: validUserId });
      // No participants for otherUserId

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Access denied");
    });

    it("should return 404 if no recording exists", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      // No recording setup

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("No recording found");
    });

    it("should return recording details for active recording", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      setupRecording(validCallId, { status: "recording" });
      mockLiveKitService.getEgressInfo.mockResolvedValue({
        status: "EGRESS_ACTIVE",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recording).toBeDefined();
      expect(data.recording.callId).toBe(validCallId);
      expect(data.recording.status).toBe("recording");
      expect(data.recording.egressStatus).toBe("EGRESS_ACTIVE");
    });

    it("should return completed recording with file URL", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      setupRecording(validCallId, {
        status: "completed",
        fileUrl: "https://storage.example.com/recording.mp4",
      });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recording.status).toBe("completed");
      expect(data.recording.url).toBe(
        "https://storage.example.com/recording.mp4",
      );
    });

    it("should allow participant to view recording", async () => {
      const participantUserId = "550e8400-e29b-41d4-a716-446655440003";
      mockAuthenticated(participantUserId);
      setupCall(validCallId, { initiatorId: validUserId });
      setupParticipant(validCallId, participantUserId);
      setupRecording(validCallId, { status: "completed" });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.recording).toBeDefined();
    });
  });

  // ====================================
  // DELETE /api/calls/[id]/recording
  // ====================================
  describe("DELETE /api/calls/[id]/recording - Stop Recording", () => {
    it("should return 400 for invalid call ID format", async () => {
      mockAuthenticated();

      const request = new NextRequest(
        "http://localhost:3000/api/calls/invalid-id/recording",
        {
          method: "DELETE",
        },
      );
      const params = Promise.resolve({ id: "invalid-id" });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid call ID");
    });

    it("should return 401 for unauthenticated requests", async () => {
      mockUnauthenticated();

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if no active recording exists", async () => {
      mockAuthenticated();
      // No recording setup

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("No active recording found");
    });

    it("should return 403 if user is not recorder or initiator", async () => {
      const otherUserId = "550e8400-e29b-41d4-a716-446655440099";
      mockAuthenticated(otherUserId);
      setupCall(validCallId, { initiatorId: validUserId });
      setupRecording(validCallId, { recordedBy: validUserId });

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });

    it("should stop recording successfully as recorder", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      setupRecording(validCallId, { recordedBy: validUserId });
      mockLiveKitService.stopRecording.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recording).toBeDefined();
      expect(data.recording.status).toBe("processing");
      expect(data.message).toBe(
        "Recording stopped and processing. File will be available after LiveKit completes encoding.",
      );
      expect(mockLiveKitService.stopRecording).toHaveBeenCalledWith(
        validEgressId,
      );
    });

    it("should stop recording successfully as call initiator", async () => {
      const recorderId = "550e8400-e29b-41d4-a716-446655440003";
      mockAuthenticated(validUserId); // Initiator
      setupCall(validCallId, { initiatorId: validUserId });
      setupRecording(validCallId, { recordedBy: recorderId }); // Different person started recording
      mockLiveKitService.stopRecording.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should continue with database update even if LiveKit fails", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      setupRecording(validCallId, { recordedBy: validUserId });
      mockLiveKitService.stopRecording.mockRejectedValue(
        new Error("LiveKit error"),
      );

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await DELETE(request, { params });
      const data = await response.json();

      // Should still succeed even if LiveKit fails
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should calculate recording duration correctly", async () => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      const startTime = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      setupRecording(validCallId, {
        recordedBy: validUserId,
        startedAt: startTime,
      });
      mockLiveKitService.stopRecording.mockResolvedValue(undefined);

      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        { method: "DELETE" },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Duration should be approximately 120 seconds (with some tolerance for test execution time)
      expect(data.recording.duration).toBeGreaterThanOrEqual(119);
      expect(data.recording.duration).toBeLessThanOrEqual(125);
    });
  });

  // ====================================
  // Recording Format Options
  // ====================================
  describe("Recording Format Options", () => {
    beforeEach(() => {
      mockAuthenticated();
      setupCall(validCallId, { initiatorId: validUserId });
      mockLiveKitService.startRecording.mockResolvedValue(validEgressId);
    });

    it("should support mp4 format", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "mp4" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ outputFormat: "mp4" }),
      );
    });

    it("should support webm format", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ format: "webm" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ outputFormat: "webm" }),
      );
    });

    it("should support 720p quality", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ quality: "720p" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ resolution: "720p" }),
      );
    });

    it("should support 4k quality", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ quality: "4k" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ resolution: "4k" }),
      );
    });

    it("should support audio-only recording", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ audioOnly: true }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ audioOnly: true }),
      );
    });

    it("should support speaker layout", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ layout: "speaker" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ layout: "speaker" }),
      );
    });

    it("should support single layout", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/calls/${validCallId}/recording`,
        {
          method: "POST",
          body: JSON.stringify({ layout: "single" }),
        },
      );
      const params = Promise.resolve({ id: validCallId });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockLiveKitService.startRecording).toHaveBeenCalledWith(
        expect.objectContaining({ layout: "single" }),
      );
    });
  });
});
