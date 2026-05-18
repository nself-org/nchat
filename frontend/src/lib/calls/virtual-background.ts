/**
 * Virtual Background
 *
 * Replaces video background with images or solid colors using
 * MediaPipe segmentation.
 */

import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export type BackgroundType = "image" | "color" | "video";

export interface VirtualBackgroundOptions {
  type: BackgroundType;
  source?: string | HTMLImageElement | HTMLVideoElement;
  color?: string;
  edgeSmoothness?: number;
}

export interface BackgroundImage {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  category?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const PRESET_BACKGROUNDS: BackgroundImage[] = [
  {
    id: "office-1",
    name: "Modern Office",
    url: "/backgrounds/office-1.jpg",
    category: "Professional",
  },
  {
    id: "office-2",
    name: "Conference Room",
    url: "/backgrounds/office-2.jpg",
    category: "Professional",
  },
  {
    id: "library",
    name: "Library",
    url: "/backgrounds/library.jpg",
    category: "Professional",
  },
  {
    id: "living-room",
    name: "Living Room",
    url: "/backgrounds/living-room.jpg",
    category: "Casual",
  },
  {
    id: "beach",
    name: "Beach",
    url: "/backgrounds/beach.jpg",
    category: "Scenic",
  },
  {
    id: "mountains",
    name: "Mountains",
    url: "/backgrounds/mountains.jpg",
    category: "Scenic",
  },
  {
    id: "city",
    name: "City Skyline",
    url: "/backgrounds/city.jpg",
    category: "Scenic",
  },
  {
    id: "space",
    name: "Space",
    url: "/backgrounds/space.jpg",
    category: "Fun",
  },
];

export const PRESET_COLORS: Array<{ id: string; name: string; color: string }> =
  [
    { id: "blue", name: "Blue", color: "#3b82f6" },
    { id: "green", name: "Green", color: "#10b981" },
    { id: "purple", name: "Purple", color: "#8b5cf6" },
    { id: "gray", name: "Gray", color: "#6b7280" },
    { id: "black", name: "Black", color: "#000000" },
    { id: "white", name: "White", color: "#ffffff" },
  ];

// =============================================================================
// Virtual Background Class
// =============================================================================

export class VirtualBackground {
  private selfieSegmentation: SelfieSegmentation | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputCtx: CanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private backgroundElement: HTMLImageElement | HTMLVideoElement | null = null;
  private isProcessing: boolean = false;
  private backgroundType: BackgroundType = "color";
  private backgroundColor: string = "#1f2937";
  private edgeSmoothness: number = 0.5;
  private modelLoaded: boolean = false;

  constructor(options: VirtualBackgroundOptions = { type: "color" }) {
    this.backgroundType = options.type;
    this.backgroundColor = options.color ?? "#1f2937";
    this.edgeSmoothness = options.edgeSmoothness ?? 0.5;

    if (typeof document !== "undefined") {
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");
      this.outputCanvas = document.createElement("canvas");
      this.outputCtx = this.outputCanvas.getContext("2d", {
        willReadFrequently: false,
      });
    }

    // Load background source
    if (options.source) {
      this.setBackground(options.type, options.source);
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
        modelSelection: 1,
        selfieMode: true,
      });

