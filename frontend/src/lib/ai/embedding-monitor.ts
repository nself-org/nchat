/**
 * Embedding Monitor - Performance and quality monitoring
 *
 * Tracks:
 * - Embedding generation performance
 * - Quality metrics
 * - Cost tracking
 * - Error rates
 * - Cache efficiency
 *
 * @module lib/ai/embedding-monitor
 */

import { gql } from "@apollo/client";
import { apolloClient } from "@/lib/apollo-client";
import { calculateQualityScore, detectAnomalies } from "./embedding-utils";

import { logger } from "@/lib/logger";

// ========================================
// Types
// ========================================

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface QualityMetric {
  embeddingId: string;
  qualityScore: number;
  anomalies: string[];
  timestamp: Date;
}

export interface CostMetric {
  tokens: number;
  cost: number;
  model: string;
  timestamp: Date;
}

export interface MonitoringReport {
  performance: {
    avgDuration: number;
    successRate: number;
    totalOperations: number;
    recentErrors: string[];
  };
  quality: {
    avgQualityScore: number;
    lowQualityCount: number;
    totalAnomalies: number;
  };
  cost: {
    totalCost: number;
    totalTokens: number;
    avgCostPerEmbedding: number;
  };
  cache: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  };
}

// ========================================
// GraphQL Queries
// ========================================

const GET_PERFORMANCE_METRICS = gql`
  query GetPerformanceMetrics($since: timestamptz!) {
    nchat_embedding_stats(
      where: { created_at: { _gte: $since } }
      order_by: { date: desc }
    ) {
      date
      model
      total_embeddings
      avg_processing_time_ms
      cache_hit_count
      cache_miss_count
      error_count
    }
  }
`;

const GET_RECENT_ERRORS = gql`
  query GetRecentErrors($limit: Int!) {
    nchat_messages(
      where: { embedding_error: { _is_null: false } }
      order_by: { updated_at: desc }
      limit: $limit
    ) {
      id
      embedding_error
      embedding_retry_count
      updated_at
    }
  }
`;

// ========================================
// Monitor Class
// ========================================

export class EmbeddingMonitor {
  private performanceMetrics: PerformanceMetric[] = [];
  private qualityMetrics: QualityMetric[] = [];
  private costMetrics: CostMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  /**
   * Record a performance metric
   */
  recordPerformance(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (metric.duration > 5000 && metric.success) {
      console.warn(
        `[Embedding Monitor] Slow operation: ${metric.operation} took ${metric.duration}ms`,
      );
    }

    // Log errors
    if (!metric.success) {
      logger.error(
        `[Embedding Monitor] Operation failed: ${metric.operation}`,
        metric.error,
      );
    }
  }

  /**
   * Record a quality metric
   */
  recordQuality(embeddingId: string, embedding: number[]): void {
    const qualityScore = calculateQualityScore(embedding);
    const anomalies = detectAnomalies(embedding);

    const metric: QualityMetric = {
      embeddingId,
      qualityScore,
      anomalies,
      timestamp: new Date(),
    };

    this.qualityMetrics.push(metric);

    if (this.qualityMetrics.length > this.maxMetrics) {
      this.qualityMetrics = this.qualityMetrics.slice(-this.maxMetrics);
    }

    // Log low quality embeddings
    if (qualityScore < 70) {
      console.warn(
        `[Embedding Monitor] Low quality embedding (${qualityScore}/100): ${embeddingId}`,
        anomalies,
      );
    }
  }

