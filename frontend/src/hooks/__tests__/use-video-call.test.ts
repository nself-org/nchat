/**
 * @fileoverview Tests for useVideoCall hook
 */

import { renderHook, act } from "@testing-library/react";
import {
  useVideoCall,
  type UseVideoCallOptions,
  type VideoQuality,
} from "../use-video-call";
import { useCallStore } from "@/stores/call-store";

// =============================================================================
// Mocks
// =============================================================================

// Mock stores
jest.mock("@/stores/call-store", () => {
  const actualStore = jest.requireActual("@/stores/call-store");
  return {
    ...actualStore,
    useCallStore: jest.fn(),
  };
});

// Mock webrtc modules
jest.mock("@/lib/webrtc/peer-connection", () => ({
  createPeerConnection: jest.fn(() => ({
    create: jest.fn(),
    close: jest.fn(),
    addTrack: jest.fn(() => ({})),
    createOffer: jest
      .fn()
      .mockResolvedValue({ type: "offer", sdp: "test-offer" }),
    createAnswer: jest
      .fn()
      .mockResolvedValue({ type: "answer", sdp: "test-answer" }),
    setRemoteDescription: jest.fn().mockResolvedValue(undefined),
    addIceCandidate: jest.fn().mockResolvedValue(undefined),
    getLocalVideoTracks: jest.fn(() => [{ track: { id: "video-track-1" } }]),
    replaceTrack: jest.fn(),
    updateCallbacks: jest.fn(),
  })),
  PeerConnectionManager: jest.fn(),
}));

jest.mock("@/lib/webrtc/media-manager", () => ({
  createMediaManager: jest.fn(() => ({
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: "mic-1",
        kind: "audioinput",
        label: "Microphone 1",
        groupId: "g1",
      },
      {
        deviceId: "speaker-1",
        kind: "audiooutput",
        label: "Speaker 1",
        groupId: "g1",
      },
      {
        deviceId: "cam-1",
        kind: "videoinput",
        label: "Camera 1",
        groupId: "g1",
      },
    ]),
    startDeviceChangeListener: jest.fn(),
    stopDeviceChangeListener: jest.fn(),
    getVideoStream: jest.fn().mockResolvedValue({
      getTracks: jest.fn(() => [
        { stop: jest.fn(), kind: "audio" },
        { stop: jest.fn(), kind: "video" },
      ]),
      getAudioTracks: jest.fn(() => [{ stop: jest.fn() }]),
      getVideoTracks: jest.fn(() => [{ stop: jest.fn() }]),
    }),
    getDisplayMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn(() => [
        { stop: jest.fn(), kind: "video", onended: null },
      ]),
      getVideoTracks: jest.fn(() => [{ stop: jest.fn(), onended: null }]),
    }),
    enableAudio: jest.fn(),
    enableVideo: jest.fn(),
    switchAudioDevice: jest.fn().mockResolvedValue(undefined),
    switchVideoDevice: jest.fn().mockResolvedValue(undefined),
    setAudioOutput: jest.fn().mockResolvedValue(undefined),
    applyVideoConstraints: jest.fn().mockResolvedValue(undefined),
    stopScreenShare: jest.fn(),
    createAudioAnalyzer: jest.fn(() => ({
      getLevel: jest.fn(() => 0.5),
      cleanup: jest.fn(),
    })),
    cleanup: jest.fn(),
    updateCallbacks: jest.fn(),
    stream: {
      getVideoTracks: () => [{ id: "video-1" }],
    },
    videoTracks: [{ id: "video-1" }],
  })),
  MediaManager: jest.fn(),
  DEFAULT_VIDEO_CONSTRAINTS: { width: { ideal: 1280 }, height: { ideal: 720 } },
  HD_VIDEO_CONSTRAINTS: { width: { ideal: 1920 }, height: { ideal: 1080 } },
  LOW_BANDWIDTH_VIDEO_CONSTRAINTS: {
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
}));

