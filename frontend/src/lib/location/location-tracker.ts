/**
 * Location Tracker
 *
 * Tracks user's location using the Geolocation API.
 * Supports both one-time position requests and continuous tracking.
 */

import {
  type Coordinates,
  type PositionOptions,
  type LocationError,
  DEFAULT_POSITION_OPTIONS,
  createLocationError,
} from "./location-types";
import {
  isGeolocationSupported,
  checkLocationPermission,
} from "./location-permissions";

// ============================================================================
// Types
// ============================================================================

/**
 * Tracking state.
 */
export type TrackingState = "idle" | "tracking" | "error";

/**
 * Callback for position updates.
 */
export type PositionCallback = (coordinates: Coordinates) => void;

/**
 * Callback for errors.
 */
export type ErrorCallback = (error: LocationError) => void;

/**
 * Location tracker options.
 */
export interface TrackerOptions extends PositionOptions {
  /** Minimum distance change to trigger update (meters) */
  minDistanceChange?: number;
  /** Minimum time between updates (milliseconds) */
  minUpdateInterval?: number;
  /** Callback for position updates */
  onPosition?: PositionCallback;
  /** Callback for errors */
  onError?: ErrorCallback;
}

// ============================================================================
// Position Conversion
// ============================================================================

/**
 * Convert GeolocationPosition to Coordinates.
 */
export function positionToCoordinates(
  position: GeolocationPosition,
): Coordinates {
  const { coords } = position;

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude ?? undefined,
    accuracy: coords.accuracy,
    altitudeAccuracy: coords.altitudeAccuracy ?? undefined,
    heading: coords.heading ?? undefined,
    speed: coords.speed ?? undefined,
  };
}

// ============================================================================
// One-time Position
// ============================================================================

/**
 * Get the current position once.
 */
export async function getCurrentPosition(
  options: PositionOptions = DEFAULT_POSITION_OPTIONS,
): Promise<Coordinates> {
  if (!isGeolocationSupported()) {
    throw createLocationError({
      code: 1,
      message: "Geolocation not supported",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError);
  }

  // Check permission first
  const permission = await checkLocationPermission();
  if (permission.state === "denied") {
    throw {
      code: "PERMISSION_DENIED",
      message: permission.error || "Location permission denied",
    } as LocationError;
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(positionToCoordinates(position));
      },
      (error) => {
        reject(createLocationError(error));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 5000,
      },
    );
  });
}

// ============================================================================
// Location Tracker Class
// ============================================================================

/**
 * Location tracker for continuous position updates.
 */
export class LocationTracker {
  private watchId: number | null = null;
  private lastPosition: Coordinates | null = null;
  private lastUpdateTime: number = 0;
  private state: TrackingState = "idle";
  private options: TrackerOptions;

  constructor(options: TrackerOptions = {}) {
    this.options = {
      ...DEFAULT_POSITION_OPTIONS,
      minDistanceChange: 10, // 10 meters
      minUpdateInterval: 1000, // 1 second
      ...options,
    };
  }

  /**
   * Get current tracking state.
   */
  getState(): TrackingState {
    return this.state;
  }

  /**
   * Get last known position.
   */
  getLastPosition(): Coordinates | null {
    return this.lastPosition;
  }

  /**
   * Check if tracking is active.
   */
  isTracking(): boolean {
    return this.state === "tracking";
  }

  /**
   * Start tracking location.
   */
  start(): void {
    if (!isGeolocationSupported()) {
      this.handleError(
        createLocationError(new Error("Geolocation not supported")),
      );
      return;
    }

    if (this.watchId !== null) {
      return; // Already tracking
    }

    this.state = "tracking";

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(createLocationError(error)),
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge,
      },
    );
  }

  /**
   * Stop tracking location.
   */
  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.state = "idle";
  }

  /**
   * Update tracker options.
   */
  updateOptions(options: Partial<TrackerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Handle position update.
   */
  private handlePosition(position: GeolocationPosition): void {
    const coordinates = positionToCoordinates(position);
    const now = Date.now();

    // Check minimum update interval
    if (
      this.options.minUpdateInterval &&
      now - this.lastUpdateTime < this.options.minUpdateInterval
    ) {
      return;
    }

    // Check minimum distance change
    if (
      this.lastPosition &&
      this.options.minDistanceChange &&
      this.calculateDistance(this.lastPosition, coordinates) <
        this.options.minDistanceChange
    ) {
      return;
    }

    this.lastPosition = coordinates;
    this.lastUpdateTime = now;
    this.state = "tracking";

    this.options.onPosition?.(coordinates);
  }

  /**
   * Handle error.
   */
  private handleError(error: LocationError): void {
    this.state = "error";
    this.options.onError?.(error);
  }

  /**
   * Calculate distance between two coordinates in meters.
   * Uses the Haversine formula.
   */
  private calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Destroy tracker and clean up.
   */
  destroy(): void {
    this.stop();
    this.lastPosition = null;
    this.lastUpdateTime = 0;
    this.options.onPosition = undefined;
    this.options.onError = undefined;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a location tracker with default options.
 */
export function createLocationTracker(
  options?: TrackerOptions,
): LocationTracker {
  return new LocationTracker(options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format coordinates as a string.
 */
export function formatCoordinates(
  coords: Coordinates,
  precision: number = 6,
): string {
  const lat = coords.latitude.toFixed(precision);
  const lon = coords.longitude.toFixed(precision);
  return `${lat}, ${lon}`;
}

/**
 * Format coordinates in DMS (degrees, minutes, seconds).
 */
export function formatCoordinatesDMS(coords: Coordinates): string {
  const formatDMS = (decimal: number, isLat: boolean): string => {
    const direction = isLat
      ? decimal >= 0
        ? "N"
        : "S"
      : decimal >= 0
        ? "E"
        : "W";
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesDecimal = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = ((minutesDecimal - minutes) * 60).toFixed(1);

    return `${degrees}\u00b0${minutes}'${seconds}"${direction}`;
  };

  return `${formatDMS(coords.latitude, true)} ${formatDMS(coords.longitude, false)}`;
}

/**
 * Get accuracy description.
 */
export function getAccuracyDescription(accuracy: number): string {
  if (accuracy < 5) {
    return "Very precise";
  }
  if (accuracy < 20) {
    return "Precise";
  }
  if (accuracy < 100) {
    return "Good";
  }
  if (accuracy < 500) {
    return "Approximate";
  }
  return "Rough";
}

/**
 * Check if coordinates are valid.
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    typeof coords.latitude === "number" &&
    typeof coords.longitude === "number" &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180 &&
    !isNaN(coords.latitude) &&
    !isNaN(coords.longitude)
  );
}
