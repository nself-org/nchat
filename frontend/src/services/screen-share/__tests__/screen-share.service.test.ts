/**
 * Screen Share Service Tests
 *
 * Comprehensive tests for screen sharing, pause/resume,
 * source switching, and quality controls.
 */

import {
  ScreenShareService,
  createScreenShareService,
  type ScreenShareServiceOptions,
  type ScreenShareServiceCallbacks,
  type ScreenShareState,
} from "../screen-share.service";

// =============================================================================
// Mocks
// =============================================================================

// Mock navigator.mediaDevices
const mockGetDisplayMedia = jest.fn();
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getDisplayMedia: mockGetDisplayMedia,
  },
  writable: true,
});

// Mock network info
Object.defineProperty(global.navigator, "connection", {
  value: {
    downlink: 10, // 10 Mbps
  },
  writable: true,
});

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: "video" | "audio";
  id: string;
  enabled = true;
  readyState: "live" | "ended" = "live";
  private listeners: Map<string, Function[]> = new Map();

  constructor(kind: "video" | "audio", id: string) {
    this.kind = kind;
    this.id = id;
  }

  getSettings() {
    return {
      width: 1920,
      height: 1080,
      frameRate: 30,
      displaySurface: "monitor",
    };
  }

  applyConstraints(constraints: any) {
    return Promise.resolve();
  }

  addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  stop() {
    this.readyState = "ended";
  }
}

// Mock MediaStream
class MockMediaStream {
  id: string;
  active = true;
  private tracks: MockMediaStreamTrack[] = [];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    this.id = `stream-${Math.random()}`;
    this.tracks = tracks;
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === "video");
  }

  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === "audio");
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function createMockStream(withAudio = false): MockMediaStream {
  const videoTrack = new MockMediaStreamTrack("video", `video-${Date.now()}`);
  const tracks = [videoTrack];

  if (withAudio) {
    tracks.push(new MockMediaStreamTrack("audio", `audio-${Date.now()}`));
  }

  return new MockMediaStream(tracks);
}

// =============================================================================
// Tests
// =============================================================================

