/**
 * @fileoverview Tests for WebRTC Signaling Manager
 */

import {
  SignalingManager,
  createSignalingManager,
  generateCallId,
  isValidCallId,
  parseCallDuration,
  formatCallDuration,
  CALL_EVENTS,
  type SignalingCallbacks,
  type CallType,
  type CallEndReason,
  type CallInitiatePayload,
  type CallRingPayload,
  type CallOfferPayload,
  type CallAnswerPayload,
  type CallIceCandidatePayload,
} from "../signaling";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("@/lib/realtime", () => {
  const listeners: Map<string, Function[]> = new Map();

  return {
    socketManager: {
      emit: jest.fn(),
      on: jest.fn((event: string, callback: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(callback);
        return () => {
          const eventListeners = listeners.get(event);
          if (eventListeners) {
            const index = eventListeners.indexOf(callback);
            if (index > -1) {
              eventListeners.splice(index, 1);
            }
          }
        };
      }),
      off: jest.fn((event: string, callback: Function) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(callback);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      }),
      isConnected: true,
      // Helper for tests to trigger events
      _listeners: listeners,
      _triggerEvent: (event: string, payload: unknown) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          eventListeners.forEach((cb) => cb(payload));
        }
      },
      _clearListeners: () => listeners.clear(),
    },
    SOCKET_EVENTS: {
      CONNECT: "connect",
      DISCONNECT: "disconnect",
    },
  };
});

// Import after mock
import { socketManager } from "@/lib/realtime";

const mockSocketManager = socketManager as jest.Mocked<typeof socketManager> & {
  _listeners: Map<string, Function[]>;
  _triggerEvent: (event: string, payload: unknown) => void;
  _clearListeners: () => void;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSocketManager._clearListeners();
});

// =============================================================================
// Tests
// =============================================================================

