/**
 * Live Streaming Types
 *
 * Comprehensive type definitions for the live streaming system including
 * streams, viewers, quality metrics, and interactive features.
 *
 * @module lib/streaming/stream-types
 */

// ============================================================================
// Stream Enums
// ============================================================================

export type StreamStatus =
  | "scheduled"
  | "preparing"
  | "live"
  | "ended"
  | "cancelled";

export type StreamQuality = "auto" | "1080p" | "720p" | "480p" | "360p";

export type ChatMode = "open" | "followers" | "subscribers" | "disabled";

// ============================================================================
// Stream Interfaces
// ============================================================================

export interface Stream {
  id: string;
  channelId: string;
  broadcasterId: string;

  // Stream Details
  title: string;
  description?: string;
  thumbnailUrl?: string;

  // Scheduling
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;

  // Status
  status: StreamStatus;

  // Streaming Configuration
  streamKey?: string;
  ingestUrl?: string;
  hlsManifestUrl?: string;

  // Quality Settings
  maxResolution: StreamQuality;
  bitrateKbps: number;
  fps: number;

  // Recording
  isRecorded: boolean;
  recordingUrl?: string;
  recordingDurationSeconds?: number;

  // Statistics
  peakViewerCount: number;
  totalViewCount: number;
  totalChatMessages: number;
  totalReactions: number;

  // Interactive Features
  enableChat: boolean;
  enableReactions: boolean;
  enableQa: boolean;
  chatMode: ChatMode;

  // Metadata
  tags?: string[];
  language: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CreateStreamInput {
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
  maxResolution?: StreamQuality;
  enableChat?: boolean;
  enableReactions?: boolean;
  enableQa?: boolean;
  chatMode?: ChatMode;
  tags?: string[];
}

export interface UpdateStreamInput {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
  maxResolution?: StreamQuality;
  enableChat?: boolean;
  enableReactions?: boolean;
  enableQa?: boolean;
  chatMode?: ChatMode;
  tags?: string[];
}

// ============================================================================
// Viewer Interfaces
// ============================================================================

export interface StreamViewer {
  id: string;
  streamId: string;
  userId?: string;
  sessionId: string;

  // Viewer Info
  ipAddress?: string;
  userAgent?: string;

  // Viewing Session
  joinedAt: string;
  leftAt?: string;
  totalWatchTimeSeconds: number;

  // Quality Selection
  selectedQuality: StreamQuality;

  // Engagement
  sentChatMessages: number;
  sentReactions: number;

  // Timestamps
  updatedAt: string;
}

export interface JoinStreamInput {
  streamId: string;
  sessionId: string;
  selectedQuality?: StreamQuality;
}

// ============================================================================
// Quality Metrics Interfaces
// ============================================================================

export interface StreamQualityMetrics {
  id: string;
  streamId: string;
  recordedAt: string;

  // Viewer Metrics
  currentViewerCount: number;
  concurrentConnections: number;

  // Quality Metrics
  bitrateKbps?: number;
  fps?: number;
  resolution?: string;
  droppedFrames: number;

  // Network Metrics
  uploadBitrateKbps?: number;
  latencyMs?: number;
  packetLossPercent?: number;

  // Health
  healthScore?: number;
}

export interface RecordQualityMetricsInput {
  streamId: string;
  currentViewerCount: number;
  concurrentConnections: number;
  bitrateKbps?: number;
  fps?: number;
  resolution?: string;
  droppedFrames?: number;
  uploadBitrateKbps?: number;
  latencyMs?: number;
  packetLossPercent?: number;
  healthScore?: number;
}

// ============================================================================
// Chat Interfaces
// ============================================================================

export interface StreamChatMessage {
  id: string;
  streamId: string;
  userId?: string;
  content: string;
  isPinned: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;

