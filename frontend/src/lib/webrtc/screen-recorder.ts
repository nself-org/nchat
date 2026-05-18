/**
 * Screen Recorder
 *
 * Records screen shares with audio and webcam overlay.
 * Supports WebM and MP4 formats with configurable quality.
 */

// =============================================================================
// Types
// =============================================================================

export type RecordingFormat = "webm" | "mp4";

export type RecordingQuality = "low" | "medium" | "high";

export interface RecordingOptions {
  format?: RecordingFormat;
  quality?: RecordingQuality;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  includeWebcam?: boolean;
  webcamSize?: "small" | "medium" | "large";
  webcamPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export interface Recording {
  id: string;
  startTime: Date;
  duration: number;
  size: number;
  format: RecordingFormat;
  blob: Blob;
  url: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
}

export interface RecorderCallbacks {
  onStart?: () => void;
  onStop?: (recording: Recording) => void;
  onPause?: () => void;
  onResume?: () => void;
  onDataAvailable?: (data: Blob, size: number) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// Quality Presets
// =============================================================================

const QUALITY_PRESETS: Record<
  RecordingQuality,
  { videoBitsPerSecond: number; audioBitsPerSecond: number }
> = {
  low: {
    videoBitsPerSecond: 1_000_000, // 1 Mbps
    audioBitsPerSecond: 64_000, // 64 kbps
  },
  medium: {
    videoBitsPerSecond: 2_500_000, // 2.5 Mbps
    audioBitsPerSecond: 128_000, // 128 kbps
  },
  high: {
    videoBitsPerSecond: 8_000_000, // 8 Mbps
    audioBitsPerSecond: 192_000, // 192 kbps
  },
};

// =============================================================================
// Screen Recorder
// =============================================================================

export class ScreenRecorder {
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: Date | null = null;
  private pauseTime: Date | null = null;
  private totalPauseDuration = 0;
  private durationInterval: number | null = null;
  private currentSize = 0;
  private callbacks: RecorderCallbacks;
  private recordingId = 0;

  // Streams
  private screenStream: MediaStream | null = null;
  private webcamStream: MediaStream | null = null;
  private mixedStream: MediaStream | null = null;

  // Canvas for webcam overlay
  private canvas: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private canvasAnimationId: number | null = null;

