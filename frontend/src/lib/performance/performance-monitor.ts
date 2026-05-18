/**
 * Performance Monitoring Utilities
 *
 * Comprehensive performance monitoring and profiling tools.
 */

import { logger } from "@/lib/logger";

// =============================================================================
// Types
// =============================================================================

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ResourceTiming {
  name: string;
  size: number;
  duration: number;
  type: string;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
}

export interface PerformanceReport {
  marks: PerformanceMark[];
  resources: ResourceTiming[];
  memory?: MemoryInfo;
  navigationTiming?: PerformanceNavigationTiming;
  webVitals?: {
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  };
}

// =============================================================================
// Performance Markers
// =============================================================================

/**
 * Start a performance measurement
 */
export function startMeasure(
  name: string,
  metadata?: Record<string, any>,
): void {
  if (typeof performance === "undefined") return;

  try {
    performance.mark(`${name}-start`);
    if (metadata) {
      // Store metadata for later retrieval
      const key = `perf-metadata-${name}`;
      sessionStorage.setItem(key, JSON.stringify(metadata));
    }
  } catch (error) {
    logger.warn("[Performance] Failed to start measure:", { name, error });
  }
}

/**
 * End a performance measurement and log duration
 */
export function endMeasure(name: string, report = false): number | null {
  if (typeof performance === "undefined") return null;

  try {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    performance.mark(endMark);
    performance.measure(name, startMark, endMark);

    const measure = performance.getEntriesByName(name, "measure")[0];
    const duration = measure?.duration || 0;

    if (report) {
      const metadata = getMetadata(name);
      logger.info(`[Performance] ${name}:`, {
        duration: `${duration.toFixed(2)}ms`,
        ...metadata,
      });
    }

    // Cleanup
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(name);
    clearMetadata(name);

    return duration;
  } catch (error) {
    logger.warn("[Performance] Failed to end measure:", { name, error });
    return null;
  }
}

/**
 * Measure a function execution time
 */
export async function measureFunction<T>(
  name: string,
  fn: () => T | Promise<T>,
  report = false,
): Promise<T> {
  startMeasure(name);
  try {
    const result = await fn();
    endMeasure(name, report);
    return result;
  } catch (error) {
    endMeasure(name, report);
    throw error;
  }
}

/**
 * Decorator to measure function execution
 */
export function measure(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const measureName = `${target.constructor.name}.${propertyKey}`;
    startMeasure(measureName);

    try {
      const result = await originalMethod.apply(this, args);
      const duration = endMeasure(measureName);

      if (duration && duration > 100) {
        // Log slow operations (>100ms)
        logger.warn(`[Performance] Slow operation detected:`, {
          method: measureName,
          duration: `${duration.toFixed(2)}ms`,
        });
      }

      return result;
    } catch (error) {
      endMeasure(measureName);
      throw error;
    }
  };

  return descriptor;
}

// =============================================================================
// Resource Monitoring
// =============================================================================

/**
 * Get resource timing data
 */
export function getResourceTimings(): ResourceTiming[] {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return [];
  }

  try {
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];

    return resources.map((resource) => ({
      name: resource.name,
      size: resource.transferSize || 0,
      duration: resource.duration,
      type: getResourceType(resource.name),
    }));
  } catch (error) {
    logger.warn("[Performance] Failed to get resource timings:", {
      error: String(error),
    });
    return [];
  }
}

/**
 * Get total resource size by type
 */
export function getResourceSizeByType(): Record<string, number> {
  const resources = getResourceTimings();

  return resources.reduce(
    (acc, resource) => {
      acc[resource.type] = (acc[resource.type] || 0) + resource.size;
      return acc;
    },
    {} as Record<string, number>,
  );
}

/**
 * Get slow resources (>1s load time)
 */
export function getSlowResources(threshold = 1000): ResourceTiming[] {
  return getResourceTimings().filter(
    (resource) => resource.duration > threshold,
  );
}

// =============================================================================
// Memory Monitoring
// =============================================================================

/**
 * Get current memory usage (Chrome only)
 */
export function getMemoryInfo(): MemoryInfo | null {
  if (typeof performance === "undefined" || !(performance as any).memory) {
    return null;
  }

  try {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  } catch (error) {
    logger.warn("[Performance] Failed to get memory info:", {
      error: String(error),
    });
    return null;
  }
}

/**
 * Monitor memory usage and warn if high
 */
