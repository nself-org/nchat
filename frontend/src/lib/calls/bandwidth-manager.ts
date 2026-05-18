/**
 * Bandwidth Manager
 *
 * Monitors network conditions and adaptively adjusts video quality
 * to maintain stable connections.
 */

import { VideoQuality, getOptimalQuality } from "./video-processor";

// =============================================================================
// Types
// =============================================================================

export interface NetworkStats {
  rtt: number; // Round-trip time (ms)
  jitter: number; // ms
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  bytesSent: number;
  availableBitrate: number; // kbps
  timestamp: number;
}

export interface BandwidthEstimate {
  current: number; // kbps
  available: number; // kbps
  trend: "increasing" | "stable" | "decreasing";
  quality: "excellent" | "good" | "fair" | "poor";
}

export interface AdaptationDecision {
  quality: VideoQuality;
  reason: string;
  shouldReduce: boolean;
  shouldIncrease: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SAMPLE_INTERVAL = 1000; // Sample every second
const HISTORY_SIZE = 30; // Keep 30 seconds of history
const RTT_THRESHOLD_GOOD = 100; // ms
const RTT_THRESHOLD_FAIR = 200; // ms
const PACKET_LOSS_THRESHOLD_GOOD = 0.01; // 1%
const PACKET_LOSS_THRESHOLD_FAIR = 0.05; // 5%
const JITTER_THRESHOLD_GOOD = 30; // ms
const JITTER_THRESHOLD_FAIR = 100; // ms

// =============================================================================
// Bandwidth Manager Class
// =============================================================================

export class BandwidthManager {
  private statsHistory: NetworkStats[] = [];
  private currentQuality: VideoQuality = "720p";
  private adaptationEnabled: boolean = true;
  private lastAdaptation: number = 0;
  private adaptationCooldown: number = 5000; // 5 seconds
  private samplingInterval: number | null = null;

  constructor(initialQuality: VideoQuality = "720p") {
    this.currentQuality = initialQuality;
  }

  // ===========================================================================
  // Stats Collection
  // ===========================================================================

  addStats(stats: Partial<NetworkStats>): void {
    const fullStats: NetworkStats = {
      rtt: stats.rtt ?? 0,
      jitter: stats.jitter ?? 0,
      packetsLost: stats.packetsLost ?? 0,
      packetsReceived: stats.packetsReceived ?? 0,
      bytesReceived: stats.bytesReceived ?? 0,
      bytesSent: stats.bytesSent ?? 0,
      availableBitrate: stats.availableBitrate ?? 0,
      timestamp: stats.timestamp ?? Date.now(),
    };

    this.statsHistory.push(fullStats);

    // Keep only recent history
    if (this.statsHistory.length > HISTORY_SIZE) {
      this.statsHistory.shift();
    }
  }

  getRecentStats(count: number = 10): NetworkStats[] {
    return this.statsHistory.slice(-count);
  }

  getLatestStats(): NetworkStats | null {
    return this.statsHistory[this.statsHistory.length - 1] || null;
  }

  // ===========================================================================
  // Bandwidth Estimation
  // ===========================================================================

  estimateBandwidth(): BandwidthEstimate {
    if (this.statsHistory.length < 3) {
      return {
        current: 0,
        available: 0,
        trend: "stable",
        quality: "good",
      };
    }

    const recent = this.getRecentStats(10);
    const current = recent[recent.length - 1];

    // Calculate average bitrate
    const avgBitrate = this.calculateAverageBitrate(recent);

    // Determine trend
    const trend = this.calculateTrend(recent);

    // Assess quality
    const quality = this.assessConnectionQuality(current);

    return {
      current: avgBitrate,
      available: current.availableBitrate,
      trend,
      quality,
    };
  }

  private calculateAverageBitrate(stats: NetworkStats[]): number {
    if (stats.length === 0) return 0;

    const totalBytes = stats.reduce((sum, s) => sum + s.bytesReceived, 0);
    const timeSpan =
      (stats[stats.length - 1].timestamp - stats[0].timestamp) / 1000; // seconds

    return timeSpan > 0 ? (totalBytes * 8) / timeSpan / 1000 : 0; // kbps
  }

