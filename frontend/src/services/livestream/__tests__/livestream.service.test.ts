/**
 * @jest-environment node
 */

/**
 * Livestream Service Tests
 *
 * Comprehensive test suite for the livestream service including
 * stream CRUD, lifecycle, viewer management, and source switching.
 */

import {
  LivestreamService,
  createLivestreamService,
  StreamNotFoundError,
  StreamNotLiveError,
  StreamUnauthorizedError,
} from "../index";
import type { CreateStreamInput, StreamQuality } from "../types";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("LivestreamService", () => {
  let service: LivestreamService;
  const userId = "user-123";
  const channelId = "channel-456";

  beforeEach(() => {
    service = createLivestreamService({
      streamIngestUrl: "rtmp://ingest.example.com",
      hlsBaseUrl: "https://hls.example.com",
      dashBaseUrl: "https://dash.example.com",
    });
  });

  // ==========================================================================
  // Stream Creation Tests
  // ==========================================================================

  describe("createStream", () => {
    it("should create a stream with required fields", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Test Stream",
      };

      const stream = await service.createStream(input, userId);

      expect(stream.id).toBeDefined();
      expect(stream.channelId).toBe(channelId);
      expect(stream.broadcasterId).toBe(userId);
      expect(stream.title).toBe("Test Stream");
      expect(stream.status).toBe("preparing");
      expect(stream.streamKey).toBeDefined();
      expect(stream.streamKey.length).toBe(64); // 32 bytes hex
    });

    it("should create a scheduled stream", async () => {
      const scheduledAt = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      const input: CreateStreamInput = {
        channelId,
        title: "Scheduled Stream",
        scheduledAt,
      };

      const stream = await service.createStream(input, userId);

      expect(stream.status).toBe("scheduled");
      expect(stream.scheduledAt).toBe(scheduledAt);
    });

    it("should apply default settings", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Default Settings Stream",
      };

      const stream = await service.createStream(input, userId);

      expect(stream.maxResolution).toBe("1080p");
      expect(stream.bitrateKbps).toBe(6000);
      expect(stream.fps).toBe(30);
      expect(stream.enableChat).toBe(true);
      expect(stream.enableReactions).toBe(true);
      expect(stream.enableQa).toBe(false);
      expect(stream.chatMode).toBe("open");
      expect(stream.isRecorded).toBe(true);
    });

    it("should apply custom settings", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Custom Settings Stream",
        maxResolution: "720p",
        bitrateKbps: 3000,
        fps: 60,
        enableChat: false,
        enableReactions: false,
        chatMode: "subscribers",
        isRecorded: false,
        tags: ["gaming", "tutorial"],
        language: "es",
      };

      const stream = await service.createStream(input, userId);

      expect(stream.maxResolution).toBe("720p");
      expect(stream.bitrateKbps).toBe(3000);
      expect(stream.fps).toBe(60);
      expect(stream.enableChat).toBe(false);
      expect(stream.enableReactions).toBe(false);
      expect(stream.chatMode).toBe("subscribers");
      expect(stream.isRecorded).toBe(false);
      expect(stream.tags).toEqual(["gaming", "tutorial"]);
      expect(stream.language).toBe("es");
    });

    it("should generate ingest URL with stream key", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Ingest URL Test",
      };

      const stream = await service.createStream(input, userId);

      expect(stream.ingestUrl).toContain("rtmp://ingest.example.com/live/");
      expect(stream.ingestUrl).toContain(stream.streamKey);
    });
  });

  // ==========================================================================
  // Stream Retrieval Tests
  // ==========================================================================

  describe("getStream", () => {
    it("should return existing stream", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Retrievable Stream",
      };

      const created = await service.createStream(input, userId);
      const retrieved = await service.getStream(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe("Retrievable Stream");
    });

    it("should throw StreamNotFoundError for invalid ID", async () => {
      await expect(service.getStream("non-existent-id")).rejects.toThrow(
        StreamNotFoundError,
      );
    });
  });

  // ==========================================================================
  // Stream Update Tests
  // ==========================================================================

  describe("updateStream", () => {
    it("should update stream fields", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Original Title",
      };

      const stream = await service.createStream(input, userId);
      const updated = await service.updateStream(
        stream.id,
        { title: "Updated Title", description: "New description" },
        userId,
      );

      expect(updated.title).toBe("Updated Title");
      expect(updated.description).toBe("New description");
    });

    it("should throw error for unauthorized user", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Protected Stream",
      };

      const stream = await service.createStream(input, userId);

      await expect(
        service.updateStream(stream.id, { title: "Hacked" }, "other-user"),
      ).rejects.toThrow(StreamUnauthorizedError);
    });
  });

  // ==========================================================================
  // Stream Deletion Tests
  // ==========================================================================

  describe("deleteStream", () => {
    it("should delete stream", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Deletable Stream",
      };

      const stream = await service.createStream(input, userId);
      await service.deleteStream(stream.id, userId);

      await expect(service.getStream(stream.id)).rejects.toThrow(
        StreamNotFoundError,
      );
    });

    it("should throw error for unauthorized user", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Protected Stream",
      };

      const stream = await service.createStream(input, userId);

      await expect(
        service.deleteStream(stream.id, "other-user"),
      ).rejects.toThrow(StreamUnauthorizedError);
    });
  });

  // ==========================================================================
  // Stream Lifecycle Tests
  // ==========================================================================

  describe("startStream", () => {
    it("should start stream and set to live", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Starting Stream",
      };

      const stream = await service.createStream(input, userId);
      const started = await service.startStream(stream.id, userId);

      expect(started.status).toBe("live");
      expect(started.startedAt).toBeDefined();
      expect(started.hlsManifestUrl).toContain("https://hls.example.com");
      expect(started.dashManifestUrl).toContain("https://dash.example.com");
    });

    it("should throw error when already live", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Already Live Stream",
      };

      const stream = await service.createStream(input, userId);
      await service.startStream(stream.id, userId);

      await expect(service.startStream(stream.id, userId)).rejects.toThrow(
        StreamNotLiveError,
      );
    });

    it("should throw error for unauthorized user", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Protected Stream",
      };

      const stream = await service.createStream(input, userId);

      await expect(
        service.startStream(stream.id, "other-user"),
      ).rejects.toThrow(StreamUnauthorizedError);
    });
  });

  describe("endStream", () => {
    it("should end stream and record duration", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Ending Stream",
      };

      const stream = await service.createStream(input, userId);
      await service.startStream(stream.id, userId);

      // Wait a bit to have some duration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const ended = await service.endStream(stream.id, userId);

      expect(ended.status).toBe("ended");
      expect(ended.endedAt).toBeDefined();
      expect(ended.recordingDurationSeconds).toBeGreaterThanOrEqual(0);
    });

    it("should throw error for unauthorized user", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Protected Stream",
      };

      const stream = await service.createStream(input, userId);
      await service.startStream(stream.id, userId);

      await expect(service.endStream(stream.id, "other-user")).rejects.toThrow(
        StreamUnauthorizedError,
      );
    });
  });

  describe("cancelStream", () => {
    it("should cancel scheduled stream", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Scheduled Stream",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      };

      const stream = await service.createStream(input, userId);
      const cancelled = await service.cancelStream(stream.id, userId);

      expect(cancelled.status).toBe("cancelled");
    });

    it("should throw error for non-scheduled stream", async () => {
      const input: CreateStreamInput = {
        channelId,
        title: "Preparing Stream",
      };

      const stream = await service.createStream(input, userId);

      await expect(service.cancelStream(stream.id, userId)).rejects.toThrow(
        StreamNotLiveError,
      );
    });
  });

  // ==========================================================================
  // Stream Query Tests
  // ==========================================================================

  describe("getLiveStreams", () => {
    it("should return only live streams", async () => {
      // Create multiple streams
      const stream1 = await service.createStream(
        { channelId, title: "Stream 1" },
        userId,
      );
      const stream2 = await service.createStream(
        { channelId, title: "Stream 2" },
        userId,
      );
      await service.createStream({ channelId, title: "Stream 3" }, userId);

      // Start only some
      await service.startStream(stream1.id, userId);
      await service.startStream(stream2.id, userId);

      const liveStreams = await service.getLiveStreams();

      expect(liveStreams.length).toBe(2);
      expect(liveStreams.every((s) => s.status === "live")).toBe(true);
    });

    it("should filter by channel", async () => {
      const otherChannelId = "other-channel";

      await service.createStream(
        { channelId, title: "Channel 1 Stream" },
        userId,
      );
      const stream2 = await service.createStream(
        { channelId: otherChannelId, title: "Channel 2 Stream" },
        userId,
      );

      await service.startStream(stream2.id, userId);

      const stream1 = await service.createStream(
        { channelId, title: "Another" },
        userId,
      );
      await service.startStream(stream1.id, userId);

      const channelStreams = await service.getLiveStreams(channelId);

      expect(channelStreams.length).toBe(1);
      expect(channelStreams[0].channelId).toBe(channelId);
    });
  });

  describe("getScheduledStreams", () => {
    it("should return sorted scheduled streams", async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const nextWeek = new Date(Date.now() + 604800000).toISOString();

      await service.createStream(
        { channelId, title: "Later Stream", scheduledAt: nextWeek },
        userId,
      );
      await service.createStream(
        { channelId, title: "Earlier Stream", scheduledAt: tomorrow },
        userId,
      );

      const scheduled = await service.getScheduledStreams();

      expect(scheduled.length).toBe(2);
      expect(scheduled[0].title).toBe("Earlier Stream");
      expect(scheduled[1].title).toBe("Later Stream");
    });
  });

  describe("getPastStreams", () => {
    it("should return ended streams in reverse chronological order", async () => {
      const stream1 = await service.createStream(
        { channelId, title: "First Stream" },
        userId,
      );
      const stream2 = await service.createStream(
        { channelId, title: "Second Stream" },
        userId,
      );

      await service.startStream(stream1.id, userId);
      await service.endStream(stream1.id, userId);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.startStream(stream2.id, userId);
      await service.endStream(stream2.id, userId);

      const past = await service.getPastStreams();

      expect(past.length).toBe(2);
      expect(past[0].title).toBe("Second Stream");
      expect(past[1].title).toBe("First Stream");
    });

    it("should respect limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        const stream = await service.createStream(
          { channelId, title: `Stream ${i}` },
          userId,
        );
        await service.startStream(stream.id, userId);
        await service.endStream(stream.id, userId);
      }

      const past = await service.getPastStreams(undefined, 3);

      expect(past.length).toBe(3);
    });
  });

  // ==========================================================================
  // Viewer Management Tests
  // ==========================================================================

  describe("joinStream", () => {
    it("should add viewer to live stream", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      const viewer = await service.joinStream(
        stream.id,
        "session-1",
        "viewer-1",
      );

      expect(viewer.streamId).toBe(stream.id);
      expect(viewer.sessionId).toBe("session-1");
      expect(viewer.userId).toBe("viewer-1");
      expect(viewer.isActive).toBe(true);
    });

    it("should throw error for non-live stream", async () => {
      const stream = await service.createStream(
        { channelId, title: "Preparing" },
        userId,
      );

      await expect(
        service.joinStream(stream.id, "session-1", "viewer-1"),
      ).rejects.toThrow(StreamNotLiveError);
    });

    it("should update viewer count", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      await service.joinStream(stream.id, "session-1");
      await service.joinStream(stream.id, "session-2");
      await service.joinStream(stream.id, "session-3");

      const count = await service.getViewerCount(stream.id);

      expect(count).toBe(3);
    });

    it("should track peak viewers", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      await service.joinStream(stream.id, "session-1");
      await service.joinStream(stream.id, "session-2");
      await service.joinStream(stream.id, "session-3");

      await service.leaveStream(stream.id, "session-1");

      const updatedStream = await service.getStream(stream.id);

      expect(updatedStream.peakViewerCount).toBe(3);
      expect(updatedStream.currentViewerCount).toBe(2);
    });

    it("should track viewer metadata", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      const viewer = await service.joinStream(
        stream.id,
        "session-1",
        "viewer-1",
        {
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          country: "US",
          device: "Desktop",
          browser: "Chrome",
        },
      );

      expect(viewer.country).toBe("US");
      expect(viewer.device).toBe("Desktop");
      expect(viewer.browser).toBe("Chrome");
    });
  });

  describe("leaveStream", () => {
    it("should mark viewer as inactive", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      await service.joinStream(stream.id, "session-1");
      await service.leaveStream(stream.id, "session-1");

      const viewers = await service.getViewers(stream.id, {
        includeInactive: true,
      });
      const viewer = viewers.find((v) => v.sessionId === "session-1");

      expect(viewer?.isActive).toBe(false);
      expect(viewer?.leftAt).toBeDefined();
      expect(viewer?.totalWatchTimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getViewers", () => {
    it("should return only active viewers by default", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      await service.joinStream(stream.id, "session-1");
      await service.joinStream(stream.id, "session-2");
      await service.leaveStream(stream.id, "session-1");

      const viewers = await service.getViewers(stream.id);

      expect(viewers.length).toBe(1);
      expect(viewers[0].sessionId).toBe("session-2");
    });

    it("should include inactive viewers when requested", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      await service.joinStream(stream.id, "session-1");
      await service.leaveStream(stream.id, "session-1");

      const viewers = await service.getViewers(stream.id, {
        includeInactive: true,
      });

      expect(viewers.length).toBe(1);
    });

    it("should support pagination", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      for (let i = 0; i < 10; i++) {
        await service.joinStream(stream.id, `session-${i}`);
      }

      const page1 = await service.getViewers(stream.id, {
        limit: 5,
        offset: 0,
      });
      const page2 = await service.getViewers(stream.id, {
        limit: 5,
        offset: 5,
      });

      expect(page1.length).toBe(5);
      expect(page2.length).toBe(5);
      expect(page1[0].sessionId).not.toBe(page2[0].sessionId);
    });
  });

  describe("updateViewerQuality", () => {
    it("should update viewer quality selection", async () => {
      const stream = await service.createStream(
        { channelId, title: "Live" },
        userId,
      );
      await service.startStream(stream.id, userId);

      await service.joinStream(stream.id, "session-1");
      await service.updateViewerQuality(stream.id, "session-1", "720p");

      const viewers = await service.getViewers(stream.id);

      expect(viewers[0].selectedQuality).toBe("720p");
    });
  });

  // ==========================================================================
  // Stream Key Tests
  // ==========================================================================

  describe("regenerateStreamKey", () => {
    it("should generate new stream key", async () => {
      const stream = await service.createStream(
        { channelId, title: "Stream" },
        userId,
      );
      const originalKey = stream.streamKey;

      const newKey = await service.regenerateStreamKey(stream.id, userId);

      expect(newKey).not.toBe(originalKey);
      expect(newKey.length).toBe(64);
    });

    it("should update ingest URL with new key", async () => {
      const stream = await service.createStream(
        { channelId, title: "Stream" },
        userId,
      );

      const newKey = await service.regenerateStreamKey(stream.id, userId);
      const updated = await service.getStream(stream.id);

      expect(updated.ingestUrl).toContain(newKey);
    });

    it("should throw error for unauthorized user", async () => {
      const stream = await service.createStream(
        { channelId, title: "Stream" },
        userId,
      );

      await expect(
        service.regenerateStreamKey(stream.id, "other-user"),
      ).rejects.toThrow(StreamUnauthorizedError);
    });
  });

  describe("validateStreamKey", () => {
    it("should return stream for valid key", async () => {
      const stream = await service.createStream(
        { channelId, title: "Stream" },
        userId,
      );

      const found = await service.validateStreamKey(stream.streamKey);

      expect(found?.id).toBe(stream.id);
    });

    it("should return null for invalid key", async () => {
      const found = await service.validateStreamKey("invalid-key");

      expect(found).toBeNull();
    });
  });

  // ==========================================================================
  // Utility Method Tests
  // ==========================================================================

  describe("utility methods", () => {
    it("should check if user is broadcaster", async () => {
      const stream = await service.createStream(
        { channelId, title: "Stream" },
        userId,
      );

      expect(service.isBroadcaster(stream, userId)).toBe(true);
      expect(service.isBroadcaster(stream, "other-user")).toBe(false);
    });

    it("should check if stream is live", async () => {
      const stream = await service.createStream(
        { channelId, title: "Stream" },
        userId,
      );

      expect(service.isLive(stream)).toBe(false);

      const started = await service.startStream(stream.id, userId);

      expect(service.isLive(started)).toBe(true);
    });

    it("should calculate stream duration", async () => {
      const stream = await service.createStream(
        { channelId, title: "Stream" },
        userId,
      );
      const started = await service.startStream(stream.id, userId);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const duration = service.getStreamDuration(started);

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it("should format duration correctly", () => {
      expect(service.formatDuration(65)).toBe("1:05");
      expect(service.formatDuration(3661)).toBe("1:01:01");
      expect(service.formatDuration(0)).toBe("0:00");
    });
  });
});
