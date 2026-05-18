/**
 * Adaptive Bitrate Logic
 *
 * Implements ABR (Adaptive Bitrate) algorithms for selecting optimal
 * quality levels based on network conditions and device capabilities.
 *
 * @module lib/streaming/adaptive-bitrate
 */

import type { BitrateLevel, StreamQuality } from "./stream-types";

// ============================================================================
// Types
// ============================================================================

export interface ABRConfig {
  minAutoBitrate: number;
  maxAutoBitrate: number;
  bufferBasedABR: boolean;
  bandwidthEstimator: "ewma" | "sliding-window";
  switchUpThreshold: number;
  switchDownThreshold: number;
  minBufferForQualitySwitch: number;
}

export interface NetworkConditions {
  bandwidth: number; // bits per second
  latency: number; // milliseconds
  packetLoss: number; // percentage
}

export interface BufferState {
  currentBuffer: number; // seconds
  targetBuffer: number; // seconds
  maxBuffer: number; // seconds
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ABR_CONFIG: ABRConfig = {
  minAutoBitrate: 500_000, // 500 kbps
  maxAutoBitrate: 10_000_000, // 10 Mbps
  bufferBasedABR: true,
  bandwidthEstimator: "ewma",
  switchUpThreshold: 0.8, // 80% of bandwidth
  switchDownThreshold: 1.2, // 120% of bitrate
  minBufferForQualitySwitch: 5, // 5 seconds
};

// ============================================================================
// Bandwidth Estimator
// ============================================================================

class BandwidthEstimator {
  private samples: number[] = [];
  private maxSamples: number;
  private alpha: number = 0.8; // EWMA smoothing factor

  constructor(maxSamples: number = 10) {
    this.maxSamples = maxSamples;
  }

  /**
   * Add bandwidth sample
   */
  public addSample(bandwidth: number): void {
    this.samples.push(bandwidth);

    // Keep only recent samples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * Get estimated bandwidth using EWMA
   */
  public getEstimateEWMA(): number {
    if (this.samples.length === 0) return 0;

    let estimate = this.samples[0];

    for (let i = 1; i < this.samples.length; i++) {
      estimate = this.alpha * this.samples[i] + (1 - this.alpha) * estimate;
    }

    return estimate;
  }

  /**
   * Get estimated bandwidth using sliding window average
   */
  public getEstimateSlidingWindow(): number {
    if (this.samples.length === 0) return 0;

    const sum = this.samples.reduce((a, b) => a + b, 0);
    return sum / this.samples.length;
  }

  /**
   * Get estimated bandwidth based on configured method
   */
  public getEstimate(method: "ewma" | "sliding-window"): number {
    return method === "ewma"
      ? this.getEstimateEWMA()
      : this.getEstimateSlidingWindow();
  }

  /**
   * Reset estimator
   */
  public reset(): void {
    this.samples = [];
  }
}

// ============================================================================
// Adaptive Bitrate Manager
// ============================================================================

export class AdaptiveBitrateManager {
  private config: ABRConfig;
  private availableLevels: BitrateLevel[];
  private currentLevel: number;
  private bandwidthEstimator: BandwidthEstimator;
  private lastSwitchTime: number = 0;
  private switchCooldown: number = 3000; // 3 seconds

  constructor(
    availableLevels: BitrateLevel[],
    config: Partial<ABRConfig> = {},
  ) {
    this.config = { ...DEFAULT_ABR_CONFIG, ...config };
    this.availableLevels = availableLevels.sort(
      (a, b) => a.bitrate - b.bitrate,
    );
    this.currentLevel = 0;
    this.bandwidthEstimator = new BandwidthEstimator();
  }

  // ==========================================================================
  // Level Selection
  // ==========================================================================

  /**
   * Select optimal quality level based on network conditions
   */
  public selectLevel(
    networkConditions: NetworkConditions,
    bufferState: BufferState,
  ): number {
    // Update bandwidth estimate
    this.bandwidthEstimator.addSample(networkConditions.bandwidth);

    // Get estimated bandwidth
    const bandwidth = this.bandwidthEstimator.getEstimate(
      this.config.bandwidthEstimator,
    );

    // Check cooldown period to prevent oscillation
    if (Date.now() - this.lastSwitchTime < this.switchCooldown) {
      return this.currentLevel;
    }

    // Buffer-based ABR
    if (this.config.bufferBasedABR) {
      return this.selectLevelBufferBased(bandwidth, bufferState);
    }

    // Bandwidth-based ABR
    return this.selectLevelBandwidthBased(bandwidth);
  }

