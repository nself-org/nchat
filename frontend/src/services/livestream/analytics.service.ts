/**
 * Livestream Analytics Service
 *
 * Real-time analytics tracking for live streams including viewer metrics,
 * engagement statistics, geographic distribution, and quality monitoring.
 *
 * @module services/livestream/analytics.service
 */

import { logger } from "@/lib/logger";
import type {
  StreamAnalytics,
  RealTimeAnalytics,
  StreamQuality,
  GeographicStats,
  DeviceStats,
  EngagementStats,
  QualityStats,
  StreamViewer,
} from "./types";

// ============================================================================
// Types
// ============================================================================

interface ViewerSnapshot {
  timestamp: number;
  count: number;
}

interface EngagementEvent {
  type: "chat" | "reaction";
  timestamp: number;
  userId?: string;
  emoji?: string;
  messageLength?: number;
}

interface QualityEvent {
  timestamp: number;
  bitrate: number;
  fps: number;
  resolution: string;
  droppedFrames: number;
  bufferingDuration: number;
}

interface AnalyticsStore {
  viewerSnapshots: ViewerSnapshot[];
  engagementEvents: EngagementEvent[];
  qualityEvents: QualityEvent[];
  viewerLocations: Map<string, GeographicStats>;
  viewerDevices: Map<string, DeviceStats>;
  peakViewers: number;
  totalUniqueViewers: Set<string>;
  totalViews: number;
  chatMessagesCount: number;
  reactionsCount: number;
  reactionsByType: Map<string, number>;
  qualityDistribution: Map<StreamQuality, number>;
}

// ============================================================================
// Livestream Analytics Service
// ============================================================================

export class LivestreamAnalyticsService {
  private streamId: string;
  private startTime: number;
  private store: AnalyticsStore;
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;

  constructor(streamId: string) {
    this.streamId = streamId;
    this.startTime = Date.now();
    this.store = {
      viewerSnapshots: [],
      engagementEvents: [],
      qualityEvents: [],
      viewerLocations: new Map(),
      viewerDevices: new Map(),
      peakViewers: 0,
      totalUniqueViewers: new Set(),
      totalViews: 0,
      chatMessagesCount: 0,
      reactionsCount: 0,
      reactionsByType: new Map(),
      qualityDistribution: new Map(),
    };
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  /**
   * Start collecting analytics
   */
  start(): void {
    // Take viewer snapshots every 30 seconds
    this.snapshotInterval = setInterval(() => {
      this.takeViewerSnapshot();
    }, 30000);

    logger.info("Analytics started for stream", { streamId: this.streamId });
  }

  /**
   * Stop collecting analytics
   */
  stop(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }

    logger.info("Analytics stopped for stream", { streamId: this.streamId });
  }

  /**
   * Reset analytics data
   */
  reset(): void {
    this.startTime = Date.now();
    this.store = {
      viewerSnapshots: [],
      engagementEvents: [],
      qualityEvents: [],
      viewerLocations: new Map(),
      viewerDevices: new Map(),
      peakViewers: 0,
      totalUniqueViewers: new Set(),
      totalViews: 0,
      chatMessagesCount: 0,
      reactionsCount: 0,
      reactionsByType: new Map(),
      qualityDistribution: new Map(),
    };
  }

  // ==========================================================================
  // Viewer Tracking
  // ==========================================================================

  /**
   * Track viewer join
   */
  trackViewerJoin(viewer: StreamViewer): void {
    const viewerId = viewer.userId ?? viewer.sessionId;
    this.store.totalUniqueViewers.add(viewerId);
    this.store.totalViews++;

    // Track geographic data
    if (viewer.country) {
      const key = `${viewer.country}-${viewer.region ?? "unknown"}`;
      const existing = this.store.viewerLocations.get(key);
      if (existing) {
        existing.viewers++;
      } else {
        this.store.viewerLocations.set(key, {
          country: viewer.country,
          region: viewer.region,
          viewers: 1,
          percentage: 0,
        });
      }
    }

    // Track device data
    if (viewer.device || viewer.browser) {
      const key = `${viewer.device ?? "unknown"}-${viewer.browser ?? "unknown"}`;
      const existing = this.store.viewerDevices.get(key);
      if (existing) {
        existing.viewers++;
      } else {
        this.store.viewerDevices.set(key, {
          device: viewer.device ?? "unknown",
          browser: viewer.browser ?? "unknown",
          os: viewer.os ?? "unknown",
          viewers: 1,
          percentage: 0,
        });
      }
    }

    logger.debug("Viewer join tracked", { streamId: this.streamId, viewerId });
  }

