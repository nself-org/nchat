/**
 * WebRTC Peer Connection Manager
 *
 * Manages RTCPeerConnection instances for voice and video calls.
 * Handles ICE candidates, media tracks, and connection state.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type ConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";

export type IceConnectionState =
  | "new"
  | "checking"
  | "connected"
  | "completed"
  | "failed"
  | "disconnected"
  | "closed";

export interface PeerConnectionConfig {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface PeerConnectionCallbacks {
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
  onIceCandidateError?: (event: RTCPeerConnectionIceErrorEvent) => void;
  onIceConnectionStateChange?: (state: IceConnectionState) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onTrack?: (event: RTCTrackEvent) => void;
  onNegotiationNeeded?: () => void;
  onDataChannel?: (event: RTCDataChannelEvent) => void;
  onSignalingStateChange?: (state: RTCSignalingState) => void;
}

export interface TrackInfo {
  track: MediaStreamTrack;
  stream: MediaStream;
  sender?: RTCRtpSender;
}

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export const DEFAULT_CONFIG: PeerConnectionConfig = {
  iceServers: DEFAULT_ICE_SERVERS,
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

// =============================================================================
// Peer Connection Manager Class
// =============================================================================

export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private config: RTCConfiguration;
  private callbacks: PeerConnectionCallbacks;
  private localTracks: Map<string, TrackInfo> = new Map();
  private remoteTracks: Map<string, TrackInfo> = new Map();
  private pendingIceCandidates: RTCIceCandidate[] = [];
  private _connectionState: ConnectionState = "new";
  private _iceConnectionState: IceConnectionState = "new";
  private _signalingState: RTCSignalingState = "stable";

  constructor(
    config: PeerConnectionConfig = DEFAULT_CONFIG,
    callbacks: PeerConnectionCallbacks = {},
  ) {
    this.config = this.buildRTCConfiguration(config);
    this.callbacks = callbacks;
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  get iceConnectionState(): IceConnectionState {
    return this._iceConnectionState;
  }

  get signalingState(): RTCSignalingState {
    return this._signalingState;
  }

  get isConnected(): boolean {
    return this._connectionState === "connected";
  }

  get isClosed(): boolean {
    return this._connectionState === "closed" || this.pc === null;
  }

  get peerConnection(): RTCPeerConnection | null {
    return this.pc;
  }

  get localTrackList(): TrackInfo[] {
    return Array.from(this.localTracks.values());
  }

  get remoteTrackList(): TrackInfo[] {
    return Array.from(this.remoteTracks.values());
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  private buildRTCConfiguration(
    config: PeerConnectionConfig,
  ): RTCConfiguration {
    return {
      iceServers: config.iceServers ?? DEFAULT_ICE_SERVERS,
      iceTransportPolicy: config.iceTransportPolicy ?? "all",
      bundlePolicy: config.bundlePolicy ?? "max-bundle",
      rtcpMuxPolicy: config.rtcpMuxPolicy ?? "require",
    };
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  create(): RTCPeerConnection {
    if (this.pc) {
      this.close();
    }

    this.pc = new RTCPeerConnection(this.config);
    this.setupEventHandlers();
    this._connectionState = "new";
    this._iceConnectionState = "new";
    this._signalingState = "stable";

    return this.pc;
  }

  private setupEventHandlers(): void {
    if (!this.pc) return;

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate?.(event.candidate);
      }
    };

    this.pc.onicecandidateerror = (event) => {
      this.callbacks.onIceCandidateError?.(
        event as RTCPeerConnectionIceErrorEvent,
      );
    };

    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      this._iceConnectionState = this.pc
        .iceConnectionState as IceConnectionState;
      this.callbacks.onIceConnectionStateChange?.(this._iceConnectionState);
    };

    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      this._connectionState = this.pc.connectionState as ConnectionState;
      this.callbacks.onConnectionStateChange?.(this._connectionState);
    };

    this.pc.ontrack = (event) => {
      const track = event.track;
      const stream = event.streams[0] || new MediaStream([track]);

      this.remoteTracks.set(track.id, { track, stream });

      track.onended = () => {
        this.remoteTracks.delete(track.id);
      };

      this.callbacks.onTrack?.(event);
    };

    this.pc.onnegotiationneeded = () => {
      this.callbacks.onNegotiationNeeded?.();
    };

    this.pc.ondatachannel = (event) => {
      this.callbacks.onDataChannel?.(event);
    };

    this.pc.onsignalingstatechange = () => {
      if (!this.pc) return;
      this._signalingState = this.pc.signalingState;
      this.callbacks.onSignalingStateChange?.(this._signalingState);
    };
  }

  close(): void {
    if (!this.pc) return;

    // Remove all tracks
    this.localTracks.forEach((trackInfo) => {
      if (trackInfo.sender) {
        try {
          this.pc?.removeTrack(trackInfo.sender);
        } catch {
          // Track may already be removed
        }
      }
      trackInfo.track.stop();
    });

    this.localTracks.clear();
    this.remoteTracks.clear();
    this.pendingIceCandidates = [];

    this.pc.close();
    this.pc = null;

    this._connectionState = "closed";
    this._iceConnectionState = "closed";
  }

  // ===========================================================================
  // Offer/Answer
  // ===========================================================================

  async createOffer(
    options?: RTCOfferOptions,
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error("PeerConnection not created. Call create() first.");
    }

    const offer = await this.pc.createOffer(options);
    await this.pc.setLocalDescription(offer);

    return offer;
  }

  async createAnswer(
    options?: RTCAnswerOptions,
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) {
      throw new Error("PeerConnection not created. Call create() first.");
    }

    const answer = await this.pc.createAnswer(options);
    await this.pc.setLocalDescription(answer);

    return answer;
  }

  async setRemoteDescription(
    description: RTCSessionDescriptionInit,
  ): Promise<void> {
    if (!this.pc) {
      throw new Error("PeerConnection not created. Call create() first.");
    }

    await this.pc.setRemoteDescription(new RTCSessionDescription(description));

    // Process any pending ICE candidates
    await this.processPendingIceCandidates();
  }

  // ===========================================================================
  // ICE Candidates
  // ===========================================================================

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      throw new Error("PeerConnection not created. Call create() first.");
    }

    // If remote description is not set yet, queue the candidate
    if (!this.pc.remoteDescription) {
      this.pendingIceCandidates.push(new RTCIceCandidate(candidate));
      return;
    }

    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private async processPendingIceCandidates(): Promise<void> {
    if (!this.pc) return;

    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];

    for (const candidate of candidates) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (error) {
        logger.error("Failed to add pending ICE candidate:", error);
      }
    }
  }

  // ===========================================================================
  // Track Management
  // ===========================================================================

  addTrack(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender | null {
    if (!this.pc) {
      throw new Error("PeerConnection not created. Call create() first.");
    }

    const sender = this.pc.addTrack(track, stream);

    this.localTracks.set(track.id, { track, stream, sender });

    track.onended = () => {
      this.removeTrack(track.id);
    };

    return sender;
  }

  removeTrack(trackId: string): boolean {
    if (!this.pc) return false;

    const trackInfo = this.localTracks.get(trackId);
    if (!trackInfo) return false;

    if (trackInfo.sender) {
      try {
        this.pc.removeTrack(trackInfo.sender);
      } catch {
        // Track may already be removed
      }
    }

    trackInfo.track.stop();
    this.localTracks.delete(trackId);

    return true;
  }

  replaceTrack(oldTrackId: string, newTrack: MediaStreamTrack): boolean {
    if (!this.pc) return false;

    const trackInfo = this.localTracks.get(oldTrackId);
    if (!trackInfo?.sender) return false;

    trackInfo.sender.replaceTrack(newTrack);

    // Update the stored track info
    this.localTracks.delete(oldTrackId);
    this.localTracks.set(newTrack.id, {
      track: newTrack,
      stream: trackInfo.stream,
      sender: trackInfo.sender,
    });

    // Stop the old track
    trackInfo.track.stop();

    return true;
  }

  getLocalTrack(trackId: string): TrackInfo | undefined {
    return this.localTracks.get(trackId);
  }

  getRemoteTrack(trackId: string): TrackInfo | undefined {
    return this.remoteTracks.get(trackId);
  }

  getLocalAudioTracks(): TrackInfo[] {
    return Array.from(this.localTracks.values()).filter(
      (info) => info.track.kind === "audio",
    );
  }

  getLocalVideoTracks(): TrackInfo[] {
    return Array.from(this.localTracks.values()).filter(
      (info) => info.track.kind === "video",
    );
  }

  getRemoteAudioTracks(): TrackInfo[] {
    return Array.from(this.remoteTracks.values()).filter(
      (info) => info.track.kind === "audio",
    );
  }

  getRemoteVideoTracks(): TrackInfo[] {
    return Array.from(this.remoteTracks.values()).filter(
      (info) => info.track.kind === "video",
    );
  }

  // ===========================================================================
  // Track Enable/Disable
  // ===========================================================================

  enableLocalAudio(enabled: boolean): void {
    this.getLocalAudioTracks().forEach((info) => {
      info.track.enabled = enabled;
    });
  }

  enableLocalVideo(enabled: boolean): void {
    this.getLocalVideoTracks().forEach((info) => {
      info.track.enabled = enabled;
    });
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.pc) return null;
    return this.pc.getStats();
  }

  async getConnectionStats(): Promise<{
    bytesReceived: number;
    bytesSent: number;
    packetsLost: number;
    roundTripTime: number | null;
  } | null> {
    const stats = await this.getStats();
    if (!stats) return null;

    let bytesReceived = 0;
    let bytesSent = 0;
    let packetsLost = 0;
    let roundTripTime: number | null = null;

    stats.forEach((report) => {
      if (report.type === "inbound-rtp") {
        bytesReceived += report.bytesReceived || 0;
        packetsLost += report.packetsLost || 0;
      }
      if (report.type === "outbound-rtp") {
        bytesSent += report.bytesSent || 0;
      }
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        roundTripTime = report.currentRoundTripTime || null;
      }
    });

    return { bytesReceived, bytesSent, packetsLost, roundTripTime };
  }

  // ===========================================================================
  // Data Channel
  // ===========================================================================

  createDataChannel(
    label: string,
    options?: RTCDataChannelInit,
  ): RTCDataChannel | null {
    if (!this.pc) {
      throw new Error("PeerConnection not created. Call create() first.");
    }

    return this.pc.createDataChannel(label, options);
  }

  // ===========================================================================
  // Callbacks Update
  // ===========================================================================

  updateCallbacks(callbacks: Partial<PeerConnectionCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // ===========================================================================
  // Restart ICE
  // ===========================================================================

  async restartIce(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) return null;

    this.pc.restartIce();
    return this.createOffer({ iceRestart: true });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createPeerConnection(
  config?: PeerConnectionConfig,
  callbacks?: PeerConnectionCallbacks,
): PeerConnectionManager {
  return new PeerConnectionManager(config, callbacks);
}
