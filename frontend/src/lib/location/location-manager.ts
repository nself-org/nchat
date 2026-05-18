/**
 * Location Manager
 *
 * High-level manager for all location sharing functionality.
 * Coordinates tracking, broadcasting, and receiving location updates.
 */

import {
  type Coordinates,
  type LiveLocation,
  type StaticLocation,
  type LocationShare,
  type LocationSharingDuration,
  type LocationPrivacySettings,
  type LocationUpdateEvent,
  type LocationStartedEvent,
  type LocationStoppedEvent,
  type LocationError,
  DEFAULT_LOCATION_PRIVACY,
  isLiveLocation,
} from "./location-types";
import {
  LocationBroadcaster,
  LocationSocketEvents,
  type BroadcasterOptions,
} from "./location-broadcaster";
import { getCurrentPosition, formatCoordinates } from "./location-tracker";
import {
  checkLocationPermission,
  requestLocationPermission,
} from "./location-permissions";
import { reverseGeocode } from "./geocoding";

// ============================================================================
// Types
// ============================================================================

/**
 * Location manager state.
 */
export interface LocationManagerState {
  /** Whether permission is granted */
  hasPermission: boolean;
  /** Current position (if known) */
  currentPosition: Coordinates | null;
  /** Active outgoing live location (user is sharing) */
  outgoingLocation: LiveLocation | null;
  /** Active incoming live locations (others sharing with user) */
  incomingLocations: Map<string, LiveLocation>;
  /** Privacy settings */
  privacySettings: LocationPrivacySettings;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: LocationError | null;
}

/**
 * Location manager options.
 */
export interface LocationManagerOptions extends BroadcasterOptions {
  /** Initial privacy settings */
  privacySettings?: LocationPrivacySettings;
  /** Callback when state changes */
  onStateChange?: (state: LocationManagerState) => void;
  /** Callback when location is received from others */
  onLocationReceived?: (location: LiveLocation) => void;
  /** Callback when someone stops sharing */
  onLocationEnded?: (locationId: string, userId: string) => void;
}

/**
 * Result of sharing location.
 */
export interface ShareLocationResult {
  success: boolean;
  location?: LocationShare;
  error?: string;
}

// ============================================================================
// Location Manager Class
// ============================================================================

/**
 * Manages all location sharing functionality.
 */
export class LocationManager {
  private broadcaster: LocationBroadcaster;
  private options: LocationManagerOptions;
  private state: LocationManagerState;
  private socketListeners: Map<string, (...args: unknown[]) => void> =
    new Map();

  constructor(options: LocationManagerOptions = {}) {
    this.options = {
      privacySettings: DEFAULT_LOCATION_PRIVACY,
      ...options,
    };

    this.state = {
      hasPermission: false,
      currentPosition: null,
      outgoingLocation: null,
      incomingLocations: new Map(),
      privacySettings: this.options.privacySettings || DEFAULT_LOCATION_PRIVACY,
      isLoading: false,
      error: null,
    };

    this.broadcaster = new LocationBroadcaster({
      ...options,
      onStart: this.handleBroadcastStart.bind(this),
      onUpdate: this.handleBroadcastUpdate.bind(this),
      onStop: this.handleBroadcastStop.bind(this),
      onError: this.handleBroadcastError.bind(this),
    });

    // Set up socket listeners if socket is provided
    if (options.socket) {
      this.setupSocketListeners(options.socket);
    }
  }

  // ============================================================================
  // Public Methods - State
  // ============================================================================

  /**
   * Get current state.
   */
  getState(): LocationManagerState {
    return { ...this.state };
  }

  /**
   * Check if user is currently sharing their location.
   */
  isSharing(): boolean {
    return this.broadcaster.isBroadcasting();
  }

  /**
   * Get outgoing location.
   */
  getOutgoingLocation(): LiveLocation | null {
    return this.state.outgoingLocation;
  }

  /**
   * Get incoming locations.
   */
  getIncomingLocations(): LiveLocation[] {
    return Array.from(this.state.incomingLocations.values());
  }

  /**
   * Get a specific incoming location.
   */
  getIncomingLocation(locationId: string): LiveLocation | undefined {
    return this.state.incomingLocations.get(locationId);
  }

  // ============================================================================
  // Public Methods - Permission
  // ============================================================================

  /**
   * Check location permission.
   */
  async checkPermission(): Promise<boolean> {
    const result = await checkLocationPermission();
    this.updateState({ hasPermission: result.isGranted });
    return result.isGranted;
  }

  /**
   * Request location permission.
   */
  async requestPermission(): Promise<boolean> {
    const result = await requestLocationPermission();
    this.updateState({ hasPermission: result.isGranted });
    return result.isGranted;
  }

