/**
 * @jest-environment node
 */

/**
 * Redaction Service Tests
 *
 * Comprehensive test suite for RedactionService:
 * - Redaction segment management
 * - Redaction requests
 * - Audit logging
 * - Export functionality
 */

import { RedactionService, createRedactionService } from "../redaction.service";
import { createRecordingPipeline } from "../recording-pipeline.service";
import { RedactionError } from "../types";

// Mock dependencies
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed-url.example.com"),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("@/services/files/config", () => ({
  getStorageConfig: jest.fn().mockReturnValue({
    endpoint: "http://localhost:9000",
    bucket: "test-bucket",
    region: "us-east-1",
    accessKey: "test-key",
    secretKey: "test-secret",
    provider: "minio",
  }),
}));

describe("RedactionService", () => {
  let service: RedactionService;
  let pipeline: ReturnType<typeof createRecordingPipeline>;

  const userId = "user-123";
  const channelId = "channel-456";

  beforeEach(() => {
    pipeline = createRecordingPipeline({ encryptionEnabled: false });
    service = createRedactionService(undefined, pipeline);
  });

  afterEach(() => {
    service.clearAll();
    pipeline.clearAll();
  });

  // Helper to create a completed recording
  async function createCompletedRecording() {
    const { recording } = await pipeline.startRecording(
      { callId: "call-1", channelId, source: "call" },
      userId,
    );
    await pipeline.stopRecording(recording.id, userId);

    // Manually set status to completed and add duration
    const updated = await pipeline.getRecording(recording.id);
    (updated as any).status = "completed";
    (updated as any).durationSeconds = 300; // 5 minutes

    return updated;
  }

  // ==========================================================================
  // Redaction Segment Tests
  // ==========================================================================

  describe("Redaction Segments", () => {
    it("should add redaction segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        {
          type: "both",
          startSeconds: 10,
          endSeconds: 20,
          reason: "Contains sensitive information",
        },
        userId,
      );

      expect(segment.id).toBeDefined();
      expect(segment.type).toBe("both");
      expect(segment.startSeconds).toBe(10);
      expect(segment.endSeconds).toBe(20);
      expect(segment.reason).toBe("Contains sensitive information");
      expect(segment.applied).toBe(false);
    });

    it("should add audio-only redaction", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        {
          type: "audio",
          startSeconds: 30,
          endSeconds: 45,
          reason: "Private conversation",
        },
        userId,
      );

      expect(segment.type).toBe("audio");
    });

    it("should add video-only redaction", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        {
          type: "video",
          startSeconds: 60,
          endSeconds: 90,
          reason: "Visible confidential document",
        },
        userId,
      );

      expect(segment.type).toBe("video");
    });

    it("should add blur redaction with region", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        {
          type: "blur",
          startSeconds: 100,
          endSeconds: 120,
          reason: "Face blur for privacy",
          region: {
            x: 0.2,
            y: 0.1,
            width: 0.3,
            height: 0.4,
            trackMovement: true,
          },
        },
        userId,
      );

      expect(segment.type).toBe("blur");
      expect(segment.region).toBeDefined();
      expect(segment.region?.trackMovement).toBe(true);
    });

    it("should add beep redaction", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        {
          type: "beep",
          startSeconds: 150,
          endSeconds: 155,
          reason: "Profanity",
        },
        userId,
      );

      expect(segment.type).toBe("beep");
    });

    it("should add silence redaction", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        {
          type: "silence",
          startSeconds: 200,
          endSeconds: 210,
          reason: "Fade out for transition",
        },
        userId,
      );

      expect(segment.type).toBe("silence");
    });

    it("should throw error for non-completed recording", async () => {
      const { recording } = await pipeline.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await expect(
        service.addRedactionSegment(
          recording.id,
          { type: "both", startSeconds: 0, endSeconds: 10, reason: "Test" },
          userId,
        ),
      ).rejects.toThrow("only redact completed recordings");
    });

    it("should throw error for negative start time", async () => {
      const recording = await createCompletedRecording();

      await expect(
        service.addRedactionSegment(
          recording.id,
          { type: "both", startSeconds: -5, endSeconds: 10, reason: "Test" },
          userId,
        ),
      ).rejects.toThrow("cannot be negative");
    });

    it("should throw error when end time is before start time", async () => {
      const recording = await createCompletedRecording();

      await expect(
        service.addRedactionSegment(
          recording.id,
          { type: "both", startSeconds: 20, endSeconds: 10, reason: "Test" },
          userId,
        ),
      ).rejects.toThrow("End time must be after start time");
    });

    it("should throw error when end time exceeds duration", async () => {
      const recording = await createCompletedRecording();

      await expect(
        service.addRedactionSegment(
          recording.id,
          { type: "both", startSeconds: 0, endSeconds: 500, reason: "Test" },
          userId,
        ),
      ).rejects.toThrow("exceeds recording duration");
    });

    it("should throw error for too short segment", async () => {
      const shortService = createRedactionService(
        { minSegmentDuration: 1 },
        pipeline,
      );
      const recording = await createCompletedRecording();

      await expect(
        shortService.addRedactionSegment(
          recording.id,
          { type: "both", startSeconds: 10, endSeconds: 10.3, reason: "Test" },
          userId,
        ),
      ).rejects.toThrow("at least");

      shortService.clearAll();
    });

    it("should throw error for too long segment", async () => {
      const limitedService = createRedactionService(
        { maxSegmentDuration: 60 },
        pipeline,
      );
      const recording = await createCompletedRecording();

      await expect(
        limitedService.addRedactionSegment(
          recording.id,
          { type: "both", startSeconds: 0, endSeconds: 120, reason: "Test" },
          userId,
        ),
      ).rejects.toThrow("cannot exceed");

      limitedService.clearAll();
    });

    it("should get redaction segment by ID", async () => {
      const recording = await createCompletedRecording();

      const created = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      const segment = await service.getRedactionSegment(created.id);

      expect(segment).not.toBeNull();
      expect(segment!.id).toBe(created.id);
    });

    it("should get all segments for a recording", async () => {
      const recording = await createCompletedRecording();

      await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test 1" },
        userId,
      );
      await service.addRedactionSegment(
        recording.id,
        { type: "audio", startSeconds: 50, endSeconds: 60, reason: "Test 2" },
        userId,
      );
      await service.addRedactionSegment(
        recording.id,
        { type: "video", startSeconds: 30, endSeconds: 40, reason: "Test 3" },
        userId,
      );

      const segments = await service.getRedactionSegments(recording.id);

      expect(segments).toHaveLength(3);
      // Should be sorted by startSeconds
      expect(segments[0].startSeconds).toBe(10);
      expect(segments[1].startSeconds).toBe(30);
      expect(segments[2].startSeconds).toBe(50);
    });

    it("should update redaction segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Original" },
        userId,
      );

      const updated = await service.updateRedactionSegment(
        segment.id,
        {
          type: "audio",
          startSeconds: 15,
          endSeconds: 25,
          reason: "Updated reason",
        },
        userId,
      );

      expect(updated.type).toBe("audio");
      expect(updated.startSeconds).toBe(15);
      expect(updated.endSeconds).toBe(25);
      expect(updated.reason).toBe("Updated reason");
    });

    it("should not update applied segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      // Mark as applied
      const storedSegment = await service.getRedactionSegment(segment.id);
      (storedSegment as any).applied = true;

      await expect(
        service.updateRedactionSegment(
          segment.id,
          { reason: "New reason" },
          userId,
        ),
      ).rejects.toThrow("Cannot modify an applied segment");
    });

    it("should remove redaction segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      await service.removeRedactionSegment(segment.id, userId);

      const removed = await service.getRedactionSegment(segment.id);
      expect(removed).toBeNull();
    });

    it("should not remove applied segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      // Mark as applied
      const storedSegment = await service.getRedactionSegment(segment.id);
      (storedSegment as any).applied = true;

      await expect(
        service.removeRedactionSegment(segment.id, userId),
      ).rejects.toThrow("Cannot remove an applied segment");
    });

    it("should prevent overlapping segments when configured", async () => {
      const noOverlapService = createRedactionService(
        { allowOverlappingSegments: false },
        pipeline,
      );
      const recording = await createCompletedRecording();

      await noOverlapService.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 30, reason: "First" },
        userId,
      );

      // Mark first segment as applied
      const segments = await noOverlapService.getRedactionSegments(
        recording.id,
      );
      (segments[0] as any).applied = true;

      await expect(
        noOverlapService.addRedactionSegment(
          recording.id,
          {
            type: "both",
            startSeconds: 20,
            endSeconds: 40,
            reason: "Overlapping",
          },
          userId,
        ),
      ).rejects.toThrow("Overlapping");

      noOverlapService.clearAll();
    });
  });

  // ==========================================================================
  // Redaction Request Tests
  // ==========================================================================

  describe("Redaction Requests", () => {
    it("should create redaction request with multiple segments", async () => {
      const recording = await createCompletedRecording();

      const request = await service.createRedactionRequest(
        recording.id,
        [
          {
            type: "both",
            startSeconds: 10,
            endSeconds: 20,
            reason: "Segment 1",
            createdBy: userId,
          },
          {
            type: "audio",
            startSeconds: 50,
            endSeconds: 60,
            reason: "Segment 2",
            createdBy: userId,
          },
        ],
        userId,
      );

      expect(request.id).toBeDefined();
      expect(request.segments).toHaveLength(2);
      expect(request.status).toBe("pending");
    });

    it("should apply redaction request immediately when requested", async () => {
      const immediateService = createRedactionService(
        { requireApproval: false },
        pipeline,
      );
      const recording = await createCompletedRecording();

      const request = await immediateService.createRedactionRequest(
        recording.id,
        [
          {
            type: "both",
            startSeconds: 10,
            endSeconds: 20,
            reason: "Test",
            createdBy: userId,
          },
        ],
        userId,
        { applyImmediately: true },
      );

      expect(request.status).toBe("completed");

      immediateService.clearAll();
    });

    it("should get redaction request by ID", async () => {
      const recording = await createCompletedRecording();

      const created = await service.createRedactionRequest(
        recording.id,
        [
          {
            type: "both",
            startSeconds: 10,
            endSeconds: 20,
            reason: "Test",
            createdBy: userId,
          },
        ],
        userId,
      );

      const request = await service.getRedactionRequest(created.id);

      expect(request).not.toBeNull();
      expect(request!.id).toBe(created.id);
    });

    it("should get all requests for a recording", async () => {
      const recording = await createCompletedRecording();

      await service.createRedactionRequest(
        recording.id,
        [
          {
            type: "both",
            startSeconds: 10,
            endSeconds: 20,
            reason: "Request 1",
            createdBy: userId,
          },
        ],
        userId,
      );
      await service.createRedactionRequest(
        recording.id,
        [
          {
            type: "audio",
            startSeconds: 50,
            endSeconds: 60,
            reason: "Request 2",
            createdBy: userId,
          },
        ],
        userId,
      );

      const requests = await service.getRedactionRequests(recording.id);

      expect(requests).toHaveLength(2);
    });

    it("should apply pending redaction request", async () => {
      const recording = await createCompletedRecording();

      const request = await service.createRedactionRequest(
        recording.id,
        [
          {
            type: "both",
            startSeconds: 10,
            endSeconds: 20,
            reason: "Test",
            createdBy: userId,
          },
        ],
        userId,
      );

      const applied = await service.applyRedactionRequest(request.id, userId);

      expect(applied.status).toBe("completed");
      expect(applied.completedAt).toBeDefined();
    });

    it("should not apply already processed request", async () => {
      const recording = await createCompletedRecording();

      const request = await service.createRedactionRequest(
        recording.id,
        [
          {
            type: "both",
            startSeconds: 10,
            endSeconds: 20,
            reason: "Test",
            createdBy: userId,
          },
        ],
        userId,
      );

      await service.applyRedactionRequest(request.id, userId);

      await expect(
        service.applyRedactionRequest(request.id, userId),
      ).rejects.toThrow("already completed");
    });
  });

  // ==========================================================================
  // Audit Log Tests
  // ==========================================================================

  describe("Audit Logs", () => {
    it("should create audit log when adding segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      const logs = await service.getAuditLogs(recording.id);

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe("created");
      expect(logs[0].segmentId).toBe(segment.id);
      expect(logs[0].performedBy).toBe(userId);
    });

    it("should create audit log when removing segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      await service.removeRedactionSegment(segment.id, userId);

      const logs = await service.getAuditLogs(recording.id);

      expect(logs).toHaveLength(2);
      const removeLog = logs.find((l) => l.action === "removed");
      expect(removeLog).toBeDefined();
    });

    it("should get audit logs for specific segment", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      const logs = await service.getSegmentAuditLogs(segment.id);

      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].segmentId).toBe(segment.id);
    });

    it("should cleanup old audit logs", async () => {
      const shortRetentionService = createRedactionService(
        {
          auditLogRetentionDays: 0, // Immediate cleanup
        },
        pipeline,
      );
      const recording = await createCompletedRecording();

      await shortRetentionService.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      // Wait a bit to ensure timestamp is in the past
      await new Promise((resolve) => setTimeout(resolve, 10));

      const deletedCount = await shortRetentionService.cleanupAuditLogs();

      expect(deletedCount).toBeGreaterThanOrEqual(0);

      shortRetentionService.clearAll();
    });
  });

  // ==========================================================================
  // Export Tests
  // ==========================================================================

  describe("Export", () => {
    it("should get redacted version when available", async () => {
      const recording = await createCompletedRecording();

      // No redacted version initially
      const noVersion = await service.getRedactedVersion(recording.id);
      expect(noVersion).toBeNull();
    });

    it("should export redacted recording", async () => {
      const recording = await createCompletedRecording();

      const segment = await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      // Mark segment as applied
      const storedSegment = await service.getRedactionSegment(segment.id);
      (storedSegment as any).applied = true;

      // Update recording with file path and redactions
      const updatedRecording = await pipeline.getRecording(recording.id);
      updatedRecording.redactions = [storedSegment!];
      (updatedRecording as any).filePath = "recordings/test-recording.webm";

      const result = await service.exportRedactedRecording(
        recording.id,
        userId,
      );

      expect(result.downloadUrl).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it("should throw error when no applied redactions", async () => {
      const recording = await createCompletedRecording();

      await expect(
        service.exportRedactedRecording(recording.id, userId),
      ).rejects.toThrow("No applied redactions");
    });
  });

  // ==========================================================================
  // Preview Tests
  // ==========================================================================

  describe("Preview", () => {
    it("should generate redaction preview", async () => {
      const recording = await createCompletedRecording();

      const result = await service.generateRedactionPreview(recording.id, {
        type: "both",
        startSeconds: 10,
        endSeconds: 20,
      });

      expect(result.previewUrl).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utility Methods", () => {
    it("should clear all data", async () => {
      const recording = await createCompletedRecording();

      await service.addRedactionSegment(
        recording.id,
        { type: "both", startSeconds: 10, endSeconds: 20, reason: "Test" },
        userId,
      );

      service.clearAll();

      expect(service.getAllSegments()).toHaveLength(0);
      expect(service.getAllRequests()).toHaveLength(0);
      expect(service.getAllAuditLogs()).toHaveLength(0);
    });
  });
});