  constructor(callbacks: RecorderCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Check if MediaRecorder is supported
   */
  static isSupported(): boolean {
    return typeof MediaRecorder !== "undefined";
  }

  /**
   * Get supported MIME types
   */
  static getSupportedMimeTypes(): string[] {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=h264,opus",
      "video/webm",
      "video/mp4",
    ];

    return types.filter((type) => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Get optimal MIME type
   */
  static getOptimalMimeType(format: RecordingFormat = "webm"): string {
    const supportedTypes = ScreenRecorder.getSupportedMimeTypes();

    if (format === "webm") {
      return (
        supportedTypes.find((t) => t.includes("vp9")) ??
        supportedTypes.find((t) => t.includes("vp8")) ??
        supportedTypes.find((t) => t.includes("webm")) ??
        supportedTypes[0]
      );
    }

    return supportedTypes.find((t) => t.includes("mp4")) ?? supportedTypes[0];
  }

  /**
   * Create canvas for webcam overlay
   */
  private createOverlayCanvas(
    screenStream: MediaStream,
    webcamStream: MediaStream,
    size: "small" | "medium" | "large",
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  ): MediaStream {
    // Get screen video track
    const screenTrack = screenStream.getVideoTracks()[0];
    const screenSettings = screenTrack.getSettings();
    const screenWidth = screenSettings.width ?? 1920;
    const screenHeight = screenSettings.height ?? 1080;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = screenWidth;
    this.canvas.height = screenHeight;
    this.canvasContext = this.canvas.getContext("2d")!;

    // Calculate webcam size
    const sizeMap = {
      small: 0.15,
      medium: 0.25,
      large: 0.35,
    };
    const webcamScale = sizeMap[size];
    const webcamWidth = screenWidth * webcamScale;
    const webcamHeight = screenHeight * webcamScale;

    // Calculate webcam position
    const padding = 20;
    let webcamX = padding;
    let webcamY = padding;

    switch (position) {
      case "top-right":
        webcamX = screenWidth - webcamWidth - padding;
        webcamY = padding;
        break;
      case "bottom-left":
        webcamX = padding;
        webcamY = screenHeight - webcamHeight - padding;
        break;
      case "bottom-right":
        webcamX = screenWidth - webcamWidth - padding;
        webcamY = screenHeight - webcamHeight - padding;
        break;
    }

    // Create video elements
    const screenVideo = document.createElement("video");
    screenVideo.srcObject = screenStream;
    screenVideo.play();

    const webcamVideo = document.createElement("video");
    webcamVideo.srcObject = webcamStream;
    webcamVideo.play();

    // Draw loop
    const draw = () => {
      if (!this.canvasContext || !this.canvas) return;

      // Draw screen
      this.canvasContext.drawImage(
        screenVideo,
        0,
        0,
        screenWidth,
        screenHeight,
      );

      // Draw webcam overlay with rounded corners
      this.canvasContext.save();

      // Create rounded rectangle path
      const radius = 10;
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(webcamX + radius, webcamY);
      this.canvasContext.lineTo(webcamX + webcamWidth - radius, webcamY);
      this.canvasContext.quadraticCurveTo(
        webcamX + webcamWidth,
        webcamY,
        webcamX + webcamWidth,
        webcamY + radius,
      );
      this.canvasContext.lineTo(
        webcamX + webcamWidth,
        webcamY + webcamHeight - radius,
      );
      this.canvasContext.quadraticCurveTo(
        webcamX + webcamWidth,
        webcamY + webcamHeight,
        webcamX + webcamWidth - radius,
        webcamY + webcamHeight,
      );
      this.canvasContext.lineTo(webcamX + radius, webcamY + webcamHeight);
      this.canvasContext.quadraticCurveTo(
        webcamX,
        webcamY + webcamHeight,
        webcamX,
        webcamY + webcamHeight - radius,
      );
      this.canvasContext.lineTo(webcamX, webcamY + radius);
      this.canvasContext.quadraticCurveTo(
        webcamX,
        webcamY,
        webcamX + radius,
        webcamY,
      );
      this.canvasContext.closePath();
      this.canvasContext.clip();

      // Draw webcam
      this.canvasContext.drawImage(
        webcamVideo,
        webcamX,
        webcamY,
        webcamWidth,
        webcamHeight,
      );

      this.canvasContext.restore();

      // Border
      this.canvasContext.strokeStyle = "#ffffff";
      this.canvasContext.lineWidth = 3;
      this.canvasContext.beginPath();
      this.canvasContext.moveTo(webcamX + radius, webcamY);
      this.canvasContext.lineTo(webcamX + webcamWidth - radius, webcamY);
      this.canvasContext.quadraticCurveTo(
        webcamX + webcamWidth,
        webcamY,
        webcamX + webcamWidth,
        webcamY + radius,
      );
      this.canvasContext.lineTo(
        webcamX + webcamWidth,
        webcamY + webcamHeight - radius,
      );
      this.canvasContext.quadraticCurveTo(
        webcamX + webcamWidth,
        webcamY + webcamHeight,
        webcamX + webcamWidth - radius,
        webcamY + webcamHeight,
      );
      this.canvasContext.lineTo(webcamX + radius, webcamY + webcamHeight);
      this.canvasContext.quadraticCurveTo(
        webcamX,
        webcamY + webcamHeight,
        webcamX,
        webcamY + webcamHeight - radius,
      );
      this.canvasContext.lineTo(webcamX, webcamY + radius);
      this.canvasContext.quadraticCurveTo(
        webcamX,
        webcamY,
        webcamX + radius,
        webcamY,
      );
      this.canvasContext.closePath();
      this.canvasContext.stroke();

      this.canvasAnimationId = requestAnimationFrame(draw);
    };

    draw();

    // Create stream from canvas
    const canvasStream = this.canvas.captureStream(30);

    // Mix audio from screen and webcam
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();

    // Add screen audio if available
    const screenAudioTracks = screenStream.getAudioTracks();
    if (screenAudioTracks.length > 0) {
      const screenAudioSource = audioContext.createMediaStreamSource(
        new MediaStream(screenAudioTracks),
      );
      screenAudioSource.connect(audioDestination);
    }

    // Add webcam audio if available
    const webcamAudioTracks = webcamStream.getAudioTracks();
    if (webcamAudioTracks.length > 0) {
      const webcamAudioSource = audioContext.createMediaStreamSource(
        new MediaStream(webcamAudioTracks),
      );
      webcamAudioSource.connect(audioDestination);
    }

    // Combine video from canvas and mixed audio
    const mixedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);

    return mixedStream;
  }

  /**
   * Start recording
   */
  async startRecording(
    screenStream: MediaStream,
    options: RecordingOptions = {},
  ): Promise<void> {
    if (this.recorder) {
      throw new Error("Recording already in progress");
    }

    if (!ScreenRecorder.isSupported()) {
      throw new Error("MediaRecorder is not supported");
    }

    try {
      const {
        format = "webm",
        quality = "medium",
        videoBitsPerSecond,
        audioBitsPerSecond,
        includeWebcam = false,
        webcamSize = "small",
        webcamPosition = "bottom-right",
      } = options;

      this.screenStream = screenStream;

      // Get webcam if requested
      if (includeWebcam) {
        this.webcamStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Create overlay
        this.mixedStream = this.createOverlayCanvas(
          screenStream,
          this.webcamStream,
          webcamSize,
          webcamPosition,
        );
      } else {
        this.mixedStream = screenStream;
      }

      // Get quality preset
      const preset = QUALITY_PRESETS[quality];

      // MediaRecorder options
      const mimeType = ScreenRecorder.getOptimalMimeType(format);
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: videoBitsPerSecond ?? preset.videoBitsPerSecond,
        audioBitsPerSecond: audioBitsPerSecond ?? preset.audioBitsPerSecond,
      };

      // Create MediaRecorder
      this.recorder = new MediaRecorder(this.mixedStream, recorderOptions);

      // Event handlers
      this.recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.currentSize += event.data.size;
          this.callbacks.onDataAvailable?.(event.data, this.currentSize);
        }
      };

