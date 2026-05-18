/**
 * Livestream Service Types
 *
 * Comprehensive type definitions for the livestream/webcast module
 * including streams, viewers, moderation, and analytics.
 *
 * @module services/livestream/types
 */

// ============================================================================
// Stream Types
// ============================================================================

export type StreamStatus =
  | "scheduled"
  | "preparing"
  | "live"
  | "ended"
  | "cancelled";
export type StreamQuality = "auto" | "1080p" | "720p" | "480p" | "360p";
export type ChatMode = "open" | "followers" | "subscribers" | "disabled";
export type StreamSource = "camera" | "screen" | "external" | "multi-source";
export type IngestType = "webrtc" | "rtmp" | "srt";

export interface Stream {
  id: string;
  channelId: string;
  broadcasterId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  status: StreamStatus;
  streamKey: string;
  ingestUrl: string;
  hlsManifestUrl?: string;
  dashManifestUrl?: string;
  maxResolution: StreamQuality;
  bitrateKbps: number;
  fps: number;
  isRecorded: boolean;
  recordingUrl?: string;
  recordingDurationSeconds?: number;
  peakViewerCount: number;
  currentViewerCount: number;
  totalViewCount: number;
  totalChatMessages: number;
  totalReactions: number;
  enableChat: boolean;
  enableReactions: boolean;
  enableQa: boolean;
  chatMode: ChatMode;
  slowModeSeconds: number;
  tags?: string[];
  language: string;
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
  bitrateKbps?: number;
  fps?: number;
  enableChat?: boolean;
  enableReactions?: boolean;
  enableQa?: boolean;
  chatMode?: ChatMode;
  isRecorded?: boolean;
  tags?: string[];
  language?: string;
}

export interface UpdateStreamInput {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  scheduledAt?: string;
  maxResolution?: StreamQuality;
  bitrateKbps?: number;
  fps?: number;
  enableChat?: boolean;
  enableReactions?: boolean;
  enableQa?: boolean;
  chatMode?: ChatMode;
  slowModeSeconds?: number;
  tags?: string[];
}

// ============================================================================
// Stream Source Types
// ============================================================================

export interface StreamSourceConfig {
  type: StreamSource;
  deviceId?: string;
  constraints?: MediaStreamConstraints;
  externalUrl?: string;
}

export interface MultiSourceConfig {
  sources: StreamSourceConfig[];
  activeSourceIndex: number;
  layout: "pip" | "side-by-side" | "grid" | "single";
}

// ============================================================================
// Viewer Types
// ============================================================================