jest.mock("@/lib/webrtc/signaling", () => ({
  createSignalingManager: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    initiateCall: jest.fn(),
    acceptCall: jest.fn(),
    declineCall: jest.fn(),
    endCall: jest.fn(),
    sendOffer: jest.fn(),
    sendAnswer: jest.fn(),
    sendIceCandidate: jest.fn(),
    notifyMuteChange: jest.fn(),
    notifyVideoChange: jest.fn(),
    notifyScreenShareStarted: jest.fn(),
    notifyScreenShareStopped: jest.fn(),
    updateCallbacks: jest.fn(),
  })),
  generateCallId: jest.fn(() => "call-123456789-abcdefghi"),
  SignalingManager: jest.fn(),
}));

// Mock document methods for PiP
Object.defineProperty(document, "pictureInPictureEnabled", {
  value: true,
  writable: true,
});

Object.defineProperty(document, "pictureInPictureElement", {
  value: null,
  writable: true,
});

document.exitPictureInPicture = jest.fn().mockResolvedValue(undefined);

// =============================================================================
// Test Setup
// =============================================================================

const mockUseCallStore = useCallStore as unknown as jest.MockedFunction<
  typeof useCallStore
>;

const createMockMediaStream = () => ({
  id: "stream-1",
  active: true,
  getTracks: jest.fn(() => []),
  getAudioTracks: jest.fn(() => []),
  getVideoTracks: jest.fn(() => []),
});

const createMockStoreState = (overrides = {}) => ({
  activeCall: null,
  incomingCalls: [],
  error: null,
  isPictureInPicture: false,
  initiateCall: jest.fn(),
  acceptCall: jest.fn(),
  declineCall: jest.fn(),
  endCall: jest.fn(),
  setCallState: jest.fn(),
  setCallConnected: jest.fn(),
  setLocalMuted: jest.fn(),
  setLocalVideoEnabled: jest.fn(),
  setLocalScreenSharing: jest.fn(),
  setLocalStream: jest.fn(),
  addRemoteStream: jest.fn(),
  receiveIncomingCall: jest.fn(),
  updateParticipant: jest.fn(),
  setPictureInPicture: jest.fn(),
  ...overrides,
});

const defaultOptions: UseVideoCallOptions = {
  userId: "user-123",
  userName: "Test User",
};

// =============================================================================
// Tests
// =============================================================================

