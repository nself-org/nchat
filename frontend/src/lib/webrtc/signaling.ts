/**
 * WebRTC Signaling via Socket.io
 *
 * Handles offer/answer exchange, ICE candidate relay,
 * and call state events for WebRTC peer connections.
 */

import { socketManager, SOCKET_EVENTS, type SocketEvent } from "@/lib/realtime";

// =============================================================================
// Call Socket Events
// =============================================================================

export const CALL_EVENTS = {
  // Call lifecycle
  CALL_INITIATE: "call:initiate",
  CALL_RING: "call:ring",
  CALL_ACCEPT: "call:accept",
  CALL_DECLINE: "call:decline",
  CALL_END: "call:end",
  CALL_BUSY: "call:busy",
  CALL_TIMEOUT: "call:timeout",
  CALL_CANCELLED: "call:cancelled",

  // WebRTC signaling
  CALL_OFFER: "call:offer",
  CALL_ANSWER: "call:answer",
  CALL_ICE_CANDIDATE: "call:ice-candidate",
  CALL_RENEGOTIATE: "call:renegotiate",

  // Call state updates
  CALL_PARTICIPANT_JOINED: "call:participant:joined",
  CALL_PARTICIPANT_LEFT: "call:participant:left",
  CALL_MUTE_CHANGED: "call:mute:changed",
  CALL_VIDEO_CHANGED: "call:video:changed",
  CALL_SCREEN_SHARE_STARTED: "call:screen-share:started",
  CALL_SCREEN_SHARE_STOPPED: "call:screen-share:stopped",

  // Errors
  CALL_ERROR: "call:error",
} as const;

export type CallEvent = (typeof CALL_EVENTS)[keyof typeof CALL_EVENTS];

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
  | "error"
  | "missed"
  | "network";

export interface CallParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export interface CallInitiatePayload {
  callId: string;
  targetUserId: string;
  callType: CallType;
  channelId?: string;
  metadata?: Record<string, unknown>;
}

export interface CallRingPayload {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatarUrl?: string;
  callType: CallType;
  channelId?: string;
}

export interface CallAcceptPayload {
  callId: string;
  userId: string;
}

export interface CallDeclinePayload {
  callId: string;
  userId: string;
  reason?: string;
}

export interface CallEndPayload {
  callId: string;
  endedBy: string;
  reason: CallEndReason;
  duration?: number;
}

export interface CallOfferPayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface CallAnswerPayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  sdp: RTCSessionDescriptionInit;
}

export interface CallIceCandidatePayload {
  callId: string;
  fromUserId: string;
  toUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface CallParticipantPayload {
  callId: string;
  participant: CallParticipant;
}

export interface CallMediaChangePayload {
  callId: string;
  userId: string;
  enabled: boolean;
}

export interface CallErrorPayload {
  callId: string;
  code: string;
  message: string;
}

export interface SignalingCallbacks {
  onCallRing?: (payload: CallRingPayload) => void;
  onCallAccepted?: (payload: CallAcceptPayload) => void;
  onCallDeclined?: (payload: CallDeclinePayload) => void;
  onCallEnded?: (payload: CallEndPayload) => void;
  onCallBusy?: (payload: { callId: string; userId: string }) => void;
  onCallTimeout?: (payload: { callId: string }) => void;
  onCallCancelled?: (payload: { callId: string; cancelledBy: string }) => void;
  onOffer?: (payload: CallOfferPayload) => void;
  onAnswer?: (payload: CallAnswerPayload) => void;
  onIceCandidate?: (payload: CallIceCandidatePayload) => void;
  onRenegotiate?: (payload: CallOfferPayload) => void;
  onParticipantJoined?: (payload: CallParticipantPayload) => void;
  onParticipantLeft?: (payload: CallParticipantPayload) => void;
  onMuteChanged?: (payload: CallMediaChangePayload) => void;
  onVideoChanged?: (payload: CallMediaChangePayload) => void;
  onScreenShareStarted?: (payload: { callId: string; userId: string }) => void;
  onScreenShareStopped?: (payload: { callId: string; userId: string }) => void;
  onError?: (payload: CallErrorPayload) => void;
}

// =============================================================================
// Signaling Manager Class
// =============================================================================

export class SignalingManager {
  private callbacks: SignalingCallbacks;
  private listeners: Map<string, () => void> = new Map();
  private _isConnected: boolean = false;
  private _currentCallId: string | null = null;

