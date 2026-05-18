/**
 * Onboarding Analytics - Track onboarding completion and engagement
 *
 * Provides analytics tracking for onboarding, tour, and feature discovery
 */

import type {
  OnboardingStepId,
  OnboardingAnalyticsEvent,
  TourStopId,
  TourAnalyticsEvent,
  FeatureId,
  FeatureDiscoveryAnalyticsEvent,
} from "./onboarding-types";

// ============================================================================
// Analytics Event Types
// ============================================================================

export type AnalyticsEventType = "onboarding" | "tour" | "feature_discovery";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  event:
    | OnboardingAnalyticsEvent
    | TourAnalyticsEvent
    | FeatureDiscoveryAnalyticsEvent;
}

// ============================================================================
// Analytics Tracker Interface
// ============================================================================

export interface AnalyticsTracker {
  track: (event: AnalyticsEvent) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  page: (name: string, properties?: Record<string, unknown>) => void;
}

// ============================================================================
// Default Analytics Tracker (Console + LocalStorage)
// ============================================================================

const ANALYTICS_STORAGE_KEY = "nchat-onboarding-analytics";

interface StoredAnalytics {
  events: AnalyticsEvent[];
  userId?: string;
}

function getStoredAnalytics(): StoredAnalytics {
  if (typeof window === "undefined") return { events: [] };

  try {
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { events: [] };
  } catch {
    return { events: [] };
  }
}

function storeAnalytics(analytics: StoredAnalytics): void {
  if (typeof window === "undefined") return;

  try {
    // Keep only last 100 events to prevent storage bloat
    const trimmedEvents = analytics.events.slice(-100);
    localStorage.setItem(
      ANALYTICS_STORAGE_KEY,
      JSON.stringify({ ...analytics, events: trimmedEvents }),
    );
  } catch {
    // Storage full or unavailable
  }
}

export const defaultAnalyticsTracker: AnalyticsTracker = {
  track: (event) => {
    if (process.env.NODE_ENV === "development") {
      // REMOVED: console.log('[Analytics]', event.type, event.event)
    }

    const analytics = getStoredAnalytics();
    analytics.events.push(event);
    storeAnalytics(analytics);
  },

  identify: (userId, traits) => {
    if (process.env.NODE_ENV === "development") {
      // REMOVED: console.log('[Analytics] Identify:', userId, traits)
    }

    const analytics = getStoredAnalytics();
    analytics.userId = userId;
    storeAnalytics(analytics);
  },

  page: (name, properties) => {
    if (process.env.NODE_ENV === "development") {
      // REMOVED: console.log('[Analytics] Page:', name, properties)
    }
  },
};

// ============================================================================
// Analytics Singleton
// ============================================================================

let analyticsTracker: AnalyticsTracker = defaultAnalyticsTracker;

/**
 * Set custom analytics tracker
 */
export function setAnalyticsTracker(tracker: AnalyticsTracker): void {
  analyticsTracker = tracker;
}

/**
 * Get current analytics tracker
 */
export function getAnalyticsTracker(): AnalyticsTracker {
  return analyticsTracker;
}

// ============================================================================
// Onboarding Analytics
// ============================================================================

/**
 * Track onboarding step started
 */
export function trackOnboardingStepStarted(stepId: OnboardingStepId): void {
  const event: OnboardingAnalyticsEvent = {
    eventType: "step_started",
    stepId,
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "onboarding", event });
}

/**
 * Track onboarding step completed
 */
export function trackOnboardingStepCompleted(
  stepId: OnboardingStepId,
  duration?: number,
  metadata?: Record<string, unknown>,
): void {
  const event: OnboardingAnalyticsEvent = {
    eventType: "step_completed",
    stepId,
    timestamp: new Date(),
    duration,
    metadata,
  };

  analyticsTracker.track({ type: "onboarding", event });
}

/**
 * Track onboarding step skipped
 */
export function trackOnboardingStepSkipped(stepId: OnboardingStepId): void {
  const event: OnboardingAnalyticsEvent = {
    eventType: "step_skipped",
    stepId,
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "onboarding", event });
}

/**
 * Track onboarding completed
 */
export function trackOnboardingCompleted(
  totalDuration: number,
  metadata?: Record<string, unknown>,
): void {
  const event: OnboardingAnalyticsEvent = {
    eventType: "onboarding_completed",
    timestamp: new Date(),
    duration: totalDuration,
    metadata,
  };

  analyticsTracker.track({ type: "onboarding", event });
}

/**
 * Track onboarding abandoned
 */
export function trackOnboardingAbandoned(
  lastStepId: OnboardingStepId,
  metadata?: Record<string, unknown>,
): void {
  const event: OnboardingAnalyticsEvent = {
    eventType: "onboarding_abandoned",
    stepId: lastStepId,
    timestamp: new Date(),
    metadata,
  };

  analyticsTracker.track({ type: "onboarding", event });
}

// ============================================================================
// Tour Analytics
// ============================================================================

/**
 * Track tour started
 */
export function trackTourStarted(): void {
  const event: TourAnalyticsEvent = {
    eventType: "tour_started",
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "tour", event });
}

/**
 * Track tour stop viewed
 */
export function trackTourStopViewed(
  stopId: TourStopId,
  duration?: number,
): void {
  const event: TourAnalyticsEvent = {
    eventType: "stop_viewed",
    stopId,
    timestamp: new Date(),
    duration,
  };

  analyticsTracker.track({ type: "tour", event });
}