  private calculateTrend(
    stats: NetworkStats[],
  ): "increasing" | "stable" | "decreasing" {
    if (stats.length < 3) return "stable";

    const first = stats[0].availableBitrate;
    const last = stats[stats.length - 1].availableBitrate;
    const change = ((last - first) / first) * 100;

    if (change > 10) return "increasing";
    if (change < -10) return "decreasing";
    return "stable";
  }

  private assessConnectionQuality(
    stats: NetworkStats,
  ): "excellent" | "good" | "fair" | "poor" {
    const packetLossRate =
      stats.packetsLost /
      Math.max(stats.packetsLost + stats.packetsReceived, 1);

    // Excellent: Low RTT, no packet loss, low jitter
    if (
      stats.rtt < RTT_THRESHOLD_GOOD &&
      packetLossRate < PACKET_LOSS_THRESHOLD_GOOD &&
      stats.jitter < JITTER_THRESHOLD_GOOD
    ) {
      return "excellent";
    }

    // Good: Moderate RTT, minimal packet loss, moderate jitter
    if (
      stats.rtt < RTT_THRESHOLD_FAIR &&
      packetLossRate < PACKET_LOSS_THRESHOLD_FAIR &&
      stats.jitter < JITTER_THRESHOLD_FAIR
    ) {
      return "good";
    }

    // Fair: High RTT or some packet loss or high jitter
    if (
      stats.rtt < RTT_THRESHOLD_FAIR * 2 &&
      packetLossRate < PACKET_LOSS_THRESHOLD_FAIR * 2
    ) {
      return "fair";
    }

    // Poor: Very high RTT or significant packet loss
    return "poor";
  }

  // ===========================================================================
  // Adaptive Quality
  // ===========================================================================

  shouldAdapt(): AdaptationDecision {
    const now = Date.now();
    const estimate = this.estimateBandwidth();
    const latest = this.getLatestStats();

    if (!latest) {
      return {
        quality: this.currentQuality,
        reason: "No stats available",
        shouldReduce: false,
        shouldIncrease: false,
      };
    }

    // Check cooldown
    if (now - this.lastAdaptation < this.adaptationCooldown) {
      return {
        quality: this.currentQuality,
        reason: "Cooldown active",
        shouldReduce: false,
        shouldIncrease: false,
      };
    }

    const packetLossRate =
      latest.packetsLost /
      Math.max(latest.packetsLost + latest.packetsReceived, 1);

    // Reduce quality if network conditions are poor
    if (
      estimate.quality === "poor" ||
      packetLossRate > PACKET_LOSS_THRESHOLD_FAIR ||
      latest.rtt > RTT_THRESHOLD_FAIR * 2 ||
      estimate.trend === "decreasing"
    ) {
      const newQuality = this.getNextLowerQuality();
      if (newQuality !== this.currentQuality) {
        return {
          quality: newQuality,
          reason: `Poor connection: ${estimate.quality}, RTT: ${latest.rtt}ms, Loss: ${(packetLossRate * 100).toFixed(1)}%`,
          shouldReduce: true,
          shouldIncrease: false,
        };
      }
    }

    // Increase quality if network conditions are good
    if (
      estimate.quality === "excellent" &&
      packetLossRate < PACKET_LOSS_THRESHOLD_GOOD &&
      latest.rtt < RTT_THRESHOLD_GOOD &&
      estimate.trend !== "decreasing" &&
      estimate.available > this.getQualityBitrate(this.currentQuality) * 1.5
    ) {
      const newQuality = this.getNextHigherQuality();
      if (newQuality !== this.currentQuality) {
        return {
          quality: newQuality,
          reason: `Good connection: ${estimate.quality}, RTT: ${latest.rtt}ms, Bitrate: ${estimate.available}kbps`,
          shouldReduce: false,
          shouldIncrease: true,
        };
      }
    }

    return {
      quality: this.currentQuality,
      reason: `Stable: ${estimate.quality}`,
      shouldReduce: false,
      shouldIncrease: false,
    };
  }

  adapt(): AdaptationDecision {
    const decision = this.shouldAdapt();

    if (decision.shouldReduce || decision.shouldIncrease) {
      this.currentQuality = decision.quality;
      this.lastAdaptation = Date.now();
    }

    return decision;
  }

