/**
 * Background Blur
 *
 * Implements background blur using MediaPipe Selfie Segmentation
 * and Canvas API for Gaussian blur.
 */

import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type BlurStrength = "light" | "medium" | "strong";

export interface BlurOptions {
  strength?: BlurStrength;
  edgeSmoothness?: number;
  modelSelection?: 0 | 1; // 0: general, 1: landscape
}

export interface BlurStats {
  fps: number;
  processingTime: number;
  modelLoaded: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const BLUR_RADIUS: Record<BlurStrength, number> = {
  light: 5,
  medium: 10,
  strong: 20,
};

const EDGE_SMOOTHNESS_DEFAULT = 0.5;

// =============================================================================
// Background Blur Class
// =============================================================================

export class BackgroundBlur {
  private selfieSegmentation: SelfieSegmentation | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private tempCanvas: HTMLCanvasElement | null = null;
  private tempCtx: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputCtx: CanvasRenderingContext2D | null = null;
  private isProcessing: boolean = false;
  private strength: BlurStrength = "medium";
  private edgeSmoothness: number = EDGE_SMOOTHNESS_DEFAULT;
  private modelLoaded: boolean = false;
  private fps: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  constructor(options: BlurOptions = {}) {
    this.strength = options.strength ?? "medium";
    this.edgeSmoothness = options.edgeSmoothness ?? EDGE_SMOOTHNESS_DEFAULT;

    if (typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.tempCanvas = document.createElement("canvas");
      this.tempCtx = this.tempCanvas.getContext("2d");
      this.outputCanvas = document.createElement("canvas");
      this.outputCtx = this.outputCanvas.getContext("2d", {
        willReadFrequently: false,
      });
    }
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  async initialize(): Promise<void> {
    if (this.modelLoaded) {
      return;
    }

    try {
      this.selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        },
      });

      this.selfieSegmentation.setOptions({
        modelSelection: 1, // 0: general model, 1: landscape model (faster)
        selfieMode: true,
      });

