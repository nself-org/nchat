/**
 * Tests for call-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  CallStore,
  ActiveCall,
  CallHistoryEntry,
  IncomingCall,
  CallParticipant,
} from "../call-store";
import {
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
} from "../call-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActiveCall(overrides?: Partial<ActiveCall>): ActiveCall {
  return {
    id: "call1",
    type: "voice",
    state: "connected",
    direction: "outgoing",
    channelId: "c1",
    initiatorId: "u1",
    participants: new Map<string, CallParticipant>(),
    startedAt: "2024-01-01T00:00:00Z",
    connectedAt: null,
    endedAt: null,
    remoteStreams: new Map<string, MediaStream>(),
    isLocalMuted: false,
    isLocalVideoEnabled: true,
    isLocalScreenSharing: false,
    ...overrides,
  };
}

function makeHistoryEntry(
  overrides?: Partial<CallHistoryEntry>,
): CallHistoryEntry {
  return {
    id: "h1",
    type: "voice",
    direction: "outgoing",
    participantIds: ["u1", "u2"],
    participantNames: ["Alice", "Bob"],
    channelId: "c1",
    startedAt: "2024-01-01T00:00:00Z",
    endedAt: "2024-01-01T00:01:00Z",
    duration: 60,
    endReason: "completed",
    missedCall: false,
    ...overrides,
  };
}

function makeIncomingCall(overrides?: Partial<IncomingCall>): IncomingCall {
  return {
    id: "ic1",
    callerId: "u2",
    callerName: "Bob",
    type: "voice",
    receivedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): CallStore {
  const defaultState = {
    activeCall: null,
    incomingCalls: [],
    callHistory: [],
    historyLoading: false,
    selectedAudioInputId: null,
    selectedAudioOutputId: null,
    selectedVideoInputId: null,
    ringVolume: 0.8,
    autoAcceptCalls: false,
    showCallNotifications: true,
    isCallControlsMinimized: false,
    isPictureInPicture: false,
    isLoading: false,
    error: null,
    // stub actions
    initiateCall: () => undefined,
    receiveIncomingCall: () => undefined,
    acceptCall: () => undefined,
    declineCall: () => undefined,
    endCall: () => undefined,
    cancelCall: () => undefined,
    setCallState: () => undefined,
    setCallConnected: () => undefined,
    setCallReconnecting: () => undefined,
    addParticipant: () => undefined,
    removeParticipant: () => undefined,
    updateParticipant: () => undefined,
    setParticipantSpeaking: () => undefined,
    setLocalMuted: () => undefined,
    toggleLocalMute: () => undefined,
    setLocalVideoEnabled: () => undefined,
    toggleLocalVideo: () => undefined,
    setLocalScreenSharing: () => undefined,
    setLocalStream: () => undefined,
    addRemoteStream: () => undefined,
    removeRemoteStream: () => undefined,
    clearStreams: () => undefined,
    removeIncomingCall: () => undefined,
    clearIncomingCalls: () => undefined,
    addToHistory: () => undefined,
    clearHistory: () => undefined,
    setHistoryLoading: () => undefined,
    loadHistory: () => undefined,
    setSelectedAudioInput: () => undefined,
    setSelectedAudioOutput: () => undefined,
    setSelectedVideoInput: () => undefined,
    setRingVolume: () => undefined,
    setAutoAcceptCalls: () => undefined,
    setShowCallNotifications: () => undefined,
    setCallControlsMinimized: () => undefined,
    setPictureInPicture: () => undefined,
    setLoading: () => undefined,
    setError: () => undefined,
    resetCallStore: () => undefined,
  };
  return { ...defaultState, ...overrides } as unknown as CallStore;
}

// ---------------------------------------------------------------------------
// selectActiveCall
// ---------------------------------------------------------------------------

describe("selectActiveCall", () => {
  it("returns null by default", () => {
    expect(selectActiveCall(makeState())).toBeNull();
  });

  it("returns the active call when set", () => {
    const activeCall = makeActiveCall();
    expect(selectActiveCall(makeState({ activeCall }))).toBe(activeCall);
  });
});

// ---------------------------------------------------------------------------
// selectIsInCall
// ---------------------------------------------------------------------------

describe("selectIsInCall", () => {
  it("returns false when no active call", () => {
    expect(selectIsInCall(makeState())).toBe(false);
  });

  it("returns true when active call is not ended", () => {
    const activeCall = makeActiveCall({ state: "connected" });
    expect(selectIsInCall(makeState({ activeCall }))).toBe(true);
  });

  it("returns false when active call state is ended", () => {
    const activeCall = makeActiveCall({ state: "ended" });
    expect(selectIsInCall(makeState({ activeCall }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsCallConnected
// ---------------------------------------------------------------------------

describe("selectIsCallConnected", () => {
  it("returns false when no active call", () => {
    expect(selectIsCallConnected(makeState())).toBe(false);
  });

  it("returns true when call state is connected", () => {
    const activeCall = makeActiveCall({ state: "connected" });
    expect(selectIsCallConnected(makeState({ activeCall }))).toBe(true);
  });

  it("returns false when call state is ringing", () => {
    const activeCall = makeActiveCall({ state: "ringing" });
    expect(selectIsCallConnected(makeState({ activeCall }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsCallRinging
// ---------------------------------------------------------------------------

describe("selectIsCallRinging", () => {
  it("returns false by default", () => {
    expect(selectIsCallRinging(makeState())).toBe(false);
  });

  it("returns true when active call state is ringing", () => {
    const activeCall = makeActiveCall({ state: "ringing" });
    expect(selectIsCallRinging(makeState({ activeCall }))).toBe(true);
  });

  it("returns true when there are incoming calls even without active call", () => {
    const incomingCalls = [makeIncomingCall()];
    expect(selectIsCallRinging(makeState({ incomingCalls }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCallType
// ---------------------------------------------------------------------------

describe("selectCallType", () => {
  it("returns undefined when no active call", () => {
    expect(selectCallType(makeState())).toBeUndefined();
  });

  it("returns voice when active call is a voice call", () => {
    const activeCall = makeActiveCall({ type: "voice" });
    expect(selectCallType(makeState({ activeCall }))).toBe("voice");
  });

  it("returns video when active call is a video call", () => {
    const activeCall = makeActiveCall({ type: "video" });
    expect(selectCallType(makeState({ activeCall }))).toBe("video");
  });
});

// ---------------------------------------------------------------------------
// selectCallDuration
// ---------------------------------------------------------------------------

describe("selectCallDuration", () => {
  it("returns 0 when no active call", () => {
    expect(selectCallDuration(makeState())).toBe(0);
  });

  it("returns 0 when connectedAt is null", () => {
    const activeCall = makeActiveCall({ connectedAt: null });
    expect(selectCallDuration(makeState({ activeCall }))).toBe(0);
  });

  it("returns positive duration when connectedAt is set", () => {
    // Use a time 10 seconds in the past
    const connectedAt = new Date(Date.now() - 10_000).toISOString();
    const activeCall = makeActiveCall({ connectedAt });
    const duration = selectCallDuration(makeState({ activeCall }));
    expect(duration).toBeGreaterThanOrEqual(9);
    expect(duration).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------
// selectParticipants
// ---------------------------------------------------------------------------

describe("selectParticipants", () => {
  it("returns empty array when no active call", () => {
    expect(selectParticipants(makeState())).toEqual([]);
  });

  it("returns empty array when call has no participants", () => {
    const activeCall = makeActiveCall({ participants: new Map() });
    expect(selectParticipants(makeState({ activeCall }))).toEqual([]);
  });

  it("returns array of participants from the map", () => {
    const participant = {
      id: "p1",
      name: "Alice",
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
      isSpeaking: false,
      joinedAt: "2024-01-01T00:00:00Z",
      connectionState: "connected" as const,
    };
    const participants = new Map([["p1", participant]]);
    const activeCall = makeActiveCall({ participants });
    const result = selectParticipants(makeState({ activeCall }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(participant);
  });
});

// ---------------------------------------------------------------------------
// selectParticipantCount
// ---------------------------------------------------------------------------

describe("selectParticipantCount", () => {
  it("returns 0 when no active call", () => {
    expect(selectParticipantCount(makeState())).toBe(0);
  });

  it("returns the number of participants", () => {
    const p1 = {
      id: "p1",
      name: "Alice",
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
      isSpeaking: false,
      joinedAt: "2024-01-01T00:00:00Z",
      connectionState: "connected" as const,
    };
    const p2 = { ...p1, id: "p2", name: "Bob" };
    const participants = new Map([
      ["p1", p1],
      ["p2", p2],
    ]);
    const activeCall = makeActiveCall({ participants });
    expect(selectParticipantCount(makeState({ activeCall }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectIncomingCalls
// ---------------------------------------------------------------------------

describe("selectIncomingCalls", () => {
  it("returns empty array by default", () => {
    expect(selectIncomingCalls(makeState())).toEqual([]);
  });

  it("returns the incoming calls array", () => {
    const incomingCalls = [makeIncomingCall()];
    expect(selectIncomingCalls(makeState({ incomingCalls }))).toBe(
      incomingCalls,
    );
  });
});

// ---------------------------------------------------------------------------
// selectHasIncomingCall
// ---------------------------------------------------------------------------

describe("selectHasIncomingCall", () => {
  it("returns false when no incoming calls", () => {
    expect(selectHasIncomingCall(makeState())).toBe(false);
  });

  it("returns true when there is at least one incoming call", () => {
    const incomingCalls = [makeIncomingCall()];
    expect(selectHasIncomingCall(makeState({ incomingCalls }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectCallHistory
// ---------------------------------------------------------------------------

describe("selectCallHistory", () => {
  it("returns empty array by default", () => {
    expect(selectCallHistory(makeState())).toEqual([]);
  });

  it("returns the call history array", () => {
    const callHistory = [makeHistoryEntry()];
    expect(selectCallHistory(makeState({ callHistory }))).toBe(callHistory);
  });
});

// ---------------------------------------------------------------------------
// selectRecentCalls
// ---------------------------------------------------------------------------

describe("selectRecentCalls", () => {
  it("returns empty array by default", () => {
    expect(selectRecentCalls()(makeState())).toEqual([]);
  });

  it("returns all calls when count is below limit", () => {
    const callHistory = [makeHistoryEntry(), makeHistoryEntry({ id: "h2" })];
    expect(selectRecentCalls(10)(makeState({ callHistory }))).toHaveLength(2);
  });

  it("returns only the first N calls when count exceeds limit", () => {
    const callHistory = [
      makeHistoryEntry({ id: "h1" }),
      makeHistoryEntry({ id: "h2" }),
      makeHistoryEntry({ id: "h3" }),
    ];
    const result = selectRecentCalls(2)(makeState({ callHistory }));
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("h1");
    expect(result[1].id).toBe("h2");
  });
});

// ---------------------------------------------------------------------------
// selectMissedCalls
// ---------------------------------------------------------------------------

describe("selectMissedCalls", () => {
  it("returns empty array by default", () => {
    expect(selectMissedCalls(makeState())).toEqual([]);
  });

  it("returns only missed calls", () => {
    const callHistory = [
      makeHistoryEntry({ id: "h1", missedCall: false }),
      makeHistoryEntry({ id: "h2", missedCall: true }),
      makeHistoryEntry({ id: "h3", missedCall: true }),
    ];
    const result = selectMissedCalls(makeState({ callHistory }));
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.missedCall)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMissedCallCount
// ---------------------------------------------------------------------------

describe("selectMissedCallCount", () => {
  it("returns 0 by default", () => {
    expect(selectMissedCallCount(makeState())).toBe(0);
  });

  it("returns the number of missed calls", () => {
    const callHistory = [
      makeHistoryEntry({ id: "h1", missedCall: true }),
      makeHistoryEntry({ id: "h2", missedCall: false }),
      makeHistoryEntry({ id: "h3", missedCall: true }),
    ];
    expect(selectMissedCallCount(makeState({ callHistory }))).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// selectIsLocalMuted
// ---------------------------------------------------------------------------

describe("selectIsLocalMuted", () => {
  it("returns false when no active call", () => {
    expect(selectIsLocalMuted(makeState())).toBe(false);
  });

  it("returns false when call is not muted", () => {
    const activeCall = makeActiveCall({ isLocalMuted: false });
    expect(selectIsLocalMuted(makeState({ activeCall }))).toBe(false);
  });

  it("returns true when call is locally muted", () => {
    const activeCall = makeActiveCall({ isLocalMuted: true });
    expect(selectIsLocalMuted(makeState({ activeCall }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectIsLocalVideoEnabled
// ---------------------------------------------------------------------------

describe("selectIsLocalVideoEnabled", () => {
  it("returns false when no active call", () => {
    expect(selectIsLocalVideoEnabled(makeState())).toBe(false);
  });

  it("returns true when local video is enabled", () => {
    const activeCall = makeActiveCall({ isLocalVideoEnabled: true });
    expect(selectIsLocalVideoEnabled(makeState({ activeCall }))).toBe(true);
  });

  it("returns false when local video is disabled", () => {
    const activeCall = makeActiveCall({ isLocalVideoEnabled: false });
    expect(selectIsLocalVideoEnabled(makeState({ activeCall }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsScreenSharing
// ---------------------------------------------------------------------------

describe("selectIsScreenSharing", () => {
  it("returns false when no active call", () => {
    expect(selectIsScreenSharing(makeState())).toBe(false);
  });

  it("returns true when screen sharing is active", () => {
    const activeCall = makeActiveCall({ isLocalScreenSharing: true });
    expect(selectIsScreenSharing(makeState({ activeCall }))).toBe(true);
  });

  it("returns false when not screen sharing", () => {
    const activeCall = makeActiveCall({ isLocalScreenSharing: false });
    expect(selectIsScreenSharing(makeState({ activeCall }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectLocalStream
// ---------------------------------------------------------------------------

describe("selectLocalStream", () => {
  it("returns undefined when no active call", () => {
    expect(selectLocalStream(makeState())).toBeUndefined();
  });

  it("returns undefined when localStream is not set", () => {
    const activeCall = makeActiveCall({ localStream: undefined });
    expect(selectLocalStream(makeState({ activeCall }))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectRemoteStreams
// ---------------------------------------------------------------------------

describe("selectRemoteStreams", () => {
  it("returns empty array when no active call", () => {
    expect(selectRemoteStreams(makeState())).toEqual([]);
  });

  it("returns empty array when call has no remote streams", () => {
    const activeCall = makeActiveCall({ remoteStreams: new Map() });
    expect(selectRemoteStreams(makeState({ activeCall }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectDeviceSettings
// ---------------------------------------------------------------------------

describe("selectDeviceSettings", () => {
  it("returns null device settings by default", () => {
    const result = selectDeviceSettings(makeState());
    expect(result.audioInput).toBeNull();
    expect(result.audioOutput).toBeNull();
    expect(result.videoInput).toBeNull();
  });

  it("returns the configured device ids", () => {
    const result = selectDeviceSettings(
      makeState({
        selectedAudioInputId: "mic1",
        selectedAudioOutputId: "speaker1",
        selectedVideoInputId: "cam1",
      }),
    );
    expect(result.audioInput).toBe("mic1");
    expect(result.audioOutput).toBe("speaker1");
    expect(result.videoInput).toBe("cam1");
  });
});

// ---------------------------------------------------------------------------
// selectCallSettings
// ---------------------------------------------------------------------------

describe("selectCallSettings", () => {
  it("returns default call settings", () => {
    const result = selectCallSettings(makeState());
    expect(result.ringVolume).toBe(0.8);
    expect(result.autoAcceptCalls).toBe(false);
    expect(result.showCallNotifications).toBe(true);
  });

  it("returns updated call settings", () => {
    const result = selectCallSettings(
      makeState({
        ringVolume: 0.5,
        autoAcceptCalls: true,
        showCallNotifications: false,
      }),
    );
    expect(result.ringVolume).toBe(0.5);
    expect(result.autoAcceptCalls).toBe(true);
    expect(result.showCallNotifications).toBe(false);
  });
});
