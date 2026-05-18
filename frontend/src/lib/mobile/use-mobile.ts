"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isPWA: boolean;
  hasNotch: boolean;
  devicePixelRatio: number;
}

export interface MobileDetectionOptions {
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  onChange?: (device: DeviceInfo) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MOBILE_BREAKPOINT = 768;
const DEFAULT_TABLET_BREAKPOINT = 1024;

// ============================================================================
// Hook
// ============================================================================

/**
 * Comprehensive mobile device detection hook
 * Detects device type, OS, browser, and capabilities
 */
export function useMobile(options: MobileDetectionOptions = {}): DeviceInfo {
  const {
    mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
    tabletBreakpoint = DEFAULT_TABLET_BREAKPOINT,
    onChange,
  } = options;

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() =>
    getDeviceInfo(mobileBreakpoint, tabletBreakpoint),
  );

  const updateDeviceInfo = useCallback(() => {
    const newInfo = getDeviceInfo(mobileBreakpoint, tabletBreakpoint);
    setDeviceInfo((prev) => {
      // Only update if something changed
      if (JSON.stringify(prev) !== JSON.stringify(newInfo)) {
        onChange?.(newInfo);
        return newInfo;
      }
      return prev;
    });
  }, [mobileBreakpoint, tabletBreakpoint, onChange]);

  useEffect(() => {
    // Initial update
    updateDeviceInfo();

    // Listen for resize events
    const handleResize = () => {
      updateDeviceInfo();
    };

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Delay to allow viewport to update
      setTimeout(updateDeviceInfo, 100);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    // Media query listeners for more accurate detection
    const mediaQueryMobile = window.matchMedia(
      `(max-width: ${mobileBreakpoint - 1}px)`,
    );
    const mediaQueryTablet = window.matchMedia(
      `(min-width: ${mobileBreakpoint}px) and (max-width: ${tabletBreakpoint - 1}px)`,
    );

    const handleMediaChange = () => updateDeviceInfo();

    // Use addEventListener for compatibility
    if (mediaQueryMobile.addEventListener) {
      mediaQueryMobile.addEventListener("change", handleMediaChange);
      mediaQueryTablet.addEventListener("change", handleMediaChange);
    } else {
      // Fallback for older browsers
      mediaQueryMobile.addListener(handleMediaChange);
      mediaQueryTablet.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);

      if (mediaQueryMobile.removeEventListener) {
        mediaQueryMobile.removeEventListener("change", handleMediaChange);
        mediaQueryTablet.removeEventListener("change", handleMediaChange);
      } else {
        mediaQueryMobile.removeListener(handleMediaChange);
        mediaQueryTablet.removeListener(handleMediaChange);
      }
    };
  }, [mobileBreakpoint, tabletBreakpoint, updateDeviceInfo]);

  return deviceInfo;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDeviceInfo(
  mobileBreakpoint: number,
  tabletBreakpoint: number,
): DeviceInfo {
  // Server-side rendering check
  if (typeof window === "undefined") {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isPWA: false,
      hasNotch: false,
      devicePixelRatio: 1,
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  // Device type detection
  const isMobile = width < mobileBreakpoint;
  const isTablet = width >= mobileBreakpoint && width < tabletBreakpoint;
  const isDesktop = width >= tabletBreakpoint;

  // Touch detection
  const isTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - msMaxTouchPoints for IE
    navigator.msMaxTouchPoints > 0;

  // OS detection
  const isIOS =
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPad Pro
  const isAndroid = /android/.test(userAgent);

  // Browser detection
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edge/.test(userAgent);

  // PWA detection
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-ignore - iOS Safari standalone mode
    window.navigator.standalone === true;

  // Notch detection (iPhone X and later)
  const hasNotch = detectNotch();

  // Device pixel ratio
  const devicePixelRatio = window.devicePixelRatio || 1;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isPWA,
    hasNotch,
    devicePixelRatio,
  };
}

function detectNotch(): boolean {
  if (typeof window === "undefined") return false;

  // Check for iOS devices with notch using safe area insets
  const root = document.documentElement;
  const safeAreaTop =
    getComputedStyle(root).getPropertyValue("--sat") ||
    getComputedStyle(root).getPropertyValue("env(safe-area-inset-top)");

  if (safeAreaTop && parseInt(safeAreaTop) > 20) {
    return true;
  }

  // Fallback: check for iPhone X and later dimensions
  const { innerWidth, innerHeight } = window;
  const aspectRatio = innerHeight / innerWidth;

  // iPhone X/XS/11 Pro: 812x375 (2.165)
  // iPhone XR/11/12/13/14: various sizes but similar ratio
  // iPhone 12/13/14 Pro Max: 926x428 (2.163)
  if (aspectRatio > 2 && innerWidth < 500) {
    return true;
  }

  return false;
}

// ============================================================================
// Additional Utilities
// ============================================================================

/**
 * Check if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if device is in dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Check if device has coarse pointer (touch)
 */
export function hasCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Check if device can hover
 */
export function canHover(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(hover: hover)").matches;
}

/**
 * Get device orientation
 */
export function getOrientation(): "portrait" | "landscape" {
  if (typeof window === "undefined") return "portrait";
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

/**
 * Simple check if viewport is mobile-sized
 */
export function isMobileViewport(
  breakpoint = DEFAULT_MOBILE_BREAKPOINT,
): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoint;
}