  /**
   * Record a cost metric
   */
  recordCost(tokens: number, cost: number, model: string): void {
    const metric: CostMetric = {
      tokens,
      cost,
      model,
      timestamp: new Date(),
    };

    this.costMetrics.push(metric);

    if (this.costMetrics.length > this.maxMetrics) {
      this.costMetrics = this.costMetrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Track an operation with automatic performance recording
   */
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.recordPerformance({
        operation,
        duration,
        timestamp: new Date(),
        success: true,
        metadata,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordPerformance({
        operation,
        duration,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata,
      });

      throw error;
    }
  }

  /**
   * Get monitoring report
   */
  async getReport(timeRangeHours = 24): Promise<MonitoringReport> {
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    // Get database metrics
    const { data: perfData } = await apolloClient.query({
      query: GET_PERFORMANCE_METRICS,
      variables: { since: since.toISOString() },
      fetchPolicy: "network-only",
    });

    const { data: errorsData } = await apolloClient.query({
      query: GET_RECENT_ERRORS,
      variables: { limit: 10 },
      fetchPolicy: "network-only",
    });

    // Calculate performance metrics
    const recentPerf = this.performanceMetrics.filter(
      (m) => m.timestamp >= since,
    );

    const avgDuration =
      recentPerf.length > 0
        ? recentPerf.reduce((sum, m) => sum + m.duration, 0) / recentPerf.length
        : 0;

    const successRate =
      recentPerf.length > 0
        ? (recentPerf.filter((m) => m.success).length / recentPerf.length) * 100
        : 100;

    const recentErrors = errorsData.nchat_messages
      .map((m: any) => `${m.id}: ${m.embedding_error}`)
      .slice(0, 5);

    // Calculate quality metrics
    const recentQuality = this.qualityMetrics.filter(
      (m) => m.timestamp >= since,
    );

    const avgQualityScore =
      recentQuality.length > 0
        ? recentQuality.reduce((sum, m) => sum + m.qualityScore, 0) /
          recentQuality.length
        : 0;

    const lowQualityCount = recentQuality.filter(
      (m) => m.qualityScore < 70,
    ).length;
    const totalAnomalies = recentQuality.reduce(
      (sum, m) => sum + m.anomalies.length,
      0,
    );

    // Calculate cost metrics
    const recentCost = this.costMetrics.filter((m) => m.timestamp >= since);

    const totalCost = recentCost.reduce((sum, m) => sum + m.cost, 0);
    const totalTokens = recentCost.reduce((sum, m) => sum + m.tokens, 0);
    const avgCostPerEmbedding =
      recentCost.length > 0 ? totalCost / recentCost.length : 0;

    // Calculate cache metrics from database
    const dbStats = perfData.nchat_embedding_stats;
    const totalHits = dbStats.reduce(
      (sum: number, s: any) => sum + s.cache_hit_count,
      0,
    );
    const totalMisses = dbStats.reduce(
      (sum: number, s: any) => sum + s.cache_miss_count,
      0,
    );
    const hitRate =
      totalHits + totalMisses > 0
        ? (totalHits / (totalHits + totalMisses)) * 100
        : 0;

    return {
      performance: {
        avgDuration: Math.round(avgDuration),
        successRate: Number(successRate.toFixed(2)),
        totalOperations: recentPerf.length,
        recentErrors,
      },
      quality: {
        avgQualityScore: Number(avgQualityScore.toFixed(2)),
        lowQualityCount,
        totalAnomalies,
      },
      cost: {
        totalCost: Number(totalCost.toFixed(4)),
        totalTokens,
        avgCostPerEmbedding: Number(avgCostPerEmbedding.toFixed(6)),
      },
      cache: {
        hitRate: Number(hitRate.toFixed(2)),
        totalHits,
        totalMisses,
      },
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(hours = 24): {
    timestamps: Date[];
    avgDurations: number[];
    successRates: number[];
  } {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(
      (m) => m.timestamp >= since,
    );

    // Group by hour
    const hourlyData = new Map<
      number,
      { durations: number[]; successes: number[] }
    >();

    for (const metric of recentMetrics) {
      const hourKey = Math.floor(metric.timestamp.getTime() / (60 * 60 * 1000));

      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, { durations: [], successes: [] });
      }

      const data = hourlyData.get(hourKey)!;
      data.durations.push(metric.duration);
      data.successes.push(metric.success ? 1 : 0);
    }

    // Calculate averages
    const timestamps: Date[] = [];
    const avgDurations: number[] = [];
    const successRates: number[] = [];

    for (const [hourKey, data] of hourlyData.entries()) {
      timestamps.push(new Date(hourKey * 60 * 60 * 1000));
      avgDurations.push(
        data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length,
      );
      successRates.push(
        (data.successes.reduce((sum, s) => sum + s, 0) /
          data.successes.length) *
          100,
      );
    }

    return { timestamps, avgDurations, successRates };
  }

  /**
   * Get alert conditions
   */
  getAlerts(): Array<{ level: "warning" | "error"; message: string }> {
    const alerts: Array<{ level: "warning" | "error"; message: string }> = [];

    // Check recent performance
    const recentMetrics = this.performanceMetrics.slice(-100);

    if (recentMetrics.length > 0) {
      const successRate =
        (recentMetrics.filter((m) => m.success).length / recentMetrics.length) *
        100;

      if (successRate < 80) {
        alerts.push({
          level: "error",
          message: `Low success rate: ${successRate.toFixed(1)}% (last 100 operations)`,
        });
      } else if (successRate < 95) {
        alerts.push({
          level: "warning",
          message: `Degraded success rate: ${successRate.toFixed(1)}% (last 100 operations)`,
        });
      }

      const avgDuration =
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
        recentMetrics.length;

      if (avgDuration > 10000) {
        alerts.push({
          level: "error",
          message: `Very slow performance: ${(avgDuration / 1000).toFixed(1)}s average`,
        });
      } else if (avgDuration > 5000) {
        alerts.push({
          level: "warning",
          message: `Slow performance: ${(avgDuration / 1000).toFixed(1)}s average`,
        });
      }
    }

    // Check quality
    const recentQuality = this.qualityMetrics.slice(-100);

    if (recentQuality.length > 0) {
      const lowQualityRate =
        (recentQuality.filter((m) => m.qualityScore < 70).length /
          recentQuality.length) *
        100;

      if (lowQualityRate > 10) {
        alerts.push({
          level: "warning",
          message: `High low-quality rate: ${lowQualityRate.toFixed(1)}% below quality threshold`,
        });
      }
    }

    return alerts;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.performanceMetrics = [];
    this.qualityMetrics = [];
    this.costMetrics = [];
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    return {
      metricsCount: {
        performance: this.performanceMetrics.length,
        quality: this.qualityMetrics.length,
        cost: this.costMetrics.length,
      },
      memoryUsage: {
        performance: this.performanceMetrics.length,
        quality: this.qualityMetrics.length,
        cost: this.costMetrics.length,
        total:
          this.performanceMetrics.length +
          this.qualityMetrics.length +
          this.costMetrics.length,
        maxMetrics: this.maxMetrics,
      },
    };
  }
}

// Export singleton instance
export const embeddingMonitor = new EmbeddingMonitor();
