/**
 * Session Tracker
 *
 * Tracks user sessions, page views, and session-level analytics.
 */

import { AnalyticsEvent } from "./event-schema";
import { getAnalyticsClient, TrackedEvent } from "./analytics-client";

// ============================================================================
// Types
// ============================================================================

/**
 * Session data
 */
export interface SessionData {
  id: string;
  startTime: number;
  lastActivityTime: number;
  pageViewCount: number;
  eventCount: number;
  isActive: boolean;
  referrer?: string;
  landingPage?: string;
  currentPage?: string;
  duration: number;
}

/**
 * Page view data
 */
export interface PageViewData {
  path: string;
  title: string;
  timestamp: number;
  duration: number;
  referrer?: string;
  queryParams?: Record<string, string>;
}

/**
 * Session tracker configuration
 */
export interface SessionTrackerConfig {
  sessionTimeout: number;
  heartbeatInterval: number;
  trackPageViews: boolean;
  trackVisibility: boolean;
  trackScrollDepth: boolean;
  trackEngagement: boolean;
  maxScrollDepthSamples: number;
}

/**
 * Engagement metrics
 */
export interface EngagementMetrics {
  timeOnPage: number;
  scrollDepth: number;
  interactions: number;
  focusTime: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: SessionTrackerConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  heartbeatInterval: 60 * 1000, // 1 minute
  trackPageViews: true,
  trackVisibility: true,
  trackScrollDepth: true,
  trackEngagement: true,
  maxScrollDepthSamples: 10,
};

const SESSION_STORAGE_KEY = "nchat_session_data";
const PAGE_ENTER_TIME_KEY = "nchat_page_enter_time";

// ============================================================================
// Session Tracker Class
// ============================================================================

export class SessionTracker {
  private config: SessionTrackerConfig;
  private session: SessionData | null = null;
  private pageViews: PageViewData[] = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pageEnterTime: number = 0;
  private scrollDepthSamples: number[] = [];
  private maxScrollDepth: number = 0;
  private interactionCount: number = 0;
  private focusStartTime: number = 0;
  private totalFocusTime: number = 0;
  private isPageVisible: boolean = true;
  private listeners: Array<() => void> = [];

