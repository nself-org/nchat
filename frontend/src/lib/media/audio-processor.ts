/**
 * Audio Processor - Comprehensive audio processing utilities
 *
 * Handles audio waveform generation, duration extraction, visualization data,
 * metadata retrieval, and format detection.
 */

// ============================================================================
// Types
// ============================================================================

export interface AudioMetadata {
  duration: number;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  codec?: string;
}

export interface WaveformOptions {
  samples?: number;
  channel?: number;
  normalize?: boolean;
}

export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
  channels: number;
}

export interface VisualizationData {
  bars: number[];
  peaks: number[];
  rms: number[];
}

export type AudioFormat =
  | "mp3"
  | "wav"
  | "ogg"
  | "flac"
  | "aac"
  | "m4a"
  | "webm"
  | "unknown";

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
}

export interface AudioAnalysis {
  peakAmplitude: number;
  averageAmplitude: number;
  silenceRatio: number;
  dynamicRange: number;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_WAVEFORM_SAMPLES = 100;
export const DEFAULT_VISUALIZATION_BARS = 64;
export const MAX_AUDIO_DURATION = 3600; // 1 hour
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
export const SILENCE_THRESHOLD = 0.01;

export const AUDIO_MIME_TYPES: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/x-m4a",
  webm: "audio/webm",
  unknown: "application/octet-stream",
};

export const MIME_TO_AUDIO_FORMAT: Record<string, AudioFormat> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/aac": "aac",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/mp4": "m4a",
  "audio/webm": "webm",
};

export const SUPPORTED_AUDIO_FORMATS: AudioFormat[] = [
  "mp3",
  "wav",
  "ogg",
  "flac",
  "aac",
  "m4a",
  "webm",
];

// ============================================================================
// Format Detection
// ============================================================================

/**
 * Detect audio format from MIME type
 */
export function detectFormatFromMime(mimeType: string): AudioFormat {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  return MIME_TO_AUDIO_FORMAT[normalized] || "unknown";
}

/**
 * Detect audio format from file extension
 */
export function detectFormatFromExtension(filename: string): AudioFormat {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const extensionMap: Record<string, AudioFormat> = {
    mp3: "mp3",
    wav: "wav",
    ogg: "ogg",
    oga: "ogg",
    flac: "flac",
    aac: "aac",
    m4a: "m4a",
    webm: "webm",
    weba: "webm",
  };
  return extensionMap[ext] || "unknown";
}

/**
 * Detect audio format from file
 */
export function detectFormat(file: File): AudioFormat {
  const fromMime = detectFormatFromMime(file.type);
  if (fromMime !== "unknown") return fromMime;
  return detectFormatFromExtension(file.name);
}

/**
 * Get MIME type for audio format
 */
export function getMimeType(format: AudioFormat): string {
  return AUDIO_MIME_TYPES[format] || AUDIO_MIME_TYPES.unknown;
}

/**
 * Check if format is supported for playback
 */
export function isFormatSupported(format: AudioFormat): boolean {
  return SUPPORTED_AUDIO_FORMATS.includes(format);
}

/**
 * Check if file is audio based on MIME type
 */
export function isAudio(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("audio/");
}

// ============================================================================
// Audio Loading
// ============================================================================

/**
 * Load an audio element from a File, Blob, or URL
 */
export function loadAudio(
  source: File | Blob | string,
): Promise<HTMLAudioElement> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const isUrl = typeof source === "string";

    audio.onloadedmetadata = () => {
      if (!isUrl) {
        URL.revokeObjectURL(audio.src);
      }
      resolve(audio);
    };

    audio.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(audio.src);
      }
      reject(new Error("Failed to load audio"));
    };

    if (isUrl) {
      audio.crossOrigin = "anonymous";
      audio.src = source;
    } else {
      audio.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Create an audio element that persists
 */
export function createAudioElement(
  source: File | Blob | string,
): HTMLAudioElement {
  const audio = document.createElement("audio");
  audio.preload = "metadata";

  if (typeof source === "string") {
    audio.crossOrigin = "anonymous";
    audio.src = source;
  } else {
    audio.src = URL.createObjectURL(source);
  }

  return audio;
}

/**
 * Decode audio data from file/blob
 */
export async function decodeAudioData(
  source: File | Blob,
): Promise<AudioBuffer> {
  const arrayBuffer = await source.arrayBuffer();
  const audioContext = new (
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  )();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    await audioContext.close();
  }
}

// ============================================================================
// Audio Metadata
// ============================================================================

/**
 * Get audio metadata (duration, channels, etc.)
 */
