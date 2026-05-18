/**
 * Telemetry Store Tests
 *
 * Tests for the telemetry Zustand store including consent management,
 * debug mode, event tracking, and user identification.
 */

import { act } from "@testing-library/react";
import {
  useTelemetryStore,
  selectConsent,
  selectHasAnalyticsConsent,
  selectHasFunctionalConsent,
  selectHasMarketingConsent,
  selectShouldShowConsentBanner,
  selectIsDebugMode,
  selectIsDebugPanelOpen,
  selectRecentEvents,
  selectEventStats,
  selectUserInfo,
  selectCanTrack,
} from "../telemetry-store";
import {
  ConsentCategory,
  CONSENT_VERSION,
} from "@/lib/analytics/privacy-filter";
import {
  TrackedEvent,
  BaseEventProperties,
} from "@/lib/analytics/analytics-client";
import { AnalyticsEvent, EventCategory } from "@/lib/analytics/event-schema";

// ============================================================================
// Test Helpers
// ============================================================================

const createMockEvent = (
  name: AnalyticsEvent = AnalyticsEvent.PAGE_VIEW,
): TrackedEvent => ({
  id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name,
  category: EventCategory.NAVIGATION,
  properties: { path: "/test", title: "Test" },
  base: {
    timestamp: Date.now(),
    sessionId: "session-123",
    platform: "web",
    appVersion: "1.0.0",
  } as BaseEventProperties,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Telemetry Store", () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useTelemetryStore.getState().reset();
    });
  });

  // ==========================================================================
  // Initial State Tests
  // ==========================================================================

  describe("Initial State", () => {
    it("should have default consent state", () => {
      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.ESSENTIAL]).toBe(true);
      expect(state.consent[ConsentCategory.ANALYTICS]).toBe(false);
      expect(state.consent[ConsentCategory.FUNCTIONAL]).toBe(false);
      expect(state.consent[ConsentCategory.MARKETING]).toBe(false);
    });

    it("should not be initialized by default", () => {
      const state = useTelemetryStore.getState();
      expect(state.initialized).toBe(false);
    });

    it("should have debug mode disabled by default", () => {
      const state = useTelemetryStore.getState();
      expect(state.debugMode).toBe(false);
      expect(state.debugPanelOpen).toBe(false);
    });

    it("should have empty recent events", () => {
      const state = useTelemetryStore.getState();
      expect(state.recentEvents).toHaveLength(0);
    });

    it("should have tracking enabled by default", () => {
      const state = useTelemetryStore.getState();
      expect(state.trackingEnabled).toBe(true);
    });

    it("should have zero event counts", () => {
      const state = useTelemetryStore.getState();
      expect(state.totalEventsTracked).toBe(0);
      expect(state.eventsTrackedThisSession).toBe(0);
    });
  });

  // ==========================================================================
  // Initialize Tests
  // ==========================================================================

  describe("initialize", () => {
    it("should set initialized to true", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
      });

      const state = useTelemetryStore.getState();
      expect(state.initialized).toBe(true);
    });

    it("should generate anonymous ID if not present", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
      });

      const state = useTelemetryStore.getState();
      expect(state.anonymousId).toMatch(/^anon_/);
    });

    it("should show consent banner if not dismissed", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
      });

      const state = useTelemetryStore.getState();
      expect(state.consentBannerShown).toBe(true);
    });

    it("should not initialize twice", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
        useTelemetryStore.getState().setSessionId("session-1");
        useTelemetryStore.getState().initialize();
      });

      const state = useTelemetryStore.getState();
      expect(state.sessionId).toBe("session-1");
    });

    it("should reset session event count", () => {
      act(() => {
        useTelemetryStore.getState().incrementEventCount();
        useTelemetryStore.getState().initialize();
      });

      const state = useTelemetryStore.getState();
      expect(state.eventsTrackedThisSession).toBe(0);
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("reset", () => {
    it("should reset all state", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
        useTelemetryStore.getState().setDebugMode(true);
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
        useTelemetryStore.getState().reset();
      });

      const state = useTelemetryStore.getState();
      expect(state.initialized).toBe(false);
      expect(state.debugMode).toBe(false);
      expect(state.recentEvents).toHaveLength(0);
    });

    it("should reset consent to default", () => {
      act(() => {
        useTelemetryStore.getState().acceptAllConsent();
        useTelemetryStore.getState().reset();
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.ANALYTICS]).toBe(false);
    });
  });

  // ==========================================================================
  // Consent Management Tests
  // ==========================================================================

  describe("setConsent", () => {
    it("should set analytics consent", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.ANALYTICS]).toBe(true);
    });

    it("should set functional consent", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.FUNCTIONAL, true);
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.FUNCTIONAL]).toBe(true);
    });

    it("should set marketing consent", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.MARKETING, true);
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.MARKETING]).toBe(true);
    });

    it("should not disable essential consent", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ESSENTIAL, false);
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.ESSENTIAL]).toBe(true);
    });

    it("should update timestamp", () => {
      const before = Date.now();
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
      });

      const state = useTelemetryStore.getState();
      expect(state.consent.timestamp).toBeGreaterThanOrEqual(before);
    });

    it("should clear recent events when analytics disabled", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, false);
      });

      const state = useTelemetryStore.getState();
      expect(state.recentEvents).toHaveLength(0);
    });
  });

  describe("setFullConsent", () => {
    it("should set entire consent state", () => {
      const newConsent = {
        [ConsentCategory.ESSENTIAL]: true,
        [ConsentCategory.ANALYTICS]: true,
        [ConsentCategory.FUNCTIONAL]: true,
        [ConsentCategory.MARKETING]: false,
        timestamp: Date.now(),
        version: CONSENT_VERSION,
      };

      act(() => {
        useTelemetryStore.getState().setFullConsent(newConsent);
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.ANALYTICS]).toBe(true);
      expect(state.consent[ConsentCategory.FUNCTIONAL]).toBe(true);
      expect(state.consent[ConsentCategory.MARKETING]).toBe(false);
    });
  });

  describe("acceptAllConsent", () => {
    it("should enable all consent categories", () => {
      act(() => {
        useTelemetryStore.getState().acceptAllConsent();
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.ESSENTIAL]).toBe(true);
      expect(state.consent[ConsentCategory.ANALYTICS]).toBe(true);
      expect(state.consent[ConsentCategory.FUNCTIONAL]).toBe(true);
      expect(state.consent[ConsentCategory.MARKETING]).toBe(true);
    });

    it("should dismiss consent banner", () => {
      act(() => {
        useTelemetryStore.getState().showConsentBanner();
        useTelemetryStore.getState().acceptAllConsent();
      });

      const state = useTelemetryStore.getState();
      expect(state.consentBannerDismissed).toBe(true);
      expect(state.consentBannerShown).toBe(false);
    });
  });

  describe("rejectAllConsent", () => {
    it("should disable all non-essential consent", () => {
      act(() => {
        useTelemetryStore.getState().acceptAllConsent();
        useTelemetryStore.getState().rejectAllConsent();
      });

      const state = useTelemetryStore.getState();
      expect(state.consent[ConsentCategory.ESSENTIAL]).toBe(true);
      expect(state.consent[ConsentCategory.ANALYTICS]).toBe(false);
      expect(state.consent[ConsentCategory.FUNCTIONAL]).toBe(false);
      expect(state.consent[ConsentCategory.MARKETING]).toBe(false);
    });

    it("should clear recent events", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
        useTelemetryStore.getState().rejectAllConsent();
      });

      const state = useTelemetryStore.getState();
      expect(state.recentEvents).toHaveLength(0);
    });
  });

  describe("dismissConsentBanner", () => {
    it("should dismiss and hide banner", () => {
      act(() => {
        useTelemetryStore.getState().showConsentBanner();
        useTelemetryStore.getState().dismissConsentBanner();
      });

      const state = useTelemetryStore.getState();
      expect(state.consentBannerDismissed).toBe(true);
      expect(state.consentBannerShown).toBe(false);
    });
  });

  describe("showConsentBanner", () => {
    it("should show banner", () => {
      act(() => {
        useTelemetryStore.getState().showConsentBanner();
      });

      const state = useTelemetryStore.getState();
      expect(state.consentBannerShown).toBe(true);
    });
  });

  // ==========================================================================
  // Debug Mode Tests
  // ==========================================================================

  describe("setDebugMode", () => {
    it("should enable debug mode", () => {
      act(() => {
        useTelemetryStore.getState().setDebugMode(true);
      });

      const state = useTelemetryStore.getState();
      expect(state.debugMode).toBe(true);
    });

    it("should close debug panel when disabling", () => {
      act(() => {
        useTelemetryStore.getState().setDebugMode(true);
        useTelemetryStore.getState().setDebugPanelOpen(true);
        useTelemetryStore.getState().setDebugMode(false);
      });

      const state = useTelemetryStore.getState();
      expect(state.debugMode).toBe(false);
      expect(state.debugPanelOpen).toBe(false);
    });
  });

  describe("toggleDebugMode", () => {
    it("should toggle debug mode", () => {
      act(() => {
        useTelemetryStore.getState().toggleDebugMode();
      });

      let state = useTelemetryStore.getState();
      expect(state.debugMode).toBe(true);

      act(() => {
        useTelemetryStore.getState().toggleDebugMode();
      });

      state = useTelemetryStore.getState();
      expect(state.debugMode).toBe(false);
    });
  });

  describe("setDebugPanelOpen", () => {
    it("should open debug panel when debug mode enabled", () => {
      act(() => {
        useTelemetryStore.getState().setDebugMode(true);
        useTelemetryStore.getState().setDebugPanelOpen(true);
      });

      const state = useTelemetryStore.getState();
      expect(state.debugPanelOpen).toBe(true);
    });

    it("should not open debug panel when debug mode disabled", () => {
      act(() => {
        useTelemetryStore.getState().setDebugPanelOpen(true);
      });

      const state = useTelemetryStore.getState();
      expect(state.debugPanelOpen).toBe(false);
    });
  });

  describe("toggleDebugPanel", () => {
    it("should toggle panel when debug mode enabled", () => {
      act(() => {
        useTelemetryStore.getState().setDebugMode(true);
        useTelemetryStore.getState().toggleDebugPanel();
      });

      let state = useTelemetryStore.getState();
      expect(state.debugPanelOpen).toBe(true);

      act(() => {
        useTelemetryStore.getState().toggleDebugPanel();
      });

      state = useTelemetryStore.getState();
      expect(state.debugPanelOpen).toBe(false);
    });

    it("should not toggle when debug mode disabled", () => {
      act(() => {
        useTelemetryStore.getState().toggleDebugPanel();
      });

      const state = useTelemetryStore.getState();
      expect(state.debugPanelOpen).toBe(false);
    });
  });

  // ==========================================================================
  // Event Management Tests
  // ==========================================================================

  describe("addRecentEvent", () => {
    it("should add event to recent events", () => {
      const event = createMockEvent();
      act(() => {
        useTelemetryStore.getState().addRecentEvent(event);
      });

      const state = useTelemetryStore.getState();
      expect(state.recentEvents).toHaveLength(1);
      expect(state.recentEvents[0]).toEqual(event);
    });

    it("should add events in reverse order", () => {
      act(() => {
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
      });

      const state = useTelemetryStore.getState();
      expect(state.recentEvents[0].base.timestamp).toBeGreaterThanOrEqual(
        state.recentEvents[1].base.timestamp,
      );
    });

    it("should limit to maxRecentEvents", () => {
      act(() => {
        for (let i = 0; i < 100; i++) {
          useTelemetryStore.getState().addRecentEvent(createMockEvent());
        }
      });

      const state = useTelemetryStore.getState();
      expect(state.recentEvents.length).toBeLessThanOrEqual(
        state.maxRecentEvents,
      );
    });

    it("should update lastEventTimestamp", () => {
      const before = Date.now();
      act(() => {
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
      });

      const state = useTelemetryStore.getState();
      expect(state.lastEventTimestamp).toBeGreaterThanOrEqual(before);
    });
  });

  describe("clearRecentEvents", () => {
    it("should clear all events", () => {
      act(() => {
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
        useTelemetryStore.getState().clearRecentEvents();
      });

      const state = useTelemetryStore.getState();
      expect(state.recentEvents).toHaveLength(0);
    });
  });

  // ==========================================================================
  // User Identification Tests
  // ==========================================================================

  describe("setUserId", () => {
    it("should set user ID", () => {
      act(() => {
        useTelemetryStore.getState().setUserId("user-123");
      });

      const state = useTelemetryStore.getState();
      expect(state.userId).toBe("user-123");
    });

    it("should clear user ID", () => {
      act(() => {
        useTelemetryStore.getState().setUserId("user-123");
        useTelemetryStore.getState().setUserId(null);
      });

      const state = useTelemetryStore.getState();
      expect(state.userId).toBeNull();
    });
  });

  describe("setAnonymousId", () => {
    it("should set anonymous ID", () => {
      act(() => {
        useTelemetryStore.getState().setAnonymousId("anon-123");
      });

      const state = useTelemetryStore.getState();
      expect(state.anonymousId).toBe("anon-123");
    });
  });

  describe("setSessionId", () => {
    it("should set session ID", () => {
      act(() => {
        useTelemetryStore.getState().setSessionId("session-123");
      });

      const state = useTelemetryStore.getState();
      expect(state.sessionId).toBe("session-123");
    });

    it("should reset session event count", () => {
      act(() => {
        useTelemetryStore.getState().incrementEventCount();
        useTelemetryStore.getState().incrementEventCount();
        useTelemetryStore.getState().setSessionId("new-session");
      });

      const state = useTelemetryStore.getState();
      expect(state.eventsTrackedThisSession).toBe(0);
    });
  });

  // ==========================================================================
  // Tracking Control Tests
  // ==========================================================================

  describe("setTrackingEnabled", () => {
    it("should enable tracking", () => {
      act(() => {
        useTelemetryStore.getState().setTrackingEnabled(false);
        useTelemetryStore.getState().setTrackingEnabled(true);
      });

      const state = useTelemetryStore.getState();
      expect(state.trackingEnabled).toBe(true);
    });

    it("should disable tracking", () => {
      act(() => {
        useTelemetryStore.getState().setTrackingEnabled(false);
      });

      const state = useTelemetryStore.getState();
      expect(state.trackingEnabled).toBe(false);
    });
  });

  describe("incrementEventCount", () => {
    it("should increment total count", () => {
      act(() => {
        useTelemetryStore.getState().incrementEventCount();
        useTelemetryStore.getState().incrementEventCount();
      });

      const state = useTelemetryStore.getState();
      expect(state.totalEventsTracked).toBe(2);
    });

    it("should increment session count", () => {
      act(() => {
        useTelemetryStore.getState().incrementEventCount();
        useTelemetryStore.getState().incrementEventCount();
      });

      const state = useTelemetryStore.getState();
      expect(state.eventsTrackedThisSession).toBe(2);
    });
  });

  // ==========================================================================
  // Error Tracking Tests
  // ==========================================================================

  describe("recordError", () => {
    it("should record error", () => {
      act(() => {
        useTelemetryStore.getState().recordError("Test error");
      });

      const state = useTelemetryStore.getState();
      expect(state.errorCount).toBe(1);
      expect(state.lastError?.message).toBe("Test error");
    });

    it("should update error count", () => {
      act(() => {
        useTelemetryStore.getState().recordError("Error 1");
        useTelemetryStore.getState().recordError("Error 2");
      });

      const state = useTelemetryStore.getState();
      expect(state.errorCount).toBe(2);
    });

    it("should update lastError", () => {
      act(() => {
        useTelemetryStore.getState().recordError("Error 1");
        useTelemetryStore.getState().recordError("Error 2");
      });

      const state = useTelemetryStore.getState();
      expect(state.lastError?.message).toBe("Error 2");
    });
  });

  describe("clearError", () => {
    it("should clear last error", () => {
      act(() => {
        useTelemetryStore.getState().recordError("Test error");
        useTelemetryStore.getState().clearError();
      });

      const state = useTelemetryStore.getState();
      expect(state.lastError).toBeNull();
    });
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe("setPerformanceMetricsEnabled", () => {
    it("should enable performance metrics", () => {
      act(() => {
        useTelemetryStore.getState().setPerformanceMetricsEnabled(true);
      });

      const state = useTelemetryStore.getState();
      expect(state.performanceMetricsEnabled).toBe(true);
    });

    it("should disable performance metrics", () => {
      act(() => {
        useTelemetryStore.getState().setPerformanceMetricsEnabled(false);
      });

      const state = useTelemetryStore.getState();
      expect(state.performanceMetricsEnabled).toBe(false);
    });
  });

  describe("setCoreWebVitalsEnabled", () => {
    it("should enable core web vitals", () => {
      act(() => {
        useTelemetryStore.getState().setCoreWebVitalsEnabled(true);
      });

      const state = useTelemetryStore.getState();
      expect(state.coreWebVitalsEnabled).toBe(true);
    });

    it("should disable core web vitals", () => {
      act(() => {
        useTelemetryStore.getState().setCoreWebVitalsEnabled(false);
      });

      const state = useTelemetryStore.getState();
      expect(state.coreWebVitalsEnabled).toBe(false);
    });
  });

  // ==========================================================================
  // Helper Tests
  // ==========================================================================

  describe("hasConsent", () => {
    it("should always return true for essential", () => {
      const result = useTelemetryStore
        .getState()
        .hasConsent(ConsentCategory.ESSENTIAL);
      expect(result).toBe(true);
    });

    it("should return consent value for non-essential", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
      });

      expect(
        useTelemetryStore.getState().hasConsent(ConsentCategory.ANALYTICS),
      ).toBe(true);
      expect(
        useTelemetryStore.getState().hasConsent(ConsentCategory.MARKETING),
      ).toBe(false);
    });
  });

  describe("canTrack", () => {
    it("should return false when not initialized", () => {
      act(() => {
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
      });

      const result = useTelemetryStore.getState().canTrack();
      expect(result).toBe(false);
    });

    it("should return false without analytics consent", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
      });

      const result = useTelemetryStore.getState().canTrack();
      expect(result).toBe(false);
    });

    it("should return false when tracking disabled", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
        useTelemetryStore.getState().setTrackingEnabled(false);
      });

      const result = useTelemetryStore.getState().canTrack();
      expect(result).toBe(false);
    });

    it("should return true when all conditions met", () => {
      act(() => {
        useTelemetryStore.getState().initialize();
        useTelemetryStore
          .getState()
          .setConsent(ConsentCategory.ANALYTICS, true);
      });

      const result = useTelemetryStore.getState().canTrack();
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("selectors", () => {
    beforeEach(() => {
      act(() => {
        useTelemetryStore.getState().initialize();
        useTelemetryStore.getState().acceptAllConsent();
        useTelemetryStore.getState().setDebugMode(true);
        useTelemetryStore.getState().setDebugPanelOpen(true);
        useTelemetryStore.getState().setUserId("user-123");
        useTelemetryStore.getState().addRecentEvent(createMockEvent());
      });
    });

    it("selectConsent should return consent state", () => {
      const state = useTelemetryStore.getState();
      const consent = selectConsent(state);
      expect(consent[ConsentCategory.ANALYTICS]).toBe(true);
    });

    it("selectHasAnalyticsConsent should return analytics consent", () => {
      const state = useTelemetryStore.getState();
      expect(selectHasAnalyticsConsent(state)).toBe(true);
    });

    it("selectHasFunctionalConsent should return functional consent", () => {
      const state = useTelemetryStore.getState();
      expect(selectHasFunctionalConsent(state)).toBe(true);
    });

    it("selectHasMarketingConsent should return marketing consent", () => {
      const state = useTelemetryStore.getState();
      expect(selectHasMarketingConsent(state)).toBe(true);
    });

    it("selectShouldShowConsentBanner should check banner state", () => {
      const state = useTelemetryStore.getState();
      expect(selectShouldShowConsentBanner(state)).toBe(false);
    });

    it("selectIsDebugMode should return debug mode", () => {
      const state = useTelemetryStore.getState();
      expect(selectIsDebugMode(state)).toBe(true);
    });

    it("selectIsDebugPanelOpen should check both debug and panel", () => {
      const state = useTelemetryStore.getState();
      expect(selectIsDebugPanelOpen(state)).toBe(true);
    });

    it("selectRecentEvents should return events", () => {
      const state = useTelemetryStore.getState();
      expect(selectRecentEvents(state)).toHaveLength(1);
    });

    it("selectEventStats should return stats", () => {
      const state = useTelemetryStore.getState();
      const stats = selectEventStats(state);
      expect(stats).toHaveProperty("totalTracked");
      expect(stats).toHaveProperty("sessionTracked");
      expect(stats).toHaveProperty("lastTimestamp");
    });

    it("selectUserInfo should return user info", () => {
      const state = useTelemetryStore.getState();
      const info = selectUserInfo(state);
      expect(info.userId).toBe("user-123");
      expect(info.anonymousId).toMatch(/^anon_/);
    });

    it("selectCanTrack should check tracking ability", () => {
      const state = useTelemetryStore.getState();
      expect(selectCanTrack(state)).toBe(true);
    });
  });
});
