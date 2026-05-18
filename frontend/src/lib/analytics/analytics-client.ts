/**
 * Analytics Client
 *
 * Core analytics client for tracking events, identifying users,
 * and managing analytics data with batching and queuing support.
 */

import {
  AnalyticsEvent,
  EventCategory,
  TrackedEvent,
  BaseEventProperties,
  EventPropertiesMap,
  eventCategoryMap,
  createEventId,
  validateTrackedEvent,
} from "./event-schema";

// Re-export TrackedEvent for convenience
export type { TrackedEvent } from "./event-schema";
import {
  PrivacyFilter,
  hasConsent,
  ConsentCategory,
  ConsentState,
  generateAnonymousId,
} from "./privacy-filter";

// ============================================================================
// Types
// ============================================================================

/**
 * User traits for identification
 */
export interface UserTraits {
  userId?: string;
  anonymousId?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  plan?: string;
  createdAt?: string;
  [key: string]: unknown;
}

/**
 * Analytics client configuration
 */
export interface AnalyticsClientConfig {
  appVersion: string;
  platform: "web" | "desktop" | "mobile";
  debug: boolean;
  enabled: boolean;
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  endpoint?: string;
  apiKey?: string;
  respectDoNotTrack: boolean;
  usePrivacyFilter: boolean;
  persistQueue: boolean;
  onEventTracked?: (event: TrackedEvent) => void;
  onFlush?: (events: TrackedEvent[]) => Promise<void>;
  onError?: (error: Error, context: string) => void;
}

/**
 * Analytics client state
 */
export interface AnalyticsClientState {
  initialized: boolean;
  userId?: string;
  anonymousId: string;
  sessionId: string;
  traits: UserTraits;
  queue: TrackedEvent[];
  flushing: boolean;
  consent: ConsentState | null;
}

/**
 * Track function options
 */
export interface TrackOptions {
  immediate?: boolean;
  skipValidation?: boolean;
  skipPrivacyFilter?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: AnalyticsClientConfig = {
  appVersion: "1.0.0",
  platform: "web",
  debug: false,
  enabled: true,
  batchSize: 10,
  flushInterval: 30000,
  maxQueueSize: 100,
  respectDoNotTrack: true,
  usePrivacyFilter: true,
  persistQueue: true,
};

const QUEUE_STORAGE_KEY = "nchat_analytics_queue";
const SESSION_STORAGE_KEY = "nchat_analytics_session";
const ANONYMOUS_ID_KEY = "nchat_anonymous_id";

// ============================================================================
// Analytics Client Class
// ============================================================================

export class AnalyticsClient {
  private config: AnalyticsClientConfig;
  private state: AnalyticsClientState;
  private privacyFilter: PrivacyFilter;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AnalyticsClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.privacyFilter = new PrivacyFilter();

    this.state = {
      initialized: false,
      anonymousId: this.getOrCreateAnonymousId(),
      sessionId: this.getOrCreateSessionId(),
      traits: {},
      queue: [],
      flushing: false,
      consent: null,
    };

    if (this.config.persistQueue) {
      this.loadPersistedQueue();
    }
  }

