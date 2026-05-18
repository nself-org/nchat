/**
 * Performance Tracker
 *
 * Tracks performance metrics including page load times, API response times,
 * resource timing, and Core Web Vitals.
 */

import { AnalyticsEvent } from "./event-schema";
import { getAnalyticsClient, TrackedEvent } from "./analytics-client";

// ============================================================================
// Types
// ============================================================================

/**
 * Core Web Vitals metrics
 */
export interface CoreWebVitals {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  inp: number | null; // Interaction to Next Paint
}

/**
 * Page load metrics
 */
export interface PageLoadMetrics {
  dnsLookup: number;
  tcpConnection: number;
  tlsNegotiation: number;
  requestTime: number;
  responseTime: number;
  domParsing: number;
  domInteractive: number;
  domComplete: number;
  loadComplete: number;
  totalTime: number;
}

/**
 * Resource timing entry
 */
export interface ResourceTiming {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  size: number;
  protocol: string;
}

/**
 * API timing entry
 */
export interface ApiTiming {
  endpoint: string;
  method: string;
  startTime: number;
  duration: number;
  statusCode?: number;
  requestId?: string;
}

/**
 * Performance measurement
 */
export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Performance tracker configuration
 */
export interface PerformanceTrackerConfig {
  enabled: boolean;
  trackCoreWebVitals: boolean;
  trackResourceTiming: boolean;
  trackLongTasks: boolean;
  slowThreshold: number;
  longTaskThreshold: number;
  resourceTimingBufferSize: number;
  sampleRate: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: PerformanceTrackerConfig = {
  enabled: true,
  trackCoreWebVitals: true,
  trackResourceTiming: true,
  trackLongTasks: true,
  slowThreshold: 3000,
  longTaskThreshold: 50,
  resourceTimingBufferSize: 150,
  sampleRate: 1.0,
};

// ============================================================================
// Performance Tracker Class
// ============================================================================

export class PerformanceTracker {
  private config: PerformanceTrackerConfig;
  private measurements: Map<string, PerformanceMeasurement> = new Map();
  private apiTimings: ApiTiming[] = [];
  private webVitals: CoreWebVitals = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
  };
  private longTaskObserver: PerformanceObserver | null = null;
  private lcpObserver: PerformanceObserver | null = null;
  private clsObserver: PerformanceObserver | null = null;
  private clsValue: number = 0;
  private initialized: boolean = false;

