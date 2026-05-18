/**
 * Screen Capture Manager
 *
 * Handles screen, window, and tab capture using getDisplayMedia API.
 * Supports system audio capture, quality controls, multiple streams,
 * pause/resume, source switching, and multi-share management.
 */

// =============================================================================
// Types
// =============================================================================

export type ScreenCaptureType = "screen" | "window" | "tab";

export type ScreenCaptureQuality = "auto" | "720p" | "1080p" | "4k";

export type ScreenFitMode = "contain" | "cover" | "fill" | "none";

export type SharePermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

export interface ScreenCaptureConstraints {
  video: {
    displaySurface?: ScreenCaptureType;
    width?: { ideal: number; max?: number };
    height?: { ideal: number; max?: number };
    frameRate?: { ideal: number; max?: number };
    cursor?: "always" | "motion" | "never";
    logicalSurface?: boolean;
  };
  audio:
    | boolean
    | {
        echoCancellation?: boolean;
        noiseSuppression?: boolean;
        sampleRate?: number;
        channelCount?: number;
        autoGainControl?: boolean;
        suppressLocalAudioPlayback?: boolean;
      };
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  surfaceSwitching?: "include" | "exclude";
  systemAudio?: "include" | "exclude";
}

export interface ScreenCaptureOptions {
  type?: ScreenCaptureType;
  quality?: ScreenCaptureQuality;
  frameRate?: number;
  captureSystemAudio?: boolean;
  captureCursor?: boolean;
  preferCurrentTab?: boolean;
  allowSurfaceSwitching?: boolean;
}

export interface ScreenShare {
  id: string;
  stream: MediaStream;
  type: ScreenCaptureType;
  userId: string;
  userName: string;
  startedAt: Date;
  hasAudio: boolean;
  videoTrack: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  isPaused: boolean;
  quality: ScreenCaptureQuality;
  frameRate: number;
}

export interface ScreenCaptureCallbacks {
  onStreamStarted?: (stream: MediaStream) => void;
  onStreamEnded?: (streamId: string) => void;
  onStreamPaused?: (streamId: string) => void;
  onStreamResumed?: (streamId: string) => void;
  onSourceSwitched?: (streamId: string, newType: ScreenCaptureType) => void;
  onError?: (error: Error) => void;
  onTrackEnded?: (kind: "video" | "audio") => void;
  onPermissionDenied?: () => void;
  onQualityChanged?: (streamId: string, quality: ScreenCaptureQuality) => void;
}

// Multi-share management types
export interface ShareRequest {
  id: string;
  userId: string;
  userName: string;
  requestedAt: Date;
  status: "pending" | "approved" | "denied";
}

export interface MultiShareConfig {
  maxConcurrentShares: number;
  allowMultipleSharers: boolean;
  requireHostApproval: boolean;
  presenterMode: boolean;
}

export interface PerformanceMetrics {
  cpuUsage: number;
  frameDropRate: number;
  currentBitrate: number;
  recommendedQuality: ScreenCaptureQuality;
}

// =============================================================================
// Quality Presets
// =============================================================================

const QUALITY_PRESETS: Record<
  ScreenCaptureQuality,
  { width: number; height: number; frameRate: number }
> = {
  auto: { width: 1920, height: 1080, frameRate: 30 },
  "720p": { width: 1280, height: 720, frameRate: 30 },
  "1080p": { width: 1920, height: 1080, frameRate: 30 },
  "4k": { width: 3840, height: 2160, frameRate: 60 },
};

// =============================================================================
// Screen Capture Manager
// =============================================================================