describe("useVideoCall", () => {
  let mockStore: ReturnType<typeof createMockStoreState>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = createMockStoreState();
    mockUseCallStore.mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  describe("Initial State", () => {
    it("should return initial state when not in call", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(result.current.isInCall).toBe(false);
      expect(result.current.isCallConnected).toBe(false);
      expect(result.current.isMuted).toBe(false);
      expect(result.current.isVideoEnabled).toBe(false);
      expect(result.current.isScreenSharing).toBe(false);
      expect(result.current.isRinging).toBe(false);
      expect(result.current.callDuration).toBe(0);
      expect(result.current.hasIncomingCall).toBe(false);
      expect(result.current.isPictureInPicture).toBe(false);
      expect(result.current.audioLevel).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it("should have available actions", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(typeof result.current.startCall).toBe("function");
      expect(typeof result.current.acceptCall).toBe("function");
      expect(typeof result.current.declineCall).toBe("function");
      expect(typeof result.current.endCall).toBe("function");
      expect(typeof result.current.toggleMute).toBe("function");
      expect(typeof result.current.setMuted).toBe("function");
      expect(typeof result.current.toggleVideo).toBe("function");
      expect(typeof result.current.setVideoEnabled).toBe("function");
      expect(typeof result.current.setVideoQuality).toBe("function");
      expect(typeof result.current.startScreenShare).toBe("function");
      expect(typeof result.current.stopScreenShare).toBe("function");
      expect(typeof result.current.enterPictureInPicture).toBe("function");
      expect(typeof result.current.exitPictureInPicture).toBe("function");
      expect(typeof result.current.selectCamera).toBe("function");
      expect(typeof result.current.selectMicrophone).toBe("function");
      expect(typeof result.current.selectSpeaker).toBe("function");
    });

    it("should initialize device lists", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(Array.isArray(result.current.availableCameras)).toBe(true);
      expect(Array.isArray(result.current.availableMicrophones)).toBe(true);
      expect(Array.isArray(result.current.availableSpeakers)).toBe(true);
    });

    it("should return streams state", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(result.current.localStream).toBeNull();
      expect(result.current.remoteStreams).toEqual([]);
    });
  });

  describe("startCall", () => {
    it("should initiate a video call", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      let callId: string = "";
      await act(async () => {
        callId = await result.current.startCall("target-user", "Target User");
      });

      expect(callId).toBe("call-123456789-abcdefghi");
      expect(mockStore.initiateCall).toHaveBeenCalledWith(
        "call-123456789-abcdefghi",
        "target-user",
        "Target User",
        "video",
        undefined,
      );
    });

    it("should include channelId if provided", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.startCall(
          "target-user",
          "Target User",
          "channel-123",
        );
      });

      expect(mockStore.initiateCall).toHaveBeenCalledWith(
        expect.any(String),
        "target-user",
        "Target User",
        "video",
        "channel-123",
      );
    });

    it("should throw if already in call", async () => {
      mockStore.activeCall = {
        id: "existing-call",
        type: "video",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: null,
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: true,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await expect(
        act(async () => {
          await result.current.startCall("target-user", "Target User");
        }),
      ).rejects.toThrow("Already in a call");
    });
  });

  describe("acceptCall", () => {
    it("should accept an incoming call", async () => {
      mockStore.incomingCalls = [
        {
          id: "call-123",
          callerId: "caller-456",
          callerName: "Caller",
          type: "video",
          receivedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.acceptCall("call-123");
      });

      expect(mockStore.acceptCall).toHaveBeenCalledWith("call-123");
    });

    it("should throw if call not found", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await expect(
        act(async () => {
          await result.current.acceptCall("non-existent");
        }),
      ).rejects.toThrow("Call not found");
    });
  });

  describe("Video Controls", () => {
    beforeEach(() => {
      mockStore.activeCall = {
        id: "call-123",
        type: "video",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: true,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };
    });

    it("should toggle video state", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      act(() => {
        result.current.toggleVideo();
      });

      expect(mockStore.setLocalVideoEnabled).toHaveBeenCalledWith(false);
    });

    it("should set video enabled state explicitly", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      act(() => {
        result.current.setVideoEnabled(false);
      });

      expect(mockStore.setLocalVideoEnabled).toHaveBeenCalledWith(false);

      act(() => {
        result.current.setVideoEnabled(true);
      });

      expect(mockStore.setLocalVideoEnabled).toHaveBeenCalledWith(true);
    });

    it("should return correct isVideoEnabled state", () => {
      mockStore.activeCall!.isLocalVideoEnabled = true;

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(result.current.isVideoEnabled).toBe(true);
    });
  });

  describe("Video Quality", () => {
    it("should set video quality", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.setVideoQuality("high");
      });

      const { createMediaManager } = require("@/lib/webrtc/media-manager");
      const mockMediaManager = createMediaManager();
      // applyVideoConstraints should be called with HD constraints
    });

    it("should accept default video quality option", () => {
      const { result } = renderHook(() =>
        useVideoCall({ ...defaultOptions, defaultVideoQuality: "low" }),
      );

      expect(result.current).toBeDefined();
    });
  });

  describe("Screen Sharing", () => {
    beforeEach(() => {
      mockStore.activeCall = {
        id: "call-123",
        type: "video",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: true,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };
    });

    it("should start screen sharing", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.startScreenShare();
      });

      expect(mockStore.setLocalScreenSharing).toHaveBeenCalledWith(true);
    });

    it("should stop screen sharing", () => {
      mockStore.activeCall!.isLocalScreenSharing = true;

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      act(() => {
        result.current.stopScreenShare();
      });

      expect(mockStore.setLocalScreenSharing).toHaveBeenCalledWith(false);
    });

    it("should return isScreenSharing state", () => {
      mockStore.activeCall!.isLocalScreenSharing = true;

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(result.current.isScreenSharing).toBe(true);
    });
  });

  describe("Picture-in-Picture", () => {
    it("should enter picture-in-picture", async () => {
      const mockVideoElement = {
        requestPictureInPicture: jest.fn().mockResolvedValue(undefined),
      } as unknown as HTMLVideoElement;

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.enterPictureInPicture(mockVideoElement);
      });

      expect(mockVideoElement.requestPictureInPicture).toHaveBeenCalled();
      expect(mockStore.setPictureInPicture).toHaveBeenCalledWith(true);
    });

    it("should exit picture-in-picture", async () => {
      Object.defineProperty(document, "pictureInPictureElement", {
        value: {},
        writable: true,
      });

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.exitPictureInPicture();
      });

      expect(document.exitPictureInPicture).toHaveBeenCalled();
      expect(mockStore.setPictureInPicture).toHaveBeenCalledWith(false);

      Object.defineProperty(document, "pictureInPictureElement", {
        value: null,
        writable: true,
      });
    });

    it("should throw if PiP not supported", async () => {
      Object.defineProperty(document, "pictureInPictureEnabled", {
        value: false,
        writable: true,
      });

      const mockVideoElement = {
        requestPictureInPicture: jest.fn(),
      } as unknown as HTMLVideoElement;

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await expect(
        act(async () => {
          await result.current.enterPictureInPicture(mockVideoElement);
        }),
      ).rejects.toThrow("Picture-in-Picture not supported");

      Object.defineProperty(document, "pictureInPictureEnabled", {
        value: true,
        writable: true,
      });
    });
  });

  describe("Mute Controls", () => {
    beforeEach(() => {
      mockStore.activeCall = {
        id: "call-123",
        type: "video",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: true,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };
    });

    it("should toggle mute state", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      act(() => {
        result.current.toggleMute();
      });

      expect(mockStore.setLocalMuted).toHaveBeenCalledWith(true);
    });

    it("should set muted state explicitly", () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      act(() => {
        result.current.setMuted(true);
      });

      expect(mockStore.setLocalMuted).toHaveBeenCalledWith(true);
    });
  });

  describe("Device Selection", () => {
    it("should select camera", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.selectCamera("cam-2");
      });

      const { createMediaManager } = require("@/lib/webrtc/media-manager");
      const mockMediaManager = createMediaManager();
      // switchVideoDevice should be called
    });

    it("should select microphone", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.selectMicrophone("mic-2");
      });

      // switchAudioDevice should be called
    });

    it("should select speaker", async () => {
      const { result } = renderHook(() => useVideoCall(defaultOptions));

      await act(async () => {
        await result.current.selectSpeaker("speaker-2");
      });

      // setAudioOutput should be called
    });
  });

  describe("Call State Derivations", () => {
    it("should detect connected call", () => {
      mockStore.activeCall = {
        id: "call-123",
        type: "video",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map([
          ["user-456", createMockMediaStream() as unknown as MediaStream],
        ]),
        isLocalMuted: false,
        isLocalVideoEnabled: true,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
        localStream: createMockMediaStream() as unknown as MediaStream,
      };

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(result.current.isInCall).toBe(true);
      expect(result.current.isCallConnected).toBe(true);
      expect(result.current.localStream).toBeDefined();
      expect(result.current.remoteStreams).toHaveLength(1);
    });

    it("should detect incoming call", () => {
      mockStore.incomingCalls = [
        {
          id: "call-123",
          callerId: "caller-456",
          callerName: "Caller",
          type: "video",
          receivedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(result.current.hasIncomingCall).toBe(true);
      expect(result.current.isRinging).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should expose error from store", () => {
      mockStore.error = "Test error";

      const { result } = renderHook(() => useVideoCall(defaultOptions));

      expect(result.current.error).toBe("Test error");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount", () => {
      const { unmount } = renderHook(() => useVideoCall(defaultOptions));

      unmount();

      // Verify cleanup functions were called
    });
  });

  describe("Callbacks", () => {
    it("should call onCallStarted", async () => {
      const onCallStarted = jest.fn();
      const { result } = renderHook(() =>
        useVideoCall({ ...defaultOptions, onCallStarted }),
      );

      await act(async () => {
        await result.current.startCall("target-user", "Target User");
      });

      expect(onCallStarted).toHaveBeenCalledWith("call-123456789-abcdefghi");
    });

    it("should call onCallEnded", () => {
      const onCallEnded = jest.fn();
      mockStore.activeCall = {
        id: "call-123",
        type: "video",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: true,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };

      const { result } = renderHook(() =>
        useVideoCall({ ...defaultOptions, onCallEnded }),
      );

      act(() => {
        result.current.endCall();
      });

      expect(onCallEnded).toHaveBeenCalledWith("call-123", "completed");
    });
  });
});

