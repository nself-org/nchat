/**
 * Analytics Hook
 *
 * React hook for using analytics in components
 */

"use client";

import { useEffect, useCallback } from "react";
import { analytics } from "@/lib/analytics/events";
import { analyticsPrivacy } from "@/lib/analytics/privacy";
import type {
  MessageSentEvent,
  SearchEvent,
  ChannelEvent,
  CallEvent,
  FileEvent,
  ErrorEvent,
} from "@/lib/analytics/types";

export function useAnalytics() {
  // Track screen view on mount
  useEffect(() => {
    const path = window.location.pathname;
    const screenName = path.split("/").filter(Boolean).join("_") || "home";
    analytics.trackScreenView(screenName);
  }, []);

  // Event tracking functions
  const trackMessageSent = useCallback((event: MessageSentEvent) => {
    return analytics.trackMessageSent(event);
  }, []);

  const trackSearch = useCallback((event: SearchEvent) => {
    return analytics.trackSearch(event);
  }, []);

  const trackChannelCreated = useCallback((event: ChannelEvent) => {
    return analytics.trackChannelCreated(event);
  }, []);

  const trackChannelJoined = useCallback((event: ChannelEvent) => {
    return analytics.trackChannelJoined(event);
  }, []);

  const trackFileUploaded = useCallback((event: FileEvent) => {
    return analytics.trackFileUploaded(event);
  }, []);

  const trackCallStarted = useCallback((event: CallEvent) => {
    return analytics.trackCallStarted(event);
  }, []);

  const trackError = useCallback((event: ErrorEvent) => {
    return analytics.trackError(event);
  }, []);

  const trackScreenView = useCallback(
    (screenName: string, screenClass?: string) => {
      return analytics.trackScreenView(screenName, screenClass);
    },
    [],
  );

  // Settings
  const isEnabled = useCallback(() => {
    return analytics.isEnabled();
  }, []);

  const getConsent = useCallback(() => {
    return analyticsPrivacy.getConsent();
  }, []);

  const setConsent = useCallback((consent: any) => {
    return analyticsPrivacy.setConsent(consent);
  }, []);

  return {
    // Event tracking
    trackMessageSent,
    trackSearch,
    trackChannelCreated,
    trackChannelJoined,
    trackFileUploaded,
    trackCallStarted,
    trackError,
    trackScreenView,

    // Settings
    isEnabled,
    getConsent,
    setConsent,

    // Session data
    sessionData: analytics.getSessionData(),
    platform: analytics.getPlatform(),
  };
}

/**
 * Hook for tracking performance
 */
export function usePerformanceTracking(screenName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      analytics.trackScreenLoadTime(screenName, duration);
    };
  }, [screenName]);
}

/**
 * Hook for tracking errors
 */
export function useErrorTracking() {
  useEffect(() => {
    const handleError = (event: globalThis.ErrorEvent) => {
      analytics.trackError({
        error_type: event.error?.name || "Error",
        error_message: event.message,
        error_stack: event.error?.stack,
        fatal: false,
        context: window.location.pathname,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackError({
        error_type: "UnhandledRejection",
        error_message: String(event.reason),
        fatal: false,
        context: window.location.pathname,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);
}