  /**
   * Initializes the analytics client
   */
  initialize(consent?: ConsentState): void {
    if (this.state.initialized) {
      return;
    }

    this.state.consent = consent || null;

    if (!this.isEnabled()) {
      this.log("Analytics disabled");
      return;
    }

    // Start flush timer
    if (this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }

    // Listen for page unload to flush
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.flush(true);
      });
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.flush();
        }
      });
    }

    this.state.initialized = true;
    this.log("Analytics initialized");
  }

  /**
   * Identifies a user
   */
  identify(userId: string, traits: UserTraits = {}): void {
    if (!this.isEnabled()) {
      return;
    }

    this.state.userId = userId;
    this.state.traits = {
      ...this.state.traits,
      ...this.filterTraits(traits),
      userId,
    };

    this.log("User identified", { userId, traits: this.state.traits });
  }

  /**
   * Resets the user identity
   */
  reset(): void {
    this.state.userId = undefined;
    this.state.traits = {};
    this.state.anonymousId = generateAnonymousId();
    this.state.sessionId = this.createSessionId();

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ANONYMOUS_ID_KEY, this.state.anonymousId);
        sessionStorage.setItem(SESSION_STORAGE_KEY, this.state.sessionId);
      } catch {
        // Storage may be unavailable
      }
    }

    this.log("User reset");
  }

  /**
   * Sets user traits without identifying
   */
  setTraits(traits: UserTraits): void {
    this.state.traits = {
      ...this.state.traits,
      ...this.filterTraits(traits),
    };
    this.log("Traits updated", this.state.traits);
  }

  /**
   * Tracks an analytics event
   */
  track<T extends AnalyticsEvent>(
    eventName: T,
    properties: T extends keyof EventPropertiesMap
      ? EventPropertiesMap[T]
      : Record<string, unknown>,
    options: TrackOptions = {},
  ): TrackedEvent<T> | null {
    if (!this.isEnabled()) {
      return null;
    }

    const event = this.createEvent(
      eventName,
      properties as Record<string, unknown>,
      options,
    );

    if (!event) {
      return null;
    }

    this.enqueue(event);

    if (options.immediate) {
      this.flush();
    }

    this.config.onEventTracked?.(event);
    this.log("Event tracked", event);

    return event;
  }

  /**
   * Tracks a page view
   */
  page(
    path: string,
    title: string,
    properties: Record<string, unknown> = {},
  ): TrackedEvent | null {
    return this.track(AnalyticsEvent.PAGE_VIEW, {
      path,
      title,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      ...properties,
    } as any);
  }

  /**
   * Tracks an error
   */
  error(
    errorType: string,
    errorMessage: string,
    metadata?: Record<string, unknown>,
  ): TrackedEvent | null {
    return this.track(
      AnalyticsEvent.ERROR_OCCURRED,
      {
        errorType,
        errorMessage,
        metadata,
      } as EventPropertiesMap[AnalyticsEvent.ERROR_OCCURRED],
      { immediate: true },
    );
  }

  /**
   * Flushes the event queue
   */
  async flush(sync = false): Promise<void> {
    if (this.state.flushing || this.state.queue.length === 0) {
      return;
    }

    this.state.flushing = true;
    const events = [...this.state.queue];
    this.state.queue = [];

    try {
      if (this.config.onFlush) {
        if (
          sync &&
          typeof navigator !== "undefined" &&
          "sendBeacon" in navigator
        ) {
          // Use sendBeacon for sync flush during page unload
          const data = JSON.stringify(events);
          if (this.config.endpoint) {
            navigator.sendBeacon(this.config.endpoint, data);
          }
        } else {
          await this.config.onFlush(events);
        }
      }
      this.persistQueue();
      this.log("Flushed events", { count: events.length });
    } catch (error) {
      // Re-add events to queue on failure
      this.state.queue = [...events, ...this.state.queue].slice(
        0,
        this.config.maxQueueSize,
      );
      this.persistQueue();
      this.config.onError?.(error as Error, "flush");
      this.log("Flush failed", error);
    } finally {
      this.state.flushing = false;
    }
  }

  /**
   * Updates consent state
   */
  setConsent(consent: ConsentState): void {
    this.state.consent = consent;
    if (!this.isEnabled()) {
      this.clearQueue();
    }
    this.log("Consent updated", consent);
  }

  /**
   * Gets the current queue
   */
  getQueue(): TrackedEvent[] {
    return [...this.state.queue];
  }

  /**
   * Gets the queue size
   */
  getQueueSize(): number {
    return this.state.queue.length;
  }

  /**
   * Clears the queue
   */
  clearQueue(): void {
    this.state.queue = [];
    this.persistQueue();
    this.log("Queue cleared");
  }

  /**
   * Gets current state
   */
  getState(): AnalyticsClientState {
    return { ...this.state };
  }

  /**
   * Gets current configuration
   */
  getConfig(): AnalyticsClientConfig {
    return { ...this.config };
  }

  /**
   * Checks if analytics is enabled
   */
  isEnabled(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (this.config.respectDoNotTrack && this.isDoNotTrackEnabled()) {
      return false;
    }

    if (!hasConsent(ConsentCategory.ANALYTICS, this.state.consent)) {
      return false;
    }

    return true;
  }

  /**
   * Destroys the client
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(true);
    this.state.initialized = false;
    this.log("Analytics client destroyed");
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createEvent<T extends AnalyticsEvent>(
    eventName: T,
    properties: Record<string, unknown>,
    options: TrackOptions,
  ): TrackedEvent<T> | null {
    const filteredProperties = options.skipPrivacyFilter
      ? properties
      : this.config.usePrivacyFilter
        ? (this.privacyFilter.filter(properties) as Record<string, unknown>)
        : properties;

    const event: TrackedEvent<T> = {
      id: createEventId(),
      name: eventName,
      category: eventCategoryMap[eventName],
      properties: filteredProperties as any,
      base: this.getBaseProperties(),
    };

    if (!options.skipValidation) {
      const { valid, errors } = validateTrackedEvent(event);
      if (!valid) {
        this.log("Event validation failed", { event, errors });
        this.config.onError?.(
          new Error(`Validation failed: ${errors.join(", ")}`),
          "validation",
        );
        return null;
      }
    }

    return event;
  }

  private getBaseProperties(): BaseEventProperties {
    return {
      timestamp: Date.now(),
      sessionId: this.state.sessionId,
      userId: this.state.userId,
      anonymousId: this.state.anonymousId,
      platform: this.config.platform,
      appVersion: this.config.appVersion,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
  }

  private enqueue(event: TrackedEvent): void {
    this.state.queue.push(event);

    // Trim queue if it exceeds max size
    if (this.state.queue.length > this.config.maxQueueSize) {
      this.state.queue = this.state.queue.slice(-this.config.maxQueueSize);
    }

    // Auto-flush if batch size reached
    if (this.state.queue.length >= this.config.batchSize) {
      this.flush();
    }

    this.persistQueue();
  }

  private filterTraits(traits: UserTraits): UserTraits {
    if (!this.config.usePrivacyFilter) {
      return traits;
    }
    return this.privacyFilter.filter(traits) as UserTraits;
  }

  private getOrCreateAnonymousId(): string {
    if (typeof window === "undefined") {
      return generateAnonymousId();
    }

    try {
      const stored = localStorage.getItem(ANONYMOUS_ID_KEY);
      if (stored) {
        return stored;
      }
      const newId = generateAnonymousId();
      localStorage.setItem(ANONYMOUS_ID_KEY, newId);
      return newId;
    } catch {
      return generateAnonymousId();
    }
  }

  private getOrCreateSessionId(): string {
    if (typeof window === "undefined") {
      return this.createSessionId();
    }

    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        return stored;
      }
      const newId = this.createSessionId();
      sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
      return newId;
    } catch {
      return this.createSessionId();
    }
  }

  private createSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `sess_${timestamp}_${random}`;
  }

  private loadPersistedQueue(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.state.queue = parsed;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private persistQueue(): void {
    if (!this.config.persistQueue || typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.state.queue));
    } catch {
      // Ignore storage errors
    }
  }

  private isDoNotTrackEnabled(): boolean {
    if (typeof navigator === "undefined") {
      return false;
    }
    return (
      navigator.doNotTrack === "1" ||
      (window as { doNotTrack?: string }).doNotTrack === "1"
    );
  }

  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let analyticsInstance: AnalyticsClient | null = null;

/**
 * Gets or creates the analytics client singleton
 */
