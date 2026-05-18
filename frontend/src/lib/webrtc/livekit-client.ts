/**
 * LiveKit Client Utilities
 *
 * Centralized LiveKit client initialization and configuration for
 * voice/video calls and live streaming.
 */

import {
  Room,
  RoomOptions,
  VideoPresets,
  Track,
  RoomEvent,
  ConnectionState,
} from "livekit-client";
import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface LiveKitConfig {
  /** LiveKit server URL */
  url: string;
  /** Access token */
  token: string;
  /** Room name */
  roomName: string;
  /** Participant identity */
  identity: string;
  /** Participant name */
  name?: string;
  /** Participant metadata */
  metadata?: string;
}

export interface LiveKitCallbacks {
  /** Called when connection state changes */
  onConnectionStateChange?: (state: ConnectionState) => void;
  /** Called when a participant connects */
  onParticipantConnected?: (participantId: string) => void;
  /** Called when a participant disconnects */
  onParticipantDisconnected?: (participantId: string) => void;
  /** Called when local or remote track is published */
  onTrackPublished?: (track: Track) => void;
  /** Called when local or remote track is unpublished */
  onTrackUnpublished?: (track: Track) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// =============================================================================
// Default Room Options
// =============================================================================

const DEFAULT_ROOM_OPTIONS: RoomOptions = {
  // Adaptive stream (automatic quality adjustment)
  adaptiveStream: true,

  // Dynacast (selective forward based on layer subscription)
  dynacast: true,

  // Publish defaults
  publishDefaults: {
    videoSimulcastLayers: [VideoPresets.h540, VideoPresets.h216],
    audioPreset: {
      maxBitrate: 64000,
    },
    dtx: true, // Discontinuous transmission for audio
    red: true, // Redundant encoding for audio
  },
};

// =============================================================================
// LiveKit Client Manager
// =============================================================================

export class LiveKitClient {
  private room: Room | null = null;
  private config: LiveKitConfig | null = null;
  private callbacks: LiveKitCallbacks = {};

  /**
   * Initialize and connect to a LiveKit room
   */
  async connect(
    config: LiveKitConfig,
    callbacks: LiveKitCallbacks = {},
  ): Promise<Room> {
    this.config = config;
    this.callbacks = callbacks;

    logger.info("[LiveKit] Connecting to room", {
      url: config.url,
      room: config.roomName,
      identity: config.identity,
    });

    try {
      // Create room instance
      this.room = new Room(DEFAULT_ROOM_OPTIONS);

      // Set up event listeners
      this.setupEventListeners();

      // Connect to room
      await this.room.connect(config.url, config.token);

      logger.info("[LiveKit] Connected successfully");
      return this.room;
    } catch (error) {
      logger.error("[LiveKit] Connection failed", error);
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Disconnect from the room
   */
  async disconnect(): Promise<void> {
    if (!this.room) return;

    logger.info("[LiveKit] Disconnecting from room");

    try {
      await this.room.disconnect();
      this.room = null;
      this.config = null;
      logger.info("[LiveKit] Disconnected successfully");
    } catch (error) {
      logger.error("[LiveKit] Disconnect error", error);
      throw error;
    }
  }

  /**
   * Publish local audio/video tracks
   */
  async publishTracks(
    audio: boolean = true,
    video: boolean = false,
  ): Promise<void> {
    if (!this.room) throw new Error("Not connected to room");

    logger.info("[LiveKit] Publishing tracks", { audio, video });

    try {
      if (audio) {
        await this.room.localParticipant.setMicrophoneEnabled(true);
      }

      if (video) {
        await this.room.localParticipant.setCameraEnabled(true);
      }

      logger.info("[LiveKit] Tracks published successfully");
    } catch (error) {
      logger.error("[LiveKit] Failed to publish tracks", error);
      throw error;
    }
  }

  /**
   * Toggle microphone
   */
  async toggleMicrophone(): Promise<boolean> {
    if (!this.room) throw new Error("Not connected to room");

    const enabled = !this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(enabled);

    logger.info("[LiveKit] Microphone toggled", { enabled });
    return enabled;
  }

  /**
   * Toggle camera
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.room) throw new Error("Not connected to room");

    const enabled = !this.room.localParticipant.isCameraEnabled;
    await this.room.localParticipant.setCameraEnabled(enabled);

    logger.info("[LiveKit] Camera toggled", { enabled });
    return enabled;
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    if (!this.room) throw new Error("Not connected to room");

    logger.info("[LiveKit] Starting screen share");

    try {
      await this.room.localParticipant.setScreenShareEnabled(true);
      logger.info("[LiveKit] Screen share started");
    } catch (error) {
      logger.error("[LiveKit] Failed to start screen share", error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.room) throw new Error("Not connected to room");

    logger.info("[LiveKit] Stopping screen share");

    try {
      await this.room.localParticipant.setScreenShareEnabled(false);
      logger.info("[LiveKit] Screen share stopped");
    } catch (error) {
      logger.error("[LiveKit] Failed to stop screen share", error);
      throw error;
    }
  }

  /**
   * Switch camera (front/back on mobile)
   */
  async switchCamera(): Promise<void> {
    if (!this.room) throw new Error("Not connected to room");

    logger.info("[LiveKit] Switching camera");

    try {
      const publication = this.room.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      if (publication?.track) {
        // Get current facing mode
        const track = publication.track.mediaStreamTrack as MediaStreamTrack;
        const settings = track.getSettings();
        const currentFacingMode = settings.facingMode || "user";

        // Toggle between user and environment
        const newFacingMode =
          currentFacingMode === "user" ? "environment" : "user";

        // Stop current track and start new one with different facing mode
        await this.room.localParticipant.setCameraEnabled(false);
        await this.room.localParticipant.setCameraEnabled(true, {
          facingMode: newFacingMode,
        });

        logger.info("[LiveKit] Camera switched", {
          from: currentFacingMode,
          to: newFacingMode,
        });
      }
    } catch (error) {
      logger.error("[LiveKit] Failed to switch camera", error);
      throw error;
    }
  }

  /**
   * Get room instance
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  /**
   * Set up event listeners for the room
   */
  private setupEventListeners(): void {
    if (!this.room) return;

    // Connection state changes
    this.room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      logger.info("[LiveKit] Connection state changed", { state });
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(state);
      }
    });