export function monitorMemory(threshold = 90): void {
  const info = getMemoryInfo();
  if (!info) return;

  if (info.usagePercent > threshold) {
    logger.warn("[Performance] High memory usage detected:", {
      usage: `${info.usagePercent.toFixed(2)}%`,
      used: `${(info.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${(info.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
    });
  }
}

// =============================================================================
// Navigation Timing
// =============================================================================

/**
 * Get navigation timing data
 */
export function getNavigationTiming(): PerformanceNavigationTiming | null {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return null;
  }

  try {
    const [navigation] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    return navigation || null;
  } catch (error) {
    logger.warn("[Performance] Failed to get navigation timing:", {
      error: String(error),
    });
    return null;
  }
}

/**
 * Calculate page load metrics
 */
export function getPageLoadMetrics() {
  const navigation = getNavigationTiming();
  if (!navigation) return null;

  return {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    ttfb: navigation.responseStart - navigation.requestStart,
    download: navigation.responseEnd - navigation.responseStart,
    domParsing: navigation.domInteractive - navigation.responseEnd,
    domContentLoaded:
      navigation.domContentLoadedEventEnd -
      navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    total: navigation.loadEventEnd - navigation.fetchStart,
  };
}

// =============================================================================
// Performance Report
// =============================================================================

/**
 * Generate comprehensive performance report
 */
export function generatePerformanceReport(): PerformanceReport {
  const marks = getPerformanceMarks();
  const resources = getResourceTimings();
  const memory = getMemoryInfo();
  const navigationTiming = getNavigationTiming();

  return {
    marks,
    resources,
    memory: memory || undefined,
    navigationTiming: navigationTiming || undefined,
  };
}

/**
 * Log performance report to console
 */
export function logPerformanceReport(): void {
  const report = generatePerformanceReport();

  console.group("[Performance Report]");

  // Marks
  if (report.marks.length > 0) {
    console.table(report.marks);
  }

  // Resources by type
  const resourcesByType = getResourceSizeByType();
  console.log("Resources by type:", {
    ...Object.entries(resourcesByType).reduce(
      (acc, [type, size]) => {
        acc[type] = `${(size / 1024).toFixed(2)}KB`;
        return acc;
      },
      {} as Record<string, string>,
    ),
  });

  // Memory
  if (report.memory) {
    console.log("Memory:", {
      used: `${(report.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      total: `${(report.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      limit: `${(report.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
      usage: `${report.memory.usagePercent.toFixed(2)}%`,
    });
  }

  // Page load metrics
  const pageMetrics = getPageLoadMetrics();
  if (pageMetrics) {
    console.log("Page load metrics:", {
      ...Object.entries(pageMetrics).reduce(
        (acc, [key, value]) => {
          acc[key] = `${value.toFixed(2)}ms`;
          return acc;
        },
        {} as Record<string, string>,
      ),
    });
  }

  console.groupEnd();
}

// =============================================================================
// Performance Budgets
// =============================================================================

export interface PerformanceBudget {
  js: number; // KB
  css: number; // KB
  images: number; // KB
  fonts: number; // KB
  total: number; // KB
}

export const DEFAULT_BUDGET: PerformanceBudget = {
  js: 300, // 300KB
  css: 50, // 50KB
  images: 500, // 500KB
  fonts: 100, // 100KB
  total: 1000, // 1MB
};

/**
 * Check if current page exceeds performance budget
 */
export function checkPerformanceBudget(budget = DEFAULT_BUDGET): boolean {
  const resourcesByType = getResourceSizeByType();

  const actual = {
    js: (resourcesByType["script"] || 0) / 1024,
    css: (resourcesByType["stylesheet"] || 0) / 1024,
    images: (resourcesByType["image"] || 0) / 1024,
    fonts: (resourcesByType["font"] || 0) / 1024,
    total:
      Object.values(resourcesByType).reduce((sum, size) => sum + size, 0) /
      1024,
  };

  const violations: string[] = [];

  Object.entries(budget).forEach(([type, limit]) => {
    const actualSize = actual[type as keyof typeof actual];
    if (actualSize > limit) {
      violations.push(`${type}: ${actualSize.toFixed(2)}KB > ${limit}KB`);
    }
  });

  if (violations.length > 0) {
    logger.warn("[Performance] Budget violations:", { violations });
    return false;
  }

  return true;
}

// =============================================================================
// Utilities
// =============================================================================

function getResourceType(url: string): string {
  if (url.match(/\.(js|mjs)$/)) return "script";
  if (url.match(/\.css$/)) return "stylesheet";
  if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) return "image";
  if (url.match(/\.(woff|woff2|ttf|otf|eot)$/)) return "font";
  if (url.match(/\.(json|xml)$/)) return "data";
  return "other";
}

function getPerformanceMarks(): PerformanceMark[] {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return [];
  }

  try {
    const marks = performance.getEntriesByType("mark") as PerformanceMark[];
    return marks;
  } catch (error) {
    return [];
  }
}

function getMetadata(name: string): Record<string, any> | undefined {
  try {
    const key = `perf-metadata-${name}`;
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : undefined;
  } catch {
    return undefined;
  }
}

function clearMetadata(name: string): void {
  try {
    const key = `perf-metadata-${name}`;
    sessionStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

// =============================================================================
// Auto-monitoring
// =============================================================================

/**
 * Start automatic performance monitoring
 */
export function startPerformanceMonitoring(options: {
  memoryThreshold?: number;
  reportInterval?: number;
  budgetCheck?: boolean;
}): () => void {
  const {
    memoryThreshold = 90,
    reportInterval = 60000,
    budgetCheck = true,
  } = options;

  // Monitor memory every 10 seconds
  const memoryInterval = setInterval(() => {
    monitorMemory(memoryThreshold);
  }, 10000);

  // Generate report every minute
  const reportIntervalId = setInterval(() => {
    if (process.env.NODE_ENV === "development") {
      logPerformanceReport();
    }
  }, reportInterval);

  // Check budget on page load
  if (budgetCheck && typeof window !== "undefined") {
    window.addEventListener("load", () => {
      setTimeout(() => checkPerformanceBudget(), 1000);
    });
  }

  // Return cleanup function
  return () => {
    clearInterval(memoryInterval);
    clearInterval(reportIntervalId);
  };
}

// =============================================================================
// Exports
// =============================================================================

export default {
  // Measurement
  startMeasure,
  endMeasure,
  measureFunction,
  measure,

  // Resources
  getResourceTimings,
  getResourceSizeByType,
  getSlowResources,

  // Memory
  getMemoryInfo,
  monitorMemory,

  // Navigation
  getNavigationTiming,
  getPageLoadMetrics,

  // Reporting
  generatePerformanceReport,
  logPerformanceReport,

  // Budgets
  checkPerformanceBudget,
  DEFAULT_BUDGET,

  // Auto-monitoring
  startPerformanceMonitoring,
};
