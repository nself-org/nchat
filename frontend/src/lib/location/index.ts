/**
 * Location Module
 *
 * Exports all location-related utilities for nself-chat.
 * Provides live location sharing (like Telegram) functionality.
 */

// Types
export {
  // Coordinate types
  type Coordinates,
  type GeocodedAddress,
  type Place,
  type PlaceCategory,

  // Location sharing types
  type LocationSharingDuration,
  type DurationOption,
  type LocationShareType,
  type StaticLocation,
  type LiveLocation,
  type LocationShare,

  // Permission types
  type LocationPermissionState,
  type LocationPermissionResult,
  type PositionOptions,

  // Privacy settings
  type LocationVisibility,
  type LocationPrivacySettings,

  // History
  type LocationHistoryEntry,

  // Message types
  type LocationMessageData,

  // Socket event types
  type LocationUpdateEvent,
  type LocationStartedEvent,
  type LocationStoppedEvent,

  // Map types
  type MapBounds,
  type MapConfig,
  type LocationMarker,

  // Error types
  type LocationErrorCode,
  type LocationError,

  // Constants
  SHARING_DURATION_OPTIONS,
  DEFAULT_POSITION_OPTIONS,
  DEFAULT_LOCATION_PRIVACY,
  DEFAULT_MAP_CONFIG,

  // Type guards
  isLiveLocation,
  isStaticLocation,

  // Error helpers
  createLocationError,
} from "./location-types";

// Permission handling
export {
  isGeolocationSupported,
  getLocationPermissionState,
  isLocationPermissionGranted,
  watchLocationPermission,
  requestLocationPermission,
  checkLocationPermission,
  getPermissionMessage,
  getPermissionInstructions,
  isPermissionDeniedError,
  canRetryLocation,
} from "./location-permissions";

// Location tracking
export {
  type TrackingState,
  type PositionCallback,
  type ErrorCallback,
  type TrackerOptions,
  LocationTracker,
  createLocationTracker,
  getCurrentPosition,
  positionToCoordinates,
  formatCoordinates,
  formatCoordinatesDMS,
  getAccuracyDescription,
  isValidCoordinates,
} from "./location-tracker";

// Distance calculations
export {
  type DistanceUnit,
  convertDistance,
  calculateDistance,
  calculateBearing,
  getCardinalDirection,
  getCardinalDirectionFull,
  formatDistance,
  formatDistanceForUI,
  formatTravelTime,
  calculateBoundingBox,
  isWithinBounds,
  isWithinRadius,
  calculateMidpoint,
  calculateDestinationPoint,
} from "./distance-calculator";

// Geocoding
export {
  type GeocodingProvider,
  type GeocodingResult,
  type ReverseGeocodingOptions,
  type PlacesSearchOptions,
  reverseGeocode,
  geocodeAddress,
  searchNearbyPlaces,
  searchPlaces,
  formatAddress,
  getPlaceCategoryIcon,
  getPlaceCategoryName,
  getGeocodingProviderStatus,
} from "./geocoding";

// Location broadcasting
export {
  type BroadcasterState,
  type BroadcasterOptions,
  LocationBroadcaster,
  LocationSocketEvents,
  createLocationBroadcaster,
  formatRemainingTime,
  getDurationLabel,
} from "./location-broadcaster";

// Location manager
export {
  type LocationManagerState,
  type LocationManagerOptions,
  type ShareLocationResult,
  LocationManager,
  createLocationManager,
  getDirectionsUrl,
  getAppleMapsUrl,
  getShareableLocationUrl,
  openDirections,
  copyCoordinates,
} from "./location-manager";
