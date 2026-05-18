"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useA11yStore } from "./a11y-store";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Hook to detect and respect user's reduced motion preference
 * Combines system preference with app setting
 */
export function useReducedMotion(): boolean {
  const [systemPreference, setSystemPreference] = useState<boolean>(false);
  const appSetting = useA11yStore((state) => state.reduceMotion);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    setSystemPreference(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Return true if either system or app preference requests reduced motion
  return systemPreference || appSetting;
}

/**
 * Hook to get animation properties based on reduced motion preference
 */
export function useMotionSafeAnimation<T extends Record<string, unknown>>(
  animation: T,
  fallback?: Partial<T>,
): T | Partial<T> {
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    if (reducedMotion && fallback) {
      return fallback;
    }
    if (reducedMotion) {
      // Return animation with instant timing
      return {
        ...animation,
        duration: 0,
        transition: { duration: 0 },
      } as T;
    }
    return animation;
  }, [reducedMotion, animation, fallback]);
}

/**
 * Hook to get CSS transition values based on reduced motion preference
 */
export interface MotionSafeTransition {
  transition: string;
  transitionDuration: string;
  animationDuration: string;
}

export function useMotionSafeTransition(
  normalDuration: number = 200,
  property: string = "all",
): MotionSafeTransition {
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    const duration = reducedMotion ? 0.01 : normalDuration;
    return {
      transition: `${property} ${duration}ms ease-in-out`,
      transitionDuration: `${duration}ms`,
      animationDuration: `${duration}ms`,
    };
  }, [reducedMotion, normalDuration, property]);
}

/**
 * Hook for conditionally running animations
 */
export function useAnimationControl() {
  const reducedMotion = useReducedMotion();

  const shouldAnimate = useCallback(
    (forceAnimate?: boolean): boolean => {
      if (forceAnimate !== undefined) {
        return forceAnimate && !reducedMotion;
      }
      return !reducedMotion;
    },
    [reducedMotion],
  );

  const getAnimationDuration = useCallback(
    (normalDuration: number): number => {
      return reducedMotion ? 0 : normalDuration;
    },
    [reducedMotion],
  );

  const getTransitionStyle = useCallback(
    (property: string, duration: number): React.CSSProperties => {
      return {
        transition: reducedMotion
          ? "none"
          : `${property} ${duration}ms ease-in-out`,
      };
    },
    [reducedMotion],
  );

  return {
    reducedMotion,
    shouldAnimate,
    getAnimationDuration,
    getTransitionStyle,
  };
}

/**
 * Simple boolean check for reduced motion (non-reactive)
 * Use in event handlers or effects, not for rendering
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * CSS class names for reduced motion
 */
export const motionClasses = {
  /** Disables transitions when reduced motion is preferred */
  safe: "motion-safe:transition-all motion-reduce:transition-none",
  /** Reduces animation duration when reduced motion is preferred */
  reduced: "motion-reduce:animate-none motion-reduce:transition-none",
  /** Only animate when motion is safe */
  animateSafe: "motion-safe:animate-pulse motion-reduce:animate-none",
} as const;

export default useReducedMotion;