export function getAnalyticsClient(
  config?: Partial<AnalyticsClientConfig>,
): AnalyticsClient {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsClient(config);
  }
  return analyticsInstance;
}

/**
 * Resets the analytics client singleton (for testing)
 */
export function resetAnalyticsClient(): void {
  if (analyticsInstance) {
    analyticsInstance.destroy();
    analyticsInstance = null;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Tracks an event using the singleton client
 */
export function trackEvent<T extends AnalyticsEvent>(
  eventName: T,
  properties: T extends keyof EventPropertiesMap
    ? EventPropertiesMap[T]
    : Record<string, unknown>,
  options?: TrackOptions,
): TrackedEvent<T> | null {
  return getAnalyticsClient().track(eventName, properties, options);
}

/**
 * Identifies a user using the singleton client
 */
export function identifyUser(userId: string, traits?: UserTraits): void {
  getAnalyticsClient().identify(userId, traits);
}

/**
 * Tracks a page view using the singleton client
 */
export function trackPageView(
  path: string,
  title: string,
  properties?: Record<string, unknown>,
): TrackedEvent | null {
  return getAnalyticsClient().page(path, title, properties);
}

/**
 * Flushes events using the singleton client
 */
export function flushAnalytics(): Promise<void> {
  return getAnalyticsClient().flush();
}