export interface StreamViewer {
  id: string;
  streamId: string;
  userId?: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  joinedAt: string;
  leftAt?: string;
  totalWatchTimeSeconds: number;
  selectedQuality: StreamQuality;
  sentChatMessages: number;
  sentReactions: number;
  isActive: boolean;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface ViewerSession {
  sessionId: string;
  streamId: string;
  userId?: string;
  joinedAt: string;
  leftAt?: string;
  qualityChanges: QualityChangeEvent[];
  bufferingEvents: BufferingEvent[];
  watchSegments: WatchSegment[];
}

export interface QualityChangeEvent {
  timestamp: string;
  fromQuality: StreamQuality;
  toQuality: StreamQuality;
  reason: "manual" | "auto-adaptive";
}

export interface BufferingEvent {
  startTime: string;
  endTime?: string;
  durationMs?: number;
}

export interface WatchSegment {
  startTime: string;
  endTime?: string;
  durationSeconds: number;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface StreamAnalytics {
  streamId: string;
  duration: number;
  peakViewers: number;
  averageViewers: number;
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  chatMessages: number;
  reactions: number;
  reactionsByType: Record<string, number>;
  qualityBreakdown: Record<StreamQuality, number>;
  geographicBreakdown: GeographicStats[];
  deviceBreakdown: DeviceStats[];
  engagement: EngagementStats;
  quality: QualityStats;
}

export interface GeographicStats {
  country: string;
  region?: string;
  viewers: number;
  percentage: number;
}

export interface DeviceStats {
  device: string;
  browser: string;
  os: string;
  viewers: number;
  percentage: number;
}

export interface EngagementStats {
  chatRate: number;
  reactionRate: number;
  averageMessageLength: number;
  participationRate: number;
  retentionRate: number;
}

export interface QualityStats {
  averageBitrate: number;
  averageFps: number;
  bufferingRatio: number;
  healthScore: number;
  qualityDrops: number;
}

export interface RealTimeAnalytics {
  currentViewers: number;
  viewerDelta: number;
  peakViewers: number;
  totalViews: number;
  chatMessagesPerMinute: number;
  reactionsPerMinute: number;
  averageWatchTime: number;
  bufferingRatio: number;
  healthScore: number;
}

// ============================================================================
// Moderation Types
// ============================================================================

export type ModerationAction =
  | "warn"
  | "timeout"
  | "ban"
  | "unban"
  | "delete_message";

export interface StreamModerator {
  id: string;
  streamId: string;
  userId: string;
  addedBy: string;
  addedAt: string;
  permissions: ModeratorPermissions;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface ModeratorPermissions {
  canDeleteMessages: boolean;
  canTimeoutUsers: boolean;
  canBanUsers: boolean;
  canSlowMode: boolean;
  canSubscriberOnlyMode: boolean;
  canPinMessages: boolean;
}

export interface StreamBan {
  id: string;
  streamId: string;
  userId: string;
  moderatorId: string;
  reason?: string;
  isPermanent: boolean;
  expiresAt?: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName?: string;
  };
}

export interface StreamTimeout {
  id: string;
  streamId: string;
  userId: string;
  moderatorId: string;
  reason?: string;
  durationSeconds: number;
  expiresAt: string;
  createdAt: string;
}

export interface ModerationLog {
  id: string;
  streamId: string;
  moderatorId: string;
  targetUserId?: string;
  action: ModerationAction;
  reason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AutoModConfig {
  enabled: boolean;
  profanityFilter: boolean;
  spamDetection: boolean;
  linkBlocking: boolean;
  capsLimit: number;
  emoteLimit: number;
  duplicateDetection: boolean;
  minAccountAge?: number;
  blockedWords: string[];
  allowedLinks: string[];
}

// ============================================================================
// Recording Types
// ============================================================================

export interface StreamRecording {
  id: string;
  streamId: string;
  status: "recording" | "processing" | "ready" | "failed";
  url?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  format: "mp4" | "webm" | "hls";
  qualities: RecordingQuality[];
  createdAt: string;
  completedAt?: string;
}

export interface RecordingQuality {
  quality: StreamQuality;
  url: string;
  sizeBytes: number;
  bitrate: number;
}

export interface RecordingTrim {
  startSeconds: number;
  endSeconds: number;
}

export interface ClipConfig {
  startSeconds: number;
  durationSeconds: number;
  title?: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface StreamChatMessage {
  id: string;
  streamId: string;
  userId?: string;
  content: string;
  isPinned: boolean;
  isDeleted: boolean;
  isHighlighted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isModerator?: boolean;
    isSubscriber?: boolean;
  };
}

export interface SendChatMessageInput {
  streamId: string;
  content: string;
}

// ============================================================================
// Reaction Types
// ============================================================================

export interface StreamReaction {
  id: string;
  streamId: string;
  userId?: string;
  emoji: string;
  reactionType: string;
  positionX?: number;
  positionY?: number;
  createdAt: string;
  user?: {
    id: string;
    displayName?: string;
  };
}

export interface ReactionBurst {
  emoji: string;
  count: number;
  startTime: string;
  endTime: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface StreamEvent {
  type: StreamEventType;
  streamId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export type StreamEventType =
  | "stream:created"
  | "stream:started"
  | "stream:ended"
  | "stream:updated"
  | "viewer:joined"
  | "viewer:left"
  | "viewer:count"
  | "chat:message"
  | "chat:deleted"
  | "chat:pinned"
  | "reaction:sent"
  | "moderation:action"
  | "quality:changed"
  | "recording:started"
  | "recording:stopped";

// ============================================================================
// Error Types
// ============================================================================

export class LivestreamError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "LivestreamError";
  }
}

export class StreamNotFoundError extends LivestreamError {
  constructor(streamId: string) {
    super(`Stream not found: ${streamId}`, "STREAM_NOT_FOUND", 404);
  }
}

export class StreamNotLiveError extends LivestreamError {
  constructor(streamId: string) {
    super(`Stream is not live: ${streamId}`, "STREAM_NOT_LIVE", 400);
  }
}

export class StreamUnauthorizedError extends LivestreamError {
  constructor(message: string = "Unauthorized") {
    super(message, "STREAM_UNAUTHORIZED", 403);
  }
}

export class ViewerBannedError extends LivestreamError {
  constructor(userId: string, streamId: string) {
    super(
      `User ${userId} is banned from stream ${streamId}`,
      "VIEWER_BANNED",
      403,
    );
  }
}

export class ChatDisabledError extends LivestreamError {
  constructor(streamId: string) {
    super(`Chat is disabled for stream: ${streamId}`, "CHAT_DISABLED", 403);
  }
}

export class SlowModeError extends LivestreamError {
  constructor(waitSeconds: number) {
    super(`Slow mode active. Wait ${waitSeconds} seconds`, "SLOW_MODE", 429);
  }
}
