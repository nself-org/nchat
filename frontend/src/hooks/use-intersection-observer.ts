"use client";

import { useState, useEffect, useRef, RefObject, useCallback } from "react";

interface UseInViewOptions {
  /** Root element for intersection (default: viewport) */
  root?: Element | null;
  /** Margin around root (default: '0px') */
  rootMargin?: string;
  /** Threshold(s) at which to trigger (default: 0) */
  threshold?: number | number[];
  /** Only trigger once when element comes into view */
  triggerOnce?: boolean;
  /** Skip observation (useful for conditional rendering) */
  skip?: boolean;
}

interface UseInViewResult {
  /** Ref to attach to the target element */
  ref: RefObject<HTMLElement | null>;
  /** Whether the element is currently in view */
  inView: boolean;
  /** The IntersectionObserverEntry (null if not observed yet) */
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook for detecting when an element is in the viewport
 * Useful for lazy loading, infinite scroll, animations
 * @param options - IntersectionObserver options
 * @returns { ref, inView, entry }
 */
export function useInView(options: UseInViewOptions = {}): UseInViewResult {
  const {
    root = null,
    rootMargin = "0px",
    threshold = 0,
    triggerOnce = false,
    skip = false,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (skip) return;
    if (triggerOnce && hasTriggered.current) return;

    const element = ref.current;
    if (!element) return;

    // Check for IntersectionObserver support
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: assume always in view
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [observerEntry] = entries;
        setEntry(observerEntry);
        setInView(observerEntry.isIntersecting);

        if (observerEntry.isIntersecting && triggerOnce) {
          hasTriggered.current = true;
          observer.unobserve(element);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [root, rootMargin, threshold, triggerOnce, skip]);

  return { ref, inView, entry };
}

/**
 * Hook for infinite scroll functionality
 * Calls loadMore when sentinel element comes into view
 * @param loadMore - Function to load more items
 * @param options - Additional options
 * @returns { ref, loading }
 */
export function useInfiniteScroll(
  loadMore: () => void | Promise<void>,
  options: {
    /** Threshold for triggering (default: 0.1) */
    threshold?: number;
    /** Whether more items can be loaded */
    hasMore?: boolean;
    /** Whether currently loading */
    loading?: boolean;
    /** Root margin for earlier triggering (default: '100px') */
    rootMargin?: string;
  } = {},
): {
  ref: RefObject<HTMLElement | null>;
  loading: boolean;
} {
  const {
    threshold = 0.1,
    hasMore = true,
    loading = false,
    rootMargin = "100px",
  } = options;

  const [isLoading, setIsLoading] = useState(loading);
  const ref = useRef<HTMLElement>(null);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      await loadMore();
    } finally {
      setIsLoading(false);
    }
  }, [loadMore, isLoading, hasMore]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !hasMore || isLoading) return;

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [handleLoadMore, hasMore, isLoading, rootMargin, threshold]);

  return { ref, loading: isLoading };
}
