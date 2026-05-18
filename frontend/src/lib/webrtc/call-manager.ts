/**
 * Call Manager
 *
 * Complete call lifecycle management coordinating WebRTC peer connections,
 * media streams, signaling, and state transitions.
 */

import { EventEmitter } from "events";
import { PeerConnectionManager } from "./peer-connection";
import { MediaManager } from "./media-manager";
import { SignalingManager, type CallType } from "./signaling";
import {
  CallStateMachine,
  type CallState,
  type CallEndReason,
} from "../calls/call-state-machine";
import { CallInvitationManager } from "../calls/call-invitation";
import { getIceServers } from "./servers";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface CallManagerConfig {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  iceServers?: RTCIceServer[];
  ringToneUrl?: string;
  ringVolume?: number;
  ringTimeout?: number;
  onStateChange?: (state: CallState) => void;
  onError?: (error: Error) => void;
}

export interface CallInfo {
  callId: string;
  type: CallType;
  state: CallState;
  targetUserId: string;
  targetUserName: string;
  targetUserAvatarUrl?: string;
  isInitiator: boolean;
  startTime?: Date;
  endTime?: Date;
  endReason?: CallEndReason;
}

export interface CallManagerCallbacks {
  onIncomingCall?: (callInfo: CallInfo) => void;
  onCallAccepted?: (callInfo: CallInfo) => void;
  onCallDeclined?: (callInfo: CallInfo) => void;
  onCallEnded?: (callInfo: CallInfo) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onStateChange?: (state: CallState) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// Call Manager Class
// =============================================================================

type ResolvedCallManagerConfig = Required<
  Pick<
    CallManagerConfig,
    | "userId"
    | "userName"
    | "iceServers"
    | "ringToneUrl"
    | "ringVolume"
    | "ringTimeout"
  >
> &
  Pick<CallManagerConfig, "userAvatarUrl" | "onStateChange" | "onError">;

export class CallManager extends EventEmitter {
  private config: ResolvedCallManagerConfig;
  private callbacks: CallManagerCallbacks;

  // Core managers
  private peerConnection: PeerConnectionManager | null = null;
  private mediaManager: MediaManager | null = null;
  private signaling: SignalingManager | null = null;
  private stateMachine: CallStateMachine | null = null;
  private invitationManager: CallInvitationManager | null = null;