export function getAudioMetadata(
  source: File | Blob | string,
): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const isUrl = typeof source === "string";

    audio.onloadedmetadata = () => {
      if (!isUrl) {
        URL.revokeObjectURL(audio.src);
      }

      resolve({
        duration: audio.duration,
      });
    };

    audio.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(audio.src);
      }
      reject(new Error("Failed to load audio metadata"));
    };

    if (isUrl) {
      audio.crossOrigin = "anonymous";
      audio.src = source;
    } else {
      audio.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Get detailed audio metadata using AudioBuffer
 */
export async function getDetailedAudioMetadata(
  source: File | Blob,
): Promise<AudioMetadata> {
  const audioBuffer = await decodeAudioData(source);

  return {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
  };
}

/**
 * Get audio duration
 */
export function getAudioDuration(
  source: File | Blob | string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";

    const isUrl = typeof source === "string";

    audio.onloadedmetadata = () => {
      if (!isUrl) {
        URL.revokeObjectURL(audio.src);
      }
      resolve(audio.duration);
    };

    audio.onerror = () => {
      if (!isUrl) {
        URL.revokeObjectURL(audio.src);
      }
      reject(new Error("Failed to get audio duration"));
    };

    if (isUrl) {
      audio.crossOrigin = "anonymous";
      audio.src = source;
    } else {
      audio.src = URL.createObjectURL(source);
    }
  });
}

// ============================================================================
// Waveform Generation
// ============================================================================

/**
 * Generate waveform data from audio file
 */
export async function generateWaveform(
  source: File | Blob,
  options: WaveformOptions = {},
): Promise<WaveformData> {
  const {
    samples = DEFAULT_WAVEFORM_SAMPLES,
    channel = 0,
    normalize = true,
  } = options;

  const audioBuffer = await decodeAudioData(source);
  const channelData = audioBuffer.getChannelData(
    Math.min(channel, audioBuffer.numberOfChannels - 1),
  );

  const blockSize = Math.floor(channelData.length / samples);
  const peaks: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    let max = 0;

    for (let j = 0; j < blockSize; j++) {
      const value = Math.abs(channelData[start + j]);
      if (value > max) {
        max = value;
      }
    }

    peaks.push(max);
  }

  // Normalize to 0-1
  if (normalize) {
    const maxPeak = Math.max(...peaks);
    if (maxPeak > 0) {
      for (let i = 0; i < peaks.length; i++) {
        peaks[i] = peaks[i] / maxPeak;
      }
    }
  }

  return {
    peaks,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
  };
}

/**
 * Generate simple waveform peaks (array of numbers 0-1)
 */
export async function generateWaveformPeaks(
  source: File | Blob,
  samples: number = DEFAULT_WAVEFORM_SAMPLES,
): Promise<number[]> {
  const waveform = await generateWaveform(source, { samples, normalize: true });
  return waveform.peaks;
}

/**
 * Generate waveform with RMS (average) values
 */
export async function generateWaveformWithRMS(
  source: File | Blob,
  samples: number = DEFAULT_WAVEFORM_SAMPLES,
): Promise<{ peaks: number[]; rms: number[] }> {
  const audioBuffer = await decodeAudioData(source);
  const channelData = audioBuffer.getChannelData(0);

  const blockSize = Math.floor(channelData.length / samples);
  const peaks: number[] = [];
  const rms: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    let max = 0;
    let sumSquares = 0;

    for (let j = 0; j < blockSize; j++) {
      const value = Math.abs(channelData[start + j]);
      sumSquares += value * value;
      if (value > max) {
        max = value;
      }
    }

    peaks.push(max);
    rms.push(Math.sqrt(sumSquares / blockSize));
  }

  // Normalize
  const maxPeak = Math.max(...peaks);
  const maxRMS = Math.max(...rms);

  return {
    peaks: peaks.map((p) => (maxPeak > 0 ? p / maxPeak : 0)),
    rms: rms.map((r) => (maxRMS > 0 ? r / maxRMS : 0)),
  };
}

// ============================================================================
// Visualization Data
// ============================================================================

/**
 * Generate visualization data for audio bars
 */
export async function generateVisualizationData(
  source: File | Blob,
  bars: number = DEFAULT_VISUALIZATION_BARS,
): Promise<VisualizationData> {
  const { peaks, rms } = await generateWaveformWithRMS(source, bars);

  return {
    bars: peaks,
    peaks,
    rms,
  };
}

/**
 * Generate frequency-domain visualization data
 */
export async function generateFrequencyData(
  source: File | Blob,
  fftSize: number = 2048,
): Promise<Float32Array> {
  const audioBuffer = await decodeAudioData(source);
  const channelData = audioBuffer.getChannelData(0);

  // Take a sample from the middle of the audio
  const midpoint = Math.floor(channelData.length / 2);
  const sampleData = channelData.slice(
    midpoint - fftSize / 2,
    midpoint + fftSize / 2,
  );

  // Simple FFT approximation (for demonstration)
  // In production, use a proper FFT library
  const frequencyData = new Float32Array(fftSize / 2);
  for (let i = 0; i < frequencyData.length; i++) {
    let sum = 0;
    for (let j = 0; j < fftSize; j++) {
      sum += (sampleData[j] || 0) * Math.cos((2 * Math.PI * i * j) / fftSize);
    }
    frequencyData[i] = Math.abs(sum / fftSize);
  }

  // Normalize
  const max = Math.max(...frequencyData);
  if (max > 0) {
    for (let i = 0; i < frequencyData.length; i++) {
      frequencyData[i] = frequencyData[i] / max;
    }
  }

  return frequencyData;
}

