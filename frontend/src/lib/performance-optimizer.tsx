/**
 * Frontend Performance Optimizations
 *
 * Provides React components and utilities for improved frontend performance
 * including virtual scrolling, lazy loading, code splitting, and memoization.
 */

import React, { Suspense, lazy, memo, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";

import { logger } from "@/lib/logger";

// ============================================================================
// Dynamic Import with Loading States
// ============================================================================

export interface DynamicImportOptions {
  loading?: React.ComponentType;
  ssr?: boolean;
  suspense?: boolean;
}

/**
 * Create a dynamically imported component with loading state
 */
export function createDynamicComponent<P = {}>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: DynamicImportOptions = {},
): React.ComponentType<P> {
  return dynamic(importFn, {
    loading: options.loading
      ? () => React.createElement(options.loading!)
      : undefined,
    ssr: options.ssr ?? false,
  });
}

// ============================================================================
// Virtual Scrolling Components
// ============================================================================

export interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemSize: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

/**
 * Virtual list component for rendering large lists efficiently
 */
export function VirtualList<T>({
  items,
  height,
  itemSize,
  renderItem,
  overscan = 5,
  className,
  onEndReached,
  endReachedThreshold = 0.8,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: typeof itemSize === "function" ? itemSize : () => itemSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle end reached
  React.useEffect(() => {
    if (!onEndReached) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    const threshold = items.length * endReachedThreshold;
    if (lastItem.index >= threshold) {
      onEndReached();
    }
  }, [virtualItems, items.length, onEndReached, endReachedThreshold]);

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: `${height}px`,
        overflow: "auto",
        contain: "strict",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Message List Virtual Scroller (Optimized for Chat)
// ============================================================================

export interface Message {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  [key: string]: any;
}

export interface VirtualMessageListProps {
  messages: Message[];
  height: number;
  renderMessage: (message: Message, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  estimatedMessageHeight?: number;
}

export const VirtualMessageList = memo(function VirtualMessageList({
  messages,
  height,
  renderMessage,
  onLoadMore,
  isLoading = false,
  hasMore = false,
  estimatedMessageHeight = 80,
}: VirtualMessageListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedMessageHeight,
    overscan: 5,
    // Reverse for chat (newest at bottom)
    scrollPaddingEnd: 16,
  });

  const handleScroll = useCallback(() => {
    if (!parentRef.current || !hasMore || isLoading) return;

    const { scrollTop } = parentRef.current;
    if (scrollTop < 100 && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  React.useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div
      ref={parentRef}
      style={{
        height: `${height}px`,
        overflow: "auto",
        contain: "strict",
        display: "flex",
        flexDirection: "column-reverse",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={messages[virtualRow.index]?.id || virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderMessage(messages[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
      {isLoading && (
        <div className="py-4 text-center">
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Lazy Image Loading
// ============================================================================

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E',
  className,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "50px" },
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageSrc(placeholder);
    onError?.();
  }, [placeholder, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
      style={{
        opacity: isLoaded ? 1 : 0.5,
        transition: "opacity 0.3s",
      }}
      {...props}
    />
  );
});

// ============================================================================
// Memoization Utilities
// ============================================================================

/**
 * Deep comparison for useMemo and useCallback
 */
export function useDeepMemo<T>(factory: () => T, deps: any[]): T {
  const ref = React.useRef<{ deps: any[]; value: T } | undefined>(undefined);

  if (
    !ref.current ||
    !deps.every((dep, i) => Object.is(dep, ref.current!.deps[i]))
  ) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
}

/**
 * Debounced callback hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}

/**
 * Throttled callback hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const lastRun = React.useRef(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay],
  );
}

// ============================================================================
// Intersection Observer for Infinite Scroll
// ============================================================================

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  callback: () => void,
  options: IntersectionObserverInit = {},
) {
  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, callback, options]);
}

// ============================================================================
// Code Splitting Boundaries
// ============================================================================

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 text-center">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

export interface PerformanceMetrics {
  renderTime: number;
  updateTime: number;
  totalRenders: number;
}

export function usePerformanceMonitor(
  componentName: string,
): PerformanceMetrics {
  const metrics = React.useRef<PerformanceMetrics>({
    renderTime: 0,
    updateTime: 0,
    totalRenders: 0,
  });

  const startTime = React.useRef(performance.now());

  React.useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;

    metrics.current.renderTime = renderTime;
    metrics.current.totalRenders++;

    if (process.env.NODE_ENV === "development") {
      // REMOVED: console.log(`[Performance] ${componentName} render time: ${renderTime.toFixed(2)}ms`)
    }

    startTime.current = performance.now();
  });

  return metrics.current;
}

// ============================================================================
// Bundle Size Optimization
// ============================================================================

/**
 * Lazy load component with retry logic
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
): React.LazyExoticComponent<T> {
  const retryImport = async (): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (error) {
      if (retries > 0) {
        logger.warn(`Retry loading component (${retries} attempts left)`);
        return retryImport();
      }
      throw error;
    }
  };
  return lazy(retryImport);
}

// ============================================================================
// Preload Resources
// ============================================================================

export function preloadComponent(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
): void {
  importFn();
}

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// ============================================================================
// React.memo with Custom Comparison
// ============================================================================

export function memoWithShallowCompare<P extends object>(
  Component: React.ComponentType<P>,
): React.MemoExoticComponent<React.ComponentType<P>> {
  return memo(Component, (prevProps, nextProps) => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);

    if (prevKeys.length !== nextKeys.length) return false;

    return prevKeys.every((key) =>
      Object.is(prevProps[key as keyof P], nextProps[key as keyof P]),
    );
  });
}

// ============================================================================
// Service Worker for Caching
// ============================================================================

export function registerServiceWorker(swUrl: string = "/sw.js"): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.reject("Service workers not supported");
  }

  return navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // REMOVED: console.log('[SW] Registered:', registration)
    })
    .catch((error) => {
      logger.error("[SW] Registration failed:", error);
      throw error;
    });
}

export function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(false);
  }

  return navigator.serviceWorker.ready.then((registration) =>
    registration.unregister(),
  );
}
