/**
 * HLS Player Manager
 *
 * Wrapper around hls.js for managing HLS video playback with adaptive
 * bitrate streaming, quality selection, and low-latency mode.
 *
 * @module lib/streaming/hls-player
 */

import Hls, { type HlsConfig, type Events } from "hls.js";
import type { BitrateLevel, HLSStats, StreamQuality } from "./stream-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface HLSPlayerConfig {
  manifestUrl: string;
  videoElement: HTMLVideoElement;
  autoStart?: boolean;
  startLevel?: number;
  lowLatencyMode?: boolean;
  maxBufferLength?: number;
  maxBufferSize?: number;
  onError?: (error: HLSPlayerError) => void;
  onQualityChange?: (level: BitrateLevel) => void;
  onStats?: (stats: HLSStats) => void;
}

export interface HLSPlayerError {
  type: "network" | "media" | "other";
  details: string;
  fatal: boolean;
  recoverable: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const QUALITY_LEVEL_MAP: Record<StreamQuality, number> = {
  "360p": 0,
  "480p": 1,
  "720p": 2,
  "1080p": 3,
  auto: -1,
};

const DEFAULT_CONFIG: Partial<HlsConfig> = {
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 90,
  maxBufferLength: 30,
  maxBufferSize: 60 * 1000 * 1000, // 60MB
  maxBufferHole: 0.5,
  highBufferWatchdogPeriod: 2,
  nudgeOffset: 0.1,
  nudgeMaxRetry: 3,
  maxFragLookUpTolerance: 0.25,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10,
  liveDurationInfinity: false,
  liveBackBufferLength: 0,
  maxMaxBufferLength: 600,
  startPosition: -1,
  startLevel: -1, // Auto
  debug: false,
  capLevelOnFPSDrop: true,
  capLevelToPlayerSize: true,
  ignoreDevicePixelRatio: false,
};

// ============================================================================
// HLS Player Manager
// ============================================================================

export class HLSPlayerManager {
  private hls: Hls | null = null;
  private videoElement: HTMLVideoElement;
  private manifestUrl: string;
  private config: HLSPlayerConfig;
  private statsInterval: number | null = null;
  private currentLevel: number = -1;
  private availableLevels: BitrateLevel[] = [];

  constructor(config: HLSPlayerConfig) {
    this.config = config;
    this.manifestUrl = config.manifestUrl;
    this.videoElement = config.videoElement;
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize HLS player and load manifest
   */
  public async initialize(): Promise<void> {
    if (!Hls.isSupported()) {
      // Fallback to native HLS support (Safari)
      if (this.videoElement.canPlayType("application/vnd.apple.mpegurl")) {
        this.videoElement.src = this.manifestUrl;
        if (this.config.autoStart) {
          await this.videoElement.play();
        }
        return;
      }

      throw new Error("HLS is not supported in this browser");
    }

    const hlsConfig: Partial<HlsConfig> = {
      ...DEFAULT_CONFIG,
      lowLatencyMode: this.config.lowLatencyMode ?? true,
      maxBufferLength: this.config.maxBufferLength ?? 30,
      maxBufferSize: this.config.maxBufferSize ?? 60 * 1000 * 1000,
      startLevel: this.config.startLevel ?? -1,
    };

    this.hls = new Hls(hlsConfig);

    this.attachEventListeners();
    this.hls.loadSource(this.manifestUrl);
    this.hls.attachMedia(this.videoElement);

    // Auto-start playback
    if (this.config.autoStart) {
      this.hls.on(Hls.Events.MANIFEST_PARSED, async () => {
        try {
          await this.videoElement.play();
        } catch (error) {
          logger.error("Failed to auto-play:", error);
        }
      });
    }

    // Start stats monitoring
    this.startStatsMonitoring();
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  private attachEventListeners(): void {
    if (!this.hls) return;

    // Manifest loaded
    this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      this.availableLevels = data.levels.map((level, index) => ({
        level: index,
        width: level.width,
        height: level.height,
        bitrate: level.bitrate,
        name: this.getLevelName(level.height),
      }));
    });

    // Level switched
    this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      this.currentLevel = data.level;
      const levelInfo = this.availableLevels[data.level];
      if (levelInfo && this.config.onQualityChange) {
        this.config.onQualityChange(levelInfo);
      }
    });

    // Error handling
    this.hls.on(Hls.Events.ERROR, (event, data) => {
      const error = this.mapHlsError(data);

      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            logger.error("Fatal network error,  trying to recover...");
            this.hls?.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            logger.error("Fatal media error,  trying to recover...");
            this.hls?.recoverMediaError();
            break;
          default:
            logger.error("Fatal error,  cannot recover");
            this.destroy();
            break;
        }
      }

