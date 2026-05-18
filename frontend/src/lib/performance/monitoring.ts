/**
 * Performance Monitoring Utilities
 *
 * Centralized performance monitoring, metrics collection, and alerting.
 */

import { captureError, addSentryBreadcrumb } from "../sentry-utils";

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count" | "percent";
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceThresholds {
  warning: number;
  critical: number;
}

export interface PerformanceAlert {
  metric: string;
  value: number;
  threshold: number;
  severity: "warning" | "critical";
  timestamp: number;
}

// =============================================================================
// Performance Thresholds
// =============================================================================

const THRESHOLDS: Record<string, PerformanceThresholds> = {
  // Page load metrics (milliseconds)
  page_load: { warning: 3000, critical: 5000 },
  api_call: { warning: 1000, critical: 3000 },
  render: { warning: 100, critical: 300 },

  // Web Vitals
  lcp: { warning: 2500, critical: 4000 }, // Largest Contentful Paint
  fid: { warning: 100, critical: 300 }, // First Input Delay
  cls: { warning: 0.1, critical: 0.25 }, // Cumulative Layout Shift
  inp: { warning: 200, critical: 500 }, // Interaction to Next Paint
  ttfb: { warning: 800, critical: 1800 }, // Time to First Byte

  // Memory (megabytes)
  memory_used: { warning: 100, critical: 200 },
  memory_limit: { warning: 80, critical: 90 }, // percent

  // Bundle size (kilobytes)
  bundle_size: { warning: 500, critical: 1000 },
};

// =============================================================================
// Performance Monitor Class
// =============================================================================

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  /**
   * Record a performance metric
   */
  record(
    name: string,
    value: number,
    unit: PerformanceMetric["unit"] = "ms",
    metadata?: Record<string, any>,
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check thresholds
    this.checkThresholds(metric);

    // Log to console in dev
    if (process.env.NODE_ENV === "development") {
      // REMOVED: console.log(`[Perf] ${name}: ${value}${unit}`, metadata)
    }

    return metric;
  }

  /**
   * Check if metric exceeds thresholds
   */
  private checkThresholds(metric: PerformanceMetric) {
    const threshold = THRESHOLDS[metric.name];
    if (!threshold) return;

    let severity: "warning" | "critical" | null = null;

    if (metric.value >= threshold.critical) {
      severity = "critical";
    } else if (metric.value >= threshold.warning) {
      severity = "warning";
    }

    if (severity) {
      const alert: PerformanceAlert = {
        metric: metric.name,
        value: metric.value,
        threshold:
          severity === "critical" ? threshold.critical : threshold.warning,
        severity,
        timestamp: metric.timestamp,
      };

      this.alerts.push(alert);
      this.handleAlert(alert, metric);
    }
  }

  /**
   * Handle performance alert
   */
  private handleAlert(alert: PerformanceAlert, metric: PerformanceMetric) {
    // Log to console
    const emoji = alert.severity === "critical" ? "🚨" : "⚠️";
    console.warn(
      `${emoji} Performance ${alert.severity}: ${alert.metric} = ${alert.value}${metric.unit} (threshold: ${alert.threshold}${metric.unit})`,
    );

    // Send to Sentry
    if (typeof window !== "undefined") {
      addSentryBreadcrumb(
        "performance",
        `Performance ${alert.severity}: ${alert.metric}`,
        {
          value: alert.value,
          threshold: alert.threshold,
          unit: metric.unit,
        },
      );

      if (alert.severity === "critical") {
        captureError(
          new Error(`Performance threshold exceeded: ${alert.metric}`),
          {
            tags: { category: "performance" },
            extra: {
              metric: alert.metric,
              value: alert.value,
              threshold: alert.threshold,
              unit: metric.unit,
              metadata: metric.metadata,
            },
          },
        );
      }
    }
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get average value for a metric
   */
  getAverage(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Get percentile value for a metric
   */
  getPercentile(name: string, percentile: number): number {
    const metrics = this.getMetrics(name).sort((a, b) => a.value - b.value);
    if (metrics.length === 0) return 0;

    const index = Math.floor((percentile / 100) * metrics.length);
    return metrics[index]?.value ?? 0;
  }

  /**
   * Get all alerts
   */
  getAlerts(): PerformanceAlert[] {
    return this.alerts;
  }

  /**
   * Clear metrics and alerts
   */
  clear() {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify(
      {
        metrics: this.metrics,
        alerts: this.alerts,
        summary: {
          total_metrics: this.metrics.length,
          total_alerts: this.alerts.length,
          critical_alerts: this.alerts.filter((a) => a.severity === "critical")
            .length,
        },
      },
      null,
      2,
    );
  }
}

// =============================================================================
// Global Performance Monitor Instance
// =============================================================================

export const performanceMonitor = new PerformanceMonitor();

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    performanceMonitor.record(name, duration, "ms", metadata);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.record(name, duration, "ms", {
      ...metadata,
      error: true,
    });
    throw error;
  }
}

/**
 * Measure synchronous function execution time
 */
export function measure<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>,
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    performanceMonitor.record(name, duration, "ms", metadata);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.record(name, duration, "ms", {
      ...metadata,
      error: true,
    });
    throw error;
  }
}

/**
 * Create a performance marker
 */
export function mark(name: string) {
  if (typeof window !== "undefined" && window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure between two markers
 */
export function measureBetween(
  name: string,
  startMark: string,
  endMark: string,
) {
  if (typeof window !== "undefined" && window.performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      if (measure) {
        performanceMonitor.record(name, measure.duration, "ms");
      }
    } catch (error) {
      logger.warn(`Failed to measure between ${startMark} and ${endMark}:`, {
        context: error,
      });
    }
  }
}

/**
 * Get memory usage (if available)
 */
export function getMemoryUsage() {
  if (typeof window !== "undefined" && "memory" in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize / 1048576, // Convert to MB
      total: memory.totalJSHeapSize / 1048576,
      limit: memory.jsHeapSizeLimit / 1048576,
      usedPercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * Monitor memory usage
 */
export function monitorMemory() {
  const memory = getMemoryUsage();
  if (memory) {
    performanceMonitor.record("memory_used", memory.used, "bytes", {
      total: memory.total,
      limit: memory.limit,
    });
    performanceMonitor.record("memory_limit", memory.usedPercent, "percent");
  }
}

/**
 * Start continuous performance monitoring
 */
export function startPerformanceMonitoring(intervalMs: number = 30000) {
  if (typeof window === "undefined") return;

  // Monitor memory every interval
  const memoryInterval = setInterval(() => {
    monitorMemory();
  }, intervalMs);

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(memoryInterval);
  });

  return () => clearInterval(memoryInterval);
}

// =============================================================================
// React Hook
// =============================================================================

/**
 * Hook to measure component render time
 */
export function usePerformanceMonitor(componentName: string) {
  if (typeof window === "undefined") return;

  const startTime = performance.now();

  // Measure on unmount
  return () => {
    const renderTime = performance.now() - startTime;
    performanceMonitor.record(`render_${componentName}`, renderTime, "ms");
  };
}
