/**
 * Performance Monitor
 *
 * Central performance monitoring system that tracks:
 * - Web Vitals (LCP, FID, CLS, TTFB, FCP, INP)
 * - Custom metrics (API, WebSocket, render times)
 * - Resource timing
 * - Memory usage
 * - Error rates
 */

import { onCLS, onLCP, onTTFB, onFCP, onINP, type Metric } from "web-vitals";
import * as Sentry from "@sentry/nextjs";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count" | "percent";
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceWarning {
  id: string;
  type: "slow-operation" | "memory-leak" | "high-error-rate" | "poor-vitals";
  severity: "warning" | "critical";
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceSnapshot {
  webVitals: {
    lcp?: number;
    cls?: number;
    ttfb?: number;
    fcp?: number;
    inp?: number;
  };
  custom: {
    apiResponseTime: number;
    websocketLatency: number;
    renderTime: number;
    memoryUsage: number;
  };
  errors: {
    count: number;
    rate: number;
  };
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const WEB_VITALS_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1800, poor: 3000 },
  inp: { good: 200, poor: 500 },
} as const;

const PERFORMANCE_THRESHOLDS = {
  apiResponseTime: { good: 500, poor: 2000 },
  websocketLatency: { good: 100, poor: 500 },
  renderTime: { good: 16, poor: 50 }, // 60fps = 16ms per frame
  memoryUsage: { good: 50, poor: 80 }, // Percentage
  errorRate: { good: 0.01, poor: 0.05 }, // Percentage
} as const;

const STORAGE_KEY = "nchat-performance-metrics";
const MAX_STORED_METRICS = 1000;
const WARNING_CHECK_INTERVAL = 60000; // 1 minute

