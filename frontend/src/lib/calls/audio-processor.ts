/**
 * Audio Processor
 *
 * Advanced audio processing for voice calls including:
 * - Noise suppression
 * - Echo cancellation
 * - Automatic gain control
 * - Audio level detection
 * - Voice activity detection (VAD)
 */

// =============================================================================
// Types
// =============================================================================

export interface AudioProcessorConfig {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  channelCount?: number;
  // Voice Activity Detection
  vadEnabled?: boolean;
  vadThreshold?: number; // 0-255
  vadDebounceMs?: number;
}

export interface AudioLevelInfo {
  level: number; // 0-100
  isSpeaking: boolean;
  timestamp: number;
}

export interface AudioProcessorCallbacks {
  onAudioLevel?: (info: AudioLevelInfo) => void;
  onVoiceActivity?: (speaking: boolean) => void;
  onError?: (error: Error) => void;
}

// =============================================================================
// Audio Processor Class
// =============================================================================

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  private config: Required<AudioProcessorConfig>;
  private callbacks: AudioProcessorCallbacks;

  // VAD state
  private isSpeaking: boolean = false;
  private vadDebounceTimer: number | null = null;
  private lastAudioLevel: number = 0;

  // Animation frame for audio level monitoring
  private animationFrameId: number | null = null;

  constructor(
    config: AudioProcessorConfig = {},
    callbacks: AudioProcessorCallbacks = {},
  ) {
    this.config = {
      echoCancellation: config.echoCancellation ?? true,
      noiseSuppression: config.noiseSuppression ?? true,
      autoGainControl: config.autoGainControl ?? true,
      sampleRate: config.sampleRate ?? 48000,
      channelCount: config.channelCount ?? 1,
      vadEnabled: config.vadEnabled ?? true,
      vadThreshold: config.vadThreshold ?? 30,
      vadDebounceMs: config.vadDebounceMs ?? 300,
    };
    this.callbacks = callbacks;
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Get audio constraints with processing enabled
   */
  getAudioConstraints(): MediaTrackConstraints {
    return {
      echoCancellation: this.config.echoCancellation,
      noiseSuppression: this.config.noiseSuppression,
      autoGainControl: this.config.autoGainControl,
      sampleRate: this.config.sampleRate,
      channelCount: this.config.channelCount,
    };
  }

  /**
   * Initialize audio processor with media stream
   */
  async initialize(stream: MediaStream): Promise<void> {
    try {
      this.stream = stream;

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
      });

      // Create analyser for audio level detection
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Create source from stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // Connect nodes: source -> gain -> analyser
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);

      // Start monitoring audio levels
      this.startAudioLevelMonitoring();
    } catch (error) {
      this.callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  // ===========================================================================
  // Audio Level Monitoring
  // ===========================================================================

  /**
   * Start monitoring audio levels
   */
  private startAudioLevelMonitoring(): void {
    if (!this.analyserNode) return;

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (!this.analyserNode) return;

      this.analyserNode.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const level = Math.min(100, (rms / 255) * 100);

      this.lastAudioLevel = level;

      // Voice Activity Detection
      if (this.config.vadEnabled) {
        this.detectVoiceActivity(level);
      }

      // Notify callback
      this.callbacks.onAudioLevel?.({
        level,
        isSpeaking: this.isSpeaking,
        timestamp: Date.now(),
      });

      this.animationFrameId = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  /**
   * Stop monitoring audio levels
   */
  private stopAudioLevelMonitoring(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get current audio level (0-100)
   */
  getAudioLevel(): number {
    return this.lastAudioLevel;
  }

  // ===========================================================================
  // Voice Activity Detection
  // ===========================================================================

  /**
   * Detect voice activity based on audio level
   */
  private detectVoiceActivity(level: number): void {
    const isAboveThreshold = level > this.config.vadThreshold;

    // Debounce voice activity changes
    if (this.vadDebounceTimer !== null) {
      window.clearTimeout(this.vadDebounceTimer);
    }

    this.vadDebounceTimer = window.setTimeout(() => {
      const wasSpeak = this.isSpeaking;
      this.isSpeaking = isAboveThreshold;

      // Notify on change
      if (wasSpeak !== this.isSpeaking) {
        this.callbacks.onVoiceActivity?.(this.isSpeaking);
      }
    }, this.config.vadDebounceMs);
  }

  /**
   * Check if currently speaking
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  // ===========================================================================
  // Gain Control
  // ===========================================================================

  /**
   * Set gain/volume (0-2, where 1 is normal)
   */
  setGain(gain: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, gain));
    }
  }

  /**
   * Get current gain
   */
  getGain(): number {
    return this.gainNode?.gain.value ?? 1.0;
  }

  // ===========================================================================
  // Configuration Updates
  // ===========================================================================

  /**
   * Update audio processing configuration
   */
  async updateConfig(config: Partial<AudioProcessorConfig>): Promise<void> {
    Object.assign(this.config, config);

    // If stream exists, re-apply constraints
    if (this.stream) {
      const audioTrack = this.stream.getAudioTracks()[0];
      if (audioTrack) {
        try {
          await audioTrack.applyConstraints(this.getAudioConstraints());
        } catch (error) {
          this.callbacks.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioProcessorConfig {
    return { ...this.config };
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  /**
   * Clean up audio processor
   */
  cleanup(): void {
    // Stop monitoring
    this.stopAudioLevelMonitoring();

    // Clear debounce timer
    if (this.vadDebounceTimer !== null) {
      window.clearTimeout(this.vadDebounceTimer);
      this.vadDebounceTimer = null;
    }

    // Disconnect and cleanup nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Reset state
    this.stream = null;
    this.isSpeaking = false;
    this.lastAudioLevel = 0;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createAudioProcessor(
  config?: AudioProcessorConfig,
  callbacks?: AudioProcessorCallbacks,
): AudioProcessor {
  return new AudioProcessor(config, callbacks);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if browser supports audio processing features
 */
export function checkAudioProcessingSupport(): {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
} {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    return {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    };
  }

  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
}

/**
 * Get optimal audio constraints based on browser support
 */
export async function getOptimalAudioConstraints(): Promise<MediaTrackConstraints> {
  const support = checkAudioProcessingSupport();

  return {
    echoCancellation: support.echoCancellation,
    noiseSuppression: support.noiseSuppression,
    autoGainControl: support.autoGainControl,
    sampleRate: 48000,
    channelCount: 1,
  };
}

/**
 * Test audio input device
 */
export async function testAudioInput(
  deviceId?: string,
): Promise<{ success: boolean; error?: string; level?: number }> {
  try {
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const processor = createAudioProcessor();
    await processor.initialize(stream);

    // Test for 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const level = processor.getAudioLevel();

    // Cleanup
    stream.getTracks().forEach((track) => track.stop());
    processor.cleanup();

    return {
      success: true,
      level,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Calculate audio quality score based on level consistency
 */
export function calculateAudioQuality(levels: number[]): {
  score: number; // 0-100
  quality: "excellent" | "good" | "fair" | "poor";
  recommendation?: string;
} {
  if (levels.length === 0) {
    return { score: 0, quality: "poor", recommendation: "No audio detected" };
  }

  // Calculate statistics
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  const variance =
    levels.reduce((sum, level) => sum + Math.pow(level - avg, 2), 0) /
    levels.length;
  const stdDev = Math.sqrt(variance);

  // Quality factors
  const avgScore = Math.min(100, avg * 2); // Prefer moderate levels
  const consistencyScore = 100 - Math.min(100, stdDev * 5); // Lower variance is better

  // Combined score
  const score = (avgScore + consistencyScore) / 2;

  let quality: "excellent" | "good" | "fair" | "poor";
  let recommendation: string | undefined;

  if (score >= 80) {
    quality = "excellent";
  } else if (score >= 60) {
    quality = "good";
  } else if (score >= 40) {
    quality = "fair";
    recommendation = "Consider adjusting microphone position or volume";
  } else {
    quality = "poor";
    recommendation = "Check microphone connection and permissions";
  }

  return { score: Math.round(score), quality, recommendation };
}
