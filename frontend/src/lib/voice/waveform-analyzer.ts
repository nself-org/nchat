/**
 * Waveform Analysis Utilities
 *
 * Provides real-time audio waveform analysis using Web Audio API
 * and static waveform generation from audio blobs/files.
 */

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface WaveformData {
  /** Normalized amplitude values (0-1) */
  amplitudes: number[];
  /** Number of samples */
  length: number;
  /** Duration in seconds */
  duration: number;
  /** Sample rate used for analysis */
  sampleRate: number;
}

export interface WaveformAnalyzerOptions {
  /** FFT size for frequency analysis (must be power of 2, defaults to 2048) */
  fftSize?: number;
  /** Smoothing time constant (0-1, defaults to 0.8) */
  smoothingTimeConstant?: number;
  /** Number of bars/samples for visualization (defaults to 50) */
  barCount?: number;
  /** Minimum decibels for visualization (defaults to -90) */
  minDecibels?: number;
  /** Maximum decibels for visualization (defaults to -10) */
  maxDecibels?: number;
}

export interface RealtimeWaveformData {
  /** Time domain data (waveform) */
  waveform: Uint8Array;
  /** Frequency domain data (spectrum) */
  frequency: Uint8Array;
  /** Normalized bars for visualization */
  bars: number[];
  /** Current RMS volume level (0-1) */
  volume: number;
  /** Peak volume since last reset */
  peakVolume: number;
}

export type WaveformUpdateCallback = (data: RealtimeWaveformData) => void;

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Required<WaveformAnalyzerOptions> = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  barCount: 50,
  minDecibels: -90,
  maxDecibels: -10,
};

// ============================================================================
// REALTIME WAVEFORM ANALYZER
// ============================================================================

/**
 * Real-time waveform analyzer for live audio streams
 *
 * @example
 * ```typescript
 * const analyzer = new RealtimeWaveformAnalyzer(audioStream, {
 *   barCount: 40,
 * })
 *
 * analyzer.onUpdate((data) => {
 *   // Update visualization with data.bars
 *   // console.log('Volume:', data.volume)
 * })
 *
 * analyzer.start()
 *
 * // Later...
 * analyzer.stop()
 * ```
 */
