/**
 * Voice Recording Library for Capacitor
 * Handles voice note recording with waveform visualization
 */

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface VoiceRecording {
  uri: string;
  path?: string;
  duration: number;
  size: number;
  format: string;
  waveformData?: number[];
}

export interface RecordingOptions {
  maxDuration?: number; // in seconds
  sampleRate?: number;
  channels?: 1 | 2;
  quality?: "low" | "medium" | "high";
}

export interface WaveformVisualizerOptions {
  width: number;
  height: number;
  barWidth?: number;
  barGap?: number;
  barCount?: number;
  color?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_RECORDING_DURATION = 300; // 5 minutes
const DEFAULT_SAMPLE_RATE = 44100;
const WAVEFORM_SAMPLE_COUNT = 100;

// ============================================================================
// Voice Recording Service
// ============================================================================

class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private waveformData: number[] = [];

  /**
   * Start recording
   */
  async startRecording(options: RecordingOptions = {}): Promise<void> {
    const {
      maxDuration = MAX_RECORDING_DURATION,
      sampleRate = DEFAULT_SAMPLE_RATE,
      channels = 1,
      quality = "medium",
    } = options;

    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate,
        channelCount: channels,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Set up audio context for waveform visualization
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.microphone = this.audioContext.createMediaStreamSource(stream);
    this.microphone.connect(this.analyser);

    // Set up media recorder
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: this.getAudioBitrate(quality),
    });

    this.audioChunks = [];
    this.waveformData = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(100); // Collect data every 100ms

    // Start waveform data collection
    this.collectWaveformData();

    // Auto-stop after max duration
    setTimeout(() => {
      if (this.isRecording()) {
        this.stopRecording();
      }
    }, maxDuration * 1000);
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<VoiceRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const duration = (Date.now() - this.startTime) / 1000;
          const blob = new Blob(this.audioChunks, {
            type: this.mediaRecorder!.mimeType,
          });

          // Stop waveform collection
          if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
          }

          // Clean up
          if (this.microphone && this.audioContext) {
            this.microphone.disconnect();
            await this.audioContext.close();
          }

          this.mediaRecorder = null;
          this.audioContext = null;
          this.analyser = null;
          this.microphone = null;

          // Save to file
          const filename = `voice-${Date.now()}.webm`;
          const path = await this.saveRecording(blob, filename);

          const recording: VoiceRecording = {
            uri: URL.createObjectURL(blob),
            path,
            duration,
            size: blob.size,
            format: "webm",
            waveformData: this.waveformData,
          };

          resolve(recording);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      this.collectWaveformData();
    }
  }

  /**
   * Cancel recording
   */
  async cancelRecording(): Promise<void> {
    if (this.mediaRecorder) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }

      if (this.mediaRecorder.state !== "inactive") {
        this.mediaRecorder.stop();
        this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      if (this.microphone && this.audioContext) {
        this.microphone.disconnect();
        await this.audioContext.close();
      }

      this.mediaRecorder = null;
      this.audioContext = null;
      this.analyser = null;
      this.microphone = null;
      this.audioChunks = [];
      this.waveformData = [];
    }
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return (
      this.mediaRecorder !== null && this.mediaRecorder.state === "recording"
    );
  }

  /**
   * Check if recording is paused
   */
  isPaused(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === "paused";
  }

  /**
   * Get current recording duration
   */
  getCurrentDuration(): number {
    if (!this.isRecording() && !this.isPaused()) {
      return 0;
    }
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Get current waveform data
   */
  getCurrentWaveform(): number[] {
    return [...this.waveformData];
  }

  /**
   * Collect waveform data for visualization
   */
  private collectWaveformData(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const collect = () => {
      if (!this.analyser || !this.isRecording()) return;

      this.analyser.getByteTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square) for amplitude
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Store normalized amplitude (0-1)
      this.waveformData.push(rms);

      // Limit waveform data size
      if (this.waveformData.length > WAVEFORM_SAMPLE_COUNT * 10) {
        // Downsample by averaging pairs
        this.waveformData = this.downsampleWaveform(this.waveformData);
      }

      this.animationFrameId = requestAnimationFrame(collect);
    };

    collect();
  }

  /**
   * Downsample waveform data
   */
  private downsampleWaveform(data: number[]): number[] {
    const downsampled: number[] = [];
    for (let i = 0; i < data.length; i += 2) {
      const avg = (data[i] + (data[i + 1] || 0)) / 2;
      downsampled.push(avg);
    }
    return downsampled;
  }

  /**
   * Save recording to filesystem
   */
  private async saveRecording(blob: Blob, filename: string): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      // Convert blob to base64 for native
      const base64 = await this.blobToBase64(blob);
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Data,
      });
      return result.uri;
    }

    // For web, just return blob URL
    return URL.createObjectURL(blob);
  }

  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return "";
  }

  /**
   * Get audio bitrate based on quality
   */
  private getAudioBitrate(quality: "low" | "medium" | "high"): number {
    const bitrateMap = {
      low: 32000,
      medium: 64000,
      high: 128000,
    };
    return bitrateMap[quality];
  }

  /**
   * Check microphone permission
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Request microphone permission
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      logger.error("Error requesting microphone permission:", error);
      return false;
    }
  }
}

// Export singleton instance
export const voiceRecorder = new VoiceRecordingService();

// ============================================================================
// Waveform Visualization
// ============================================================================

/**
 * Draw waveform on canvas
 */
export function drawWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  options: WaveformVisualizerOptions,
): void {
  const {
    width,
    height,
    barWidth = 3,
    barGap = 1,
    barCount = 50,
    color = "#3b82f6",
  } = options;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Downsample waveform data to fit bar count
  const sampledData = sampleWaveformData(waveformData, barCount);

  // Draw bars
  const totalBarWidth = barWidth + barGap;
  const centerY = height / 2;

  ctx.fillStyle = color;

  sampledData.forEach((amplitude, index) => {
    const x = index * totalBarWidth;
    const barHeight = amplitude * height * 0.8;

    // Draw centered bar
    ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
  });
}

/**
 * Sample waveform data to match desired bar count
 */
function sampleWaveformData(data: number[], targetCount: number): number[] {
  if (data.length === 0) {
    return new Array(targetCount).fill(0.1);
  }

  if (data.length <= targetCount) {
    // Pad with zeros if needed
    return [...data, ...new Array(targetCount - data.length).fill(0.1)];
  }

  // Downsample by averaging buckets
  const sampled: number[] = [];
  const bucketSize = Math.floor(data.length / targetCount);

  for (let i = 0; i < targetCount; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, data.length);
    const bucket = data.slice(start, end);
    const avg = bucket.reduce((sum, val) => sum + val, 0) / bucket.length;
    sampled.push(avg || 0.1);
  }

  return sampled;
}

/**
 * Create animated waveform for playback
 */
export function createAnimatedWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  currentTime: number,
  duration: number,
  options: WaveformVisualizerOptions,
): void {
  const {
    width,
    height,
    barWidth = 3,
    barGap = 1,
    barCount = 50,
    color = "#3b82f6",
  } = options;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  const sampledData = sampleWaveformData(waveformData, barCount);
  const totalBarWidth = barWidth + barGap;
  const centerY = height / 2;
  const progress = currentTime / duration;
  const playedBars = Math.floor(progress * barCount);

  sampledData.forEach((amplitude, index) => {
    const x = index * totalBarWidth;
    const barHeight = amplitude * height * 0.8;

    // Different color for played vs unplayed
    ctx.fillStyle = index <= playedBars ? color : `${color}40`;
    ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
  });
}

/**
 * Format duration as MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
