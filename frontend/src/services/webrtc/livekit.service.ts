/**
 * LiveKit Service
 *
 * Handles LiveKit server-side operations:
 * - Token generation for calls and streams
 * - Room management
 * - Recording control
 * - Egress (HLS streaming)
 */

import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  Room,
  VideoGrant,
  EncodedFileType,
  EncodingOptionsPreset,
  RoomCompositeEgressRequest,
  RoomCompositeOptions,
} from "livekit-server-sdk";

export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export interface TokenOptions {
  identity: string;
  name: string;
  metadata?: string;
  roomName: string;
  grants?: Partial<VideoGrant>;
  ttl?: number; // Time to live in seconds
}

export interface CreateRoomOptions {
  name: string;
  emptyTimeout?: number;
  maxParticipants?: number;
  metadata?: string;
}

export interface StartRecordingOptions {
  roomName: string;
  layout?: "grid" | "speaker" | "single";
  audioOnly?: boolean;
  resolution?: "720p" | "1080p" | "4k";
  outputFormat?: "mp4" | "webm";
}

export interface StartStreamOptions {
  roomName: string;
  outputs: {
    rtmpUrl?: string;
    hlsPlaylistName?: string;
  };
}

export class LiveKitService {
  private config: LiveKitConfig;
  private roomService: RoomServiceClient;
  private egressClient: EgressClient;

  constructor(config?: LiveKitConfig) {
    // Use environment variables if config not provided
    this.config = config || {
      url: process.env.LIVEKIT_URL || "ws://localhost:7880",
      apiKey: process.env.LIVEKIT_API_KEY || "",
      apiSecret: process.env.LIVEKIT_API_SECRET || "",
    };

    this.roomService = new RoomServiceClient(
      this.config.url,
      this.config.apiKey,
      this.config.apiSecret,
    );

    this.egressClient = new EgressClient(
      this.config.url,
      this.config.apiKey,
      this.config.apiSecret,
    );
  }

