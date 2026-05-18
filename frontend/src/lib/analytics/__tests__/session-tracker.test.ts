/**
 * Session Tracker Tests
 *
 * Tests for session tracking, page views, and engagement metrics.
 */

import {
  SessionTracker,
  getSessionTracker,
  resetSessionTracker,
  startSession,
  stopSession,
  trackPage,
  getCurrentSession,
  getSessionId,
  SessionTrackerConfig,
} from "../session-tracker";
import { resetAnalyticsClient, getAnalyticsClient } from "../analytics-client";
import {
  ConsentCategory,
  ConsentState,
  CONSENT_VERSION,
} from "../privacy-filter";

// ============================================================================
// Mocks
// ============================================================================

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock scrolling
Object.defineProperty(document.documentElement, "scrollHeight", {
  value: 2000,
  configurable: true,
});
Object.defineProperty(document.documentElement, "clientHeight", {
  value: 800,
  configurable: true,
});

// ============================================================================
// Test Helpers
// ============================================================================

const createConsentState = (analytics: boolean): ConsentState => ({
  [ConsentCategory.ESSENTIAL]: true,
  [ConsentCategory.ANALYTICS]: analytics,
  [ConsentCategory.FUNCTIONAL]: false,
  [ConsentCategory.MARKETING]: false,
  timestamp: Date.now(),
  version: CONSENT_VERSION,
});

