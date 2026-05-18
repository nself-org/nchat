"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

interface ScrollPosition {
  x: number;
  y: number;
}

/**
 * Hook for tracking window scroll position
 * @returns Current scroll position { x, y }
 */
export function useScrollPosition(): ScrollPosition {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      setScrollPosition({
        x: window.scrollX,
        y: window.scrollY,
      });
    };

    // Set initial position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return scrollPosition;
}

/**
 * Hook for scrolling to the bottom of an element
 * @param ref - React ref to the scrollable element
 * @returns scrollToBottom function
 */
export function useScrollToBottom<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
): {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
} {
  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (ref.current) {
        ref.current.scrollTo({
          top: ref.current.scrollHeight,
          behavior,
        });
      }
    },
    [ref],
  );

  return { scrollToBottom };
}

/**
 * Hook for detecting if an element is scrolled to the bottom
 * @param ref - React ref to the scrollable element
 * @param threshold - Pixel threshold from bottom to consider "at bottom" (default: 100)
 * @returns Boolean indicating if at bottom
 */
export function useIsAtBottom<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  threshold: number = 100,
): boolean {
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsAtBottom(distanceFromBottom <= threshold);
    };

    // Set initial value
    handleScroll();

    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [ref, threshold]);

  return isAtBottom;
}

/**
 * Combined hook for scroll management in chat-like interfaces
 * @param ref - React ref to the scrollable container
 * @param threshold - Pixel threshold for "at bottom" detection (default: 100)
 * @returns { isAtBottom, scrollToBottom, scrollPosition }
 */
export function useScrollManagement<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  threshold: number = 100,
): {
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  scrollPosition: { top: number; left: number };
} {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 });

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (ref.current) {
        ref.current.scrollTo({
          top: ref.current.scrollHeight,
          behavior,
        });
      }
    },
    [ref],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const { scrollTop, scrollLeft, scrollHeight, clientHeight } = element;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      setIsAtBottom(distanceFromBottom <= threshold);
      setScrollPosition({ top: scrollTop, left: scrollLeft });
    };

    // Set initial value
    handleScroll();

    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [ref, threshold]);

  return { isAtBottom, scrollToBottom, scrollPosition };
}
