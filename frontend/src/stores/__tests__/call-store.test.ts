/**
 * @fileoverview Tests for Call Store
 */

import { act } from "@testing-library/react";
import {
  useCallStore,
  selectActiveCall,
  selectIsInCall,
  selectIsCallConnected,
  selectIsCallRinging,
  selectCallType,
  selectCallDuration,
  selectParticipants,
  selectParticipantCount,
  selectIncomingCalls,
  selectHasIncomingCall,
  selectCallHistory,
  selectRecentCalls,
  selectMissedCalls,
  selectMissedCallCount,
  selectIsLocalMuted,
  selectIsLocalVideoEnabled,
  selectIsScreenSharing,
  selectLocalStream,
  selectRemoteStreams,
  selectDeviceSettings,
  selectCallSettings,
  type CallParticipant,
  type IncomingCall,
  type CallHistoryEntry,
  type CallType,
  type CallEndReason,
} from "../call-store";

// =============================================================================
// Test Helpers
// =============================================================================

const createMockParticipant = (
  overrides?: Partial<CallParticipant>,
): CallParticipant => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "Test User",
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  isSpeaking: false,
  joinedAt: new Date().toISOString(),
  connectionState: "connected",
  ...overrides,
});

const createMockIncomingCall = (
  overrides?: Partial<IncomingCall>,
): IncomingCall => ({
  id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  callerId: "caller-123",
  callerName: "Alice",
  type: "voice",
  receivedAt: new Date().toISOString(),
  ...overrides,
});

const createMockHistoryEntry = (
  overrides?: Partial<CallHistoryEntry>,
): CallHistoryEntry => ({
  id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: "voice",
  direction: "outgoing",
  participantIds: ["user-1"],
  participantNames: ["Test User"],
  startedAt: new Date().toISOString(),
  endedAt: new Date().toISOString(),
  duration: 120,
  endReason: "completed",
  missedCall: false,
  ...overrides,
});

const createMockMediaStream = (): MediaStream => {
  return {
    id: `stream-${Date.now()}`,
    active: true,
    getTracks: jest.fn(() => []),
    getAudioTracks: jest.fn(() => []),
    getVideoTracks: jest.fn(() => []),
  } as unknown as MediaStream;
};

// =============================================================================
// Tests
// =============================================================================

