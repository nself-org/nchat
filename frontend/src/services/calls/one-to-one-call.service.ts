/**
 * 1:1 Call Service
 *
 * Complete service for managing one-to-one voice and video calls.
 * Handles setup, join, leave, reconnect, mute, video toggles
 * with robust signaling and state management.
 */

import { EventEmitter } from "events";
import {
  PeerConnectionManager,
  createPeerConnection,
  type ConnectionState,
} from "@/lib/webrtc/peer-connection";
import {
  MediaManager,
  createMediaManager,
  type MediaDevice,
} from "@/lib/webrtc/media-manager";
import {
  SignalingManager,
  createSignalingManager,
  generateCallId,
  type CallEndReason,
} from "@/lib/webrtc/signaling";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type CallType = "voice" | "video";

export type CallStatus =
  | "idle"
  | "initiating"
  | "ringing"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "on_hold"
  | "ending"
  | "ended";

export interface CallParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionState: "connecting" | "connected" | "disconnected";
}

export interface CallConfig {
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
  ringTimeoutMs?: number;
  iceRestartDelayMs?: number;
}

export interface CallInfo {
  id: string;
  type: CallType;
  status: CallStatus;
  direction: "outgoing" | "incoming";
  remoteParticipant: CallParticipant | null;
  startedAt: Date | null;
  connectedAt: Date | null;
  endedAt: Date | null;
  endReason?: CallEndReason;
  channelId?: string;
}

export interface CallMetrics {
  duration: number;
  reconnectAttempts: number;
  packetsLost: number;
  roundTripTime: number | null;
  bytesReceived: number;
  bytesSent: number;
}

export interface OneToOneCallServiceConfig extends CallConfig {
  onCallStateChange?: (status: CallStatus, previousStatus: CallStatus) => void;
  onIncomingCall?: (callInfo: CallInfo) => void;
  onCallConnected?: (callInfo: CallInfo) => void;
  onCallEnded?: (callInfo: CallInfo, reason: CallEndReason) => void;
  onRemoteStreamReceived?: (stream: MediaStream) => void;
  onMediaStateChange?: (state: {
    isMuted: boolean;
    isVideoEnabled: boolean;
  }) => void;
  onError?: (error: Error) => void;
  onReconnecting?: (attempt: number, maxAttempts: number) => void;
  onDevicesChanged?: (devices: MediaDevice[]) => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY_MS = 2000;
const DEFAULT_RING_TIMEOUT_MS = 30000;
const DEFAULT_ICE_RESTART_DELAY_MS = 3000;

// =============================================================================
// One-to-One Call Service
// =============================================================================

export class OneToOneCallService extends EventEmitter {
  private config: OneToOneCallServiceConfig;
  private peerConnection: PeerConnectionManager | null = null;
  private mediaManager: MediaManager | null = null;
  private signaling: SignalingManager | null = null;

  // Call state
  private currentCall: CallInfo | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  // Control state
  private isMuted: boolean = false;
  private isVideoEnabled: boolean = true;
  private isScreenSharing: boolean = false;

  // Reconnection state
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private ringTimer: ReturnType<typeof setTimeout> | null = null;

  // Metrics
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private metrics: CallMetrics = {
    duration: 0,
    reconnectAttempts: 0,
    packetsLost: 0,
    roundTripTime: null,
    bytesReceived: 0,
    bytesSent: 0,
  };

