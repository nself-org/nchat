/**
 * useAnalytics Hook
 *
 * React hook for tracking analytics events, identifying users,
 * and managing analytics state.
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  getAnalyticsClient,
  AnalyticsClient,
  TrackedEvent,
  UserTraits,
  TrackOptions,
} from "@/lib/analytics/analytics-client";
import {
  AnalyticsEvent,
  EventPropertiesMap,
} from "@/lib/analytics/event-schema";
import {
  getSessionTracker,
  SessionTracker,
} from "@/lib/analytics/session-tracker";
import { useTelemetryStore } from "@/stores/telemetry-store";
import { ConsentCategory } from "@/lib/analytics/privacy-filter";

// ============================================================================
// Types
// ============================================================================

export interface UseAnalyticsOptions {
  debug?: boolean;
  trackPageViews?: boolean;
  autoInitialize?: boolean;
}

export interface UseAnalyticsReturn {
  // State
  isInitialized: boolean;
  hasConsent: boolean;
  debugMode: boolean;

  // Tracking
  track: <T extends AnalyticsEvent>(
    event: T,
    properties: T extends keyof EventPropertiesMap
      ? EventPropertiesMap[T]
      : Record<string, unknown>,
    options?: TrackOptions,
  ) => TrackedEvent | null;
  trackPageView: (path?: string, title?: string) => TrackedEvent | null;

  // User Identification
  identify: (userId: string, traits?: UserTraits) => void;
  setTraits: (traits: UserTraits) => void;
  reset: () => void;

  // Consent
  setConsent: (category: ConsentCategory, enabled: boolean) => void;
  acceptAll: () => void;
  rejectAll: () => void;

  // Debug
  setDebugMode: (enabled: boolean) => void;
  getRecentEvents: () => TrackedEvent[];
  clearEvents: () => void;

  // Session
  getSessionId: () => string | null;
  getSessionDuration: () => number;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAnalytics(
  options: UseAnalyticsOptions = {},
): UseAnalyticsReturn {
  const {
    debug = false,
    trackPageViews = true,
    autoInitialize = true,
  } = options;

  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);
  const clientRef = useRef<AnalyticsClient | null>(null);
  const sessionTrackerRef = useRef<SessionTracker | null>(null);

  // Store state
  const {
    initialized,
    consent,
    debugMode,
    recentEvents,
    initialize: initializeStore,
    setConsent: setStoreConsent,
    acceptAllConsent,
    rejectAllConsent,
    setDebugMode: setStoreDebugMode,
    addRecentEvent,
    clearRecentEvents,
    setUserId,
    setSessionId,
    incrementEventCount,
  } = useTelemetryStore();

  const hasAnalyticsConsent = consent[ConsentCategory.ANALYTICS] === true;

  // Initialize analytics
  useEffect(() => {
    if (!autoInitialize) {
      return;
    }

    initializeStore();

    // Get client and session tracker
    clientRef.current = getAnalyticsClient({
      debug: debug || debugMode,
      onEventTracked: (event) => {
        addRecentEvent(event);
        incrementEventCount();
      },
    });
    sessionTrackerRef.current = getSessionTracker();

    // Initialize client with consent
    clientRef.current.initialize(consent);

    // Start session tracking
    sessionTrackerRef.current.start();
    setSessionId(sessionTrackerRef.current.getSessionId());

    return () => {
      sessionTrackerRef.current?.stop();
    };
  }, [
    autoInitialize,
    debug,
    debugMode,
    consent,
    initializeStore,
    addRecentEvent,
    incrementEventCount,
    setSessionId,
  ]);

  // Track page views on route change
  useEffect(() => {
    if (!trackPageViews || !hasAnalyticsConsent || !initialized) {
      return;
    }

    if (pathname && pathname !== lastPathRef.current) {
      lastPathRef.current = pathname;
      const title = typeof document !== "undefined" ? document.title : "";
      sessionTrackerRef.current?.trackPageView(pathname, title);
    }
  }, [pathname, trackPageViews, hasAnalyticsConsent, initialized]);

  // Track event
  const track = useCallback(
    <T extends AnalyticsEvent>(
      event: T,
      properties: T extends keyof EventPropertiesMap
        ? EventPropertiesMap[T]
        : Record<string, unknown>,
      trackOptions?: TrackOptions,
    ): TrackedEvent | null => {
      if (!hasAnalyticsConsent || !clientRef.current) {
        return null;
      }
      return clientRef.current.track(event, properties, trackOptions);
    },
    [hasAnalyticsConsent],
  );

  // Track page view manually
  const trackPageView = useCallback(
    (path?: string, title?: string): TrackedEvent | null => {
      if (!hasAnalyticsConsent || !sessionTrackerRef.current) {
        return null;
      }

      const actualPath =
        path || (typeof window !== "undefined" ? window.location.pathname : "");
      const actualTitle =
        title || (typeof document !== "undefined" ? document.title : "");

      return sessionTrackerRef.current.trackPageView(actualPath, actualTitle);
    },
    [hasAnalyticsConsent],
  );

  // Identify user
  const identify = useCallback(
    (userId: string, traits?: UserTraits): void => {
      if (!hasAnalyticsConsent || !clientRef.current) {
        return;
      }
      clientRef.current.identify(userId, traits);
      setUserId(userId);
    },
    [hasAnalyticsConsent, setUserId],
  );

  // Set user traits
  const setTraits = useCallback(
    (traits: UserTraits): void => {
      if (!hasAnalyticsConsent || !clientRef.current) {
        return;
      }
      clientRef.current.setTraits(traits);
    },
    [hasAnalyticsConsent],
  );

  // Reset identity
  const resetIdentity = useCallback((): void => {
    clientRef.current?.reset();
    sessionTrackerRef.current?.reset();
    setUserId(null);
    setSessionId(sessionTrackerRef.current?.getSessionId() || null);
  }, [setUserId, setSessionId]);

  // Set consent for category
  const setConsent = useCallback(
    (category: ConsentCategory, enabled: boolean): void => {
      setStoreConsent(category, enabled);

      // Update client consent
      if (clientRef.current) {
        clientRef.current.setConsent({
          ...consent,
          [category]: enabled,
          timestamp: Date.now(),
        });
      }
    },
    [consent, setStoreConsent],
  );

  // Accept all consent
  const acceptAll = useCallback((): void => {
    acceptAllConsent();

    if (clientRef.current) {
      clientRef.current.setConsent({
        [ConsentCategory.ESSENTIAL]: true,
        [ConsentCategory.ANALYTICS]: true,
        [ConsentCategory.FUNCTIONAL]: true,
        [ConsentCategory.MARKETING]: true,
        timestamp: Date.now(),
        version: consent.version,
      });
    }
  }, [acceptAllConsent, consent.version]);

  // Reject all consent
  const rejectAll = useCallback((): void => {
    rejectAllConsent();

    if (clientRef.current) {
      clientRef.current.setConsent({
        [ConsentCategory.ESSENTIAL]: true,
        [ConsentCategory.ANALYTICS]: false,
        [ConsentCategory.FUNCTIONAL]: false,
        [ConsentCategory.MARKETING]: false,
        timestamp: Date.now(),
        version: consent.version,
      });
    }
  }, [rejectAllConsent, consent.version]);

  // Set debug mode
  const setDebugModeCallback = useCallback(
    (enabled: boolean): void => {
      setStoreDebugMode(enabled);
    },
    [setStoreDebugMode],
  );

  // Get recent events
  const getRecentEvents = useCallback((): TrackedEvent[] => {
    return recentEvents;
  }, [recentEvents]);

  // Clear events
  const clearEvents = useCallback((): void => {
    clearRecentEvents();
    clientRef.current?.clearQueue();
  }, [clearRecentEvents]);

  // Get session ID
  const getSessionId = useCallback((): string | null => {
    return sessionTrackerRef.current?.getSessionId() || null;
  }, []);

  // Get session duration
  const getSessionDuration = useCallback((): number => {
    return sessionTrackerRef.current?.getDuration() || 0;
  }, []);

  return {
    isInitialized: initialized,
    hasConsent: hasAnalyticsConsent,
    debugMode,
    track,
    trackPageView,
    identify,
    setTraits,
    reset: resetIdentity,
    setConsent,
    acceptAll,
    rejectAll,
    setDebugMode: setDebugModeCallback,
    getRecentEvents,
    clearEvents,
    getSessionId,
    getSessionDuration,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for tracking a specific event type
 */
