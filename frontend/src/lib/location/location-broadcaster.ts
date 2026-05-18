/**
 * Location Broadcaster
 *
 * Manages broadcasting live location updates via socket.io.
 */

import {
  type Coordinates,
  type LiveLocation,
  type LocationSharingDuration,
  type LocationUpdateEvent,
  type LocationStartedEvent,
  type LocationStoppedEvent,
  SHARING_DURATION_OPTIONS,
} from "./location-types";
import {
  LocationTracker,
  type TrackerOptions,
  type PositionCallback,
  type ErrorCallback,
} from "./location-tracker";
import { reverseGeocode } from "./geocoding";

// ============================================================================
// Types
// ============================================================================

/**
 * Broadcaster state.
 */
export type BroadcasterState = "idle" | "broadcasting" | "paused" | "error";

/**
 * Broadcaster options.
 */
export interface BroadcasterOptions {
  /** Location tracking options */
  trackerOptions?: TrackerOptions;
  /** Socket instance (or socket-like interface) */
  socket?: {
    emit: (event: string, data: unknown) => void;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
  };
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Include reverse geocoded address in updates */
  includeAddress?: boolean;
  /** Callback when broadcast starts */
  onStart?: (location: LiveLocation) => void;
  /** Callback when position updates */
  onUpdate?: (event: LocationUpdateEvent) => void;
  /** Callback when broadcast stops */
  onStop?: (reason: LocationStoppedEvent["reason"]) => void;
  /** Callback for errors */
  onError?: ErrorCallback;
}

// ============================================================================
// Socket Event Names
// ============================================================================

export const LocationSocketEvents = {
  UPDATE: "location:update",
  STARTED: "location:started",
  STOPPED: "location:stopped",
} as const;

// ============================================================================
// Location Broadcaster Class
// ============================================================================

/**
 * Broadcasts live location updates to other users.
 */
export class LocationBroadcaster {
  private tracker: LocationTracker;
  private state: BroadcasterState = "idle";
  private options: BroadcasterOptions;
  private currentLocation: LiveLocation | null = null;
  private updateIntervalId: ReturnType<typeof setInterval> | null = null;
  private expirationTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private pendingUpdate: Coordinates | null = null;

  constructor(options: BroadcasterOptions = {}) {
    this.options = {
      updateInterval: 5000, // 5 seconds
      includeAddress: false,
      ...options,
    };

    // Create tracker with callbacks
    this.tracker = new LocationTracker({
      ...this.options.trackerOptions,
      onPosition: this.handlePositionUpdate.bind(this),
      onError: this.handleTrackerError.bind(this),
    });
  }

  /**
   * Get current broadcaster state.
   */
  getState(): BroadcasterState {
    return this.state;
  }

  /**
   * Get current live location data.
   */
  getCurrentLocation(): LiveLocation | null {
    return this.currentLocation;
  }

  /**
   * Check if broadcasting is active.
   */
  isBroadcasting(): boolean {
    return this.state === "broadcasting";
  }

  /**
   * Get remaining time in milliseconds.
   */
  getRemainingTime(): number {
    if (!this.currentLocation) {
      return 0;
    }
    const now = Date.now();
    const expiresAt = new Date(this.currentLocation.expiresAt).getTime();
    return Math.max(0, expiresAt - now);
  }

  /**
   * Start broadcasting live location.
   */
  async start(
    duration: LocationSharingDuration,
    userId: string,
    userInfo: LiveLocation["user"],
    contextId: string,
    contextType: "channel" | "dm",
  ): Promise<LiveLocation> {
    if (this.state === "broadcasting") {
      throw new Error("Already broadcasting location");
    }

    // Start tracking
    this.tracker.start();

    // Wait for initial position
    const initialPosition = await this.waitForPosition();

    // Create live location
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    this.currentLocation = {
      type: "live",
      id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      coordinates: initialPosition,
      user: userInfo,
      startedAt: now,
      expiresAt,
      duration,
      lastUpdatedAt: now,
      isActive: true,
    };

    // Optionally get address
    if (this.options.includeAddress) {
      try {
        const geocoded = await reverseGeocode(initialPosition);
        if (geocoded.success && geocoded.address) {
          this.currentLocation.address = geocoded.address;
        }
      } catch {
        // Ignore geocoding errors
      }
    }

    this.state = "broadcasting";

    // Start update interval
    this.startUpdateInterval();

    // Set expiration timeout
    this.setExpirationTimeout();

    // Emit started event
    this.emitStarted(contextId, contextType);

    // Call callback
    this.options.onStart?.(this.currentLocation);

    return this.currentLocation;
  }

  /**
   * Stop broadcasting location.
   */
  stop(reason: LocationStoppedEvent["reason"] = "user_stopped"): void {
    if (this.state === "idle") {
      return;
    }

    // Stop tracking
    this.tracker.stop();

    // Clear intervals and timeouts
    this.clearUpdateInterval();
    this.clearExpirationTimeout();

    // Update state
    if (this.currentLocation) {
      this.currentLocation.isActive = false;
    }

    // Emit stopped event
    this.emitStopped(reason);

    // Reset state
    this.state = "idle";
    this.currentLocation = null;
    this.pendingUpdate = null;

    // Call callback
    this.options.onStop?.(reason);
  }

