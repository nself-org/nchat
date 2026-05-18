/**
 * Call Quality Monitor
 *
 * Monitors WebRTC call quality using getStats() API.
 * Tracks bitrate, packet loss, jitter, RTT, and provides quality indicators.
 */

import { EventEmitter } from "events";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

/**
 * Quality level
 */
export type QualityLevel = "excellent" | "good" | "fair" | "poor" | "critical";

/**
 * Call quality metrics
 */
export interface QualityMetrics {
  timestamp: Date;

  // Audio metrics
  audioSendBitrate: number; // kbps
  audioReceiveBitrate: number; // kbps
  audioPacketLoss: number; // percentage
  audioJitter: number; // milliseconds

  // Video metrics
  videoSendBitrate: number; // kbps
  videoReceiveBitrate: number; // kbps
  videoPacketLoss: number; // percentage
  videoJitter: number; // milliseconds
  videoFrameRate: number; // fps
  videoResolution: { width: number; height: number };

  // Network metrics
  rtt: number; // Round Trip Time in milliseconds
  availableBandwidth?: number; // kbps

  // Derived quality
  overallQuality: QualityLevel;
  audioQuality: QualityLevel;
  videoQuality: QualityLevel;
  networkQuality: QualityLevel;
}

/**
 * Quality thresholds for determining quality level
 */
export interface QualityThresholds {
  excellent: {
    maxPacketLoss: number; // %
    maxJitter: number; // ms
    maxRtt: number; // ms
    minBitrate: number; // kbps
  };
  good: {
    maxPacketLoss: number;
    maxJitter: number;
    maxRtt: number;
    minBitrate: number;
  };
  fair: {
    maxPacketLoss: number;
    maxJitter: number;
    maxRtt: number;
    minBitrate: number;
  };
  poor: {
    maxPacketLoss: number;
    maxJitter: number;
    maxRtt: number;
    minBitrate: number;
  };
}

/**
 * Quality alert
 */
export interface QualityAlert {
  type: "degradation" | "improvement" | "critical";
  level: QualityLevel;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  suggestions: string[];
  timestamp: Date;
}

/**
 * Monitor configuration
 */
export interface QualityMonitorConfig {
  interval?: number; // milliseconds between measurements
  thresholds?: Partial<QualityThresholds>;
  enableAlerts?: boolean;
  alertCooldown?: number; // milliseconds between alerts
  onMetrics?: (metrics: QualityMetrics) => void;
  onAlert?: (alert: QualityAlert) => void;
  onQualityChange?: (quality: QualityLevel, previous: QualityLevel) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_THRESHOLDS: QualityThresholds = {
  excellent: {
    maxPacketLoss: 0.5, // 0.5%
    maxJitter: 20, // 20ms
    maxRtt: 100, // 100ms
    minBitrate: 300, // 300kbps
  },
  good: {
    maxPacketLoss: 2, // 2%
    maxJitter: 50, // 50ms
    maxRtt: 200, // 200ms
    minBitrate: 150, // 150kbps
  },
  fair: {
    maxPacketLoss: 5, // 5%
    maxJitter: 100, // 100ms
    maxRtt: 400, // 400ms
    minBitrate: 64, // 64kbps
  },
  poor: {
    maxPacketLoss: 10, // 10%
    maxJitter: 200, // 200ms
    maxRtt: 800, // 800ms
    minBitrate: 32, // 32kbps
  },
};

const DEFAULT_CONFIG: Required<
  Omit<
    QualityMonitorConfig,
    "thresholds" | "onMetrics" | "onAlert" | "onQualityChange"
  >
> = {
  interval: 2000, // 2 seconds
  enableAlerts: true,
  alertCooldown: 10000, // 10 seconds
};

// =============================================================================
// Call Quality Monitor
// =============================================================================

export class CallQualityMonitor extends EventEmitter {
  private peerConnection: RTCPeerConnection | null = null;
  private config: Required<
    Omit<
      QualityMonitorConfig,
      "thresholds" | "onMetrics" | "onAlert" | "onQualityChange"
    >
  >;
  private callbacks: QualityMonitorConfig;
  private thresholds: QualityThresholds;
  private interval: NodeJS.Timeout | null = null;
  private lastMetrics: QualityMetrics | null = null;
  private currentQuality: QualityLevel = "excellent";
  private metricsHistory: QualityMetrics[] = [];
  private lastAlertTime = new Map<string, number>();
  private previousStats = new Map<string, any>();