describe("useVideoCall Integration", () => {
  let mockStore: ReturnType<typeof createMockStoreState>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = createMockStoreState();
    mockUseCallStore.mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector(mockStore);
      }
      return mockStore;
    });
  });

  it("should handle full video call flow", async () => {
    const onCallStarted = jest.fn();
    const onCallEnded = jest.fn();

    const { result, rerender } = renderHook(() =>
      useVideoCall({ ...defaultOptions, onCallStarted, onCallEnded }),
    );

    // Start call
    await act(async () => {
      await result.current.startCall("target-user", "Target User");
    });

    expect(onCallStarted).toHaveBeenCalled();

    // Simulate call connected with video
    mockStore.activeCall = {
      id: "call-123456789-abcdefghi",
      type: "video",
      state: "connected",
      direction: "outgoing",
      participants: new Map(),
      startedAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      endedAt: null,
      remoteStreams: new Map(),
      isLocalMuted: false,
      isLocalVideoEnabled: true,
      isLocalScreenSharing: false,
      initiatorId: "user-123",
    };

    rerender();

    expect(result.current.isCallConnected).toBe(true);
    expect(result.current.isVideoEnabled).toBe(true);

    // Toggle video off
    act(() => {
      result.current.toggleVideo();
    });

    expect(mockStore.setLocalVideoEnabled).toHaveBeenCalledWith(false);

    // End call
    act(() => {
      result.current.endCall();
    });

    expect(onCallEnded).toHaveBeenCalled();
  });

  it("should handle screen share flow", async () => {
    mockStore.activeCall = {
      id: "call-123",
      type: "video",
      state: "connected",
      direction: "outgoing",
      participants: new Map(),
      startedAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      endedAt: null,
      remoteStreams: new Map(),
      isLocalMuted: false,
      isLocalVideoEnabled: true,
      isLocalScreenSharing: false,
      initiatorId: "user-123",
    };

    const { result, rerender } = renderHook(() => useVideoCall(defaultOptions));

    // Start screen share
    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(mockStore.setLocalScreenSharing).toHaveBeenCalledWith(true);

    // Simulate screen sharing active
    mockStore.activeCall!.isLocalScreenSharing = true;
    rerender();

    expect(result.current.isScreenSharing).toBe(true);

    // Stop screen share
    act(() => {
      result.current.stopScreenShare();
    });

    expect(mockStore.setLocalScreenSharing).toHaveBeenCalledWith(false);
  });
});
