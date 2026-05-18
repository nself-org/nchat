/**
 * Screen Share Service
 *
 * Comprehensive screen sharing service with:
 * - Multiple share types (screen, window, tab, region)
 * - Pause/resume functionality
 * - Source switching without stopping share
 * - Quality controls
 * - Audio sharing
 * - Event callbacks
 */

import {
  ScreenCaptureManager,
  createScreenCaptureManager,
  type ScreenCaptureOptions,
  type ScreenShare,
  type ScreenCaptureType,
  type ScreenCaptureQuality,
  supportsSystemAudio,
  getOptimalQuality,
  getBitrateForQuality,
} from "@/lib/webrtc/screen-capture";

// =============================================================================
// Types
// =============================================================================

export type ScreenShareState =
  | "idle"
  | "requesting"
  | "active"
  | "paused"
  | "switching"
  | "error";

export interface ScreenShareServiceOptions {
  /** Default quality preset */
  defaultQuality?: ScreenCaptureQuality;
  /** Default frame rate */
  defaultFrameRate?: number;
  /** Enable system audio by default */
  defaultCaptureAudio?: boolean;
  /** Auto-optimize quality based on network */
  autoOptimizeQuality?: boolean;
  /** Max shares allowed (1 for most use cases) */
  maxShares?: number;
}

export interface ScreenShareServiceCallbacks {
  /** Called when share starts */
  onShareStarted?: (share: ScreenShare) => void;
  /** Called when share stops */
  onShareStopped?: (shareId: string) => void;
  /** Called when share is paused */
  onSharePaused?: (shareId: string) => void;
  /** Called when share is resumed */
  onShareResumed?: (shareId: string) => void;
  /** Called when source is switched */
  onSourceSwitched?: (shareId: string, newType: ScreenCaptureType) => void;
  /** Called when quality changes */
  onQualityChanged?: (shareId: string, quality: ScreenCaptureQuality) => void;
  /** Called when state changes */
  onStateChanged?: (state: ScreenShareState) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called when track ends (user stopped sharing via browser) */
  onTrackEnded?: () => void;
}

export interface RegionSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShareInfo {
  id: string;
  state: ScreenShareState;
  type: ScreenCaptureType;
  quality: ScreenCaptureQuality;
  frameRate: number;
  hasAudio: boolean;
  isPaused: boolean;
  startedAt: Date;
  resolution?: { width: number; height: number };
  bitrate?: number;
}

// =============================================================================
// Default Options
// =============================================================================

const DEFAULT_OPTIONS: Required<ScreenShareServiceOptions> = {
  defaultQuality: "auto",
  defaultFrameRate: 30,
  defaultCaptureAudio: false,
  autoOptimizeQuality: true,
  maxShares: 1,
};

// =============================================================================
// Screen Share Service
// =============================================================================

export class ScreenShareService {
  private options: Required<ScreenShareServiceOptions>;
  private callbacks: ScreenShareServiceCallbacks;
  private captureManager: ScreenCaptureManager;
  private state: ScreenShareState = "idle";
  private activeShare: ScreenShare | null = null;
  private isPaused: boolean = false;
  private pausedTracks: Map<string, boolean> = new Map();
  private currentQuality: ScreenCaptureQuality = "auto";
  private currentFrameRate: number = 30;

  constructor(
    options: ScreenShareServiceOptions = {},
    callbacks: ScreenShareServiceCallbacks = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.callbacks = callbacks;
    this.currentQuality = this.options.defaultQuality;
    this.currentFrameRate = this.options.defaultFrameRate;

    this.captureManager = createScreenCaptureManager({
      onStreamStarted: (stream) => {
        // Stream started - handled in startShare
      },
      onStreamEnded: (shareId) => {
        this.handleStreamEnded(shareId);
      },
      onError: (error) => {
        this.setState("error");
        this.callbacks.onError?.(error);
      },
      onTrackEnded: (kind) => {
        if (kind === "video") {
          this.callbacks.onTrackEnded?.();
          this.stopShare();
        }
      },
    });
  }

  // ===========================================================================
  // State Management
  // ===========================================================================

