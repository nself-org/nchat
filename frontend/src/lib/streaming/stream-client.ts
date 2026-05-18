/**
 * Stream Client (Broadcaster)
 *
 * Manages WebRTC connection for broadcaster to send video/audio to media server.
 * Handles camera/microphone access, preview, and quality metrics reporting.
 *
 * @module lib/streaming/stream-client
 */

import type { StreamQuality, StreamQualityMetrics } from "./stream-types";

// ============================================================================
// Types
// ============================================================================

export interface StreamClientConfig {
  streamId: string;
  streamKey: string;
  ingestUrl: string;
  userId: string;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: StreamClientError) => void;
  onQualityMetrics?: (metrics: StreamQualityMetrics) => void;
}

export interface StreamClientError {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface MediaConstraints {
  video: MediaTrackConstraints;
  audio: MediaTrackConstraints;
}

// ============================================================================
// Constants
// ============================================================================

const VIDEO_CONSTRAINTS: Record<StreamQuality, MediaTrackConstraints> = {
  "1080p": {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  },
  "720p": {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  "480p": {
    width: { ideal: 854 },
    height: { ideal: 480 },
    frameRate: { ideal: 30 },
  },
  "360p": {
    width: { ideal: 640 },
    height: { ideal: 360 },
    frameRate: { ideal: 24 },
  },
  auto: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 2,
};

const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

// ============================================================================
// Stream Client Manager
// ============================================================================

export class StreamClient {
  private config: StreamClientConfig;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private statsInterval: number | null = null;
  private metricsInterval: number | null = null;
  private qualityLevel: StreamQuality = "720p";
  private isConnecting: boolean = false;
  private isConnected: boolean = false;

  constructor(config: StreamClientConfig) {
    this.config = config;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Start broadcasting stream
   */
  public async startBroadcast(
    quality: StreamQuality = "720p",
  ): Promise<MediaStream> {
    if (this.isConnecting || this.isConnected) {
      throw new Error("Already broadcasting");
    }

    this.isConnecting = true;
    this.qualityLevel = quality;

    try {
      // Get media devices
      this.localStream = await this.getUserMedia(quality);

      // Create peer connection
      await this.createPeerConnection();

      // Add tracks to peer connection
      this.addTracksToConnection();

      // Create and send offer
      await this.createAndSendOffer();

      this.isConnecting = false;
      this.isConnected = true;

      // Start metrics reporting
      this.startMetricsReporting();

      return this.localStream;
    } catch (error) {
      this.isConnecting = false;
      this.handleError("BROADCAST_START_FAILED", error as Error);
      throw error;
    }
  }

  /**
   * Stop broadcasting
   */
  public stopBroadcast(): void {
    this.stopMetricsReporting();
    this.closePeerConnection();
    this.stopLocalStream();
    this.isConnected = false;
  }

  // ==========================================================================
  // Media Management
  // ==========================================================================

  /**
   * Get user media (camera + microphone)
   */
  private async getUserMedia(quality: StreamQuality): Promise<MediaStream> {
    const constraints: MediaConstraints = {
      video: VIDEO_CONSTRAINTS[quality],
      audio: AUDIO_CONSTRAINTS,
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      this.handleError("MEDIA_ACCESS_DENIED", error as Error);
      throw error;
    }
  }

  /**
   * Switch camera
   */
  public async switchCamera(deviceId: string): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const constraints: MediaTrackConstraints = {
        ...VIDEO_CONSTRAINTS[this.qualityLevel],
        deviceId: { exact: deviceId },
      };

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: constraints,
      });

      const newTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      const sender = this.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      // Replace track in local stream
      videoTrack.stop();
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newTrack);
    } catch (error) {
      this.handleError("CAMERA_SWITCH_FAILED", error as Error);
      throw error;
    }
  }

  /**
   * Switch microphone
   */
  public async switchMicrophone(deviceId: string): Promise<void> {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const constraints: MediaTrackConstraints = {
        ...AUDIO_CONSTRAINTS,
        deviceId: { exact: deviceId },
      };

      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: constraints,
      });

      const newTrack = newStream.getAudioTracks()[0];

      // Replace track in peer connection
      const sender = this.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === "audio");

      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      // Replace track in local stream
      audioTrack.stop();
      this.localStream.removeTrack(audioTrack);
      this.localStream.addTrack(newTrack);
    } catch (error) {
      this.handleError("MICROPHONE_SWITCH_FAILED", error as Error);
      throw error;
    }
  }

  /**
   * Change video quality
   */
  public async changeQuality(quality: StreamQuality): Promise<void> {
    if (!this.localStream) return;

    this.qualityLevel = quality;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      await videoTrack.applyConstraints(VIDEO_CONSTRAINTS[quality]);
    } catch (error) {
      this.handleError("QUALITY_CHANGE_FAILED", error as Error);
      throw error;
    }
  }

  /**
   * Toggle camera on/off
   */
  public toggleVideo(enabled: boolean): void {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = enabled;
    }
  }

  /**
   * Toggle microphone on/off
   */
  public toggleAudio(enabled: boolean): void {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
    }
  }

  /**
   * Stop local stream
   */
  private stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  // ==========================================================================
  // WebRTC Connection
  // ==========================================================================

  /**
   * Create peer connection
   */
  private async createPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection(PEER_CONNECTION_CONFIG);

    // Connection state change handler
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state) {
        this.config.onConnectionStateChange?.(state);

        if (state === "failed" || state === "disconnected") {
          this.handleError(
            "CONNECTION_FAILED",
            new Error(`Connection ${state}`),
          );
        }
      }
    };

    // ICE candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };

    // Start monitoring stats
    this.startStatsMonitoring();
  }

  /**
   * Add tracks to peer connection
   */
  private addTracksToConnection(): void {
    if (!this.localStream || !this.peerConnection) return;

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });
  }

  /**
   * Create and send SDP offer
   */
  private async createAndSendOffer(): Promise<void> {
    if (!this.peerConnection) return;

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });

    await this.peerConnection.setLocalDescription(offer);

    // Send offer to signaling server
    await this.sendOffer(offer);
  }

  /**
   * Handle SDP answer from server
   */
  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer),
    );
  }

  /**
   * Handle ICE candidate from server
   */
  public async handleIceCandidate(
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    if (!this.peerConnection) return;

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Close peer connection
   */
  private closePeerConnection(): void {
    if (this.statsInterval) {
      window.clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  // ==========================================================================
  // Signaling (Placeholder - implement with Socket.io)
  // ==========================================================================

  private async sendOffer(offer: RTCSessionDescriptionInit): Promise<void> {}

  private sendIceCandidate(candidate: RTCIceCandidate): void {}

  // ==========================================================================
  // Stats & Metrics
  // ==========================================================================

  /**
   * Start monitoring WebRTC stats
   */
  private startStatsMonitoring(): void {
    this.statsInterval = window.setInterval(async () => {
      await this.collectStats();
    }, 1000); // Collect every second
  }

  /**
   * Collect WebRTC statistics
   */
  private async collectStats(): Promise<void> {
    if (!this.peerConnection) return;

    const stats = await this.peerConnection.getStats();

    // Process stats (extract bitrate, FPS, etc.)
    // This is a simplified version
    stats.forEach((report) => {
      if (report.type === "outbound-rtp" && report.kind === "video") {
        // Video stats available here
      }
    });
  }

  /**
   * Start reporting quality metrics to server
   */
  private startMetricsReporting(): void {
    this.metricsInterval = window.setInterval(async () => {
      const metrics = await this.getQualityMetrics();
      if (metrics) {
        this.config.onQualityMetrics?.(metrics);
        await this.reportMetrics(metrics);
      }
    }, 5000); // Report every 5 seconds
  }

  /**
   * Stop metrics reporting
   */
  private stopMetricsReporting(): void {
    if (this.metricsInterval) {
      window.clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Get current quality metrics
   */
  private async getQualityMetrics(): Promise<StreamQualityMetrics | null> {
    if (!this.peerConnection) return null;

    const stats = await this.peerConnection.getStats();

    // Extract metrics from stats
    // This is a simplified placeholder
    return {
      id: crypto.randomUUID(),
      streamId: this.config.streamId,
      recordedAt: new Date().toISOString(),
      currentViewerCount: 0, // Will be updated by server
      concurrentConnections: 0,
      bitrateKbps: 0,
      fps: 30,
      resolution: this.qualityLevel,
      droppedFrames: 0,
      uploadBitrateKbps: 0,
      latencyMs: 0,
      packetLossPercent: 0,
      healthScore: 100,
    };
  }

  /**
   * Report metrics to server
   */
  private async reportMetrics(metrics: StreamQualityMetrics): Promise<void> {}

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  private handleError(code: string, error: Error): void {
    const streamError: StreamClientError = {
      code,
      message: error.message,
      recoverable: false,
    };

    this.config.onError?.(streamError);
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  public get stream(): MediaStream | null {
    return this.localStream;
  }

  public get quality(): StreamQuality {
    return this.qualityLevel;
  }

  public get connectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null;
  }

  public get connected(): boolean {
    return this.isConnected;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create stream client instance
 */
export function createStreamClient(config: StreamClientConfig): StreamClient {
  return new StreamClient(config);
}