  /**
   * Generate access token for a participant
   */
  async generateToken(options: TokenOptions): Promise<string> {
    const {
      identity,
      name,
      metadata,
      roomName,
      grants = {},
      ttl = 3600, // 1 hour default
    } = options;

    const at = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity,
      name,
      metadata,
      ttl: `${ttl}s`,
    });

    // Default grants
    const videoGrant: VideoGrant = {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      ...grants,
    };

    at.addGrant(videoGrant);

    return at.toJwt();
  }

  /**
   * Create a new room
   */
  async createRoom(options: CreateRoomOptions): Promise<Room> {
    const {
      name,
      emptyTimeout = 300,
      maxParticipants = 100,
      metadata,
    } = options;

    const room = await this.roomService.createRoom({
      name,
      emptyTimeout,
      maxParticipants,
      metadata,
    });

    return room;
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName: string): Promise<void> {
    await this.roomService.deleteRoom(roomName);
  }

  /**
   * List all rooms
   */
  async listRooms(): Promise<Room[]> {
    const rooms = await this.roomService.listRooms();
    return rooms;
  }

  /**
   * Get room details
   */
  async getRoom(roomName: string): Promise<Room | undefined> {
    const rooms = await this.roomService.listRooms([roomName]);
    return rooms[0];
  }

  /**
   * List participants in a room
   */
  async listParticipants(roomName: string) {
    const participants = await this.roomService.listParticipants(roomName);
    return participants;
  }

  /**
   * Remove a participant from a room
   */
  async removeParticipant(roomName: string, identity: string): Promise<void> {
    await this.roomService.removeParticipant(roomName, identity);
  }

  /**
   * Mute/unmute a participant's track
   */
  async mutePublishedTrack(
    roomName: string,
    identity: string,
    trackSid: string,
    muted: boolean,
  ): Promise<void> {
    await this.roomService.mutePublishedTrack(
      roomName,
      identity,
      trackSid,
      muted,
    );
  }

  /**
   * Start recording a room
   */
  async startRecording(options: StartRecordingOptions): Promise<string> {
    const {
      roomName,
      layout = "grid",
      audioOnly = false,
      resolution = "1080p",
      outputFormat = "mp4",
    } = options;

    // Configure resolution
    const resolutionMap = {
      "720p": { width: 1280, height: 720 },
      "1080p": { width: 1920, height: 1080 },
      "4k": { width: 3840, height: 2160 },
    };

    const { width, height } = resolutionMap[resolution];

    // Configure layout
    const layoutOptions: RoomCompositeOptions = {
      layout: layout,
      audioOnly: audioOnly,
    };

    // Configure encoding
    const preset =
      resolution === "4k"
        ? EncodingOptionsPreset.H264_1080P_30
        : resolution === "1080p"
          ? EncodingOptionsPreset.H264_1080P_30
          : EncodingOptionsPreset.H264_720P_30;

    const egressRequest = {
      roomName,
      layout: layout,
      audioOnly,
      videoOnly: false,
      customBaseUrl: "",
      file: {
        fileType:
          outputFormat === "mp4" ? EncodedFileType.MP4 : EncodedFileType.OGG,
        filepath: `recordings/${roomName}-{time}.${outputFormat}`,
      },
      options: preset as any,
    } as any;

    const egress = await this.egressClient.startRoomCompositeEgress(
      roomName,
      egressRequest,
    );

    return egress.egressId;
  }

  /**
   * Stop recording
   */
  async stopRecording(egressId: string): Promise<void> {
    await this.egressClient.stopEgress(egressId);
  }

  /**
   * Get egress info (recording status)
   */
  async getEgressInfo(egressId: string) {
    const info = await this.egressClient.listEgress({ egressId });
    return info[0];
  }

  /**
   * Start HLS streaming from a room
   */
  async startHLSStream(
    roomName: string,
    playlistName?: string,
  ): Promise<string> {
    const egress = await this.egressClient.startRoomCompositeEgress(roomName, {
      roomName,
      layout: "speaker",
      segmentOutputs: [
        {
          filenamePrefix: playlistName || roomName,
          playlistName: `${playlistName || roomName}.m3u8`,
          segmentDuration: 6,
        },
      ],
    } as any);

    return egress.egressId;
  }

  /**
   * Stop HLS streaming
   */
  async stopHLSStream(egressId: string): Promise<void> {
    await this.egressClient.stopEgress(egressId);
  }

  /**
   * Generate TURN credentials for TURN server
   */
  generateTURNCredentials(username: string): {
    username: string;
    credential: string;
    ttl: number;
  } {
    // Generate time-limited TURN credentials
    const ttl = 86400; // 24 hours
    const timestamp = Math.floor(Date.now() / 1000) + ttl;
    const turnUsername = `${timestamp}:${username}`;

    // HMAC-SHA1 for TURN credential
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha1", this.config.apiSecret);
    hmac.update(turnUsername);
    const credential = hmac.digest("base64");

    return {
      username: turnUsername,
      credential,
      ttl,
    };
  }

  /**
   * Get ICE servers configuration including TURN
   */
  getICEServers(username: string): RTCIceServer[] {
    const turnCreds = this.generateTURNCredentials(username);

    return [
      // Public STUN servers
      {
        urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
      },
      // Self-hosted TURN server (if configured)
      ...(process.env.TURN_SERVER_URL
        ? [
            {
              urls: [
                `turn:${process.env.TURN_SERVER_URL}:3478`,
                `turns:${process.env.TURN_SERVER_URL}:5349`,
              ],
              username: turnCreds.username,
              credential: turnCreds.credential,
            },
          ]
        : []),
    ];
  }

  /**
   * Send data message to room
   */
  async sendDataToRoom(
    roomName: string,
    data: Uint8Array | string,
    options?: {
      destinationIdentities?: string[];
      topic?: string;
    },
  ): Promise<void> {
    const payload =
      typeof data === "string" ? new TextEncoder().encode(data) : data;

    await (this.roomService.sendData as any)(
      roomName,
      payload,
      options?.destinationIdentities,
      options?.topic,
    );
  }

  /**
   * Update room metadata
   */
  async updateRoomMetadata(roomName: string, metadata: string): Promise<void> {
    await this.roomService.updateRoomMetadata(roomName, metadata);
  }

  /**
   * Update participant metadata
   */
  async updateParticipantMetadata(
    roomName: string,
    identity: string,
    metadata: string,
  ): Promise<void> {
    await this.roomService.updateParticipant(roomName, identity, metadata);
  }
}

// Singleton instance
let livekitService: LiveKitService | null = null;

/**
 * Get LiveKit service instance
 */
export function getLiveKitService(): LiveKitService {
  if (!livekitService) {
    livekitService = new LiveKitService();
  }
  return livekitService;
}

export default LiveKitService;