export function useTrackEvent<T extends AnalyticsEvent>(
  event: T,
  defaultProperties?: Partial<
    T extends keyof EventPropertiesMap
      ? EventPropertiesMap[T]
      : Record<string, unknown>
  >,
) {
  const { track, hasConsent } = useAnalytics({ autoInitialize: false });

  return useCallback(
    (
      properties?: Partial<
        T extends keyof EventPropertiesMap
          ? EventPropertiesMap[T]
          : Record<string, unknown>
      >,
      options?: TrackOptions,
    ) => {
      if (!hasConsent) {
        return null;
      }
      return track(
        event,
        {
          ...defaultProperties,
          ...properties,
        } as T extends keyof EventPropertiesMap
          ? EventPropertiesMap[T]
          : Record<string, unknown>,
        options,
      );
    },
    [track, hasConsent, event, defaultProperties],
  );
}

/**
 * Hook for tracking page views
 */
export function usePageTracking() {
  const { trackPageView, isInitialized, hasConsent } = useAnalytics({
    trackPageViews: true,
  });
  const pathname = usePathname();
  const hasTrackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isInitialized || !hasConsent || !pathname) {
      return;
    }

    // Prevent duplicate tracking
    if (hasTrackedRef.current.has(pathname)) {
      return;
    }

    hasTrackedRef.current.add(pathname);
    trackPageView();
  }, [pathname, isInitialized, hasConsent, trackPageView]);
}

/**
 * Hook for user identification
 */
export function useIdentify() {
  const { identify, setTraits, reset, isInitialized, hasConsent } =
    useAnalytics({
      autoInitialize: false,
    });

  return {
    identify: useCallback(
      (userId: string, traits?: UserTraits) => {
        if (isInitialized && hasConsent) {
          identify(userId, traits);
        }
      },
      [identify, isInitialized, hasConsent],
    ),
    setTraits: useCallback(
      (traits: UserTraits) => {
        if (isInitialized && hasConsent) {
          setTraits(traits);
        }
      },
      [setTraits, isInitialized, hasConsent],
    ),
    reset,
  };
}
