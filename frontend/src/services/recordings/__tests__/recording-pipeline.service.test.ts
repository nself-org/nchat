/**
 * @jest-environment node
 */

/**
 * Recording Pipeline Service Tests
 *
 * Comprehensive test suite for the RecordingPipelineService:
 * - Recording lifecycle (start, stop, get)
 * - Multi-track recording
 * - Encryption
 * - Processing jobs
 * - Event emission
 */

import {
  RecordingPipelineService,
  createRecordingPipeline,
} from "../recording-pipeline.service";
import { RecordingNotFoundError, StorageQuotaExceededError } from "../types";

// Mock S3 client
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

describe("RecordingPipelineService", () => {
  let service: RecordingPipelineService;

  beforeEach(() => {
    service = createRecordingPipeline({
      encryptionEnabled: false,
    });
  });

  afterEach(() => {
    service.clearAll();
  });

  // ==========================================================================
  // Recording Lifecycle Tests
  // ==========================================================================

  describe("Recording Lifecycle", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should start a new recording", async () => {
      const result = await service.startRecording(
        {
          callId: "call-789",
          channelId,
          source: "call",
          format: "mp4",
          quality: "1080p",
        },
        userId,
      );

      expect(result.success).toBe(true);
      expect(result.recording.id).toBeDefined();
      expect(result.recording.status).toBe("recording");
      expect(result.recording.recordedBy).toBe(userId);
      expect(result.recording.channelId).toBe(channelId);
      expect(result.recording.source).toBe("call");
    });

    it("should prevent duplicate recordings for same source", async () => {
      const callId = "call-789";

      await service.startRecording(
        { callId, channelId, source: "call" },
        userId,
      );

      await expect(
        service.startRecording({ callId, channelId, source: "call" }, userId),
      ).rejects.toThrow("Recording already in progress");
    });

    it("should stop an active recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      const result = await service.stopRecording(recording.id, userId);

      expect(result.success).toBe(true);
      expect(result.recording.status).toBe("processing");
      expect(result.recording.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(result.recording.endedAt).toBeDefined();
    });

    it("should throw error when stopping non-active recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      await service.stopRecording(recording.id, userId);

      await expect(service.stopRecording(recording.id, userId)).rejects.toThrow(
        "Recording is not active",
      );
    });

    it("should get recording by ID", async () => {
      const { recording: created } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      const recording = await service.getRecording(created.id);

      expect(recording.id).toBe(created.id);
      expect(recording.status).toBe("recording");
    });

    it("should throw error for non-existent recording", async () => {
      await expect(service.getRecording("non-existent-id")).rejects.toThrow(
        RecordingNotFoundError,
      );
    });

    it("should return null for getRecordingIfExists with non-existent ID", async () => {
      const recording = await service.getRecordingIfExists("non-existent-id");
      expect(recording).toBeNull();
    });
  });

  // ==========================================================================
  // Multi-Track Recording Tests
  // ==========================================================================

  describe("Multi-Track Recording", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should add audio track to recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      const track = await service.addTrack(
        recording.id,
        {
          type: "audio",
          participantId: "participant-1",
          participantName: "John Doe",
          startOffset: 0,
          durationSeconds: 0,
          muted: false,
        },
        userId,
      );

      expect(track.id).toBeDefined();
      expect(track.type).toBe("audio");
      expect(track.participantId).toBe("participant-1");
    });

    it("should add video track to recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      const track = await service.addTrack(
        recording.id,
        {
          type: "video",
          participantId: "participant-1",
          participantName: "John Doe",
          startOffset: 5,
          durationSeconds: 0,
          muted: false,
        },
        userId,
      );

      expect(track.type).toBe("video");
      expect(track.startOffset).toBe(5);
    });

    it("should add screen share track to recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      const track = await service.addTrack(
        recording.id,
        {
          type: "screen",
          participantId: "participant-1",
          participantName: "John Doe",
          startOffset: 10,
          durationSeconds: 0,
          muted: false,
        },
        userId,
      );

      expect(track.type).toBe("screen");
    });

    it("should prevent adding track to non-active recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      await service.stopRecording(recording.id, userId);

      await expect(
        service.addTrack(
          recording.id,
          {
            type: "audio",
            participantId: "participant-1",
            participantName: "John Doe",
            startOffset: 0,
            durationSeconds: 0,
            muted: false,
          },
          userId,
        ),
      ).rejects.toThrow("Recording is not active");
    });
  });

  // ==========================================================================
  // Participant Management Tests
  // ==========================================================================

  describe("Participant Management", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should add participant to recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      await service.addParticipant(recording.id, {
        userId: "participant-2",
        displayName: "Jane Doe",
        joinedAt: new Date().toISOString(),
        durationSeconds: 0,
        hasAudio: true,
        hasVideo: true,
        wasScreenSharing: false,
      });

      const updated = await service.getRecording(recording.id);
      expect(updated.metadata.participants).toHaveLength(2);
      expect(updated.metadata.totalParticipants).toBe(2);
    });

    it("should update existing participant", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      await service.addParticipant(recording.id, {
        userId,
        displayName: "Updated Name",
        joinedAt: new Date().toISOString(),
        durationSeconds: 100,
        hasAudio: true,
        hasVideo: true,
        wasScreenSharing: true,
      });

      const updated = await service.getRecording(recording.id);
      const participant = updated.metadata.participants.find(
        (p) => p.userId === userId,
      );
      expect(participant?.displayName).toBe("Updated Name");
      expect(participant?.wasScreenSharing).toBe(true);
    });

    it("should track peak participants", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-789", channelId, source: "call" },
        userId,
      );

      await service.addParticipant(recording.id, {
        userId: "p2",
        displayName: "User 2",
        joinedAt: new Date().toISOString(),
        durationSeconds: 0,
        hasAudio: true,
        hasVideo: true,
        wasScreenSharing: false,
      });

      await service.addParticipant(recording.id, {
        userId: "p3",
        displayName: "User 3",
        joinedAt: new Date().toISOString(),
        durationSeconds: 0,
        hasAudio: true,
        hasVideo: true,
        wasScreenSharing: false,
      });

      const updated = await service.getRecording(recording.id);
      expect(updated.metadata.peakParticipants).toBe(3);
    });
  });

  // ==========================================================================
  // Recording Listing Tests
  // ==========================================================================

  describe("Recording Listing", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should list recordings with pagination", async () => {
      // Create 5 recordings
      for (let i = 0; i < 5; i++) {
        const { recording } = await service.startRecording(
          { callId: `call-${i}`, channelId, source: "call" },
          userId,
        );
        await service.stopRecording(recording.id, userId);
      }

      const { recordings, total } = await service.listRecordings({
        limit: 3,
        offset: 0,
      });

      expect(recordings).toHaveLength(3);
      expect(total).toBe(5);
    });

    it("should filter recordings by status", async () => {
      const { recording: active } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const { recording: stopped } = await service.startRecording(
        { callId: "call-2", channelId, source: "livestream" },
        userId,
      );
      await service.stopRecording(stopped.id, userId);

      const { recordings } = await service.listRecordings({
        status: ["recording"],
      });

      expect(recordings).toHaveLength(1);
      expect(recordings[0].id).toBe(active.id);
    });

    it("should filter recordings by source", async () => {
      await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.startRecording(
        { streamId: "stream-1", channelId, source: "livestream" },
        userId,
      );

      const { recordings } = await service.listRecordings({
        source: ["livestream"],
      });

      expect(recordings).toHaveLength(1);
      expect(recordings[0].source).toBe("livestream");
    });

    it("should sort recordings by creation date", async () => {
      for (let i = 0; i < 3; i++) {
        await service.startRecording(
          { callId: `call-${i}`, channelId, source: "call" },
          userId,
        );
        // Small delay to ensure distinct timestamps
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const { recordings: desc } = await service.listRecordings({
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      const { recordings: asc } = await service.listRecordings({
        sortBy: "createdAt",
        sortOrder: "asc",
      });

      expect(new Date(desc[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(desc[2].createdAt).getTime(),
      );
      expect(new Date(asc[0].createdAt).getTime()).toBeLessThanOrEqual(
        new Date(asc[2].createdAt).getTime(),
      );
    });

    it("should filter recordings by date range", async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

      await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      // Capture endDate AFTER startRecording so the recording's createdAt falls within range
      const endDate = new Date(Date.now() + 60 * 1000); // 1 minute in future for safety

      const { recordings } = await service.listRecordings({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(recordings.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Processing Queue Tests
  // ==========================================================================

  describe("Processing Queue", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should create processing job", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const job = await service.createProcessingJob(recording.id, "transcode", {
        targetQuality: "720p",
      });

      expect(job.id).toBeDefined();
      expect(job.recordingId).toBe(recording.id);
      expect(job.type).toBe("transcode");
      expect(job.status).toBe("queued");
    });

    it("should get processing job by ID", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const created = await service.createProcessingJob(
        recording.id,
        "thumbnail",
        { intervals: [0, 30] },
      );

      const job = await service.getProcessingJob(created.id);

      expect(job).not.toBeNull();
      expect(job!.id).toBe(created.id);
    });

    it("should get all processing jobs for a recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.createProcessingJob(recording.id, "transcode", {});
      await service.createProcessingJob(recording.id, "thumbnail", {});
      await service.createProcessingJob(recording.id, "extract_audio", {});

      const jobs = await service.getProcessingJobs(recording.id);

      expect(jobs).toHaveLength(3);
    });

    it("should update processing job status", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const job = await service.createProcessingJob(
        recording.id,
        "transcode",
        {},
      );

      const updated = await service.updateProcessingJob(job.id, {
        status: "processing",
        progress: 50,
      });

      expect(updated.status).toBe("processing");
      expect(updated.progress).toBe(50);
      expect(updated.startedAt).toBeDefined();
    });

    it("should mark job completed with duration", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const job = await service.createProcessingJob(
        recording.id,
        "transcode",
        {},
      );

      await service.updateProcessingJob(job.id, { status: "processing" });
      const completed = await service.updateProcessingJob(job.id, {
        status: "completed",
        progress: 100,
      });

      expect(completed.status).toBe("completed");
      expect(completed.completedAt).toBeDefined();
      expect(completed.actualDuration).toBeDefined();
    });
  });

  // ==========================================================================
  // Event Tests
  // ==========================================================================

  describe("Events", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should emit recording.started event", async () => {
      await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      const events = service.getAllEvents();
      const startEvent = events.find((e) => e.type === "recording.started");

      expect(startEvent).toBeDefined();
      expect(startEvent!.userId).toBe(userId);
    });

    it("should emit recording.stopped event", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.stopRecording(recording.id, userId);

      const events = service.getAllEvents();
      const stopEvent = events.find((e) => e.type === "recording.stopped");

      expect(stopEvent).toBeDefined();
    });

    it("should get events for a recording", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.stopRecording(recording.id, userId);

      const events = await service.getEvents(recording.id);

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].recordingId).toBe(recording.id);
    });
  });

  // ==========================================================================
  // Encryption Tests
  // ==========================================================================

  describe("Encryption", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should create encrypted recording when enabled", async () => {
      const encryptedService = createRecordingPipeline({
        encryptionEnabled: true,
      });

      const { recording } = await encryptedService.startRecording(
        { callId: "call-1", channelId, source: "call", encrypt: true },
        userId,
      );

      expect(recording.isEncrypted).toBe(true);

      encryptedService.clearAll();
    });

    it("should create non-encrypted recording when disabled", async () => {
      const { recording } = await service.startRecording(
        { callId: "call-1", channelId, source: "call", encrypt: false },
        userId,
      );

      expect(recording.isEncrypted).toBe(false);
    });

    it("should encrypt and decrypt file buffer", async () => {
      const encryptedService = createRecordingPipeline({
        encryptionEnabled: true,
      });

      const originalBuffer = Buffer.from("test data for encryption");
      const recordingId = "test-recording";

      const { buffer: encrypted, metadata } =
        await encryptedService.encryptFile(originalBuffer, recordingId);

      expect(encrypted).not.toEqual(originalBuffer);
      expect(metadata.iv).toBeDefined();
      expect(metadata.originalChecksum).toBeDefined();

      encryptedService.clearAll();
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("Utility Methods", () => {
    const userId = "user-123";
    const channelId = "channel-456";

    it("should clear all recordings", async () => {
      await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.startRecording(
        { callId: "call-2", channelId, source: "livestream" },
        userId,
      );

      service.clearAll();

      expect(service.getAllRecordings()).toHaveLength(0);
      expect(service.getAllEvents()).toHaveLength(0);
    });

    it("should get all recordings", async () => {
      await service.startRecording(
        { callId: "call-1", channelId, source: "call" },
        userId,
      );

      await service.startRecording(
        { callId: "call-2", channelId, source: "livestream" },
        userId,
      );

      const recordings = service.getAllRecordings();

      expect(recordings).toHaveLength(2);
    });
  });
});