  constructor(callbacks: SignalingCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get isConnected(): boolean {
    return this._isConnected && socketManager.isConnected;
  }

  get currentCallId(): string | null {
    return this._currentCallId;
  }

  // ===========================================================================
  // Connection
  // ===========================================================================

  connect(): void {
    if (this._isConnected) return;

    this.setupEventListeners();
    this._isConnected = true;
  }

  disconnect(): void {
    this.removeEventListeners();
    this._isConnected = false;
    this._currentCallId = null;
  }

  // ===========================================================================
  // Event Listeners
  // ===========================================================================

  private setupEventListeners(): void {
    this.addListener(CALL_EVENTS.CALL_RING, (payload: CallRingPayload) => {
      this.callbacks.onCallRing?.(payload);
    });

    this.addListener(CALL_EVENTS.CALL_ACCEPT, (payload: CallAcceptPayload) => {
      this.callbacks.onCallAccepted?.(payload);
    });

    this.addListener(
      CALL_EVENTS.CALL_DECLINE,
      (payload: CallDeclinePayload) => {
        this.callbacks.onCallDeclined?.(payload);
      },
    );

    this.addListener(CALL_EVENTS.CALL_END, (payload: CallEndPayload) => {
      if (payload.callId === this._currentCallId) {
        this._currentCallId = null;
      }
      this.callbacks.onCallEnded?.(payload);
    });

    this.addListener(
      CALL_EVENTS.CALL_BUSY,
      (payload: { callId: string; userId: string }) => {
        this.callbacks.onCallBusy?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_TIMEOUT,
      (payload: { callId: string }) => {
        this.callbacks.onCallTimeout?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_CANCELLED,
      (payload: { callId: string; cancelledBy: string }) => {
        this.callbacks.onCallCancelled?.(payload);
      },
    );

    this.addListener(CALL_EVENTS.CALL_OFFER, (payload: CallOfferPayload) => {
      this.callbacks.onOffer?.(payload);
    });

    this.addListener(CALL_EVENTS.CALL_ANSWER, (payload: CallAnswerPayload) => {
      this.callbacks.onAnswer?.(payload);
    });

    this.addListener(
      CALL_EVENTS.CALL_ICE_CANDIDATE,
      (payload: CallIceCandidatePayload) => {
        this.callbacks.onIceCandidate?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_RENEGOTIATE,
      (payload: CallOfferPayload) => {
        this.callbacks.onRenegotiate?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_PARTICIPANT_JOINED,
      (payload: CallParticipantPayload) => {
        this.callbacks.onParticipantJoined?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_PARTICIPANT_LEFT,
      (payload: CallParticipantPayload) => {
        this.callbacks.onParticipantLeft?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_MUTE_CHANGED,
      (payload: CallMediaChangePayload) => {
        this.callbacks.onMuteChanged?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_VIDEO_CHANGED,
      (payload: CallMediaChangePayload) => {
        this.callbacks.onVideoChanged?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_SCREEN_SHARE_STARTED,
      (payload: { callId: string; userId: string }) => {
        this.callbacks.onScreenShareStarted?.(payload);
      },
    );

    this.addListener(
      CALL_EVENTS.CALL_SCREEN_SHARE_STOPPED,
      (payload: { callId: string; userId: string }) => {
        this.callbacks.onScreenShareStopped?.(payload);
      },
    );

    this.addListener(CALL_EVENTS.CALL_ERROR, (payload: CallErrorPayload) => {
      this.callbacks.onError?.(payload);
    });
  }

  private addListener<T>(event: string, handler: (data: T) => void): void {
    const cleanup = socketManager.on(event as SocketEvent, handler);
    this.listeners.set(event, cleanup);
  }

  private removeEventListeners(): void {
    this.listeners.forEach((cleanup) => cleanup());
    this.listeners.clear();
  }

  // ===========================================================================
  // Call Initiation
  // ===========================================================================

  initiateCall(payload: CallInitiatePayload): void {
    this._currentCallId = payload.callId;
    socketManager.emit(CALL_EVENTS.CALL_INITIATE as SocketEvent, payload);
  }

  acceptCall(callId: string, userId: string): void {
    this._currentCallId = callId;
    socketManager.emit(CALL_EVENTS.CALL_ACCEPT as SocketEvent, {
      callId,
      userId,
    });
  }

  declineCall(callId: string, userId: string, reason?: string): void {
    socketManager.emit(CALL_EVENTS.CALL_DECLINE as SocketEvent, {
      callId,
      userId,
      reason,
    });
  }

  endCall(
    callId: string,
    endedBy: string,
    reason: CallEndReason,
    duration?: number,
  ): void {
    socketManager.emit(CALL_EVENTS.CALL_END as SocketEvent, {
      callId,
      endedBy,
      reason,
      duration,
    });
    if (this._currentCallId === callId) {
      this._currentCallId = null;
    }
  }

  cancelCall(callId: string, cancelledBy: string): void {
    socketManager.emit(CALL_EVENTS.CALL_CANCELLED as SocketEvent, {
      callId,
      cancelledBy,
    });
    if (this._currentCallId === callId) {
      this._currentCallId = null;
    }
  }

  reportBusy(callId: string, userId: string): void {
    socketManager.emit(CALL_EVENTS.CALL_BUSY as SocketEvent, {
      callId,
      userId,
    });
  }

  // ===========================================================================
  // WebRTC Signaling
  // ===========================================================================

  sendOffer(payload: CallOfferPayload): void {
    socketManager.emit(CALL_EVENTS.CALL_OFFER as SocketEvent, payload);
  }

  sendAnswer(payload: CallAnswerPayload): void {
    socketManager.emit(CALL_EVENTS.CALL_ANSWER as SocketEvent, payload);
  }

  sendIceCandidate(payload: CallIceCandidatePayload): void {
    socketManager.emit(CALL_EVENTS.CALL_ICE_CANDIDATE as SocketEvent, payload);
  }

  requestRenegotiation(payload: CallOfferPayload): void {
    socketManager.emit(CALL_EVENTS.CALL_RENEGOTIATE as SocketEvent, payload);
  }

  // ===========================================================================
  // Media State Updates
  // ===========================================================================

  notifyMuteChange(callId: string, userId: string, isMuted: boolean): void {
    socketManager.emit(CALL_EVENTS.CALL_MUTE_CHANGED as SocketEvent, {
      callId,
      userId,
      enabled: !isMuted,
    });
  }

  notifyVideoChange(callId: string, userId: string, isEnabled: boolean): void {
    socketManager.emit(CALL_EVENTS.CALL_VIDEO_CHANGED as SocketEvent, {
      callId,
      userId,
      enabled: isEnabled,
    });
  }

  notifyScreenShareStarted(callId: string, userId: string): void {
    socketManager.emit(CALL_EVENTS.CALL_SCREEN_SHARE_STARTED as SocketEvent, {
      callId,
      userId,
    });
  }

  notifyScreenShareStopped(callId: string, userId: string): void {
    socketManager.emit(CALL_EVENTS.CALL_SCREEN_SHARE_STOPPED as SocketEvent, {
      callId,
      userId,
    });
  }

  // ===========================================================================
  // Callbacks Update
  // ===========================================================================

  updateCallbacks(callbacks: Partial<SignalingCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // ===========================================================================
  // Utility
  // ===========================================================================

  generateCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createSignalingManager(
  callbacks?: SignalingCallbacks,
): SignalingManager {
  return new SignalingManager(callbacks);
}

// =============================================================================
// Standalone Functions
// =============================================================================

export function generateCallId(): string {
  return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isValidCallId(callId: string): boolean {
  return /^call-\d+-[a-z0-9]{9}$/.test(callId);
}

export function parseCallDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function formatCallDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