  constructor(config: Partial<SessionTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Starts session tracking
   */
  start(): void {
    this.loadSession();

    if (!this.session || this.isSessionExpired()) {
      this.startNewSession();
    } else {
      this.resumeSession();
    }

    this.setupEventListeners();
    this.startHeartbeat();
    this.pageEnterTime = Date.now();
    this.focusStartTime = Date.now();
  }

  /**
   * Stops session tracking
   */
  stop(): void {
    this.trackSessionEnd("navigation");
    this.stopHeartbeat();
    this.removeEventListeners();
    this.persistSession();
  }

  /**
   * Tracks a page view
   */
  trackPageView(
    path: string,
    title: string,
    options: { referrer?: string; queryParams?: Record<string, string> } = {},
  ): TrackedEvent | null {
    if (!this.session) {
      return null;
    }

    // Record previous page duration
    if (this.pageViews.length > 0) {
      const lastPageView = this.pageViews[this.pageViews.length - 1];
      lastPageView.duration = Date.now() - lastPageView.timestamp;
    }

    const pageView: PageViewData = {
      path,
      title,
      timestamp: Date.now(),
      duration: 0,
      referrer: options.referrer,
      queryParams: options.queryParams,
    };

    this.pageViews.push(pageView);
    this.session.pageViewCount++;
    this.session.currentPage = path;
    this.session.lastActivityTime = Date.now();

    // Reset engagement metrics for new page
    this.pageEnterTime = Date.now();
    this.maxScrollDepth = 0;
    this.scrollDepthSamples = [];
    this.interactionCount = 0;

    this.persistSession();

    if (this.config.trackPageViews) {
      return getAnalyticsClient().track(AnalyticsEvent.PAGE_VIEW, {
        path,
        title,
        referrer: options.referrer || this.session.referrer,
        previousPath:
          this.pageViews.length > 1
            ? this.pageViews[this.pageViews.length - 2].path
            : undefined,
        queryParams: options.queryParams,
      });
    }

    return null;
  }

  /**
   * Records user activity
   */
  recordActivity(): void {
    if (!this.session) {
      return;
    }

    this.session.lastActivityTime = Date.now();
    this.interactionCount++;
    this.persistSession();
  }

  /**
   * Gets current session data
   */
  getSession(): SessionData | null {
    if (!this.session) {
      return null;
    }

    return {
      ...this.session,
      duration: Date.now() - this.session.startTime,
    };
  }

  /**
   * Gets session ID
   */
  getSessionId(): string | null {
    return this.session?.id || null;
  }

  /**
   * Gets page views
   */
  getPageViews(): PageViewData[] {
    return [...this.pageViews];
  }

  /**
   * Gets engagement metrics for current page
   */
  getEngagementMetrics(): EngagementMetrics {
    return {
      timeOnPage: Date.now() - this.pageEnterTime,
      scrollDepth: this.maxScrollDepth,
      interactions: this.interactionCount,
      focusTime:
        this.totalFocusTime +
        (this.isPageVisible ? Date.now() - this.focusStartTime : 0),
    };
  }

  /**
   * Gets session duration in milliseconds
   */
  getDuration(): number {
    if (!this.session) {
      return 0;
    }
    return Date.now() - this.session.startTime;
  }

  /**
   * Checks if session is active
   */
  isActive(): boolean {
    return this.session?.isActive === true && !this.isSessionExpired();
  }

  /**
   * Resets the session
   */
  reset(): void {
    this.trackSessionEnd("user_logout");
    this.session = null;
    this.pageViews = [];
    this.clearPersistedSession();
    this.startNewSession();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private startNewSession(): void {
    const referrer =
      typeof document !== "undefined" ? document.referrer : undefined;
    const landingPage =
      typeof window !== "undefined" ? window.location.pathname : undefined;

    this.session = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      pageViewCount: 0,
      eventCount: 0,
      isActive: true,
      referrer,
      landingPage,
      currentPage: landingPage,
      duration: 0,
    };

    this.pageViews = [];
    this.persistSession();

    getAnalyticsClient().track(AnalyticsEvent.SESSION_START, {
      sessionId: this.session.id,
      startTime: this.session.startTime,
    });
  }

  private resumeSession(): void {
    if (!this.session) {
      return;
    }

    this.session.isActive = true;
    this.session.lastActivityTime = Date.now();
    this.persistSession();

    getAnalyticsClient().track(AnalyticsEvent.SESSION_RESUME, {
      sessionId: this.session.id,
      duration: Date.now() - this.session.startTime,
      pageViewCount: this.session.pageViewCount,
      eventCount: this.session.eventCount,
    });
  }

  private trackSessionEnd(
    reason: "user_logout" | "timeout" | "navigation" | "close",
  ): void {
    if (!this.session || !this.session.isActive) {
      return;
    }

    this.session.isActive = false;
    this.session.duration = Date.now() - this.session.startTime;

    getAnalyticsClient().track(
      AnalyticsEvent.SESSION_END,
      {
        sessionId: this.session.id,
        duration: this.session.duration,
        pageViewCount: this.session.pageViewCount,
        eventCount: this.session.eventCount,
        endReason: reason,
      },
      { immediate: true },
    );
  }

  private isSessionExpired(): boolean {
    if (!this.session) {
      return true;
    }
    return (
      Date.now() - this.session.lastActivityTime > this.config.sessionTimeout
    );
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `sess_${timestamp}_${random}`;
  }

  private loadSession(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        this.session = JSON.parse(stored);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private persistSession(): void {
    if (typeof window === "undefined" || !this.session) {
      return;
    }

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(this.session));
    } catch {
      // Ignore storage errors
    }
  }

