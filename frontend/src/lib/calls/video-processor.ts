/**
 * Video Processor
 *
 * Handles video stream processing including quality adaptation,
 * frame rate control, and preprocessing for background effects.
 */

// =============================================================================
// Types
// =============================================================================

export type VideoQuality = "180p" | "360p" | "720p" | "1080p";
export type VideoFPS = 15 | 24 | 30 | 60;

export interface VideoQualityProfile {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number; // kbps
}

export interface VideoProcessorOptions {
  quality?: VideoQuality;
  fps?: VideoFPS;
  enableSimulcast?: boolean;
  maxBandwidth?: number; // kbps
  adaptiveQuality?: boolean;
}

export interface VideoStats {
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  timestamp: number;
}

export interface ProcessedVideoFrame {
  data: ImageData;
  timestamp: number;
  width: number;
  height: number;
}

// =============================================================================
// Constants
// =============================================================================

export const VIDEO_QUALITY_PROFILES: Record<VideoQuality, VideoQualityProfile> =
  {
    "180p": { width: 320, height: 180, frameRate: 15, bitrate: 150 },
    "360p": { width: 640, height: 360, frameRate: 24, bitrate: 400 },
    "720p": { width: 1280, height: 720, frameRate: 30, bitrate: 1500 },
    "1080p": { width: 1920, height: 1080, frameRate: 30, bitrate: 3000 },
  };

export const SIMULCAST_LAYERS = [
  { rid: "f", scaleResolutionDownBy: 1.0, maxBitrate: 3000000 }, // Full resolution
  { rid: "h", scaleResolutionDownBy: 2.0, maxBitrate: 1000000 }, // Half resolution
  { rid: "q", scaleResolutionDownBy: 4.0, maxBitrate: 300000 }, // Quarter resolution
];

// =============================================================================
// Video Processor Class
// =============================================================================