export class RealtimeWaveformAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream;
  private options: Required<WaveformAnalyzerOptions>;
  private animationFrameId: number | null = null;
  private updateCallback: WaveformUpdateCallback | null = null;
  private _isRunning = false;
  private _peakVolume = 0;
  private waveformBuffer: Uint8Array<ArrayBuffer> | null = null;
  private frequencyBuffer: Uint8Array<ArrayBuffer> | null = null;

  constructor(stream: MediaStream, options: WaveformAnalyzerOptions = {}) {
    this.stream = stream;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Whether the analyzer is currently running */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /** Current peak volume */
  get peakVolume(): number {
    return this._peakVolume;
  }

  /**
   * Set the update callback for waveform data
   */
  onUpdate(callback: WaveformUpdateCallback): void {
    this.updateCallback = callback;
  }

  /**
   * Start analyzing the audio stream
   */
  async start(): Promise<void> {
    if (this._isRunning) return;

    try {
      // Create AudioContext
      this.audioContext = new AudioContext();

      // Create analyzer node
      this.analyzerNode = this.audioContext.createAnalyser();
      this.analyzerNode.fftSize = this.options.fftSize;
      this.analyzerNode.smoothingTimeConstant =
        this.options.smoothingTimeConstant;
      this.analyzerNode.minDecibels = this.options.minDecibels;
      this.analyzerNode.maxDecibels = this.options.maxDecibels;

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.sourceNode.connect(this.analyzerNode);

      // Initialize buffers
      const bufferLength = this.analyzerNode.frequencyBinCount;
      this.waveformBuffer = new Uint8Array(bufferLength);
      this.frequencyBuffer = new Uint8Array(bufferLength);

      this._isRunning = true;
      this.analyze();
    } catch (error) {
      logger.error("Failed to start waveform analyzer:", error);
      this.cleanup();
    }
  }

  /**
   * Stop analyzing
   */
  stop(): void {
    this._isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.cleanup();
  }

  /**
   * Reset peak volume
   */
  resetPeak(): void {
    this._peakVolume = 0;
  }

  /**
   * Get current waveform data snapshot
   */
  getCurrentData(): RealtimeWaveformData | null {
    if (!this.analyzerNode || !this.waveformBuffer || !this.frequencyBuffer) {
      return null;
    }

    this.analyzerNode.getByteTimeDomainData(this.waveformBuffer);
    this.analyzerNode.getByteFrequencyData(this.frequencyBuffer);

    const bars = this.calculateBars(this.frequencyBuffer);
    const volume = this.calculateVolume(this.waveformBuffer);

    return {
      waveform: new Uint8Array(this.waveformBuffer),
      frequency: new Uint8Array(this.frequencyBuffer),
      bars,
      volume,
      peakVolume: this._peakVolume,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private analyze(): void {
    if (!this._isRunning || !this.analyzerNode) return;

    const data = this.getCurrentData();

    if (data) {
      // Update peak volume
      if (data.volume > this._peakVolume) {
        this._peakVolume = data.volume;
      }

      // Call update callback
      this.updateCallback?.(data);
    }

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.analyze());
  }

  private calculateBars(frequencyData: Uint8Array<ArrayBufferLike>): number[] {
    const bars: number[] = [];
    const barCount = this.options.barCount;
    const binCount = frequencyData.length;

    // Group frequency bins into bars
    const binsPerBar = Math.floor(binCount / barCount);

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      const startBin = i * binsPerBar;

      for (let j = 0; j < binsPerBar; j++) {
        const bin = startBin + j;
        if (bin < binCount) {
          sum += frequencyData[bin];
        }
      }

      // Average and normalize to 0-1
      const average = sum / binsPerBar;
      bars.push(average / 255);
    }

    return bars;
  }

  private calculateVolume(waveformData: Uint8Array<ArrayBufferLike>): number {
    // Calculate RMS (Root Mean Square) volume
    let sumSquares = 0;

    for (let i = 0; i < waveformData.length; i++) {
      // Convert from 0-255 to -1 to 1
      const normalized = (waveformData[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / waveformData.length);

    // Clamp to 0-1 range (RMS can exceed 1 for very loud signals)
    return Math.min(1, rms);
  }

  private cleanup(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyzerNode) {
      this.analyzerNode.disconnect();
      this.analyzerNode = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.waveformBuffer = null;
    this.frequencyBuffer = null;
  }
}

// ============================================================================
// STATIC WAVEFORM GENERATION
// ============================================================================

/**
 * Generate waveform data from an audio blob
 *
 * @example
 * ```typescript
 * const waveform = await generateWaveform(audioBlob, 100)
 * // waveform.amplitudes contains 100 normalized values (0-1)
 * ```
 */
export async function generateWaveform(
  audioSource: Blob | ArrayBuffer | string,
  sampleCount: number = 100,
): Promise<WaveformData> {
  // Get ArrayBuffer from source
  let arrayBuffer: ArrayBuffer;

  if (audioSource instanceof Blob) {
    arrayBuffer = await audioSource.arrayBuffer();
  } else if (audioSource instanceof ArrayBuffer) {
    arrayBuffer = audioSource;
  } else if (typeof audioSource === "string") {
    // Assume it's a URL
    const response = await fetch(audioSource);
    arrayBuffer = await response.arrayBuffer();
  } else {
    throw new Error("Invalid audio source");
  }

  // Decode audio
  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;

  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }

  // Get raw audio data (use first channel for mono analysis)
  const rawData = audioBuffer.getChannelData(0);
  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;

  // Calculate samples per block
  const blockSize = Math.floor(rawData.length / sampleCount);
  const amplitudes: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const blockStart = blockSize * i;
    let sum = 0;

    // Calculate RMS of block
    for (let j = 0; j < blockSize; j++) {
      const sample = rawData[blockStart + j] || 0;
      sum += sample * sample;
    }

    const rms = Math.sqrt(sum / blockSize);
    amplitudes.push(rms);
  }

  // Normalize to 0-1 range
  const maxAmplitude = Math.max(...amplitudes, 0.001); // Avoid division by zero
  const normalizedAmplitudes = amplitudes.map((a) => a / maxAmplitude);

  return {
    amplitudes: normalizedAmplitudes,
    length: sampleCount,
    duration,
    sampleRate,
  };
}

