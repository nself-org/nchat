/**
 * Distance Calculator
 *
 * Utilities for calculating distances between geographic coordinates.
 */

import type { Coordinates } from "./location-types";

// ============================================================================
// Constants
// ============================================================================

/** Earth's radius in meters */
const EARTH_RADIUS_METERS = 6371000;

/** Earth's radius in kilometers */
const EARTH_RADIUS_KM = 6371;

/** Earth's radius in miles */
const EARTH_RADIUS_MILES = 3959;

// ============================================================================
// Distance Units
// ============================================================================

export type DistanceUnit = "meters" | "kilometers" | "miles" | "feet";

/**
 * Conversion factors to meters.
 */
const CONVERSION_TO_METERS: Record<DistanceUnit, number> = {
  meters: 1,
  kilometers: 1000,
  miles: 1609.344,
  feet: 0.3048,
};

/**
 * Convert distance between units.
 */
export function convertDistance(
  distance: number,
  from: DistanceUnit,
  to: DistanceUnit,
): number {
  const inMeters = distance * CONVERSION_TO_METERS[from];
  return inMeters / CONVERSION_TO_METERS[to];
}

// ============================================================================
// Haversine Formula
// ============================================================================

/**
 * Convert degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees.
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula.
 * Returns distance in meters by default.
 */
export function calculateDistance(
  from: Coordinates,
  to: Coordinates,
  unit: DistanceUnit = "meters",
): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceInMeters = EARTH_RADIUS_METERS * c;

  return convertDistance(distanceInMeters, "meters", unit);
}

// ============================================================================
// Bearing Calculation
// ============================================================================

/**
 * Calculate the initial bearing from one coordinate to another.
 * Returns bearing in degrees (0-360, clockwise from north).
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const x = Math.sin(deltaLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = toDegrees(Math.atan2(x, y));

  // Normalize to 0-360
  return (bearing + 360) % 360;
}

/**
 * Get cardinal direction from bearing.
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Get full cardinal direction name from bearing.
 */
export function getCardinalDirectionFull(bearing: number): string {
  const directions = [
    "North",
    "Northeast",
    "East",
    "Southeast",
    "South",
    "Southwest",
    "West",
    "Northwest",
  ];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// ============================================================================
// Distance Formatting
// ============================================================================

/**
 * Format distance with appropriate unit.
 */
export function formatDistance(
  meters: number,
  options: {
    useImperial?: boolean;
    precision?: number;
    short?: boolean;
  } = {},
): string {
  const { useImperial = false, precision = 1, short = false } = options;

  if (useImperial) {
    const feet = convertDistance(meters, "meters", "feet");
    const miles = convertDistance(meters, "meters", "miles");

    if (miles >= 0.1) {
      const value = miles.toFixed(precision);
      return short ? `${value} mi` : `${value} miles`;
    } else {
      const value = Math.round(feet);
      return short ? `${value} ft` : `${value} feet`;
    }
  } else {
    const km = meters / 1000;

    if (km >= 1) {
      const value = km.toFixed(precision);
      return short ? `${value} km` : `${value} kilometers`;
    } else {
      const value = Math.round(meters);
      return short ? `${value} m` : `${value} meters`;
    }
  }
}

/**
 * Format distance for UI display (smart formatting).
 */
export function formatDistanceForUI(meters: number): string {
  if (meters < 50) {
    return "Very close";
  }
  if (meters < 100) {
    return `${Math.round(meters)} m`;
  }
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`;
  }
  if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters / 1000)} km`;
}

/**
 * Format estimated travel time.
 */
export function formatTravelTime(
  meters: number,
  mode: "walking" | "driving" | "cycling" = "walking",
): string {
  // Average speeds in m/s
  const speeds = {
    walking: 1.4, // ~5 km/h
    cycling: 4.2, // ~15 km/h
    driving: 11.1, // ~40 km/h (accounting for traffic/stops)
  };

  const seconds = meters / speeds[mode];
  const minutes = Math.round(seconds / 60);

  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}

// ============================================================================
// Bounding Box
// ============================================================================

/**
 * Calculate a bounding box around a point with given radius.
 */
export function calculateBoundingBox(
  center: Coordinates,
  radiusMeters: number,
): { northeast: Coordinates; southwest: Coordinates } {
  const lat = center.latitude;
  const lon = center.longitude;

  // Latitude: 1 degree = ~111km
  const latDelta = radiusMeters / 1000 / 111;

  // Longitude: depends on latitude
  const lonDelta = radiusMeters / 1000 / (111 * Math.cos(toRadians(lat)));

  return {
    northeast: {
      latitude: lat + latDelta,
      longitude: lon + lonDelta,
    },
    southwest: {
      latitude: lat - latDelta,
      longitude: lon - lonDelta,
    },
  };
}

/**
 * Check if a point is within a bounding box.
 */
export function isWithinBounds(
  point: Coordinates,
  bounds: { northeast: Coordinates; southwest: Coordinates },
): boolean {
  return (
    point.latitude >= bounds.southwest.latitude &&
    point.latitude <= bounds.northeast.latitude &&
    point.longitude >= bounds.southwest.longitude &&
    point.longitude <= bounds.northeast.longitude
  );
}

/**
 * Check if a point is within a radius of another point.
 */
export function isWithinRadius(
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number,
): boolean {
  const distance = calculateDistance(point, center, "meters");
  return distance <= radiusMeters;
}

// ============================================================================
// Midpoint Calculation
// ============================================================================

/**
 * Calculate the midpoint between two coordinates.
 */
export function calculateMidpoint(
  from: Coordinates,
  to: Coordinates,
): Coordinates {
  const lat1 = toRadians(from.latitude);
  const lon1 = toRadians(from.longitude);
  const lat2 = toRadians(to.latitude);
  const lon2 = toRadians(to.longitude);

  const Bx = Math.cos(lat2) * Math.cos(lon2 - lon1);
  const By = Math.cos(lat2) * Math.sin(lon2 - lon1);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) ** 2 + By ** 2),
  );
  const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

  return {
    latitude: toDegrees(lat3),
    longitude: toDegrees(lon3),
  };
}

// ============================================================================
// Destination Point Calculation
// ============================================================================

/**
 * Calculate destination point given start, bearing, and distance.
 */
export function calculateDestinationPoint(
  start: Coordinates,
  bearing: number,
  distanceMeters: number,
): Coordinates {
  const lat1 = toRadians(start.latitude);
  const lon1 = toRadians(start.longitude);
  const bearingRad = toRadians(bearing);
  const d = distanceMeters / EARTH_RADIUS_METERS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad),
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: toDegrees(lat2),
    longitude: toDegrees(lon2),
  };
}