export class ScreenCaptureManager {
  private streams: Map<string, ScreenShare> = new Map();
  private callbacks: ScreenCaptureCallbacks;
  private streamCounter = 0;
  private shareRequests: Map<string, ShareRequest> = new Map();
  private multiShareConfig: MultiShareConfig = {
    maxConcurrentShares: 1,
    allowMultipleSharers: false,
    requireHostApproval: false,
    presenterMode: false,
  };
  private performanceMonitorInterval: NodeJS.Timeout | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  constructor(callbacks: ScreenCaptureCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Configure multi-share settings
   */
  configureMultiShare(config: Partial<MultiShareConfig>): void {
    this.multiShareConfig = { ...this.multiShareConfig, ...config };
  }

  /**
   * Get current multi-share configuration
   */
  getMultiShareConfig(): MultiShareConfig {
    return { ...this.multiShareConfig };
  }

  /**
   * Check if screen capture is supported
   */
  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      "mediaDevices" in navigator &&
      "getDisplayMedia" in navigator.mediaDevices
    );
  }

  /**
   * Build constraints from options
   */
  private buildConstraints(
    options: ScreenCaptureOptions = {},
  ): ScreenCaptureConstraints {
    const {
      type,
      quality = "auto",
      frameRate,
      captureSystemAudio = false,
      captureCursor = true,
      preferCurrentTab = false,
      allowSurfaceSwitching = true,
    } = options;

    const preset = QUALITY_PRESETS[quality];

    const constraints: ScreenCaptureConstraints = {
      video: {
        width: { ideal: preset.width, max: preset.width * 1.5 },
        height: { ideal: preset.height, max: preset.height * 1.5 },
        frameRate: { ideal: frameRate ?? preset.frameRate, max: 60 },
        cursor: captureCursor ? "always" : "never",
        logicalSurface: true,
      },
      audio: false,
      preferCurrentTab,
      selfBrowserSurface: "exclude",
      surfaceSwitching: allowSurfaceSwitching ? "include" : "exclude",
      systemAudio: captureSystemAudio ? "include" : "exclude",
    };

    // Add type preference if specified
    if (type) {
      constraints.video.displaySurface = type;
    }

    // Enable audio capture if requested
    if (captureSystemAudio) {
      constraints.audio = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false,
      };
    }

    return constraints;
  }

  /**
   * Start screen capture
   */
  async startCapture(
    userId: string,
    userName: string,
    options: ScreenCaptureOptions = {},
  ): Promise<ScreenShare> {
    if (!ScreenCaptureManager.isSupported()) {
      const error = new Error(
        "Screen capture is not supported in this browser",
      );
      this.callbacks.onError?.(error);
      throw error;
    }

    try {
      const constraints = this.buildConstraints(options);

      // Request display media
      const stream = await navigator.mediaDevices.getDisplayMedia(
        constraints as MediaStreamConstraints,
      );

      // Generate unique ID
      const id = `screen-${++this.streamCounter}-${Date.now()}`;

      // Get tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (!videoTrack) {
        throw new Error("No video track in screen share stream");
      }

      // Detect capture type from settings
      const settings = videoTrack.getSettings();
      const type = (settings.displaySurface as ScreenCaptureType) || "screen";

      // Create screen share object
      const screenShare: ScreenShare = {
        id,
        stream,
        type,
        userId,
        userName,
        startedAt: new Date(),
        hasAudio: !!audioTrack,
        videoTrack,
        audioTrack,
        isPaused: false,
        quality: options.quality || "auto",
        frameRate:
          options.frameRate ||
          QUALITY_PRESETS[options.quality || "auto"].frameRate,
      };

      // Store screen share
      this.streams.set(id, screenShare);

      // Listen for track ended events
      videoTrack.addEventListener("ended", () => {
        this.handleTrackEnded(id, "video");
      });

      if (audioTrack) {
        audioTrack.addEventListener("ended", () => {
          this.handleTrackEnded(id, "audio");
        });
      }

      // Notify callback
      this.callbacks.onStreamStarted?.(stream);

      return screenShare;
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error("Failed to start screen capture");
      this.callbacks.onError?.(err);
      throw err;
    }
  }

  /**
   * Stop a specific screen share
   */
  stopCapture(shareId: string): void {
    const share = this.streams.get(shareId);
    if (!share) return;

    // Stop all tracks
    share.stream.getTracks().forEach((track) => track.stop());

    // Remove from map
    this.streams.delete(shareId);

    // Notify callback
    this.callbacks.onStreamEnded?.(shareId);
  }

  /**
   * Stop all screen shares
   */
  stopAllCaptures(): void {
    this.streams.forEach((_, id) => this.stopCapture(id));
  }

  /**
   * Get active screen share
   */
  getScreenShare(shareId: string): ScreenShare | undefined {
    return this.streams.get(shareId);
  }

  /**
   * Get all active screen shares
   */
  getAllScreenShares(): ScreenShare[] {
    return Array.from(this.streams.values());
  }

  /**
   * Update capture quality dynamically
   */
  async updateQuality(
    shareId: string,
    quality: ScreenCaptureQuality,
    frameRate?: number,
  ): Promise<void> {
    const share = this.streams.get(shareId);
    if (!share) return;

    const preset = QUALITY_PRESETS[quality];

    try {
      await share.videoTrack.applyConstraints({
        width: { ideal: preset.width, max: preset.width * 1.5 },
        height: { ideal: preset.height, max: preset.height * 1.5 },
        frameRate: { ideal: frameRate ?? preset.frameRate, max: 60 },
      });
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error("Failed to update quality"),
      );
    }
  }

  /**
   * Update frame rate dynamically
   */
  async updateFrameRate(shareId: string, frameRate: number): Promise<void> {
    const share = this.streams.get(shareId);
    if (!share) return;

    try {
      await share.videoTrack.applyConstraints({
        frameRate: { ideal: frameRate, max: 60 },
      });
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error
          ? error
          : new Error("Failed to update frame rate"),
      );
    }
  }

  /**
   * Get current video settings
   */
  getVideoSettings(shareId: string): MediaTrackSettings | null {
    const share = this.streams.get(shareId);
    if (!share) return null;

    return share.videoTrack.getSettings();
  }

  /**
   * Check if a screen share is active
   */
  isActive(shareId: string): boolean {
    const share = this.streams.get(shareId);
    if (!share) return false;

    return share.videoTrack.readyState === "live";
  }

  /**
   * Get active screen share count
   */
  getActiveCount(): number {
    return this.streams.size;
  }

  /**
   * Handle track ended event
   */
  private handleTrackEnded(shareId: string, kind: "video" | "audio"): void {
    this.callbacks.onTrackEnded?.(kind);

    // If video track ended, stop the entire share
    if (kind === "video") {
      this.stopCapture(shareId);
    }
  }

  // ==========================================================================
  // Pause/Resume Methods
  // ==========================================================================

  /**
   * Pause screen share (disables video track but keeps stream active)
   */
  pauseCapture(shareId: string): boolean {
    const share = this.streams.get(shareId);
    if (!share || share.isPaused) return false;

    share.videoTrack.enabled = false;
    if (share.audioTrack) {
      share.audioTrack.enabled = false;
    }
    share.isPaused = true;
    this.callbacks.onStreamPaused?.(shareId);
    return true;
  }

  /**
   * Resume a paused screen share
   */
  resumeCapture(shareId: string): boolean {
    const share = this.streams.get(shareId);
    if (!share || !share.isPaused) return false;

    share.videoTrack.enabled = true;
    if (share.audioTrack) {
      share.audioTrack.enabled = true;
    }
    share.isPaused = false;
    this.callbacks.onStreamResumed?.(shareId);
    return true;
  }

  /**
   * Toggle pause state
   */
  togglePause(shareId: string): boolean {
    const share = this.streams.get(shareId);
    if (!share) return false;

    if (share.isPaused) {
      return this.resumeCapture(shareId);
    } else {
      return this.pauseCapture(shareId);
    }
  }

  /**
   * Check if share is paused
   */
  isPaused(shareId: string): boolean {
    const share = this.streams.get(shareId);
    return share?.isPaused ?? false;
  }

  // ==========================================================================
  // Source Switching
  // ==========================================================================

  /**
   * Switch to a different share source (requires new getDisplayMedia call)
   */
  async switchSource(
    shareId: string,
    options: ScreenCaptureOptions = {},
  ): Promise<ScreenShare | null> {
    const currentShare = this.streams.get(shareId);
    if (!currentShare) return null;

    try {
      const constraints = this.buildConstraints(options);

      // Request new display media
      const newStream = await navigator.mediaDevices.getDisplayMedia(
        constraints as MediaStreamConstraints,
      );

      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];

      if (!newVideoTrack) {
        throw new Error("No video track in new screen share stream");
      }

      // Stop old tracks
      currentShare.videoTrack.stop();
      if (currentShare.audioTrack) {
        currentShare.audioTrack.stop();
      }

      // Detect new capture type
      const settings = newVideoTrack.getSettings();
      const newType =
        (settings.displaySurface as ScreenCaptureType) || "screen";

      // Update share object
      currentShare.stream = newStream;
      currentShare.videoTrack = newVideoTrack;
      currentShare.audioTrack = newAudioTrack;
      currentShare.type = newType;
      currentShare.hasAudio = !!newAudioTrack;
      currentShare.isPaused = false;

      // Attach new track listeners
      newVideoTrack.addEventListener("ended", () => {
        this.handleTrackEnded(shareId, "video");
      });

      if (newAudioTrack) {
        newAudioTrack.addEventListener("ended", () => {
          this.handleTrackEnded(shareId, "audio");
        });
      }

      this.callbacks.onSourceSwitched?.(shareId, newType);
      return currentShare;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to switch source");
      this.callbacks.onError?.(err);
      return null;
    }
  }

  // ==========================================================================
  // Multi-Share Management (Group Calls)
  // ==========================================================================

  /**
   * Request permission to share screen (for non-host users)
   */
  requestSharePermission(userId: string, userName: string): ShareRequest {
    const request: ShareRequest = {
      id: `request-${Date.now()}-${Math.random()}`,
      userId,
      userName,
      requestedAt: new Date(),
      status: "pending",
    };
    this.shareRequests.set(request.id, request);
    return request;
  }

  /**
   * Approve a share request (host only)
   */
  approveShareRequest(requestId: string): boolean {
    const request = this.shareRequests.get(requestId);
    if (!request || request.status !== "pending") return false;

    request.status = "approved";
    return true;
  }

  /**
   * Deny a share request (host only)
   */
  denyShareRequest(requestId: string): boolean {
    const request = this.shareRequests.get(requestId);
    if (!request || request.status !== "pending") return false;

    request.status = "denied";
    return true;
  }

  /**
   * Get all pending share requests
   */
  getPendingRequests(): ShareRequest[] {
    return Array.from(this.shareRequests.values()).filter(
      (r) => r.status === "pending",
    );
  }

  /**
   * Check if user can start sharing based on multi-share config
   */
  canUserShare(userId: string): { allowed: boolean; reason?: string } {
    const {
      maxConcurrentShares,
      allowMultipleSharers,
      requireHostApproval,
      presenterMode,
    } = this.multiShareConfig;

    // Check max concurrent shares
    if (this.streams.size >= maxConcurrentShares) {
      return { allowed: false, reason: "Maximum concurrent shares reached" };
    }

    // Check if user is already sharing
    const userAlreadySharing = Array.from(this.streams.values()).some(
      (s) => s.userId === userId,
    );
    if (userAlreadySharing) {
      return { allowed: false, reason: "You are already sharing" };
    }

    // Check if multiple sharers allowed
    if (!allowMultipleSharers && this.streams.size > 0) {
      return { allowed: false, reason: "Only one person can share at a time" };
    }

    // Check presenter mode
    if (presenterMode && this.streams.size > 0) {
      return {
        allowed: false,
        reason: "Presenter mode active - only presenter can share",
      };
    }

    // Check host approval requirement
    if (requireHostApproval) {
      const approvedRequest = Array.from(this.shareRequests.values()).find(
        (r) => r.userId === userId && r.status === "approved",
      );
      if (!approvedRequest) {
        return { allowed: false, reason: "Host approval required" };
      }
    }

    return { allowed: true };
  }

  /**
   * Get current presenter (first sharer in presenter mode)
   */
  getCurrentPresenter(): ScreenShare | null {
    if (!this.multiShareConfig.presenterMode) return null;
    const shares = Array.from(this.streams.values());
    return shares.length > 0 ? shares[0] : null;
  }

  /**
   * Set presenter mode - only one user can share at a time
   */
  setPresenterMode(enabled: boolean): void {
    this.multiShareConfig.presenterMode = enabled;
    if (enabled && this.streams.size > 1) {
      // Stop all shares except the first one
      const shares = Array.from(this.streams.entries());
      shares.slice(1).forEach(([id]) => this.stopCapture(id));
    }
  }

  // ==========================================================================
  // Permission Handling
  // ==========================================================================

  /**
   * Check screen share permission status
   */
  static async checkPermission(): Promise<SharePermissionStatus> {
    if (!ScreenCaptureManager.isSupported()) {
      return "unsupported";
    }

    // Unfortunately, there's no standard way to check screen share permission
    // We can only attempt to get display media and catch the error
    // For desktop apps (Electron/Tauri), we can check system permissions

    if (typeof window !== "undefined") {
      // Check for desktop app permission APIs
      const win = window as Window & {
        electron?: {
          systemPreferences?: {
            getMediaAccessStatus?: (type: string) => string;
          };
        };
        __TAURI__?: { invoke?: <T>(cmd: string) => Promise<T> };
      };

      // Electron permission check
      if (win.electron?.systemPreferences?.getMediaAccessStatus) {
        const status =
          win.electron.systemPreferences.getMediaAccessStatus("screen");
        if (status === "granted") return "granted";
        if (status === "denied") return "denied";
        return "prompt";
      }

      // Tauri permission check (if implemented)
      if (win.__TAURI__?.invoke) {
        try {
          const hasPermission = await win.__TAURI__.invoke<boolean>(
            "check_screen_permission",
          );
          return hasPermission ? "granted" : "prompt";
        } catch {
          // Permission check not available
        }
      }
    }

    // For web, we can't check without prompting
    return "prompt";
  }

  /**
   * Request screen share permission (for desktop apps)
   */
  static async requestPermission(): Promise<SharePermissionStatus> {
    if (!ScreenCaptureManager.isSupported()) {
      return "unsupported";
    }

    if (typeof window !== "undefined") {
      const win = window as Window & {
        electron?: {
          systemPreferences?: {
            askForMediaAccess?: (type: string) => Promise<boolean>;
          };
        };
        __TAURI__?: { invoke?: <T>(cmd: string) => Promise<T> };
      };

      // Electron permission request
      if (win.electron?.systemPreferences?.askForMediaAccess) {
        const granted =
          await win.electron.systemPreferences.askForMediaAccess("screen");
        return granted ? "granted" : "denied";
      }

      // Tauri permission request
      if (win.__TAURI__?.invoke) {
        try {
          const granted = await win.__TAURI__.invoke<boolean>(
            "request_screen_permission",
          );
          return granted ? "granted" : "denied";
        } catch {
          // Fall through to web method
        }
      }
    }

    // For web, attempt to get display media as permission request
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      // Immediately stop the stream - we just wanted to trigger permission
      stream.getTracks().forEach((track) => track.stop());
      return "granted";
    } catch (error) {
      if ((error as Error).name === "NotAllowedError") {
        return "denied";
      }
      return "prompt";
    }
  }

  // ==========================================================================
  // Performance Monitoring
  // ==========================================================================

  /**
   * Start monitoring CPU usage and frame rate
   */
  startPerformanceMonitoring(intervalMs: number = 1000): void {
    if (this.performanceMonitorInterval) {
      this.stopPerformanceMonitoring();
    }

    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    this.performanceMonitorInterval = setInterval(() => {
      this.checkPerformance();
    }, intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring(): void {
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
      this.performanceMonitorInterval = null;
    }
  }

  /**
   * Check current performance and adjust quality if needed
   */
  private async checkPerformance(): Promise<void> {
    const metrics = await this.getPerformanceMetrics();

    // Auto-reduce quality if CPU is high or frames are dropping
    if (metrics.cpuUsage > 80 || metrics.frameDropRate > 0.1) {
      for (const [shareId, share] of this.streams) {
        if (metrics.recommendedQuality !== share.quality) {
          await this.updateQuality(shareId, metrics.recommendedQuality);
          share.quality = metrics.recommendedQuality;
          this.callbacks.onQualityChanged?.(
            shareId,
            metrics.recommendedQuality,
          );
        }
      }
    }
  }

  /**
   * Get current performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    let cpuUsage = 0;
    let frameDropRate = 0;
    let currentBitrate = 0;

    // Try to get CPU usage (not available in all browsers)
    if ("getBattery" in navigator) {
      // Indirect CPU estimation - not accurate but gives some indication
      // In real implementation, would use WebRTC stats
    }

    // Calculate frame drop rate from video track stats
    for (const share of this.streams.values()) {
      const settings = share.videoTrack.getSettings();
      const targetFrameRate = settings.frameRate || 30;

      // Get frame stats if available (WebRTC RTCPeerConnection needed for accurate stats)
      // This is a simplified estimation
      const elapsed = (performance.now() - this.lastFrameTime) / 1000;
      if (elapsed > 0) {
        const expectedFrames = targetFrameRate * elapsed;
        const actualFrames = this.frameCount;
        frameDropRate = Math.max(
          0,
          (expectedFrames - actualFrames) / expectedFrames,
        );
      }
    }

    // Determine recommended quality based on metrics
    let recommendedQuality: ScreenCaptureQuality = "auto";
    if (cpuUsage > 80 || frameDropRate > 0.2) {
      recommendedQuality = "720p";
    } else if (cpuUsage > 60 || frameDropRate > 0.1) {
      recommendedQuality = "1080p";
    } else if (cpuUsage < 30 && frameDropRate < 0.05) {
      recommendedQuality = "4k";
    }

    return {
      cpuUsage,
      frameDropRate,
      currentBitrate,
      recommendedQuality,
    };
  }

  /**
   * Increment frame counter (call this from video element's timeupdate or frame callback)
   */
  recordFrame(): void {
    this.frameCount++;
  }

  /**
   * Reset frame counter
   */
  resetFrameCounter(): void {
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopPerformanceMonitoring();
    this.stopAllCaptures();
    this.streams.clear();
    this.shareRequests.clear();
    this.streamCounter = 0;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createScreenCaptureManager(
  callbacks: ScreenCaptureCallbacks = {},
): ScreenCaptureManager {
  return new ScreenCaptureManager(callbacks);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check browser support for system audio capture
 */
export function supportsSystemAudio(): boolean {
  // Chrome/Edge support system audio
  const isChrome =
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
  const isEdge = /Edg/.test(navigator.userAgent);

  return isChrome || isEdge;
}

/**
 * Get optimal quality based on network conditions
 */
export function getOptimalQuality(
  downlinkMbps: number = 10,
): ScreenCaptureQuality {
  if (downlinkMbps >= 20) return "4k";
  if (downlinkMbps >= 10) return "1080p";
  if (downlinkMbps >= 5) return "720p";
  return "auto";
}

/**
 * Calculate bitrate for quality
 */
export function getBitrateForQuality(quality: ScreenCaptureQuality): number {
  const bitrates: Record<ScreenCaptureQuality, number> = {
    auto: 2500, // 2.5 Mbps
    "720p": 1500, // 1.5 Mbps
    "1080p": 2500, // 2.5 Mbps
    "4k": 8000, // 8 Mbps
  };

  return bitrates[quality];
}
