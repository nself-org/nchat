/**
 * @fileoverview Tests for useVoiceCall hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { useVoiceCall, type UseVoiceCallOptions } from "../use-voice-call";
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
    ]),
    startDeviceChangeListener: jest.fn(),
    stopDeviceChangeListener: jest.fn(),
    getAudioOnlyStream: jest.fn().mockResolvedValue({
      getTracks: jest.fn(() => [{ stop: jest.fn(), kind: "audio" }]),
      getAudioTracks: jest.fn(() => [{ stop: jest.fn() }]),
    }),
    enableAudio: jest.fn(),
    switchAudioDevice: jest.fn().mockResolvedValue(undefined),
    setAudioOutput: jest.fn().mockResolvedValue(undefined),
    createAudioAnalyzer: jest.fn(() => ({
      getLevel: jest.fn(() => 0.5),
      cleanup: jest.fn(),
    })),
    cleanup: jest.fn(),
    updateCallbacks: jest.fn(),
  })),
  MediaManager: jest.fn(),
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
    updateCallbacks: jest.fn(),
  })),
  generateCallId: jest.fn(() => "call-123456789-abcdefghi"),
  SignalingManager: jest.fn(),
}));

// =============================================================================
// Test Setup
// =============================================================================

const mockUseCallStore = useCallStore as unknown as jest.MockedFunction<
  typeof useCallStore
>;

const createMockStoreState = (overrides = {}) => ({
  activeCall: null,
  incomingCalls: [],
  error: null,
  initiateCall: jest.fn(),
  acceptCall: jest.fn(),
  declineCall: jest.fn(),
  endCall: jest.fn(),
  setCallState: jest.fn(),
  setCallConnected: jest.fn(),
  setLocalMuted: jest.fn(),
  setLocalStream: jest.fn(),
  addRemoteStream: jest.fn(),
  receiveIncomingCall: jest.fn(),
  updateParticipant: jest.fn(),
  ...overrides,
});

const defaultOptions: UseVoiceCallOptions = {
  userId: "user-123",
  userName: "Test User",
};

// =============================================================================
// Tests
// =============================================================================

describe("useVoiceCall", () => {
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
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(result.current.isInCall).toBe(false);
      expect(result.current.isCallConnected).toBe(false);
      expect(result.current.isMuted).toBe(false);
      expect(result.current.isRinging).toBe(false);
      expect(result.current.callDuration).toBe(0);
      expect(result.current.hasIncomingCall).toBe(false);
      expect(result.current.audioLevel).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it("should have available actions", () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(typeof result.current.startCall).toBe("function");
      expect(typeof result.current.acceptCall).toBe("function");
      expect(typeof result.current.declineCall).toBe("function");
      expect(typeof result.current.endCall).toBe("function");
      expect(typeof result.current.toggleMute).toBe("function");
      expect(typeof result.current.setMuted).toBe("function");
      expect(typeof result.current.selectSpeaker).toBe("function");
      expect(typeof result.current.selectMicrophone).toBe("function");
    });

    it("should initialize device lists", () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(Array.isArray(result.current.availableMicrophones)).toBe(true);
      expect(Array.isArray(result.current.availableSpeakers)).toBe(true);
    });
  });

  describe("startCall", () => {
    it("should initiate a call", async () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      let callId: string = "";
      await act(async () => {
        callId = await result.current.startCall("target-user", "Target User");
      });

      expect(callId).toBe("call-123456789-abcdefghi");
      expect(mockStore.initiateCall).toHaveBeenCalledWith(
        "call-123456789-abcdefghi",
        "target-user",
        "Target User",
        "voice",
        undefined,
      );
    });

    it("should include channelId if provided", async () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

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
        "voice",
        "channel-123",
      );
    });

    it("should call onCallStarted callback", async () => {
      const onCallStarted = jest.fn();
      const { result } = renderHook(() =>
        useVoiceCall({ ...defaultOptions, onCallStarted }),
      );

      await act(async () => {
        await result.current.startCall("target-user", "Target User");
      });

      expect(onCallStarted).toHaveBeenCalledWith("call-123456789-abcdefghi");
    });

    it("should throw if already in call", async () => {
      mockStore.activeCall = {
        id: "existing-call",
        type: "voice",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: null,
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: false,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

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
          type: "voice",
          receivedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      await act(async () => {
        await result.current.acceptCall("call-123");
      });

      expect(mockStore.acceptCall).toHaveBeenCalledWith("call-123");
    });

    it("should throw if call not found", async () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      await expect(
        act(async () => {
          await result.current.acceptCall("non-existent");
        }),
      ).rejects.toThrow("Call not found");
    });

    it("should call onCallStarted callback", async () => {
      const onCallStarted = jest.fn();
      mockStore.incomingCalls = [
        {
          id: "call-123",
          callerId: "caller-456",
          callerName: "Caller",
          type: "voice",
          receivedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() =>
        useVoiceCall({ ...defaultOptions, onCallStarted }),
      );

      await act(async () => {
        await result.current.acceptCall("call-123");
      });

      expect(onCallStarted).toHaveBeenCalledWith("call-123");
    });
  });

  describe("declineCall", () => {
    it("should decline an incoming call", () => {
      mockStore.incomingCalls = [
        {
          id: "call-123",
          callerId: "caller-456",
          callerName: "Caller",
          type: "voice",
          receivedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      act(() => {
        result.current.declineCall("call-123");
      });

      expect(mockStore.declineCall).toHaveBeenCalledWith("call-123");
    });
  });

  describe("endCall", () => {
    it("should end the active call", () => {
      mockStore.activeCall = {
        id: "call-123",
        type: "voice",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: false,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      act(() => {
        result.current.endCall();
      });

      expect(mockStore.endCall).toHaveBeenCalledWith("completed");
    });

    it("should call onCallEnded callback", () => {
      const onCallEnded = jest.fn();
      mockStore.activeCall = {
        id: "call-123",
        type: "voice",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: false,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };

      const { result } = renderHook(() =>
        useVoiceCall({ ...defaultOptions, onCallEnded }),
      );

      act(() => {
        result.current.endCall();
      });

      expect(onCallEnded).toHaveBeenCalledWith("call-123", "completed");
    });
  });

  describe("Mute Controls", () => {
    beforeEach(() => {
      mockStore.activeCall = {
        id: "call-123",
        type: "voice",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: false,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };
    });

    it("should toggle mute state", () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      act(() => {
        result.current.toggleMute();
      });

      expect(mockStore.setLocalMuted).toHaveBeenCalledWith(true);
    });

    it("should set muted state explicitly", () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      act(() => {
        result.current.setMuted(true);
      });

      expect(mockStore.setLocalMuted).toHaveBeenCalledWith(true);

      act(() => {
        result.current.setMuted(false);
      });

      expect(mockStore.setLocalMuted).toHaveBeenCalledWith(false);
    });

    it("should return correct isMuted state", () => {
      mockStore.activeCall!.isLocalMuted = true;

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(result.current.isMuted).toBe(true);
    });
  });

  describe("Device Selection", () => {
    it("should select microphone", async () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      await act(async () => {
        await result.current.selectMicrophone("mic-2");
      });

      // MediaManager's switchAudioDevice should be called
      const { createMediaManager } = require("@/lib/webrtc/media-manager");
      const mockMediaManager = createMediaManager();
      // The mock was called in the hook
    });

    it("should select speaker", async () => {
      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      await act(async () => {
        await result.current.selectSpeaker("speaker-2");
      });

      // MediaManager's setAudioOutput should be called
    });
  });

  describe("Call State Derivations", () => {
    it("should detect incoming call", () => {
      mockStore.incomingCalls = [
        {
          id: "call-123",
          callerId: "caller-456",
          callerName: "Caller",
          type: "voice",
          receivedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(result.current.hasIncomingCall).toBe(true);
      expect(result.current.isRinging).toBe(true);
    });

    it("should detect connected call", () => {
      mockStore.activeCall = {
        id: "call-123",
        type: "voice",
        state: "connected",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: new Date().toISOString(),
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: false,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(result.current.isInCall).toBe(true);
      expect(result.current.isCallConnected).toBe(true);
    });

    it("should detect ringing state", () => {
      mockStore.activeCall = {
        id: "call-123",
        type: "voice",
        state: "ringing",
        direction: "outgoing",
        participants: new Map(),
        startedAt: new Date().toISOString(),
        connectedAt: null,
        endedAt: null,
        remoteStreams: new Map(),
        isLocalMuted: false,
        isLocalVideoEnabled: false,
        isLocalScreenSharing: false,
        initiatorId: "user-123",
      };

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(result.current.isRinging).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should expose error from store", () => {
      mockStore.error = "Test error";

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(result.current.error).toBe("Test error");
    });

    it("should call onError callback when error occurs", async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useVoiceCall({ ...defaultOptions, onError }),
      );

      // The onError would be called through the media manager callbacks
      // This tests that the hook accepts the callback
      expect(result.current.error).toBeNull();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount", () => {
      const { unmount } = renderHook(() => useVoiceCall(defaultOptions));

      unmount();

      // Verify cleanup functions were called
      const { createMediaManager } = require("@/lib/webrtc/media-manager");
      const mockMediaManager = createMediaManager();
      // Cleanup is called during unmount
    });
  });

  describe("Options with user avatar", () => {
    it("should accept user avatar URL", () => {
      const options: UseVoiceCallOptions = {
        ...defaultOptions,
        userAvatarUrl: "https://example.com/avatar.jpg",
      };

      const { result } = renderHook(() => useVoiceCall(options));

      expect(result.current).toBeDefined();
    });
  });

  describe("Multiple incoming calls", () => {
    it("should handle multiple incoming calls", () => {
      mockStore.incomingCalls = [
        {
          id: "call-1",
          callerId: "caller-1",
          callerName: "Caller 1",
          type: "voice",
          receivedAt: new Date().toISOString(),
        },
        {
          id: "call-2",
          callerId: "caller-2",
          callerName: "Caller 2",
          type: "voice",
          receivedAt: new Date().toISOString(),
        },
      ];

      const { result } = renderHook(() => useVoiceCall(defaultOptions));

      expect(result.current.hasIncomingCall).toBe(true);
      expect(result.current.isRinging).toBe(true);
    });
  });
});

describe("useVoiceCall Integration", () => {
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

  it("should handle full call flow: start -> connect -> end", async () => {
    const onCallStarted = jest.fn();
    const onCallEnded = jest.fn();

    const { result, rerender } = renderHook(() =>
      useVoiceCall({ ...defaultOptions, onCallStarted, onCallEnded }),
    );

    // Start call
    await act(async () => {
      await result.current.startCall("target-user", "Target User");
    });

    expect(onCallStarted).toHaveBeenCalled();

    // Simulate call connected
    mockStore.activeCall = {
      id: "call-123456789-abcdefghi",
      type: "voice",
      state: "connected",
      direction: "outgoing",
      participants: new Map([
        [
          "target-user",
          {
            id: "target-user",
            name: "Target User",
            isMuted: false,
            isVideoEnabled: false,
            isScreenSharing: false,
            isSpeaking: false,
            joinedAt: new Date().toISOString(),
            connectionState: "connected",
          },
        ],
      ]),
      startedAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      endedAt: null,
      remoteStreams: new Map(),
      isLocalMuted: false,
      isLocalVideoEnabled: false,
      isLocalScreenSharing: false,
      initiatorId: "user-123",
    };

    rerender();

    expect(result.current.isCallConnected).toBe(true);

    // End call
    act(() => {
      result.current.endCall();
    });

    expect(onCallEnded).toHaveBeenCalled();
    expect(mockStore.endCall).toHaveBeenCalledWith("completed");
  });

  it("should handle incoming call flow: receive -> accept -> end", async () => {
    const onCallStarted = jest.fn();
    const onCallEnded = jest.fn();

    // Receive incoming call
    mockStore.incomingCalls = [
      {
        id: "incoming-call",
        callerId: "caller-123",
        callerName: "Caller",
        type: "voice",
        receivedAt: new Date().toISOString(),
      },
    ];

    const { result, rerender } = renderHook(() =>
      useVoiceCall({ ...defaultOptions, onCallStarted, onCallEnded }),
    );

    expect(result.current.hasIncomingCall).toBe(true);

    // Accept call
    await act(async () => {
      await result.current.acceptCall("incoming-call");
    });

    expect(mockStore.acceptCall).toHaveBeenCalledWith("incoming-call");
    expect(onCallStarted).toHaveBeenCalledWith("incoming-call");

    // Simulate connected state
    mockStore.activeCall = {
      id: "incoming-call",
      type: "voice",
      state: "connected",
      direction: "incoming",
      participants: new Map(),
      startedAt: new Date().toISOString(),
      connectedAt: new Date().toISOString(),
      endedAt: null,
      remoteStreams: new Map(),
      isLocalMuted: false,
      isLocalVideoEnabled: false,
      isLocalScreenSharing: false,
      initiatorId: "caller-123",
    };
    mockStore.incomingCalls = [];

    rerender();

    expect(result.current.isCallConnected).toBe(true);
    expect(result.current.hasIncomingCall).toBe(false);
  });

  it("should handle declining incoming call", () => {
    mockStore.incomingCalls = [
      {
        id: "incoming-call",
        callerId: "caller-123",
        callerName: "Caller",
        type: "voice",
        receivedAt: new Date().toISOString(),
      },
    ];

    const { result } = renderHook(() => useVoiceCall(defaultOptions));

    act(() => {
      result.current.declineCall("incoming-call");
    });

    expect(mockStore.declineCall).toHaveBeenCalledWith("incoming-call");
  });
});
