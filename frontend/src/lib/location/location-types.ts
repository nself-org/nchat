/**
 * Location Types for nself-chat
 *
 * Core type definitions for location sharing, live locations, and geolocation features.
 * Inspired by Telegram's location sharing functionality.
 */

import type { MessageUser } from "@/types/message";

// ============================================================================
// Coordinates & Basic Types
// ============================================================================

/**
 * Geographic coordinates.
 */
export interface Coordinates {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** Altitude in meters (optional) */
  altitude?: number;
  /** Accuracy of position in meters */
  accuracy?: number;
  /** Accuracy of altitude in meters */
  altitudeAccuracy?: number;
  /** Heading/bearing in degrees (0-360, clockwise from north) */
  heading?: number;
  /** Speed in meters per second */
  speed?: number;
}

/**
 * Address components from reverse geocoding.
 */
export interface GeocodedAddress {
  /** Full formatted address */
  formattedAddress: string;
  /** Street number */
  streetNumber?: string;
  /** Street name */
  street?: string;
  /** Neighborhood/district */
  neighborhood?: string;
  /** City/locality */
  city?: string;
  /** State/region */
  state?: string;
  /** Postal/ZIP code */
  postalCode?: string;
  /** Country */
  country?: string;
  /** ISO country code (2-letter) */
  countryCode?: string;
}

/**
 * A named place or point of interest.
 */
export interface Place {
  /** Place ID (from maps provider) */
  id: string;
  /** Place name */
  name: string;
  /** Place address */
  address: string;
  /** Place coordinates */
  coordinates: Coordinates;
  /** Place category/type */
  category?: PlaceCategory;
  /** Distance from current location in meters */
  distance?: number;
  /** Place icon URL */
  iconUrl?: string;
  /** Rating (0-5) */
  rating?: number;
  /** Whether place is currently open */
  isOpen?: boolean;
  /** Place photo URL */
  photoUrl?: string;
}

/**
 * Categories for places.
 */
export type PlaceCategory =
  | "restaurant"
  | "cafe"
  | "bar"
  | "store"
  | "hotel"
  | "hospital"
  | "pharmacy"
  | "gas_station"
  | "parking"
  | "transit"
  | "airport"
  | "school"
  | "gym"
  | "park"
  | "museum"
  | "church"
  | "bank"
  | "atm"
  | "other";

// ============================================================================
// Location Sharing Types
// ============================================================================

/**
 * Duration options for live location sharing.
 */
export type LocationSharingDuration =
  | 15 // 15 minutes
  | 60 // 1 hour
  | 480; // 8 hours

/**
 * Duration option with label.
 */
export interface DurationOption {
  /** Duration in minutes */
  duration: LocationSharingDuration;
  /** Display label */
  label: string;
  /** Short label */
  shortLabel: string;
}

/**
 * Available duration options.
 */
export const SHARING_DURATION_OPTIONS: DurationOption[] = [
  { duration: 15, label: "15 minutes", shortLabel: "15m" },
  { duration: 60, label: "1 hour", shortLabel: "1h" },
  { duration: 480, label: "8 hours", shortLabel: "8h" },
];

/**
 * Type of location share.
 */
export type LocationShareType = "static" | "live";

/**
 * Static location share (one-time pin drop).
 */
export interface StaticLocation {
  /** Share type */
  type: "static";
  /** Location ID */
  id: string;
  /** Coordinates */
  coordinates: Coordinates;
  /** Address (if reverse geocoded) */
  address?: GeocodedAddress;
  /** Custom label for this location */
  label?: string;
  /** Thumbnail image URL (map preview) */
  thumbnailUrl?: string;
  /** User who shared */
  sharedBy: MessageUser;
  /** When location was shared */
  sharedAt: Date;
}

/**
 * Live location share (real-time updates).
 */
export interface LiveLocation {
  /** Share type */
  type: "live";
  /** Location ID */
  id: string;
  /** Current coordinates */
  coordinates: Coordinates;
  /** Address (if reverse geocoded) */
  address?: GeocodedAddress;
  /** User sharing location */
  user: MessageUser;
  /** When sharing started */
  startedAt: Date;
  /** When sharing will end */
  expiresAt: Date;
  /** Duration in minutes */
  duration: LocationSharingDuration;
  /** When coordinates were last updated */
  lastUpdatedAt: Date;
  /** Whether sharing is still active */
  isActive: boolean;
  /** Heading/direction user is facing */
  heading?: number;
  /** Speed in meters/second */
  speed?: number;
}

/**
 * Union type for any location share.
 */
export type LocationShare = StaticLocation | LiveLocation;

/**
 * Check if a location is live.
 */
export function isLiveLocation(
  location: LocationShare,
): location is LiveLocation {
  return location.type === "live";
}

/**
 * Check if a location is static.
 */
export function isStaticLocation(
  location: LocationShare,
): location is StaticLocation {
  return location.type === "static";
}

// ============================================================================
// Location Permission Types
// ============================================================================

/**
 * Browser geolocation permission state.
 */
export type LocationPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable";

/**
 * Location permission result.
 */
export interface LocationPermissionResult {
  /** Current permission state */
  state: LocationPermissionState;
  /** Whether permission is granted */
  isGranted: boolean;
  /** Error message if denied/unavailable */
  error?: string;
}

/**
 * Geolocation position options.
 */
export interface PositionOptions {
  /** Enable high accuracy (GPS) */
  enableHighAccuracy?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum age of cached position in milliseconds */
  maximumAge?: number;
}

/**
 * Default position options.
 */
export const DEFAULT_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

// ============================================================================
// Location Privacy Settings
// ============================================================================

/**
 * Who can see user's location.
 */