  // Current call
  private currentCall: CallInfo | null = null;
  private callStartTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config: CallManagerConfig, callbacks: CallManagerCallbacks = {}) {
    super();

    this.config = {
      userId: config.userId,
      userName: config.userName,
      userAvatarUrl: config.userAvatarUrl,
      iceServers: config.iceServers || getIceServers(),
      ringToneUrl: config.ringToneUrl || "/sounds/ringtone.mp3",
      ringVolume: config.ringVolume ?? 0.8,
      ringTimeout: config.ringTimeout ?? 30000,
      onStateChange: config.onStateChange,
      onError: config.onError,
    };

    this.callbacks = callbacks;
    this.initialize();
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  private initialize(): void {
    // Initialize signaling
    this.signaling = new SignalingManager({
      onCallRing: this.handleCallRing.bind(this),
      onCallAccepted: this.handleCallAccepted.bind(this),
      onCallDeclined: this.handleCallDeclined.bind(this),
      onCallEnded: this.handleCallEnded.bind(this),
      onOffer: this.handleOffer.bind(this),
      onAnswer: this.handleAnswer.bind(this),
      onIceCandidate: this.handleIceCandidate.bind(this),
      onRenegotiate: this.handleRenegotiate.bind(this),
      onError: this.handleSignalingError.bind(this),
    });

    // Initialize media manager
    this.mediaManager = new MediaManager({
      onStreamError: this.handleMediaError.bind(this),
      onTrackEnded: this.handleTrackEnded.bind(this),
    });

    // Initialize invitation manager
    this.invitationManager = new CallInvitationManager({
      ringToneUrl: this.config.ringToneUrl,
      ringVolume: this.config.ringVolume,
      timeout: this.config.ringTimeout,
      onInvitation: this.handleIncomingInvitation.bind(this),
      onTimeout: this.handleInvitationTimeout.bind(this),
      onAccepted: this.handleInvitationAccepted.bind(this),
      onDeclined: this.handleInvitationDeclined.bind(this),
    });

    // Initialize state machine
    this.stateMachine = new CallStateMachine({
      initialState: "idle",
      onTransition: this.handleStateTransition.bind(this),
    });

    // Connect signaling
    this.signaling.connect();

    // Start device listener
    this.mediaManager.startDeviceChangeListener();
  }

  // ===========================================================================
  // Outgoing Call
  // ===========================================================================

  async initiateCall(
    targetUserId: string,
    targetUserName: string,
    callType: CallType,
    options?: {
      targetUserAvatarUrl?: string;
      channelId?: string;
    },
  ): Promise<string> {
    if (this.currentCall) {
      throw new Error("Already in a call");
    }

    try {
      const callId = this.signaling!.generateCallId();

      // Create call info
      this.currentCall = {
        callId,
        type: callType,
        state: "initiating",
        targetUserId,
        targetUserName,
        targetUserAvatarUrl: options?.targetUserAvatarUrl,
        isInitiator: true,
      };

      // Transition state
      this.stateMachine!.transition("initiating", "User initiated call");

      // Get user media
      const stream =
        callType === "video"
          ? await this.mediaManager!.getVideoStream()
          : await this.mediaManager!.getAudioOnlyStream();

      this.emit("local-stream", stream);
      this.callbacks.onLocalStream?.(stream);

      // Create peer connection
      this.peerConnection = new PeerConnectionManager(
        {
          iceServers: this.config.iceServers,
        },
        {
          onIceCandidate: this.handleLocalIceCandidate.bind(this),
          onConnectionStateChange: this.handleConnectionStateChange.bind(this),
          onTrack: this.handleRemoteTrack.bind(this),
        },
      );

      this.peerConnection.create();

      // Add local tracks
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await this.peerConnection.createOffer();

      // Send signaling
      this.signaling!.initiateCall({
        callId,
        targetUserId,
        callType,
        channelId: options?.channelId,
      });

      this.signaling!.sendOffer({
        callId,
        fromUserId: this.config.userId,
        toUserId: targetUserId,
        sdp: offer,
      });

      // Transition to ringing
      this.stateMachine!.transition("ringing", "Waiting for answer");
      this.currentCall.state = "ringing";

      return callId;
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  // ===========================================================================
  // Incoming Call
  // ===========================================================================

  private handleIncomingInvitation(invitation: any): void {
    if (this.currentCall) {
      // Already in a call, send busy signal
      this.signaling!.reportBusy(invitation.id, this.config.userId);
      return;
    }

    const callInfo: CallInfo = {
      callId: invitation.id,
      type: invitation.type,
      state: "ringing",
      targetUserId: invitation.callerId,
      targetUserName: invitation.callerName,
      targetUserAvatarUrl: invitation.callerAvatarUrl,
      isInitiator: false,
    };

    this.emit("incoming-call", callInfo);
    this.callbacks.onIncomingCall?.(callInfo);
  }

  async acceptCall(callId: string, withVideo: boolean = false): Promise<void> {
    const invitation = this.invitationManager!.getInvitation(callId);
    if (!invitation) {
      throw new Error("Call not found");
    }

    try {
      // Accept invitation (stops ringing)
      this.invitationManager!.acceptInvitation(callId);

      // Create call info
      this.currentCall = {
        callId,
        type: withVideo ? "video" : invitation.type,
        state: "connecting",
        targetUserId: invitation.callerId,
        targetUserName: invitation.callerName,
        targetUserAvatarUrl: invitation.callerAvatarUrl,
        isInitiator: false,
      };

      // Transition state
      this.stateMachine!.transition("connecting", "User accepted call");

      // Get user media
      const stream = withVideo
        ? await this.mediaManager!.getVideoStream()
        : await this.mediaManager!.getAudioOnlyStream();

      this.emit("local-stream", stream);
      this.callbacks.onLocalStream?.(stream);

      // Create peer connection
      this.peerConnection = new PeerConnectionManager(
        {
          iceServers: this.config.iceServers,
        },
        {
          onIceCandidate: this.handleLocalIceCandidate.bind(this),
          onConnectionStateChange: this.handleConnectionStateChange.bind(this),
          onTrack: this.handleRemoteTrack.bind(this),
        },
      );

      this.peerConnection.create();

      // Add local tracks
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream);
      });

      // Notify signaling
      this.signaling!.acceptCall(callId, this.config.userId);
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  declineCall(callId: string, reason?: string): void {
    this.invitationManager!.declineInvitation(callId);
    this.signaling!.declineCall(callId, this.config.userId, reason);
  }

  // ===========================================================================
  // End Call
  // ===========================================================================

  async endCall(reason: CallEndReason = "completed"): Promise<void> {
    if (!this.currentCall) {
      return;
    }

    const callId = this.currentCall.callId;
    const duration = this.callStartTime
      ? Math.floor((Date.now() - this.callStartTime) / 1000)
      : 0;

    // Transition state
    this.stateMachine!.transition("ending", `Call ending: ${reason}`);

    // Notify signaling
    this.signaling!.endCall(callId, this.config.userId, reason, duration);

    // Cleanup
    this.cleanup();

    // Set end info
    this.currentCall.endTime = new Date();
    this.currentCall.endReason = reason;

    // Emit event
    this.emit("call-ended", this.currentCall);
    this.callbacks.onCallEnded?.(this.currentCall);

    // Transition to ended
    this.stateMachine!.transition("ended", `Call ended: ${reason}`);

    // Clear call
    this.currentCall = null;
  }

  // ===========================================================================
  // Media Controls
  // ===========================================================================

  toggleMute(): boolean {
    if (!this.mediaManager) return false;

    const newState = this.mediaManager.toggleAudio();

    if (this.currentCall) {
      this.signaling!.notifyMuteChange(
        this.currentCall.callId,
        this.config.userId,
        !newState,
      );
    }

    return newState;
  }

  toggleVideo(): boolean {
    if (!this.mediaManager) return false;

    const newState = this.mediaManager.toggleVideo();

    if (this.currentCall) {
      this.signaling!.notifyVideoChange(
        this.currentCall.callId,
        this.config.userId,
        newState,
      );
    }

    return newState;
  }

  async startScreenShare(): Promise<void> {
    if (!this.mediaManager || !this.peerConnection) {
      throw new Error("Call not active");
    }

    const screenStream = await this.mediaManager.getDisplayMedia();
    const videoTrack = screenStream.getVideoTracks()[0];

    if (videoTrack) {
      // Replace video track
      const videoTracks = this.peerConnection.getLocalVideoTracks();
      if (videoTracks.length > 0) {
        this.peerConnection.replaceTrack(videoTracks[0].track.id, videoTrack);
      }

      // Notify
      if (this.currentCall) {
        this.signaling!.notifyScreenShareStarted(
          this.currentCall.callId,
          this.config.userId,
        );
      }

      // Handle track end (user stopped sharing)
      videoTrack.onended = () => {
        this.stopScreenShare();
      };
    }
  }

  stopScreenShare(): void {
    if (!this.mediaManager || !this.peerConnection) return;

    this.mediaManager.stopScreenShare();

    if (this.currentCall) {
      this.signaling!.notifyScreenShareStopped(
        this.currentCall.callId,
        this.config.userId,
      );
    }
  }

  // ===========================================================================
  // Signaling Handlers
  // ===========================================================================

  private handleCallRing(payload: any): void {
    if (this.currentCall && payload.callId === this.currentCall.callId) {
      // Call is ringing on the other end
      this.emit("call-ringing");
    }
  }

  private handleCallAccepted(payload: any): void {
    if (this.currentCall && payload.callId === this.currentCall.callId) {
      this.stateMachine!.transition(
        "connecting",
        "Call accepted by remote peer",
      );
      this.currentCall.state = "connecting";

      this.emit("call-accepted", this.currentCall);
      this.callbacks.onCallAccepted?.(this.currentCall);
    }
  }

  private handleCallDeclined(payload: any): void {
    if (this.currentCall && payload.callId === this.currentCall.callId) {
      this.endCall("declined");

      this.emit("call-declined", this.currentCall);
      this.callbacks.onCallDeclined?.(this.currentCall);
    }
  }

  private handleCallEnded(payload: any): void {
    if (this.currentCall && payload.callId === this.currentCall.callId) {
      this.endCall(payload.reason || "completed");
    }
  }

  private async handleOffer(payload: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(payload.sdp);

      const answer = await this.peerConnection.createAnswer();

      this.signaling!.sendAnswer({
        callId: payload.callId,
        fromUserId: this.config.userId,
        toUserId: payload.fromUserId,
        sdp: answer,
      });
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async handleAnswer(payload: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(payload.sdp);
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async handleIceCandidate(payload: any): Promise<void> {
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.addIceCandidate(payload.candidate);
    } catch (error) {
      logger.error("Error adding ICE candidate:", error);
    }
  }

  private async handleRenegotiate(payload: any): Promise<void> {
    // Handle renegotiation (e.g., when adding screen share)
    await this.handleOffer(payload);
  }

  // ===========================================================================
  // WebRTC Handlers
  // ===========================================================================

  private handleLocalIceCandidate(candidate: RTCIceCandidate): void {
    if (!this.currentCall) return;

    this.signaling!.sendIceCandidate({
      callId: this.currentCall.callId,
      fromUserId: this.config.userId,
      toUserId: this.currentCall.targetUserId,
      candidate: candidate.toJSON(),
    });
  }

  private handleConnectionStateChange(state: RTCPeerConnectionState): void {
    this.emit("connection-state-change", state);
    this.callbacks.onConnectionStateChange?.(state);

    if (state === "connected") {
      this.stateMachine!.transition(
        "connected",
        "WebRTC connection established",
      );
      if (this.currentCall) {
        this.currentCall.state = "connected";
        this.currentCall.startTime = new Date();
        this.callStartTime = Date.now();
      }
      this.reconnectAttempts = 0;
    } else if (state === "disconnected") {
      this.handleDisconnection();
    } else if (state === "failed") {
      this.endCall("network");
    }
  }

  private handleRemoteTrack(event: RTCTrackEvent): void {
    const stream = event.streams[0];

    if (stream) {
      this.emit("remote-stream", stream);
      this.callbacks.onRemoteStream?.(stream);
    }
  }

  private async handleDisconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.endCall("network");
      return;
    }

    this.stateMachine!.transition(
      "reconnecting",
      "Connection lost, attempting to reconnect",
    );
    if (this.currentCall) {
      this.currentCall.state = "reconnecting";
    }

    this.reconnectAttempts++;

    // Attempt ICE restart
    if (this.peerConnection) {
      try {
        const offer = await this.peerConnection.restartIce();
        if (offer && this.currentCall) {
          this.signaling!.requestRenegotiation({
            callId: this.currentCall.callId,
            fromUserId: this.config.userId,
            toUserId: this.currentCall.targetUserId,
            sdp: offer,
          });
        }
      } catch (error) {
        logger.error("ICE restart failed:", error);
      }
    }
  }

  // ===========================================================================
  // Error Handlers
  // ===========================================================================

  private handleError(error: Error): void {
    logger.error("Call error:", error);
    this.emit("error", error);
    this.callbacks.onError?.(error);
    this.config.onError?.(error);
  }

  private handleMediaError(error: Error): void {
    this.handleError(error);
  }

  private handleSignalingError(payload: any): void {
    this.handleError(new Error(payload.message || "Signaling error"));
  }

  private handleTrackEnded(track: MediaStreamTrack): void {
    // REMOVED: console.log('Track ended:', track.kind, track.id)
  }

  // ===========================================================================
  // Invitation Handlers
  // ===========================================================================

  private handleInvitationTimeout(invitation: any): void {
    // Call was not answered in time
    this.emit("call-timeout", invitation);
  }

  private handleInvitationAccepted(invitation: any): void {
    // Local user accepted
  }

  private handleInvitationDeclined(invitation: any): void {
    // Local user declined
  }

  // ===========================================================================
  // State Machine Handler
  // ===========================================================================

  private handleStateTransition(event: any): void {
    this.emit("state-change", event.to);
    this.callbacks.onStateChange?.(event.to);
    this.config.onStateChange?.(event.to);
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  getCurrentCall(): CallInfo | null {
    return this.currentCall;
  }

  getState(): CallState {
    return this.stateMachine?.getState() || "idle";
  }

  isInCall(): boolean {
    return this.currentCall !== null && this.getState() !== "ended";
  }

  isMuted(): boolean {
    return this.mediaManager ? !this.mediaManager.audioEnabled : false;
  }

  isVideoEnabled(): boolean {
    return this.mediaManager ? this.mediaManager.videoEnabled : false;
  }

  isScreenSharing(): boolean {
    return this.mediaManager ? this.mediaManager.isScreenSharing : false;
  }

  getCallDuration(): number {
    if (!this.callStartTime) return 0;
    return Math.floor((Date.now() - this.callStartTime) / 1000);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private cleanup(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.mediaManager) {
      this.mediaManager.stopAllStreams();
    }

    this.callStartTime = 0;
    this.reconnectAttempts = 0;
  }

  destroy(): void {
    this.cleanup();

    if (this.signaling) {
      this.signaling.disconnect();
    }

    if (this.mediaManager) {
      this.mediaManager.cleanup();
    }

    if (this.invitationManager) {
      this.invitationManager.cleanup();
    }

    this.removeAllListeners();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createCallManager(
  config: CallManagerConfig,
  callbacks?: CallManagerCallbacks,
): CallManager {
  return new CallManager(config, callbacks);
}
