"use client";

/**
 * Web Vitals Tracking
 *
 * Measures and reports Core Web Vitals and custom performance metrics.
 * Integrates with analytics services (GA, Sentry, custom).
 */

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from "web-vitals";

// =============================================================================
// Types
// =============================================================================

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType:
    | "navigate"
    | "reload"
    | "back-forward"
    | "back-forward-cache"
    | "prerender"
    | "restore";
  entries: PerformanceEntry[];
  route?: string;
  category?: string;
}

export type AnalyticsProvider = "console" | "ga4" | "sentry" | "custom";

export interface WebVitalsConfig {
  /** Enable Web Vitals tracking */
  enabled: boolean;
  /** Analytics providers to send data to */
  providers: AnalyticsProvider[];
  /** Sample rate (0-1, default 1 = 100%) */
  sampleRate?: number;
  /** Debug mode - logs to console */
  debug?: boolean;
  /** Custom event handler */
  onMetric?: (metric: WebVitalMetric) => void;
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: WebVitalsConfig = {
  enabled: process.env.NODE_ENV === "production",
  providers: ["console"],
  sampleRate: 1,
  debug: process.env.NODE_ENV === "development",
};

// =============================================================================
// Metric Handlers
// =============================================================================

/**
 * Send metric to console
 */
function sendToConsole(metric: WebVitalMetric) {
  if (DEFAULT_CONFIG.debug) {
    // REMOVED: console.log('[Web Vitals]', {
    //   name: metric.name,
    //   value: Math.round(metric.value),
    //   rating: metric.rating,
    //   delta: Math.round(metric.delta),
    //   route: metric.route,
    // })
  }
}

/**
 * Send metric to Google Analytics 4
 */
function sendToGA4(metric: WebVitalMetric) {
  if (typeof window !== "undefined" && "gtag" in window) {
    // @ts-ignore - gtag types
    window.gtag("event", metric.name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_value: metric.value,
      metric_delta: Math.round(metric.delta),
      metric_rating: metric.rating,
      page_path: metric.route,
      event_category: "Web Vitals",
    });
  }
}

/**
 * Send metric to Sentry
 */
function sendToSentry(metric: WebVitalMetric) {
  if (typeof window !== "undefined" && "Sentry" in window) {
    // @ts-ignore - Sentry types
    window.Sentry?.captureMessage(`Web Vital: ${metric.name}`, {
      level:
        metric.rating === "good"
          ? "info"
          : metric.rating === "needs-improvement"
            ? "warning"
            : "error",
      tags: {
        web_vital: metric.name,
        rating: metric.rating,
        route: metric.route,
      },
      extra: {
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
      },
    });
  }
}

/**
 * Route metric to appropriate handlers
 */
function handleMetric(metric: WebVitalMetric, config: WebVitalsConfig) {
  // Sample rate check
  if (Math.random() > (config.sampleRate ?? 1)) {
    return;
  }

  // Send to each configured provider
  config.providers.forEach((provider) => {
    switch (provider) {
      case "console":
        sendToConsole(metric);
        break;
      case "ga4":
        sendToGA4(metric);
        break;
      case "sentry":
        sendToSentry(metric);
        break;
      case "custom":
        config.onMetric?.(metric);
        break;
    }
  });
}

// =============================================================================
// Custom Metrics
// =============================================================================

/**
 * Track custom performance metric
 */
export function trackCustomMetric(
  name: string,
  value: number,
  metadata?: Record<string, any>,
) {
  const metric: WebVitalMetric = {
    name,
    value,
    rating: "good", // Custom metrics don't have automatic ratings
    delta: value,
    id: `custom-${Date.now()}`,
    navigationType: "navigate",
    entries: [], // Custom metrics don't have associated performance entries
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
  };

  handleMetric(metric, {
    ...DEFAULT_CONFIG,
    ...metadata,
  });
}

/**
 * Measure time to interactive for custom features
 */
export function measureTimeToInteractive(
  featureName: string,
  startTime: number,
) {
  const duration = performance.now() - startTime;
  trackCustomMetric(`tti_${featureName}`, duration, {
    category: "Time to Interactive",
  });
}