/**
 * Track tour stop skipped
 */
export function trackTourStopSkipped(stopId: TourStopId): void {
  const event: TourAnalyticsEvent = {
    eventType: "stop_skipped",
    stopId,
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "tour", event });
}

/**
 * Track tour completed
 */
export function trackTourCompleted(totalDuration: number): void {
  const event: TourAnalyticsEvent = {
    eventType: "tour_completed",
    timestamp: new Date(),
    duration: totalDuration,
  };

  analyticsTracker.track({ type: "tour", event });
}

/**
 * Track tour dismissed
 */
export function trackTourDismissed(lastStopId: TourStopId): void {
  const event: TourAnalyticsEvent = {
    eventType: "tour_dismissed",
    stopId: lastStopId,
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "tour", event });
}

// ============================================================================
// Feature Discovery Analytics
// ============================================================================

/**
 * Track tip shown
 */
export function trackTipShown(featureId: FeatureId, tipId: string): void {
  const event: FeatureDiscoveryAnalyticsEvent = {
    eventType: "tip_shown",
    featureId,
    tipId,
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "feature_discovery", event });
}

/**
 * Track tip dismissed
 */
export function trackTipDismissed(featureId: FeatureId, tipId: string): void {
  const event: FeatureDiscoveryAnalyticsEvent = {
    eventType: "tip_dismissed",
    featureId,
    tipId,
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "feature_discovery", event });
}

/**
 * Track tip clicked (learn more)
 */
export function trackTipClicked(featureId: FeatureId, tipId: string): void {
  const event: FeatureDiscoveryAnalyticsEvent = {
    eventType: "tip_clicked",
    featureId,
    tipId,
    timestamp: new Date(),
  };

  analyticsTracker.track({ type: "feature_discovery", event });
}

/**
 * Track feature used
 */
export function trackFeatureUsed(
  featureId: FeatureId,
  metadata?: Record<string, unknown>,
): void {
  const event: FeatureDiscoveryAnalyticsEvent = {
    eventType: "feature_used",
    featureId,
    timestamp: new Date(),
    metadata,
  };

  analyticsTracker.track({ type: "feature_discovery", event });
}

// ============================================================================
// Analytics Helpers
// ============================================================================

/**
 * Calculate time spent on step
 */
export function calculateStepDuration(
  startTime: Date,
  endTime: Date = new Date(),
): number {
  return Math.round((endTime.getTime() - startTime.getTime()) / 1000);
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary(): {
  onboarding: {
    started: number;
    completed: number;
    abandoned: number;
    averageDuration: number;
  };
  tour: {
    started: number;
    completed: number;
    dismissed: number;
  };
  features: {
    tipsShown: number;
    tipsDismissed: number;
    featuresUsed: number;
  };
} {
  const analytics = getStoredAnalytics();

  const onboardingEvents = analytics.events.filter(
    (e) => e.type === "onboarding",
  );
  const tourEvents = analytics.events.filter((e) => e.type === "tour");
  const featureEvents = analytics.events.filter(
    (e) => e.type === "feature_discovery",
  );

  const onboardingCompleted = onboardingEvents.filter(
    (e) =>
      (e.event as OnboardingAnalyticsEvent).eventType ===
      "onboarding_completed",
  );

  const completedDurations = onboardingCompleted
    .map((e) => (e.event as OnboardingAnalyticsEvent).duration)
    .filter((d): d is number => d !== undefined);

  const averageDuration =
    completedDurations.length > 0
      ? completedDurations.reduce((a, b) => a + b, 0) /
        completedDurations.length
      : 0;

  return {
    onboarding: {
      started: onboardingEvents.filter(
        (e) =>
          (e.event as OnboardingAnalyticsEvent).eventType === "step_started" &&
          (e.event as OnboardingAnalyticsEvent).stepId === "welcome",
      ).length,
      completed: onboardingCompleted.length,
      abandoned: onboardingEvents.filter(
        (e) =>
          (e.event as OnboardingAnalyticsEvent).eventType ===
          "onboarding_abandoned",
      ).length,
      averageDuration,
    },
    tour: {
      started: tourEvents.filter(
        (e) => (e.event as TourAnalyticsEvent).eventType === "tour_started",
      ).length,
      completed: tourEvents.filter(
        (e) => (e.event as TourAnalyticsEvent).eventType === "tour_completed",
      ).length,
      dismissed: tourEvents.filter(
        (e) => (e.event as TourAnalyticsEvent).eventType === "tour_dismissed",
      ).length,
    },
    features: {
      tipsShown: featureEvents.filter(
        (e) =>
          (e.event as FeatureDiscoveryAnalyticsEvent).eventType === "tip_shown",
      ).length,
      tipsDismissed: featureEvents.filter(
        (e) =>
          (e.event as FeatureDiscoveryAnalyticsEvent).eventType ===
          "tip_dismissed",
      ).length,
      featuresUsed: featureEvents.filter(
        (e) =>
          (e.event as FeatureDiscoveryAnalyticsEvent).eventType ===
          "feature_used",
      ).length,
    },
  };
}

/**
 * Clear stored analytics
 */
export function clearAnalytics(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ANALYTICS_STORAGE_KEY);
}

/**
 * Export analytics data
 */
export function exportAnalytics(): string {
  const analytics = getStoredAnalytics();
  return JSON.stringify(analytics, null, 2);
}