      await new Promise<void>((resolve, reject) => {
        if (!this.selfieSegmentation) {
          reject(new Error("Failed to create selfie segmentation"));
          return;
        }

        this.selfieSegmentation.onResults((results) => {
          // Model loaded successfully
          if (!this.modelLoaded) {
            this.modelLoaded = true;
            resolve();
          }
        });

        // Send a dummy frame to trigger model loading
        const dummyCanvas = document.createElement("canvas");
        dummyCanvas.width = 1;
        dummyCanvas.height = 1;
        this.selfieSegmentation.send({ image: dummyCanvas }).catch(reject);
      });
    } catch (error) {
      logger.error("Failed to initialize background blur:", error);
      throw error;
    }
  }

  // ===========================================================================
  // Stream Processing
  // ===========================================================================

  async processStream(stream: MediaStream): Promise<MediaStream> {
    if (!this.modelLoaded) {
      await this.initialize();
    }

    if (!this.canvas || !this.ctx || !this.outputCanvas || !this.outputCtx) {
      throw new Error("Canvas not initialized");
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error("No video track found in stream");
    }

    const settings = videoTrack.getSettings();
    const width = settings.width || 1280;
    const height = settings.height || 720;

    // Set canvas dimensions
    this.canvas.width = width;
    this.canvas.height = height;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;

    if (this.tempCanvas && this.tempCtx) {
      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
    }

    // Create video element
    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = new MediaStream([videoTrack]);
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    await this.videoElement.play();

    // Start processing
    this.isProcessing = true;
    this.processFrame();

    // Create output stream
    const outputStream = this.outputCanvas.captureStream(30);

    // Copy audio tracks
    stream.getAudioTracks().forEach((track) => {
      outputStream.addTrack(track);
    });

    return outputStream;
  }

  private async processFrame(): Promise<void> {
    if (!this.isProcessing || !this.videoElement || !this.selfieSegmentation) {
      return;
    }

    if (
      !this.canvas ||
      !this.ctx ||
      !this.tempCanvas ||
      !this.tempCtx ||
      !this.outputCanvas ||
      !this.outputCtx
    ) {
      return;
    }

    const startTime = performance.now();

    try {
      // Draw video frame to canvas
      this.ctx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );

      // Get segmentation mask
      await new Promise<void>((resolve) => {
        if (!this.selfieSegmentation) {
          resolve();
          return;
        }

        this.selfieSegmentation.onResults((results) => {
          this.applyBlur(results.segmentationMask, results.image);
          resolve();
        });

        this.selfieSegmentation.send({ image: this.videoElement! });
      });

      // Update FPS
      this.frameCount++;
      const elapsed = startTime - this.lastFrameTime;
      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFrameTime = startTime;
      }
    } catch (error) {
      logger.error("Error processing frame:", error);
    }

    // Continue processing
    requestAnimationFrame(() => this.processFrame());
  }

  private applyBlur(
    mask: HTMLCanvasElement | ImageBitmap | HTMLImageElement,
    image:
      | HTMLCanvasElement
      | HTMLVideoElement
      | HTMLImageElement
      | CanvasImageSource,
  ): void {
    if (
      !this.tempCanvas ||
      !this.tempCtx ||
      !this.outputCanvas ||
      !this.outputCtx ||
      !this.ctx
    ) {
      return;
    }

    // Draw original image to temp canvas
    this.tempCtx.drawImage(
      image,
      0,
      0,
      this.tempCanvas.width,
      this.tempCanvas.height,
    );

    // Apply blur to temp canvas
    this.applyGaussianBlur(this.tempCtx, BLUR_RADIUS[this.strength]);

    // Get mask data
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = this.canvas!.width;
    maskCanvas.height = this.canvas!.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    maskCtx.drawImage(mask, 0, 0, maskCanvas.width, maskCanvas.height);
    const maskData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height,
    );

    // Draw original image
    this.outputCtx.drawImage(
      image,
      0,
      0,
      this.outputCanvas.width,
      this.outputCanvas.height,
    );
    const originalData = this.outputCtx.getImageData(
      0,
      0,
      this.outputCanvas.width,
      this.outputCanvas.height,
    );

    // Get blurred image
    const blurredData = this.tempCtx.getImageData(
      0,
      0,
      this.tempCanvas.width,
      this.tempCanvas.height,
    );

    // Composite using mask
    const outputData = originalData;
    for (let i = 0; i < maskData.data.length; i += 4) {
      const alpha = maskData.data[i] / 255; // Assuming grayscale mask

      // Blend original (person) and blurred (background)
      outputData.data[i] =
        originalData.data[i] * alpha + blurredData.data[i] * (1 - alpha);
      outputData.data[i + 1] =
        originalData.data[i + 1] * alpha +
        blurredData.data[i + 1] * (1 - alpha);
      outputData.data[i + 2] =
        originalData.data[i + 2] * alpha +
        blurredData.data[i + 2] * (1 - alpha);
    }

    this.outputCtx.putImageData(outputData, 0, 0);
  }

  private applyGaussianBlur(
    ctx: CanvasRenderingContext2D,
    radius: number,
  ): void {
    // Simple box blur approximation of Gaussian blur
    const iterations = 3;
    for (let i = 0; i < iterations; i++) {
      ctx.filter = `blur(${radius / iterations}px)`;
      ctx.drawImage(ctx.canvas, 0, 0);
    }
    ctx.filter = "none";
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  setStrength(strength: BlurStrength): void {
    this.strength = strength;
  }

  getStrength(): BlurStrength {
    return this.strength;
  }

  setEdgeSmoothness(smoothness: number): void {
    this.edgeSmoothness = Math.max(0, Math.min(1, smoothness));
  }

  getEdgeSmoothness(): number {
    return this.edgeSmoothness;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStats(): BlurStats {
    return {
      fps: this.fps,
      processingTime: 0, // Could be calculated if needed
      modelLoaded: this.modelLoaded,
    };
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  stopProcessing(): void {
    this.isProcessing = false;

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    if (this.selfieSegmentation) {
      this.selfieSegmentation.close();
      this.selfieSegmentation = null;
    }
  }

  cleanup(): void {
    this.stopProcessing();
    this.canvas = null;
    this.ctx = null;
    this.tempCanvas = null;
    this.tempCtx = null;
    this.outputCanvas = null;
    this.outputCtx = null;
    this.modelLoaded = false;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createBackgroundBlur(options?: BlurOptions): BackgroundBlur {
  return new BackgroundBlur(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isBackgroundBlurSupported(): boolean {
  return (
    typeof OffscreenCanvas !== "undefined" && typeof Worker !== "undefined"
  );
}

export function getBlurStrengthLabel(strength: BlurStrength): string {
  const labels: Record<BlurStrength, string> = {
    light: "Light Blur",
    medium: "Medium Blur",
    strong: "Strong Blur",
  };
  return labels[strength];
}