      this.recorder.onerror = (event) => {
        const error = new Error(`MediaRecorder error: ${event}`);
        this.callbacks.onError?.(error);
      };

      // Start recording
      this.recorder.start(1000); // Collect data every second
      this.startTime = new Date();
      this.recordedChunks = [];
      this.currentSize = 0;

      // Start duration timer
      this.startDurationTimer();

      this.callbacks.onStart?.();
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to start recording");
      this.callbacks.onError?.(err);
      this.cleanup();
      throw err;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<Recording> {
    if (!this.recorder || !this.startTime) {
      throw new Error("No active recording");
    }

    return new Promise((resolve, reject) => {
      this.recorder!.onstop = () => {
        try {
          // Create blob
          const mimeType = this.recorder!.mimeType;
          const blob = new Blob(this.recordedChunks, { type: mimeType });

          // Calculate duration
          const endTime = new Date();
          const duration = Math.floor(
            (endTime.getTime() -
              this.startTime!.getTime() -
              this.totalPauseDuration) /
              1000,
          );

          // Create recording object
          const recording: Recording = {
            id: `recording-${++this.recordingId}-${Date.now()}`,
            startTime: this.startTime!,
            duration,
            size: blob.size,
            format: mimeType.includes("webm") ? "webm" : "mp4",
            blob,
            url: URL.createObjectURL(blob),
          };

          // Cleanup
          this.stopDurationTimer();
          this.cleanup();

          this.callbacks.onStop?.(recording);
          resolve(recording);
        } catch (error) {
          const err =
            error instanceof Error
              ? error
              : new Error("Failed to stop recording");
          this.callbacks.onError?.(err);
          reject(err);
        }
      };

      this.recorder!.stop();
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (!this.recorder || this.recorder.state !== "recording") {
      throw new Error("No active recording to pause");
    }

    this.recorder.pause();
    this.pauseTime = new Date();
    this.stopDurationTimer();
    this.callbacks.onPause?.();
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (!this.recorder || this.recorder.state !== "paused") {
      throw new Error("No paused recording to resume");
    }

    if (this.pauseTime) {
      this.totalPauseDuration += Date.now() - this.pauseTime.getTime();
      this.pauseTime = null;
    }

    this.recorder.resume();
    this.startDurationTimer();
    this.callbacks.onResume?.();
  }

  /**
   * Get current state
   */
  getState(): RecordingState {
    return {
      isRecording: this.recorder?.state === "recording" || false,
      isPaused: this.recorder?.state === "paused" || false,
      duration: this.getCurrentDuration(),
      size: this.currentSize,
    };
  }

  /**
   * Get current duration
   */
  private getCurrentDuration(): number {
    if (!this.startTime) return 0;

    const now = this.pauseTime ?? new Date();
    return Math.floor(
      (now.getTime() - this.startTime.getTime() - this.totalPauseDuration) /
        1000,
    );
  }

  /**
   * Start duration timer
   */
  private startDurationTimer(): void {
    this.stopDurationTimer();

    this.durationInterval = window.setInterval(() => {
      // Timer just to trigger re-renders in React
      // Actual duration is calculated from timestamps
    }, 1000);
  }

  /**
   * Stop duration timer
   */
  private stopDurationTimer(): void {
    if (this.durationInterval !== null) {
      window.clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    // Stop canvas animation
    if (this.canvasAnimationId !== null) {
      cancelAnimationFrame(this.canvasAnimationId);
      this.canvasAnimationId = null;
    }

    // Stop webcam
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((track) => track.stop());
      this.webcamStream = null;
    }

    // Clear references
    this.recorder = null;
    this.screenStream = null;
    this.mixedStream = null;
    this.canvas = null;
    this.canvasContext = null;
    this.recordedChunks = [];
    this.startTime = null;
    this.pauseTime = null;
    this.totalPauseDuration = 0;
    this.currentSize = 0;
  }

  /**
   * Full cleanup
   */
  destroy(): void {
    this.stopDurationTimer();
    this.cleanup();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createScreenRecorder(
  callbacks: RecorderCallbacks = {},
): ScreenRecorder {
  return new ScreenRecorder(callbacks);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Download recording
 */
export function downloadRecording(
  recording: Recording,
  filename?: string,
): void {
  const link = document.createElement("a");
  link.href = recording.url;
  link.download =
    filename ?? `screen-recording-${recording.id}.${recording.format}`;
  link.click();
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
