"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

export type Orientation = "portrait" | "landscape";

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ViewportState {
  width: number;
  height: number;
  orientation: Orientation;
  safeArea: SafeAreaInsets;
  visualViewport: {
    width: number;
    height: number;
    offsetTop: number;
    offsetLeft: number;
    scale: number;
  };
}

export interface ViewportBreakpoints {
  xs: boolean; // < 480px
  sm: boolean; // >= 480px
  md: boolean; // >= 768px
  lg: boolean; // >= 1024px
  xl: boolean; // >= 1280px
  xxl: boolean; // >= 1536px
}

// ============================================================================
// Constants
// ============================================================================

const BREAKPOINTS = {
  xs: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Comprehensive viewport hook with safe area support
 * Handles visual viewport for keyboard and zoom detection
 */
export function useViewport(): ViewportState & ViewportBreakpoints {
  const [state, setState] = useState<ViewportState>(() => getViewportState());

  const updateViewport = useCallback(() => {
    setState(getViewportState());
  }, []);

  useEffect(() => {
    // Update on resize
    window.addEventListener("resize", updateViewport);

    // Update on orientation change
    window.addEventListener("orientationchange", () => {
      // Delay to allow viewport to update
      setTimeout(updateViewport, 100);
    });

    // Listen to visual viewport changes (keyboard, zoom)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateViewport);
      window.visualViewport.addEventListener("scroll", updateViewport);
    }

    // Initial update after mount
    updateViewport();

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);

      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateViewport);
        window.visualViewport.removeEventListener("scroll", updateViewport);
      }
    };
  }, [updateViewport]);

  // Calculate breakpoints
  const breakpoints: ViewportBreakpoints = useMemo(
    () => ({
      xs: state.width < BREAKPOINTS.sm,
      sm: state.width >= BREAKPOINTS.sm,
      md: state.width >= BREAKPOINTS.md,
      lg: state.width >= BREAKPOINTS.lg,
      xl: state.width >= BREAKPOINTS.xl,
      xxl: state.width >= BREAKPOINTS.xxl,
    }),
    [state.width],
  );

  return {
    ...state,
    ...breakpoints,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getViewportState(): ViewportState {
  // Server-side rendering check
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      orientation: "portrait",
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      visualViewport: {
        width: 0,
        height: 0,
        offsetTop: 0,
        offsetLeft: 0,
        scale: 1,
      },
    };
  }

  const { innerWidth, innerHeight, visualViewport } = window;

  return {
    width: innerWidth,
    height: innerHeight,
    orientation: innerHeight > innerWidth ? "portrait" : "landscape",
    safeArea: getSafeAreaInsets(),
    visualViewport: {
      width: visualViewport?.width ?? innerWidth,
      height: visualViewport?.height ?? innerHeight,
      offsetTop: visualViewport?.offsetTop ?? 0,
      offsetLeft: visualViewport?.offsetLeft ?? 0,
      scale: visualViewport?.scale ?? 1,
    },
  };
}

function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);

  // Try to get safe area insets from CSS environment variables
  const getInset = (property: string): number => {
    const value = style.getPropertyValue(property);
    return parseInt(value) || 0;
  };

  return {
    top: getInset("--sat") || getInset("env(safe-area-inset-top)") || 0,
    right: getInset("--sar") || getInset("env(safe-area-inset-right)") || 0,
    bottom: getInset("--sab") || getInset("env(safe-area-inset-bottom)") || 0,
    left: getInset("--sal") || getInset("env(safe-area-inset-left)") || 0,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for safe area insets only
 */
export function useSafeArea(): SafeAreaInsets {
  const [safeArea, setSafeArea] = useState<SafeAreaInsets>(() =>
    getSafeAreaInsets(),
  );

  useEffect(() => {
    const update = () => setSafeArea(getSafeAreaInsets());

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", () => setTimeout(update, 100));

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return safeArea;
}

/**
 * Hook for visual viewport (keyboard detection)
 */
export function useVisualViewport() {
  const [viewport, setViewport] = useState(() => ({
    width:
      typeof window !== "undefined"
        ? (window.visualViewport?.width ?? window.innerWidth)
        : 0,
    height:
      typeof window !== "undefined"
        ? (window.visualViewport?.height ?? window.innerHeight)
        : 0,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
  }));

  useEffect(() => {
    const vv = window.visualViewport;

    const update = () => {
      setViewport({
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
        offsetTop: vv?.offsetTop ?? 0,
        offsetLeft: vv?.offsetLeft ?? 0,
        scale: vv?.scale ?? 1,
      });
    };

    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    }

    window.addEventListener("resize", update);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      }
      window.removeEventListener("resize", update);
    };
  }, []);

  // Detect if keyboard is likely visible
  const keyboardVisible = useMemo(() => {
    if (typeof window === "undefined") return false;
    const heightDiff = window.innerHeight - viewport.height;
    return heightDiff > 150; // Keyboard typically > 150px
  }, [viewport.height]);

  const keyboardHeight = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return Math.max(0, window.innerHeight - viewport.height);
  }, [viewport.height]);

  return {
    ...viewport,
    keyboardVisible,
    keyboardHeight,
  };
}

/**
 * Hook for orientation only
 */
export function useOrientation(): Orientation {
  const [orientation, setOrientation] = useState<Orientation>(() =>
    typeof window !== "undefined" && window.innerHeight > window.innerWidth
      ? "portrait"
      : "landscape",
  );

  useEffect(() => {
    const update = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? "portrait" : "landscape",
      );
    };

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", () => setTimeout(update, 100));

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return orientation;
}

/**
 * Hook for responsive breakpoint
 */
export function useBreakpoint() {
  const { width } = useViewport();

  return useMemo(() => {
    if (width >= BREAKPOINTS.xxl) return "xxl";
    if (width >= BREAKPOINTS.xl) return "xl";
    if (width >= BREAKPOINTS.lg) return "lg";
    if (width >= BREAKPOINTS.md) return "md";
    if (width >= BREAKPOINTS.sm) return "sm";
    return "xs";
  }, [width]);
}

/**
 * Hook to check if viewport matches a specific breakpoint
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}