describe("SignalingManager", () => {
  describe("Constructor", () => {
    it("should create with no callbacks", () => {
      const manager = new SignalingManager();
      expect(manager.isConnected).toBe(false);
      expect(manager.currentCallId).toBeNull();
    });

    it("should create with callbacks", () => {
      const callbacks: SignalingCallbacks = {
        onCallRing: jest.fn(),
        onOffer: jest.fn(),
      };
      const manager = new SignalingManager(callbacks);
      expect(manager).toBeDefined();
    });
  });

  describe("Getters", () => {
    it("should return isConnected based on internal state and socket", () => {
      const manager = new SignalingManager();
      expect(manager.isConnected).toBe(false);

      manager.connect();
      expect(manager.isConnected).toBe(true);
    });

    it("should return currentCallId", () => {
      const manager = new SignalingManager();
      expect(manager.currentCallId).toBeNull();
    });
  });

  describe("connect()", () => {
    it("should setup event listeners", () => {
      const manager = new SignalingManager();
      manager.connect();

      expect(socketManager.on).toHaveBeenCalledTimes(18);
      expect(manager.isConnected).toBe(true);
    });

    it("should not setup listeners if already connected", () => {
      const manager = new SignalingManager();
      manager.connect();
      const callCount = (socketManager.on as jest.Mock).mock.calls.length;

      manager.connect();
      expect((socketManager.on as jest.Mock).mock.calls.length).toBe(callCount);
    });
  });

  describe("disconnect()", () => {
    it("should remove event listeners", () => {
      const manager = new SignalingManager();
      manager.connect();
      manager.disconnect();

      expect(manager.isConnected).toBe(false);
      expect(manager.currentCallId).toBeNull();
    });

    it("should handle disconnect when not connected", () => {
      const manager = new SignalingManager();
      expect(() => manager.disconnect()).not.toThrow();
    });
  });

  describe("Call Initiation", () => {
    let manager: SignalingManager;

    beforeEach(() => {
      manager = new SignalingManager();
      manager.connect();
    });

    describe("initiateCall()", () => {
      it("should emit call initiate event", () => {
        const payload: CallInitiatePayload = {
          callId: "call-123",
          targetUserId: "user-456",
          callType: "voice",
        };

        manager.initiateCall(payload);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_INITIATE,
          payload,
        );
        expect(manager.currentCallId).toBe("call-123");
      });

      it("should support optional channelId and metadata", () => {
        const payload: CallInitiatePayload = {
          callId: "call-123",
          targetUserId: "user-456",
          callType: "video",
          channelId: "channel-789",
          metadata: { key: "value" },
        };

        manager.initiateCall(payload);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_INITIATE,
          payload,
        );
      });
    });

    describe("acceptCall()", () => {
      it("should emit call accept event", () => {
        manager.acceptCall("call-123", "user-456");

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_ACCEPT,
          {
            callId: "call-123",
            userId: "user-456",
          },
        );
        expect(manager.currentCallId).toBe("call-123");
      });
    });

    describe("declineCall()", () => {
      it("should emit call decline event", () => {
        manager.declineCall("call-123", "user-456");

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_DECLINE,
          {
            callId: "call-123",
            userId: "user-456",
            reason: undefined,
          },
        );
      });

      it("should include reason if provided", () => {
        manager.declineCall("call-123", "user-456", "busy");

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_DECLINE,
          {
            callId: "call-123",
            userId: "user-456",
            reason: "busy",
          },
        );
      });
    });

    describe("endCall()", () => {
      it("should emit call end event", () => {
        manager.initiateCall({
          callId: "call-123",
          targetUserId: "user-456",
          callType: "voice",
        });
        manager.endCall("call-123", "user-456", "completed", 120);

        expect(socketManager.emit).toHaveBeenCalledWith(CALL_EVENTS.CALL_END, {
          callId: "call-123",
          endedBy: "user-456",
          reason: "completed",
          duration: 120,
        });
        expect(manager.currentCallId).toBeNull();
      });

      it("should not clear currentCallId if different call", () => {
        manager.initiateCall({
          callId: "call-123",
          targetUserId: "user-456",
          callType: "voice",
        });
        manager.endCall("call-999", "user-456", "completed");

        expect(manager.currentCallId).toBe("call-123");
      });
    });

    describe("cancelCall()", () => {
      it("should emit call cancelled event", () => {
        manager.initiateCall({
          callId: "call-123",
          targetUserId: "user-456",
          callType: "voice",
        });
        manager.cancelCall("call-123", "user-456");

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_CANCELLED,
          {
            callId: "call-123",
            cancelledBy: "user-456",
          },
        );
        expect(manager.currentCallId).toBeNull();
      });
    });

    describe("reportBusy()", () => {
      it("should emit call busy event", () => {
        manager.reportBusy("call-123", "user-456");

        expect(socketManager.emit).toHaveBeenCalledWith(CALL_EVENTS.CALL_BUSY, {
          callId: "call-123",
          userId: "user-456",
        });
      });
    });
  });

  describe("WebRTC Signaling", () => {
    let manager: SignalingManager;

    beforeEach(() => {
      manager = new SignalingManager();
      manager.connect();
    });

    describe("sendOffer()", () => {
      it("should emit offer event", () => {
        const payload: CallOfferPayload = {
          callId: "call-123",
          fromUserId: "user-1",
          toUserId: "user-2",
          sdp: { type: "offer", sdp: "v=0..." },
        };

        manager.sendOffer(payload);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_OFFER,
          payload,
        );
      });
    });

    describe("sendAnswer()", () => {
      it("should emit answer event", () => {
        const payload: CallAnswerPayload = {
          callId: "call-123",
          fromUserId: "user-2",
          toUserId: "user-1",
          sdp: { type: "answer", sdp: "v=0..." },
        };

        manager.sendAnswer(payload);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_ANSWER,
          payload,
        );
      });
    });

    describe("sendIceCandidate()", () => {
      it("should emit ICE candidate event", () => {
        const payload: CallIceCandidatePayload = {
          callId: "call-123",
          fromUserId: "user-1",
          toUserId: "user-2",
          candidate: {
            candidate: "candidate:123...",
            sdpMid: "0",
            sdpMLineIndex: 0,
          },
        };

        manager.sendIceCandidate(payload);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_ICE_CANDIDATE,
          payload,
        );
      });
    });

    describe("requestRenegotiation()", () => {
      it("should emit renegotiate event", () => {
        const payload: CallOfferPayload = {
          callId: "call-123",
          fromUserId: "user-1",
          toUserId: "user-2",
          sdp: { type: "offer", sdp: "v=0..." },
        };

        manager.requestRenegotiation(payload);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_RENEGOTIATE,
          payload,
        );
      });
    });
  });

  describe("Media State Updates", () => {
    let manager: SignalingManager;

    beforeEach(() => {
      manager = new SignalingManager();
      manager.connect();
    });

    describe("notifyMuteChange()", () => {
      it("should emit mute changed event with inverted value", () => {
        manager.notifyMuteChange("call-123", "user-456", true);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_MUTE_CHANGED,
          {
            callId: "call-123",
            userId: "user-456",
            enabled: false,
          },
        );
      });

      it("should emit enabled true when not muted", () => {
        manager.notifyMuteChange("call-123", "user-456", false);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_MUTE_CHANGED,
          {
            callId: "call-123",
            userId: "user-456",
            enabled: true,
          },
        );
      });
    });

    describe("notifyVideoChange()", () => {
      it("should emit video changed event", () => {
        manager.notifyVideoChange("call-123", "user-456", true);

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_VIDEO_CHANGED,
          {
            callId: "call-123",
            userId: "user-456",
            enabled: true,
          },
        );
      });
    });

    describe("notifyScreenShareStarted()", () => {
      it("should emit screen share started event", () => {
        manager.notifyScreenShareStarted("call-123", "user-456");

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_SCREEN_SHARE_STARTED,
          {
            callId: "call-123",
            userId: "user-456",
          },
        );
      });
    });

    describe("notifyScreenShareStopped()", () => {
      it("should emit screen share stopped event", () => {
        manager.notifyScreenShareStopped("call-123", "user-456");

        expect(socketManager.emit).toHaveBeenCalledWith(
          CALL_EVENTS.CALL_SCREEN_SHARE_STOPPED,
          {
            callId: "call-123",
            userId: "user-456",
          },
        );
      });
    });
  });

  describe("Event Callbacks", () => {
    it("should call onCallRing callback", () => {
      const onCallRing = jest.fn();
      const manager = new SignalingManager({ onCallRing });
      manager.connect();

      const payload: CallRingPayload = {
        callId: "call-123",
        callerId: "user-1",
        callerName: "Alice",
        callType: "voice",
      };

      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_RING, payload);

      expect(onCallRing).toHaveBeenCalledWith(payload);
    });

    it("should call onCallAccepted callback", () => {
      const onCallAccepted = jest.fn();
      const manager = new SignalingManager({ onCallAccepted });
      manager.connect();

      const payload = { callId: "call-123", userId: "user-2" };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_ACCEPT, payload);

      expect(onCallAccepted).toHaveBeenCalledWith(payload);
    });

    it("should call onCallDeclined callback", () => {
      const onCallDeclined = jest.fn();
      const manager = new SignalingManager({ onCallDeclined });
      manager.connect();

      const payload = { callId: "call-123", userId: "user-2", reason: "busy" };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_DECLINE, payload);

      expect(onCallDeclined).toHaveBeenCalledWith(payload);
    });

    it("should call onCallEnded callback and clear currentCallId", () => {
      const onCallEnded = jest.fn();
      const manager = new SignalingManager({ onCallEnded });
      manager.connect();
      manager.initiateCall({
        callId: "call-123",
        targetUserId: "user-2",
        callType: "voice",
      });

      const payload = {
        callId: "call-123",
        endedBy: "user-2",
        reason: "completed" as CallEndReason,
        duration: 120,
      };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_END, payload);

      expect(onCallEnded).toHaveBeenCalledWith(payload);
      expect(manager.currentCallId).toBeNull();
    });

    it("should call onCallBusy callback", () => {
      const onCallBusy = jest.fn();
      const manager = new SignalingManager({ onCallBusy });
      manager.connect();

      const payload = { callId: "call-123", userId: "user-2" };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_BUSY, payload);

      expect(onCallBusy).toHaveBeenCalledWith(payload);
    });

    it("should call onCallTimeout callback", () => {
      const onCallTimeout = jest.fn();
      const manager = new SignalingManager({ onCallTimeout });
      manager.connect();

      const payload = { callId: "call-123" };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_TIMEOUT, payload);

      expect(onCallTimeout).toHaveBeenCalledWith(payload);
    });

    it("should call onCallCancelled callback", () => {
      const onCallCancelled = jest.fn();
      const manager = new SignalingManager({ onCallCancelled });
      manager.connect();

      const payload = { callId: "call-123", cancelledBy: "user-1" };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_CANCELLED, payload);

      expect(onCallCancelled).toHaveBeenCalledWith(payload);
    });

    it("should call onOffer callback", () => {
      const onOffer = jest.fn();
      const manager = new SignalingManager({ onOffer });
      manager.connect();

      const payload: CallOfferPayload = {
        callId: "call-123",
        fromUserId: "user-1",
        toUserId: "user-2",
        sdp: { type: "offer", sdp: "v=0..." },
      };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_OFFER, payload);

      expect(onOffer).toHaveBeenCalledWith(payload);
    });

    it("should call onAnswer callback", () => {
      const onAnswer = jest.fn();
      const manager = new SignalingManager({ onAnswer });
      manager.connect();

      const payload: CallAnswerPayload = {
        callId: "call-123",
        fromUserId: "user-2",
        toUserId: "user-1",
        sdp: { type: "answer", sdp: "v=0..." },
      };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_ANSWER, payload);

      expect(onAnswer).toHaveBeenCalledWith(payload);
    });

    it("should call onIceCandidate callback", () => {
      const onIceCandidate = jest.fn();
      const manager = new SignalingManager({ onIceCandidate });
      manager.connect();

      const payload: CallIceCandidatePayload = {
        callId: "call-123",
        fromUserId: "user-1",
        toUserId: "user-2",
        candidate: { candidate: "test", sdpMid: "0", sdpMLineIndex: 0 },
      };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_ICE_CANDIDATE, payload);

      expect(onIceCandidate).toHaveBeenCalledWith(payload);
    });

    it("should call onRenegotiate callback", () => {
      const onRenegotiate = jest.fn();
      const manager = new SignalingManager({ onRenegotiate });
      manager.connect();

      const payload: CallOfferPayload = {
        callId: "call-123",
        fromUserId: "user-1",
        toUserId: "user-2",
        sdp: { type: "offer", sdp: "v=0..." },
      };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_RENEGOTIATE, payload);

      expect(onRenegotiate).toHaveBeenCalledWith(payload);
    });

    it("should call onParticipantJoined callback", () => {
      const onParticipantJoined = jest.fn();
      const manager = new SignalingManager({ onParticipantJoined });
      manager.connect();

      const payload = {
        callId: "call-123",
        participant: {
          id: "user-2",
          name: "Bob",
          isMuted: false,
          isVideoEnabled: true,
          isScreenSharing: false,
          joinedAt: new Date().toISOString(),
        },
      };
      mockSocketManager._triggerEvent(
        CALL_EVENTS.CALL_PARTICIPANT_JOINED,
        payload,
      );

      expect(onParticipantJoined).toHaveBeenCalledWith(payload);
    });

    it("should call onParticipantLeft callback", () => {
      const onParticipantLeft = jest.fn();
      const manager = new SignalingManager({ onParticipantLeft });
      manager.connect();

      const payload = {
        callId: "call-123",
        participant: {
          id: "user-2",
          name: "Bob",
          isMuted: false,
          isVideoEnabled: true,
          isScreenSharing: false,
          joinedAt: new Date().toISOString(),
        },
      };
      mockSocketManager._triggerEvent(
        CALL_EVENTS.CALL_PARTICIPANT_LEFT,
        payload,
      );

      expect(onParticipantLeft).toHaveBeenCalledWith(payload);
    });

    it("should call onMuteChanged callback", () => {
      const onMuteChanged = jest.fn();
      const manager = new SignalingManager({ onMuteChanged });
      manager.connect();

      const payload = { callId: "call-123", userId: "user-2", enabled: false };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_MUTE_CHANGED, payload);

      expect(onMuteChanged).toHaveBeenCalledWith(payload);
    });

    it("should call onVideoChanged callback", () => {
      const onVideoChanged = jest.fn();
      const manager = new SignalingManager({ onVideoChanged });
      manager.connect();

      const payload = { callId: "call-123", userId: "user-2", enabled: true };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_VIDEO_CHANGED, payload);

      expect(onVideoChanged).toHaveBeenCalledWith(payload);
    });

    it("should call onScreenShareStarted callback", () => {
      const onScreenShareStarted = jest.fn();
      const manager = new SignalingManager({ onScreenShareStarted });
      manager.connect();

      const payload = { callId: "call-123", userId: "user-2" };
      mockSocketManager._triggerEvent(
        CALL_EVENTS.CALL_SCREEN_SHARE_STARTED,
        payload,
      );

      expect(onScreenShareStarted).toHaveBeenCalledWith(payload);
    });

    it("should call onScreenShareStopped callback", () => {
      const onScreenShareStopped = jest.fn();
      const manager = new SignalingManager({ onScreenShareStopped });
      manager.connect();

      const payload = { callId: "call-123", userId: "user-2" };
      mockSocketManager._triggerEvent(
        CALL_EVENTS.CALL_SCREEN_SHARE_STOPPED,
        payload,
      );

      expect(onScreenShareStopped).toHaveBeenCalledWith(payload);
    });

    it("should call onError callback", () => {
      const onError = jest.fn();
      const manager = new SignalingManager({ onError });
      manager.connect();

      const payload = {
        callId: "call-123",
        code: "PEER_CONNECTION_FAILED",
        message: "Failed to establish connection",
      };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_ERROR, payload);

      expect(onError).toHaveBeenCalledWith(payload);
    });
  });

  describe("updateCallbacks()", () => {
    it("should update callbacks", () => {
      const manager = new SignalingManager();
      const newCallback = jest.fn();

      manager.updateCallbacks({ onCallRing: newCallback });
      manager.connect();

      const payload: CallRingPayload = {
        callId: "call-123",
        callerId: "user-1",
        callerName: "Alice",
        callType: "voice",
      };
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_RING, payload);

      expect(newCallback).toHaveBeenCalledWith(payload);
    });

    it("should merge with existing callbacks", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const manager = new SignalingManager({ onCallRing: callback1 });
      manager.updateCallbacks({ onOffer: callback2 });
      manager.connect();

      // Trigger both events
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_RING, { callId: "1" });
      mockSocketManager._triggerEvent(CALL_EVENTS.CALL_OFFER, { callId: "1" });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe("generateCallId()", () => {
    it("should generate unique call IDs", () => {
      const manager = new SignalingManager();
      const id1 = manager.generateCallId();
      const id2 = manager.generateCallId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^call-\d+-[a-z0-9]+$/);
    });
  });
});