  /**
   * Track viewer leave
   */
  trackViewerLeave(viewer: StreamViewer): void {
    logger.debug("Viewer leave tracked", {
      streamId: this.streamId,
      viewerId: viewer.userId ?? viewer.sessionId,
      watchTime: viewer.totalWatchTimeSeconds,
    });
  }

  /**
   * Update current viewer count
   */
  updateViewerCount(count: number): void {
    const snapshot: ViewerSnapshot = {
      timestamp: Date.now(),
      count,
    };

    this.store.viewerSnapshots.push(snapshot);

    if (count > this.store.peakViewers) {
      this.store.peakViewers = count;
    }

    // Keep only last 1000 snapshots
    if (this.store.viewerSnapshots.length > 1000) {
      this.store.viewerSnapshots = this.store.viewerSnapshots.slice(-1000);
    }
  }

  /**
   * Track quality selection
   */
  trackQualitySelection(quality: StreamQuality): void {
    const current = this.store.qualityDistribution.get(quality) ?? 0;
    this.store.qualityDistribution.set(quality, current + 1);
  }

  /**
   * Take viewer snapshot for historical data
   */
  private takeViewerSnapshot(): void {
    // Get latest count from snapshots or default to 0
    const latestSnapshot =
      this.store.viewerSnapshots[this.store.viewerSnapshots.length - 1];
    const count = latestSnapshot?.count ?? 0;

    this.store.viewerSnapshots.push({
      timestamp: Date.now(),
      count,
    });
  }

  // ==========================================================================
  // Engagement Tracking
  // ==========================================================================

  /**
   * Track chat message
   */
  trackChatMessage(userId?: string, messageLength?: number): void {
    this.store.chatMessagesCount++;
    this.store.engagementEvents.push({
      type: "chat",
      timestamp: Date.now(),
      userId,
      messageLength,
    });

    // Keep only last 10000 events
    if (this.store.engagementEvents.length > 10000) {
      this.store.engagementEvents = this.store.engagementEvents.slice(-10000);
    }
  }

  /**
   * Track reaction
   */
  trackReaction(emoji: string, userId?: string): void {
    this.store.reactionsCount++;

    const current = this.store.reactionsByType.get(emoji) ?? 0;
    this.store.reactionsByType.set(emoji, current + 1);

    this.store.engagementEvents.push({
      type: "reaction",
      timestamp: Date.now(),
      userId,
      emoji,
    });
  }

  // ==========================================================================
  // Quality Tracking
  // ==========================================================================

  /**
   * Track quality metrics
   */
  trackQualityMetrics(metrics: {
    bitrate: number;
    fps: number;
    resolution: string;
    droppedFrames: number;
    bufferingDuration: number;
  }): void {
    this.store.qualityEvents.push({
      timestamp: Date.now(),
      ...metrics,
    });

    // Keep only last 1000 quality events
    if (this.store.qualityEvents.length > 1000) {
      this.store.qualityEvents = this.store.qualityEvents.slice(-1000);
    }
  }

  // ==========================================================================
  // Analytics Retrieval
  // ==========================================================================

  /**
   * Get real-time analytics
   */
  getRealTimeAnalytics(): RealTimeAnalytics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Current viewers from latest snapshot
    const currentSnapshot =
      this.store.viewerSnapshots[this.store.viewerSnapshots.length - 1];
    const currentViewers = currentSnapshot?.count ?? 0;

    // Viewer delta (compare to 1 minute ago)
    const previousSnapshot = this.store.viewerSnapshots.find(
      (s) => s.timestamp <= oneMinuteAgo,
    );
    const viewerDelta = currentViewers - (previousSnapshot?.count ?? 0);

    // Chat and reactions per minute
    const recentEngagement = this.store.engagementEvents.filter(
      (e) => e.timestamp >= oneMinuteAgo,
    );
    const chatMessagesPerMinute = recentEngagement.filter(
      (e) => e.type === "chat",
    ).length;
    const reactionsPerMinute = recentEngagement.filter(
      (e) => e.type === "reaction",
    ).length;

    // Average watch time (estimated from session data)
    const durationSeconds = this.getDuration();
    const averageWatchTime =
      this.store.totalViews > 0
        ? Math.min(durationSeconds, durationSeconds * 0.7) // Estimate 70% retention
        : 0;

    // Quality metrics from recent events
    const recentQuality = this.store.qualityEvents.slice(-10);
    const bufferingRatio = this.calculateBufferingRatio(recentQuality);
    const healthScore = this.calculateHealthScore(recentQuality);

