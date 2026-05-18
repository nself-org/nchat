/**
 * Performance Metrics
 *
 * Utility functions for calculating and analyzing performance metrics
 */

import type {
  PerformanceMetric,
  CustomMetric,
  PerformanceSnapshot,
} from "./monitor";

// ============================================================================
// Types
// ============================================================================

export interface MetricStats {
  min: number;
  max: number;
  avg: number;
  median: number;
  p75: number;
  p95: number;
  p99: number;
  count: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface MetricTrend {
  direction: "improving" | "stable" | "degrading";
  change: number; // Percentage change
  current: number;
  previous: number;
}

export interface PerformanceScore {
  overall: number; // 0-100
  webVitals: number;
  api: number;
  rendering: number;
  memory: number;
  errors: number;
  breakdown: {
    lcp: number;
    cls: number;
    ttfb: number;
    fcp: number;
    inp: number;
  };
}

// ============================================================================
// Statistical Functions
// ============================================================================

/**
 * Calculate statistics for a set of values
 */
export function calculateStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      p75: 0,
      p95: 0,
      p99: 0,
      count: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / values.length,
    median: getPercentile(sorted, 50),
    p75: getPercentile(sorted, 75),
    p95: getPercentile(sorted, 95),
    p99: getPercentile(sorted, 99),
    count: values.length,
  };
}

/**
 * Get percentile value from sorted array
 */
function getPercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;

  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(
  values: number[],
  windowSize: number,
): number[] {
  if (values.length < windowSize) {
    return values;
  }

  const result: number[] = [];
  for (let i = 0; i < values.length - windowSize + 1; i++) {
    const window = values.slice(i, i + windowSize);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    result.push(avg);
  }

  return result;
}

// ============================================================================
// Metric Analysis
// ============================================================================

/**
 * Analyze metric trend
 */
export function analyzeTrend(
  current: number[],
  previous: number[],
): MetricTrend {
  if (current.length === 0 || previous.length === 0) {
    return {
      direction: "stable",
      change: 0,
      current: 0,
      previous: 0,
    };
  }

  const currentAvg =
    current.reduce((sum, val) => sum + val, 0) / current.length;
  const previousAvg =
    previous.reduce((sum, val) => sum + val, 0) / previous.length;

  const change = ((currentAvg - previousAvg) / previousAvg) * 100;

  let direction: MetricTrend["direction"] = "stable";
  if (Math.abs(change) > 10) {
    // More than 10% change
    direction = change < 0 ? "improving" : "degrading"; // Lower is better for most metrics
  }

  return {
    direction,
    change,
    current: currentAvg,
    previous: previousAvg,
  };
}

/**
 * Convert metrics to time series
 */
export function toTimeSeries(metrics: CustomMetric[]): TimeSeriesPoint[] {
  return metrics.map((m) => ({
    timestamp: m.timestamp,
    value: m.value,
  }));
}

/**
 * Group metrics by time bucket
 */
export function groupByTimeBucket(
  metrics: CustomMetric[],
  bucketSize: number, // in milliseconds
): Map<number, number[]> {
  const buckets = new Map<number, number[]>();

  metrics.forEach((metric) => {
    const bucket = Math.floor(metric.timestamp / bucketSize) * bucketSize;
    const values = buckets.get(bucket) || [];
    values.push(metric.value);
    buckets.set(bucket, values);
  });

  return buckets;
}

/**
 * Get metrics in time range
 */
export function getMetricsInRange(
  metrics: CustomMetric[],
  startTime: number,
  endTime: number,
): CustomMetric[] {
  return metrics.filter(
    (m) => m.timestamp >= startTime && m.timestamp <= endTime,
  );
}

// ============================================================================
// Performance Scoring
// ============================================================================

/**
 * Calculate overall performance score
 */
export function calculatePerformanceScore(
  snapshot: PerformanceSnapshot,
): PerformanceScore {
  const webVitalsScore = calculateWebVitalsScore(snapshot.webVitals);
  const apiScore = calculateApiScore(snapshot.custom.apiResponseTime);
  const renderingScore = calculateRenderingScore(snapshot.custom.renderTime);
  const memoryScore = calculateMemoryScore(snapshot.custom.memoryUsage);
  const errorsScore = calculateErrorScore(snapshot.errors.rate);

  // Weighted average
  const overall =
    webVitalsScore * 0.4 +
    apiScore * 0.2 +
    renderingScore * 0.2 +
    memoryScore * 0.1 +
    errorsScore * 0.1;

  return {
    overall: Math.round(overall),
    webVitals: Math.round(webVitalsScore),
    api: Math.round(apiScore),
    rendering: Math.round(renderingScore),
    memory: Math.round(memoryScore),
    errors: Math.round(errorsScore),
    breakdown: {
      lcp: scoreMetric(snapshot.webVitals.lcp || 0, 2500, 4000),
      cls: scoreMetric((snapshot.webVitals.cls || 0) * 1000, 100, 250), // Convert to match scale
      ttfb: scoreMetric(snapshot.webVitals.ttfb || 0, 800, 1800),
      fcp: scoreMetric(snapshot.webVitals.fcp || 0, 1800, 3000),
      inp: scoreMetric(snapshot.webVitals.inp || 0, 200, 500),
    },
  };
}