  private setState(newState: ScreenShareState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChanged?.(newState);
    }
  }

  /**
   * Get current state
   */
  getState(): ScreenShareState {
    return this.state;
  }

  /**
   * Check if sharing is active
   */
  isSharing(): boolean {
    return this.state === "active" || this.state === "paused";
  }

  /**
   * Check if sharing is paused
   */
  isSharePaused(): boolean {
    return this.isPaused;
  }

  /**
   * Check if screen share is supported
   */
  static isSupported(): boolean {
    return ScreenCaptureManager.isSupported();
  }

  /**
   * Check if system audio capture is supported
   */
  static supportsSystemAudio(): boolean {
    return supportsSystemAudio();
  }

  // ===========================================================================
  // Start Share
  // ===========================================================================

  /**
   * Start screen sharing
   */
  async startShare(
    userId: string,
    userName: string,
    options: Partial<ScreenCaptureOptions> = {},
  ): Promise<ScreenShare | null> {
    if (this.isSharing()) {
      this.callbacks.onError?.(new Error("Already sharing screen"));
      return null;
    }

    this.setState("requesting");

    try {
      // Determine quality
      let quality = options.quality ?? this.currentQuality;
      if (this.options.autoOptimizeQuality && quality === "auto") {
        // Try to get network info for optimal quality
        const connection = (navigator as any).connection;
        if (connection?.downlink) {
          quality = getOptimalQuality(connection.downlink);
        }
      }

      const captureOptions: ScreenCaptureOptions = {
        quality,
        frameRate: options.frameRate ?? this.currentFrameRate,
        captureSystemAudio:
          options.captureSystemAudio ?? this.options.defaultCaptureAudio,
        captureCursor: options.captureCursor ?? true,
        allowSurfaceSwitching: options.allowSurfaceSwitching ?? true,
        type: options.type,
        preferCurrentTab: options.preferCurrentTab,
      };

      const share = await this.captureManager.startCapture(
        userId,
        userName,
        captureOptions,
      );

      this.activeShare = share;
      this.currentQuality = quality;
      this.currentFrameRate = captureOptions.frameRate ?? 30;
      this.isPaused = false;
      this.pausedTracks.clear();

      this.setState("active");
      this.callbacks.onShareStarted?.(share);

      return share;
    } catch (error) {
      this.setState("idle");
      const err =
        error instanceof Error
          ? error
          : new Error("Failed to start screen share");
      this.callbacks.onError?.(err);
      return null;
    }
  }

  /**
   * Start sharing with region selection (if supported)
   * Note: Browser APIs don't natively support region selection,
   * this is a placeholder for custom implementations
   */
  async startRegionShare(
    userId: string,
    userName: string,
    region: RegionSelection,
    options: Partial<ScreenCaptureOptions> = {},
  ): Promise<ScreenShare | null> {
    // First start a normal screen share
    const share = await this.startShare(userId, userName, {
      ...options,
      type: "screen",
    });

    if (!share) return null;

    // Note: True region selection requires custom canvas rendering
    // This is a simplified version that captures full screen
    // Real implementation would use a canvas to crop the region

    console.info(
      "Region selection requested:",
      region,
      "- Note: Native browser APIs capture full screen. Custom canvas cropping required for true region selection.",
    );

    return share;
  }

  // ===========================================================================
  // Stop Share
  // ===========================================================================

  /**
   * Stop screen sharing
   */
  stopShare(): void {
    if (!this.activeShare) return;

    const shareId = this.activeShare.id;
    this.captureManager.stopCapture(shareId);
    this.activeShare = null;
    this.isPaused = false;
    this.pausedTracks.clear();

    this.setState("idle");
    this.callbacks.onShareStopped?.(shareId);
  }

  /**
   * Handle stream ended (user stopped via browser UI)
   */
  private handleStreamEnded(shareId: string): void {
    if (this.activeShare?.id === shareId) {
      this.activeShare = null;
      this.isPaused = false;
      this.pausedTracks.clear();
      this.setState("idle");
      this.callbacks.onShareStopped?.(shareId);
    }
  }

  // ===========================================================================
  // Pause/Resume
  // ===========================================================================

  /**
   * Pause screen sharing (disables tracks but keeps stream)
   */
  pause(): boolean {
    if (!this.activeShare || this.isPaused) return false;

    const tracks = this.activeShare.stream.getTracks();
    tracks.forEach((track) => {
      this.pausedTracks.set(track.id, track.enabled);
      track.enabled = false;
    });

    this.isPaused = true;
    this.setState("paused");
    this.callbacks.onSharePaused?.(this.activeShare.id);

    return true;
  }

  /**
   * Resume screen sharing
   */
  resume(): boolean {
    if (!this.activeShare || !this.isPaused) return false;

    const tracks = this.activeShare.stream.getTracks();
    tracks.forEach((track) => {
      const wasEnabled = this.pausedTracks.get(track.id);
      track.enabled = wasEnabled ?? true;
    });

    this.pausedTracks.clear();
    this.isPaused = false;
    this.setState("active");
    this.callbacks.onShareResumed?.(this.activeShare.id);

    return true;
  }

  /**
   * Toggle pause/resume
   */
  togglePause(): boolean {
    if (this.isPaused) {
      return this.resume();
    } else {
      return this.pause();
    }
  }

  // ===========================================================================
  // Source Switching
  // ===========================================================================

  /**
   * Switch to a different screen/window/tab without stopping share
   */
  async switchSource(
    newType?: ScreenCaptureType,
    options: Partial<ScreenCaptureOptions> = {},
  ): Promise<boolean> {
    if (!this.activeShare) return false;

    const currentShare = this.activeShare;
    const userId = currentShare.userId;
    const userName = currentShare.userName;

    this.setState("switching");

    try {
      // Request new display media
      const captureOptions: ScreenCaptureOptions = {
        quality: options.quality ?? this.currentQuality,
        frameRate: options.frameRate ?? this.currentFrameRate,
        captureSystemAudio: options.captureSystemAudio ?? currentShare.hasAudio,
        captureCursor: options.captureCursor ?? true,
        allowSurfaceSwitching: true,
        type: newType,
      };

      const newShare = await this.captureManager.startCapture(
        userId,
        userName,
        captureOptions,
      );

      // Stop old share
      this.captureManager.stopCapture(currentShare.id);

      // Update reference
      this.activeShare = newShare;
      this.isPaused = false;
      this.pausedTracks.clear();

      this.setState("active");
      this.callbacks.onSourceSwitched?.(newShare.id, newShare.type);

      return true;
    } catch (error) {
      // Restore previous state
      this.setState(this.isPaused ? "paused" : "active");
      const err =
        error instanceof Error ? error : new Error("Failed to switch source");
      this.callbacks.onError?.(err);
      return false;
    }
  }

  // ===========================================================================
  // Quality Controls
  // ===========================================================================

  /**
   * Update quality setting
   */
  async setQuality(quality: ScreenCaptureQuality): Promise<boolean> {
    if (!this.activeShare) {
      this.currentQuality = quality;
      return true;
    }

    try {
      await this.captureManager.updateQuality(this.activeShare.id, quality);
      this.currentQuality = quality;
      this.callbacks.onQualityChanged?.(this.activeShare.id, quality);
      return true;
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error("Failed to update quality"),
      );
      return false;
    }
  }

  /**
   * Update frame rate
   */
  async setFrameRate(frameRate: number): Promise<boolean> {
    if (!this.activeShare) {
      this.currentFrameRate = frameRate;
      return true;
    }

    try {
      await this.captureManager.updateFrameRate(this.activeShare.id, frameRate);
      this.currentFrameRate = frameRate;
      return true;
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to update frame rate"),
      );
      return false;
    }
  }

  /**
   * Get optimal quality based on network
   */
  getOptimalQuality(): ScreenCaptureQuality {
    const connection = (navigator as any).connection;
    if (connection?.downlink) {
      return getOptimalQuality(connection.downlink);
    }
    return "auto";
  }

  /**
   * Get bitrate for current quality
   */
  getCurrentBitrate(): number {
    return getBitrateForQuality(this.currentQuality);
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  /**
   * Get current share info
   */
  getShareInfo(): ShareInfo | null {
    if (!this.activeShare) return null;

    const settings = this.captureManager.getVideoSettings(this.activeShare.id);

    return {
      id: this.activeShare.id,
      state: this.state,
      type: this.activeShare.type,
      quality: this.currentQuality,
      frameRate: this.currentFrameRate,
      hasAudio: this.activeShare.hasAudio,
      isPaused: this.isPaused,
      startedAt: this.activeShare.startedAt,
      resolution: settings
        ? { width: settings.width ?? 0, height: settings.height ?? 0 }
        : undefined,
      bitrate: this.getCurrentBitrate(),
    };
  }

  /**
   * Get active share stream
   */
  getStream(): MediaStream | null {
    return this.activeShare?.stream ?? null;
  }

  /**
   * Get video track
   */
  getVideoTrack(): MediaStreamTrack | null {
    return this.activeShare?.videoTrack ?? null;
  }

  /**
   * Get audio track (if capturing system audio)
   */
  getAudioTrack(): MediaStreamTrack | null {
    return this.activeShare?.audioTrack ?? null;
  }

  /**
   * Get video settings
   */
  getVideoSettings(): MediaTrackSettings | null {
    if (!this.activeShare) return null;
    return this.captureManager.getVideoSettings(this.activeShare.id);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopShare();
    this.captureManager.cleanup();
    this.setState("idle");
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createScreenShareService(
  options?: ScreenShareServiceOptions,
  callbacks?: ScreenShareServiceCallbacks,
): ScreenShareService {
  return new ScreenShareService(options, callbacks);
}

// =============================================================================
// Re-exports
// =============================================================================

export {
  type ScreenCaptureOptions,
  type ScreenShare,
  type ScreenCaptureType,
  type ScreenCaptureQuality,
  supportsSystemAudio,
  getOptimalQuality,
  getBitrateForQuality,
};