  private clearPersistedSession(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  private setupEventListeners(): void {
    if (typeof window === "undefined") {
      return;
    }

    // Activity listeners
    const activityHandler = () => this.recordActivity();
    window.addEventListener("click", activityHandler);
    window.addEventListener("keydown", activityHandler);
    this.listeners.push(
      () => window.removeEventListener("click", activityHandler),
      () => window.removeEventListener("keydown", activityHandler),
    );

    // Visibility change
    if (this.config.trackVisibility) {
      const visibilityHandler = () => this.handleVisibilityChange();
      document.addEventListener("visibilitychange", visibilityHandler);
      this.listeners.push(() =>
        document.removeEventListener("visibilitychange", visibilityHandler),
      );
    }

    // Scroll depth
    if (this.config.trackScrollDepth) {
      const scrollHandler = () => this.handleScroll();
      window.addEventListener("scroll", scrollHandler, { passive: true });
      this.listeners.push(() =>
        window.removeEventListener("scroll", scrollHandler),
      );
    }

    // Before unload
    const unloadHandler = () => {
      this.trackSessionEnd("close");
      this.persistSession();
    };
    window.addEventListener("beforeunload", unloadHandler);
    this.listeners.push(() =>
      window.removeEventListener("beforeunload", unloadHandler),
    );
  }

  private removeEventListeners(): void {
    this.listeners.forEach((remove) => remove());
    this.listeners = [];
  }

  private startHeartbeat(): void {
    if (this.config.heartbeatInterval > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.heartbeat();
      }, this.config.heartbeatInterval);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private heartbeat(): void {
    if (!this.session) {
      return;
    }

    // Check for session timeout
    if (this.isSessionExpired()) {
      this.trackSessionEnd("timeout");
      this.startNewSession();
      return;
    }

    // Update session metrics
    this.session.duration = Date.now() - this.session.startTime;
    this.persistSession();
  }

  private handleVisibilityChange(): void {
    if (!this.session) {
      return;
    }

    if (document.visibilityState === "hidden") {
      this.isPageVisible = false;
      this.totalFocusTime += Date.now() - this.focusStartTime;

      getAnalyticsClient().track(AnalyticsEvent.APP_BACKGROUNDED, {
        timestamp: Date.now(),
      });
    } else {
      this.isPageVisible = true;
      this.focusStartTime = Date.now();
      const backgroundDuration = Date.now() - this.session.lastActivityTime;

      getAnalyticsClient().track(AnalyticsEvent.APP_FOREGROUNDED, {
        timestamp: Date.now(),
        backgroundDuration,
      });

      // Check if session should be renewed after long absence
      if (this.isSessionExpired()) {
        this.trackSessionEnd("timeout");
        this.startNewSession();
      }
    }
  }

  private handleScroll(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    const scrollableHeight = scrollHeight - clientHeight;
    if (scrollableHeight <= 0) {
      return;
    }

    const scrollDepth = Math.round((scrollTop / scrollableHeight) * 100);

    if (scrollDepth > this.maxScrollDepth) {
      this.maxScrollDepth = scrollDepth;

      // Sample scroll depth at intervals
      if (this.scrollDepthSamples.length < this.config.maxScrollDepthSamples) {
        const intervals = [25, 50, 75, 90, 100];
        for (const interval of intervals) {
          if (
            scrollDepth >= interval &&
            !this.scrollDepthSamples.includes(interval)
          ) {
            this.scrollDepthSamples.push(interval);
          }
        }
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let sessionTrackerInstance: SessionTracker | null = null;

/**
 * Gets or creates the session tracker singleton
 */
export function getSessionTracker(
  config?: Partial<SessionTrackerConfig>,
): SessionTracker {
  if (!sessionTrackerInstance) {
    sessionTrackerInstance = new SessionTracker(config);
  }
  return sessionTrackerInstance;
}

/**
 * Resets the session tracker singleton (for testing)
 */
export function resetSessionTracker(): void {
  if (sessionTrackerInstance) {
    sessionTrackerInstance.stop();
    sessionTrackerInstance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Starts session tracking
 */
export function startSession(): void {
  getSessionTracker().start();
}

/**
 * Stops session tracking
 */
export function stopSession(): void {
  getSessionTracker().stop();
}

/**
 * Tracks a page view
 */
export function trackPage(
  path: string,
  title: string,
  options?: { referrer?: string; queryParams?: Record<string, string> },
): TrackedEvent | null {
  return getSessionTracker().trackPageView(path, title, options);
}

/**
 * Gets current session data
 */
export function getCurrentSession(): SessionData | null {
  return getSessionTracker().getSession();
}

/**
 * Gets session ID
 */
export function getSessionId(): string | null {
  return getSessionTracker().getSessionId();
}