  private getNextLowerQuality(): VideoQuality {
    const qualities: VideoQuality[] = ["180p", "360p", "720p", "1080p"];
    const currentIndex = qualities.indexOf(this.currentQuality);
    return currentIndex > 0 ? qualities[currentIndex - 1] : this.currentQuality;
  }

  private getNextHigherQuality(): VideoQuality {
    const qualities: VideoQuality[] = ["180p", "360p", "720p", "1080p"];
    const currentIndex = qualities.indexOf(this.currentQuality);
    return currentIndex < qualities.length - 1
      ? qualities[currentIndex + 1]
      : this.currentQuality;
  }

  private getQualityBitrate(quality: VideoQuality): number {
    const bitrates: Record<VideoQuality, number> = {
      "180p": 150,
      "360p": 400,
      "720p": 1500,
      "1080p": 3000,
    };
    return bitrates[quality];
  }

  // ===========================================================================
  // Quality Management
  // ===========================================================================

  setQuality(quality: VideoQuality): void {
    this.currentQuality = quality;
    this.lastAdaptation = Date.now();
  }

  getQuality(): VideoQuality {
    return this.currentQuality;
  }

  getRecommendedQuality(): VideoQuality {
    const estimate = this.estimateBandwidth();
    return getOptimalQuality(estimate.available);
  }

  setAdaptationEnabled(enabled: boolean): void {
    this.adaptationEnabled = enabled;
  }

  isAdaptationEnabled(): boolean {
    return this.adaptationEnabled;
  }

  // ===========================================================================
  // Monitoring
  // ===========================================================================

  startMonitoring(callback: (decision: AdaptationDecision) => void): void {
    this.stopMonitoring();

    this.samplingInterval = window.setInterval(() => {
      if (this.adaptationEnabled) {
        const decision = this.adapt();
        callback(decision);
      }
    }, SAMPLE_INTERVAL);
  }

  stopMonitoring(): void {
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStatistics(): {
    averageRTT: number;
    averageJitter: number;
    packetLossRate: number;
    averageBitrate: number;
    connectionQuality: "excellent" | "good" | "fair" | "poor";
  } {
    if (this.statsHistory.length === 0) {
      return {
        averageRTT: 0,
        averageJitter: 0,
        packetLossRate: 0,
        averageBitrate: 0,
        connectionQuality: "good",
      };
    }

    const recent = this.getRecentStats();

    const averageRTT =
      recent.reduce((sum, s) => sum + s.rtt, 0) / recent.length;
    const averageJitter =
      recent.reduce((sum, s) => sum + s.jitter, 0) / recent.length;

    const totalPacketsLost = recent.reduce((sum, s) => sum + s.packetsLost, 0);
    const totalPacketsReceived = recent.reduce(
      (sum, s) => sum + s.packetsReceived,
      0,
    );
    const packetLossRate =
      totalPacketsLost / Math.max(totalPacketsLost + totalPacketsReceived, 1);

    const averageBitrate = this.calculateAverageBitrate(recent);

    const latest = this.getLatestStats();
    const connectionQuality = latest
      ? this.assessConnectionQuality(latest)
      : "good";

    return {
      averageRTT,
      averageJitter,
      packetLossRate,
      averageBitrate,
      connectionQuality,
    };
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  cleanup(): void {
    this.stopMonitoring();
    this.statsHistory = [];
  }

  reset(): void {
    this.cleanup();
    this.currentQuality = "720p";
    this.lastAdaptation = 0;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createBandwidthManager(
  initialQuality?: VideoQuality,
): BandwidthManager {
  return new BandwidthManager(initialQuality);
}

// =============================================================================
// Utility Functions
// =============================================================================

export function formatBitrate(kbps: number): string {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${kbps.toFixed(0)} kbps`;
}

export function getQualityColor(
  quality: "excellent" | "good" | "fair" | "poor",
): string {
  const colors = {
    excellent: "#10b981", // green
    good: "#3b82f6", // blue
    fair: "#f59e0b", // orange
    poor: "#ef4444", // red
  };
  return colors[quality];
}

export function getQualityIcon(
  quality: "excellent" | "good" | "fair" | "poor",
): string {
  const icons = {
    excellent: "signal-4",
    good: "signal-3",
    fair: "signal-2",
    poor: "signal-1",
  };
  return icons[quality];
}
