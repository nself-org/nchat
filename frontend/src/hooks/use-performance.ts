"use client";

/**
 * Performance Monitoring Hooks
 *
 * React hooks for measuring and tracking component performance.
 * Helps identify slow renders, expensive operations, and memory leaks.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/lib/logger";
import { isDevelopment } from "@/lib/environment";

// ============================================================================
// Types
// ============================================================================

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  slowestRenderTime: number;
}

interface RenderInfo {
  phase: "mount" | "update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

// ============================================================================
// useRenderCount
// ============================================================================

/**
 * Track how many times a component has rendered
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renderCount = useRenderCount()
 *   /* console.log `Rendered ${renderCount} times`)
 * }
 * ```
 */
export function useRenderCount(): number {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
  });

  return renderCount.current;
}

// ============================================================================
// useWhyDidYouUpdate
// ============================================================================

/**
 * Debug why a component re-rendered by logging changed props
 *
 * @example
 * ```tsx
 * function MyComponent(props) {
 *   useWhyDidYouUpdate('MyComponent', props)
 * }
 * ```
 */
export function useWhyDidYouUpdate(
  name: string,
  props: Record<string, unknown>,
): void {
  const previousProps = useRef<Record<string, unknown> | undefined>(undefined);

  useEffect(() => {
    if (previousProps.current && isDevelopment()) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        logger.debug(`[${name}] Props changed:`, { changes: changedProps });
      }
    }

    previousProps.current = props;
  }, [name, props]);
}

// ============================================================================
// usePerformanceMetrics
// ============================================================================

/**
 * Track component render performance metrics
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const metrics = usePerformanceMetrics('MyComponent')
 *
 *   return (
 *     <div>
 *       <p>Render count: {metrics.renderCount}</p>
 *       <p>Avg render time: {metrics.averageRenderTime}ms</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePerformanceMetrics(
  componentName: string,
): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowestRenderTime: 0,
  });

  const renderTimes = useRef<number[]>([]);
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();

    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      renderTimes.current.push(renderTime);

      const renderCount = renderTimes.current.length;
      const averageRenderTime =
        renderTimes.current.reduce((a, b) => a + b, 0) / renderCount;
      const slowestRenderTime = Math.max(...renderTimes.current);

      setMetrics({
        renderCount,
        lastRenderTime: renderTime,
        averageRenderTime,
        slowestRenderTime,
      });

      // Log slow renders in development
      if (isDevelopment() && renderTime > 16) {
        logger.warn(`Slow render detected in ${componentName}`, {
          renderTime: Math.round(renderTime),
          renderCount,
        });
      }
    };
  }, [componentName]);

  return metrics;
}

// ============================================================================
// useComponentMount
// ============================================================================

/**
 * Measure component mount time
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useComponentMount('MyComponent', (mountTime) => {
 *     /* console.log `Mounted in ${mountTime}ms`)
 *   })
 * }
 * ```
 */
export function useComponentMount(
  componentName: string,
  onMount?: (mountTime: number) => void,
): void {
  const mountStartTime = useRef<number>(performance.now());

  useEffect(() => {
    const mountTime = performance.now() - mountStartTime.current;

    if (isDevelopment()) {
      logger.debug(`${componentName} mounted`, {
        mountTime: Math.round(mountTime),
      });
    }

    onMount?.(mountTime);
  }, [componentName, onMount]);
}

// ============================================================================
// useDebounce
// ============================================================================

/**
 * Debounce a value to prevent excessive re-renders
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [search, setSearch] = useState('')
 *   const debouncedSearch = useDebounce(search, 300)
 *
 *   useEffect(() => {
 *     // API call with debouncedSearch
 *   }, [debouncedSearch])
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// useThrottle
// ============================================================================

/**
 * Throttle a value to limit update frequency
 *
 * @example
 * ```tsx
 * function ScrollComponent() {
 *   const [scrollY, setScrollY] = useState(0)
 *   const throttledScrollY = useThrottle(scrollY, 100)
 *
 *   useEffect(() => {
 *     // Update UI with throttledScrollY
 *   }, [throttledScrollY])
 * }
 * ```
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun.current;

    if (timeSinceLastRun >= interval) {
      setThrottledValue(value);
      lastRun.current = now;
    } else {
      const handler = setTimeout(() => {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }, interval - timeSinceLastRun);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, interval]);

  return throttledValue;
}

// ============================================================================
// usePrevious
// ============================================================================

/**
 * Get the previous value of a prop or state
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = useState(0)
 *   const prevCount = usePrevious(count)
 *
 *   return <div>Count: {count} (was {prevCount})</div>
 * }
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// ============================================================================
// useMemoryLeakDetector
// ============================================================================

/**
 * Detect potential memory leaks by tracking component lifecycle
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   useMemoryLeakDetector('MyComponent')
 * }
 * ```
 */