/**
 * Generate waveform data with peak values (min/max) for more detailed visualization
 */
export async function generateDetailedWaveform(
  audioSource: Blob | ArrayBuffer | string,
  sampleCount: number = 100,
): Promise<{
  peaks: Array<{ min: number; max: number }>;
  duration: number;
  sampleRate: number;
}> {
  // Get ArrayBuffer from source
  let arrayBuffer: ArrayBuffer;

  if (audioSource instanceof Blob) {
    arrayBuffer = await audioSource.arrayBuffer();
  } else if (audioSource instanceof ArrayBuffer) {
    arrayBuffer = audioSource;
  } else if (typeof audioSource === "string") {
    const response = await fetch(audioSource);
    arrayBuffer = await response.arrayBuffer();
  } else {
    throw new Error("Invalid audio source");
  }

  // Decode audio
  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;

  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close();
  }

  const rawData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(rawData.length / sampleCount);
  const peaks: Array<{ min: number; max: number }> = [];

  for (let i = 0; i < sampleCount; i++) {
    const blockStart = blockSize * i;
    let min = 0;
    let max = 0;

    for (let j = 0; j < blockSize; j++) {
      const sample = rawData[blockStart + j] || 0;
      if (sample < min) min = sample;
      if (sample > max) max = sample;
    }

    peaks.push({ min, max });
  }

  return {
    peaks,
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
  };
}

/**
 * Get audio duration from a blob without full waveform analysis
 */
export async function getAudioDuration(
  audioSource: Blob | ArrayBuffer | string,
): Promise<number> {
  let arrayBuffer: ArrayBuffer;

  if (audioSource instanceof Blob) {
    arrayBuffer = await audioSource.arrayBuffer();
  } else if (audioSource instanceof ArrayBuffer) {
    arrayBuffer = audioSource;
  } else if (typeof audioSource === "string") {
    const response = await fetch(audioSource);
    arrayBuffer = await response.arrayBuffer();
  } else {
    throw new Error("Invalid audio source");
  }

  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.duration;
  } finally {
    await audioContext.close();
  }
}

/**
 * Normalize waveform data to ensure consistent visual appearance
 */
export function normalizeWaveform(
  amplitudes: number[],
  targetMin: number = 0.1,
  targetMax: number = 1,
): number[] {
  const currentMax = Math.max(...amplitudes);
  const currentMin = Math.min(...amplitudes);

  if (currentMax === currentMin) {
    // Constant signal - return middle value
    return amplitudes.map(() => (targetMin + targetMax) / 2);
  }

  const scale = (targetMax - targetMin) / (currentMax - currentMin);
  return amplitudes.map((a) => targetMin + (a - currentMin) * scale);
}

/**
 * Smooth waveform data to reduce visual noise
 */
export function smoothWaveform(
  amplitudes: number[],
  windowSize: number = 3,
): number[] {
  if (windowSize < 1 || amplitudes.length < windowSize) {
    return amplitudes;
  }

  const halfWindow = Math.floor(windowSize / 2);
  const result: number[] = [];

  for (let i = 0; i < amplitudes.length; i++) {
    let sum = 0;
    let count = 0;

    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < amplitudes.length) {
        sum += amplitudes[index];
        count++;
      }
    }

    result.push(sum / count);
  }

  return result;
}

/**
 * Resample waveform to a different number of samples
 */
export function resampleWaveform(
  amplitudes: number[],
  targetCount: number,
): number[] {
  if (targetCount === amplitudes.length) {
    return amplitudes;
  }

  const result: number[] = [];
  const ratio = amplitudes.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, amplitudes.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    const value =
      amplitudes[srcIndexFloor] * (1 - fraction) +
      amplitudes[srcIndexCeil] * fraction;

    result.push(value);
  }

  return result;
}