export class VideoProcessor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentQuality: VideoQuality = "720p";
  private currentFPS: VideoFPS = 30;
  private processingEnabled: boolean = false;
  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 30; // Default 30fps
  private stats: VideoStats | null = null;
  private adaptiveQualityEnabled: boolean = true;
  private videoElement: HTMLVideoElement | null = null;

  constructor(options: VideoProcessorOptions = {}) {
    this.currentQuality = options.quality ?? "720p";
    this.currentFPS = options.fps ?? 30;
    this.frameInterval = 1000 / this.currentFPS;
    this.adaptiveQualityEnabled = options.adaptiveQuality ?? true;

    // Create canvas for processing
    if (typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", {
        willReadFrequently: true,
        alpha: false,
      });
    }
  }

  // ===========================================================================
  // Quality Management
  // ===========================================================================

  setQuality(quality: VideoQuality): void {
    this.currentQuality = quality;
  }

  getQuality(): VideoQuality {
    return this.currentQuality;
  }

  getQualityProfile(): VideoQualityProfile {
    return VIDEO_QUALITY_PROFILES[this.currentQuality];
  }

  setFPS(fps: VideoFPS): void {
    this.currentFPS = fps;
    this.frameInterval = 1000 / fps;
  }

  getFPS(): VideoFPS {
    return this.currentFPS;
  }

  // ===========================================================================
  // Video Stream Processing
  // ===========================================================================

  async processStream(
    stream: MediaStream,
    processFn?: (frame: ProcessedVideoFrame) => ImageData | null,
  ): Promise<MediaStream> {
    if (!this.canvas || !this.ctx) {
      throw new Error("Canvas not initialized");
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error("No video track found in stream");
    }

    // Create video element to read frames
    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = new MediaStream([videoTrack]);
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    await this.videoElement.play();

    const profile = this.getQualityProfile();
    this.canvas.width = profile.width;
    this.canvas.height = profile.height;

    // Start processing frames
    this.processingEnabled = true;
    this.processFrame(processFn);

    // Create new stream from canvas
    const processedStream = this.canvas.captureStream(this.currentFPS);

    // Copy audio tracks if present
    stream.getAudioTracks().forEach((track) => {
      processedStream.addTrack(track);
    });

    return processedStream;
  }

  private processFrame(
    processFn?: (frame: ProcessedVideoFrame) => ImageData | null,
  ): void {
    if (
      !this.processingEnabled ||
      !this.videoElement ||
      !this.canvas ||
      !this.ctx
    ) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.frameInterval) {
      // Draw video frame to canvas
      this.ctx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );

      // Get frame data
      const imageData = this.ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );

      const frame: ProcessedVideoFrame = {
        data: imageData,
        timestamp: now,
        width: this.canvas.width,
        height: this.canvas.height,
      };

      // Apply custom processing if provided
      if (processFn) {
        const processed = processFn(frame);
        if (processed) {
          this.ctx.putImageData(processed, 0, 0);
        }
      }

      this.lastFrameTime = now - (elapsed % this.frameInterval);
    }

    requestAnimationFrame(() => this.processFrame(processFn));
  }

  stopProcessing(): void {
    this.processingEnabled = false;
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  // ===========================================================================
  // Adaptive Quality
  // ===========================================================================

  updateStats(stats: Partial<VideoStats>): void {
    this.stats = {
      ...this.stats,
      ...stats,
      timestamp: Date.now(),
    } as VideoStats;
  }

  getStats(): VideoStats | null {
    return this.stats;
  }

  shouldReduceQuality(): boolean {
    if (!this.adaptiveQualityEnabled || !this.stats) {
      return false;
    }

    const { packetsLost, packetsReceived } = this.stats;
    const lossRate = packetsLost / (packetsLost + packetsReceived);

    // Reduce quality if packet loss > 5%
    return lossRate > 0.05;
  }

  shouldIncreaseQuality(): boolean {
    if (!this.adaptiveQualityEnabled || !this.stats) {
      return false;
    }

    const { packetsLost, packetsReceived, bitrate } = this.stats;
    const lossRate = packetsLost / (packetsLost + packetsReceived);
    const currentProfile = this.getQualityProfile();

    // Increase quality if packet loss < 1% and bitrate headroom available
    return lossRate < 0.01 && bitrate < currentProfile.bitrate * 0.8;
  }

  adaptQuality(): VideoQuality {
    if (!this.adaptiveQualityEnabled) {
      return this.currentQuality;
    }

    const qualities: VideoQuality[] = ["180p", "360p", "720p", "1080p"];
    const currentIndex = qualities.indexOf(this.currentQuality);

    if (this.shouldReduceQuality() && currentIndex > 0) {
      this.currentQuality = qualities[currentIndex - 1];
    } else if (
      this.shouldIncreaseQuality() &&
      currentIndex < qualities.length - 1
    ) {
      this.currentQuality = qualities[currentIndex + 1];
    }

    return this.currentQuality;
  }

  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQualityEnabled = enabled;
  }

  // ===========================================================================
  // Frame Extraction
  // ===========================================================================

  async extractFrame(stream: MediaStream): Promise<ImageData | null> {
    if (!this.canvas || !this.ctx) {
      return null;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }

    const video = document.createElement("video");
    video.srcObject = new MediaStream([videoTrack]);
    video.autoplay = true;
    video.muted = true;

    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for first frame

    const settings = videoTrack.getSettings();
    this.canvas.width = settings.width || 1280;
    this.canvas.height = settings.height || 720;

    this.ctx.drawImage(video, 0, 0);
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    video.pause();
    video.srcObject = null;

    return imageData;
  }

  // ===========================================================================
  // Resolution Scaling
  // ===========================================================================

  scaleImageData(
    imageData: ImageData,
    targetWidth: number,
    targetHeight: number,
  ): ImageData {
    if (!this.canvas || !this.ctx) {
      return imageData;
    }

    // Create temporary canvas for scaling
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return imageData;

    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCtx.putImageData(imageData, 0, 0);

    // Scale to target size
    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    this.ctx.drawImage(
      tempCanvas,
      0,
      0,
      imageData.width,
      imageData.height,
      0,
      0,
      targetWidth,
      targetHeight,
    );

    return this.ctx.getImageData(0, 0, targetWidth, targetHeight);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  cleanup(): void {
    this.stopProcessing();
    this.canvas = null;
    this.ctx = null;
    this.stats = null;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createVideoProcessor(
  options?: VideoProcessorOptions,
): VideoProcessor {
  return new VideoProcessor(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getOptimalQuality(bandwidth: number): VideoQuality {
  if (bandwidth >= 3000) return "1080p";
  if (bandwidth >= 1500) return "720p";
  if (bandwidth >= 400) return "360p";
  return "180p";
}

export function calculateBandwidth(stats: VideoStats): number {
  // Calculate bandwidth in kbps
  return (stats.bitrate || 0) / 1000;
}

export function getQualityLabel(quality: VideoQuality): string {
  const labels: Record<VideoQuality, string> = {
    "180p": "Low (180p)",
    "360p": "Medium (360p)",
    "720p": "HD (720p)",
    "1080p": "Full HD (1080p)",
  };
  return labels[quality];
}