  /**
   * Select level based on bandwidth only
   */
  private selectLevelBandwidthBased(bandwidth: number): number {
    const current = this.availableLevels[this.currentLevel];

    // Find highest level that fits bandwidth
    let targetLevel = this.currentLevel;

    for (let i = 0; i < this.availableLevels.length; i++) {
      const level = this.availableLevels[i];

      // Check if we can upgrade
      if (
        i > this.currentLevel &&
        level.bitrate < bandwidth * this.config.switchUpThreshold
      ) {
        targetLevel = i;
      }

      // Check if we need to downgrade
      if (
        i < this.currentLevel &&
        current.bitrate > bandwidth * this.config.switchDownThreshold
      ) {
        targetLevel = i;
        break; // Downgrade immediately
      }
    }

    // Apply bitrate limits
    targetLevel = this.applyBitrateLimits(targetLevel);

    if (targetLevel !== this.currentLevel) {
      this.currentLevel = targetLevel;
      this.lastSwitchTime = Date.now();
    }

    return this.currentLevel;
  }

  /**
   * Select level based on buffer and bandwidth
   */
  private selectLevelBufferBased(
    bandwidth: number,
    bufferState: BufferState,
  ): number {
    const bufferRatio = bufferState.currentBuffer / bufferState.targetBuffer;

    // If buffer is low, be conservative
    if (bufferState.currentBuffer < this.config.minBufferForQualitySwitch) {
      return this.downgradeSafely();
    }

    // Buffer is healthy, use bandwidth-based selection
    if (bufferRatio > 0.8) {
      return this.selectLevelBandwidthBased(bandwidth);
    }

    // Buffer is moderate, stay at current level
    return this.currentLevel;
  }

  /**
   * Downgrade to lower quality level safely
   */
  private downgradeSafely(): number {
    const targetLevel = Math.max(0, this.currentLevel - 1);

    if (targetLevel !== this.currentLevel) {
      this.currentLevel = targetLevel;
      this.lastSwitchTime = Date.now();
    }

    return this.currentLevel;
  }

  /**
   * Apply configured bitrate limits
   */
  private applyBitrateLimits(level: number): number {
    const bitrate = this.availableLevels[level].bitrate;

    // Find highest level within limits
    for (let i = this.availableLevels.length - 1; i >= 0; i--) {
      const levelBitrate = this.availableLevels[i].bitrate;

      if (
        levelBitrate >= this.config.minAutoBitrate &&
        levelBitrate <= this.config.maxAutoBitrate &&
        levelBitrate <= bitrate
      ) {
        return i;
      }
    }

    return 0; // Fallback to lowest
  }

  // ==========================================================================
  // Manual Control
  // ==========================================================================

  /**
   * Set quality level manually
   */
  public setLevel(level: number): void {
    if (level >= 0 && level < this.availableLevels.length) {
      this.currentLevel = level;
      this.lastSwitchTime = Date.now();
    }
  }

  /**
   * Enable auto quality
   */
  public enableAuto(): void {
    // Reset to allow immediate switch
    this.lastSwitchTime = 0;
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  /**
   * Get current level
   */
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Get current level info
   */
  public getCurrentLevelInfo(): BitrateLevel {
    return this.availableLevels[this.currentLevel];
  }

  /**
   * Get all available levels
   */
  public getAvailableLevels(): BitrateLevel[] {
    return this.availableLevels;
  }

  /**
   * Get estimated bandwidth
   */
  public getEstimatedBandwidth(): number {
    return this.bandwidthEstimator.getEstimate(this.config.bandwidthEstimator);
  }

  /**
   * Convert quality name to level index
   */
  public qualityToLevel(quality: StreamQuality): number {
    if (quality === "auto") return -1;

    const targetHeight = this.qualityToHeight(quality);

    for (let i = 0; i < this.availableLevels.length; i++) {
      if (this.availableLevels[i].height === targetHeight) {
        return i;
      }
    }

    return 0; // Fallback to lowest
  }

  /**
   * Convert level index to quality name
   */
  public levelToQuality(level: number): StreamQuality {
    if (level < 0 || level >= this.availableLevels.length) return "auto";

    const height = this.availableLevels[level].height;

    if (height >= 1080) return "1080p";
    if (height >= 720) return "720p";
    if (height >= 480) return "480p";
    return "360p";
  }

  private qualityToHeight(quality: StreamQuality): number {
    const map: Record<StreamQuality, number> = {
      "1080p": 1080,
      "720p": 720,
      "480p": 480,
      "360p": 360,
      auto: 0,
    };
    return map[quality];
  }

  // ==========================================================================
  // Reset
  // ==========================================================================

  /**
   * Reset ABR state
   */
  public reset(): void {
    this.currentLevel = 0;
    this.lastSwitchTime = 0;
    this.bandwidthEstimator.reset();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create adaptive bitrate manager
 */
export function createAdaptiveBitrateManager(
  availableLevels: BitrateLevel[],
  config: Partial<ABRConfig> = {},
): AdaptiveBitrateManager {
  return new AdaptiveBitrateManager(availableLevels, config);
}