  constructor(config: OneToOneCallServiceConfig) {
    super();
    this.config = {
      maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
      reconnectDelayMs: DEFAULT_RECONNECT_DELAY_MS,
      ringTimeoutMs: DEFAULT_RING_TIMEOUT_MS,
      iceRestartDelayMs: DEFAULT_ICE_RESTART_DELAY_MS,
      ...config,
    };
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get callInfo(): CallInfo | null {
    return this.currentCall;
  }

  get isInCall(): boolean {
    return (
      this.currentCall !== null &&
      !["idle", "ended"].includes(this.currentCall.status)
    );
  }

  get isConnected(): boolean {
    return this.currentCall?.status === "connected";
  }

  get isReconnecting(): boolean {
    return this.currentCall?.status === "reconnecting";
  }

  get callDuration(): number {
    if (!this.currentCall?.connectedAt) return 0;
    const endTime = this.currentCall.endedAt || new Date();
    return Math.floor(
      (endTime.getTime() - this.currentCall.connectedAt.getTime()) / 1000,
    );
  }

  get localMediaStream(): MediaStream | null {
    return this.localStream;
  }

  get remoteMediaStream(): MediaStream | null {
    return this.remoteStream;
  }

  get audioMuted(): boolean {
    return this.isMuted;
  }

  get videoEnabled(): boolean {
    return this.isVideoEnabled;
  }

  get screenSharing(): boolean {
    return this.isScreenSharing;
  }

  get callMetrics(): CallMetrics {
    return { ...this.metrics };
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  async initialize(): Promise<void> {
    this.initializeMediaManager();
    this.initializeSignaling();
    await this.mediaManager?.enumerateDevices();
    this.mediaManager?.startDeviceChangeListener();
  }

  private initializeMediaManager(): void {
    this.mediaManager = createMediaManager({
      onDeviceChange: (devices) => {
        this.config.onDevicesChanged?.(devices);
        this.emit("devices-changed", devices);
      },
      onTrackEnded: (track) => {
        if (track.kind === "video" && this.isScreenSharing) {
          this.stopScreenShare();
        }
      },
      onStreamError: (error) => {
        this.handleError(error);
      },
    });
  }

  private initializeSignaling(): void {
    this.signaling = createSignalingManager({
      onCallRing: (payload) => {
        this.handleIncomingCall(payload);
      },
      onCallAccepted: async (payload) => {
        if (this.currentCall?.id === payload.callId) {
          await this.handleCallAccepted();
        }
      },
      onCallDeclined: (payload) => {
        if (this.currentCall?.id === payload.callId) {
          this.handleCallDeclined();
        }
      },
      onCallEnded: (payload) => {
        if (this.currentCall?.id === payload.callId) {
          this.handleCallEnded(payload.reason as CallEndReason);
        }
      },
      onCallBusy: (payload) => {
        if (this.currentCall?.id === payload.callId) {
          this.handleCallBusy();
        }
      },
      onCallTimeout: (payload) => {
        if (this.currentCall?.id === payload.callId) {
          this.handleCallTimeout();
        }
      },
      onOffer: async (payload) => {
        await this.handleOffer(payload);
      },
      onAnswer: async (payload) => {
        await this.handleAnswer(payload);
      },
      onIceCandidate: async (payload) => {
        await this.handleIceCandidate(payload);
      },
      onMuteChanged: (payload) => {
        this.handleRemoteMuteChange(payload);
      },
      onVideoChanged: (payload) => {
        this.handleRemoteVideoChange(payload);
      },
      onScreenShareStarted: (payload) => {
        this.handleRemoteScreenShareStart(payload);
      },
      onScreenShareStopped: (payload) => {
        this.handleRemoteScreenShareStop(payload);
      },
      onError: (payload) => {
        this.handleError(new Error(payload.message));
      },
    });
    this.signaling.connect();
  }

  private initializePeerConnection(): void {
    this.peerConnection = createPeerConnection(undefined, {
      onIceCandidate: (candidate) => {
        if (this.currentCall && this.signaling) {
          const remoteId = this.currentCall.remoteParticipant?.id;
          if (remoteId) {
            this.signaling.sendIceCandidate({
              callId: this.currentCall.id,
              fromUserId: this.config.userId,
              toUserId: remoteId,
              candidate: candidate.toJSON(),
            });
          }
        }
      },
      onConnectionStateChange: (state) => {
        this.handleConnectionStateChange(state);
      },
      onTrack: (event) => {
        if (event.streams[0]) {
          this.remoteStream = event.streams[0];
          this.config.onRemoteStreamReceived?.(event.streams[0]);
          this.emit("remote-stream", event.streams[0]);
        }
      },
      onNegotiationNeeded: () => {
        // Handle renegotiation if needed
        logger.debug("[Call] Negotiation needed");
      },
    });
    this.peerConnection.create();
  }

  // ===========================================================================
  // Call Actions
  // ===========================================================================

  async initiateCall(
    targetUserId: string,
    targetUserName: string,
    type: CallType,
    channelId?: string,
  ): Promise<string> {
    if (this.isInCall) {
      throw new Error("Already in a call");
    }

    const callId = generateCallId();

    // Create call info
    this.currentCall = {
      id: callId,
      type,
      status: "initiating",
      direction: "outgoing",
      remoteParticipant: {
        id: targetUserId,
        name: targetUserName,
        isMuted: false,
        isVideoEnabled: type === "video",
        isScreenSharing: false,
        connectionState: "connecting",
      },
      startedAt: new Date(),
      connectedAt: null,
      endedAt: null,
      channelId,
    };

    try {
      // Initialize peer connection
      this.initializePeerConnection();

      // Get local media
      await this.startLocalMedia(type);

      // Add tracks to peer connection
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      // Signal call initiation
      this.signaling?.initiateCall({
        callId,
        targetUserId,
        callType: type,
        channelId,
      });

      // Update state to ringing
      this.setCallStatus("ringing");

      // Start ring timeout
      this.startRingTimeout();

      // Create and send offer
      const offer = await this.peerConnection!.createOffer();
      this.signaling?.sendOffer({
        callId,
        fromUserId: this.config.userId,
        toUserId: targetUserId,
        sdp: offer,
      });

      return callId;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async acceptCall(callId: string): Promise<void> {
    if (this.currentCall?.id !== callId) {
      throw new Error("Call not found");
    }

    if (this.currentCall.status !== "ringing") {
      throw new Error("Call is not ringing");
    }

    try {
      // Initialize peer connection if not already done
      if (!this.peerConnection) {
        this.initializePeerConnection();
      }

      // Get local media
      await this.startLocalMedia(this.currentCall.type);

      // Add tracks to peer connection
      if (this.localStream && this.peerConnection) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      // Accept the call via signaling
      this.signaling?.acceptCall(callId, this.config.userId);

      this.setCallStatus("connecting");
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  declineCall(callId: string, reason?: string): void {
    if (this.currentCall?.id === callId) {
      this.signaling?.declineCall(callId, this.config.userId, reason);
      this.handleCallEnded("declined");
    }
  }

  endCall(): void {
    if (!this.currentCall) return;

    const duration = this.callDuration;

    this.signaling?.endCall(
      this.currentCall.id,
      this.config.userId,
      "completed",
      duration,
    );

    this.handleCallEnded("completed");
  }

  cancelCall(): void {
    if (!this.currentCall) return;

    this.signaling?.cancelCall(this.currentCall.id, this.config.userId);
    this.handleCallEnded("cancelled");
  }

  // ===========================================================================
  // Media Controls
  // ===========================================================================

  toggleMute(): void {
    this.setMuted(!this.isMuted);
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.mediaManager?.enableAudio(!muted);

    if (this.currentCall && this.signaling) {
      this.signaling.notifyMuteChange(
        this.currentCall.id,
        this.config.userId,
        muted,
      );
    }

    this.config.onMediaStateChange?.({
      isMuted: this.isMuted,
      isVideoEnabled: this.isVideoEnabled,
    });
    this.emit("media-state-change", {
      isMuted: this.isMuted,
      isVideoEnabled: this.isVideoEnabled,
    });
  }

  toggleVideo(): void {
    this.setVideoEnabled(!this.isVideoEnabled);
  }

  setVideoEnabled(enabled: boolean): void {
    this.isVideoEnabled = enabled;
    this.mediaManager?.enableVideo(enabled);

    if (this.currentCall && this.signaling) {
      this.signaling.notifyVideoChange(
        this.currentCall.id,
        this.config.userId,
        enabled,
      );
    }

    this.config.onMediaStateChange?.({
      isMuted: this.isMuted,
      isVideoEnabled: this.isVideoEnabled,
    });
    this.emit("media-state-change", {
      isMuted: this.isMuted,
      isVideoEnabled: this.isVideoEnabled,
    });
  }

  async startScreenShare(): Promise<void> {
    if (!this.mediaManager || !this.peerConnection || !this.currentCall) return;

    try {
      const screenStream = await this.mediaManager.getDisplayMedia();
      this.isScreenSharing = true;

      // Replace video track
      const screenTrack = screenStream.getVideoTracks()[0];
      const videoTracks = this.peerConnection.getLocalVideoTracks();

      if (videoTracks.length > 0 && screenTrack) {
        this.peerConnection.replaceTrack(videoTracks[0].track.id, screenTrack);
      }

      this.signaling?.notifyScreenShareStarted(
        this.currentCall.id,
        this.config.userId,
      );

      // Handle screen share stop
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      this.emit("screen-share-started");
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  stopScreenShare(): void {
    if (!this.isScreenSharing || !this.mediaManager || !this.currentCall)
      return;

    this.mediaManager.stopScreenShare();
    this.isScreenSharing = false;

    // Restore camera video track
    if (this.mediaManager.stream && this.peerConnection) {
      const videoTrack = this.mediaManager.videoTracks[0];
      const screenTracks = this.peerConnection.getLocalVideoTracks();
      if (videoTrack && screenTracks.length > 0) {
        this.peerConnection.replaceTrack(screenTracks[0].track.id, videoTrack);
      }
    }

    this.signaling?.notifyScreenShareStopped(
      this.currentCall.id,
      this.config.userId,
    );
    this.emit("screen-share-stopped");
  }

  // ===========================================================================
  // Device Selection
  // ===========================================================================

  async selectAudioInput(deviceId: string): Promise<void> {
    await this.mediaManager?.switchAudioDevice(deviceId);
  }

  async selectVideoInput(deviceId: string): Promise<void> {
    await this.mediaManager?.switchVideoDevice(deviceId);
  }

  async selectAudioOutput(
    deviceId: string,
    element: HTMLMediaElement,
  ): Promise<void> {
    await this.mediaManager?.setAudioOutput(deviceId, element);
  }

  getAudioInputDevices(): MediaDevice[] {
    return this.mediaManager?.getAudioInputDevices() ?? [];
  }

  getVideoInputDevices(): MediaDevice[] {
    return this.mediaManager?.getVideoInputDevices() ?? [];
  }

  getAudioOutputDevices(): MediaDevice[] {
    return this.mediaManager?.getAudioOutputDevices() ?? [];
  }

  // ===========================================================================
  // Reconnection
  // ===========================================================================

  private async attemptReconnect(): Promise<void> {
    if (
      !this.currentCall ||
      this.reconnectAttempts >=
        (this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS)
    ) {
      this.handleCallEnded("network");
      return;
    }

    this.reconnectAttempts++;
    this.setCallStatus("reconnecting");

    this.config.onReconnecting?.(
      this.reconnectAttempts,
      this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
    );
    this.emit("reconnecting", {
      attempt: this.reconnectAttempts,
      maxAttempts:
        this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
    });

    logger.info(`[Call] Reconnect attempt ${this.reconnectAttempts}`);

    try {
      // Restart ICE
      const offer = await this.peerConnection?.restartIce();
      if (offer && this.currentCall.remoteParticipant) {
        this.signaling?.sendOffer({
          callId: this.currentCall.id,
          fromUserId: this.config.userId,
          toUserId: this.currentCall.remoteParticipant.id,
          sdp: offer,
        });
      }
    } catch (error) {
      logger.error("[Call] Reconnect failed:", error);

      // Schedule next attempt
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnect();
      }, this.config.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS);
    }
  }

  // ===========================================================================
  // Private Handlers
  // ===========================================================================

  private async startLocalMedia(type: CallType): Promise<void> {
    if (!this.mediaManager) return;

    if (type === "video") {
      this.localStream = await this.mediaManager.getVideoStream();
      this.isVideoEnabled = true;
    } else {
      this.localStream = await this.mediaManager.getAudioOnlyStream();
      this.isVideoEnabled = false;
    }
  }

  private setCallStatus(status: CallStatus): void {
    if (!this.currentCall) return;

    const previousStatus = this.currentCall.status;
    this.currentCall.status = status;

    if (status === "connected" && !this.currentCall.connectedAt) {
      this.currentCall.connectedAt = new Date();
      this.startMetricsCollection();
    }

    if (status === "ended") {
      this.currentCall.endedAt = new Date();
      this.stopMetricsCollection();
    }

    this.config.onCallStateChange?.(status, previousStatus);
    this.emit("call-state-change", { status, previousStatus });
  }

  private handleIncomingCall(payload: any): void {
    if (this.isInCall) {
      // Already in a call, send busy signal
      this.signaling?.reportBusy(payload.callId, this.config.userId);
      return;
    }

    this.currentCall = {
      id: payload.callId,
      type: payload.callType,
      status: "ringing",
      direction: "incoming",
      remoteParticipant: {
        id: payload.callerId,
        name: payload.callerName,
        avatarUrl: payload.callerAvatarUrl,
        isMuted: false,
        isVideoEnabled: payload.callType === "video",
        isScreenSharing: false,
        connectionState: "connecting",
      },
      startedAt: new Date(),
      connectedAt: null,
      endedAt: null,
      channelId: payload.channelId,
    };

    this.config.onIncomingCall?.(this.currentCall);
    this.emit("incoming-call", this.currentCall);
  }

  private async handleCallAccepted(): Promise<void> {
    this.clearRingTimeout();
    this.setCallStatus("connecting");
  }

  private handleCallDeclined(): void {
    this.handleCallEnded("declined");
  }

  private handleCallBusy(): void {
    this.handleCallEnded("busy");
  }

  private handleCallTimeout(): void {
    this.handleCallEnded("timeout");
  }

  private handleCallEnded(reason: CallEndReason): void {
    if (!this.currentCall) return;

    this.currentCall.endReason = reason;
    this.setCallStatus("ended");

    this.config.onCallEnded?.(this.currentCall, reason);
    this.emit("call-ended", { callInfo: this.currentCall, reason });

    this.cleanup();
  }

  private async handleOffer(payload: any): Promise<void> {
    if (!this.peerConnection || this.currentCall?.id !== payload.callId) return;

    await this.peerConnection.setRemoteDescription(payload.sdp);
    const answer = await this.peerConnection.createAnswer();

    this.signaling?.sendAnswer({
      callId: payload.callId,
      fromUserId: this.config.userId,
      toUserId: payload.fromUserId,
      sdp: answer,
    });
  }

  private async handleAnswer(payload: any): Promise<void> {
    if (!this.peerConnection || this.currentCall?.id !== payload.callId) return;

    await this.peerConnection.setRemoteDescription(payload.sdp);
  }

  private async handleIceCandidate(payload: any): Promise<void> {
    if (!this.peerConnection || this.currentCall?.id !== payload.callId) return;

    await this.peerConnection.addIceCandidate(payload.candidate);
  }

  private handleConnectionStateChange(state: ConnectionState): void {
    logger.debug(`[Call] Connection state: ${state}`);

    switch (state) {
      case "connected":
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.setCallStatus("connected");

        if (this.currentCall?.remoteParticipant) {
          this.currentCall.remoteParticipant.connectionState = "connected";
        }

        this.config.onCallConnected?.(this.currentCall!);
        this.emit("call-connected", this.currentCall);
        break;

      case "disconnected":
        if (this.currentCall?.remoteParticipant) {
          this.currentCall.remoteParticipant.connectionState = "disconnected";
        }
        // Wait a bit before attempting reconnect
        setTimeout(() => {
          if (
            this.currentCall?.status === "connected" ||
            this.currentCall?.status === "reconnecting"
          ) {
            this.attemptReconnect();
          }
        }, this.config.iceRestartDelayMs ?? DEFAULT_ICE_RESTART_DELAY_MS);
        break;

      case "failed":
        this.attemptReconnect();
        break;

      case "closed":
        if (this.currentCall?.status !== "ended") {
          this.handleCallEnded("network");
        }
        break;
    }
  }

  private handleRemoteMuteChange(payload: any): void {
    if (this.currentCall?.remoteParticipant) {
      this.currentCall.remoteParticipant.isMuted = !payload.enabled;
      this.emit("remote-mute-change", {
        userId: payload.userId,
        isMuted: !payload.enabled,
      });
    }
  }

  private handleRemoteVideoChange(payload: any): void {
    if (this.currentCall?.remoteParticipant) {
      this.currentCall.remoteParticipant.isVideoEnabled = payload.enabled;
      this.emit("remote-video-change", {
        userId: payload.userId,
        isVideoEnabled: payload.enabled,
      });
    }
  }

  private handleRemoteScreenShareStart(payload: any): void {
    if (this.currentCall?.remoteParticipant) {
      this.currentCall.remoteParticipant.isScreenSharing = true;
      this.emit("remote-screen-share-start", { userId: payload.userId });
    }
  }

  private handleRemoteScreenShareStop(payload: any): void {
    if (this.currentCall?.remoteParticipant) {
      this.currentCall.remoteParticipant.isScreenSharing = false;
      this.emit("remote-screen-share-stop", { userId: payload.userId });
    }
  }

  private handleError(error: Error): void {
    logger.error("[Call] Error:", error);
    this.config.onError?.(error);
    this.emit("error", error);
  }

  // ===========================================================================
  // Timers
  // ===========================================================================

  private startRingTimeout(): void {
    this.clearRingTimeout();
    this.ringTimer = setTimeout(() => {
      if (this.currentCall?.status === "ringing") {
        this.handleCallTimeout();
      }
    }, this.config.ringTimeoutMs ?? DEFAULT_RING_TIMEOUT_MS);
  }

  private clearRingTimeout(): void {
    if (this.ringTimer) {
      clearTimeout(this.ringTimer);
      this.ringTimer = null;
    }
  }

  // ===========================================================================
  // Metrics
  // ===========================================================================

  private startMetricsCollection(): void {
    this.stopMetricsCollection();
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 1000);
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  private async collectMetrics(): Promise<void> {
    if (!this.peerConnection || !this.currentCall?.connectedAt) return;

    this.metrics.duration = this.callDuration;
    this.metrics.reconnectAttempts = this.reconnectAttempts;

    const stats = await this.peerConnection.getConnectionStats();
    if (stats) {
      this.metrics.packetsLost = stats.packetsLost;
      this.metrics.roundTripTime = stats.roundTripTime;
      this.metrics.bytesReceived = stats.bytesReceived;
      this.metrics.bytesSent = stats.bytesSent;
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  private cleanup(): void {
    this.clearRingTimeout();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopMetricsCollection();

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.mediaManager) {
      this.mediaManager.stopAllStreams();
    }

    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isVideoEnabled = true;
    this.isScreenSharing = false;
    this.reconnectAttempts = 0;
    this.currentCall = null;

    this.metrics = {
      duration: 0,
      reconnectAttempts: 0,
      packetsLost: 0,
      roundTripTime: null,
      bytesReceived: 0,
      bytesSent: 0,
    };
  }

  destroy(): void {
    this.cleanup();

    if (this.mediaManager) {
      this.mediaManager.cleanup();
      this.mediaManager = null;
    }

    if (this.signaling) {
      this.signaling.disconnect();
      this.signaling = null;
    }

    this.removeAllListeners();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createOneToOneCallService(
  config: OneToOneCallServiceConfig,
): OneToOneCallService {
  return new OneToOneCallService(config);
}