/**
 * Calculate Web Vitals score
 */
function calculateWebVitalsScore(
  vitals: PerformanceSnapshot["webVitals"],
): number {
  const scores = [
    scoreMetric(vitals.lcp || 0, 2500, 4000),
    scoreMetric((vitals.cls || 0) * 1000, 100, 250), // Convert CLS to comparable scale
    scoreMetric(vitals.ttfb || 0, 800, 1800),
    scoreMetric(vitals.fcp || 0, 1800, 3000),
    scoreMetric(vitals.inp || 0, 200, 500),
  ];

  // Filter out zeros (metrics not yet available)
  const validScores = scores.filter((s) => s > 0);
  if (validScores.length === 0) return 0;

  return validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
}

/**
 * Calculate API score
 */
function calculateApiScore(avgResponseTime: number): number {
  return scoreMetric(avgResponseTime, 500, 2000);
}

/**
 * Calculate rendering score
 */
function calculateRenderingScore(avgRenderTime: number): number {
  return scoreMetric(avgRenderTime, 16, 50);
}

/**
 * Calculate memory score
 */
function calculateMemoryScore(memoryUsagePercent: number): number {
  return scoreMetric(memoryUsagePercent, 50, 80);
}

/**
 * Calculate error score
 */
function calculateErrorScore(errorRate: number): number {
  return scoreMetric(errorRate * 100, 1, 5); // Convert to percentage
}

/**
 * Score a metric (0-100, lower values are better)
 */
function scoreMetric(value: number, good: number, poor: number): number {
  if (value === 0) return 0; // Not available

  if (value <= good) return 100;
  if (value >= poor) return 0;

  // Linear interpolation between good and poor
  const range = poor - good;
  const position = value - good;
  return Math.round(100 - (position / range) * 100);
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format metric value with unit
 */
export function formatMetricValue(
  value: number,
  unit: "ms" | "bytes" | "count" | "percent",
): string {
  switch (unit) {
    case "ms":
      return `${value.toFixed(2)}ms`;
    case "bytes":
      return formatBytes(value);
    case "count":
      return value.toFixed(0);
    case "percent":
      return `${value.toFixed(2)}%`;
    default:
      return value.toString();
  }
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration to human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Get rating color
 */
export function getRatingColor(
  rating: "good" | "needs-improvement" | "poor",
): string {
  switch (rating) {
    case "good":
      return "text-green-600";
    case "needs-improvement":
      return "text-yellow-600";
    case "poor":
      return "text-red-600";
  }
}

/**
 * Get score color
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Get score grade
 */
export function getScoreGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Export metrics to CSV
 */
export function exportToCSV(metrics: PerformanceMetric[]): string {
  const headers = ["ID", "Name", "Value", "Rating", "Timestamp", "Metadata"];
  const rows = metrics.map((m) => [
    m.id,
    m.name,
    m.value.toString(),
    m.rating,
    new Date(m.timestamp).toISOString(),
    JSON.stringify(m.metadata || {}),
  ]);

  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

/**
 * Export metrics to JSON
 */
export function exportToJSON(metrics: PerformanceMetric[]): string {
  return JSON.stringify(metrics, null, 2);
}

// ============================================================================
// Comparison
// ============================================================================

/**
 * Compare two snapshots
 */
export function compareSnapshots(
  current: PerformanceSnapshot,
  previous: PerformanceSnapshot,
): {
  webVitals: Record<
    string,
    { change: number; direction: "up" | "down" | "stable" }
  >;
  custom: Record<
    string,
    { change: number; direction: "up" | "down" | "stable" }
  >;
  errors: { change: number; direction: "up" | "down" | "stable" };
} {
  const compareValue = (curr: number | undefined, prev: number | undefined) => {
    if (curr === undefined || prev === undefined || prev === 0) {
      return { change: 0, direction: "stable" as const };
    }

    const change = ((curr - prev) / prev) * 100;
    let direction: "up" | "down" | "stable" = "stable";

    if (Math.abs(change) > 5) {
      direction = change > 0 ? "up" : "down";
    }

    return { change, direction };
  };

  return {
    webVitals: {
      lcp: compareValue(current.webVitals.lcp, previous.webVitals.lcp),
      cls: compareValue(current.webVitals.cls, previous.webVitals.cls),
      ttfb: compareValue(current.webVitals.ttfb, previous.webVitals.ttfb),
      fcp: compareValue(current.webVitals.fcp, previous.webVitals.fcp),
      inp: compareValue(current.webVitals.inp, previous.webVitals.inp),
    },
    custom: {
      apiResponseTime: compareValue(
        current.custom.apiResponseTime,
        previous.custom.apiResponseTime,
      ),
      websocketLatency: compareValue(
        current.custom.websocketLatency,
        previous.custom.websocketLatency,
      ),
      renderTime: compareValue(
        current.custom.renderTime,
        previous.custom.renderTime,
      ),
      memoryUsage: compareValue(
        current.custom.memoryUsage,
        previous.custom.memoryUsage,
      ),
    },
    errors: compareValue(current.errors.rate, previous.errors.rate),
  };
}
