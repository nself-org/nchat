/**
 * Audio Recording Service
 *
 * Handles audio recording using the MediaRecorder API.
 * Supports microphone permission requests, audio compression,
 * and various audio formats.
 */

// ============================================================================
// TYPES
// ============================================================================

export type RecordingState = "inactive" | "recording" | "paused" | "stopped";

export type AudioFormat = "webm" | "mp4" | "ogg" | "wav";

export interface RecorderOptions {
  /** Target audio format (defaults to webm) */
  format?: AudioFormat;
  /** Audio bitrate in bits per second (defaults to 128000) */
  audioBitsPerSecond?: number;
  /** Enable echo cancellation (defaults to true) */
  echoCancellation?: boolean;
  /** Enable noise suppression (defaults to true) */
  noiseSuppression?: boolean;
  /** Enable auto gain control (defaults to true) */
  autoGainControl?: boolean;
  /** Sample rate in Hz (defaults to 48000) */
  sampleRate?: number;
  /** Number of audio channels (defaults to 1 for mono) */
  channelCount?: number;
  /** Time slice for data available events in ms (defaults to 100) */
  timeSlice?: number;
}

export interface RecorderCallbacks {
  /** Called when recording starts */
  onStart?: () => void;
  /** Called when recording stops with the audio blob */
  onStop?: (blob: Blob, duration: number) => void;
  /** Called when audio data is available during recording */
  onDataAvailable?: (data: Blob) => void;
  /** Called when recording is paused */
  onPause?: () => void;
  /** Called when recording is resumed */
  onResume?: () => void;
  /** Called when an error occurs */
  onError?: (error: AudioRecorderError) => void;
  /** Called with the current duration in seconds */
  onDurationUpdate?: (duration: number) => void;
}

export interface AudioRecorderError {
  code:
    | "PERMISSION_DENIED"
    | "NOT_SUPPORTED"
    | "NO_MICROPHONE"
    | "RECORDING_FAILED"
    | "ALREADY_RECORDING"
    | "NOT_RECORDING";
  message: string;
  originalError?: Error;
}

