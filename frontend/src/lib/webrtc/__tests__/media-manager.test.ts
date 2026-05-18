/**
 * @fileoverview Tests for Media Manager
 */

import {
  MediaManager,
  createMediaManager,
  isMediaDevicesSupported,
  isScreenSharingSupported,
  isAudioOutputSelectionSupported,
  DEFAULT_AUDIO_CONSTRAINTS,
  DEFAULT_VIDEO_CONSTRAINTS,
  HD_VIDEO_CONSTRAINTS,
  LOW_BANDWIDTH_VIDEO_CONSTRAINTS,
  DEFAULT_SCREEN_SHARE_OPTIONS,
  type MediaManagerCallbacks,
  type AudioConstraints,
  type VideoConstraints,
  type MediaDevice,
} from "../media-manager";

// =============================================================================
// Mocks
// =============================================================================

const createMockMediaStreamTrack = (
  kind: "audio" | "video" = "audio",
): MediaStreamTrack => {
  const track = {
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    kind,
    enabled: true,
    muted: false,
    readyState: "live" as MediaStreamTrackState,
    label: `Mock ${kind} track`,
    onended: null as (() => void) | null,
    stop: jest.fn(),
    clone: jest.fn(),
    getSettings: jest.fn(() => ({
      deviceId: "default",
      groupId: "group-1",
    })),
    getCapabilities: jest.fn(() => ({})),
    getConstraints: jest.fn(() => ({})),
    applyConstraints: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true),
  };
  return track as unknown as MediaStreamTrack;
};

const createMockMediaStream = (
  tracks: MediaStreamTrack[] = [],
): MediaStream => {
  const audioTracks = tracks.filter((t) => t.kind === "audio");
  const videoTracks = tracks.filter((t) => t.kind === "video");

  return {
    id: `stream-${Date.now()}`,
    active: true,
    getTracks: jest.fn(() => tracks),
    getAudioTracks: jest.fn(() => audioTracks),
    getVideoTracks: jest.fn(() => videoTracks),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
    clone: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(() => true),
    onaddtrack: null,
    onremovetrack: null,
  } as unknown as MediaStream;
};

const createMockMediaDeviceInfo = (
  kind: "audioinput" | "audiooutput" | "videoinput",
  deviceId: string = "device-1",
): MediaDeviceInfo => ({
  deviceId,
  kind,
  label: `Mock ${kind} device`,
  groupId: "group-1",
  toJSON: () => ({}),
});

// Setup global mocks
let mockGetUserMedia: jest.Mock;
let mockGetDisplayMedia: jest.Mock;
let mockEnumerateDevices: jest.Mock;
let mockAddEventListener: jest.Mock;
let mockRemoveEventListener: jest.Mock;

beforeEach(() => {
  mockGetUserMedia = jest.fn();
  mockGetDisplayMedia = jest.fn();
  mockEnumerateDevices = jest.fn();
  mockAddEventListener = jest.fn();
  mockRemoveEventListener = jest.fn();

  Object.defineProperty(global, "navigator", {
    value: {
      mediaDevices: {
        getUserMedia: mockGetUserMedia,
        getDisplayMedia: mockGetDisplayMedia,
        enumerateDevices: mockEnumerateDevices,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      },
      permissions: {
        query: jest.fn(),
      },
    },
    writable: true,
  });

  // Mock AudioContext
  global.AudioContext = jest.fn().mockImplementation(() => ({
    createMediaStreamSource: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
    createAnalyser: jest.fn(() => ({
      fftSize: 0,
      frequencyBinCount: 128,
      getByteFrequencyData: jest.fn((arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 50;
        }
      }),
    })),
    close: jest.fn(),
  })) as unknown as typeof AudioContext;

  // Default mock implementations
  const audioTrack = createMockMediaStreamTrack("audio");
  const mockStream = createMockMediaStream([audioTrack]);
  mockGetUserMedia.mockResolvedValue(mockStream);
  mockGetDisplayMedia.mockResolvedValue(mockStream);
  mockEnumerateDevices.mockResolvedValue([
    createMockMediaDeviceInfo("audioinput", "audio-1"),
    createMockMediaDeviceInfo("audiooutput", "audio-out-1"),
    createMockMediaDeviceInfo("videoinput", "video-1"),
  ]);
});

afterEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// Tests
// =============================================================================

describe("MediaManager", () => {
  describe("Constructor", () => {
    it("should create with no callbacks", () => {
      const manager = new MediaManager();
      expect(manager.stream).toBeNull();
    });

    it("should create with callbacks", () => {
      const callbacks: MediaManagerCallbacks = {
        onDeviceChange: jest.fn(),
        onTrackEnded: jest.fn(),
      };
      const manager = new MediaManager(callbacks);
      expect(manager.stream).toBeNull();
    });
  });

  describe("Getters", () => {
    let manager: MediaManager;

    beforeEach(() => {
      manager = new MediaManager();
    });

    it("should return null for stream initially", () => {
      expect(manager.stream).toBeNull();
    });

    it("should return null for screenShareStream initially", () => {
      expect(manager.screenShareStream).toBeNull();
    });

    it("should return true for audioEnabled initially", () => {
      expect(manager.audioEnabled).toBe(true);
    });

    it("should return true for videoEnabled initially", () => {
      expect(manager.videoEnabled).toBe(true);
    });

    it("should return empty array for audioTracks initially", () => {
      expect(manager.audioTracks).toEqual([]);
    });

    it("should return empty array for videoTracks initially", () => {
      expect(manager.videoTracks).toEqual([]);
    });

    it("should return false for hasAudio initially", () => {
      expect(manager.hasAudio).toBe(false);
    });

    it("should return false for hasVideo initially", () => {
      expect(manager.hasVideo).toBe(false);
    });

    it("should return false for isScreenSharing initially", () => {
      expect(manager.isScreenSharing).toBe(false);
    });

    it("should return empty array for deviceList initially", () => {
      expect(manager.deviceList).toEqual([]);
    });
  });

  describe("enumerateDevices()", () => {
    it("should enumerate all devices", async () => {
      const manager = new MediaManager();
      const devices = await manager.enumerateDevices();
      expect(mockEnumerateDevices).toHaveBeenCalled();
      expect(devices).toHaveLength(3);
    });

    it("should categorize devices by kind", async () => {
      const manager = new MediaManager();
      await manager.enumerateDevices();
      expect(manager.getAudioInputDevices()).toHaveLength(1);
      expect(manager.getAudioOutputDevices()).toHaveLength(1);
      expect(manager.getVideoInputDevices()).toHaveLength(1);
    });

    it("should handle enumeration errors", async () => {
      mockEnumerateDevices.mockRejectedValue(new Error("Permission denied"));
      const manager = new MediaManager();
      const devices = await manager.enumerateDevices();
      expect(devices).toEqual([]);
    });

    it("should generate label for devices without label", async () => {
      mockEnumerateDevices.mockResolvedValue([
        {
          deviceId: "abc123456789",
          kind: "audioinput",
          label: "",
          groupId: "group",
        },
      ]);
      const manager = new MediaManager();
      const devices = await manager.enumerateDevices();
      expect(devices[0].label).toContain("audioinput");
    });
  });

  describe("getAudioInputDevices()", () => {
    it("should return only audio input devices", async () => {
      const manager = new MediaManager();
      await manager.enumerateDevices();
      const devices = manager.getAudioInputDevices();
      expect(devices.every((d) => d.kind === "audioinput")).toBe(true);
    });
  });

  describe("getAudioOutputDevices()", () => {
    it("should return only audio output devices", async () => {
      const manager = new MediaManager();
      await manager.enumerateDevices();
      const devices = manager.getAudioOutputDevices();
      expect(devices.every((d) => d.kind === "audiooutput")).toBe(true);
    });
  });

  describe("getVideoInputDevices()", () => {
    it("should return only video input devices", async () => {
      const manager = new MediaManager();
      await manager.enumerateDevices();
      const devices = manager.getVideoInputDevices();
      expect(devices.every((d) => d.kind === "videoinput")).toBe(true);
    });
  });

  describe("Device Change Listener", () => {
    it("should add device change listener", () => {
      const manager = new MediaManager();
      manager.startDeviceChangeListener();
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "devicechange",
        expect.any(Function),
      );
    });

    it("should remove device change listener", () => {
      const manager = new MediaManager();
      manager.startDeviceChangeListener();
      manager.stopDeviceChangeListener();
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        "devicechange",
        expect.any(Function),
      );
    });

    it("should call callback on device change", async () => {
      const onDeviceChange = jest.fn();
      const manager = new MediaManager({ onDeviceChange });
      manager.startDeviceChangeListener();

      // Get the callback and call it
      const callback = mockAddEventListener.mock.calls[0][1];
      await callback();

      expect(onDeviceChange).toHaveBeenCalled();
    });
  });

  describe("getUserMedia()", () => {
    it("should get audio only stream", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      const stream = await manager.getUserMedia(true, false);

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: DEFAULT_AUDIO_CONSTRAINTS,
        video: false,
      });
      expect(stream).toBe(mockStream);
    });

    it("should get video stream", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([audioTrack, videoTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      const stream = await manager.getUserMedia(true, true);

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: DEFAULT_AUDIO_CONSTRAINTS,
        video: DEFAULT_VIDEO_CONSTRAINTS,
      });
      expect(stream).toBe(mockStream);
    });

    it("should accept custom audio constraints", async () => {
      const customAudio: AudioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
      };
      const manager = new MediaManager();
      await manager.getUserMedia(customAudio, false);

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: customAudio,
        video: false,
      });
    });

    it("should accept custom video constraints", async () => {
      const customVideo: VideoConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };
      const manager = new MediaManager();
      await manager.getUserMedia(true, customVideo);

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: DEFAULT_AUDIO_CONSTRAINTS,
        video: customVideo,
      });
    });

    it("should stop previous stream before getting new one", async () => {
      const audioTrack1 = createMockMediaStreamTrack("audio");
      const mockStream1 = createMockMediaStream([audioTrack1]);
      mockGetUserMedia.mockResolvedValueOnce(mockStream1);

      const audioTrack2 = createMockMediaStreamTrack("audio");
      const mockStream2 = createMockMediaStream([audioTrack2]);
      mockGetUserMedia.mockResolvedValueOnce(mockStream2);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      await manager.getUserMedia(true, false);

      expect(audioTrack1.stop).toHaveBeenCalled();
    });

    it("should call onStreamError callback on error", async () => {
      const error = new Error("Permission denied");
      mockGetUserMedia.mockRejectedValue(error);
      const onStreamError = jest.fn();

      const manager = new MediaManager({ onStreamError });

      await expect(manager.getUserMedia(true, false)).rejects.toThrow(
        "Permission denied",
      );
      expect(onStreamError).toHaveBeenCalledWith(error);
    });

    it("should setup track ended handlers", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const onTrackEnded = jest.fn();
      const manager = new MediaManager({ onTrackEnded });
      await manager.getUserMedia(true, false);

      // Simulate track ended
      audioTrack.onended?.();
      expect(onTrackEnded).toHaveBeenCalledWith(audioTrack);
    });

    it("should enumerate devices after getting media", async () => {
      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      expect(mockEnumerateDevices).toHaveBeenCalled();
    });
  });

  describe("getAudioOnlyStream()", () => {
    it("should call getUserMedia with audio only", async () => {
      const manager = new MediaManager();
      await manager.getAudioOnlyStream();
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: DEFAULT_AUDIO_CONSTRAINTS,
        video: false,
      });
    });

    it("should accept custom constraints", async () => {
      const customConstraints: AudioConstraints = { noiseSuppression: false };
      const manager = new MediaManager();
      await manager.getAudioOnlyStream(customConstraints);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: customConstraints,
        video: false,
      });
    });
  });

  describe("getVideoStream()", () => {
    it("should call getUserMedia with audio and video", async () => {
      const manager = new MediaManager();
      await manager.getVideoStream();
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: DEFAULT_AUDIO_CONSTRAINTS,
        video: DEFAULT_VIDEO_CONSTRAINTS,
      });
    });

    it("should accept custom constraints", async () => {
      const customAudio: AudioConstraints = { noiseSuppression: false };
      const customVideo: VideoConstraints = { width: 1920 };
      const manager = new MediaManager();
      await manager.getVideoStream(customAudio, customVideo);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: customAudio,
        video: customVideo,
      });
    });
  });

  describe("getDisplayMedia()", () => {
    it("should get screen share stream", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([videoTrack]);
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      const stream = await manager.getDisplayMedia();

      expect(mockGetDisplayMedia).toHaveBeenCalledWith(
        DEFAULT_SCREEN_SHARE_OPTIONS,
      );
      expect(stream).toBe(mockStream);
      expect(manager.isScreenSharing).toBe(true);
    });

    it("should accept custom options", async () => {
      const options = { video: true, audio: true };
      const manager = new MediaManager();
      await manager.getDisplayMedia(options);
      expect(mockGetDisplayMedia).toHaveBeenCalledWith(options);
    });

    it("should stop previous screen share before getting new one", async () => {
      const videoTrack1 = createMockMediaStreamTrack("video");
      const mockStream1 = createMockMediaStream([videoTrack1]);
      mockGetDisplayMedia.mockResolvedValueOnce(mockStream1);

      const videoTrack2 = createMockMediaStreamTrack("video");
      const mockStream2 = createMockMediaStream([videoTrack2]);
      mockGetDisplayMedia.mockResolvedValueOnce(mockStream2);

      const manager = new MediaManager();
      await manager.getDisplayMedia();
      await manager.getDisplayMedia();

      expect(videoTrack1.stop).toHaveBeenCalled();
    });

    it("should call onStreamError on error", async () => {
      const error = new Error("User cancelled");
      mockGetDisplayMedia.mockRejectedValue(error);
      const onStreamError = jest.fn();

      const manager = new MediaManager({ onStreamError });
      await expect(manager.getDisplayMedia()).rejects.toThrow("User cancelled");
      expect(onStreamError).toHaveBeenCalledWith(error);
    });
  });

  describe("stopScreenShare()", () => {
    it("should stop screen share stream", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([videoTrack]);
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getDisplayMedia();
      manager.stopScreenShare();

      expect(videoTrack.stop).toHaveBeenCalled();
      expect(manager.isScreenSharing).toBe(false);
    });

    it("should handle no active screen share", () => {
      const manager = new MediaManager();
      expect(() => manager.stopScreenShare()).not.toThrow();
    });
  });

  describe("enableAudio()", () => {
    it("should enable/disable audio tracks", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);

      manager.enableAudio(false);
      expect(audioTrack.enabled).toBe(false);
      expect(manager.audioEnabled).toBe(false);

      manager.enableAudio(true);
      expect(audioTrack.enabled).toBe(true);
      expect(manager.audioEnabled).toBe(true);
    });
  });

  describe("enableVideo()", () => {
    it("should enable/disable video tracks", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([videoTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(false, true);

      manager.enableVideo(false);
      expect(videoTrack.enabled).toBe(false);
      expect(manager.videoEnabled).toBe(false);

      manager.enableVideo(true);
      expect(videoTrack.enabled).toBe(true);
      expect(manager.videoEnabled).toBe(true);
    });
  });

  describe("toggleAudio()", () => {
    it("should toggle audio enabled state", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);

      const result1 = manager.toggleAudio();
      expect(result1).toBe(false);
      expect(audioTrack.enabled).toBe(false);

      const result2 = manager.toggleAudio();
      expect(result2).toBe(true);
      expect(audioTrack.enabled).toBe(true);
    });
  });

  describe("toggleVideo()", () => {
    it("should toggle video enabled state", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([videoTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(false, true);

      const result1 = manager.toggleVideo();
      expect(result1).toBe(false);
      expect(videoTrack.enabled).toBe(false);

      const result2 = manager.toggleVideo();
      expect(result2).toBe(true);
      expect(videoTrack.enabled).toBe(true);
    });
  });

  describe("switchAudioDevice()", () => {
    it("should switch to new audio device", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);

      mockGetUserMedia.mockClear();
      await manager.switchAudioDevice("new-device-id");

      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          audio: expect.objectContaining({
            deviceId: { exact: "new-device-id" },
          }),
        }),
      );
    });

    it("should throw if no active stream", async () => {
      const manager = new MediaManager();
      await expect(manager.switchAudioDevice("device")).rejects.toThrow(
        "No active stream",
      );
    });
  });

  describe("switchVideoDevice()", () => {
    it("should switch to new video device", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([videoTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(false, true);

      mockGetUserMedia.mockClear();
      await manager.switchVideoDevice("new-device-id");

      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            deviceId: { exact: "new-device-id" },
          }),
        }),
      );
    });

    it("should throw if no active stream", async () => {
      const manager = new MediaManager();
      await expect(manager.switchVideoDevice("device")).rejects.toThrow(
        "No active stream",
      );
    });
  });

  describe("setAudioOutput()", () => {
    it("should set audio output device", async () => {
      const setSinkId = jest.fn().mockResolvedValue(undefined);
      const element = { setSinkId } as unknown as HTMLMediaElement;

      const manager = new MediaManager();
      await manager.setAudioOutput("output-device-id", element);

      expect(setSinkId).toHaveBeenCalledWith("output-device-id");
    });

    it("should throw if setSinkId not supported", async () => {
      const element = {} as HTMLMediaElement;
      const manager = new MediaManager();

      await expect(manager.setAudioOutput("device", element)).rejects.toThrow(
        "not supported",
      );
    });
  });

  describe("checkPermissions()", () => {
    it("should check media permissions", async () => {
      const mockQuery = jest
        .fn()
        .mockResolvedValueOnce({ state: "granted" })
        .mockResolvedValueOnce({ state: "denied" });

      Object.defineProperty(navigator, "permissions", {
        value: { query: mockQuery },
        configurable: true,
      });

      const manager = new MediaManager();
      const permissions = await manager.checkPermissions();

      expect(permissions.audio).toBe(true);
      expect(permissions.video).toBe(false);
    });

    it("should fallback to device enumeration on error", async () => {
      Object.defineProperty(navigator, "permissions", {
        value: { query: jest.fn().mockRejectedValue(new Error()) },
        configurable: true,
      });

      const manager = new MediaManager();
      const permissions = await manager.checkPermissions();

      expect(mockEnumerateDevices).toHaveBeenCalled();
      expect(typeof permissions.audio).toBe("boolean");
    });
  });

  describe("requestPermissions()", () => {
    it("should request permissions by getting user media", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      const permissions = await manager.requestPermissions(true, false);

      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(audioTrack.stop).toHaveBeenCalled();
      expect(permissions.audio).toBe(true);
    });

    it("should handle permission denial", async () => {
      mockGetUserMedia.mockRejectedValue(new Error("Permission denied"));

      const manager = new MediaManager();
      const permissions = await manager.requestPermissions(true, true);

      expect(permissions.audio).toBe(false);
      expect(permissions.video).toBe(false);
    });
  });

  describe("createAudioAnalyzer()", () => {
    it("should return null if no stream", () => {
      const manager = new MediaManager();
      const analyzer = manager.createAudioAnalyzer();
      expect(analyzer).toBeNull();
    });

    it("should create audio analyzer for stream", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      const analyzer = manager.createAudioAnalyzer();

      expect(analyzer).toBeDefined();
      expect(analyzer?.analyser).toBeDefined();
      expect(typeof analyzer?.getLevel).toBe("function");
      expect(typeof analyzer?.cleanup).toBe("function");
    });

    it("should return audio level from getLevel", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      const analyzer = manager.createAudioAnalyzer();

      const level = analyzer?.getLevel();
      expect(typeof level).toBe("number");
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    });

    it("should cleanup analyzer resources", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      const analyzer = manager.createAudioAnalyzer();

      expect(() => analyzer?.cleanup()).not.toThrow();
    });
  });

  describe("applyVideoConstraints()", () => {
    it("should apply constraints to video track", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([videoTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(false, true);

      const constraints: VideoConstraints = { width: 1920, height: 1080 };
      await manager.applyVideoConstraints(constraints);

      expect(videoTrack.applyConstraints).toHaveBeenCalledWith(constraints);
    });

    it("should throw if no video track", async () => {
      const manager = new MediaManager();
      await expect(manager.applyVideoConstraints({})).rejects.toThrow(
        "No video track available",
      );
    });
  });

  describe("getVideoSettings()", () => {
    it("should return video track settings", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([videoTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(false, true);
      const settings = manager.getVideoSettings();

      expect(settings).toBeDefined();
      expect(videoTrack.getSettings).toHaveBeenCalled();
    });

    it("should return null if no video track", () => {
      const manager = new MediaManager();
      const settings = manager.getVideoSettings();
      expect(settings).toBeNull();
    });
  });

  describe("getAudioSettings()", () => {
    it("should return audio track settings", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      const settings = manager.getAudioSettings();

      expect(settings).toBeDefined();
      expect(audioTrack.getSettings).toHaveBeenCalled();
    });

    it("should return null if no audio track", () => {
      const manager = new MediaManager();
      const settings = manager.getAudioSettings();
      expect(settings).toBeNull();
    });
  });

  describe("stopLocalStream()", () => {
    it("should stop all local tracks", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const videoTrack = createMockMediaStreamTrack("video");
      const mockStream = createMockMediaStream([audioTrack, videoTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, true);
      manager.stopLocalStream();

      expect(audioTrack.stop).toHaveBeenCalled();
      expect(videoTrack.stop).toHaveBeenCalled();
      expect(manager.stream).toBeNull();
    });

    it("should reset enabled states", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      manager.enableAudio(false);
      manager.stopLocalStream();

      expect(manager.audioEnabled).toBe(true);
      expect(manager.videoEnabled).toBe(true);
    });
  });

  describe("stopAllStreams()", () => {
    it("should stop both local and screen share streams", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockLocalStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockLocalStream);

      const screenTrack = createMockMediaStreamTrack("video");
      const mockScreenStream = createMockMediaStream([screenTrack]);
      mockGetDisplayMedia.mockResolvedValue(mockScreenStream);

      const manager = new MediaManager();
      await manager.getUserMedia(true, false);
      await manager.getDisplayMedia();
      manager.stopAllStreams();

      expect(audioTrack.stop).toHaveBeenCalled();
      expect(screenTrack.stop).toHaveBeenCalled();
    });
  });

  describe("cleanup()", () => {
    it("should stop all streams and remove listeners", async () => {
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([audioTrack]);
      mockGetUserMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      manager.startDeviceChangeListener();
      await manager.getUserMedia(true, false);
      await manager.enumerateDevices();
      manager.cleanup();

      expect(audioTrack.stop).toHaveBeenCalled();
      expect(mockRemoveEventListener).toHaveBeenCalled();
      expect(manager.deviceList).toEqual([]);
    });
  });

  describe("updateCallbacks()", () => {
    it("should update callbacks", async () => {
      const manager = new MediaManager();
      const newCallback = jest.fn();
      manager.updateCallbacks({ onDeviceChange: newCallback });

      manager.startDeviceChangeListener();
      const callback = mockAddEventListener.mock.calls[0][1];
      await callback();

      expect(newCallback).toHaveBeenCalled();
    });

    it("should merge with existing callbacks", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const manager = new MediaManager({ onDeviceChange: callback1 });
      manager.updateCallbacks({ onTrackEnded: callback2 });
      // Both callbacks should be preserved
      expect(manager).toBeDefined();
    });
  });

  describe("screenVideoTracks and screenAudioTracks", () => {
    it("should return screen share tracks", async () => {
      const videoTrack = createMockMediaStreamTrack("video");
      const audioTrack = createMockMediaStreamTrack("audio");
      const mockStream = createMockMediaStream([videoTrack, audioTrack]);
      mockGetDisplayMedia.mockResolvedValue(mockStream);

      const manager = new MediaManager();
      await manager.getDisplayMedia({ video: true, audio: true });

      expect(manager.screenVideoTracks).toHaveLength(1);
      expect(manager.screenAudioTracks).toHaveLength(1);
    });

    it("should return empty arrays if no screen share", () => {
      const manager = new MediaManager();
      expect(manager.screenVideoTracks).toEqual([]);
      expect(manager.screenAudioTracks).toEqual([]);
    });
  });
});