  /**
   * Pause broadcasting (keep tracking but don't emit).
   */
  pause(): void {
    if (this.state === "broadcasting") {
      this.state = "paused";
      this.clearUpdateInterval();
    }
  }

  /**
   * Resume broadcasting after pause.
   */
  resume(): void {
    if (this.state === "paused") {
      this.state = "broadcasting";
      this.startUpdateInterval();
    }
  }

  /**
   * Extend sharing duration.
   */
  extend(additionalMinutes: LocationSharingDuration): void {
    if (!this.currentLocation || !this.isBroadcasting()) {
      return;
    }

    const newExpiresAt = new Date(
      this.currentLocation.expiresAt.getTime() + additionalMinutes * 60 * 1000,
    );
    this.currentLocation.expiresAt = newExpiresAt;
    this.currentLocation.duration = (this.currentLocation.duration +
      additionalMinutes) as LocationSharingDuration;

    // Reset expiration timeout
    this.clearExpirationTimeout();
    this.setExpirationTimeout();
  }

  /**
   * Update socket instance.
   */
  setSocket(socket: BroadcasterOptions["socket"]): void {
    this.options.socket = socket;
  }

  /**
   * Destroy broadcaster and clean up.
   */
  destroy(): void {
    this.stop();
    this.tracker.destroy();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handlePositionUpdate(coordinates: Coordinates): void {
    if (!this.currentLocation) {
      return;
    }

    // Store pending update
    this.pendingUpdate = coordinates;

    // Update current location
    this.currentLocation.coordinates = coordinates;
    this.currentLocation.lastUpdatedAt = new Date();
    this.currentLocation.heading = coordinates.heading;
    this.currentLocation.speed = coordinates.speed;
  }

  private handleTrackerError(error: unknown): void {
    this.state = "error";
    this.options.onError?.(error as Parameters<ErrorCallback>[0]);
  }

  private async waitForPosition(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds with 100ms interval

      const checkPosition = () => {
        const position = this.tracker.getLastPosition();
        if (position) {
          resolve(position);
        } else if (attempts >= maxAttempts) {
          reject(new Error("Timeout waiting for position"));
        } else {
          attempts++;
          setTimeout(checkPosition, 100);
        }
      };

      checkPosition();
    });
  }

  private startUpdateInterval(): void {
    this.clearUpdateInterval();

    this.updateIntervalId = setInterval(() => {
      if (this.pendingUpdate && this.currentLocation) {
        this.emitUpdate();
        this.pendingUpdate = null;
      }
    }, this.options.updateInterval);
  }

  private clearUpdateInterval(): void {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  private setExpirationTimeout(): void {
    if (!this.currentLocation) {
      return;
    }

    const remainingTime = this.getRemainingTime();

    this.expirationTimeoutId = setTimeout(() => {
      this.stop("expired");
    }, remainingTime);
  }

  private clearExpirationTimeout(): void {
    if (this.expirationTimeoutId) {
      clearTimeout(this.expirationTimeoutId);
      this.expirationTimeoutId = null;
    }
  }

  private emitStarted(contextId: string, contextType: "channel" | "dm"): void {
    if (!this.options.socket || !this.currentLocation) {
      return;
    }

    const event: LocationStartedEvent = {
      location: this.currentLocation,
      contextId,
      contextType,
      messageId: "", // Set by server
    };

    this.options.socket.emit(LocationSocketEvents.STARTED, event);
  }

  private async emitUpdate(): Promise<void> {
    if (!this.options.socket || !this.currentLocation || !this.pendingUpdate) {
      return;
    }

    const event: LocationUpdateEvent = {
      locationId: this.currentLocation.id,
      userId: this.currentLocation.user.id,
      coordinates: this.pendingUpdate,
      heading: this.pendingUpdate.heading,
      speed: this.pendingUpdate.speed,
      timestamp: new Date().toISOString(),
    };

    // Optionally include address
    if (this.options.includeAddress) {
      try {
        const geocoded = await reverseGeocode(this.pendingUpdate);
        if (geocoded.success && geocoded.address) {
          event.address = geocoded.address;
          this.currentLocation.address = geocoded.address;
        }
      } catch {
        // Ignore geocoding errors
      }
    }

    this.options.socket.emit(LocationSocketEvents.UPDATE, event);

    // Call callback
    this.options.onUpdate?.(event);
  }

  private emitStopped(reason: LocationStoppedEvent["reason"]): void {
    if (!this.options.socket || !this.currentLocation) {
      return;
    }

    const event: LocationStoppedEvent = {
      locationId: this.currentLocation.id,
      userId: this.currentLocation.user.id,
      reason,
      stoppedAt: new Date().toISOString(),
    };

    this.options.socket.emit(LocationSocketEvents.STOPPED, event);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a location broadcaster.
 */
export function createLocationBroadcaster(
  options?: BroadcasterOptions,
): LocationBroadcaster {
  return new LocationBroadcaster(options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format remaining time for display.
 */
export function formatRemainingTime(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "Expired";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m remaining`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s remaining`;
  }

  return `${seconds}s remaining`;
}

/**
 * Get duration label.
 */
export function getDurationLabel(duration: LocationSharingDuration): string {
  const option = SHARING_DURATION_OPTIONS.find((o) => o.duration === duration);
  return option?.label || `${duration} minutes`;
}