export interface MicrophonePermissionState {
  state: "granted" | "denied" | "prompt" | "unavailable";
  canRequest: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Supported MIME types in order of preference */
const MIME_TYPE_PRIORITY: Record<AudioFormat, string[]> = {
  webm: ["audio/webm;codecs=opus", "audio/webm"],
  mp4: ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/aac"],
  ogg: ["audio/ogg;codecs=opus", "audio/ogg;codecs=vorbis", "audio/ogg"],
  wav: ["audio/wav", "audio/wave"],
};

/** Default recorder options */
const DEFAULT_OPTIONS: Required<RecorderOptions> = {
  format: "webm",
  audioBitsPerSecond: 128000,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
  timeSlice: 100,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if the browser supports audio recording
 */
export function isRecordingSupported(): boolean {
  return !!(
    typeof window !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    window.MediaRecorder
  );
}

/**
 * Get the best supported MIME type for the given format
 */
export function getSupportedMimeType(format: AudioFormat): string | null {
  if (typeof window === "undefined" || !window.MediaRecorder) {
    return null;
  }

  const mimeTypes = MIME_TYPE_PRIORITY[format];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  // Try any supported type
  for (const formatTypes of Object.values(MIME_TYPE_PRIORITY)) {
    for (const mimeType of formatTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
  }

  return null;
}

/**
 * Get the file extension for a MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav") || mimeType.includes("wave")) return "wav";
  return "webm";
}

/**
 * Check microphone permission status
 */
export async function checkMicrophonePermission(): Promise<MicrophonePermissionState> {
  if (typeof window === "undefined" || !navigator.permissions) {
    return { state: "unavailable", canRequest: false };
  }

  try {
    const result = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });

    return {
      state: result.state as "granted" | "denied" | "prompt",
      canRequest: result.state === "prompt",
    };
  } catch {
    // Permissions API not supported, assume we can request
    return { state: "prompt", canRequest: true };
  }
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  if (!isRecordingSupported()) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just wanted to request permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// AUDIO RECORDER CLASS
// ============================================================================

/**
 * Audio recorder using MediaRecorder API
 *
 * @example
 * ```typescript
 * const recorder = new AudioRecorder({
 *   onStop: (blob, duration) => {
 *     // console.log('Recording complete:', blob.size, 'bytes,', duration, 'seconds')
 *   },
 *   onDurationUpdate: (duration) => {
 *     // console.log('Recording duration:', duration)
 *   },
 * })
 *
 * await recorder.start()
 * // ... recording in progress ...
 * const blob = await recorder.stop()
 * ```
 */
export class AudioRecorder {
  private options: Required<RecorderOptions>;
  private callbacks: RecorderCallbacks;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private pausedTime: number = 0;
  private durationInterval: ReturnType<typeof setInterval> | null = null;
  private _state: RecordingState = "inactive";
  private mimeType: string | null = null;

  constructor(
    callbacks: RecorderCallbacks = {},
    options: RecorderOptions = {},
  ) {
    this.callbacks = callbacks;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.mimeType = getSupportedMimeType(this.options.format);
  }

  /** Current recording state */
  get state(): RecordingState {
    return this._state;
  }

  /** Whether currently recording */
  get isRecording(): boolean {
    return this._state === "recording";
  }

  /** Whether paused */
  get isPaused(): boolean {
    return this._state === "paused";
  }

  /** Get the current duration in seconds */
  get duration(): number {
    if (this._state === "inactive") return 0;
    if (this._state === "paused") return this.pausedTime / 1000;
    return (Date.now() - this.startTime + this.pausedTime) / 1000;
  }

  /** Get the MIME type being used */
  get recordingMimeType(): string | null {
    return this.mimeType;
  }

  /**
   * Start recording
   */
  async start(): Promise<void> {
    // Validate state
    if (this._state === "recording" || this._state === "paused") {
      this.emitError({
        code: "ALREADY_RECORDING",
        message: "Recording is already in progress",
      });
      return;
    }

    // Check support
    if (!isRecordingSupported()) {
      this.emitError({
        code: "NOT_SUPPORTED",
        message: "Audio recording is not supported in this browser",
      });
      return;
    }

    // Check MIME type support
    if (!this.mimeType) {
      this.emitError({
        code: "NOT_SUPPORTED",
        message: "No supported audio format found",
      });
      return;
    }

    try {
      // Request microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: this.options.echoCancellation,
          noiseSuppression: this.options.noiseSuppression,
          autoGainControl: this.options.autoGainControl,
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channelCount,
        },
      });
    } catch (error) {
      const err = error as Error;
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        this.emitError({
          code: "PERMISSION_DENIED",
          message: "Microphone permission was denied",
          originalError: err,
        });
      } else if (err.name === "NotFoundError") {
        this.emitError({
          code: "NO_MICROPHONE",
          message: "No microphone found",
          originalError: err,
        });
      } else {
        this.emitError({
          code: "RECORDING_FAILED",
          message: err.message || "Failed to access microphone",
          originalError: err,
        });
      }
      return;
    }

    try {
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: this.mimeType,
        audioBitsPerSecond: this.options.audioBitsPerSecond,
      });

      // Reset state
      this.audioChunks = [];
      this.startTime = Date.now();
      this.pausedTime = 0;

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.callbacks.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this._state = "recording";
        this.startDurationTimer();
        this.callbacks.onStart?.();
      };

      this.mediaRecorder.onstop = () => {
        this.stopDurationTimer();
        const duration = this.duration;
        const blob = new Blob(this.audioChunks, { type: this.mimeType! });
        this._state = "stopped";
        this.callbacks.onStop?.(blob, duration);
        this.cleanup();
      };

      this.mediaRecorder.onpause = () => {
        this._state = "paused";
        this.pausedTime += Date.now() - this.startTime;
        this.startTime = 0;
        this.stopDurationTimer();
        this.callbacks.onPause?.();
      };

      this.mediaRecorder.onresume = () => {
        this._state = "recording";
        this.startTime = Date.now();
        this.startDurationTimer();
        this.callbacks.onResume?.();
      };

      this.mediaRecorder.onerror = (event) => {
        this.emitError({
          code: "RECORDING_FAILED",
          message: "Recording error occurred",
          originalError: (event as ErrorEvent).error,
        });
        this.cleanup();
      };

      // Start recording
      this.mediaRecorder.start(this.options.timeSlice);
    } catch (error) {
      this.cleanup();
      this.emitError({
        code: "RECORDING_FAILED",
        message: "Failed to start recording",
        originalError: error as Error,
      });
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stop(): Promise<Blob | null> {
    if (this._state === "inactive" || this._state === "stopped") {
      this.emitError({
        code: "NOT_RECORDING",
        message: "No recording in progress",
      });
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      const handleStop = () => {
        const blob = new Blob(this.audioChunks, { type: this.mimeType! });
        resolve(blob);
      };

      // If already stopped, return current chunks
      if (this.mediaRecorder.state === "inactive") {
        handleStop();
        return;
      }

      // Add one-time stop listener
      this.mediaRecorder.addEventListener("stop", handleStop, { once: true });

      // Stop the recorder
      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (this._state !== "recording") {
      this.emitError({
        code: "NOT_RECORDING",
        message: "Cannot pause: not currently recording",
      });
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (this._state !== "paused") {
      this.emitError({
        code: "NOT_RECORDING",
        message: "Cannot resume: not currently paused",
      });
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Cancel recording and discard data
   */
  cancel(): void {
    this.stopDurationTimer();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      // Remove the stop handler to prevent callback
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }

    this.audioChunks = [];
    this._state = "inactive";
    this.cleanup();
  }

  /**
   * Get the current audio stream (for visualization)
   */
  getAudioStream(): MediaStream | null {
    return this.audioStream;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationInterval = setInterval(() => {
      this.callbacks.onDurationUpdate?.(this.duration);
    }, 100);
  }

  private stopDurationTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private cleanup(): void {
    // Stop all tracks in the stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    this.mediaRecorder = null;
    this._state = "inactive";
    this.startTime = 0;
    this.pausedTime = 0;
  }

  private emitError(error: AudioRecorderError): void {
    this.callbacks.onError?.(error);
  }
}

// ============================================================================
// AUDIO COMPRESSION UTILITIES
// ============================================================================

/**
 * Compress audio using AudioContext (client-side)
 * Note: Full compression requires a proper audio codec library
 */
export async function compressAudioBlob(
  blob: Blob,
  _targetBitrate: number = 64000,
): Promise<Blob> {
  // For now, just return the original blob
  // Full compression would require a library like lamejs for MP3
  // or opus-encoder for Opus
  return blob;
}

/**
 * Convert audio blob to a different format
 * Note: Format conversion requires external libraries
 */
export async function convertAudioFormat(
  blob: Blob,
  _targetFormat: AudioFormat,
): Promise<Blob> {
  // For now, just return the original blob
  // Full conversion would require libraries like ffmpeg.wasm
  return blob;
}

/**
 * Create a File object from a Blob with proper naming
 */
export function createAudioFile(
  blob: Blob,
  filename?: string,
  mimeType?: string,
): File {
  const type = mimeType || blob.type;
  const extension = getExtensionFromMimeType(type);
  const name = filename || `voice-message-${Date.now()}.${extension}`;

  return new File([blob], name, { type });
}