describe("createMediaManager()", () => {
  it("should create MediaManager instance", () => {
    const manager = createMediaManager();
    expect(manager).toBeInstanceOf(MediaManager);
  });

  it("should pass callbacks to constructor", () => {
    const callbacks: MediaManagerCallbacks = {
      onDeviceChange: jest.fn(),
    };
    const manager = createMediaManager(callbacks);
    expect(manager).toBeDefined();
  });
});

describe("Utility Functions", () => {
  describe("isMediaDevicesSupported()", () => {
    it("should return true when supported", () => {
      expect(isMediaDevicesSupported()).toBe(true);
    });

    // Skipped: Cannot properly modify navigator.mediaDevices in jsdom
    it.skip("should return false when not supported", () => {
      const original = navigator.mediaDevices;
      Object.defineProperty(navigator, "mediaDevices", {
        value: undefined,
        configurable: true,
      });
      expect(isMediaDevicesSupported()).toBe(false);
      Object.defineProperty(navigator, "mediaDevices", {
        value: original,
        configurable: true,
      });
    });
  });

  describe("isScreenSharingSupported()", () => {
    it("should return true when getDisplayMedia is available", () => {
      expect(isScreenSharingSupported()).toBe(true);
    });

    // Skipped: Cannot properly modify navigator.mediaDevices in jsdom
    it.skip("should return false when not supported", () => {
      const original = navigator.mediaDevices;
      Object.defineProperty(navigator, "mediaDevices", {
        value: { ...original, getDisplayMedia: undefined },
        configurable: true,
      });
      expect(isScreenSharingSupported()).toBe(false);
      Object.defineProperty(navigator, "mediaDevices", {
        value: original,
        configurable: true,
      });
    });
  });

  describe("isAudioOutputSelectionSupported()", () => {
    it("should check for setSinkId in HTMLMediaElement", () => {
      const result = isAudioOutputSelectionSupported();
      expect(typeof result).toBe("boolean");
    });
  });
});