// ============================================================================
// Performance Monitor Class
// ============================================================================

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private warnings: PerformanceWarning[] = [];
  private listeners: Set<(snapshot: PerformanceSnapshot) => void> = new Set();
  private warningListeners: Set<(warning: PerformanceWarning) => void> =
    new Set();
  private isInitialized = false;
  private warningCheckTimer: NodeJS.Timeout | null = null;
  private errorCount = 0;
  private totalRequests = 0;

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Only run in browser
    if (typeof window === "undefined") return;

    this.setupWebVitals();
    this.setupPerformanceObserver();
    this.setupMemoryMonitoring();
    this.startWarningChecks();
    this.loadStoredMetrics();

    this.isInitialized = true;

    // REMOVED: console.log('[PerformanceMonitor] Initialized')
  }

  /**
   * Setup Web Vitals tracking
   */
  private setupWebVitals(): void {
    const handleMetric = (metric: Metric) => {
      const rating = this.getRating(
        metric.name.toLowerCase() as keyof typeof WEB_VITALS_THRESHOLDS,
        metric.value,
      );

      const perfMetric: PerformanceMetric = {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        rating,
        timestamp: Date.now(),
        metadata: {
          navigationType: metric.navigationType,
          delta: metric.delta,
        },
      };

      this.addMetric(perfMetric);

      // Send to Sentry
      Sentry.metrics.distribution(metric.name, metric.value, {
        unit: "millisecond",
        tags: { rating },
      });

      // Check for poor vitals
      if (rating === "poor") {
        this.addWarning({
          type: "poor-vitals",
          severity: "warning",
          message: `Poor ${metric.name}: ${metric.value.toFixed(2)}`,
          metadata: { metric: metric.name, value: metric.value, rating },
        });
      }
    };

    // Track all Web Vitals
    onLCP(handleMetric);
    onCLS(handleMetric);
    onTTFB(handleMetric);
    onFCP(handleMetric);
    onINP(handleMetric);
  }

  /**
   * Setup Performance Observer for resource timing
   */
  private setupPerformanceObserver(): void {
    if (!("PerformanceObserver" in window)) return;

    try {
      // Navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordCustomMetric({
              name: "page-load-time",
              value: navEntry.loadEventEnd - navEntry.fetchStart,
              unit: "ms",
              tags: { type: "navigation" },
            });
          }
        }
      });

      navObserver.observe({ entryTypes: ["navigation"] });

      // Resource timing (for API calls)
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const resourceEntry = entry as PerformanceResourceTiming;

            // Track API calls
            if (
              resourceEntry.name.includes("/api/") ||
              resourceEntry.name.includes("/v1/graphql")
            ) {
              const duration =
                resourceEntry.responseEnd - resourceEntry.fetchStart;
              this.recordCustomMetric({
                name: "api-response-time",
                value: duration,
                unit: "ms",
                tags: {
                  endpoint: new URL(resourceEntry.name).pathname,
                },
              });

              this.totalRequests++;
            }
          }
        }
      });

      resourceObserver.observe({ entryTypes: ["resource"] });

      // Long tasks (blocking main thread)
      if ("PerformanceLongTaskTiming" in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordCustomMetric({
              name: "long-task-duration",
              value: entry.duration,
              unit: "ms",
            });

            if (entry.duration > 100) {
              this.addWarning({
                type: "slow-operation",
                severity: "warning",
                message: `Long task detected: ${entry.duration.toFixed(2)}ms`,
                metadata: { duration: entry.duration },
              });
            }
          }
        });

        longTaskObserver.observe({ entryTypes: ["longtask"] });
      }
    } catch (error) {
      logger.error(
        "[PerformanceMonitor] Error setting up PerformanceObserver:",
        error,
      );
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    // @ts-ignore - performance.memory is non-standard but widely supported
    if (!performance.memory) return;

    setInterval(() => {
      // @ts-ignore
      const memory = performance.memory;
      const usedPercent =
        (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      this.recordCustomMetric({
        name: "memory-usage",
        value: usedPercent,
        unit: "percent",
        tags: {
          usedMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
          totalMB: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
          limitMB: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
        },
      });

      // Check for high memory usage
      if (usedPercent > PERFORMANCE_THRESHOLDS.memoryUsage.poor) {
        this.addWarning({
          type: "memory-leak",
          severity: "critical",
          message: `High memory usage: ${usedPercent.toFixed(2)}%`,
          metadata: {
            usedPercent,
            usedMB: memory.usedJSHeapSize / 1024 / 1024,
          },
        });
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Start periodic warning checks
   */
  private startWarningChecks(): void {
    this.warningCheckTimer = setInterval(() => {
      this.checkErrorRate();
      this.checkAverageMetrics();
    }, WARNING_CHECK_INTERVAL);
  }

  /**
   * Check error rate
   */
  private checkErrorRate(): void {
    if (this.totalRequests === 0) return;

    const errorRate = this.errorCount / this.totalRequests;

    if (errorRate > PERFORMANCE_THRESHOLDS.errorRate.poor) {
      this.addWarning({
        type: "high-error-rate",
        severity: "critical",
        message: `High error rate: ${(errorRate * 100).toFixed(2)}%`,
        metadata: {
          errorRate,
          errorCount: this.errorCount,
          totalRequests: this.totalRequests,
        },
      });
    }
  }

  /**
   * Check average metrics
   */
  private checkAverageMetrics(): void {
    const recentMetrics = this.customMetrics.filter(
      (m) => Date.now() - m.timestamp < 60000, // Last minute
    );

    // Check API response times
    const apiMetrics = recentMetrics.filter(
      (m) => m.name === "api-response-time",
    );
    if (apiMetrics.length > 0) {
      const avgApiTime =
        apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length;

      if (avgApiTime > PERFORMANCE_THRESHOLDS.apiResponseTime.poor) {
        this.addWarning({
          type: "slow-operation",
          severity: "warning",
          message: `Slow API responses: ${avgApiTime.toFixed(2)}ms average`,
          metadata: { avgApiTime, sampleSize: apiMetrics.length },
        });
      }
    }

    // Check render times
    const renderMetrics = recentMetrics.filter((m) => m.name === "render-time");
    if (renderMetrics.length > 0) {
      const avgRenderTime =
        renderMetrics.reduce((sum, m) => sum + m.value, 0) /
        renderMetrics.length;

      if (avgRenderTime > PERFORMANCE_THRESHOLDS.renderTime.poor) {
        this.addWarning({
          type: "slow-operation",
          severity: "warning",
          message: `Slow renders: ${avgRenderTime.toFixed(2)}ms average (target: 16ms for 60fps)`,
          metadata: { avgRenderTime, sampleSize: renderMetrics.length },
        });
      }
    }
  }

  /**
   * Get rating for a metric value
   */
  private getRating(
    metric: keyof typeof WEB_VITALS_THRESHOLDS,
    value: number,
  ): "good" | "needs-improvement" | "poor" {
    const thresholds = WEB_VITALS_THRESHOLDS[metric];
    if (!thresholds) return "good";

    if (value <= thresholds.good) return "good";
    if (value <= thresholds.poor) return "needs-improvement";
    return "poor";
  }

  /**
   * Add a metric
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Trim old metrics
    if (this.metrics.length > MAX_STORED_METRICS) {
      this.metrics = this.metrics.slice(-MAX_STORED_METRICS);
    }

    this.saveMetrics();
    this.notifyListeners();
  }

  /**
   * Record a custom metric
   */
  recordCustomMetric(metric: Omit<CustomMetric, "timestamp">): void {
    const fullMetric: CustomMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.customMetrics.push(fullMetric);

    // Trim old metrics
    if (this.customMetrics.length > MAX_STORED_METRICS) {
      this.customMetrics = this.customMetrics.slice(-MAX_STORED_METRICS);
    }

    // Send to Sentry
    Sentry.metrics.distribution(metric.name, metric.value, {
      unit: metric.unit,
      tags: metric.tags,
    });

    this.saveMetrics();
    this.notifyListeners();
  }

  /**
   * Record an error
   */
  recordError(error: Error, context?: Record<string, any>): void {
    this.errorCount++;

    Sentry.captureException(error, {
      extra: context,
    });

    this.notifyListeners();
  }

  /**
   * Add a warning
   */
  private addWarning(
    warning: Omit<PerformanceWarning, "id" | "timestamp">,
  ): void {
    const fullWarning: PerformanceWarning = {
      id: `warning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...warning,
    };

    this.warnings.push(fullWarning);

    // Keep last 100 warnings
    if (this.warnings.length > 100) {
      this.warnings = this.warnings.slice(-100);
    }

    // Notify warning listeners
    this.warningListeners.forEach((listener) => listener(fullWarning));

    // Log to Sentry
    Sentry.captureMessage(fullWarning.message, {
      level: fullWarning.severity === "critical" ? "error" : "warning",
      tags: {
        warningType: fullWarning.type,
      },
      extra: fullWarning.metadata,
    });
  }

  /**
   * Get current performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    // Get latest web vitals
    const webVitals: PerformanceSnapshot["webVitals"] = {};
    ["lcp", "cls", "ttfb", "fcp", "inp"].forEach((vital) => {
      const metric = this.metrics
        .filter((m) => m.name.toLowerCase() === vital)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (metric) {
        webVitals[vital as keyof typeof webVitals] = metric.value;
      }
    });

    // Get latest custom metrics (last minute)
    const recentCustom = this.customMetrics.filter(
      (m) => Date.now() - m.timestamp < 60000,
    );

    const getAverage = (name: string) => {
      const metrics = recentCustom.filter((m) => m.name === name);
      if (metrics.length === 0) return 0;
      return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    };

    return {
      webVitals,
      custom: {
        apiResponseTime: getAverage("api-response-time"),
        websocketLatency: getAverage("websocket-latency"),
        renderTime: getAverage("render-time"),
        memoryUsage: getAverage("memory-usage"),
      },
      errors: {
        count: this.errorCount,
        rate: this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics(): CustomMetric[] {
    return [...this.customMetrics];
  }

  /**
   * Get warnings
   */
  getWarnings(): PerformanceWarning[] {
    return [...this.warnings];
  }

  /**
   * Clear a warning
   */
  clearWarning(id: string): void {
    this.warnings = this.warnings.filter((w) => w.id !== id);
  }

  /**
   * Clear all warnings
   */
  clearAllWarnings(): void {
    this.warnings = [];
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(listener: (snapshot: PerformanceSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to warnings
   */
  subscribeToWarnings(
    listener: (warning: PerformanceWarning) => void,
  ): () => void {
    this.warningListeners.add(listener);
    return () => this.warningListeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          metrics: this.metrics.slice(-100), // Keep last 100
          customMetrics: this.customMetrics.slice(-100),
          warnings: this.warnings,
          errorCount: this.errorCount,
          totalRequests: this.totalRequests,
        }),
      );
    } catch (error) {
      logger.error("[PerformanceMonitor] Error saving metrics:", error);
    }
  }

  /**
   * Load metrics from localStorage
   */
  private loadStoredMetrics(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      this.metrics = data.metrics || [];
      this.customMetrics = data.customMetrics || [];
      this.warnings = data.warnings || [];
      this.errorCount = data.errorCount || 0;
      this.totalRequests = data.totalRequests || 0;
    } catch (error) {
      logger.error("[PerformanceMonitor] Error loading metrics:", error);
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = [];
    this.customMetrics = [];
    this.warnings = [];
    this.errorCount = 0;
    this.totalRequests = 0;
    localStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.warningCheckTimer) {
      clearInterval(this.warningCheckTimer);
      this.warningCheckTimer = null;
    }
    this.listeners.clear();
    this.warningListeners.clear();
    this.isInitialized = false;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in browser
if (typeof window !== "undefined") {
  performanceMonitor.initialize();
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Measure function execution time
 */
export function measurePerformance<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>,
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;

    performanceMonitor.recordCustomMetric({
      name,
      value: duration,
      unit: "ms",
      tags,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    performanceMonitor.recordCustomMetric({
      name,
      value: duration,
      unit: "ms",
      tags: { ...tags, error: "true" },
    });

    throw error;
  }
}

/**
 * Measure async function execution time
 */
export async function measurePerformanceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    performanceMonitor.recordCustomMetric({
      name,
      value: duration,
      unit: "ms",
      tags,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    performanceMonitor.recordCustomMetric({
      name,
      value: duration,
      unit: "ms",
      tags: { ...tags, error: "true" },
    });

    throw error;
  }
}

/**
 * Measure render time using React profiler
 */
export function recordRenderTime(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
): void {
  performanceMonitor.recordCustomMetric({
    name: "render-time",
    value: actualDuration,
    unit: "ms",
    tags: { component: id, phase },
  });
}