  constructor(config: Partial<PerformanceTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initializes performance tracking
   */
  initialize(): void {
    if (this.initialized || !this.config.enabled) {
      return;
    }

    if (typeof window === "undefined" || !("performance" in window)) {
      return;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.setupCoreWebVitals();
    this.setupLongTaskObserver();
    this.initialized = true;
  }

  /**
   * Destroys performance tracking
   */
  destroy(): void {
    this.longTaskObserver?.disconnect();
    this.lcpObserver?.disconnect();
    this.clsObserver?.disconnect();
    this.initialized = false;
  }

  /**
   * Starts a performance measurement
   */
  startMeasure(name: string, metadata?: Record<string, unknown>): void {
    if (!this.config.enabled) {
      return;
    }

    const measurement: PerformanceMeasurement = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.measurements.set(name, measurement);

    if (typeof performance !== "undefined" && performance.mark) {
      try {
        performance.mark(`${name}-start`);
      } catch {
        // Ignore if mark API not supported
      }
    }
  }

  /**
   * Ends a performance measurement
   */
  endMeasure(name: string): PerformanceMeasurement | null {
    if (!this.config.enabled) {
      return null;
    }

    const measurement = this.measurements.get(name);
    if (!measurement) {
      return null;
    }

    measurement.endTime = performance.now();
    measurement.duration = measurement.endTime - measurement.startTime;

    if (
      typeof performance !== "undefined" &&
      performance.mark &&
      performance.measure
    ) {
      try {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch {
        // Ignore if measure API not supported
      }
    }

    this.measurements.delete(name);

    // Track slow operations
    if (measurement.duration > this.config.slowThreshold) {
      this.trackSlowOperation(measurement);
    }

    return measurement;
  }

  /**
   * Measures an async operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    this.startMeasure(name, metadata);
    try {
      const result = await operation();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Measures a sync operation
   */
  measureSync<T>(
    name: string,
    operation: () => T,
    metadata?: Record<string, unknown>,
  ): T {
    this.startMeasure(name, metadata);
    try {
      const result = operation();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Records an API timing
   */
  recordApiTiming(timing: ApiTiming): void {
    if (!this.config.enabled) {
      return;
    }

    this.apiTimings.push(timing);

    // Keep only last 100 timings
    if (this.apiTimings.length > 100) {
      this.apiTimings = this.apiTimings.slice(-100);
    }

    // Track slow API calls
    if (timing.duration > this.config.slowThreshold) {
      getAnalyticsClient().track(AnalyticsEvent.SLOW_OPERATION, {
        operationName: `API: ${timing.method} ${timing.endpoint}`,
        duration: timing.duration,
        threshold: this.config.slowThreshold,
        metadata: {
          statusCode: timing.statusCode,
          requestId: timing.requestId,
        },
      });
    }
  }

  /**
   * Gets page load metrics
   */
  getPageLoadMetrics(): PageLoadMetrics | null {
    if (typeof window === "undefined" || !("performance" in window)) {
      return null;
    }

    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    if (!navigation) {
      return null;
    }

    return {
      dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcpConnection: navigation.connectEnd - navigation.connectStart,
      tlsNegotiation:
        navigation.secureConnectionStart > 0
          ? navigation.connectEnd - navigation.secureConnectionStart
          : 0,
      requestTime: navigation.responseStart - navigation.requestStart,
      responseTime: navigation.responseEnd - navigation.responseStart,
      domParsing: navigation.domInteractive - navigation.responseEnd,
      domInteractive: navigation.domInteractive - navigation.fetchStart,
      domComplete: navigation.domComplete - navigation.fetchStart,
      loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      totalTime: navigation.loadEventEnd - navigation.startTime,
    };
  }

  /**
   * Gets Core Web Vitals
   */
  getCoreWebVitals(): CoreWebVitals {
    return { ...this.webVitals };
  }

  /**
   * Gets resource timing entries
   */
  getResourceTimings(): ResourceTiming[] {
    if (typeof window === "undefined" || !("performance" in window)) {
      return [];
    }

    if (!this.config.trackResourceTiming) {
      return [];
    }

    const entries = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];

    return entries.map((entry) => ({
      name: entry.name,
      type: entry.initiatorType,
      startTime: entry.startTime,
      duration: entry.duration,
      size: entry.transferSize || 0,
      protocol: entry.nextHopProtocol || "unknown",
    }));
  }

  /**
   * Gets API timings
   */
  getApiTimings(): ApiTiming[] {
    return [...this.apiTimings];
  }

  /**
   * Gets average API response time
   */
  getAverageApiTime(): number {
    if (this.apiTimings.length === 0) {
      return 0;
    }
    const total = this.apiTimings.reduce((sum, t) => sum + t.duration, 0);
    return total / this.apiTimings.length;
  }

  /**
   * Clears performance data
   */
  clear(): void {
    this.measurements.clear();
    this.apiTimings = [];
    if (
      typeof performance !== "undefined" &&
      performance.clearResourceTimings
    ) {
      performance.clearResourceTimings();
    }
  }

  /**
   * Reports current performance metrics
   */
  report(): TrackedEvent | null {
    const pageLoadMetrics = this.getPageLoadMetrics();
    const webVitals = this.getCoreWebVitals();

    return getAnalyticsClient().track(AnalyticsEvent.PERFORMANCE_MARK, {
      operationName: "page_performance_report",
      duration: pageLoadMetrics?.totalTime || 0,
      metadata: {
        pageLoadMetrics,
        webVitals,
        apiTimings: {
          count: this.apiTimings.length,
          averageTime: this.getAverageApiTime(),
        },
      },
    });
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private setupCoreWebVitals(): void {
    if (typeof PerformanceObserver === "undefined") {
      return;
    }

    // Track First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(
          (e) => e.name === "first-contentful-paint",
        );
        if (fcpEntry) {
          this.webVitals.fcp = fcpEntry.startTime;
          fcpObserver.disconnect();
        }
      });
      fcpObserver.observe({ type: "paint", buffered: true });
    } catch {
      // Observer not supported
    }

    // Track Largest Contentful Paint
    try {
      this.lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.webVitals.lcp = lastEntry.startTime;
        }
      });
      this.lcpObserver.observe({
        type: "largest-contentful-paint",
        buffered: true,
      });
    } catch {
      // Observer not supported
    }

    // Track First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];
        if (entries.length > 0) {
          this.webVitals.fid =
            entries[0].processingStart - entries[0].startTime;
          fidObserver.disconnect();
        }
      });
      fidObserver.observe({ type: "first-input", buffered: true });
    } catch {
      // Observer not supported
    }

    // Track Cumulative Layout Shift
    try {
      this.clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as Array<
          PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        >;
        for (const entry of entries) {
          if (!entry.hadRecentInput && entry.value) {
            this.clsValue += entry.value;
            this.webVitals.cls = this.clsValue;
          }
        }
      });
      this.clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      // Observer not supported
    }

    // Track TTFB from navigation timing
    if (typeof window !== "undefined" && "performance" in window) {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.webVitals.ttfb =
          navigation.responseStart - navigation.requestStart;
      }
    }
  }

  private setupLongTaskObserver(): void {
    if (
      !this.config.trackLongTasks ||
      typeof PerformanceObserver === "undefined"
    ) {
      return;
    }

    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.duration > this.config.longTaskThreshold) {
            getAnalyticsClient().track(AnalyticsEvent.SLOW_OPERATION, {
              operationName: "long_task",
              duration: entry.duration,
              threshold: this.config.longTaskThreshold,
              metadata: {
                startTime: entry.startTime,
                entryType: entry.entryType,
              },
            });
          }
        }
      });
      this.longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch {
      // Long task observer not supported
    }
  }

  private trackSlowOperation(measurement: PerformanceMeasurement): void {
    getAnalyticsClient().track(AnalyticsEvent.SLOW_OPERATION, {
      operationName: measurement.name,
      duration: measurement.duration!,
      threshold: this.config.slowThreshold,
      metadata: measurement.metadata,
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let performanceTrackerInstance: PerformanceTracker | null = null;

/**
 * Gets or creates the performance tracker singleton
 */
export function getPerformanceTracker(
  config?: Partial<PerformanceTrackerConfig>,
): PerformanceTracker {
  if (!performanceTrackerInstance) {
    performanceTrackerInstance = new PerformanceTracker(config);
  }
  return performanceTrackerInstance;
}

/**
 * Resets the performance tracker singleton (for testing)
 */
export function resetPerformanceTracker(): void {
  if (performanceTrackerInstance) {
    performanceTrackerInstance.destroy();
    performanceTrackerInstance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Starts a performance measurement
 */
export function startMeasure(
  name: string,
  metadata?: Record<string, unknown>,
): void {
  getPerformanceTracker().startMeasure(name, metadata);
}

/**
 * Ends a performance measurement
 */
export function endMeasure(name: string): PerformanceMeasurement | null {
  return getPerformanceTracker().endMeasure(name);
}

/**
 * Measures an async operation
 */
export function measureAsync<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  return getPerformanceTracker().measureAsync(name, operation, metadata);
}

/**
 * Measures a sync operation
 */
export function measureSync<T>(
  name: string,
  operation: () => T,
  metadata?: Record<string, unknown>,
): T {
  return getPerformanceTracker().measureSync(name, operation, metadata);
}

/**
 * Records an API timing
 */
export function recordApiTiming(timing: ApiTiming): void {
  getPerformanceTracker().recordApiTiming(timing);
}

/**
 * Gets page load metrics
 */
export function getPageLoadMetrics(): PageLoadMetrics | null {
  return getPerformanceTracker().getPageLoadMetrics();
}

/**
 * Gets Core Web Vitals
 */
export function getCoreWebVitals(): CoreWebVitals {
  return getPerformanceTracker().getCoreWebVitals();
}