      await new Promise<void>((resolve, reject) => {
        if (!this.selfieSegmentation) {
          reject(new Error("Failed to create selfie segmentation"));
          return;
        }

        this.selfieSegmentation.onResults((results) => {
          if (!this.modelLoaded) {
            this.modelLoaded = true;
            resolve();
          }
        });

        const dummyCanvas = document.createElement("canvas");
        dummyCanvas.width = 1;
        dummyCanvas.height = 1;
        this.selfieSegmentation.send({ image: dummyCanvas }).catch(reject);
      });
    } catch (error) {
      logger.error("Failed to initialize virtual background:", error);
      throw error;
    }
  }

  // ===========================================================================
  // Background Management
  // ===========================================================================

  async setBackground(
    type: BackgroundType,
    source?: string | HTMLImageElement | HTMLVideoElement,
  ): Promise<void> {
    this.backgroundType = type;

    if (type === "color") {
      this.backgroundColor = typeof source === "string" ? source : "#1f2937";
      this.backgroundElement = null;
    } else if (type === "image") {
      if (typeof source === "string") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = source;
        });
        this.backgroundElement = img;
      } else if (source instanceof HTMLImageElement) {
        this.backgroundElement = source;
      }
    } else if (type === "video") {
      if (source instanceof HTMLVideoElement) {
        this.backgroundElement = source;
        if (source.paused) {
          await source.play();
        }
      }
    }
  }

  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
    this.backgroundType = "color";
    this.backgroundElement = null;
  }

  async setBackgroundImage(url: string): Promise<void> {
    await this.setBackground("image", url);
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

    this.canvas.width = width;
    this.canvas.height = height;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;

    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = new MediaStream([videoTrack]);
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    await this.videoElement.play();

    this.isProcessing = true;
    this.processFrame();

    const outputStream = this.outputCanvas.captureStream(30);

    stream.getAudioTracks().forEach((track) => {
      outputStream.addTrack(track);
    });

    return outputStream;
  }

  private async processFrame(): Promise<void> {
    if (!this.isProcessing || !this.videoElement || !this.selfieSegmentation) {
      return;
    }

    if (!this.canvas || !this.ctx || !this.outputCanvas || !this.outputCtx) {
      return;
    }

    try {
      this.ctx.drawImage(
        this.videoElement,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );

      await new Promise<void>((resolve) => {
        if (!this.selfieSegmentation) {
          resolve();
          return;
        }

        this.selfieSegmentation.onResults((results) => {
          this.applyVirtualBackground(results.segmentationMask, results.image);
          resolve();
        });

        this.selfieSegmentation.send({ image: this.videoElement! });
      });
    } catch (error) {
      logger.error("Error processing frame:", error);
    }

    requestAnimationFrame(() => this.processFrame());
  }

  private applyVirtualBackground(
    mask: HTMLCanvasElement | ImageBitmap | HTMLImageElement,
    image:
      | HTMLCanvasElement
      | HTMLVideoElement
      | HTMLImageElement
      | CanvasImageSource,
  ): void {
    if (!this.outputCanvas || !this.outputCtx) {
      return;
    }

    // Clear output canvas
    this.outputCtx.clearRect(
      0,
      0,
      this.outputCanvas.width,
      this.outputCanvas.height,
    );

    // Draw background
    if (this.backgroundType === "color") {
      this.outputCtx.fillStyle = this.backgroundColor;
      this.outputCtx.fillRect(
        0,
        0,
        this.outputCanvas.width,
        this.outputCanvas.height,
      );
    } else if (this.backgroundElement) {
      this.outputCtx.drawImage(
        this.backgroundElement,
        0,
        0,
        this.outputCanvas.width,
        this.outputCanvas.height,
      );
    }

    // Get mask data
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = this.outputCanvas.width;
    maskCanvas.height = this.outputCanvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) return;

    maskCtx.drawImage(mask, 0, 0, maskCanvas.width, maskCanvas.height);
    const maskData = maskCtx.getImageData(
      0,
      0,
      maskCanvas.width,
      maskCanvas.height,
    );

    // Get background
    const backgroundData = this.outputCtx.getImageData(
      0,
      0,
      this.outputCanvas.width,
      this.outputCanvas.height,
    );

    // Get person
    const personCanvas = document.createElement("canvas");
    personCanvas.width = this.outputCanvas.width;
    personCanvas.height = this.outputCanvas.height;
    const personCtx = personCanvas.getContext("2d");
    if (!personCtx) return;

    personCtx.drawImage(image, 0, 0, personCanvas.width, personCanvas.height);
    const personData = personCtx.getImageData(
      0,
      0,
      personCanvas.width,
      personCanvas.height,
    );

    // Composite
    const outputData = backgroundData;
    for (let i = 0; i < maskData.data.length; i += 4) {
      const alpha = maskData.data[i] / 255;

      // Smooth edges
      const smoothedAlpha = this.smoothEdge(alpha);

      outputData.data[i] =
        personData.data[i] * smoothedAlpha +
        backgroundData.data[i] * (1 - smoothedAlpha);
      outputData.data[i + 1] =
        personData.data[i + 1] * smoothedAlpha +
        backgroundData.data[i + 1] * (1 - smoothedAlpha);
      outputData.data[i + 2] =
        personData.data[i + 2] * smoothedAlpha +
        backgroundData.data[i + 2] * (1 - smoothedAlpha);
    }

    this.outputCtx.putImageData(outputData, 0, 0);
  }

  private smoothEdge(alpha: number): number {
    // Apply edge smoothing using sigmoid function
    const smoothness = this.edgeSmoothness * 10;
    return 1 / (1 + Math.exp(-smoothness * (alpha - 0.5)));
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  setEdgeSmoothness(smoothness: number): void {
    this.edgeSmoothness = Math.max(0, Math.min(1, smoothness));
  }

  getEdgeSmoothness(): number {
    return this.edgeSmoothness;
  }

  getBackgroundType(): BackgroundType {
    return this.backgroundType;
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
    this.outputCanvas = null;
    this.outputCtx = null;
    this.backgroundElement = null;
    this.modelLoaded = false;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createVirtualBackground(
  options?: VirtualBackgroundOptions,
): VirtualBackground {
  return new VirtualBackground(options);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function isVirtualBackgroundSupported(): boolean {
  return (
    typeof OffscreenCanvas !== "undefined" && typeof Worker !== "undefined"
  );
}

export function getBackgroundCategories(): string[] {
  const categories = new Set<string>();
  PRESET_BACKGROUNDS.forEach((bg) => {
    if (bg.category) categories.add(bg.category);
  });
  return Array.from(categories);
}

export function getBackgroundsByCategory(category: string): BackgroundImage[] {
  return PRESET_BACKGROUNDS.filter((bg) => bg.category === category);
}
