/**
 * Performance optimization utilities
 *
 * Collection of utilities for optimizing React application performance
 */

import * as React from "react";
import {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  DependencyList,
  useState,
} from "react";

// ============================================================================
// Debounce & Throttle
// ============================================================================

/**
 * Debounce function - delays execution until after wait time has elapsed
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per wait time
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

/**
 * React hook for debounced values
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

/**
 * React hook for throttled values
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRun.current >= delay) {
          setThrottledValue(value);
          lastRun.current = Date.now();
        }
      },
      delay - (Date.now() - lastRun.current),
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

// ============================================================================
// Memoization Helpers
// ============================================================================

/**
 * Deep comparison for useMemo/useCallback dependencies
 */
export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T } | undefined>(undefined);

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (typeof a !== "object" || typeof b !== "object") return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Expensive Computation Helpers
// ============================================================================

/**
 * Memoize expensive computations with cache
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);

    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    return result;
  }) as T;
}

/**
 * Break expensive computation into chunks to avoid blocking UI
 */
export async function processInChunks<T, R>(
  items: T[],
  processItem: (item: T) => R,
  chunkSize: number = 10,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    // Process chunk
    const chunkResults = chunk.map(processItem);
    results.push(...chunkResults);

    // Yield to browser
    if (i + chunkSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return results;
}

// ============================================================================
// Render Optimization
// ============================================================================

/**
 * Hook to track if component is mounted
 * Useful for preventing state updates on unmounted components
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * Hook to track previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook to detect value changes
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  const previousProps = useRef<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        // REMOVED: console.log('[why-did-you-update]', name, changedProps)
      }
    }

    previousProps.current = props;
  });
}

// ============================================================================
// Image Optimization
// ============================================================================

/**
 * Lazy load images with Intersection Observer
 */
export function useLazyImage(src: string): {
  imageSrc: string | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const imgRef = useRef<HTMLImageElement | undefined>(undefined);

  useEffect(() => {
    const img = new Image();
    imgRef.current = img;

    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setError(new Error("Failed to load image"));
      setIsLoading(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { imageSrc, isLoading, error };
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920],
): string {
  return widths.map((width) => `${baseUrl}?w=${width} ${width}w`).join(", ");
}

// ============================================================================
// Request Animation Frame
// ============================================================================

/**
 * Hook for using requestAnimationFrame
 */
export function useAnimationFrame(callback: (deltaTime: number) => void) {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);

  const animate = useCallback(
    (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }

      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [callback],
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
}

// ============================================================================
// Battery & Network Optimization
// ============================================================================

/**
 * Check if device is on battery power
 */
export async function isOnBattery(): Promise<boolean> {
  if ("getBattery" in navigator) {
    const battery = await (navigator as any).getBattery();
    return !battery.charging;
  }
  return false;
}

/**
 * Get network information
 */
export function getNetworkInfo(): {
  effectiveType: string;
  saveData: boolean;
  downlink: number;
} | null {
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType || "unknown",
      saveData: connection.saveData || false,
      downlink: connection.downlink || 0,
    };
  }
  return null;
}

/**
 * Hook to adapt quality based on network
 */
export function useAdaptiveQuality(): "low" | "medium" | "high" {
  const [quality, setQuality] = useState<"low" | "medium" | "high">("high");

  useEffect(() => {
    const network = getNetworkInfo();

    if (!network) {
      setQuality("high");
      return;
    }

    if (
      network.saveData ||
      network.effectiveType === "slow-2g" ||
      network.effectiveType === "2g"
    ) {
      setQuality("low");
    } else if (network.effectiveType === "3g") {
      setQuality("medium");
    } else {
      setQuality("high");
    }
  }, []);

  return quality;
}

export default {
  debounce,
  throttle,
  memoize,
  processInChunks,
};
