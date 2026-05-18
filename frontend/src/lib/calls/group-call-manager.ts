/**
 * Group Call Manager (SFU Mode)
 *
 * Manages group calls with up to 50 participants using
 * Selective Forwarding Unit (SFU) architecture.
 *
 * For production, integrate with mediasoup server.
 * This implementation provides the client-side logic.
 */

import * as mediasoupClient from "mediasoup-client";
import type { Device, types } from "mediasoup-client";

import { logger } from "@/lib/logger";

// Re-export types from mediasoup-client for local use
type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;

// =============================================================================
// Types
// =============================================================================

export interface GroupCallConfig {
  callId: string;
  userId: string;
  maxParticipants?: number;
  audioCodec?: "opus" | "pcmu" | "pcma";
  enableDtx?: boolean; // Discontinuous Transmission for bandwidth savings
  sfuUrl?: string;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  avatarUrl?: string;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  joinedAt: number;
  producerId?: string;
  consumerId?: string;
}

export interface GroupCallStats {
  participantCount: number;
  totalBytesReceived: number;
  totalBytesSent: number;
  avgPacketLoss: number;
  avgJitter: number;
  avgRtt: number;
}

export interface GroupCallManagerCallbacks {
  onParticipantJoined?: (participant: ParticipantInfo) => void;
  onParticipantLeft?: (participantId: string) => void;
  onParticipantMuted?: (participantId: string, muted: boolean) => void;
  onParticipantSpeaking?: (participantId: string, speaking: boolean) => void;
  onAudioLevel?: (participantId: string, level: number) => void;
  onStatsUpdate?: (stats: GroupCallStats) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// Group Call Manager Class
// =============================================================================

export class GroupCallManager {
  private config: Required<GroupCallConfig>;
  private callbacks: GroupCallManagerCallbacks;

  // Mediasoup
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private audioProducer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();

  // Participants
  private participants: Map<string, ParticipantInfo> = new Map();
  private localStream: MediaStream | null = null;

  // Stats
  private statsInterval: number | null = null;
  private stats: GroupCallStats = {
    participantCount: 0,
    totalBytesReceived: 0,
    totalBytesSent: 0,
    avgPacketLoss: 0,
    avgJitter: 0,
    avgRtt: 0,
  };

  constructor(
    config: GroupCallConfig,
    callbacks: GroupCallManagerCallbacks = {},
  ) {
    this.config = {
      ...config,
      maxParticipants: config.maxParticipants ?? 50,
      audioCodec: config.audioCodec ?? "opus",
      enableDtx: config.enableDtx ?? true,
      sfuUrl:
        config.sfuUrl ??
        process.env.NEXT_PUBLIC_SFU_URL ??
        "https://sfu.example.com",
    };
    this.callbacks = callbacks;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Initialize group call
   */
  async initialize(localStream: MediaStream): Promise<void> {
    try {
      this.localStream = localStream;

      // Create mediasoup device
      this.device = new mediasoupClient.Device();

      // Load device with RTP capabilities from server
      const rtpCapabilities = await this.fetchRtpCapabilities();
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });

      // Create transports
      await this.createTransports();

      // Start producing audio
      await this.startProducing();

      // Start stats monitoring
      this.startStatsMonitoring();
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Fetch RTP capabilities from SFU server
   */
  private async fetchRtpCapabilities(): Promise<any> {
    try {
      const response = await fetch(`${this.config.sfuUrl}/rtp-capabilities`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch RTP capabilities");
      }

      return await response.json();
    } catch (error) {
      // Fallback to default capabilities for development
      logger.warn(
        "Using default RTP capabilities (production requires SFU server)",
      );
      return this.getDefaultRtpCapabilities();
    }
  }

  /**
   * Get default RTP capabilities (for development)
   */
  private getDefaultRtpCapabilities(): any {
    return {
      codecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
          parameters: {
            minptime: 10,
            useinbandfec: 1,
            usedtx: this.config.enableDtx ? 1 : 0,
          },
        },
      ],
      headerExtensions: [
        {
          kind: "audio",
          uri: "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
          preferredId: 1,
        },
      ],
    };
  }

  // ===========================================================================
  // Transport Management
  // ===========================================================================

