/**
 * Stream Analytics
 *
 * Collects and analyzes streaming metrics including viewer engagement,
 * quality metrics, and performance statistics.
 *
 * @module lib/streaming/stream-analytics
 */

import type { StreamAnalytics, StreamQualityMetrics } from "./stream-types";

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface BufferingEvent {
  startTime: number;
  endTime?: number;
  duration?: number;
}

// ============================================================================
// Stream Analytics Collector
// ============================================================================

export class StreamAnalyticsCollector {
  private streamId: string;
  private events: AnalyticsEvent[] = [];
  private bufferingEvents: BufferingEvent[] = [];
  private qualityMetrics: StreamQualityMetrics[] = [];
  private startTime: number;
  private viewerCounts: number[] = [];
  private chatMessageTimestamps: number[] = [];
  private reactionTimestamps: number[] = [];
  private currentBuffering: BufferingEvent | null = null;

  constructor(streamId: string) {
    this.streamId = streamId;
    this.startTime = Date.now();
  }

  // ==========================================================================
  // Event Tracking
  // ==========================================================================

  /**
   * Track generic event
   */
  public trackEvent(type: string, data: Record<string, any> = {}): void {
    this.events.push({
      type,
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Track viewer join
   */
  public trackViewerJoin(viewerId: string): void {
    this.trackEvent("viewer:join", { viewerId });
  }

  /**
   * Track viewer leave
   */
  public trackViewerLeave(viewerId: string, watchTime: number): void {
    this.trackEvent("viewer:leave", { viewerId, watchTime });
  }

  /**
   * Track viewer count update
   */
  public trackViewerCount(count: number): void {
    this.viewerCounts.push(count);
    this.trackEvent("viewer:count", { count });
  }

  /**
   * Track chat message
   */
  public trackChatMessage(userId?: string): void {
    this.chatMessageTimestamps.push(Date.now());
    this.trackEvent("chat:message", { userId });
  }

  /**
   * Track reaction
   */
  public trackReaction(emoji: string, userId?: string): void {
    this.reactionTimestamps.push(Date.now());
    this.trackEvent("reaction", { emoji, userId });
  }

  /**
   * Track quality change
   */
  public trackQualityChange(from: string, to: string): void {
    this.trackEvent("quality:change", { from, to });
  }

  /**
   * Track buffering start
   */
  public trackBufferingStart(): void {
    if (this.currentBuffering) return;

    this.currentBuffering = {
      startTime: Date.now(),
    };

    this.trackEvent("buffering:start", {});
  }

  /**
   * Track buffering end
   */
  public trackBufferingEnd(): void {
    if (!this.currentBuffering) return;

    const endTime = Date.now();
    const duration = endTime - this.currentBuffering.startTime;

    this.currentBuffering.endTime = endTime;
    this.currentBuffering.duration = duration;

    this.bufferingEvents.push({ ...this.currentBuffering });
    this.currentBuffering = null;

    this.trackEvent("buffering:end", { duration });
  }

  /**
   * Track quality metrics
   */
  public trackQualityMetrics(metrics: StreamQualityMetrics): void {
    this.qualityMetrics.push(metrics);
  }

  // ==========================================================================
  // Analytics Calculations
  // ==========================================================================

  /**
   * Get comprehensive analytics
   */
  public getAnalytics(): StreamAnalytics {
    const duration = this.getCurrentDuration();
    const peakViewers = this.getPeakViewers();
    const averageViewers = this.getAverageViewers();
    const totalViews = this.getTotalViews();
    const averageWatchTime = this.getAverageWatchTime();
    const chatMessages = this.chatMessageTimestamps.length;
    const reactions = this.reactionTimestamps.length;
    const qualityIssues = this.getQualityIssuesCount();
    const bufferingStats = this.getBufferingStats();
    const engagement = this.getEngagement(duration);

    return {
      streamId: this.streamId,
      duration,
      peakViewers,
      averageViewers,
      totalViews,
      averageWatchTime,
      chatMessages,
      reactions,
      qualityIssues,
      buffering: bufferingStats,
      engagement,
    };
  }

  /**
   * Get current stream duration (seconds)
   */
  private getCurrentDuration(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Get peak viewer count
   */
  private getPeakViewers(): number {
    if (this.viewerCounts.length === 0) return 0;
    return Math.max(...this.viewerCounts);
  }

  /**
   * Get average viewer count
   */
  private getAverageViewers(): number {
    if (this.viewerCounts.length === 0) return 0;
    const sum = this.viewerCounts.reduce((a, b) => a + b, 0);
    return Math.floor(sum / this.viewerCounts.length);
  }

  /**
   * Get total unique views
   */
  private getTotalViews(): number {
    const joinEvents = this.events.filter((e) => e.type === "viewer:join");
    return joinEvents.length;
  }

  /**
   * Get average watch time (seconds)
   */
  private getAverageWatchTime(): number {
    const leaveEvents = this.events.filter((e) => e.type === "viewer:leave");
    if (leaveEvents.length === 0) return 0;

    const totalWatchTime = leaveEvents.reduce(
      (sum, event) => sum + (event.data.watchTime ?? 0),
      0,
    );

    return Math.floor(totalWatchTime / leaveEvents.length);
  }

  /**
   * Get quality issues count
   */
  private getQualityIssuesCount(): number {
    return this.qualityMetrics.filter((m) => (m.healthScore ?? 100) < 80)
      .length;
  }

  /**
   * Get buffering statistics
   */
  private getBufferingStats(): { count: number; totalDuration: number } {
    const count = this.bufferingEvents.length;
    const totalDuration = this.bufferingEvents.reduce(
      (sum, event) => sum + (event.duration ?? 0),
      0,
    );

    return {
      count,
      totalDuration: Math.floor(totalDuration),
    };
  }

  /**
   * Calculate engagement metrics
   */
  private getEngagement(duration: number): {
    chatRate: number;
    reactionRate: number;
  } {
    if (duration === 0) {
      return { chatRate: 0, reactionRate: 0 };
    }

    const durationMinutes = duration / 60;

    return {
      chatRate: parseFloat(
        (this.chatMessageTimestamps.length / durationMinutes).toFixed(2),
      ),
      reactionRate: parseFloat(
        (this.reactionTimestamps.length / durationMinutes).toFixed(2),
      ),
    };
  }

  // ==========================================================================
  // Export & Reset
  // ==========================================================================

  /**
   * Export all collected data
   */
  public exportData(): {
    streamId: string;
    startTime: number;
    events: AnalyticsEvent[];
    bufferingEvents: BufferingEvent[];
    qualityMetrics: StreamQualityMetrics[];
    analytics: StreamAnalytics;
  } {
    return {
      streamId: this.streamId,
      startTime: this.startTime,
      events: this.events,
      bufferingEvents: this.bufferingEvents,
      qualityMetrics: this.qualityMetrics,
      analytics: this.getAnalytics(),
    };
  }

  /**
   * Reset all analytics data
   */
  public reset(): void {
    this.events = [];
    this.bufferingEvents = [];
    this.qualityMetrics = [];
    this.viewerCounts = [];
    this.chatMessageTimestamps = [];
    this.reactionTimestamps = [];
    this.currentBuffering = null;
    this.startTime = Date.now();
  }
}

// ============================================================================
// Analytics Manager (Singleton)
// ============================================================================

class AnalyticsManager {
  private collectors: Map<string, StreamAnalyticsCollector> = new Map();

  /**
   * Get or create collector for stream
   */
  public getCollector(streamId: string): StreamAnalyticsCollector {
    let collector = this.collectors.get(streamId);

    if (!collector) {
      collector = new StreamAnalyticsCollector(streamId);
      this.collectors.set(streamId, collector);
    }

    return collector;
  }

  /**
   * Remove collector
   */
  public removeCollector(streamId: string): void {
    this.collectors.delete(streamId);
  }

  /**
   * Get all collectors
   */
  public getAllCollectors(): StreamAnalyticsCollector[] {
    return Array.from(this.collectors.values());
  }

  /**
   * Clear all collectors
   */
  public clearAll(): void {
    this.collectors.clear();
  }
}

const analyticsManager = new AnalyticsManager();

// ============================================================================
// Exports
// ============================================================================

export { analyticsManager };

/**
 * Get analytics collector for stream
 */
export function getStreamAnalytics(streamId: string): StreamAnalyticsCollector {
  return analyticsManager.getCollector(streamId);
}

/**
 * Create new analytics collector
 */
export function createStreamAnalytics(
  streamId: string,
): StreamAnalyticsCollector {
  return new StreamAnalyticsCollector(streamId);
}