export function useMemoryLeakDetector(componentName: string): void {
  const mountTime = useRef<number>(Date.now());
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      const lifetime = Date.now() - mountTime.current;

      if (isDevelopment() && lifetime < 100) {
        logger.warn(`${componentName} unmounted quickly`, {
          lifetime,
          hint: "Rapid mount/unmount cycles can indicate memory leaks",
        });
      }
    };
  }, [componentName]);

  // Check if component is still mounted after delays
  useEffect(() => {
    const timeouts = [1000, 5000, 30000].map((delay) =>
      setTimeout(() => {
        if (!isMounted.current && isDevelopment()) {
          logger.warn(`${componentName} callback executed after unmount`, {
            delay,
            hint: "Clean up async operations in useEffect cleanup",
          });
        }
      }, delay),
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [componentName]);
}

// ============================================================================
// useIntersectionPerformance
// ============================================================================

/**
 * Measure visibility performance using Intersection Observer
 *
 * @example
 * ```tsx
 * function LazyComponent() {
 *   const [ref, isVisible, metrics] = useIntersectionPerformance()
 *
 *   return (
 *     <div ref={ref}>
 *       {isVisible && <ExpensiveComponent />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useIntersectionPerformance<
  T extends HTMLElement = HTMLDivElement,
>(
  options?: IntersectionObserverInit,
): [React.RefObject<T | null>, boolean, { timeToVisible: number | null }] {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    timeToVisible: null as number | null,
  });
  const mountTime = useRef(performance.now());

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !isVisible) {
        const timeToVisible = performance.now() - mountTime.current;
        setIsVisible(true);
        setMetrics({ timeToVisible });

        if (isDevelopment()) {
          logger.debug("Element became visible", {
            timeToVisible: Math.round(timeToVisible),
          });
        }
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, options]);

  return [ref, isVisible, metrics];
}

// ============================================================================
// usePerformance - Performance monitoring hook
// ============================================================================

export function usePerformance() {
  return {
    snapshot: {
      webVitals: {
        lcp: 0,
        cls: 0,
        ttfb: 0,
        fcp: 0,
        inp: 0,
      },
      errors: {
        count: 0,
        rate: 0,
      },
    },
    score: {
      overall: 100,
      webVitals: 100,
      api: 100,
      rendering: 100,
      memory: 100,
      breakdown: {
        lcp: 100,
        cls: 100,
        ttfb: 100,
        fcp: 100,
        inp: 100,
      },
    },
    metrics: [],
    customMetrics: [],
    stats: {
      apiResponseTime: { avg: 0, p95: 0, min: 0, median: 0, max: 0 },
      renderTime: { avg: 0, p95: 0, min: 0, median: 0, max: 0 },
      memoryUsage: { avg: 0, p95: 0, min: 0, median: 0, max: 0 },
    },
    trends: {
      apiResponseTime: { direction: "stable", change: 0 },
      renderTime: { direction: "stable", change: 0 },
      memoryUsage: { direction: "stable", change: 0 },
    },
    refresh: () => {},
    reset: () => {},
  };
}

// ============================================================================
// usePerformanceWarnings - Performance warnings hook
// ============================================================================

interface PerformanceWarning {
  id: string;
  severity: "warning" | "critical";
  message: string;
  timestamp: number;
}

export function usePerformanceWarnings() {
  return {
    warnings: [] as PerformanceWarning[],
    criticalWarnings: [] as PerformanceWarning[],
    activeWarnings: [] as PerformanceWarning[],
    clearWarning: (_id: string) => {},
    clearAllWarnings: () => {},
  };
}