  // User details (joined)
  user?: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface SendStreamChatInput {
  streamId: string;
  content: string;
}

// ============================================================================
// Reaction Interfaces
// ============================================================================

export interface StreamReaction {
  id: string;
  streamId: string;
  userId?: string;
  emoji: string;
  positionX?: number;
  positionY?: number;
  createdAt: string;

  // User details (joined)
  user?: {
    id: string;
    displayName?: string;
  };
}

export interface SendStreamReactionInput {
  streamId: string;
  emoji: string;
  positionX?: number;
  positionY?: number;
}

// ============================================================================
// Stream Summary Interfaces
// ============================================================================

export interface LiveStreamSummary extends Stream {
  currentViewers: number;
}

export interface TopStream extends Stream {
  rank?: number;
}

// ============================================================================
// WebRTC Signaling
// ============================================================================

export interface StreamSignal {
  type: "offer" | "answer" | "ice-candidate";
  streamId: string;
  userId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// ============================================================================
// HLS Configuration
// ============================================================================

export interface HLSConfig {
  manifestUrl: string;
  autoQuality: boolean;
  maxBufferLength: number;
  maxBufferSize: number;
  lowLatencyMode: boolean;
  startLevel?: number;
}

export interface HLSStats {
  currentLevel: number;
  currentBandwidth: number;
  bufferLength: number;
  droppedFrames: number;
  loadedFragments: number;
  totalBytesLoaded: number;
}

// ============================================================================
// Adaptive Bitrate
// ============================================================================

export interface BitrateLevel {
  level: number;
  width: number;
  height: number;
  bitrate: number;
  name: string;
}

export interface ABRConfig {
  minAutoBitrate: number;
  maxAutoBitrate: number;
  bufferBasedABR: boolean;
  bandwidthEstimator: "ewma" | "sliding-window";
}

// ============================================================================
// Stream Analytics
// ============================================================================

export interface StreamAnalytics {
  streamId: string;
  duration: number;
  peakViewers: number;
  averageViewers: number;
  totalViews: number;
  averageWatchTime: number;
  chatMessages: number;
  reactions: number;
  qualityIssues: number;
  buffering: {
    count: number;
    totalDuration: number;
  };
  engagement: {
    chatRate: number;
    reactionRate: number;
  };
}

// ============================================================================
// Socket Events
// ============================================================================

export interface StreamSocketEvents {
  // Broadcaster events
  "stream:start": { streamId: string; hlsManifestUrl: string };
  "stream:end": { streamId: string; reason: string };
  "stream:quality-update": StreamQualityMetrics;

  // Viewer events
  "stream:viewer-joined": {
    streamId: string;
    viewerId: string;
    viewerCount: number;
  };
  "stream:viewer-left": {
    streamId: string;
    viewerId: string;
    viewerCount: number;
  };
  "stream:viewer-count": { streamId: string; count: number };

  // Chat events
  "stream:chat-message": StreamChatMessage;
  "stream:chat-deleted": { messageId: string };
  "stream:chat-pinned": { messageId: string };

  // Reaction events
  "stream:reaction": StreamReaction;

  // Error events
  "stream:error": { streamId: string; error: string };
}

export type StreamSocketEvent = keyof StreamSocketEvents;

// ============================================================================
// Error Types
// ============================================================================

export class StreamError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "StreamError";
  }
}

export class StreamNotFoundError extends StreamError {
  constructor(streamId: string) {
    super(`Stream not found: ${streamId}`, "STREAM_NOT_FOUND", 404);
  }
}

export class StreamNotLiveError extends StreamError {
  constructor(streamId: string) {
    super(`Stream is not live: ${streamId}`, "STREAM_NOT_LIVE", 400);
  }
}

export class StreamUnauthorizedError extends StreamError {
  constructor(message: string = "Unauthorized") {
    super(message, "STREAM_UNAUTHORIZED", 403);
  }
}

export class StreamIngestError extends StreamError {
  constructor(message: string) {
    super(`Stream ingest error: ${message}`, "STREAM_INGEST_ERROR", 500);
  }
}
