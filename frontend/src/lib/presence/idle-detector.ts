/**
 * Idle Detector - Detects user inactivity for auto-away functionality
 *
 * Monitors user activity events and triggers callbacks when user becomes idle.
 */

export interface IdleDetectorOptions {
  /**
   * Idle timeout in milliseconds
   * @default 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Events to track as user activity
   * @default ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
   */
  events?: string[];

  /**
   * Whether to track visibility changes
   * @default true
   */
  trackVisibility?: boolean;

  /**
   * Callback when user becomes idle
   */
  onIdle?: () => void;

  /**
   * Callback when user becomes active after being idle
   */
  onActive?: () => void;

  /**
   * Callback when visibility changes
   */
  onVisibilityChange?: (isVisible: boolean) => void;
}

export class IdleDetector {
  private timeout: number;
  private events: string[];
  private trackVisibility: boolean;
  private onIdle?: () => void;
  private onActive?: () => void;
  private onVisibilityChange?: (isVisible: boolean) => void;

  private idleTimer: NodeJS.Timeout | null = null;
  private isIdle = false;
  private isVisible = true;
  private isRunning = false;
  private lastActivityTime: number = Date.now();

  constructor(options: IdleDetectorOptions = {}) {
    this.timeout = options.timeout ?? 5 * 60 * 1000; // 5 minutes
    this.events = options.events ?? [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    this.trackVisibility = options.trackVisibility ?? true;
    this.onIdle = options.onIdle;
    this.onActive = options.onActive;
    this.onVisibilityChange = options.onVisibilityChange;

    // Bind methods
    this.handleActivity = this.handleActivity.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Start monitoring for idle state
   */
  start(): void {
    if (this.isRunning || typeof window === "undefined") return;

    this.isRunning = true;
    this.lastActivityTime = Date.now();

    // Add activity event listeners
    this.events.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Add visibility change listener
    if (this.trackVisibility) {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    // Start idle timer
    this.resetIdleTimer();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Remove event listeners
    this.events.forEach((event) => {
      window.removeEventListener(event, this.handleActivity);
    });

    if (this.trackVisibility) {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }

    // Clear timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Set idle timeout
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
    if (this.isRunning && !this.isIdle) {
      this.resetIdleTimer();
    }
  }

  /**
   * Check if user is currently idle
   */
  getIsIdle(): boolean {
    return this.isIdle;
  }

  /**
   * Check if page is visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get time since last activity in ms
   */
  getTimeSinceActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Manually trigger activity (useful for custom events)
   */
  triggerActivity(): void {
    this.handleActivity();
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: {
    onIdle?: () => void;
    onActive?: () => void;
    onVisibilityChange?: (isVisible: boolean) => void;
  }): void {
    if (callbacks.onIdle !== undefined) this.onIdle = callbacks.onIdle;
    if (callbacks.onActive !== undefined) this.onActive = callbacks.onActive;
    if (callbacks.onVisibilityChange !== undefined) {
      this.onVisibilityChange = callbacks.onVisibilityChange;
    }
  }

  private handleActivity(): void {
    this.lastActivityTime = Date.now();

    // If was idle, trigger active callback
    if (this.isIdle) {
      this.isIdle = false;
      this.onActive?.();
    }

    // Reset timer
    this.resetIdleTimer();
  }

  private handleVisibilityChange(): void {
    const isNowVisible = !document.hidden;
    const wasVisible = this.isVisible;
    this.isVisible = isNowVisible;

    // Notify visibility change
    this.onVisibilityChange?.(isNowVisible);

    if (isNowVisible && !wasVisible) {
      // Page became visible - treat as activity
      this.handleActivity();
    } else if (!isNowVisible && wasVisible) {
      // Page became hidden - may want to set away immediately
      // Don't call handleActivity, just mark idle faster
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }
      // Set idle immediately when page is hidden
      this.isIdle = true;
      this.onIdle?.();
    }
  }

  private resetIdleTimer(): void {
    // Clear existing timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // Don't set timer if page is not visible
    if (!this.isVisible) return;

    // Set new timer
    this.idleTimer = setTimeout(() => {
      this.isIdle = true;
      this.onIdle?.();
    }, this.timeout);
  }
}

/**
 * Create a singleton idle detector instance
 */
let defaultIdleDetector: IdleDetector | null = null;

export const getIdleDetector = (
  options?: IdleDetectorOptions,
): IdleDetector => {
  if (!defaultIdleDetector) {
    defaultIdleDetector = new IdleDetector(options);
  }
  return defaultIdleDetector;
};

export const destroyIdleDetector = (): void => {
  if (defaultIdleDetector) {
    defaultIdleDetector.stop();
    defaultIdleDetector = null;
  }
};
