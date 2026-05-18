/**
 * Stream Manager
 *
 * High-level API for managing live streams including creation, scheduling,
 * going live, and ending streams. Handles database operations and real-time updates.
 *
 * @module lib/streaming/stream-manager
 */

import type {
  Stream,
  CreateStreamInput,
  UpdateStreamInput,
  StreamStatus,
  StreamQuality,
} from "./stream-types";

// ============================================================================
// Types
// ============================================================================

export interface StreamManagerConfig {
  apiBaseUrl?: string;
  onStreamCreated?: (stream: Stream) => void;
  onStreamStarted?: (stream: Stream) => void;
  onStreamEnded?: (stream: Stream) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Stream Manager
// ============================================================================

export class StreamManager {
  private config: StreamManagerConfig;
  private apiBaseUrl: string;

  constructor(config: StreamManagerConfig = {}) {
    this.config = config;
    this.apiBaseUrl = config.apiBaseUrl ?? "/api/streams";
  }

  // ==========================================================================
  // Stream CRUD Operations
  // ==========================================================================

  /**
   * Create new stream
   */
  public async createStream(input: CreateStreamInput): Promise<Stream> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create stream: ${response.statusText}`);
      }

      const stream: Stream = await response.json();
      this.config.onStreamCreated?.(stream);

      return stream;
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get stream by ID
   */
  public async getStream(streamId: string): Promise<Stream> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}`);

      if (!response.ok) {
        throw new Error(`Failed to get stream: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Update stream
   */
  public async updateStream(
    streamId: string,
    input: UpdateStreamInput,
  ): Promise<Stream> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to update stream: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Delete stream
   */
  public async deleteStream(streamId: string): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete stream: ${response.statusText}`);
      }
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // Stream Lifecycle
  // ==========================================================================

  /**
   * Start stream (go live)
   */
  public async startStream(streamId: string): Promise<Stream> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to start stream: ${response.statusText}`);
      }

      const stream: Stream = await response.json();
      this.config.onStreamStarted?.(stream);

      return stream;
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * End stream
   */
  public async endStream(streamId: string): Promise<Stream> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}/end`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to end stream: ${response.statusText}`);
      }

      const stream: Stream = await response.json();
      this.config.onStreamEnded?.(stream);

      return stream;
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Cancel scheduled stream
   */
  public async cancelStream(streamId: string): Promise<Stream> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel stream: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // Stream Queries
  // ==========================================================================

  /**
   * Get live streams
   */
  public async getLiveStreams(channelId?: string): Promise<Stream[]> {
    try {
      const url = channelId
        ? `${this.apiBaseUrl}/live?channelId=${channelId}`
        : `${this.apiBaseUrl}/live`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to get live streams: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get scheduled streams
   */
  public async getScheduledStreams(channelId?: string): Promise<Stream[]> {
    try {
      const url = channelId
        ? `${this.apiBaseUrl}/scheduled?channelId=${channelId}`
        : `${this.apiBaseUrl}/scheduled`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to get scheduled streams: ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get past streams (ended with recordings)
   */
  public async getPastStreams(
    channelId?: string,
    limit: number = 20,
  ): Promise<Stream[]> {
    try {
      const params = new URLSearchParams({
        ...(channelId && { channelId }),
        limit: limit.toString(),
      });

      const url = `${this.apiBaseUrl}/past?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to get past streams: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get user's streams (as broadcaster)
   */
  public async getUserStreams(
    userId: string,
    status?: StreamStatus,
  ): Promise<Stream[]> {
    try {
      const params = new URLSearchParams({
        userId,
        ...(status && { status }),
      });

      const url = `${this.apiBaseUrl}?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to get user streams: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // Viewer Operations
  // ==========================================================================

  /**
   * Get current viewer count
   */
  public async getViewerCount(streamId: string): Promise<number> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}/viewers`);

      if (!response.ok) {
        throw new Error(`Failed to get viewer count: ${response.statusText}`);
      }

      const data = await response.json();
      return data.count ?? 0;
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // HLS Configuration
  // ==========================================================================

  /**
   * Get HLS manifest URL
   */
  public async getHlsManifestUrl(streamId: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${streamId}/hls`);

      if (!response.ok) {
        throw new Error(`Failed to get HLS manifest: ${response.statusText}`);
      }

      const data = await response.json();
      return data.manifestUrl;
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // Stream Key Management
  // ==========================================================================

  /**
   * Regenerate stream key
   */
  public async regenerateStreamKey(streamId: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/${streamId}/regenerate-key`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to regenerate stream key: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.streamKey;
    } catch (error) {
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if stream is live
   */
  public isStreamLive(stream: Stream): boolean {
    return stream.status === "live";
  }

  /**
   * Check if stream is scheduled
   */
  public isStreamScheduled(stream: Stream): boolean {
    return stream.status === "scheduled";
  }

  /**
   * Check if stream has ended
   */
  public hasStreamEnded(stream: Stream): boolean {
    return stream.status === "ended";
  }

  /**
   * Get stream duration (if ended)
   */
  public getStreamDuration(stream: Stream): number | null {
    if (!stream.startedAt || !stream.endedAt) return null;

    const start = new Date(stream.startedAt).getTime();
    const end = new Date(stream.endedAt).getTime();

    return Math.floor((end - start) / 1000); // seconds
  }

  /**
   * Format stream duration
   */
  public formatDuration(seconds: number): string {
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
// Factory Function
// ============================================================================

/**
 * Create stream manager instance
 */
export function createStreamManager(
  config: StreamManagerConfig = {},
): StreamManager {
  return new StreamManager(config);
}

// ============================================================================
// Singleton Instance
// ============================================================================

let managerInstance: StreamManager | null = null;

/**
 * Get or create singleton stream manager instance
 */
export function getStreamManager(
  config: StreamManagerConfig = {},
): StreamManager {
  if (!managerInstance) {
    managerInstance = new StreamManager(config);
  }
  return managerInstance;
}