  // ============================================================================
  // Public Methods - Position
  // ============================================================================

  /**
   * Get current position.
   */
  async getCurrentPosition(): Promise<Coordinates | null> {
    this.updateState({ isLoading: true, error: null });

    try {
      const position = await getCurrentPosition();
      this.updateState({
        currentPosition: position,
        hasPermission: true,
        isLoading: false,
      });
      return position;
    } catch (error) {
      this.updateState({
        error: error as LocationError,
        isLoading: false,
      });
      return null;
    }
  }

  // ============================================================================
  // Public Methods - Sharing
  // ============================================================================

  /**
   * Share static location (one-time pin).
   */
  async shareStaticLocation(
    userId: string,
    userInfo: StaticLocation["sharedBy"],
    coordinates?: Coordinates,
  ): Promise<ShareLocationResult> {
    this.updateState({ isLoading: true, error: null });

    try {
      // Get coordinates if not provided
      const coords = coordinates || (await getCurrentPosition());

      // Reverse geocode to get address
      let address;
      try {
        const geocoded = await reverseGeocode(coords);
        if (geocoded.success) {
          address = geocoded.address;
        }
      } catch {
        // Ignore geocoding errors
      }

      const staticLocation: StaticLocation = {
        type: "static",
        id: `loc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        coordinates: coords,
        address,
        sharedBy: userInfo,
        sharedAt: new Date(),
      };

      this.updateState({ isLoading: false });

      return {
        success: true,
        location: staticLocation,
      };
    } catch (error) {
      const locationError = error as LocationError;
      this.updateState({
        error: locationError,
        isLoading: false,
      });
      return {
        success: false,
        error: locationError.message,
      };
    }
  }

  /**
   * Start sharing live location.
   */
  async startLiveLocation(
    duration: LocationSharingDuration,
    userId: string,
    userInfo: LiveLocation["user"],
    contextId: string,
    contextType: "channel" | "dm",
  ): Promise<ShareLocationResult> {
    this.updateState({ isLoading: true, error: null });

    try {
      const location = await this.broadcaster.start(
        duration,
        userId,
        userInfo,
        contextId,
        contextType,
      );

      this.updateState({
        outgoingLocation: location,
        isLoading: false,
      });

      return {
        success: true,
        location,
      };
    } catch (error) {
      const locationError = error as LocationError;
      this.updateState({
        error: locationError,
        isLoading: false,
      });
      return {
        success: false,
        error: locationError.message || "Failed to start live location",
      };
    }
  }

  /**
   * Stop sharing live location.
   */
  stopLiveLocation(): void {
    this.broadcaster.stop();
  }

  /**
   * Extend live location sharing.
   */
  extendLiveLocation(additionalMinutes: LocationSharingDuration): void {
    this.broadcaster.extend(additionalMinutes);
    if (this.state.outgoingLocation) {
      this.updateState({
        outgoingLocation: this.broadcaster.getCurrentLocation(),
      });
    }
  }

  /**
   * Pause live location sharing.
   */
  pauseLiveLocation(): void {
    this.broadcaster.pause();
  }

  /**
   * Resume live location sharing.
   */
  resumeLiveLocation(): void {
    this.broadcaster.resume();
  }

  // ============================================================================
  // Public Methods - Privacy Settings
  // ============================================================================

  /**
   * Update privacy settings.
   */
  updatePrivacySettings(settings: Partial<LocationPrivacySettings>): void {
    this.updateState({
      privacySettings: {
        ...this.state.privacySettings,
        ...settings,
      },
    });
  }

  /**
   * Get privacy settings.
   */
  getPrivacySettings(): LocationPrivacySettings {
    return this.state.privacySettings;
  }

  // ============================================================================
  // Public Methods - Socket
  // ============================================================================

  /**
   * Set socket instance.
   */
  setSocket(socket: LocationManagerOptions["socket"]): void {
    // Remove old listeners
    this.removeSocketListeners();

    // Update broadcaster
    this.broadcaster.setSocket(socket);

    // Set up new listeners
    if (socket) {
      this.setupSocketListeners(socket);
    }
  }

  // ============================================================================
  // Public Methods - Cleanup
  // ============================================================================

  /**
   * Destroy manager and clean up resources.
   */
  destroy(): void {
    this.removeSocketListeners();
    this.broadcaster.destroy();
    this.state.incomingLocations.clear();
  }

  // ============================================================================
  // Private Methods - State Management
  // ============================================================================

  private updateState(updates: Partial<LocationManagerState>): void {
    this.state = { ...this.state, ...updates };
    this.options.onStateChange?.(this.getState());
  }

  // ============================================================================
  // Private Methods - Broadcast Callbacks
  // ============================================================================

  private handleBroadcastStart(location: LiveLocation): void {
    this.updateState({ outgoingLocation: location });
  }

  private handleBroadcastUpdate(_event: LocationUpdateEvent): void {
    // Update outgoing location with latest data
    const currentLocation = this.broadcaster.getCurrentLocation();
    if (currentLocation) {
      this.updateState({ outgoingLocation: currentLocation });
    }
  }

  private handleBroadcastStop(_reason: string): void {
    this.updateState({ outgoingLocation: null });
  }

  private handleBroadcastError(error: LocationError): void {
    this.updateState({ error });
  }

  // ============================================================================
  // Private Methods - Socket Listeners
  // ============================================================================

  private setupSocketListeners(
    socket: NonNullable<LocationManagerOptions["socket"]>,
  ): void {
    // Location started
    const handleStarted = (event: LocationStartedEvent) => {
      this.state.incomingLocations.set(event.location.id, event.location);
      this.updateState({
        incomingLocations: new Map(this.state.incomingLocations),
      });
      this.options.onLocationReceived?.(event.location);
    };
    const handleStartedWrapper = handleStarted as (...args: unknown[]) => void;
    socket.on(LocationSocketEvents.STARTED, handleStartedWrapper);
    this.socketListeners.set(
      LocationSocketEvents.STARTED,
      handleStartedWrapper,
    );

    // Location update
    const handleUpdate = (event: LocationUpdateEvent) => {
      const existing = this.state.incomingLocations.get(event.locationId);
      if (existing) {
        const updated: LiveLocation = {
          ...existing,
          coordinates: event.coordinates,
          lastUpdatedAt: new Date(event.timestamp),
          heading: event.heading,
          speed: event.speed,
          address: event.address || existing.address,
        };
        this.state.incomingLocations.set(event.locationId, updated);
        this.updateState({
          incomingLocations: new Map(this.state.incomingLocations),
        });
      }
    };
    const handleUpdateWrapper = handleUpdate as (...args: unknown[]) => void;
    socket.on(LocationSocketEvents.UPDATE, handleUpdateWrapper);
    this.socketListeners.set(LocationSocketEvents.UPDATE, handleUpdateWrapper);

    // Location stopped
    const handleStopped = (event: LocationStoppedEvent) => {
      const location = this.state.incomingLocations.get(event.locationId);
      if (location) {
        this.state.incomingLocations.delete(event.locationId);
        this.updateState({
          incomingLocations: new Map(this.state.incomingLocations),
        });
        this.options.onLocationEnded?.(event.locationId, event.userId);
      }
    };
    const handleStoppedWrapper = handleStopped as (...args: unknown[]) => void;
    socket.on(LocationSocketEvents.STOPPED, handleStoppedWrapper);
    this.socketListeners.set(
      LocationSocketEvents.STOPPED,
      handleStoppedWrapper,
    );
  }

  private removeSocketListeners(): void {
    if (!this.options.socket) {
      return;
    }

    for (const [event, handler] of this.socketListeners) {
      this.options.socket.off(event, handler);
    }
    this.socketListeners.clear();
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a location manager.
 */
export function createLocationManager(
  options?: LocationManagerOptions,
): LocationManager {
  return new LocationManager(options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a Google Maps URL for directions.
 */
export function getDirectionsUrl(
  destination: Coordinates,
  mode: "driving" | "walking" | "transit" | "bicycling" = "driving",
): string {
  const coords = `${destination.latitude},${destination.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${coords}&travelmode=${mode}`;
}

/**
 * Generate an Apple Maps URL for directions.
 */
export function getAppleMapsUrl(destination: Coordinates): string {
  const coords = `${destination.latitude},${destination.longitude}`;
  return `https://maps.apple.com/?daddr=${coords}`;
}

/**
 * Generate a shareable location URL.
 */
export function getShareableLocationUrl(
  coordinates: Coordinates,
  label?: string,
): string {
  const coords = formatCoordinates(coordinates, 6);
  const query = label ? `${label} (${coords})` : coords;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Open directions in default maps app.
 */
export function openDirections(
  destination: Coordinates,
  mode: "driving" | "walking" | "transit" | "bicycling" = "driving",
): void {
  // Try Apple Maps first on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    window.location.href = getAppleMapsUrl(destination);
  } else {
    window.open(getDirectionsUrl(destination, mode), "_blank");
  }
}

/**
 * Copy coordinates to clipboard.
 */
export async function copyCoordinates(
  coordinates: Coordinates,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatCoordinates(coordinates));
    return true;
  } catch {
    return false;
  }
}