export type LocationVisibility = "everyone" | "contacts" | "nobody";

/**
 * Location privacy settings.
 */
export interface LocationPrivacySettings {
  /** Who can see when you share location */
  locationVisibility: LocationVisibility;
  /** Whether to save location history */
  saveLocationHistory: boolean;
  /** Auto-delete location history after days (0 = never) */
  locationHistoryRetentionDays: number;
  /** Whether to show approximate location instead of exact */
  useApproximateLocation: boolean;
  /** Whether to show nearby places */
  showNearbyPlaces: boolean;
  /** Default sharing duration */
  defaultSharingDuration: LocationSharingDuration;
}

/**
 * Default location privacy settings.
 */
export const DEFAULT_LOCATION_PRIVACY: LocationPrivacySettings = {
  locationVisibility: "everyone",
  saveLocationHistory: false,
  locationHistoryRetentionDays: 0,
  useApproximateLocation: false,
  showNearbyPlaces: true,
  defaultSharingDuration: 15,
};

// ============================================================================
// Location History
// ============================================================================

/**
 * A location history entry.
 */
export interface LocationHistoryEntry {
  /** Entry ID */
  id: string;
  /** Coordinates */
  coordinates: Coordinates;
  /** Address */
  address?: GeocodedAddress;
  /** When this location was recorded */
  timestamp: Date;
  /** Context (channel, dm, etc.) */
  context?: {
    type: "channel" | "dm" | "group";
    id: string;
    name: string;
  };
  /** Type of share (static/live) */
  shareType: LocationShareType;
}

// ============================================================================
// Location Message Types
// ============================================================================

/**
 * Location message data (attached to a message).
 */
export interface LocationMessageData {
  /** Location share data */
  location: LocationShare;
  /** Map preview image URL */
  previewImageUrl?: string;
  /** Whether user can get directions */
  canGetDirections: boolean;
}

// ============================================================================
// Socket Event Types
// ============================================================================

/**
 * Location update socket event.
 */
export interface LocationUpdateEvent {
  /** Location ID */
  locationId: string;
  /** User ID */
  userId: string;
  /** New coordinates */
  coordinates: Coordinates;
  /** Updated address */
  address?: GeocodedAddress;
  /** Heading */
  heading?: number;
  /** Speed */
  speed?: number;
  /** Update timestamp */
  timestamp: string;
}

/**
 * Location sharing started socket event.
 */
export interface LocationStartedEvent {
  /** Location share data */
  location: LiveLocation;
  /** Channel or DM ID */
  contextId: string;
  /** Context type */
  contextType: "channel" | "dm";
  /** Message ID containing the location */
  messageId: string;
}

/**
 * Location sharing stopped socket event.
 */
export interface LocationStoppedEvent {
  /** Location ID */
  locationId: string;
  /** User ID who stopped sharing */
  userId: string;
  /** Why sharing stopped */
  reason: "user_stopped" | "expired" | "error";
  /** When sharing stopped */
  stoppedAt: string;
}

// ============================================================================
// Map Types
// ============================================================================

/**
 * Map viewport/bounds.
 */
export interface MapBounds {
  /** Northeast corner */
  northeast: Coordinates;
  /** Southwest corner */
  southwest: Coordinates;
}

/**
 * Map configuration.
 */
export interface MapConfig {
  /** Center coordinates */
  center: Coordinates;
  /** Zoom level (1-20) */
  zoom: number;
  /** Map style (light, dark, satellite, etc.) */
  style?: "light" | "dark" | "satellite" | "terrain";
  /** Whether to show traffic */
  showTraffic?: boolean;
  /** Whether to show user's location */
  showMyLocation?: boolean;
}

/**
 * Default map configuration.
 */
export const DEFAULT_MAP_CONFIG: MapConfig = {
  center: { latitude: 0, longitude: 0 },
  zoom: 15,
  style: "light",
  showTraffic: false,
  showMyLocation: true,
};

// ============================================================================
// Marker Types
// ============================================================================

/**
 * Map marker for location display.
 */
export interface LocationMarker {
  /** Marker ID */
  id: string;
  /** Coordinates */
  coordinates: Coordinates;
  /** Marker type */
  type: "user" | "place" | "pin";
  /** Label text */
  label?: string;
  /** Marker color */
  color?: string;
  /** User info (if user marker) */
  user?: MessageUser;
  /** Whether marker is animated (for live location) */
  isAnimated?: boolean;
  /** Heading for direction indicator */
  heading?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Location error codes.
 */
export type LocationErrorCode =
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "NOT_SUPPORTED"
  | "GEOCODING_FAILED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

/**
 * Location error.
 */
export interface LocationError {
  /** Error code */
  code: LocationErrorCode;
  /** Error message */
  message: string;
  /** Original error */
  originalError?: Error | GeolocationPositionError;
}

/**
 * Create a location error from GeolocationPositionError.
 */
export function createLocationError(
  error: GeolocationPositionError | Error | unknown,
): LocationError {
  if (error instanceof GeolocationPositionError) {
    switch (error.code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        return {
          code: "PERMISSION_DENIED",
          message:
            "Location permission was denied. Please enable location access in your browser settings.",
          originalError: error,
        };
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        return {
          code: "POSITION_UNAVAILABLE",
          message: "Unable to determine your location. Please try again.",
          originalError: error,
        };
      case GeolocationPositionError.TIMEOUT:
        return {
          code: "TIMEOUT",
          message: "Location request timed out. Please try again.",
          originalError: error,
        };
    }
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN",
      message: error.message || "An unknown error occurred",
      originalError: error,
    };
  }

  return {
    code: "UNKNOWN",
    message: "An unknown error occurred while getting location",
  };
}