describe("Call Store", () => {
  beforeEach(() => {
    act(() => {
      useCallStore.getState().resetCallStore();
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe("Initial State", () => {
    it("should have null active call", () => {
      expect(useCallStore.getState().activeCall).toBeNull();
    });

    it("should have empty incoming calls", () => {
      expect(useCallStore.getState().incomingCalls).toHaveLength(0);
    });

    it("should have empty call history", () => {
      expect(useCallStore.getState().callHistory).toHaveLength(0);
    });

    it("should have default settings", () => {
      const state = useCallStore.getState();
      expect(state.ringVolume).toBe(80);
      expect(state.autoAcceptCalls).toBe(false);
      expect(state.showCallNotifications).toBe(true);
    });

    it("should have null device selections", () => {
      const state = useCallStore.getState();
      expect(state.selectedAudioInputId).toBeNull();
      expect(state.selectedAudioOutputId).toBeNull();
      expect(state.selectedVideoInputId).toBeNull();
    });

    it("should have default UI states", () => {
      const state = useCallStore.getState();
      expect(state.isCallControlsMinimized).toBe(false);
      expect(state.isPictureInPicture).toBe(false);
    });

    it("should not be loading and have no error", () => {
      const state = useCallStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ===========================================================================
  // Call Initiation Tests
  // ===========================================================================

  describe("Call Initiation", () => {
    describe("initiateCall", () => {
      it("should create an active call for voice", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        const state = useCallStore.getState();
        expect(state.activeCall).toBeDefined();
        expect(state.activeCall?.id).toBe("call-123");
        expect(state.activeCall?.type).toBe("voice");
        expect(state.activeCall?.state).toBe("initiating");
        expect(state.activeCall?.direction).toBe("outgoing");
      });

      it("should create an active call for video", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "video");
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.type).toBe("video");
        expect(state.activeCall?.isLocalVideoEnabled).toBe(true);
      });

      it("should add target user as participant", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        const state = useCallStore.getState();
        const participant = state.activeCall?.participants.get("user-456");
        expect(participant).toBeDefined();
        expect(participant?.name).toBe("Bob");
      });

      it("should include channelId if provided", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall(
              "call-123",
              "user-456",
              "Bob",
              "voice",
              "channel-789",
            );
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.channelId).toBe("channel-789");
      });

      it("should set startedAt timestamp", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.startedAt).toBeDefined();
      });
    });

    describe("receiveIncomingCall", () => {
      it("should add incoming call to queue", () => {
        const call = createMockIncomingCall({ id: "call-123" });

        act(() => {
          useCallStore.getState().receiveIncomingCall(call);
        });

        const state = useCallStore.getState();
        expect(state.incomingCalls).toHaveLength(1);
        expect(state.incomingCalls[0].id).toBe("call-123");
      });

      it("should not add duplicate incoming calls", () => {
        const call = createMockIncomingCall({ id: "call-123" });

        act(() => {
          useCallStore.getState().receiveIncomingCall(call);
          useCallStore.getState().receiveIncomingCall(call);
        });

        const state = useCallStore.getState();
        expect(state.incomingCalls).toHaveLength(1);
      });

      it("should queue multiple different calls", () => {
        act(() => {
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-1" }));
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-2" }));
        });

        const state = useCallStore.getState();
        expect(state.incomingCalls).toHaveLength(2);
      });
    });

    describe("acceptCall", () => {
      it("should create active call from incoming call", () => {
        const incomingCall = createMockIncomingCall({
          id: "call-123",
          callerName: "Alice",
        });

        act(() => {
          useCallStore.getState().receiveIncomingCall(incomingCall);
          useCallStore.getState().acceptCall("call-123");
        });

        const state = useCallStore.getState();
        expect(state.activeCall).toBeDefined();
        expect(state.activeCall?.id).toBe("call-123");
        expect(state.activeCall?.direction).toBe("incoming");
        expect(state.activeCall?.state).toBe("connecting");
      });

      it("should remove from incoming calls", () => {
        const incomingCall = createMockIncomingCall({ id: "call-123" });

        act(() => {
          useCallStore.getState().receiveIncomingCall(incomingCall);
          useCallStore.getState().acceptCall("call-123");
        });

        const state = useCallStore.getState();
        expect(state.incomingCalls).toHaveLength(0);
      });

      it("should do nothing if call not found", () => {
        act(() => {
          useCallStore.getState().acceptCall("non-existent");
        });

        const state = useCallStore.getState();
        expect(state.activeCall).toBeNull();
      });
    });

    describe("declineCall", () => {
      it("should remove call from incoming calls", () => {
        const call = createMockIncomingCall({ id: "call-123" });

        act(() => {
          useCallStore.getState().receiveIncomingCall(call);
          useCallStore.getState().declineCall("call-123");
        });

        const state = useCallStore.getState();
        expect(state.incomingCalls).toHaveLength(0);
      });

      it("should not affect other incoming calls", () => {
        act(() => {
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-1" }));
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-2" }));
          useCallStore.getState().declineCall("call-1");
        });

        const state = useCallStore.getState();
        expect(state.incomingCalls).toHaveLength(1);
        expect(state.incomingCalls[0].id).toBe("call-2");
      });
    });
  });

  // ===========================================================================
  // Call State Tests
  // ===========================================================================

  describe("Call State", () => {
    beforeEach(() => {
      act(() => {
        useCallStore
          .getState()
          .initiateCall("call-123", "user-456", "Bob", "voice");
      });
    });

    describe("setCallState", () => {
      it("should update call state", () => {
        act(() => {
          useCallStore.getState().setCallState("ringing");
        });

        expect(useCallStore.getState().activeCall?.state).toBe("ringing");
      });

      it("should do nothing if no active call", () => {
        act(() => {
          useCallStore.getState().resetCallStore();
          useCallStore.getState().setCallState("connected");
        });

        expect(useCallStore.getState().activeCall).toBeNull();
      });
    });

    describe("setCallConnected", () => {
      it("should set state to connected and set connectedAt", () => {
        act(() => {
          useCallStore.getState().setCallConnected();
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.state).toBe("connected");
        expect(state.activeCall?.connectedAt).toBeDefined();
      });
    });

    describe("setCallReconnecting", () => {
      it("should set state to reconnecting", () => {
        act(() => {
          useCallStore.getState().setCallReconnecting();
        });

        expect(useCallStore.getState().activeCall?.state).toBe("reconnecting");
      });
    });

    describe("endCall", () => {
      it("should clear active call", () => {
        act(() => {
          useCallStore.getState().endCall("completed");
        });

        expect(useCallStore.getState().activeCall).toBeNull();
      });

      it("should add entry to call history", () => {
        act(() => {
          useCallStore.getState().endCall("completed");
        });

        const state = useCallStore.getState();
        expect(state.callHistory).toHaveLength(1);
        expect(state.callHistory[0].endReason).toBe("completed");
      });

      it("should calculate call duration", () => {
        act(() => {
          useCallStore.getState().setCallConnected();
        });

        // Simulate some time passing
        jest.useFakeTimers();
        jest.advanceTimersByTime(5000);

        act(() => {
          useCallStore.getState().endCall();
        });

        const state = useCallStore.getState();
        expect(state.callHistory[0].duration).toBeGreaterThanOrEqual(0);

        jest.useRealTimers();
      });
    });

    describe("cancelCall", () => {
      it("should clear active call", () => {
        act(() => {
          useCallStore.getState().cancelCall();
        });

        expect(useCallStore.getState().activeCall).toBeNull();
      });

      it("should add cancelled entry to history", () => {
        act(() => {
          useCallStore.getState().cancelCall();
        });

        const state = useCallStore.getState();
        expect(state.callHistory[0].endReason).toBe("cancelled");
      });
    });
  });

  // ===========================================================================
  // Participant Management Tests
  // ===========================================================================

  describe("Participant Management", () => {
    beforeEach(() => {
      act(() => {
        useCallStore
          .getState()
          .initiateCall("call-123", "user-456", "Bob", "voice");
      });
    });

    describe("addParticipant", () => {
      it("should add participant to active call", () => {
        const participant = createMockParticipant({
          id: "user-789",
          name: "Charlie",
        });

        act(() => {
          useCallStore.getState().addParticipant(participant);
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.participants.has("user-789")).toBe(true);
      });
    });

    describe("removeParticipant", () => {
      it("should remove participant from active call", () => {
        act(() => {
          useCallStore.getState().removeParticipant("user-456");
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.participants.has("user-456")).toBe(false);
      });

      it("should also remove remote stream", () => {
        const stream = createMockMediaStream();

        act(() => {
          useCallStore.getState().addRemoteStream("user-456", stream);
          useCallStore.getState().removeParticipant("user-456");
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.remoteStreams.has("user-456")).toBe(false);
      });
    });

    describe("updateParticipant", () => {
      it("should update participant properties", () => {
        act(() => {
          useCallStore
            .getState()
            .updateParticipant("user-456", { isMuted: true });
        });

        const state = useCallStore.getState();
        const participant = state.activeCall?.participants.get("user-456");
        expect(participant?.isMuted).toBe(true);
      });

      it("should do nothing for non-existent participant", () => {
        act(() => {
          useCallStore
            .getState()
            .updateParticipant("non-existent", { isMuted: true });
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.participants.has("non-existent")).toBe(false);
      });
    });

    describe("setParticipantSpeaking", () => {
      it("should update speaking state", () => {
        act(() => {
          useCallStore.getState().setParticipantSpeaking("user-456", true);
        });

        const state = useCallStore.getState();
        const participant = state.activeCall?.participants.get("user-456");
        expect(participant?.isSpeaking).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Local Media State Tests
  // ===========================================================================

  describe("Local Media State", () => {
    beforeEach(() => {
      act(() => {
        useCallStore
          .getState()
          .initiateCall("call-123", "user-456", "Bob", "video");
      });
    });

    describe("setLocalMuted", () => {
      it("should set muted state", () => {
        act(() => {
          useCallStore.getState().setLocalMuted(true);
        });

        expect(useCallStore.getState().activeCall?.isLocalMuted).toBe(true);
      });
    });

    describe("toggleLocalMute", () => {
      it("should toggle muted state", () => {
        act(() => {
          useCallStore.getState().toggleLocalMute();
        });

        expect(useCallStore.getState().activeCall?.isLocalMuted).toBe(true);

        act(() => {
          useCallStore.getState().toggleLocalMute();
        });

        expect(useCallStore.getState().activeCall?.isLocalMuted).toBe(false);
      });
    });

    describe("setLocalVideoEnabled", () => {
      it("should set video enabled state", () => {
        act(() => {
          useCallStore.getState().setLocalVideoEnabled(false);
        });

        expect(useCallStore.getState().activeCall?.isLocalVideoEnabled).toBe(
          false,
        );
      });
    });

    describe("toggleLocalVideo", () => {
      it("should toggle video enabled state", () => {
        act(() => {
          useCallStore.getState().toggleLocalVideo();
        });

        expect(useCallStore.getState().activeCall?.isLocalVideoEnabled).toBe(
          false,
        );
      });
    });

    describe("setLocalScreenSharing", () => {
      it("should set screen sharing state", () => {
        act(() => {
          useCallStore.getState().setLocalScreenSharing(true);
        });

        expect(useCallStore.getState().activeCall?.isLocalScreenSharing).toBe(
          true,
        );
      });
    });
  });

  // ===========================================================================
  // Stream Management Tests
  // ===========================================================================

  describe("Stream Management", () => {
    beforeEach(() => {
      act(() => {
        useCallStore
          .getState()
          .initiateCall("call-123", "user-456", "Bob", "voice");
      });
    });

    describe("setLocalStream", () => {
      it("should set local stream", () => {
        const stream = createMockMediaStream();

        act(() => {
          useCallStore.getState().setLocalStream(stream);
        });

        expect(useCallStore.getState().activeCall?.localStream).toBe(stream);
      });

      it("should allow undefined to clear stream", () => {
        const stream = createMockMediaStream();

        act(() => {
          useCallStore.getState().setLocalStream(stream);
          useCallStore.getState().setLocalStream(undefined);
        });

        expect(useCallStore.getState().activeCall?.localStream).toBeUndefined();
      });
    });

    describe("addRemoteStream", () => {
      it("should add remote stream for participant", () => {
        const stream = createMockMediaStream();

        act(() => {
          useCallStore.getState().addRemoteStream("user-456", stream);
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.remoteStreams.get("user-456")).toBe(stream);
      });
    });

    describe("removeRemoteStream", () => {
      it("should remove remote stream", () => {
        const stream = createMockMediaStream();

        act(() => {
          useCallStore.getState().addRemoteStream("user-456", stream);
          useCallStore.getState().removeRemoteStream("user-456");
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.remoteStreams.has("user-456")).toBe(false);
      });
    });

    describe("clearStreams", () => {
      it("should clear all streams", () => {
        const localStream = createMockMediaStream();
        const remoteStream = createMockMediaStream();

        act(() => {
          useCallStore.getState().setLocalStream(localStream);
          useCallStore.getState().addRemoteStream("user-456", remoteStream);
          useCallStore.getState().clearStreams();
        });

        const state = useCallStore.getState();
        expect(state.activeCall?.localStream).toBeUndefined();
        expect(state.activeCall?.remoteStreams.size).toBe(0);
      });
    });
  });

  // ===========================================================================
  // Incoming Calls Tests
  // ===========================================================================

  describe("Incoming Calls Management", () => {
    describe("removeIncomingCall", () => {
      it("should remove specific incoming call", () => {
        act(() => {
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-1" }));
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-2" }));
          useCallStore.getState().removeIncomingCall("call-1");
        });

        const state = useCallStore.getState();
        expect(state.incomingCalls).toHaveLength(1);
        expect(state.incomingCalls[0].id).toBe("call-2");
      });
    });

    describe("clearIncomingCalls", () => {
      it("should clear all incoming calls", () => {
        act(() => {
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-1" }));
          useCallStore
            .getState()
            .receiveIncomingCall(createMockIncomingCall({ id: "call-2" }));
          useCallStore.getState().clearIncomingCalls();
        });

        expect(useCallStore.getState().incomingCalls).toHaveLength(0);
      });
    });
  });

  // ===========================================================================
  // Call History Tests
  // ===========================================================================

  describe("Call History", () => {
    describe("addToHistory", () => {
      it("should add entry at beginning of history", () => {
        const entry1 = createMockHistoryEntry({ id: "call-1" });
        const entry2 = createMockHistoryEntry({ id: "call-2" });

        act(() => {
          useCallStore.getState().addToHistory(entry1);
          useCallStore.getState().addToHistory(entry2);
        });

        const state = useCallStore.getState();
        expect(state.callHistory[0].id).toBe("call-2");
        expect(state.callHistory[1].id).toBe("call-1");
      });
    });

    describe("clearHistory", () => {
      it("should clear all history", () => {
        act(() => {
          useCallStore.getState().addToHistory(createMockHistoryEntry());
          useCallStore.getState().addToHistory(createMockHistoryEntry());
          useCallStore.getState().clearHistory();
        });

        expect(useCallStore.getState().callHistory).toHaveLength(0);
      });
    });

    describe("setHistoryLoading", () => {
      it("should set loading state", () => {
        act(() => {
          useCallStore.getState().setHistoryLoading(true);
        });

        expect(useCallStore.getState().historyLoading).toBe(true);
      });
    });

    describe("loadHistory", () => {
      it("should replace history with loaded entries", () => {
        const entries = [
          createMockHistoryEntry({ id: "call-1" }),
          createMockHistoryEntry({ id: "call-2" }),
        ];

        act(() => {
          useCallStore.getState().loadHistory(entries);
        });

        const state = useCallStore.getState();
        expect(state.callHistory).toHaveLength(2);
      });
    });
  });

  // ===========================================================================
  // Device Selection Tests
  // ===========================================================================

  describe("Device Selection", () => {
    describe("setSelectedAudioInput", () => {
      it("should set audio input device", () => {
        act(() => {
          useCallStore.getState().setSelectedAudioInput("device-1");
        });

        expect(useCallStore.getState().selectedAudioInputId).toBe("device-1");
      });

      it("should allow null", () => {
        act(() => {
          useCallStore.getState().setSelectedAudioInput("device-1");
          useCallStore.getState().setSelectedAudioInput(null);
        });

        expect(useCallStore.getState().selectedAudioInputId).toBeNull();
      });
    });

    describe("setSelectedAudioOutput", () => {
      it("should set audio output device", () => {
        act(() => {
          useCallStore.getState().setSelectedAudioOutput("device-1");
        });

        expect(useCallStore.getState().selectedAudioOutputId).toBe("device-1");
      });
    });

    describe("setSelectedVideoInput", () => {
      it("should set video input device", () => {
        act(() => {
          useCallStore.getState().setSelectedVideoInput("device-1");
        });

        expect(useCallStore.getState().selectedVideoInputId).toBe("device-1");
      });
    });
  });

  // ===========================================================================
  // Settings Tests
  // ===========================================================================

  describe("Settings", () => {
    describe("setRingVolume", () => {
      it("should set ring volume", () => {
        act(() => {
          useCallStore.getState().setRingVolume(50);
        });

        expect(useCallStore.getState().ringVolume).toBe(50);
      });

      it("should clamp volume to 0-100", () => {
        act(() => {
          useCallStore.getState().setRingVolume(150);
        });

        expect(useCallStore.getState().ringVolume).toBe(100);

        act(() => {
          useCallStore.getState().setRingVolume(-10);
        });

        expect(useCallStore.getState().ringVolume).toBe(0);
      });
    });

    describe("setAutoAcceptCalls", () => {
      it("should set auto accept", () => {
        act(() => {
          useCallStore.getState().setAutoAcceptCalls(true);
        });

        expect(useCallStore.getState().autoAcceptCalls).toBe(true);
      });
    });

    describe("setShowCallNotifications", () => {
      it("should set notification preference", () => {
        act(() => {
          useCallStore.getState().setShowCallNotifications(false);
        });

        expect(useCallStore.getState().showCallNotifications).toBe(false);
      });
    });
  });

  // ===========================================================================
  // UI State Tests
  // ===========================================================================

  describe("UI State", () => {
    describe("setCallControlsMinimized", () => {
      it("should set minimized state", () => {
        act(() => {
          useCallStore.getState().setCallControlsMinimized(true);
        });

        expect(useCallStore.getState().isCallControlsMinimized).toBe(true);
      });
    });

    describe("setPictureInPicture", () => {
      it("should set PiP state", () => {
        act(() => {
          useCallStore.getState().setPictureInPicture(true);
        });

        expect(useCallStore.getState().isPictureInPicture).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Loading/Error Tests
  // ===========================================================================

  describe("Loading and Error", () => {
    describe("setLoading", () => {
      it("should set loading state", () => {
        act(() => {
          useCallStore.getState().setLoading(true);
        });

        expect(useCallStore.getState().isLoading).toBe(true);
      });
    });

    describe("setError", () => {
      it("should set error", () => {
        act(() => {
          useCallStore.getState().setError("Test error");
        });

        expect(useCallStore.getState().error).toBe("Test error");
      });

      it("should clear error with null", () => {
        act(() => {
          useCallStore.getState().setError("Test error");
          useCallStore.getState().setError(null);
        });

        expect(useCallStore.getState().error).toBeNull();
      });
    });
  });

  // ===========================================================================
  // Reset Tests
  // ===========================================================================

  describe("Reset", () => {
    it("should reset all state", () => {
      act(() => {
        useCallStore
          .getState()
          .initiateCall("call-123", "user-456", "Bob", "voice");
        useCallStore.getState().receiveIncomingCall(createMockIncomingCall());
        useCallStore.getState().addToHistory(createMockHistoryEntry());
        useCallStore.getState().setRingVolume(50);
        useCallStore.getState().setError("Test error");
        useCallStore.getState().resetCallStore();
      });

      const state = useCallStore.getState();
      expect(state.activeCall).toBeNull();
      expect(state.incomingCalls).toHaveLength(0);
      expect(state.callHistory).toHaveLength(0);
      expect(state.ringVolume).toBe(80);
      expect(state.error).toBeNull();
    });
  });

  // ===========================================================================
  // Selector Tests
  // ===========================================================================

  describe("Selectors", () => {
    describe("selectActiveCall", () => {
      it("should return active call", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        const call = selectActiveCall(useCallStore.getState());
        expect(call?.id).toBe("call-123");
      });
    });

    describe("selectIsInCall", () => {
      it("should return true when in active call", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        expect(selectIsInCall(useCallStore.getState())).toBe(true);
      });

      it("should return false when no call", () => {
        expect(selectIsInCall(useCallStore.getState())).toBe(false);
      });
    });

    describe("selectIsCallConnected", () => {
      it("should return true when connected", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
          useCallStore.getState().setCallConnected();
        });

        expect(selectIsCallConnected(useCallStore.getState())).toBe(true);
      });
    });

    describe("selectIsCallRinging", () => {
      it("should return true when ringing or has incoming calls", () => {
        act(() => {
          useCallStore.getState().receiveIncomingCall(createMockIncomingCall());
        });

        expect(selectIsCallRinging(useCallStore.getState())).toBe(true);
      });
    });

    describe("selectCallType", () => {
      it("should return call type", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "video");
        });

        expect(selectCallType(useCallStore.getState())).toBe("video");
      });
    });

    describe("selectCallDuration", () => {
      it("should return 0 if not connected", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        expect(selectCallDuration(useCallStore.getState())).toBe(0);
      });
    });

    describe("selectParticipants", () => {
      it("should return array of participants", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        const participants = selectParticipants(useCallStore.getState());
        expect(participants).toHaveLength(1);
      });
    });

    describe("selectParticipantCount", () => {
      it("should return participant count", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
        });

        expect(selectParticipantCount(useCallStore.getState())).toBe(1);
      });
    });

    describe("selectIncomingCalls", () => {
      it("should return incoming calls", () => {
        act(() => {
          useCallStore.getState().receiveIncomingCall(createMockIncomingCall());
        });

        const calls = selectIncomingCalls(useCallStore.getState());
        expect(calls).toHaveLength(1);
      });
    });

    describe("selectHasIncomingCall", () => {
      it("should return true when has incoming calls", () => {
        act(() => {
          useCallStore.getState().receiveIncomingCall(createMockIncomingCall());
        });

        expect(selectHasIncomingCall(useCallStore.getState())).toBe(true);
      });
    });

    describe("selectCallHistory", () => {
      it("should return call history", () => {
        act(() => {
          useCallStore.getState().addToHistory(createMockHistoryEntry());
        });

        const history = selectCallHistory(useCallStore.getState());
        expect(history).toHaveLength(1);
      });
    });

    describe("selectRecentCalls", () => {
      it("should return limited recent calls", () => {
        act(() => {
          for (let i = 0; i < 15; i++) {
            useCallStore.getState().addToHistory(createMockHistoryEntry());
          }
        });

        const recent = selectRecentCalls(5)(useCallStore.getState());
        expect(recent).toHaveLength(5);
      });
    });

    describe("selectMissedCalls", () => {
      it("should return only missed calls", () => {
        act(() => {
          useCallStore
            .getState()
            .addToHistory(createMockHistoryEntry({ missedCall: false }));
          useCallStore
            .getState()
            .addToHistory(createMockHistoryEntry({ missedCall: true }));
        });

        const missed = selectMissedCalls(useCallStore.getState());
        expect(missed).toHaveLength(1);
      });
    });

    describe("selectMissedCallCount", () => {
      it("should return missed call count", () => {
        act(() => {
          useCallStore
            .getState()
            .addToHistory(createMockHistoryEntry({ missedCall: true }));
          useCallStore
            .getState()
            .addToHistory(createMockHistoryEntry({ missedCall: true }));
        });

        expect(selectMissedCallCount(useCallStore.getState())).toBe(2);
      });
    });

    describe("selectIsLocalMuted", () => {
      it("should return local muted state", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
          useCallStore.getState().setLocalMuted(true);
        });

        expect(selectIsLocalMuted(useCallStore.getState())).toBe(true);
      });

      it("should return false when no call", () => {
        expect(selectIsLocalMuted(useCallStore.getState())).toBe(false);
      });
    });

    describe("selectIsLocalVideoEnabled", () => {
      it("should return video enabled state", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "video");
        });

        expect(selectIsLocalVideoEnabled(useCallStore.getState())).toBe(true);
      });
    });

    describe("selectIsScreenSharing", () => {
      it("should return screen sharing state", () => {
        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
          useCallStore.getState().setLocalScreenSharing(true);
        });

        expect(selectIsScreenSharing(useCallStore.getState())).toBe(true);
      });
    });

    describe("selectLocalStream", () => {
      it("should return local stream", () => {
        const stream = createMockMediaStream();

        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
          useCallStore.getState().setLocalStream(stream);
        });

        expect(selectLocalStream(useCallStore.getState())).toBe(stream);
      });
    });

    describe("selectRemoteStreams", () => {
      it("should return array of remote streams", () => {
        const stream = createMockMediaStream();

        act(() => {
          useCallStore
            .getState()
            .initiateCall("call-123", "user-456", "Bob", "voice");
          useCallStore.getState().addRemoteStream("user-456", stream);
        });

        const streams = selectRemoteStreams(useCallStore.getState());
        expect(streams).toHaveLength(1);
      });
    });

    describe("selectDeviceSettings", () => {
      it("should return device settings", () => {
        act(() => {
          useCallStore.getState().setSelectedAudioInput("audio-1");
          useCallStore.getState().setSelectedAudioOutput("audio-out-1");
          useCallStore.getState().setSelectedVideoInput("video-1");
        });

        const settings = selectDeviceSettings(useCallStore.getState());
        expect(settings.audioInput).toBe("audio-1");
        expect(settings.audioOutput).toBe("audio-out-1");
        expect(settings.videoInput).toBe("video-1");
      });
    });

    describe("selectCallSettings", () => {
      it("should return call settings", () => {
        act(() => {
          useCallStore.getState().setRingVolume(50);
          useCallStore.getState().setAutoAcceptCalls(true);
          useCallStore.getState().setShowCallNotifications(false);
        });

        const settings = selectCallSettings(useCallStore.getState());
        expect(settings.ringVolume).toBe(50);
        expect(settings.autoAcceptCalls).toBe(true);
        expect(settings.showCallNotifications).toBe(false);
      });
    });
  });
});