    return {
      currentViewers,
      viewerDelta,
      peakViewers: this.store.peakViewers,
      totalViews: this.store.totalViews,
      chatMessagesPerMinute,
      reactionsPerMinute,
      averageWatchTime,
      bufferingRatio,
      healthScore,
    };
  }

  /**
   * Get comprehensive analytics
   */
  getAnalytics(): StreamAnalytics {
    const duration = this.getDuration();
    const durationMinutes = Math.max(1, duration / 60);

    // Calculate average viewers
    const avgViewers = this.calculateAverageViewers();

    // Calculate geographic breakdown with percentages
    const totalGeoViewers = Array.from(
      this.store.viewerLocations.values(),
    ).reduce((sum, g) => sum + g.viewers, 0);
    const geographicBreakdown = Array.from(this.store.viewerLocations.values())
      .map((g) => ({
        ...g,
        percentage:
          totalGeoViewers > 0 ? (g.viewers / totalGeoViewers) * 100 : 0,
      }))
      .sort((a, b) => b.viewers - a.viewers);

    // Calculate device breakdown with percentages
    const totalDeviceViewers = Array.from(
      this.store.viewerDevices.values(),
    ).reduce((sum, d) => sum + d.viewers, 0);
    const deviceBreakdown = Array.from(this.store.viewerDevices.values())
      .map((d) => ({
        ...d,
        percentage:
          totalDeviceViewers > 0 ? (d.viewers / totalDeviceViewers) * 100 : 0,
      }))
      .sort((a, b) => b.viewers - a.viewers);

    // Calculate quality breakdown
    const qualityBreakdown: Record<StreamQuality, number> = {
      auto: 0,
      "1080p": 0,
      "720p": 0,
      "480p": 0,
      "360p": 0,
    };
    for (const [quality, count] of this.store.qualityDistribution) {
      qualityBreakdown[quality] = count;
    }

    // Calculate engagement stats
    const chatEvents = this.store.engagementEvents.filter(
      (e) => e.type === "chat",
    );
    const avgMessageLength =
      chatEvents.length > 0
        ? chatEvents.reduce((sum, e) => sum + (e.messageLength ?? 0), 0) /
          chatEvents.length
        : 0;

    const uniqueEngagers = new Set(
      this.store.engagementEvents.filter((e) => e.userId).map((e) => e.userId!),
    );
    const participationRate =
      this.store.totalUniqueViewers.size > 0
        ? (uniqueEngagers.size / this.store.totalUniqueViewers.size) * 100
        : 0;

    const engagement: EngagementStats = {
      chatRate: this.store.chatMessagesCount / durationMinutes,
      reactionRate: this.store.reactionsCount / durationMinutes,
      averageMessageLength: Math.round(avgMessageLength),
      participationRate,
      retentionRate: this.calculateRetentionRate(),
    };

    // Calculate quality stats
    const quality = this.calculateQualityStats();

    // Reactions by type
    const reactionsByType: Record<string, number> = {};
    for (const [emoji, count] of this.store.reactionsByType) {
      reactionsByType[emoji] = count;
    }

    return {
      streamId: this.streamId,
      duration,
      peakViewers: this.store.peakViewers,
      averageViewers: avgViewers,
      totalViews: this.store.totalViews,
      uniqueViewers: this.store.totalUniqueViewers.size,
      averageWatchTime: duration * 0.7, // Estimated
      chatMessages: this.store.chatMessagesCount,
      reactions: this.store.reactionsCount,
      reactionsByType,
      qualityBreakdown,
      geographicBreakdown,
      deviceBreakdown,
      engagement,
      quality,
    };
  }

  /**
   * Get viewer history (for charts)
   */
  getViewerHistory(
    intervalMs: number = 60000,
    maxPoints: number = 60,
  ): Array<{ timestamp: number; count: number }> {
    if (this.store.viewerSnapshots.length === 0) {
      return [];
    }

    const now = Date.now();
    const points: Array<{ timestamp: number; count: number }> = [];

    for (let i = 0; i < maxPoints; i++) {
      const targetTime = now - (maxPoints - i - 1) * intervalMs;

      // Find closest snapshot
      const snapshot = this.store.viewerSnapshots.find(
        (s) =>
          s.timestamp >= targetTime && s.timestamp < targetTime + intervalMs,
      );

      points.push({
        timestamp: targetTime,
        count: snapshot?.count ?? 0,
      });
    }

    return points;
  }

  /**
   * Get engagement timeline
   */
  getEngagementTimeline(
    intervalMs: number = 60000,
    maxPoints: number = 60,
  ): Array<{ timestamp: number; chat: number; reactions: number }> {
    const now = Date.now();
    const points: Array<{
      timestamp: number;
      chat: number;
      reactions: number;
    }> = [];

    for (let i = 0; i < maxPoints; i++) {
      const startTime = now - (maxPoints - i - 1) * intervalMs;
      const endTime = startTime + intervalMs;

      const events = this.store.engagementEvents.filter(
        (e) => e.timestamp >= startTime && e.timestamp < endTime,
      );

      points.push({
        timestamp: startTime,
        chat: events.filter((e) => e.type === "chat").length,
        reactions: events.filter((e) => e.type === "reaction").length,
      });
    }

    return points;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private getDuration(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private calculateAverageViewers(): number {
    if (this.store.viewerSnapshots.length === 0) return 0;

    const sum = this.store.viewerSnapshots.reduce((acc, s) => acc + s.count, 0);
    return Math.round(sum / this.store.viewerSnapshots.length);
  }

  private calculateRetentionRate(): number {
    // Simplified retention calculation
    // In production, this would use actual session data
    if (this.store.totalViews === 0) return 0;

    const currentSnapshot =
      this.store.viewerSnapshots[this.store.viewerSnapshots.length - 1];
    const currentViewers = currentSnapshot?.count ?? 0;

    return (currentViewers / this.store.totalViews) * 100;
  }

  private calculateBufferingRatio(events: QualityEvent[]): number {
    if (events.length === 0) return 0;

    const totalBuffering = events.reduce(
      (sum, e) => sum + e.bufferingDuration,
      0,
    );
    const timeSpan = events.length * 5000; // Assuming 5 second intervals

    return (totalBuffering / timeSpan) * 100;
  }

  private calculateHealthScore(events: QualityEvent[]): number {
    if (events.length === 0) return 100;

    let score = 100;

    // Penalize for dropped frames
    const avgDroppedFrames =
      events.reduce((sum, e) => sum + e.droppedFrames, 0) / events.length;
    score -= Math.min(20, avgDroppedFrames * 0.5);

    // Penalize for buffering
    const bufferingRatio = this.calculateBufferingRatio(events);
    score -= Math.min(30, bufferingRatio * 3);

    // Penalize for low bitrate
    const avgBitrate =
      events.reduce((sum, e) => sum + e.bitrate, 0) / events.length;
    if (avgBitrate < 1000) {
      score -= 20;
    } else if (avgBitrate < 2000) {
      score -= 10;
    }

    return Math.max(0, Math.round(score));
  }

  private calculateQualityStats(): QualityStats {
    const events = this.store.qualityEvents;

    if (events.length === 0) {
      return {
        averageBitrate: 0,
        averageFps: 0,
        bufferingRatio: 0,
        healthScore: 100,
        qualityDrops: 0,
      };
    }

    const avgBitrate =
      events.reduce((sum, e) => sum + e.bitrate, 0) / events.length;
    const avgFps = events.reduce((sum, e) => sum + e.fps, 0) / events.length;

    // Count quality drops (significant bitrate decrease)
    let qualityDrops = 0;
    for (let i = 1; i < events.length; i++) {
      if (events[i].bitrate < events[i - 1].bitrate * 0.7) {
        qualityDrops++;
      }
    }

    return {
      averageBitrate: Math.round(avgBitrate),
      averageFps: Math.round(avgFps),
      bufferingRatio: this.calculateBufferingRatio(events),
      healthScore: this.calculateHealthScore(events),
      qualityDrops,
    };
  }
}

// ============================================================================
// Analytics Manager (Singleton)
// ============================================================================

class AnalyticsManager {
  private collectors: Map<string, LivestreamAnalyticsService> = new Map();

  /**
   * Get or create analytics collector for stream
   */
  getAnalytics(streamId: string): LivestreamAnalyticsService {
    let collector = this.collectors.get(streamId);

    if (!collector) {
      collector = new LivestreamAnalyticsService(streamId);
      this.collectors.set(streamId, collector);
    }

    return collector;
  }

  /**
   * Remove analytics collector
   */
  removeAnalytics(streamId: string): void {
    const collector = this.collectors.get(streamId);
    if (collector) {
      collector.stop();
      this.collectors.delete(streamId);
    }
  }

  /**
   * Get all active collectors
   */
  getAllCollectors(): LivestreamAnalyticsService[] {
    return Array.from(this.collectors.values());
  }

  /**
   * Clear all collectors
   */
  clearAll(): void {
    for (const collector of this.collectors.values()) {
      collector.stop();
    }
    this.collectors.clear();
  }
}

export const analyticsManager = new AnalyticsManager();

/**
 * Get analytics service for stream
 */
export function getLivestreamAnalytics(
  streamId: string,
): LivestreamAnalyticsService {
  return analyticsManager.getAnalytics(streamId);
}

/**
 * Create new analytics service
 */
export function createLivestreamAnalytics(
  streamId: string,
): LivestreamAnalyticsService {
  return new LivestreamAnalyticsService(streamId);
}