const createTestConfig = (
  overrides: Partial<SessionTrackerConfig> = {},
): Partial<SessionTrackerConfig> => ({
  sessionTimeout: 30 * 60 * 1000,
  heartbeatInterval: 0, // Disable for tests
  trackPageViews: true,
  trackVisibility: false,
  trackScrollDepth: false,
  trackEngagement: false,
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Session Tracker", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    localStorageMock.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetSessionTracker();
    resetAnalyticsClient();

    // Initialize analytics client with consent
    const client = getAnalyticsClient({
      enabled: true,
      flushInterval: 0,
      respectDoNotTrack: false,
    });
    client.initialize(createConsentState(true));
  });

  afterEach(() => {
    resetSessionTracker();
    resetAnalyticsClient();
    jest.useRealTimers();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe("constructor", () => {
    it("should create tracker with default config", () => {
      const tracker = new SessionTracker();
      expect(tracker).toBeInstanceOf(SessionTracker);
    });

    it("should merge custom config", () => {
      const tracker = new SessionTracker({ sessionTimeout: 10000 });
      expect(tracker).toBeInstanceOf(SessionTracker);
    });
  });

  // ==========================================================================
  // Start Tests
  // ==========================================================================

  describe("start", () => {
    it("should start a new session", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      const session = tracker.getSession();
      expect(session).not.toBeNull();
      expect(session?.id).toMatch(/^sess_/);
      expect(session?.isActive).toBe(true);
    });

    it("should set session start time", () => {
      const tracker = new SessionTracker(createTestConfig());
      const before = Date.now();
      tracker.start();
      const after = Date.now();

      const session = tracker.getSession();
      expect(session?.startTime).toBeGreaterThanOrEqual(before);
      expect(session?.startTime).toBeLessThanOrEqual(after);
    });

    it("should initialize page view count to 0", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      const session = tracker.getSession();
      expect(session?.pageViewCount).toBe(0);
    });

    it("should persist session to storage", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      expect(sessionStorage.setItem).toHaveBeenCalled();
    });

    it("should resume existing session if not expired", () => {
      // Create initial session
      const tracker1 = new SessionTracker(createTestConfig());
      tracker1.start();
      tracker1.trackPageView("/page1", "Page 1");
      const session1 = tracker1.getSession();

      // Create new tracker - should resume
      const tracker2 = new SessionTracker(createTestConfig());
      tracker2.start();
      const session2 = tracker2.getSession();

      expect(session2?.id).toBe(session1?.id);
    });

    it("should start new session if previous expired", () => {
      const tracker1 = new SessionTracker(
        createTestConfig({ sessionTimeout: 100 }),
      );
      tracker1.start();
      const session1 = tracker1.getSession();

      // Advance time past timeout
      jest.advanceTimersByTime(200);

      const tracker2 = new SessionTracker(
        createTestConfig({ sessionTimeout: 100 }),
      );
      tracker2.start();
      const session2 = tracker2.getSession();

      expect(session2?.id).not.toBe(session1?.id);
    });
  });

  // ==========================================================================
  // Stop Tests
  // ==========================================================================

  describe("stop", () => {
    it("should mark session as inactive", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.stop();

      const session = tracker.getSession();
      expect(session?.isActive).toBe(false);
    });

    it("should persist final session state", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.stop();

      expect(sessionStorage.setItem).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Page View Tests
  // ==========================================================================

  describe("trackPageView", () => {
    it("should track page view", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      const event = tracker.trackPageView("/chat", "Chat Page");

      expect(event).not.toBeNull();
    });

    it("should increment page view count", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      tracker.trackPageView("/page1", "Page 1");
      tracker.trackPageView("/page2", "Page 2");

      const session = tracker.getSession();
      expect(session?.pageViewCount).toBe(2);
    });

    it("should store page view data", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      tracker.trackPageView("/chat", "Chat Page", {
        referrer: "https://google.com",
      });

      const pageViews = tracker.getPageViews();
      expect(pageViews).toHaveLength(1);
      expect(pageViews[0].path).toBe("/chat");
      expect(pageViews[0].title).toBe("Chat Page");
      expect(pageViews[0].referrer).toBe("https://google.com");
    });

    it("should calculate duration of previous page", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      tracker.trackPageView("/page1", "Page 1");
      jest.advanceTimersByTime(5000);
      tracker.trackPageView("/page2", "Page 2");

      const pageViews = tracker.getPageViews();
      expect(pageViews[0].duration).toBeGreaterThanOrEqual(5000);
    });

    it("should update current page", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      tracker.trackPageView("/page1", "Page 1");
      expect(tracker.getSession()?.currentPage).toBe("/page1");

      tracker.trackPageView("/page2", "Page 2");
      expect(tracker.getSession()?.currentPage).toBe("/page2");
    });

    it("should return null when no session", () => {
      const tracker = new SessionTracker(createTestConfig());

      const event = tracker.trackPageView("/chat", "Chat");

      expect(event).toBeNull();
    });

    it("should not track when trackPageViews is false", () => {
      const tracker = new SessionTracker(
        createTestConfig({ trackPageViews: false }),
      );
      tracker.start();

      const event = tracker.trackPageView("/chat", "Chat");

      expect(event).toBeNull();
    });

    it("should include query params", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      tracker.trackPageView("/search", "Search", {
        queryParams: { q: "test", page: "1" },
      });

      const pageViews = tracker.getPageViews();
      expect(pageViews[0].queryParams).toEqual({ q: "test", page: "1" });
    });
  });

  // ==========================================================================
  // Activity Recording Tests
  // ==========================================================================

  describe("recordActivity", () => {
    it("should update last activity time", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      const initialTime = tracker.getSession()?.lastActivityTime;
      jest.advanceTimersByTime(1000);
      tracker.recordActivity();

      expect(tracker.getSession()?.lastActivityTime).toBeGreaterThan(
        initialTime!,
      );
    });

    it("should not fail when no session", () => {
      const tracker = new SessionTracker(createTestConfig());
      expect(() => tracker.recordActivity()).not.toThrow();
    });
  });

  // ==========================================================================
  // Session Data Tests
  // ==========================================================================

  describe("getSession", () => {
    it("should return session data", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      const session = tracker.getSession();

      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("startTime");
      expect(session).toHaveProperty("lastActivityTime");
      expect(session).toHaveProperty("pageViewCount");
      expect(session).toHaveProperty("isActive");
      expect(session).toHaveProperty("duration");
    });

    it("should return null when no session", () => {
      const tracker = new SessionTracker(createTestConfig());
      expect(tracker.getSession()).toBeNull();
    });

    it("should calculate duration", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      jest.advanceTimersByTime(5000);

      const session = tracker.getSession();
      expect(session?.duration).toBeGreaterThanOrEqual(5000);
    });
  });

  describe("getSessionId", () => {
    it("should return session ID", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      const id = tracker.getSessionId();

      expect(id).toMatch(/^sess_/);
    });

    it("should return null when no session", () => {
      const tracker = new SessionTracker(createTestConfig());
      expect(tracker.getSessionId()).toBeNull();
    });
  });

  describe("getPageViews", () => {
    it("should return page view list", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      tracker.trackPageView("/page1", "Page 1");
      tracker.trackPageView("/page2", "Page 2");

      const pageViews = tracker.getPageViews();

      expect(pageViews).toHaveLength(2);
      expect(pageViews[0].path).toBe("/page1");
      expect(pageViews[1].path).toBe("/page2");
    });

    it("should return empty array when no page views", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      expect(tracker.getPageViews()).toEqual([]);
    });

    it("should return copy of page views", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.trackPageView("/page1", "Page 1");

      const pageViews = tracker.getPageViews();
      pageViews.pop();

      expect(tracker.getPageViews()).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Engagement Metrics Tests
  // ==========================================================================

  describe("getEngagementMetrics", () => {
    it("should return engagement metrics", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      const metrics = tracker.getEngagementMetrics();

      expect(metrics).toHaveProperty("timeOnPage");
      expect(metrics).toHaveProperty("scrollDepth");
      expect(metrics).toHaveProperty("interactions");
      expect(metrics).toHaveProperty("focusTime");
    });

    it("should calculate time on page", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.trackPageView("/chat", "Chat");

      jest.advanceTimersByTime(5000);

      const metrics = tracker.getEngagementMetrics();
      expect(metrics.timeOnPage).toBeGreaterThanOrEqual(5000);
    });

    it("should reset metrics on new page view", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.trackPageView("/page1", "Page 1");

      jest.advanceTimersByTime(5000);
      tracker.recordActivity();
      tracker.recordActivity();

      tracker.trackPageView("/page2", "Page 2");

      const metrics = tracker.getEngagementMetrics();
      expect(metrics.interactions).toBe(0);
    });
  });

  // ==========================================================================
  // Duration Tests
  // ==========================================================================

  describe("getDuration", () => {
    it("should return session duration", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      jest.advanceTimersByTime(10000);

      expect(tracker.getDuration()).toBeGreaterThanOrEqual(10000);
    });

    it("should return 0 when no session", () => {
      const tracker = new SessionTracker(createTestConfig());
      expect(tracker.getDuration()).toBe(0);
    });
  });

  // ==========================================================================
  // Active State Tests
  // ==========================================================================

  describe("isActive", () => {
    it("should return true for active session", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      expect(tracker.isActive()).toBe(true);
    });

    it("should return false when stopped", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.stop();

      expect(tracker.isActive()).toBe(false);
    });

    it("should return false when no session", () => {
      const tracker = new SessionTracker(createTestConfig());
      expect(tracker.isActive()).toBe(false);
    });

    it("should return false when session expired", () => {
      const tracker = new SessionTracker(
        createTestConfig({ sessionTimeout: 100 }),
      );
      tracker.start();

      jest.advanceTimersByTime(200);

      expect(tracker.isActive()).toBe(false);
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe("reset", () => {
    it("should clear session data", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.trackPageView("/page1", "Page 1");

      const oldId = tracker.getSessionId();
      tracker.reset();

      expect(tracker.getSessionId()).not.toBe(oldId);
      expect(tracker.getPageViews()).toHaveLength(0);
    });

    it("should start new session", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.reset();

      expect(tracker.isActive()).toBe(true);
      expect(tracker.getSession()?.pageViewCount).toBe(0);
    });
  });

  // ==========================================================================
  // Singleton Tests
  // ==========================================================================

  describe("singleton", () => {
    it("should return same instance", () => {
      const tracker1 = getSessionTracker();
      const tracker2 = getSessionTracker();
      expect(tracker1).toBe(tracker2);
    });

    it("should reset instance", () => {
      const tracker1 = getSessionTracker();
      tracker1.start();
      resetSessionTracker();

      const tracker2 = getSessionTracker();
      expect(tracker1).not.toBe(tracker2);
    });
  });

  // ==========================================================================
  // Convenience Function Tests
  // ==========================================================================

  describe("convenience functions", () => {
    describe("startSession", () => {
      it("should start session using singleton", () => {
        startSession();
        expect(getCurrentSession()).not.toBeNull();
      });
    });

    describe("stopSession", () => {
      it("should stop session using singleton", () => {
        startSession();
        stopSession();
        expect(getCurrentSession()?.isActive).toBe(false);
      });
    });

    describe("trackPage", () => {
      it("should track page using singleton", () => {
        startSession();
        const event = trackPage("/chat", "Chat");
        expect(event).not.toBeNull();
      });
    });

    describe("getCurrentSession", () => {
      it("should get session using singleton", () => {
        startSession();
        const session = getCurrentSession();
        expect(session).not.toBeNull();
      });
    });

    describe("getSessionId", () => {
      it("should get session ID using singleton", () => {
        startSession();
        const id = getSessionId();
        expect(id).toMatch(/^sess_/);
      });
    });
  });

  // ==========================================================================
  // Heartbeat Tests
  // ==========================================================================

  describe("heartbeat", () => {
    it("should start new session on timeout", () => {
      const tracker = new SessionTracker(
        createTestConfig({
          sessionTimeout: 1000,
          heartbeatInterval: 500,
        }),
      );
      tracker.start();
      const initialId = tracker.getSessionId();

      // Advance time to trigger heartbeat and timeout
      jest.advanceTimersByTime(1500);

      // Session should be renewed
      expect(tracker.getSessionId()).not.toBe(initialId);
    });
  });

  // ==========================================================================
  // Session Persistence Tests
  // ==========================================================================

  describe("session persistence", () => {
    it("should persist session to sessionStorage", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();

      expect(sessionStorage.setItem).toHaveBeenCalled();
    });

    it("should load persisted session", () => {
      // Start first session
      const tracker1 = new SessionTracker(createTestConfig());
      tracker1.start();
      const id = tracker1.getSessionId();

      // Create new tracker - should load persisted session
      const tracker2 = new SessionTracker(createTestConfig());
      tracker2.start();

      expect(tracker2.getSessionId()).toBe(id);
    });

    it("should clear persisted session on reset", () => {
      const tracker = new SessionTracker(createTestConfig());
      tracker.start();
      tracker.reset();

      expect(sessionStorage.removeItem).toHaveBeenCalled();
    });
  });
});