/**
 * Track API call performance
 */
export function trackAPICall(
  endpoint: string,
  duration: number,
  success: boolean,
) {
  trackCustomMetric(`api_${success ? "success" : "error"}`, duration, {
    category: "API Performance",
    endpoint,
  });
}

/**
 * Track component render time
 */
export function trackComponentRender(
  componentName: string,
  renderTime: number,
) {
  trackCustomMetric(`render_${componentName}`, renderTime, {
    category: "Component Performance",
  });
}

// =============================================================================
// React Hook for Page Views
// =============================================================================

/**
 * Track page navigation performance
 */
export function useWebVitalsTracking(config: Partial<WebVitalsConfig> = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };

    if (!fullConfig.enabled) {
      return;
    }

    const route =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Track Core Web Vitals with route context
    const metricHandler = (metric: Metric) => {
      const enrichedMetric: WebVitalMetric = {
        ...metric,
        route,
        category: "Core Web Vitals",
      };
      handleMetric(enrichedMetric, fullConfig);
    };

    // Register all Core Web Vitals
    onCLS(metricHandler);
    onINP(metricHandler);
    onFCP(metricHandler);
    onLCP(metricHandler);
    onTTFB(metricHandler);
  }, [pathname, searchParams, config]);
}

// =============================================================================
// Performance Observer for Custom Metrics
// =============================================================================

/**
 * Start observing custom performance metrics
 */
export function startPerformanceObserver() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
    return;
  }

  // Observe long tasks (> 50ms)
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          trackCustomMetric("long_task", entry.duration, {
            category: "Performance Issues",
            name: entry.name,
          });
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });
  } catch (e) {
    // Long task API not supported
  }

  // Observe layout shifts
  try {
    const layoutShiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Layout shift entries have hadRecentInput and value properties
        const layoutShiftEntry = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
        };
        if (layoutShiftEntry.hadRecentInput) continue;

        trackCustomMetric("layout_shift", layoutShiftEntry.value ?? 0, {
          category: "Layout Stability",
        });
      }
    });
    layoutShiftObserver.observe({ entryTypes: ["layout-shift"] });
  } catch (e) {
    // Layout shift API not supported
  }

  // Observe resource loading
  try {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // @ts-ignore - Resource timing
        const resource = entry as PerformanceResourceTiming;

        // Track slow resources (> 1s)
        if (resource.duration > 1000) {
          trackCustomMetric("slow_resource", resource.duration, {
            category: "Resource Loading",
            url: resource.name,
            type: resource.initiatorType,
          });
        }
      }
    });
    resourceObserver.observe({ entryTypes: ["resource"] });
  } catch (e) {
    // Resource timing not supported
  }
}

// =============================================================================
// Component Export
// =============================================================================

/**
 * Web Vitals Tracker Component
 * Add this to your root layout to enable automatic tracking
 */
export function WebVitalsTracker(props: Partial<WebVitalsConfig> = {}) {
  useWebVitalsTracking(props);

  useEffect(() => {
    startPerformanceObserver();
  }, []);

  return null;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get current navigation timing metrics
 */
export function getNavigationMetrics() {
  if (typeof window === "undefined" || !window.performance) {
    return null;
  }

  const timing = performance.timing;
  const navigation = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming;

  if (!navigation) {
    return null;
  }

  return {
    // Time to first byte
    ttfb: navigation.responseStart - navigation.requestStart,

    // DOM parsing
    domParsing: navigation.domContentLoadedEventEnd - navigation.responseEnd,

    // Resource loading
    resourceLoading:
      navigation.loadEventStart - navigation.domContentLoadedEventEnd,

    // Total page load
    totalLoad: navigation.loadEventEnd - navigation.fetchStart,

    // DNS lookup
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,

    // TCP connection
    tcp: navigation.connectEnd - navigation.connectStart,

    // Server response
    response: navigation.responseEnd - navigation.requestStart,
  };
}

/**
 * Export metrics for external use
 */
export function getPerformanceReport() {
  const metrics = getNavigationMetrics();

  return {
    navigation: metrics,
    memory: "memory" in performance ? (performance as any).memory : null,
    timestamp: Date.now(),
  };
}