    // Participant connected
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      logger.info("[LiveKit] Participant connected", {
        identity: participant.identity,
        name: participant.name,
      });
      if (this.callbacks.onParticipantConnected) {
        this.callbacks.onParticipantConnected(participant.identity);
      }
    });

    // Participant disconnected
    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      logger.info("[LiveKit] Participant disconnected", {
        identity: participant.identity,
      });
      if (this.callbacks.onParticipantDisconnected) {
        this.callbacks.onParticipantDisconnected(participant.identity);
      }
    });

    // Track published
    this.room.on(RoomEvent.TrackPublished, (publication, participant) => {
      logger.info("[LiveKit] Track published", {
        participant: participant.identity,
        track: publication.trackName,
      });
      if (this.callbacks.onTrackPublished && publication.track) {
        this.callbacks.onTrackPublished(publication.track);
      }
    });

    // Track unpublished
    this.room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      logger.info("[LiveKit] Track unpublished", {
        participant: participant.identity,
        track: publication.trackName,
      });
      if (this.callbacks.onTrackUnpublished && publication.track) {
        this.callbacks.onTrackUnpublished(publication.track);
      }
    });

    // Connection quality changed
    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      logger.debug("[LiveKit] Connection quality changed", {
        participant: participant.identity,
        quality,
      });
    });

    // Reconnecting
    this.room.on(RoomEvent.Reconnecting, () => {
      logger.warn("[LiveKit] Reconnecting...");
    });

    // Reconnected
    this.room.on(RoomEvent.Reconnected, () => {
      logger.info("[LiveKit] Reconnected successfully");
    });

    // Disconnected
    this.room.on(RoomEvent.Disconnected, (reason) => {
      logger.info("[LiveKit] Disconnected", { reason });
    });

    // Error
    this.room.on(RoomEvent.MediaDevicesError, (error: Error) => {
      logger.error("[LiveKit] Media devices error", error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
    });
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let liveKitClientInstance: LiveKitClient | null = null;

/**
 * Get or create LiveKit client singleton
 */
export function getLiveKitClient(): LiveKitClient {
  if (!liveKitClientInstance) {
    liveKitClientInstance = new LiveKitClient();
  }
  return liveKitClientInstance;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get LiveKit token from backend
 */
export async function getLiveKitToken(
  roomName: string,
  participantName: string,
): Promise<string> {
  try {
    const response = await fetch("/api/livekit/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roomName,
        participantName,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get LiveKit token");
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    logger.error("[LiveKit] Failed to get token", error);
    throw error;
  }
}