describe("createSignalingManager()", () => {
  it("should create SignalingManager instance", () => {
    const manager = createSignalingManager();
    expect(manager).toBeInstanceOf(SignalingManager);
  });

  it("should pass callbacks to constructor", () => {
    const callbacks: SignalingCallbacks = {
      onCallRing: jest.fn(),
    };
    const manager = createSignalingManager(callbacks);
    expect(manager).toBeDefined();
  });
});

describe("Utility Functions", () => {
  describe("generateCallId()", () => {
    it("should generate valid call IDs", () => {
      const id = generateCallId();
      expect(id).toMatch(/^call-\d+-[a-z0-9]{9}$/);
    });

    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateCallId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("isValidCallId()", () => {
    it("should return true for valid call IDs", () => {
      expect(isValidCallId("call-1234567890-abcdefghi")).toBe(true);
      expect(isValidCallId("call-9999999999-123456789")).toBe(true);
    });

    it("should return false for invalid call IDs", () => {
      expect(isValidCallId("invalid")).toBe(false);
      expect(isValidCallId("call-")).toBe(false);
      expect(isValidCallId("call-123-abc")).toBe(false);
      expect(isValidCallId("")).toBe(false);
    });
  });

  describe("parseCallDuration()", () => {
    it("should calculate duration in seconds", () => {
      const start = "2024-01-01T10:00:00Z";
      const end = "2024-01-01T10:01:30Z";
      const duration = parseCallDuration(start, end);
      expect(duration).toBe(90);
    });

    it("should return 0 for invalid dates", () => {
      const duration = parseCallDuration(
        "2024-01-01T10:00:00Z",
        "2024-01-01T09:59:00Z",
      );
      expect(duration).toBe(0);
    });

    it("should handle same time", () => {
      const time = "2024-01-01T10:00:00Z";
      const duration = parseCallDuration(time, time);
      expect(duration).toBe(0);
    });
  });

  describe("formatCallDuration()", () => {
    it("should format seconds only", () => {
      expect(formatCallDuration(45)).toBe("0:45");
    });

    it("should format minutes and seconds", () => {
      expect(formatCallDuration(90)).toBe("1:30");
      expect(formatCallDuration(125)).toBe("2:05");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatCallDuration(3661)).toBe("1:01:01");
      expect(formatCallDuration(7265)).toBe("2:01:05");
    });

    it("should pad zeros correctly", () => {
      expect(formatCallDuration(5)).toBe("0:05");
      expect(formatCallDuration(65)).toBe("1:05");
      expect(formatCallDuration(3605)).toBe("1:00:05");
    });
  });
});

describe("CALL_EVENTS", () => {
  it("should have all required event names", () => {
    expect(CALL_EVENTS.CALL_INITIATE).toBe("call:initiate");
    expect(CALL_EVENTS.CALL_RING).toBe("call:ring");
    expect(CALL_EVENTS.CALL_ACCEPT).toBe("call:accept");
    expect(CALL_EVENTS.CALL_DECLINE).toBe("call:decline");
    expect(CALL_EVENTS.CALL_END).toBe("call:end");
    expect(CALL_EVENTS.CALL_BUSY).toBe("call:busy");
    expect(CALL_EVENTS.CALL_TIMEOUT).toBe("call:timeout");
    expect(CALL_EVENTS.CALL_CANCELLED).toBe("call:cancelled");
  });

  it("should have WebRTC signaling events", () => {
    expect(CALL_EVENTS.CALL_OFFER).toBe("call:offer");
    expect(CALL_EVENTS.CALL_ANSWER).toBe("call:answer");
    expect(CALL_EVENTS.CALL_ICE_CANDIDATE).toBe("call:ice-candidate");
    expect(CALL_EVENTS.CALL_RENEGOTIATE).toBe("call:renegotiate");
  });

  it("should have participant and media events", () => {
    expect(CALL_EVENTS.CALL_PARTICIPANT_JOINED).toBe("call:participant:joined");
    expect(CALL_EVENTS.CALL_PARTICIPANT_LEFT).toBe("call:participant:left");
    expect(CALL_EVENTS.CALL_MUTE_CHANGED).toBe("call:mute:changed");
    expect(CALL_EVENTS.CALL_VIDEO_CHANGED).toBe("call:video:changed");
    expect(CALL_EVENTS.CALL_SCREEN_SHARE_STARTED).toBe(
      "call:screen-share:started",
    );
    expect(CALL_EVENTS.CALL_SCREEN_SHARE_STOPPED).toBe(
      "call:screen-share:stopped",
    );
  });

  it("should have error event", () => {
    expect(CALL_EVENTS.CALL_ERROR).toBe("call:error");
  });
});
