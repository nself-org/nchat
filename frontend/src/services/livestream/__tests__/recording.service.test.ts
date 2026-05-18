/**
 * @jest-environment node
 */

/**
 * Livestream Recording Service Tests
 *
 * Tests for stream recording, VOD processing, trimming, and clip creation.
 */

import {
  LivestreamRecordingService,
  createRecordingService,
  getRecordingService,
} from "../recording.service";
import type { RecordingTrim, ClipConfig } from "../types";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("LivestreamRecordingService", () => {
  let service: LivestreamRecordingService;
  const streamId = "stream-123";
  const userId = "user-1";

  beforeEach(() => {
    service = createRecordingService("https://storage.example.com");
  });

  // ==========================================================================
  // Recording Lifecycle Tests
  // ==========================================================================

  describe("recording lifecycle", () => {
    it("should start recording", async () => {
      const recording = await service.startRecording(streamId, userId);

      expect(recording.id).toBeDefined();
      expect(recording.streamId).toBe(streamId);
      expect(recording.status).toBe("recording");
      expect(recording.format).toBe("mp4");
    });

    it("should throw error when recording already in progress", async () => {
      await service.startRecording(streamId, userId);

      await expect(service.startRecording(streamId, userId)).rejects.toThrow(
        "Recording already in progress",
      );
    });

    it("should stop recording and start processing", async () => {
      await service.startRecording(streamId, userId);
      const stopped = await service.stopRecording(streamId, userId);

      expect(stopped.status).toBe("processing");
    });

    it("should throw error when stopping non-existent recording", async () => {
      await expect(service.stopRecording(streamId, userId)).rejects.toThrow(
        "No active recording",
      );
    });

    it("should get active recording for stream", async () => {
      await service.startRecording(streamId, userId);

      const active = await service.getActiveRecording(streamId);

      expect(active).not.toBeNull();
      expect(active?.streamId).toBe(streamId);
    });

    it("should return null for stream without active recording", async () => {
      const active = await service.getActiveRecording(streamId);

      expect(active).toBeNull();
    });
  });

  // ==========================================================================
  // Recording Retrieval Tests
  // ==========================================================================

  describe("recording retrieval", () => {
    it("should get recording by ID", async () => {
      const recording = await service.startRecording(streamId, userId);

      const retrieved = await service.getRecording(recording.id);

      expect(retrieved.id).toBe(recording.id);
    });

    it("should throw error for non-existent recording", async () => {
      await expect(service.getRecording("non-existent")).rejects.toThrow(
        "Recording not found",
      );
    });

    it("should get all recordings for stream", async () => {
      const rec1 = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      // Wait for processing simulation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const rec2 = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      const recordings = await service.getStreamRecordings(streamId);

      expect(recordings.length).toBe(2);
    });

    it("should return recordings sorted by date", async () => {
      const rec1 = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const rec2 = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      const recordings = await service.getStreamRecordings(streamId);

      expect(new Date(recordings[0].createdAt).getTime()).toBeGreaterThan(
        new Date(recordings[1].createdAt).getTime(),
      );
    });
  });

  // ==========================================================================
  // Trimming Tests
  // ==========================================================================

  describe("trimming", () => {
    it("should create trimmed recording", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const trim: RecordingTrim = {
        startSeconds: 30,
        endSeconds: 120,
      };

      const trimmed = await service.trimRecording(original.id, userId, trim);

      expect(trimmed.id).not.toBe(original.id);
      expect(trimmed.status).toBe("processing");
    });

    it("should throw error for invalid start time", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const trim: RecordingTrim = {
        startSeconds: -10,
        endSeconds: 60,
      };

      await expect(
        service.trimRecording(original.id, userId, trim),
      ).rejects.toThrow("Start time cannot be negative");
    });

    it("should throw error when start >= end", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const trim: RecordingTrim = {
        startSeconds: 60,
        endSeconds: 30,
      };

      await expect(
        service.trimRecording(original.id, userId, trim),
      ).rejects.toThrow("Start time must be before end time");
    });

    it("should throw error when recording not ready", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      // Don't wait for processing

      const trim: RecordingTrim = {
        startSeconds: 30,
        endSeconds: 60,
      };

      await expect(
        service.trimRecording(original.id, userId, trim),
      ).rejects.toThrow("Recording is not ready");
    });
  });

  // ==========================================================================
  // Clip Creation Tests
  // ==========================================================================

  describe("clip creation", () => {
    it("should create clip from recording", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const config: ClipConfig = {
        startSeconds: 30,
        durationSeconds: 30,
        title: "Highlight",
      };

      const clip = await service.createClip(original.id, userId, config);

      expect(clip.id).toBeDefined();
      expect(clip.status).toBe("processing");
      expect(clip.durationSeconds).toBe(30);
    });

    it("should throw error for invalid clip duration", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const config: ClipConfig = {
        startSeconds: 0,
        durationSeconds: 0,
      };

      await expect(
        service.createClip(original.id, userId, config),
      ).rejects.toThrow("Clip duration must be between 1 and 60 seconds");
    });

    it("should throw error for clip duration over 60 seconds", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const config: ClipConfig = {
        startSeconds: 0,
        durationSeconds: 90,
      };

      await expect(
        service.createClip(original.id, userId, config),
      ).rejects.toThrow("Clip duration must be between 1 and 60 seconds");
    });

    it("should get clip by ID", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const created = await service.createClip(original.id, userId, {
        startSeconds: 0,
        durationSeconds: 30,
      });

      const clip = await service.getClip(created.id);

      expect(clip?.id).toBe(created.id);
    });

    it("should get all clips for stream", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await service.createClip(original.id, userId, {
        startSeconds: 0,
        durationSeconds: 30,
      });
      await service.createClip(original.id, userId, {
        startSeconds: 60,
        durationSeconds: 30,
      });

      const clips = await service.getStreamClips(streamId);

      expect(clips.length).toBe(2);
    });
  });

  // ==========================================================================
  // Deletion Tests
  // ==========================================================================

  describe("deletion", () => {
    it("should delete recording", async () => {
      const recording = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await service.deleteRecording(recording.id, userId);

      await expect(service.getRecording(recording.id)).rejects.toThrow(
        "Recording not found",
      );
    });

    it("should throw error when deleting non-existent recording", async () => {
      await expect(
        service.deleteRecording("non-existent", userId),
      ).rejects.toThrow("Recording not found");
    });

    it("should throw error when deleting active recording", async () => {
      const recording = await service.startRecording(streamId, userId);

      await expect(
        service.deleteRecording(recording.id, userId),
      ).rejects.toThrow("Cannot delete active recording");
    });

    it("should delete clip", async () => {
      const original = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const clip = await service.createClip(original.id, userId, {
        startSeconds: 0,
        durationSeconds: 30,
      });

      await service.deleteClip(clip.id, userId);

      const deleted = await service.getClip(clip.id);
      expect(deleted).toBeNull();
    });
  });

  // ==========================================================================
  // Storage Stats Tests
  // ==========================================================================

  describe("storage stats", () => {
    it("should return storage statistics", async () => {
      const recording = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await service.createClip(recording.id, userId, {
        startSeconds: 0,
        durationSeconds: 30,
      });

      const stats = await service.getStorageStats(userId);

      expect(stats.totalRecordings).toBeGreaterThanOrEqual(1);
      expect(stats.totalClips).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Utility Methods Tests
  // ==========================================================================

  describe("utility methods", () => {
    it("should format bytes correctly", () => {
      expect(service.formatBytes(0)).toBe("0.0 B");
      expect(service.formatBytes(1024)).toBe("1.0 KB");
      expect(service.formatBytes(1048576)).toBe("1.0 MB");
      expect(service.formatBytes(1073741824)).toBe("1.0 GB");
    });

    it("should format duration correctly", () => {
      expect(service.formatDuration(0)).toBe("0:00");
      expect(service.formatDuration(65)).toBe("1:05");
      expect(service.formatDuration(3661)).toBe("1:01:01");
    });

    it("should generate thumbnail URL", () => {
      const url = service.getThumbnailUrl("recording-123", 30);

      expect(url).toContain("recording-123");
      expect(url).toContain("30.jpg");
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe("cleanup", () => {
    it("should cleanup stream data", async () => {
      const recording = await service.startRecording(streamId, userId);
      await service.stopRecording(streamId, userId);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      await service.createClip(recording.id, userId, {
        startSeconds: 0,
        durationSeconds: 30,
      });

      await service.cleanupStream(streamId);

      const recordings = await service.getStreamRecordings(streamId);
      const clips = await service.getStreamClips(streamId);

      expect(recordings.length).toBe(0);
      expect(clips.length).toBe(0);
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getRecordingService();
      const instance2 = getRecordingService();

      expect(instance1).toBe(instance2);
    });
  });
});
