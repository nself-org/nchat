/**
 * Livestream Service
 *
 * Core service for managing live streams including creation, lifecycle,
 * viewer tracking, and stream management operations.
 *
 * @module services/livestream/livestream.service
 */

import { logger } from "@/lib/logger";
import type {
  Stream,
  CreateStreamInput,
  UpdateStreamInput,
  StreamStatus,
  StreamQuality,
  StreamViewer,
  ViewerSession,
  StreamSourceConfig,
  MultiSourceConfig,
} from "./types";
import {
  StreamNotFoundError,
  StreamNotLiveError,
  StreamUnauthorizedError,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface LivestreamServiceConfig {
  apiBaseUrl?: string;
  streamIngestUrl?: string;
  hlsBaseUrl?: string;
  dashBaseUrl?: string;
}

interface StreamStore {
  streams: Map<string, Stream>;
  viewers: Map<string, Map<string, StreamViewer>>;
  sessions: Map<string, ViewerSession>;
}

// ============================================================================
// Livestream Service
// ============================================================================

export class LivestreamService {
  private config: LivestreamServiceConfig;
  private store: StreamStore;

  constructor(config: LivestreamServiceConfig = {}) {
    this.config = {
      apiBaseUrl: config.apiBaseUrl ?? "/api/streams",
      streamIngestUrl:
        config.streamIngestUrl ?? process.env.NEXT_PUBLIC_STREAM_INGEST_URL,
      hlsBaseUrl: config.hlsBaseUrl ?? process.env.NEXT_PUBLIC_HLS_BASE_URL,
      dashBaseUrl: config.dashBaseUrl ?? process.env.NEXT_PUBLIC_DASH_BASE_URL,
    };

    this.store = {
      streams: new Map(),
      viewers: new Map(),
      sessions: new Map(),
    };
  }

  // ==========================================================================
  // Stream CRUD Operations
  // ==========================================================================

  /**
   * Create a new livestream
   */
  async createStream(
    input: CreateStreamInput,
    userId: string,
  ): Promise<Stream> {
    logger.info("Creating livestream", { channelId: input.channelId, userId });

    const streamKey = this.generateStreamKey();
    const streamId = crypto.randomUUID();

    const stream: Stream = {
      id: streamId,
      channelId: input.channelId,
      broadcasterId: userId,
      title: input.title,
      description: input.description,
      thumbnailUrl: input.thumbnailUrl,
      scheduledAt: input.scheduledAt,
      status: input.scheduledAt ? "scheduled" : "preparing",
      streamKey,
      ingestUrl: `${this.config.streamIngestUrl}/live/${streamKey}`,
      maxResolution: input.maxResolution ?? "1080p",
      bitrateKbps: input.bitrateKbps ?? 6000,
      fps: input.fps ?? 30,
      isRecorded: input.isRecorded ?? true,
      peakViewerCount: 0,
      currentViewerCount: 0,
      totalViewCount: 0,
      totalChatMessages: 0,
      totalReactions: 0,
      enableChat: input.enableChat ?? true,
      enableReactions: input.enableReactions ?? true,
      enableQa: input.enableQa ?? false,
      chatMode: input.chatMode ?? "open",
      slowModeSeconds: 0,
      tags: input.tags ?? [],
      language: input.language ?? "en",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.streams.set(streamId, stream);
    this.store.viewers.set(streamId, new Map());

    return stream;
  }

  /**
   * Get stream by ID
   */
  async getStream(streamId: string): Promise<Stream> {
    const stream = this.store.streams.get(streamId);
    if (!stream) {
      throw new StreamNotFoundError(streamId);
    }
    return stream;
  }

  /**
   * Update stream
   */
  async updateStream(
    streamId: string,
    input: UpdateStreamInput,
    userId: string,
  ): Promise<Stream> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can update the stream",
      );
    }

    const updatedStream: Stream = {
      ...stream,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.store.streams.set(streamId, updatedStream);
    return updatedStream;
  }

  /**
   * Delete stream
   */
  async deleteStream(streamId: string, userId: string): Promise<void> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can delete the stream",
      );
    }

    this.store.streams.delete(streamId);
    this.store.viewers.delete(streamId);
  }

  // ==========================================================================
  // Stream Lifecycle
  // ==========================================================================

  /**
   * Start streaming (go live)
   */
  async startStream(streamId: string, userId: string): Promise<Stream> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can start the stream",
      );
    }

    if (stream.status === "live") {
      throw new StreamNotLiveError("Stream is already live");
    }

    const updatedStream: Stream = {
      ...stream,
      status: "live",
      startedAt: new Date().toISOString(),
      hlsManifestUrl: `${this.config.hlsBaseUrl}/${streamId}/index.m3u8`,
      dashManifestUrl: `${this.config.dashBaseUrl}/${streamId}/manifest.mpd`,
      updatedAt: new Date().toISOString(),
    };

    this.store.streams.set(streamId, updatedStream);
    logger.info("Stream started", { streamId, broadcasterId: userId });

    return updatedStream;
  }

  /**
   * End streaming
   */
  async endStream(streamId: string, userId: string): Promise<Stream> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can end the stream",
      );
    }

    const startedAt = stream.startedAt
      ? new Date(stream.startedAt).getTime()
      : Date.now();
    const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

    const updatedStream: Stream = {
      ...stream,
      status: "ended",
      endedAt: new Date().toISOString(),
      recordingDurationSeconds: durationSeconds,
      updatedAt: new Date().toISOString(),
    };

    this.store.streams.set(streamId, updatedStream);
    logger.info("Stream ended", { streamId, durationSeconds });

    return updatedStream;
  }

  /**
   * Cancel scheduled stream
   */
  async cancelStream(streamId: string, userId: string): Promise<Stream> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can cancel the stream",
      );
    }

    if (stream.status !== "scheduled") {
      throw new StreamNotLiveError("Only scheduled streams can be cancelled");
    }

    const updatedStream: Stream = {
      ...stream,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };

    this.store.streams.set(streamId, updatedStream);
    return updatedStream;
  }

  // ==========================================================================
  // Stream Queries
  // ==========================================================================

  /**
   * Get live streams
   */
  async getLiveStreams(channelId?: string): Promise<Stream[]> {
    const streams = Array.from(this.store.streams.values());
    return streams.filter(
      (s) => s.status === "live" && (!channelId || s.channelId === channelId),
    );
  }

  /**
   * Get scheduled streams
   */
  async getScheduledStreams(channelId?: string): Promise<Stream[]> {
    const streams = Array.from(this.store.streams.values());
    return streams
      .filter(
        (s) =>
          s.status === "scheduled" && (!channelId || s.channelId === channelId),
      )
      .sort((a, b) => {
        const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return aTime - bTime;
      });
  }

  /**
   * Get past streams
   */
  async getPastStreams(
    channelId?: string,
    limit: number = 20,
  ): Promise<Stream[]> {
    const streams = Array.from(this.store.streams.values());
    return streams
      .filter(
        (s) =>
          s.status === "ended" && (!channelId || s.channelId === channelId),
      )
      .sort((a, b) => {
        const aTime = a.endedAt ? new Date(a.endedAt).getTime() : 0;
        const bTime = b.endedAt ? new Date(b.endedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  /**
   * Get streams by broadcaster
   */
  async getBroadcasterStreams(
    userId: string,
    status?: StreamStatus,
  ): Promise<Stream[]> {
    const streams = Array.from(this.store.streams.values());
    return streams.filter(
      (s) => s.broadcasterId === userId && (!status || s.status === status),
    );
  }

  // ==========================================================================
  // Viewer Management
  // ==========================================================================

  /**
   * Join stream as viewer
   */
  async joinStream(
    streamId: string,
    sessionId: string,
    userId?: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      country?: string;
      device?: string;
      browser?: string;
    },
  ): Promise<StreamViewer> {
    const stream = await this.getStream(streamId);

    if (stream.status !== "live") {
      throw new StreamNotLiveError(streamId);
    }

    const viewers = this.store.viewers.get(streamId)!;
    const existingViewer = viewers.get(sessionId);

    if (existingViewer) {
      // Rejoin existing session
      const updatedViewer: StreamViewer = {
        ...existingViewer,
        isActive: true,
        updatedAt: new Date().toISOString(),
      };
      viewers.set(sessionId, updatedViewer);
      return updatedViewer;
    }

    const viewer: StreamViewer = {
      id: crypto.randomUUID(),
      streamId,
      userId,
      sessionId,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      country: metadata?.country,
      device: metadata?.device,
      browser: metadata?.browser,
      joinedAt: new Date().toISOString(),
      totalWatchTimeSeconds: 0,
      selectedQuality: "auto",
      sentChatMessages: 0,
      sentReactions: 0,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    viewers.set(sessionId, viewer);

    // Update stream viewer counts
    const currentCount = viewers.size;
    stream.currentViewerCount = currentCount;
    stream.totalViewCount++;
    if (currentCount > stream.peakViewerCount) {
      stream.peakViewerCount = currentCount;
    }
    this.store.streams.set(streamId, stream);

    logger.info("Viewer joined stream", {
      streamId,
      sessionId,
      viewerCount: currentCount,
    });

    return viewer;
  }

  /**
   * Leave stream as viewer
   */
  async leaveStream(streamId: string, sessionId: string): Promise<void> {
    const viewers = this.store.viewers.get(streamId);
    if (!viewers) return;

    const viewer = viewers.get(sessionId);
    if (!viewer) return;

    const joinedAt = new Date(viewer.joinedAt).getTime();
    const watchTime = Math.floor((Date.now() - joinedAt) / 1000);

    const updatedViewer: StreamViewer = {
      ...viewer,
      leftAt: new Date().toISOString(),
      totalWatchTimeSeconds: viewer.totalWatchTimeSeconds + watchTime,
      isActive: false,
      updatedAt: new Date().toISOString(),
    };

    viewers.set(sessionId, updatedViewer);

    // Update stream viewer count
    const stream = this.store.streams.get(streamId);
    if (stream) {
      const activeViewers = Array.from(viewers.values()).filter(
        (v) => v.isActive,
      );
      stream.currentViewerCount = activeViewers.length;
      this.store.streams.set(streamId, stream);
    }

    logger.info("Viewer left stream", { streamId, sessionId, watchTime });
  }

  /**
   * Get current viewer count
   */
  async getViewerCount(streamId: string): Promise<number> {
    const stream = await this.getStream(streamId);
    return stream.currentViewerCount;
  }

  /**
   * Get stream viewers
   */
  async getViewers(
    streamId: string,
    options?: {
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<StreamViewer[]> {
    const viewers = this.store.viewers.get(streamId);
    if (!viewers) return [];

    let result = Array.from(viewers.values());

    if (!options?.includeInactive) {
      result = result.filter((v) => v.isActive);
    }

    result.sort(
      (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
    );

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;

    return result.slice(offset, offset + limit);
  }

  /**
   * Update viewer quality selection
   */
  async updateViewerQuality(
    streamId: string,
    sessionId: string,
    quality: StreamQuality,
  ): Promise<void> {
    const viewers = this.store.viewers.get(streamId);
    if (!viewers) return;

    const viewer = viewers.get(sessionId);
    if (!viewer) return;

    viewers.set(sessionId, {
      ...viewer,
      selectedQuality: quality,
      updatedAt: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // Stream Key Management
  // ==========================================================================

  /**
   * Regenerate stream key
   */
  async regenerateStreamKey(streamId: string, userId: string): Promise<string> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can regenerate the stream key",
      );
    }

    const newStreamKey = this.generateStreamKey();

    const updatedStream: Stream = {
      ...stream,
      streamKey: newStreamKey,
      ingestUrl: `${this.config.streamIngestUrl}/live/${newStreamKey}`,
      updatedAt: new Date().toISOString(),
    };

    this.store.streams.set(streamId, updatedStream);
    return newStreamKey;
  }

  /**
   * Validate stream key
   */
  async validateStreamKey(streamKey: string): Promise<Stream | null> {
    for (const stream of this.store.streams.values()) {
      if (stream.streamKey === streamKey) {
        return stream;
      }
    }
    return null;
  }

  // ==========================================================================
  // Source Management
  // ==========================================================================

  /**
   * Switch stream source
   */
  async switchSource(
    streamId: string,
    userId: string,
    sourceConfig: StreamSourceConfig,
  ): Promise<void> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can switch sources",
      );
    }

    logger.info("Stream source switched", {
      streamId,
      sourceType: sourceConfig.type,
    });
  }

  /**
   * Configure multi-source layout
   */
  async configureMultiSource(
    streamId: string,
    userId: string,
    config: MultiSourceConfig,
  ): Promise<void> {
    const stream = await this.getStream(streamId);

    if (stream.broadcasterId !== userId) {
      throw new StreamUnauthorizedError(
        "Only the broadcaster can configure sources",
      );
    }

    logger.info("Multi-source configured", {
      streamId,
      layout: config.layout,
      sourceCount: config.sources.length,
    });
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Generate unique stream key
   */
  private generateStreamKey(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  /**
   * Check if user is broadcaster
   */
  isBroadcaster(stream: Stream, userId: string): boolean {
    return stream.broadcasterId === userId;
  }

  /**
   * Check if stream is live
   */
  isLive(stream: Stream): boolean {
    return stream.status === "live";
  }

  /**
   * Get stream duration in seconds
   */
  getStreamDuration(stream: Stream): number {
    if (!stream.startedAt) return 0;

    const startTime = new Date(stream.startedAt).getTime();
    const endTime = stream.endedAt
      ? new Date(stream.endedAt).getTime()
      : Date.now();

    return Math.floor((endTime - startTime) / 1000);
  }

  /**
   * Format duration as HH:MM:SS
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: LivestreamService | null = null;

/**
 * Get or create singleton livestream service instance
 */
export function getLivestreamService(
  config?: LivestreamServiceConfig,
): LivestreamService {
  if (!serviceInstance) {
    serviceInstance = new LivestreamService(config);
  }
  return serviceInstance;
}

/**
 * Create new livestream service instance
 */
export function createLivestreamService(
  config?: LivestreamServiceConfig,
): LivestreamService {
  return new LivestreamService(config);
}