describe("ScreenShareService", () => {
  let service: ScreenShareService;
  let callbacks: ScreenShareServiceCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();

    callbacks = {
      onShareStarted: jest.fn(),
      onShareStopped: jest.fn(),
      onSharePaused: jest.fn(),
      onShareResumed: jest.fn(),
      onSourceSwitched: jest.fn(),
      onQualityChanged: jest.fn(),
      onStateChanged: jest.fn(),
      onError: jest.fn(),
      onTrackEnded: jest.fn(),
    };
  });

  afterEach(() => {
    service?.cleanup();
  });

  // ===========================================================================
  // Static Methods
  // ===========================================================================

  describe("Static Methods", () => {
    it("should check if screen share is supported", () => {
      expect(ScreenShareService.isSupported()).toBe(true);
    });

    it("should check system audio support", () => {
      // Mock as Chrome
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 Chrome/100",
        writable: true,
      });
      Object.defineProperty(navigator, "vendor", {
        value: "Google Inc.",
        writable: true,
      });

      expect(ScreenShareService.supportsSystemAudio()).toBe(true);
    });
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("Initial State", () => {
    it("should start in idle state", () => {
      service = createScreenShareService({}, callbacks);
      expect(service.getState()).toBe("idle");
    });

    it("should not be sharing initially", () => {
      service = createScreenShareService({}, callbacks);
      expect(service.isSharing()).toBe(false);
    });

    it("should not have active stream initially", () => {
      service = createScreenShareService({}, callbacks);
      expect(service.getStream()).toBeNull();
    });
  });

  // ===========================================================================
  // Start Share
  // ===========================================================================

  describe("Start Share", () => {
    beforeEach(() => {
      service = createScreenShareService({}, callbacks);
    });

    it("should start screen share successfully", async () => {
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      const share = await service.startShare("user-1", "User One");

      expect(share).toBeTruthy();
      expect(service.getState()).toBe("active");
      expect(service.isSharing()).toBe(true);
      expect(callbacks.onStateChanged).toHaveBeenCalledWith("active");
      expect(callbacks.onShareStarted).toHaveBeenCalled();
    });

    it("should capture system audio when requested", async () => {
      const mockStream = createMockStream(true);
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      const share = await service.startShare("user-1", "User One", {
        captureSystemAudio: true,
      });

      expect(share?.hasAudio).toBe(true);
    });

    it("should handle permission denied error", async () => {
      mockGetDisplayMedia.mockRejectedValue(new Error("Permission denied"));

      const share = await service.startShare("user-1", "User One");

      expect(share).toBeNull();
      expect(service.getState()).toBe("idle");
      expect(callbacks.onError).toHaveBeenCalled();
    });

    it("should prevent starting when already sharing", async () => {
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      await service.startShare("user-1", "User One");
      const secondShare = await service.startShare("user-1", "User One");

      expect(secondShare).toBeNull();
      expect(callbacks.onError).toHaveBeenCalled();
    });

    it("should use specified quality", async () => {
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      await service.startShare("user-1", "User One", { quality: "1080p" });

      const info = service.getShareInfo();
      expect(info?.quality).toBe("1080p");
    });

    it("should use specified frame rate", async () => {
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      await service.startShare("user-1", "User One", { frameRate: 60 });

      const info = service.getShareInfo();
      expect(info?.frameRate).toBe(60);
    });
  });

  // ===========================================================================
  // Stop Share
  // ===========================================================================

  describe("Stop Share", () => {
    beforeEach(async () => {
      service = createScreenShareService({}, callbacks);
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);
      await service.startShare("user-1", "User One");
    });

    it("should stop screen share", () => {
      service.stopShare();

      expect(service.getState()).toBe("idle");
      expect(service.isSharing()).toBe(false);
      expect(callbacks.onShareStopped).toHaveBeenCalled();
    });

    it("should clear stream reference", () => {
      service.stopShare();

      expect(service.getStream()).toBeNull();
      expect(service.getVideoTrack()).toBeNull();
    });

    it("should do nothing when not sharing", () => {
      // First stop should trigger callback
      service.stopShare();

      // Reset the mock
      jest.clearAllMocks();

      // Second call should do nothing since already stopped
      service.stopShare();

      expect(callbacks.onShareStopped).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Pause/Resume
  // ===========================================================================

  describe("Pause/Resume", () => {
    beforeEach(async () => {
      service = createScreenShareService({}, callbacks);
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);
      await service.startShare("user-1", "User One");
    });

    it("should pause screen share", () => {
      const result = service.pause();

      expect(result).toBe(true);
      expect(service.getState()).toBe("paused");
      expect(service.isSharePaused()).toBe(true);
      expect(callbacks.onSharePaused).toHaveBeenCalled();
    });

    it("should resume screen share", () => {
      service.pause();
      const result = service.resume();

      expect(result).toBe(true);
      expect(service.getState()).toBe("active");
      expect(service.isSharePaused()).toBe(false);
      expect(callbacks.onShareResumed).toHaveBeenCalled();
    });

    it("should toggle pause state", () => {
      service.togglePause();
      expect(service.isSharePaused()).toBe(true);

      service.togglePause();
      expect(service.isSharePaused()).toBe(false);
    });

    it("should not pause when already paused", () => {
      service.pause();
      const result = service.pause();

      expect(result).toBe(false);
    });

    it("should not resume when not paused", () => {
      const result = service.resume();

      expect(result).toBe(false);
    });

    it("should disable tracks when paused", () => {
      const stream = service.getStream();
      const track = stream?.getTracks()[0];

      service.pause();

      expect(track?.enabled).toBe(false);
    });

    it("should re-enable tracks when resumed", () => {
      const stream = service.getStream();
      const track = stream?.getTracks()[0];

      service.pause();
      service.resume();

      expect(track?.enabled).toBe(true);
    });
  });

  // ===========================================================================
  // Source Switching
  // ===========================================================================

  describe("Source Switching", () => {
    beforeEach(async () => {
      service = createScreenShareService({}, callbacks);
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);
      await service.startShare("user-1", "User One");
    });

    it("should switch source successfully", async () => {
      const newMockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(newMockStream);

      const result = await service.switchSource("window");

      expect(result).toBe(true);
      expect(service.getState()).toBe("active");
      expect(callbacks.onSourceSwitched).toHaveBeenCalled();
    });

    it("should maintain sharing state after switch", async () => {
      const newMockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(newMockStream);

      await service.switchSource("tab");

      expect(service.isSharing()).toBe(true);
    });

    it("should handle switch failure gracefully", async () => {
      mockGetDisplayMedia.mockRejectedValue(new Error("User cancelled"));

      const result = await service.switchSource("window");

      expect(result).toBe(false);
      expect(service.isSharing()).toBe(true); // Still sharing original
      expect(callbacks.onError).toHaveBeenCalled();
    });

    it("should not switch when not sharing", async () => {
      service.stopShare();

      const result = await service.switchSource("window");

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Quality Controls
  // ===========================================================================

  describe("Quality Controls", () => {
    beforeEach(async () => {
      service = createScreenShareService({}, callbacks);
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);
      await service.startShare("user-1", "User One");
    });

    it("should update quality", async () => {
      const result = await service.setQuality("4k");

      expect(result).toBe(true);
      expect(callbacks.onQualityChanged).toHaveBeenCalled();
    });

    it("should update frame rate", async () => {
      const result = await service.setFrameRate(60);

      expect(result).toBe(true);
    });

    it("should get optimal quality", () => {
      const quality = service.getOptimalQuality();

      // With mocked 10 Mbps connection, should be 1080p
      expect(quality).toBe("1080p");
    });

    it("should get current bitrate", () => {
      const bitrate = service.getCurrentBitrate();

      expect(bitrate).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Share Info
  // ===========================================================================

  describe("Share Info", () => {
    beforeEach(async () => {
      service = createScreenShareService({}, callbacks);
      const mockStream = createMockStream(true);
      mockGetDisplayMedia.mockResolvedValue(mockStream);
      await service.startShare("user-1", "User One", {
        quality: "1080p",
        frameRate: 30,
        captureSystemAudio: true,
      });
    });

    it("should return share info", () => {
      const info = service.getShareInfo();

      expect(info).toBeTruthy();
      expect(info?.quality).toBe("1080p");
      expect(info?.frameRate).toBe(30);
      expect(info?.hasAudio).toBe(true);
      expect(info?.isPaused).toBe(false);
    });

    it("should return null when not sharing", () => {
      service.stopShare();

      const info = service.getShareInfo();
      expect(info).toBeNull();
    });

    it("should reflect paused state", () => {
      service.pause();

      const info = service.getShareInfo();
      expect(info?.isPaused).toBe(true);
    });
  });

  // ===========================================================================
  // Region Share
  // ===========================================================================

  describe("Region Share", () => {
    beforeEach(() => {
      service = createScreenShareService({}, callbacks);
    });

    it("should start region share (with warning)", async () => {
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      const share = await service.startRegionShare("user-1", "User One", {
        x: 100,
        y: 100,
        width: 800,
        height: 600,
      });

      expect(share).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  describe("Cleanup", () => {
    it("should cleanup resources", async () => {
      service = createScreenShareService({}, callbacks);
      const mockStream = createMockStream();
      mockGetDisplayMedia.mockResolvedValue(mockStream);
      await service.startShare("user-1", "User One");

      service.cleanup();

      expect(service.getState()).toBe("idle");
      expect(service.isSharing()).toBe(false);
    });
  });

  // ===========================================================================
  // Factory Function
  // ===========================================================================

  describe("Factory Function", () => {
    it("should create service with default options", () => {
      const svc = createScreenShareService();

      expect(svc).toBeInstanceOf(ScreenShareService);
      expect(svc.getState()).toBe("idle");
    });

    it("should create service with custom options", () => {
      const svc = createScreenShareService({
        defaultQuality: "720p",
        defaultFrameRate: 15,
      });

      expect(svc).toBeInstanceOf(ScreenShareService);
    });
  });
});
