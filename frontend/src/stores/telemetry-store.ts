/**
 * Telemetry Store
 *
 * Zustand store for managing analytics consent, event queue,
 * debug mode, and telemetry state.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  ConsentCategory,
  ConsentState,
  getDefaultConsentState,
  CONSENT_VERSION,
} from "@/lib/analytics/privacy-filter";
import { TrackedEvent } from "@/lib/analytics/analytics-client";

// ============================================================================
// Types
// ============================================================================

export interface TelemetryState {
  // Consent State
  consent: ConsentState;
  consentBannerDismissed: boolean;
  consentBannerShown: boolean;

  // Debug Mode
  debugMode: boolean;
  debugPanelOpen: boolean;

  // Event Queue (for display in debug panel)
  recentEvents: TrackedEvent[];
  maxRecentEvents: number;

  // Tracking State
  trackingEnabled: boolean;
  sessionId: string | null;
  userId: string | null;
  anonymousId: string | null;

  // Metrics
  totalEventsTracked: number;
  eventsTrackedThisSession: number;
  lastEventTimestamp: number | null;

  // Error Tracking
  errorCount: number;
  lastError: { message: string; timestamp: number } | null;

  // Performance
  performanceMetricsEnabled: boolean;
  coreWebVitalsEnabled: boolean;

  // Status
  initialized: boolean;
  isLoading: boolean;
}

export interface TelemetryActions {
  // Initialization
  initialize: () => void;
  reset: () => void;

  // Consent Management
  setConsent: (category: ConsentCategory, enabled: boolean) => void;
  setFullConsent: (consent: ConsentState) => void;
  acceptAllConsent: () => void;
  rejectAllConsent: () => void;
  dismissConsentBanner: () => void;
  showConsentBanner: () => void;

  // Debug Mode
  setDebugMode: (enabled: boolean) => void;
  toggleDebugMode: () => void;
  setDebugPanelOpen: (open: boolean) => void;
  toggleDebugPanel: () => void;

  // Event Management
  addRecentEvent: (event: TrackedEvent) => void;
  clearRecentEvents: () => void;

  // User Identification
  setUserId: (userId: string | null) => void;
  setAnonymousId: (anonymousId: string | null) => void;
  setSessionId: (sessionId: string | null) => void;

  // Tracking Control
  setTrackingEnabled: (enabled: boolean) => void;
  incrementEventCount: () => void;

  // Error Tracking
  recordError: (message: string) => void;
  clearError: () => void;

  // Performance
  setPerformanceMetricsEnabled: (enabled: boolean) => void;
  setCoreWebVitalsEnabled: (enabled: boolean) => void;

  // Helpers
  hasConsent: (category: ConsentCategory) => boolean;
  canTrack: () => boolean;
}

export type TelemetryStore = TelemetryState & TelemetryActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: TelemetryState = {
  // Consent State
  consent: getDefaultConsentState(),
  consentBannerDismissed: false,
  consentBannerShown: false,

  // Debug Mode
  debugMode: false,
  debugPanelOpen: false,

  // Event Queue
  recentEvents: [],
  maxRecentEvents: 50,

  // Tracking State
  trackingEnabled: true,
  sessionId: null,
  userId: null,
  anonymousId: null,

  // Metrics
  totalEventsTracked: 0,
  eventsTrackedThisSession: 0,
  lastEventTimestamp: null,

  // Error Tracking
  errorCount: 0,
  lastError: null,

  // Performance
  performanceMetricsEnabled: true,
  coreWebVitalsEnabled: true,

  // Status
  initialized: false,
  isLoading: false,
};

// ============================================================================
// Store
// ============================================================================

export const useTelemetryStore = create<TelemetryStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ====================================================================
        // Initialization
        // ====================================================================

        initialize: () =>
          set(
            (state) => {
              if (state.initialized) {
                return;
              }

              // Generate anonymous ID if not present
              if (!state.anonymousId) {
                const timestamp = Date.now().toString(36);
                const random = Math.random().toString(36).substring(2, 11);
                state.anonymousId = `anon_${timestamp}${random}`;
              }

              // Check if consent needs to be shown
              if (
                !state.consentBannerDismissed &&
                !state.consent[ConsentCategory.ANALYTICS]
              ) {
                state.consentBannerShown = true;
              }

              state.initialized = true;
              state.eventsTrackedThisSession = 0;
            },
            false,
            "telemetry/initialize",
          ),

        reset: () =>
          set(
            () => ({
              ...initialState,
              consent: getDefaultConsentState(),
            }),
            false,
            "telemetry/reset",
          ),

        // ====================================================================
        // Consent Management
        // ====================================================================

        setConsent: (category, enabled) =>
          set(
            (state) => {
              // Essential cannot be disabled
              if (category === ConsentCategory.ESSENTIAL) {
                return;
              }

              state.consent[category] = enabled;
              state.consent.timestamp = Date.now();
              state.consent.version = CONSENT_VERSION;

              // Disable tracking if analytics consent removed
              if (category === ConsentCategory.ANALYTICS && !enabled) {
                state.recentEvents = [];
              }
            },
            false,
            `telemetry/setConsent/${category}`,
          ),

        setFullConsent: (consent) =>
          set(
            (state) => {
              state.consent = { ...consent, timestamp: Date.now() };
            },
            false,
            "telemetry/setFullConsent",
          ),

        acceptAllConsent: () =>
          set(
            (state) => {
              state.consent = {
                [ConsentCategory.ESSENTIAL]: true,
                [ConsentCategory.ANALYTICS]: true,
                [ConsentCategory.FUNCTIONAL]: true,
                [ConsentCategory.MARKETING]: true,
                timestamp: Date.now(),
                version: CONSENT_VERSION,
              };
              state.consentBannerDismissed = true;
              state.consentBannerShown = false;
            },
            false,
            "telemetry/acceptAllConsent",
          ),

        rejectAllConsent: () =>
          set(
            (state) => {
              state.consent = {
                [ConsentCategory.ESSENTIAL]: true,
                [ConsentCategory.ANALYTICS]: false,
                [ConsentCategory.FUNCTIONAL]: false,
                [ConsentCategory.MARKETING]: false,
                timestamp: Date.now(),
                version: CONSENT_VERSION,
              };
              state.consentBannerDismissed = true;
              state.consentBannerShown = false;
              state.recentEvents = [];
            },
            false,
            "telemetry/rejectAllConsent",
          ),

        dismissConsentBanner: () =>
          set(
            (state) => {
              state.consentBannerDismissed = true;
              state.consentBannerShown = false;
            },
            false,
            "telemetry/dismissConsentBanner",
          ),

        showConsentBanner: () =>
          set(
            (state) => {
              state.consentBannerShown = true;
            },
            false,
            "telemetry/showConsentBanner",
          ),

        // ====================================================================
        // Debug Mode
        // ====================================================================

        setDebugMode: (enabled) =>
          set(
            (state) => {
              state.debugMode = enabled;
              if (!enabled) {
                state.debugPanelOpen = false;
              }
            },
            false,
            "telemetry/setDebugMode",
          ),

        toggleDebugMode: () =>
          set(
            (state) => {
              state.debugMode = !state.debugMode;
              if (!state.debugMode) {
                state.debugPanelOpen = false;
              }
            },
            false,
            "telemetry/toggleDebugMode",
          ),

        setDebugPanelOpen: (open) =>
          set(
            (state) => {
              state.debugPanelOpen = open && state.debugMode;
            },
            false,
            "telemetry/setDebugPanelOpen",
          ),

        toggleDebugPanel: () =>
          set(
            (state) => {
              if (state.debugMode) {
                state.debugPanelOpen = !state.debugPanelOpen;
              }
            },
            false,
            "telemetry/toggleDebugPanel",
          ),

        // ====================================================================
        // Event Management
        // ====================================================================

        addRecentEvent: (event) =>
          set(
            (state) => {
              state.recentEvents.unshift(event);
              if (state.recentEvents.length > state.maxRecentEvents) {
                state.recentEvents = state.recentEvents.slice(
                  0,
                  state.maxRecentEvents,
                );
              }
              state.lastEventTimestamp = Date.now();
            },
            false,
            "telemetry/addRecentEvent",
          ),

        clearRecentEvents: () =>
          set(
            (state) => {
              state.recentEvents = [];
            },
            false,
            "telemetry/clearRecentEvents",
          ),

        // ====================================================================
        // User Identification
        // ====================================================================

        setUserId: (userId) =>
          set(
            (state) => {
              state.userId = userId;
            },
            false,
            "telemetry/setUserId",
          ),

        setAnonymousId: (anonymousId) =>
          set(
            (state) => {
              state.anonymousId = anonymousId;
            },
            false,
            "telemetry/setAnonymousId",
          ),

        setSessionId: (sessionId) =>
          set(
            (state) => {
              state.sessionId = sessionId;
              if (sessionId) {
                state.eventsTrackedThisSession = 0;
              }
            },
            false,
            "telemetry/setSessionId",
          ),

        // ====================================================================
        // Tracking Control
        // ====================================================================

        setTrackingEnabled: (enabled) =>
          set(
            (state) => {
              state.trackingEnabled = enabled;
            },
            false,
            "telemetry/setTrackingEnabled",
          ),

        incrementEventCount: () =>
          set(
            (state) => {
              state.totalEventsTracked++;
              state.eventsTrackedThisSession++;
            },
            false,
            "telemetry/incrementEventCount",
          ),

        // ====================================================================
        // Error Tracking
        // ====================================================================

        recordError: (message) =>
          set(
            (state) => {
              state.errorCount++;
              state.lastError = { message, timestamp: Date.now() };
            },
            false,
            "telemetry/recordError",
          ),

        clearError: () =>
          set(
            (state) => {
              state.lastError = null;
            },
            false,
            "telemetry/clearError",
          ),

        // ====================================================================
        // Performance
        // ====================================================================

        setPerformanceMetricsEnabled: (enabled) =>
          set(
            (state) => {
              state.performanceMetricsEnabled = enabled;
            },
            false,
            "telemetry/setPerformanceMetricsEnabled",
          ),

        setCoreWebVitalsEnabled: (enabled) =>
          set(
            (state) => {
              state.coreWebVitalsEnabled = enabled;
            },
            false,
            "telemetry/setCoreWebVitalsEnabled",
          ),

        // ====================================================================
        // Helpers
        // ====================================================================

        hasConsent: (category) => {
          const state = get();
          if (category === ConsentCategory.ESSENTIAL) {
            return true;
          }
          return state.consent[category] === true;
        },

        canTrack: () => {
          const state = get();
          return (
            state.trackingEnabled &&
            state.initialized &&
            state.consent[ConsentCategory.ANALYTICS] === true
          );
        },
      })),
      {
        name: "nchat-telemetry-store",
        partialize: (state) => ({
          consent: state.consent,
          consentBannerDismissed: state.consentBannerDismissed,
          anonymousId: state.anonymousId,
          totalEventsTracked: state.totalEventsTracked,
          debugMode: state.debugMode,
          performanceMetricsEnabled: state.performanceMetricsEnabled,
          coreWebVitalsEnabled: state.coreWebVitalsEnabled,
        }),
      },
    ),
    { name: "telemetry-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectConsent = (state: TelemetryStore): ConsentState =>
  state.consent;

export const selectHasAnalyticsConsent = (state: TelemetryStore): boolean =>
  state.consent[ConsentCategory.ANALYTICS] === true;

export const selectHasFunctionalConsent = (state: TelemetryStore): boolean =>
  state.consent[ConsentCategory.FUNCTIONAL] === true;

export const selectHasMarketingConsent = (state: TelemetryStore): boolean =>
  state.consent[ConsentCategory.MARKETING] === true;

export const selectShouldShowConsentBanner = (state: TelemetryStore): boolean =>
  !state.consentBannerDismissed && state.consentBannerShown;

export const selectIsDebugMode = (state: TelemetryStore): boolean =>
  state.debugMode;

export const selectIsDebugPanelOpen = (state: TelemetryStore): boolean =>
  state.debugMode && state.debugPanelOpen;

export const selectRecentEvents = (state: TelemetryStore): TrackedEvent[] =>
  state.recentEvents;

export const selectEventStats = (state: TelemetryStore) => ({
  totalTracked: state.totalEventsTracked,
  sessionTracked: state.eventsTrackedThisSession,
  lastTimestamp: state.lastEventTimestamp,
});

export const selectUserInfo = (state: TelemetryStore) => ({
  userId: state.userId,
  anonymousId: state.anonymousId,
  sessionId: state.sessionId,
});

export const selectCanTrack = (state: TelemetryStore): boolean =>
  state.trackingEnabled &&
  state.initialized &&
  state.consent[ConsentCategory.ANALYTICS] === true;
