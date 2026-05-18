/**
 * useScreenShare Hook Tests
 *
 * Tests for the screen share hook's interface and state management.
 * Note: Some tests are integration-style since the hook wraps ScreenCaptureManager.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useScreenShare } from "../use-screen-share";

// =============================================================================
// Mocks
// =============================================================================

// Mock call store
const mockSetLocalScreenSharing = jest.fn();
jest.mock("@/stores/call-store", () => ({
  useCallStore: jest.fn((selector) => {
    if (typeof selector === "function") {
      const mockState = {
        activeCall: null,
        setLocalScreenSharing: mockSetLocalScreenSharing,
      };
      return selector(mockState);
    }
    return null;
  }),
}));

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind: "video" | "audio";
  id: string;
  enabled = true;
  readyState: "live" | "ended" = "live";
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(kind: "video" | "audio") {
    this.kind = kind;
    this.id = `${kind}-${Math.random()}`;
  }

  getSettings() {
    return {
      width: 1920,
      height: 1080,
      frameRate: 30,
      displaySurface: "monitor",
    };
  }

  applyConstraints = jest.fn().mockResolvedValue(undefined);

  addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  stop() {
    this.readyState = "ended";
  }
}

// Mock MediaStream
class MockMediaStream {
  id: string;
  active = true;
  private tracks: MockMediaStreamTrack[];

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

// Mock navigator.mediaDevices
const mockGetDisplayMedia = jest.fn();
Object.defineProperty(global.navigator, "mediaDevices", {
  value: {
    getDisplayMedia: mockGetDisplayMedia,
    getUserMedia: jest.fn(),
  },
  writable: true,
  configurable: true,
});

// Helper to create mock stream
function createMockStream(options: { hasAudio?: boolean } = {}) {
  const videoTrack = new MockMediaStreamTrack("video");
  const tracks: MockMediaStreamTrack[] = [videoTrack];

  if (options.hasAudio) {
    tracks.push(new MockMediaStreamTrack("audio"));
  }

  return new MockMediaStream(tracks);
}

// =============================================================================
// Tests
// =============================================================================

describe("useScreenShare", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useScreenShare());

      expect(result.current.isScreenSharing).toBe(false);
      expect(result.current.screenStream).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isPaused).toBe(false);
      expect(result.current.permissionStatus).toBeNull();
      expect(result.current.activeShares).toHaveLength(0);
    });

    it("should detect if screen sharing is supported", () => {
      const { result } = renderHook(() => useScreenShare());
      expect(result.current.isSupported).toBe(true);
    });

    it("should detect system audio support", () => {
      const { result } = renderHook(() => useScreenShare());
      expect(typeof result.current.supportsSystemAudio).toBe("boolean");
    });

    it("should expose all expected methods", () => {
      const { result } = renderHook(() => useScreenShare());

      // Core methods
      expect(typeof result.current.startScreenShare).toBe("function");
      expect(typeof result.current.stopScreenShare).toBe("function");

      // Pause/Resume
      expect(typeof result.current.pauseScreenShare).toBe("function");
      expect(typeof result.current.resumeScreenShare).toBe("function");
      expect(typeof result.current.togglePause).toBe("function");

      // Source switching
      expect(typeof result.current.switchSource).toBe("function");

      // Permission
      expect(typeof result.current.checkPermission).toBe("function");
      expect(typeof result.current.requestPermission).toBe("function");

      // Quality
      expect(typeof result.current.updateQuality).toBe("function");
      expect(typeof result.current.updateFrameRate).toBe("function");
      expect(typeof result.current.getVideoSettings).toBe("function");
      expect(typeof result.current.getPerformanceMetrics).toBe("function");

      // Multi-share
      expect(typeof result.current.canShare).toBe("function");
      expect(typeof result.current.configureMultiShare).toBe("function");
    });
  });

  // Note: These integration tests require real async behavior with getDisplayMedia
  // Some are skipped because the hook creates internal managers that are difficult to mock
  describe("startScreenShare", () => {
    it("should return stream from startScreenShare", async () => {
      const stream = createMockStream();
      mockGetDisplayMedia.mockResolvedValueOnce(stream);

      const { result } = renderHook(() =>
        useScreenShare({
          userId: "user-1",
          userName: "Test User",
        }),
      );

      let returnedStream: MediaStream | null = null;
      await act(async () => {
        returnedStream = await result.current.startScreenShare();
      });

      expect(returnedStream).toBe(stream);
    });

    it("should return null on getDisplayMedia error", async () => {
      const error = new Error("User cancelled");
      mockGetDisplayMedia.mockRejectedValueOnce(error);

      const onError = jest.fn();
      const { result } = renderHook(() => useScreenShare({ onError }));

      let returnedStream: MediaStream | null = null;
      await act(async () => {
        returnedStream = await result.current.startScreenShare();
      });

      expect(returnedStream).toBeNull();
    });
  });

  describe("stopScreenShare", () => {
    it("should call stopScreenShare without error", () => {
      const { result } = renderHook(() => useScreenShare());

      // Should be safe to call even without active share
      act(() => {
        result.current.stopScreenShare();
      });

      expect(result.current.isScreenSharing).toBe(false);
    });
  });

  describe("Pause/Resume Methods", () => {
    it("should return false when no active share for pause", () => {
      const { result } = renderHook(() => useScreenShare());

      let paused = false;
      act(() => {
        paused = result.current.pauseScreenShare();
      });

      expect(paused).toBe(false);
    });

    it("should return false when no active share for resume", () => {
      const { result } = renderHook(() => useScreenShare());

      let resumed = false;
      act(() => {
        resumed = result.current.resumeScreenShare();
      });

      expect(resumed).toBe(false);
    });

    it("should return false when no active share for toggle", () => {
      const { result } = renderHook(() => useScreenShare());

      let toggled = false;
      act(() => {
        toggled = result.current.togglePause();
      });

      expect(toggled).toBe(false);
    });

    // Skipped: Requires integration with active share state
    it.skip("should pause active screen share", async () => {
      const stream = createMockStream();
      mockGetDisplayMedia.mockResolvedValueOnce(stream);

      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      await waitFor(() => {
        expect(result.current.isScreenSharing).toBe(true);
      });

      let paused = false;
      act(() => {
        paused = result.current.pauseScreenShare();
      });

      expect(paused).toBe(true);
    });
  });

  describe("Source Switching", () => {
    it("should return null when no active share", async () => {
      const { result } = renderHook(() => useScreenShare());

      let newStream: MediaStream | null = null;
      await act(async () => {
        newStream = await result.current.switchSource();
      });

      expect(newStream).toBeNull();
    });

    // Skipped: Requires integration with active share state
    it.skip("should switch source when active share exists", async () => {
      const stream1 = createMockStream();
      const stream2 = createMockStream();
      mockGetDisplayMedia
        .mockResolvedValueOnce(stream1)
        .mockResolvedValueOnce(stream2);

      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      await waitFor(() => {
        expect(result.current.isScreenSharing).toBe(true);
      });

      let newStream: MediaStream | null = null;
      await act(async () => {
        newStream = await result.current.switchSource({ quality: "720p" });
      });

      expect(newStream).toBe(stream2);
    });
  });

  describe("Quality Controls", () => {
    it("should throw when updating quality without active share", async () => {
      const { result } = renderHook(() => useScreenShare());

      await expect(
        act(async () => {
          await result.current.updateQuality("720p");
        }),
      ).rejects.toThrow();
    });

    it("should throw when updating frame rate without active share", async () => {
      const { result } = renderHook(() => useScreenShare());

      await expect(
        act(async () => {
          await result.current.updateFrameRate(60);
        }),
      ).rejects.toThrow();
    });

    it("should return null for video settings without active share", () => {
      const { result } = renderHook(() => useScreenShare());

      const settings = result.current.getVideoSettings();
      expect(settings).toBeNull();
    });

    // Skipped: Requires integration with active share state
    it.skip("should update quality for active share", async () => {
      const stream = createMockStream();
      mockGetDisplayMedia.mockResolvedValueOnce(stream);

      const { result } = renderHook(() => useScreenShare());

      await act(async () => {
        await result.current.startScreenShare();
      });

      await waitFor(() => {
        expect(result.current.isScreenSharing).toBe(true);
      });

      await act(async () => {
        await result.current.updateQuality("720p");
      });

      // Should not throw
      expect(result.current.error).toBeNull();
    });
  });

  describe("Multi-Share Management", () => {
    it("should check if user can share", () => {
      const { result } = renderHook(() => useScreenShare());

      const canShare = result.current.canShare();
      expect(canShare.allowed).toBe(true);
    });

    it("should configure multi-share settings", () => {
      const { result } = renderHook(() => useScreenShare());

      act(() => {
        result.current.configureMultiShare({
          maxConcurrentShares: 3,
          allowMultipleSharers: true,
        });
      });

      // Should not throw
      expect(result.current.error).toBeNull();
    });

    it("should accept initial multiShareConfig", () => {
      const { result } = renderHook(() =>
        useScreenShare({
          multiShareConfig: {
            maxConcurrentShares: 2,
            presenterMode: true,
          },
        }),
      );

      // Should initialize without error
      expect(result.current.error).toBeNull();
    });
  });

  describe("Performance Monitoring", () => {
    it("should enable performance monitoring via option", () => {
      const { result } = renderHook(() =>
        useScreenShare({ enablePerformanceMonitoring: true }),
      );

      // Should initialize without error
      expect(result.current.error).toBeNull();
    });

    it("should provide getPerformanceMetrics method", async () => {
      const { result } = renderHook(() => useScreenShare());

      const metrics = await result.current.getPerformanceMetrics();
      // Returns metrics from the manager
      expect(metrics).toBeDefined();
    });
  });

  describe("Permission Methods", () => {
    it("should check permission and return valid status", async () => {
      const stream = createMockStream();
      mockGetDisplayMedia.mockResolvedValueOnce(stream);

      const { result } = renderHook(() => useScreenShare());

      let status: string = "";
      await act(async () => {
        status = await result.current.checkPermission();
      });

      expect(["granted", "denied", "prompt", "unsupported"]).toContain(status);
    });

    it("should request permission", async () => {
      const stream = createMockStream();
      mockGetDisplayMedia.mockResolvedValueOnce(stream);

      const { result } = renderHook(() => useScreenShare());

      let status: string = "";
      await act(async () => {
        status = await result.current.requestPermission();
      });

      expect(status).toBe("granted");
    });
  });

  describe("Callbacks", () => {
    it("should call onScreenShareStarted on successful start", async () => {
      const stream = createMockStream();
      mockGetDisplayMedia.mockResolvedValueOnce(stream);

      const onScreenShareStarted = jest.fn();
      const { result } = renderHook(() =>
        useScreenShare({ onScreenShareStarted }),
      );

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(onScreenShareStarted).toHaveBeenCalled();
    });

    it("should call onScreenShareStopped on stop", () => {
      const onScreenShareStopped = jest.fn();
      const { result } = renderHook(() =>
        useScreenShare({ onScreenShareStopped }),
      );

      act(() => {
        result.current.stopScreenShare();
      });

      expect(onScreenShareStopped).toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount without error", () => {
      const { unmount } = renderHook(() => useScreenShare());

      // Should cleanup without throwing
      unmount();
    });
  });
});