  constructor(config: QualityMonitorConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = config;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...config.thresholds };
  }

  /**
   * Start monitoring a peer connection
   */
  start(peerConnection: RTCPeerConnection): void {
    if (this.interval) {
      this.stop();
    }

    this.peerConnection = peerConnection;
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval);

    this.emit("started");
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.peerConnection = null;
    this.previousStats.clear();
    this.emit("stopped");
  }

  /**
   * Collect quality metrics
   */
  private async collectMetrics(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      const metrics = this.parseStats(stats);

      // Store metrics
      this.lastMetrics = metrics;
      this.metricsHistory.push(metrics);

      // Keep only last 30 measurements (1 minute at 2s interval)
      if (this.metricsHistory.length > 30) {
        this.metricsHistory.shift();
      }

      // Check quality change
      const previousQuality = this.currentQuality;
      this.currentQuality = metrics.overallQuality;

      if (previousQuality !== this.currentQuality) {
        this.emit("quality-change", this.currentQuality, previousQuality);
        if (this.callbacks.onQualityChange) {
          this.callbacks.onQualityChange(this.currentQuality, previousQuality);
        }

        // Generate alert
        if (this.config.enableAlerts) {
          this.generateQualityChangeAlert(previousQuality, this.currentQuality);
        }
      }

      // Emit metrics
      this.emit("metrics", metrics);
      if (this.callbacks.onMetrics) {
        this.callbacks.onMetrics(metrics);
      }

      // Check for specific issues
      if (this.config.enableAlerts) {
        this.checkForIssues(metrics);
      }
    } catch (error) {
      logger.error("Error collecting quality metrics:", error);
    }
  }

  /**
   * Parse WebRTC stats
   */
  private parseStats(stats: RTCStatsReport): QualityMetrics {
    const metrics: Partial<QualityMetrics> = {
      timestamp: new Date(),
      audioSendBitrate: 0,
      audioReceiveBitrate: 0,
      audioPacketLoss: 0,
      audioJitter: 0,
      videoSendBitrate: 0,
      videoReceiveBitrate: 0,
      videoPacketLoss: 0,
      videoJitter: 0,
      videoFrameRate: 0,
      videoResolution: { width: 0, height: 0 },
      rtt: 0,
    };

    stats.forEach((report) => {
      // Inbound RTP (receiving)
      if (report.type === "inbound-rtp") {
        const prev = this.previousStats.get(report.id);
        if (prev) {
          const timeDiff = (report.timestamp - prev.timestamp) / 1000; // seconds
          const bytesDiff = report.bytesReceived - prev.bytesReceived;
          const bitrate = (bytesDiff * 8) / timeDiff / 1000; // kbps

          if (report.mediaType === "audio") {
            metrics.audioReceiveBitrate = bitrate;
            metrics.audioJitter = report.jitter * 1000; // Convert to ms
            metrics.audioPacketLoss = this.calculatePacketLoss(report, prev);
          } else if (report.mediaType === "video") {
            metrics.videoReceiveBitrate = bitrate;
            metrics.videoJitter = report.jitter * 1000;
            metrics.videoPacketLoss = this.calculatePacketLoss(report, prev);
            metrics.videoFrameRate = report.framesPerSecond || 0;
            metrics.videoResolution = {
              width: report.frameWidth || 0,
              height: report.frameHeight || 0,
            };
          }
        }
        this.previousStats.set(report.id, report);
      }

      // Outbound RTP (sending)
      if (report.type === "outbound-rtp") {
        const prev = this.previousStats.get(report.id);
        if (prev) {
          const timeDiff = (report.timestamp - prev.timestamp) / 1000;
          const bytesDiff = report.bytesSent - prev.bytesSent;
          const bitrate = (bytesDiff * 8) / timeDiff / 1000;

          if (report.mediaType === "audio") {
            metrics.audioSendBitrate = bitrate;
          } else if (report.mediaType === "video") {
            metrics.videoSendBitrate = bitrate;
          }
        }
        this.previousStats.set(report.id, report);
      }

      // Candidate pair (RTT)
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        metrics.rtt = report.currentRoundTripTime * 1000 || 0; // Convert to ms
      }
    });

    // Calculate quality levels
    metrics.audioQuality = this.calculateAudioQuality(
      metrics as QualityMetrics,
    );
    metrics.videoQuality = this.calculateVideoQuality(
      metrics as QualityMetrics,
    );
    metrics.networkQuality = this.calculateNetworkQuality(
      metrics as QualityMetrics,
    );
    metrics.overallQuality = this.calculateOverallQuality(
      metrics as QualityMetrics,
    );

    return metrics as QualityMetrics;
  }

  /**
   * Calculate packet loss percentage
   */
  private calculatePacketLoss(current: any, previous: any): number {
    const packetsDiff = current.packetsReceived - previous.packetsReceived;
    const lostDiff = current.packetsLost - previous.packetsLost;
    if (packetsDiff === 0) return 0;
    return (lostDiff / (packetsDiff + lostDiff)) * 100;
  }

  /**
   * Calculate audio quality level
   */
  private calculateAudioQuality(metrics: QualityMetrics): QualityLevel {
    const { audioPacketLoss, audioJitter, audioReceiveBitrate } = metrics;

    if (
      audioPacketLoss <= this.thresholds.excellent.maxPacketLoss &&
      audioJitter <= this.thresholds.excellent.maxJitter &&
      audioReceiveBitrate >= this.thresholds.excellent.minBitrate
    ) {
      return "excellent";
    }

    if (
      audioPacketLoss <= this.thresholds.good.maxPacketLoss &&
      audioJitter <= this.thresholds.good.maxJitter &&
      audioReceiveBitrate >= this.thresholds.good.minBitrate
    ) {
      return "good";
    }

    if (
      audioPacketLoss <= this.thresholds.fair.maxPacketLoss &&
      audioJitter <= this.thresholds.fair.maxJitter &&
      audioReceiveBitrate >= this.thresholds.fair.minBitrate
    ) {
      return "fair";
    }

    if (
      audioPacketLoss <= this.thresholds.poor.maxPacketLoss &&
      audioJitter <= this.thresholds.poor.maxJitter &&
      audioReceiveBitrate >= this.thresholds.poor.minBitrate
    ) {
      return "poor";
    }

    return "critical";
  }

  /**
   * Calculate video quality level
   */
  private calculateVideoQuality(metrics: QualityMetrics): QualityLevel {
    const {
      videoPacketLoss,
      videoJitter,
      videoReceiveBitrate,
      videoFrameRate,
    } = metrics;

    if (
      videoPacketLoss <= this.thresholds.excellent.maxPacketLoss &&
      videoJitter <= this.thresholds.excellent.maxJitter &&
      videoReceiveBitrate >= this.thresholds.excellent.minBitrate &&
      videoFrameRate >= 25
    ) {
      return "excellent";
    }

    if (
      videoPacketLoss <= this.thresholds.good.maxPacketLoss &&
      videoJitter <= this.thresholds.good.maxJitter &&
      videoReceiveBitrate >= this.thresholds.good.minBitrate &&
      videoFrameRate >= 20
    ) {
      return "good";
    }

    if (
      videoPacketLoss <= this.thresholds.fair.maxPacketLoss &&
      videoJitter <= this.thresholds.fair.maxJitter &&
      videoReceiveBitrate >= this.thresholds.fair.minBitrate &&
      videoFrameRate >= 15
    ) {
      return "fair";
    }

    if (
      videoPacketLoss <= this.thresholds.poor.maxPacketLoss &&
      videoJitter <= this.thresholds.poor.maxJitter &&
      videoReceiveBitrate >= this.thresholds.poor.minBitrate &&
      videoFrameRate >= 10
    ) {
      return "poor";
    }

    return "critical";
  }

  /**
   * Calculate network quality level
   */
  private calculateNetworkQuality(metrics: QualityMetrics): QualityLevel {
    const { rtt } = metrics;

    if (rtt <= this.thresholds.excellent.maxRtt) return "excellent";
    if (rtt <= this.thresholds.good.maxRtt) return "good";
    if (rtt <= this.thresholds.fair.maxRtt) return "fair";
    if (rtt <= this.thresholds.poor.maxRtt) return "poor";
    return "critical";
  }

  /**
   * Calculate overall quality level
   */
  private calculateOverallQuality(metrics: QualityMetrics): QualityLevel {
    const levels = [
      metrics.audioQuality,
      metrics.videoQuality,
      metrics.networkQuality,
    ];

    // Worst quality determines overall
    if (levels.includes("critical")) return "critical";
    if (levels.includes("poor")) return "poor";
    if (levels.includes("fair")) return "fair";
    if (levels.includes("good")) return "good";
    return "excellent";
  }

  /**
   * Generate quality change alert
   */
  private generateQualityChangeAlert(
    previous: QualityLevel,
    current: QualityLevel,
  ): void {
    const qualityOrder: QualityLevel[] = [
      "excellent",
      "good",
      "fair",
      "poor",
      "critical",
    ];
    const prevIndex = qualityOrder.indexOf(previous);
    const currIndex = qualityOrder.indexOf(current);

    const type = currIndex > prevIndex ? "degradation" : "improvement";
    const suggestions = this.getSuggestions(current, this.lastMetrics!);

    const alert: QualityAlert = {
      type,
      level: current,
      metric: "overall",
      value: currIndex,
      threshold: prevIndex,
      message: `Call quality ${type === "degradation" ? "degraded" : "improved"} from ${previous} to ${current}`,
      suggestions,
      timestamp: new Date(),
    };

    this.emitAlert(alert);
  }

  /**
   * Check for specific issues
   */
  private checkForIssues(metrics: QualityMetrics): void {
    // High packet loss
    if (metrics.audioPacketLoss > this.thresholds.fair.maxPacketLoss) {
      this.createAlert("audio-packet-loss", metrics.audioPacketLoss, metrics);
    }
    if (metrics.videoPacketLoss > this.thresholds.fair.maxPacketLoss) {
      this.createAlert("video-packet-loss", metrics.videoPacketLoss, metrics);
    }

    // High jitter
    if (metrics.audioJitter > this.thresholds.fair.maxJitter) {
      this.createAlert("audio-jitter", metrics.audioJitter, metrics);
    }

    // High RTT
    if (metrics.rtt > this.thresholds.fair.maxRtt) {
      this.createAlert("high-rtt", metrics.rtt, metrics);
    }

    // Low bitrate
    if (metrics.audioReceiveBitrate < this.thresholds.fair.minBitrate) {
      this.createAlert(
        "low-audio-bitrate",
        metrics.audioReceiveBitrate,
        metrics,
      );
    }
    if (metrics.videoReceiveBitrate < this.thresholds.fair.minBitrate) {
      this.createAlert(
        "low-video-bitrate",
        metrics.videoReceiveBitrate,
        metrics,
      );
    }

    // Low framerate
    if (metrics.videoFrameRate > 0 && metrics.videoFrameRate < 15) {
      this.createAlert("low-framerate", metrics.videoFrameRate, metrics);
    }
  }

  /**
   * Create specific alert
   */
  private createAlert(
    type: string,
    value: number,
    metrics: QualityMetrics,
  ): void {
    // Check cooldown
    const lastAlert = this.lastAlertTime.get(type);
    if (lastAlert && Date.now() - lastAlert < this.config.alertCooldown) {
      return;
    }

    const messages: Record<string, string> = {
      "audio-packet-loss": "High audio packet loss detected",
      "video-packet-loss": "High video packet loss detected",
      "audio-jitter": "High audio jitter detected",
      "high-rtt": "High network latency detected",
      "low-audio-bitrate": "Low audio bitrate detected",
      "low-video-bitrate": "Low video bitrate detected",
      "low-framerate": "Low video framerate detected",
    };

    const alert: QualityAlert = {
      type: "degradation",
      level: metrics.overallQuality,
      metric: type,
      value,
      threshold: 0,
      message: messages[type] || "Quality issue detected",
      suggestions: this.getSuggestions(metrics.overallQuality, metrics),
      timestamp: new Date(),
    };

    this.emitAlert(alert);
    this.lastAlertTime.set(type, Date.now());
  }

  /**
   * Get quality improvement suggestions
   */
  private getSuggestions(
    level: QualityLevel,
    metrics: QualityMetrics,
  ): string[] {
    const suggestions: string[] = [];

    if (level === "poor" || level === "critical") {
      if (metrics.videoReceiveBitrate > 0) {
        suggestions.push("Turn off video to improve call quality");
      }
      suggestions.push("Check your internet connection");
      suggestions.push("Move closer to your WiFi router");
      suggestions.push("Close bandwidth-heavy applications");
    }

    if (metrics.videoPacketLoss > 5) {
      suggestions.push("Reduce video quality settings");
    }

    if (metrics.rtt > 400) {
      suggestions.push("Check for network congestion");
      suggestions.push("Use wired connection if possible");
    }

    return suggestions;
  }

  /**
   * Emit alert
   */
  private emitAlert(alert: QualityAlert): void {
    this.emit("alert", alert);
    if (this.callbacks.onAlert) {
      this.callbacks.onAlert(alert);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): QualityMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Get current quality
   */
  getQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * Get metrics history
   */
  getHistory(): QualityMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get average metrics over last N measurements
   */
  getAverageMetrics(count: number = 5): Partial<QualityMetrics> | null {
    if (this.metricsHistory.length === 0) return null;

    const recent = this.metricsHistory.slice(-count);
    const avg: Partial<QualityMetrics> = {
      audioSendBitrate: 0,
      audioReceiveBitrate: 0,
      audioPacketLoss: 0,
      audioJitter: 0,
      videoSendBitrate: 0,
      videoReceiveBitrate: 0,
      videoPacketLoss: 0,
      videoJitter: 0,
      rtt: 0,
    };

    for (const metrics of recent) {
      avg.audioSendBitrate! += metrics.audioSendBitrate;
      avg.audioReceiveBitrate! += metrics.audioReceiveBitrate;
      avg.audioPacketLoss! += metrics.audioPacketLoss;
      avg.audioJitter! += metrics.audioJitter;
      avg.videoSendBitrate! += metrics.videoSendBitrate;
      avg.videoReceiveBitrate! += metrics.videoReceiveBitrate;
      avg.videoPacketLoss! += metrics.videoPacketLoss;
      avg.videoJitter! += metrics.videoJitter;
      avg.rtt! += metrics.rtt;
    }

    const n = recent.length;
    for (const key in avg) {
      const typedKey = key as keyof typeof avg;
      const currentValue = avg[typedKey];
      if (currentValue !== undefined) {
        avg[typedKey] = ((currentValue as number) / n) as any;
      }
    }

    return avg;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stop();
    this.metricsHistory = [];
    this.lastMetrics = null;
    this.lastAlertTime.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new call quality monitor
 */
export function createQualityMonitor(
  config?: QualityMonitorConfig,
): CallQualityMonitor {
  return new CallQualityMonitor(config);
}
