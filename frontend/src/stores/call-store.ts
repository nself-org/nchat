/**
 * Call Store - Manages call state for voice and video calls
 *
 * Handles active calls, participants, call history,
 * and audio/video states using Zustand.
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// =============================================================================
// Types
// =============================================================================

export type CallType = "voice" | "video";

export type CallState =
  | "idle"
  | "initiating"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "ended";

export type CallEndReason =
  | "completed"
  | "declined"
  | "busy"
  | "timeout"
  | "cancelled"
  | "failed"
  | "no_answer"
  | "network_error";

export type CallDirection = "outgoing" | "incoming";

export interface CallParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  joinedAt: string;
  connectionState: "connecting" | "connected" | "disconnected";
}

export interface ActiveCall {
  id: string;
  type: CallType;
  state: CallState;
  direction: CallDirection;
  channelId?: string;
  initiatorId: string;
  participants: Map<string, CallParticipant>;
  startedAt: string | null;
  connectedAt: string | null;
  endedAt: string | null;
  endReason?: CallEndReason;
  localStream?: MediaStream;
  remoteStreams: Map<string, MediaStream>;
  isLocalMuted: boolean;
  isLocalVideoEnabled: boolean;
  isLocalScreenSharing: boolean;
  metadata?: Record<string, unknown>;
}

export interface IncomingCall {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string;
  type: CallType;
  channelId?: string;
  receivedAt: string;
}

export interface CallHistoryEntry {
  id: string;
  type: CallType;
  direction: CallDirection;
  participantIds: string[];
  participantNames: string[];
  channelId?: string;
  startedAt: string;
  endedAt: string;
  duration: number;
  endReason: CallEndReason;
  missedCall: boolean;
}

export interface CallStoreState {
  // Active Call
  activeCall: ActiveCall | null;

  // Incoming Calls Queue
  incomingCalls: IncomingCall[];

  // Call History
  callHistory: CallHistoryEntry[];
  historyLoading: boolean;

  // Device States
  selectedAudioInputId: string | null;
  selectedAudioOutputId: string | null;
  selectedVideoInputId: string | null;

  // Settings
  ringVolume: number;
  autoAcceptCalls: boolean;
  showCallNotifications: boolean;

  // UI States
  isCallControlsMinimized: boolean;
  isPictureInPicture: boolean;

  // Loading/Error
  isLoading: boolean;
  error: string | null;
}

export interface CallStoreActions {
  // Active Call Actions
  initiateCall: (
    callId: string,
    targetUserId: string,
    targetUserName: string,
    type: CallType,
    channelId?: string,
  ) => void;
  receiveIncomingCall: (call: IncomingCall) => void;
  acceptCall: (callId: string) => void;
  declineCall: (callId: string, reason?: string) => void;
  endCall: (reason?: CallEndReason) => void;
  cancelCall: () => void;

  // Call State Updates
  setCallState: (state: CallState) => void;
  setCallConnected: () => void;
  setCallReconnecting: () => void;

  // Participant Management
  addParticipant: (participant: CallParticipant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (
    participantId: string,
    updates: Partial<CallParticipant>,
  ) => void;
  setParticipantSpeaking: (participantId: string, isSpeaking: boolean) => void;

  // Local Media State
  setLocalMuted: (muted: boolean) => void;
  toggleLocalMute: () => void;
  setLocalVideoEnabled: (enabled: boolean) => void;
  toggleLocalVideo: () => void;
  setLocalScreenSharing: (sharing: boolean) => void;

  // Streams
  setLocalStream: (stream: MediaStream | undefined) => void;
  addRemoteStream: (participantId: string, stream: MediaStream) => void;
  removeRemoteStream: (participantId: string) => void;
  clearStreams: () => void;

  // Incoming Calls
  removeIncomingCall: (callId: string) => void;
  clearIncomingCalls: () => void;

  // Call History
  addToHistory: (entry: CallHistoryEntry) => void;
  clearHistory: () => void;
  setHistoryLoading: (loading: boolean) => void;
  loadHistory: (entries: CallHistoryEntry[]) => void;

  // Device Selection
  setSelectedAudioInput: (deviceId: string | null) => void;
  setSelectedAudioOutput: (deviceId: string | null) => void;
  setSelectedVideoInput: (deviceId: string | null) => void;

  // Settings
  setRingVolume: (volume: number) => void;
  setAutoAcceptCalls: (accept: boolean) => void;
  setShowCallNotifications: (show: boolean) => void;

  // UI States
  setCallControlsMinimized: (minimized: boolean) => void;
  setPictureInPicture: (pip: boolean) => void;

  // Loading/Error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  resetCallStore: () => void;
}

export type CallStore = CallStoreState & CallStoreActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: CallStoreState = {
  activeCall: null,
  incomingCalls: [],
  callHistory: [],
  historyLoading: false,
  selectedAudioInputId: null,
  selectedAudioOutputId: null,
  selectedVideoInputId: null,
  ringVolume: 80,
  autoAcceptCalls: false,
  showCallNotifications: true,
  isCallControlsMinimized: false,
  isPictureInPicture: false,
  isLoading: false,
  error: null,
};

// =============================================================================
// Store
// =============================================================================

export const useCallStore = create<CallStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Active Call Actions
        initiateCall: (callId, targetUserId, targetUserName, type, channelId) =>
          set(
            (state) => {
              const now = new Date().toISOString();
              const participant: CallParticipant = {
                id: targetUserId,
                name: targetUserName,
                isMuted: false,
                isVideoEnabled: type === "video",
                isScreenSharing: false,
                isSpeaking: false,
                joinedAt: now,
                connectionState: "connecting",
              };

              state.activeCall = {
                id: callId,
                type,
                state: "initiating",
                direction: "outgoing",
                channelId,
                initiatorId: "", // Will be set by caller
                participants: new Map([[targetUserId, participant]]),
                startedAt: now,
                connectedAt: null,
                endedAt: null,
                remoteStreams: new Map(),
                isLocalMuted: false,
                isLocalVideoEnabled: type === "video",
                isLocalScreenSharing: false,
              };
            },
            false,
            "call/initiateCall",
          ),

        receiveIncomingCall: (call) =>
          set(
            (state) => {
              // Don't add duplicate incoming calls
              if (!state.incomingCalls.find((c) => c.id === call.id)) {
                state.incomingCalls.push(call);
              }
            },
            false,
            "call/receiveIncomingCall",
          ),

        acceptCall: (callId) =>
          set(
            (state) => {
              const incomingCall = state.incomingCalls.find(
                (c) => c.id === callId,
              );
              if (!incomingCall) return;

              const now = new Date().toISOString();
              const participant: CallParticipant = {
                id: incomingCall.callerId,
                name: incomingCall.callerName,
                avatarUrl: incomingCall.callerAvatarUrl,
                isMuted: false,
                isVideoEnabled: incomingCall.type === "video",
                isScreenSharing: false,
                isSpeaking: false,
                joinedAt: now,
                connectionState: "connecting",
              };

              state.activeCall = {
                id: callId,
                type: incomingCall.type,
                state: "connecting",
                direction: "incoming",
                channelId: incomingCall.channelId,
                initiatorId: incomingCall.callerId,
                participants: new Map([[incomingCall.callerId, participant]]),
                startedAt: incomingCall.receivedAt,
                connectedAt: null,
                endedAt: null,
                remoteStreams: new Map(),
                isLocalMuted: false,
                isLocalVideoEnabled: incomingCall.type === "video",
                isLocalScreenSharing: false,
              };

              // Remove from incoming calls
              state.incomingCalls = state.incomingCalls.filter(
                (c) => c.id !== callId,
              );
            },
            false,
            "call/acceptCall",
          ),

        declineCall: (callId) =>
          set(
            (state) => {
              state.incomingCalls = state.incomingCalls.filter(
                (c) => c.id !== callId,
              );
            },
            false,
            "call/declineCall",
          ),

        endCall: (reason = "completed") =>
          set(
            (state) => {
              if (!state.activeCall) return;

              const call = state.activeCall;
              const endedAt = new Date().toISOString();
              const startTime = call.connectedAt || call.startedAt;
              const duration = startTime
                ? Math.floor(
                    (new Date(endedAt).getTime() -
                      new Date(startTime).getTime()) /
                      1000,
                  )
                : 0;

              // Add to history
              const historyEntry: CallHistoryEntry = {
                id: call.id,
                type: call.type,
                direction: call.direction,
                participantIds: Array.from(call.participants.keys()),
                participantNames: Array.from(call.participants.values()).map(
                  (p) => p.name,
                ),
                channelId: call.channelId,
                startedAt: call.startedAt || endedAt,
                endedAt,
                duration,
                endReason: reason,
                missedCall:
                  call.state === "ringing" && call.direction === "incoming",
              };
              state.callHistory.unshift(historyEntry);

              // Clear active call
              state.activeCall = null;
            },
            false,
            "call/endCall",
          ),

        cancelCall: () =>
          set(
            (state) => {
              if (!state.activeCall) return;

              const call = state.activeCall;
              const endedAt = new Date().toISOString();

              // Add to history as cancelled
              const historyEntry: CallHistoryEntry = {
                id: call.id,
                type: call.type,
                direction: call.direction,
                participantIds: Array.from(call.participants.keys()),
                participantNames: Array.from(call.participants.values()).map(
                  (p) => p.name,
                ),
                channelId: call.channelId,
                startedAt: call.startedAt || endedAt,
                endedAt,
                duration: 0,
                endReason: "cancelled",
                missedCall: false,
              };
              state.callHistory.unshift(historyEntry);

              state.activeCall = null;
            },
            false,
            "call/cancelCall",
          ),

        // Call State Updates
        setCallState: (callState) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.state = callState;
              }
            },
            false,
            "call/setCallState",
          ),

        setCallConnected: () =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.state = "connected";
                state.activeCall.connectedAt = new Date().toISOString();
              }
            },
            false,
            "call/setCallConnected",
          ),

        setCallReconnecting: () =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.state = "reconnecting";
              }
            },
            false,
            "call/setCallReconnecting",
          ),

        // Participant Management
        addParticipant: (participant) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.participants.set(participant.id, participant);
              }
            },
            false,
            "call/addParticipant",
          ),

        removeParticipant: (participantId) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.participants.delete(participantId);
                state.activeCall.remoteStreams.delete(participantId);
              }
            },
            false,
            "call/removeParticipant",
          ),

        updateParticipant: (participantId, updates) =>
          set(
            (state) => {
              if (state.activeCall) {
                const participant =
                  state.activeCall.participants.get(participantId);
                if (participant) {
                  state.activeCall.participants.set(participantId, {
                    ...participant,
                    ...updates,
                  });
                }
              }
            },
            false,
            "call/updateParticipant",
          ),

        setParticipantSpeaking: (participantId, isSpeaking) =>
          set(
            (state) => {
              if (state.activeCall) {
                const participant =
                  state.activeCall.participants.get(participantId);
                if (participant) {
                  participant.isSpeaking = isSpeaking;
                }
              }
            },
            false,
            "call/setParticipantSpeaking",
          ),

        // Local Media State
        setLocalMuted: (muted) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.isLocalMuted = muted;
              }
            },
            false,
            "call/setLocalMuted",
          ),

        toggleLocalMute: () =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.isLocalMuted = !state.activeCall.isLocalMuted;
              }
            },
            false,
            "call/toggleLocalMute",
          ),

        setLocalVideoEnabled: (enabled) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.isLocalVideoEnabled = enabled;
              }
            },
            false,
            "call/setLocalVideoEnabled",
          ),

        toggleLocalVideo: () =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.isLocalVideoEnabled =
                  !state.activeCall.isLocalVideoEnabled;
              }
            },
            false,
            "call/toggleLocalVideo",
          ),

        setLocalScreenSharing: (sharing) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.isLocalScreenSharing = sharing;
              }
            },
            false,
            "call/setLocalScreenSharing",
          ),

        // Streams
        setLocalStream: (stream) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.localStream = stream;
              }
            },
            false,
            "call/setLocalStream",
          ),

        addRemoteStream: (participantId, stream) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.remoteStreams.set(participantId, stream);
              }
            },
            false,
            "call/addRemoteStream",
          ),

        removeRemoteStream: (participantId) =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.remoteStreams.delete(participantId);
              }
            },
            false,
            "call/removeRemoteStream",
          ),

        clearStreams: () =>
          set(
            (state) => {
              if (state.activeCall) {
                state.activeCall.localStream = undefined;
                state.activeCall.remoteStreams.clear();
              }
            },
            false,
            "call/clearStreams",
          ),

        // Incoming Calls
        removeIncomingCall: (callId) =>
          set(
            (state) => {
              state.incomingCalls = state.incomingCalls.filter(
                (c) => c.id !== callId,
              );
            },
            false,
            "call/removeIncomingCall",
          ),

        clearIncomingCalls: () =>
          set(
            (state) => {
              state.incomingCalls = [];
            },
            false,
            "call/clearIncomingCalls",
          ),

        // Call History
        addToHistory: (entry) =>
          set(
            (state) => {
              state.callHistory.unshift(entry);
            },
            false,
            "call/addToHistory",
          ),

        clearHistory: () =>
          set(
            (state) => {
              state.callHistory = [];
            },
            false,
            "call/clearHistory",
          ),

        setHistoryLoading: (loading) =>
          set(
            (state) => {
              state.historyLoading = loading;
            },
            false,
            "call/setHistoryLoading",
          ),

        loadHistory: (entries) =>
          set(
            (state) => {
              state.callHistory = entries;
            },
            false,
            "call/loadHistory",
          ),

        // Device Selection
        setSelectedAudioInput: (deviceId) =>
          set(
            (state) => {
              state.selectedAudioInputId = deviceId;
            },
            false,
            "call/setSelectedAudioInput",
          ),

        setSelectedAudioOutput: (deviceId) =>
          set(
            (state) => {
              state.selectedAudioOutputId = deviceId;
            },
            false,
            "call/setSelectedAudioOutput",
          ),

        setSelectedVideoInput: (deviceId) =>
          set(
            (state) => {
              state.selectedVideoInputId = deviceId;
            },
            false,
            "call/setSelectedVideoInput",
          ),

        // Settings
        setRingVolume: (volume) =>
          set(
            (state) => {
              state.ringVolume = Math.max(0, Math.min(100, volume));
            },
            false,
            "call/setRingVolume",
          ),

        setAutoAcceptCalls: (accept) =>
          set(
            (state) => {
              state.autoAcceptCalls = accept;
            },
            false,
            "call/setAutoAcceptCalls",
          ),

        setShowCallNotifications: (show) =>
          set(
            (state) => {
              state.showCallNotifications = show;
            },
            false,
            "call/setShowCallNotifications",
          ),

        // UI States
        setCallControlsMinimized: (minimized) =>
          set(
            (state) => {
              state.isCallControlsMinimized = minimized;
            },
            false,
            "call/setCallControlsMinimized",
          ),

        setPictureInPicture: (pip) =>
          set(
            (state) => {
              state.isPictureInPicture = pip;
            },
            false,
            "call/setPictureInPicture",
          ),

        // Loading/Error
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "call/setLoading",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "call/setError",
          ),

        // Reset
        resetCallStore: () =>
          set(
            () => ({
              ...initialState,
            }),
            false,
            "call/resetCallStore",
          ),
      })),
    ),
    { name: "call-store" },
  ),
);

// =============================================================================
// Selectors
// =============================================================================

export const selectActiveCall = (state: CallStore) => state.activeCall;

export const selectIsInCall = (state: CallStore) =>
  state.activeCall !== null && state.activeCall.state !== "ended";

export const selectIsCallConnected = (state: CallStore) =>
  state.activeCall?.state === "connected";

export const selectIsCallRinging = (state: CallStore) =>
  state.activeCall?.state === "ringing" || state.incomingCalls.length > 0;

export const selectCallType = (state: CallStore) => state.activeCall?.type;

export const selectCallDuration = (state: CallStore): number => {
  const call = state.activeCall;
  if (!call?.connectedAt) return 0;

  const start = new Date(call.connectedAt).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
};

export const selectParticipants = (state: CallStore): CallParticipant[] =>
  state.activeCall ? Array.from(state.activeCall.participants.values()) : [];

export const selectParticipantCount = (state: CallStore): number =>
  state.activeCall?.participants.size ?? 0;

export const selectIncomingCalls = (state: CallStore) => state.incomingCalls;

export const selectHasIncomingCall = (state: CallStore) =>
  state.incomingCalls.length > 0;

export const selectCallHistory = (state: CallStore) => state.callHistory;

export const selectRecentCalls =
  (limit: number = 10) =>
  (state: CallStore) =>
    state.callHistory.slice(0, limit);

export const selectMissedCalls = (state: CallStore) =>
  state.callHistory.filter((c) => c.missedCall);

export const selectMissedCallCount = (state: CallStore) =>
  state.callHistory.filter((c) => c.missedCall).length;

export const selectIsLocalMuted = (state: CallStore) =>
  state.activeCall?.isLocalMuted ?? false;

export const selectIsLocalVideoEnabled = (state: CallStore) =>
  state.activeCall?.isLocalVideoEnabled ?? false;

export const selectIsScreenSharing = (state: CallStore) =>
  state.activeCall?.isLocalScreenSharing ?? false;

export const selectLocalStream = (state: CallStore) =>
  state.activeCall?.localStream;

export const selectRemoteStreams = (state: CallStore): MediaStream[] =>
  state.activeCall ? Array.from(state.activeCall.remoteStreams.values()) : [];

export const selectDeviceSettings = (state: CallStore) => ({
  audioInput: state.selectedAudioInputId,
  audioOutput: state.selectedAudioOutputId,
  videoInput: state.selectedVideoInputId,
});

export const selectCallSettings = (state: CallStore) => ({
  ringVolume: state.ringVolume,
  autoAcceptCalls: state.autoAcceptCalls,
  showCallNotifications: state.showCallNotifications,
});