      if (this.config.onError) {
        this.config.onError(error);
      }
    });

    // Fragment loading progress
    this.hls.on(Hls.Events.FRAG_LOADED, () => {
      // Fragment successfully loaded
    });

    // Buffer events for monitoring
    this.hls.on(Hls.Events.BUFFER_APPENDED, () => {
      // Buffer appended
    });
  }

  // ==========================================================================
  // Quality Control
  // ==========================================================================

  /**
   * Set quality level
   */
  public setQuality(quality: StreamQuality): void {
    if (!this.hls) return;

    if (quality === "auto") {
      this.hls.currentLevel = -1; // Enable ABR
      return;
    }

    // Find matching level by height
    const targetHeight = this.qualityToHeight(quality);
    const levelIndex = this.availableLevels.findIndex(
      (level) => level.height === targetHeight,
    );

    if (levelIndex !== -1) {
      this.hls.currentLevel = levelIndex;
    }
  }

  /**
   * Get current quality
   */
  public getCurrentQuality(): StreamQuality {
    if (!this.hls || this.currentLevel === -1) return "auto";

    const level = this.availableLevels[this.currentLevel];
    if (!level) return "auto";

    return this.heightToQuality(level.height);
  }

  /**
   * Get available quality levels
   */
  public getAvailableLevels(): BitrateLevel[] {
    return this.availableLevels;
  }

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  /**
   * Play video
   */
  public async play(): Promise<void> {
    await this.videoElement.play();
  }

  /**
   * Pause video
   */
  public pause(): void {
    this.videoElement.pause();
  }

  /**
   * Set volume (0-1)
   */
  public setVolume(volume: number): void {
    this.videoElement.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Mute/unmute
   */
  public setMuted(muted: boolean): void {
    this.videoElement.muted = muted;
  }

  /**
   * Go to live edge
   */
  public goToLive(): void {
    if (!this.hls) return;

    const duration = this.videoElement.duration;
    if (duration && isFinite(duration)) {
      this.videoElement.currentTime = duration;
    }
  }

  // ==========================================================================
  // Stats Monitoring
  // ==========================================================================

  private startStatsMonitoring(): void {
    this.statsInterval = window.setInterval(() => {
      const stats = this.getStats();
      if (stats && this.config.onStats) {
        this.config.onStats(stats);
      }
    }, 2000); // Update every 2 seconds
  }

  /**
   * Get current playback statistics
   */
  public getStats(): HLSStats | null {
    if (!this.hls) return null;

    const currentLevel = this.availableLevels[this.currentLevel];

    return {
      currentLevel: this.currentLevel,
      currentBandwidth: currentLevel?.bitrate ?? 0,
      bufferLength: this.getBufferLength(),
      droppedFrames: this.getDroppedFrames(),
      loadedFragments: 0,
      totalBytesLoaded: 0,
    };
  }

  private getBufferLength(): number {
    const buffered = this.videoElement.buffered;
    if (buffered.length === 0) return 0;

    const currentTime = this.videoElement.currentTime;
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
        return buffered.end(i) - currentTime;
      }
    }

    return 0;
  }

  private getDroppedFrames(): number {
    const videoQuality = (this.videoElement as any).getVideoPlaybackQuality?.();
    return videoQuality?.droppedVideoFrames ?? 0;
  }

  // ==========================================================================
  // Latency Control
  // ==========================================================================

  /**
   * Get current latency from live edge
   */
  public getLatency(): number {
    if (!this.hls) return 0;

    const duration = this.videoElement.duration;
    const currentTime = this.videoElement.currentTime;

    if (isFinite(duration) && isFinite(currentTime)) {
      return duration - currentTime;
    }

    return 0;
  }

  /**
   * Enable low-latency mode
   */
  public setLowLatencyMode(enabled: boolean): void {
    if (!this.hls) return;

    this.hls.config.lowLatencyMode = enabled;

    if (enabled) {
      this.hls.config.maxBufferLength = 10;
      this.hls.config.liveSyncDurationCount = 2;
      this.hls.config.liveMaxLatencyDurationCount = 5;
    } else {
      this.hls.config.maxBufferLength = 30;
      this.hls.config.liveSyncDurationCount = 3;
      this.hls.config.liveMaxLatencyDurationCount = 10;
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private qualityToHeight(quality: StreamQuality): number {
    const map: Record<StreamQuality, number> = {
      "360p": 360,
      "480p": 480,
      "720p": 720,
      "1080p": 1080,
      auto: 0,
    };
    return map[quality];
  }

  private heightToQuality(height: number): StreamQuality {
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return "360p";
  }

  private getLevelName(height: number): string {
    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return "360p";
  }

  private mapHlsError(data: any): HLSPlayerError {
    let type: "network" | "media" | "other" = "other";

    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        type = "network";
        break;
      case Hls.ErrorTypes.MEDIA_ERROR:
        type = "media";
        break;
    }

    return {
      type,
      details: data.details,
      fatal: data.fatal,
      recoverable: !data.fatal,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy player and cleanup resources
   */
  public destroy(): void {
    if (this.statsInterval) {
      window.clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.videoElement.src = "";
    this.videoElement.load();
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  public get isPlaying(): boolean {
    return !this.videoElement.paused && !this.videoElement.ended;
  }

  public get isPaused(): boolean {
    return this.videoElement.paused;
  }

  public get isLive(): boolean {
    return (
      isFinite(this.videoElement.duration) && this.videoElement.duration > 0
    );
  }

  public get volume(): number {
    return this.videoElement.volume;
  }

  public get isMuted(): boolean {
    return this.videoElement.muted;
  }

  // ==========================================================================
  // Quality Conversion Methods
  // ==========================================================================

  /**
   * Convert level index to quality name
   */
  public levelToQuality(level: number): StreamQuality {
    if (level < 0 || level >= this.availableLevels.length) return "auto";

    const levelInfo = this.availableLevels[level];
    if (!levelInfo) return "auto";

    return this.heightToQuality(levelInfo.height);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create HLS player manager instance
 */
export function createHLSPlayer(config: HLSPlayerConfig): HLSPlayerManager {
  return new HLSPlayerManager(config);
}