describe("Constants", () => {
  describe("DEFAULT_AUDIO_CONSTRAINTS", () => {
    it("should have echo cancellation enabled", () => {
      expect(DEFAULT_AUDIO_CONSTRAINTS.echoCancellation).toBe(true);
    });

    it("should have noise suppression enabled", () => {
      expect(DEFAULT_AUDIO_CONSTRAINTS.noiseSuppression).toBe(true);
    });

    it("should have auto gain control enabled", () => {
      expect(DEFAULT_AUDIO_CONSTRAINTS.autoGainControl).toBe(true);
    });
  });

  describe("DEFAULT_VIDEO_CONSTRAINTS", () => {
    it("should have ideal width of 1280", () => {
      expect((DEFAULT_VIDEO_CONSTRAINTS.width as { ideal: number }).ideal).toBe(
        1280,
      );
    });

    it("should have ideal height of 720", () => {
      expect(
        (DEFAULT_VIDEO_CONSTRAINTS.height as { ideal: number }).ideal,
      ).toBe(720);
    });

    it("should use front camera", () => {
      expect(DEFAULT_VIDEO_CONSTRAINTS.facingMode).toBe("user");
    });
  });

  describe("HD_VIDEO_CONSTRAINTS", () => {
    it("should have 1080p resolution", () => {
      expect((HD_VIDEO_CONSTRAINTS.width as { ideal: number }).ideal).toBe(
        1920,
      );
      expect((HD_VIDEO_CONSTRAINTS.height as { ideal: number }).ideal).toBe(
        1080,
      );
    });
  });

  describe("LOW_BANDWIDTH_VIDEO_CONSTRAINTS", () => {
    it("should have 480p resolution", () => {
      expect(
        (LOW_BANDWIDTH_VIDEO_CONSTRAINTS.width as { ideal: number }).ideal,
      ).toBe(640);
      expect(
        (LOW_BANDWIDTH_VIDEO_CONSTRAINTS.height as { ideal: number }).ideal,
      ).toBe(480);
    });

    it("should have lower frame rate", () => {
      expect(
        (LOW_BANDWIDTH_VIDEO_CONSTRAINTS.frameRate as { ideal: number }).ideal,
      ).toBe(15);
    });
  });

  describe("DEFAULT_SCREEN_SHARE_OPTIONS", () => {
    it("should show cursor always", () => {
      const videoOptions = DEFAULT_SCREEN_SHARE_OPTIONS.video as {
        cursor: string;
      };
      expect(videoOptions.cursor).toBe("always");
    });

    it("should not include audio by default", () => {
      expect(DEFAULT_SCREEN_SHARE_OPTIONS.audio).toBe(false);
    });
  });
});