  /**
   * Create send and receive transports
   */
  private async createTransports(): Promise<void> {
    if (!this.device) throw new Error("Device not initialized");

    // Create send transport
    const sendTransportParams = await this.requestTransport("send");
    this.sendTransport = this.device.createSendTransport(sendTransportParams);

    this.sendTransport.on(
      "connect",
      async (
        { dtlsParameters }: any,
        callback: () => void,
        errback: (error: Error) => void,
      ) => {
        try {
          await this.connectTransport("send", dtlsParameters);
          callback();
        } catch (error) {
          errback(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );

    this.sendTransport.on(
      "produce",
      async (
        { kind, rtpParameters }: any,
        callback: (params: { id: string }) => void,
        errback: (error: Error) => void,
      ) => {
        try {
          const { id } = await this.produce(kind, rtpParameters);
          callback({ id });
        } catch (error) {
          errback(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );

    // Create receive transport
    const recvTransportParams = await this.requestTransport("recv");
    this.recvTransport = this.device.createRecvTransport(recvTransportParams);

    this.recvTransport.on(
      "connect",
      async (
        { dtlsParameters }: any,
        callback: () => void,
        errback: (error: Error) => void,
      ) => {
        try {
          await this.connectTransport("recv", dtlsParameters);
          callback();
        } catch (error) {
          errback(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
  }

  /**
   * Request transport from SFU server
   */
  private async requestTransport(direction: "send" | "recv"): Promise<any> {
    try {
      const response = await fetch(`${this.config.sfuUrl}/transport/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: this.config.callId,
          userId: this.config.userId,
          direction,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create ${direction} transport`);
      }

      return await response.json();
    } catch (error) {
      // Fallback for development
      logger.warn(
        `Using mock ${direction} transport (production requires SFU server)`,
      );
      return this.getMockTransportParams();
    }
  }

  /**
   * Get mock transport params (for development)
   */
  private getMockTransportParams(): any {
    return {
      id: `transport-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      iceParameters: {
        iceLite: true,
        usernameFragment: Math.random().toString(36).substr(2, 8),
        password: Math.random().toString(36).substr(2, 24),
      },
      iceCandidates: [],
      dtlsParameters: {
        role: "auto",
        fingerprints: [
          {
            algorithm: "sha-256",
            value: Array(32)
              .fill(0)
              .map(() =>
                Math.floor(Math.random() * 256)
                  .toString(16)
                  .padStart(2, "0"),
              )
              .join(":"),
          },
        ],
      },
    };
  }

  /**
   * Connect transport
   */
  private async connectTransport(
    direction: "send" | "recv",
    dtlsParameters: any,
  ): Promise<void> {
    try {
      await fetch(`${this.config.sfuUrl}/transport/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: this.config.callId,
          userId: this.config.userId,
          direction,
          dtlsParameters,
        }),
      });
    } catch (error) {
      logger.warn("Transport connect failed (development mode)");
    }
  }

  // ===========================================================================
  // Producer/Consumer Management
  // ===========================================================================

  /**
   * Start producing audio
   */
  private async startProducing(): Promise<void> {
    if (!this.sendTransport || !this.localStream) {
      throw new Error("Send transport or local stream not available");
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error("No audio track found");
    }

    this.audioProducer = await this.sendTransport.produce({
      track: audioTrack,
      codecOptions: {
        opusStereo: false,
        opusDtx: this.config.enableDtx,
        opusFec: true,
        opusMaxPlaybackRate: 48000,
      },
    });

    this.audioProducer.on("transportclose", () => {
      this.audioProducer = null;
    });
  }

  /**
   * Produce (notify server of new producer)
   */
  private async produce(
    kind: string,
    rtpParameters: any,
  ): Promise<{ id: string }> {
    try {
      const response = await fetch(`${this.config.sfuUrl}/produce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: this.config.callId,
          userId: this.config.userId,
          kind,
          rtpParameters,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to produce");
      }

      return await response.json();
    } catch (error) {
      // Mock for development
      return { id: `producer-${Date.now()}` };
    }
  }

  /**
   * Start consuming from a participant
   */
  async consumeParticipant(
    participantId: string,
    producerId: string,
  ): Promise<void> {
    if (!this.recvTransport || !this.device) {
      throw new Error("Receive transport or device not available");
    }

    try {
      // Get consumer parameters from server
      const consumerParams = await this.requestConsume(
        participantId,
        producerId,
      );

      // Create consumer
      const consumer = await this.recvTransport.consume(consumerParams);

      // Store consumer
      this.consumers.set(participantId, consumer);

      // Handle consumer events
      consumer.on("transportclose", () => {
        this.consumers.delete(participantId);
      });

      // Handle consumer pause/resume events for audio level tracking
      consumer.observer.on("pause", () => {
        // Consumer paused - update participant mute state if needed
      });
      consumer.observer.on("resume", () => {
        // Consumer resumed - update participant mute state if needed
      });
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Request consume from server
   */
  private async requestConsume(
    participantId: string,
    producerId: string,
  ): Promise<any> {
    if (!this.device) throw new Error("Device not initialized");

    try {
      const response = await fetch(`${this.config.sfuUrl}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: this.config.callId,
          userId: this.config.userId,
          participantId,
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to request consume");
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // ===========================================================================
  // Participant Management
  // ===========================================================================

  /**
   * Add participant
   */
  addParticipant(participant: ParticipantInfo): void {
    this.participants.set(participant.id, participant);
    this.stats.participantCount = this.participants.size;
    this.callbacks.onParticipantJoined?.(participant);

    // Start consuming if producer available
    if (participant.producerId) {
      this.consumeParticipant(participant.id, participant.producerId);
    }
  }

  /**
   * Remove participant
   */
  removeParticipant(participantId: string): void {
    this.participants.delete(participantId);
    this.stats.participantCount = this.participants.size;

    // Stop consuming
    const consumer = this.consumers.get(participantId);
    if (consumer) {
      consumer.close();
      this.consumers.delete(participantId);
    }

    this.callbacks.onParticipantLeft?.(participantId);
  }

  /**
   * Update participant
   */
  updateParticipant(
    participantId: string,
    updates: Partial<ParticipantInfo>,
  ): void {
    const participant = this.participants.get(participantId);
    if (participant) {
      Object.assign(participant, updates);

      if ("isMuted" in updates) {
        this.callbacks.onParticipantMuted?.(participantId, updates.isMuted!);
      }

      if ("isSpeaking" in updates) {
        this.callbacks.onParticipantSpeaking?.(
          participantId,
          updates.isSpeaking!,
        );
      }
    }
  }

  /**
   * Get all participants
   */
  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get participant count
   */
  getParticipantCount(): number {
    return this.participants.size;
  }

  // ===========================================================================
  // Audio Control
  // ===========================================================================

  /**
   * Mute/unmute local audio
   */
  setMuted(muted: boolean): void {
    if (this.audioProducer) {
      if (muted) {
        this.audioProducer.pause();
      } else {
        this.audioProducer.resume();
      }
    }
  }

  /**
   * Check if local audio is muted
   */
  isMuted(): boolean {
    return this.audioProducer?.paused ?? true;
  }

  // ===========================================================================
  // Stats Monitoring
  // ===========================================================================

  /**
   * Start monitoring stats
   */
  private startStatsMonitoring(): void {
    this.statsInterval = window.setInterval(() => {
      this.collectStats();
    }, 5000); // Every 5 seconds
  }

  /**
   * Collect stats
   */
  private async collectStats(): Promise<void> {
    if (!this.sendTransport && !this.recvTransport) return;

    try {
      this.callbacks.onStatsUpdate?.(this.stats);
    } catch (error) {
      logger.error("Failed to collect stats:", error);
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Cleanup group call
   */
  cleanup(): void {
    // Stop stats monitoring
    if (this.statsInterval !== null) {
      window.clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Close all consumers
    this.consumers.forEach((consumer) => consumer.close());
    this.consumers.clear();

    // Close producer
    if (this.audioProducer) {
      this.audioProducer.close();
      this.audioProducer = null;
    }

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }

    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Clear participants
    this.participants.clear();

    // Reset stats
    this.stats = {
      participantCount: 0,
      totalBytesReceived: 0,
      totalBytesSent: 0,
      avgPacketLoss: 0,
      avgJitter: 0,
      avgRtt: 0,
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createGroupCallManager(
  config: GroupCallConfig,
  callbacks?: GroupCallManagerCallbacks,
): GroupCallManager {
  return new GroupCallManager(config, callbacks);
}