// ============================================================================
// Audio Analysis
// ============================================================================

/**
 * Analyze audio for peak, average amplitude, etc.
 */
export async function analyzeAudio(
  source: File | Blob,
): Promise<AudioAnalysis> {
  const audioBuffer = await decodeAudioData(source);
  const channelData = audioBuffer.getChannelData(0);

  let peak = 0;
  let sum = 0;
  let silentSamples = 0;

  for (let i = 0; i < channelData.length; i++) {
    const value = Math.abs(channelData[i]);
    sum += value;
    if (value > peak) {
      peak = value;
    }
    if (value < SILENCE_THRESHOLD) {
      silentSamples++;
    }
  }

  const average = sum / channelData.length;
  const silenceRatio = silentSamples / channelData.length;

  return {
    peakAmplitude: peak,
    averageAmplitude: average,
    silenceRatio,
    dynamicRange: peak > 0 ? peak / average : 0,
  };
}

/**
 * Detect if audio is mostly silent
 */
export async function isSilent(
  source: File | Blob,
  threshold: number = 0.95,
): Promise<boolean> {
  const analysis = await analyzeAudio(source);
  return analysis.silenceRatio > threshold;
}

// ============================================================================
// Audio Validation
// ============================================================================

/**
 * Validate audio file
 */
export async function validateAudio(
  file: File,
  options: {
    maxSize?: number;
    maxDuration?: number;
    allowedFormats?: AudioFormat[];
  } = {},
): Promise<AudioValidationResult> {
  const {
    maxSize = MAX_AUDIO_SIZE,
    maxDuration = MAX_AUDIO_DURATION,
    allowedFormats,
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Audio size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check format
  if (allowedFormats) {
    const format = detectFormat(file);
    if (!allowedFormats.includes(format)) {
      return {
        valid: false,
        error: `Audio format '${format}' is not allowed`,
      };
    }
  }

  // Check duration
  try {
    const duration = await getAudioDuration(file);
    if (duration > maxDuration) {
      return {
        valid: false,
        error: `Audio duration exceeds maximum of ${Math.round(maxDuration / 60)} minutes`,
      };
    }
  } catch {
    return {
      valid: false,
      error: "Failed to read audio metadata",
    };
  }

  return { valid: true };
}

/**
 * Quick validation (size and format only, no async)
 */
export function validateAudioSync(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: AudioFormat[];
  } = {},
): AudioValidationResult {
  const { maxSize = MAX_AUDIO_SIZE, allowedFormats } = options;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Audio size exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  if (allowedFormats) {
    const format = detectFormat(file);
    if (!allowedFormats.includes(format)) {
      return {
        valid: false,
        error: `Audio format '${format}' is not allowed`,
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

/**
 * Parse duration string to seconds
 */
export function parseDuration(durationStr: string): number {
  const parts = durationStr.split(":").map(Number);

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] || 0;
}

/**
 * Estimate file size from duration and bitrate
 */
export function estimateFileSize(
  durationSeconds: number,
  bitrateKbps: number,
): number {
  return (durationSeconds * bitrateKbps * 1024) / 8;
}

/**
 * Get recommended bitrate for audio quality
 */
export function getRecommendedBitrate(
  quality: "low" | "medium" | "high" | "lossless",
): number {
  const bitrateMap: Record<string, number> = {
    low: 64,
    medium: 128,
    high: 256,
    lossless: 1411, // CD quality
  };
  return bitrateMap[quality] || 128;
}

/**
 * Create an audio URL for playback
 */
export function createAudioUrl(source: File | Blob): string {
  return URL.createObjectURL(source);
}

/**
 * Revoke an audio URL
 */
export function revokeAudioUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Check if browser can play audio format
 */
export function canPlayFormat(format: AudioFormat): boolean {
  const audio = document.createElement("audio");
  const mimeType = getMimeType(format);
  const canPlay = audio.canPlayType(mimeType);
  return canPlay === "probably" || canPlay === "maybe";
}

/**
 * Get supported audio formats for current browser
 */
export function getSupportedFormats(): AudioFormat[] {
  return Object.keys(AUDIO_MIME_TYPES)
    .filter((format) => format !== "unknown")
    .filter((format) => canPlayFormat(format as AudioFormat)) as AudioFormat[];
}

/**
 * Normalize waveform data to 0-1 range
 */
export function normalizeWaveform(data: number[]): number[] {
  const max = Math.max(...data.map(Math.abs));
  if (max === 0) return data.map(() => 0);
  return data.map((v) => v / max);
}

/**
 * Downsample waveform data
 */
export function downsampleWaveform(
  data: number[],
  targetSamples: number,
): number[] {
  if (data.length <= targetSamples) return data;

  const ratio = data.length / targetSamples;
  const result: number[] = [];

  for (let i = 0; i < targetSamples; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    let max = 0;

    for (let j = start; j < end; j++) {
      if (Math.abs(data[j]) > Math.abs(max)) {
        max = data[j];
      }
    }

    result.push(max);
  }

  return result;
}
