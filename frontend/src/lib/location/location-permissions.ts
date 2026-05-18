/**
 * Location Permission Handling
 *
 * Utilities for checking and requesting geolocation permissions.
 */

import {
  type LocationPermissionState,
  type LocationPermissionResult,
  type LocationError,
  createLocationError,
} from "./location-types";

// ============================================================================
// Permission State
// ============================================================================

/**
 * Check if geolocation is supported in the browser.
 */
export function isGeolocationSupported(): boolean {
  return typeof window !== "undefined" && "geolocation" in navigator;
}

/**
 * Get the current permission state.
 */
export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  if (!isGeolocationSupported()) {
    return "unavailable";
  }

  // Use Permissions API if available
  if ("permissions" in navigator) {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state as LocationPermissionState;
    } catch {
      // Permissions API not supported for geolocation, fall back to 'prompt'
      return "prompt";
    }
  }

  // Assume prompt state if Permissions API is not available
  return "prompt";
}

/**
 * Check if location permission is currently granted.
 */
export async function isLocationPermissionGranted(): Promise<boolean> {
  const state = await getLocationPermissionState();
  return state === "granted";
}

/**
 * Watch for permission state changes.
 */
export function watchLocationPermission(
  callback: (state: LocationPermissionState) => void,
): () => void {
  if (!("permissions" in navigator)) {
    return () => {};
  }

  let permissionStatus: PermissionStatus | null = null;

  const handleChange = () => {
    if (permissionStatus) {
      callback(permissionStatus.state as LocationPermissionState);
    }
  };

  navigator.permissions
    .query({ name: "geolocation" })
    .then((status) => {
      permissionStatus = status;
      status.addEventListener("change", handleChange);
      // Call callback with initial state
      callback(status.state as LocationPermissionState);
    })
    .catch(() => {
      // Permissions API not supported
    });

  return () => {
    if (permissionStatus) {
      permissionStatus.removeEventListener("change", handleChange);
    }
  };
}

// ============================================================================
// Permission Request
// ============================================================================

/**
 * Request location permission by attempting to get current position.
 * This will trigger the browser permission prompt if not already granted.
 */
export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  if (!isGeolocationSupported()) {
    return {
      state: "unavailable",
      isGranted: false,
      error: "Geolocation is not supported in this browser",
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => {
        // Permission granted
        resolve({
          state: "granted",
          isGranted: true,
        });
      },
      (error) => {
        // Permission denied or error
        const locationError = createLocationError(error);
        resolve({
          state:
            error.code === GeolocationPositionError.PERMISSION_DENIED
              ? "denied"
              : "prompt",
          isGranted: false,
          error: locationError.message,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: Infinity,
      },
    );
  });
}

// ============================================================================
// Permission Check Result
// ============================================================================

/**
 * Check permission and return full result.
 */
export async function checkLocationPermission(): Promise<LocationPermissionResult> {
  if (!isGeolocationSupported()) {
    return {
      state: "unavailable",
      isGranted: false,
      error: "Geolocation is not supported in this browser",
    };
  }

  const state = await getLocationPermissionState();

  return {
    state,
    isGranted: state === "granted",
    error:
      state === "denied"
        ? "Location permission has been denied. Please enable it in your browser settings."
        : undefined,
  };
}

// ============================================================================
// Permission UI Helpers
// ============================================================================

/**
 * Get user-friendly message for permission state.
 */
export function getPermissionMessage(state: LocationPermissionState): string {
  switch (state) {
    case "granted":
      return "Location access is enabled";
    case "denied":
      return "Location access is blocked. Please enable it in your browser settings.";
    case "prompt":
      return "Click to allow location access";
    case "unavailable":
      return "Location services are not available in your browser";
    default:
      return "Unknown permission state";
  }
}

/**
 * Get instructions for enabling location permission.
 */
export function getPermissionInstructions(browser?: string): string {
  const detectedBrowser = browser || detectBrowser();

  switch (detectedBrowser) {
    case "chrome":
      return "Click the lock icon in the address bar, then allow location access for this site.";
    case "firefox":
      return "Click the shield icon in the address bar, then allow location access.";
    case "safari":
      return "Go to Safari > Settings > Websites > Location, then allow for this website.";
    case "edge":
      return "Click the lock icon in the address bar, then allow location access for this site.";
    default:
      return "Check your browser settings to enable location access for this website.";
  }
}

/**
 * Detect the current browser.
 */
function detectBrowser(): string {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("chrome") && !ua.includes("edg")) {
    return "chrome";
  }
  if (ua.includes("firefox")) {
    return "firefox";
  }
  if (ua.includes("safari") && !ua.includes("chrome")) {
    return "safari";
  }
  if (ua.includes("edg")) {
    return "edge";
  }

  return "unknown";
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Check if an error is a permission denied error.
 */
export function isPermissionDeniedError(error: LocationError): boolean {
  return error.code === "PERMISSION_DENIED";
}

/**
 * Check if location can be retried after error.
 */
export function canRetryLocation(error: LocationError): boolean {
  return error.code === "TIMEOUT" || error.code === "POSITION_UNAVAILABLE";
}
