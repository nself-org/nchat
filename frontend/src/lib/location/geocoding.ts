/**
 * Geocoding Utilities
 *
 * Multi-provider geocoding with privacy controls and fallback behavior.
 * Supports:
 * - OpenStreetMap Nominatim (default, no API key required)
 * - Google Maps Geocoding API
 * - Mapbox Geocoding API
 */

import type {
  Coordinates,
  GeocodedAddress,
  Place,
  PlaceCategory,
} from "./location-types";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported geocoding providers.
 */
export type GeocodingProvider = "nominatim" | "google" | "mapbox";

/**
 * Geocoding result.
 */
export interface GeocodingResult {
  /** Success status */
  success: boolean;
  /** Address data (if successful) */
  address?: GeocodedAddress;
  /** Error message (if failed) */
  error?: string;
  /** Provider used */
  provider?: GeocodingProvider;
}

/**
 * Reverse geocoding options.
 */
export interface ReverseGeocodingOptions {
  /** Language for results (e.g., 'en', 'es') */
  language?: string;
  /** Include all address components */
  includeComponents?: boolean;
  /** Preferred provider (will use fallback if unavailable) */
  preferredProvider?: GeocodingProvider;
  /** Whether to apply privacy controls (approximate location) */
  privacyMode?: boolean;
}

/**
 * Places search options.
 */
export interface PlacesSearchOptions {
  /** Search radius in meters */
  radius?: number;
  /** Filter by category */
  category?: PlaceCategory;
  /** Maximum number of results */
  limit?: number;
  /** Language for results */
  language?: string;
}

/**
 * Provider configuration.
 */
interface ProviderConfig {
  enabled: boolean;
  apiKey?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get provider configuration from environment.
 */
function getProviderConfig(): Record<GeocodingProvider, ProviderConfig> {
  const googleApiKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      : process.env.GOOGLE_MAPS_API_KEY ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const mapboxApiKey =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_MAPBOX_API_KEY
      : process.env.MAPBOX_API_KEY || process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

  return {
    nominatim: {
      enabled: true, // Always enabled as fallback (no API key required)
    },
    google: {
      enabled: Boolean(googleApiKey),
      apiKey: googleApiKey,
    },
    mapbox: {
      enabled: Boolean(mapboxApiKey),
      apiKey: mapboxApiKey,
    },
  };
}

/**
 * Get the best available provider.
 */
function getAvailableProvider(
  preferred?: GeocodingProvider,
): GeocodingProvider {
  const config = getProviderConfig();

  // Try preferred provider first
  if (preferred && config[preferred].enabled) {
    return preferred;
  }

  // Fall back to available providers in priority order
  if (config.google.enabled) return "google";
  if (config.mapbox.enabled) return "mapbox";
  return "nominatim"; // Always available
}

// ============================================================================
// Privacy Controls
// ============================================================================

/**
 * Apply privacy controls by reducing coordinate precision.
 * This makes the location approximate (within ~1km accuracy).
 */
function applyPrivacyControls(coordinates: Coordinates): Coordinates {
  // Reduce precision to ~1km (2 decimal places)
  return {
    latitude: Math.round(coordinates.latitude * 100) / 100,
    longitude: Math.round(coordinates.longitude * 100) / 100,
    accuracy: coordinates.accuracy
      ? Math.max(coordinates.accuracy, 1000)
      : 1000,
  };
}

/**
 * Sanitize address for privacy (remove exact street numbers).
 */
function sanitizeAddressForPrivacy(address: GeocodedAddress): GeocodedAddress {
  return {
    ...address,
    streetNumber: undefined,
    formattedAddress: [
      address.street,
      address.city,
      address.state,
      address.country,
    ]
      .filter(Boolean)
      .join(", "),
  };
}

// ============================================================================
// Nominatim Provider (OpenStreetMap)
// ============================================================================

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const NOMINATIM_USER_AGENT = "nself-chat/1.0";

interface NominatimReverseResponse {
  place_id: number;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

interface NominatimSearchResponse {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimReverseResponse["address"];
}

async function nominatimReverseGeocode(
  coordinates: Coordinates,
  options: ReverseGeocodingOptions = {},
): Promise<GeocodingResult> {
  try {
    const params = new URLSearchParams({
      lat: coordinates.latitude.toString(),
      lon: coordinates.longitude.toString(),
      format: "json",
      addressdetails: "1",
    });

    if (options.language) {
      params.append("accept-language", options.language);
    }

    const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = (await response.json()) as NominatimReverseResponse;

    const address: GeocodedAddress = {
      formattedAddress: data.display_name,
      streetNumber: data.address.house_number,
      street: data.address.road,
      neighborhood: data.address.neighbourhood || data.address.suburb,
      city: data.address.city || data.address.town || data.address.village,
      state: data.address.state,
      postalCode: data.address.postcode,
      country: data.address.country,
      countryCode: data.address.country_code?.toUpperCase(),
    };

    return {
      success: true,
      address: options.privacyMode
        ? sanitizeAddressForPrivacy(address)
        : address,
      provider: "nominatim",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Nominatim geocoding failed",
      provider: "nominatim",
    };
  }
}

async function nominatimGeocode(
  addressQuery: string,
  options: { language?: string } = {},
): Promise<{ success: boolean; coordinates?: Coordinates; error?: string }> {
  try {
    const params = new URLSearchParams({
      q: addressQuery,
      format: "json",
      limit: "1",
      addressdetails: "1",
    });

    if (options.language) {
      params.append("accept-language", options.language);
    }

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = (await response.json()) as NominatimSearchResponse[];

    if (!data.length) {
      return {
        success: false,
        error: "No results found",
      };
    }

    return {
      success: true,
      coordinates: {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Nominatim geocoding failed",
    };
  }
}

// ============================================================================
// Google Maps Provider
// ============================================================================

interface GoogleGeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

async function googleReverseGeocode(
  coordinates: Coordinates,
  options: ReverseGeocodingOptions = {},
): Promise<GeocodingResult> {
  const config = getProviderConfig();
  if (!config.google.apiKey) {
    return {
      success: false,
      error: "Google Maps API key not configured",
      provider: "google",
    };
  }

  try {
    const params = new URLSearchParams({
      latlng: `${coordinates.latitude},${coordinates.longitude}`,
      key: config.google.apiKey,
    });

    if (options.language) {
      params.append("language", options.language);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    );

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = (await response.json()) as GoogleGeocodingResponse;

    if (data.status !== "OK" || !data.results.length) {
      return {
        success: false,
        error:
          data.status === "ZERO_RESULTS"
            ? "No results found"
            : `API error: ${data.status}`,
        provider: "google",
      };
    }

    const result = data.results[0];
    const components = result.address_components;

    const getComponent = (type: string): string | undefined =>
      components.find((c) => c.types.includes(type))?.long_name;

    const getComponentShort = (type: string): string | undefined =>
      components.find((c) => c.types.includes(type))?.short_name;

    const address: GeocodedAddress = {
      formattedAddress: result.formatted_address,
      streetNumber: getComponent("street_number"),
      street: getComponent("route"),
      neighborhood: getComponent("neighborhood") || getComponent("sublocality"),
      city:
        getComponent("locality") || getComponent("administrative_area_level_2"),
      state: getComponent("administrative_area_level_1"),
      postalCode: getComponent("postal_code"),
      country: getComponent("country"),
      countryCode: getComponentShort("country"),
    };

    return {
      success: true,
      address: options.privacyMode
        ? sanitizeAddressForPrivacy(address)
        : address,
      provider: "google",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Google geocoding failed",
      provider: "google",
    };
  }
}

async function googleGeocode(
  addressQuery: string,
  options: { language?: string } = {},
): Promise<{ success: boolean; coordinates?: Coordinates; error?: string }> {
  const config = getProviderConfig();
  if (!config.google.apiKey) {
    return {
      success: false,
      error: "Google Maps API key not configured",
    };
  }

  try {
    const params = new URLSearchParams({
      address: addressQuery,
      key: config.google.apiKey,
    });

    if (options.language) {
      params.append("language", options.language);
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    );

    if (!response.ok) {
      throw new Error(`Google Geocoding API error: ${response.status}`);
    }

    const data = (await response.json()) as GoogleGeocodingResponse;

    if (data.status !== "OK" || !data.results.length) {
      return {
        success: false,
        error:
          data.status === "ZERO_RESULTS"
            ? "No results found"
            : `API error: ${data.status}`,
      };
    }

    return {
      success: true,
      coordinates: {
        latitude: data.results[0].geometry.location.lat,
        longitude: data.results[0].geometry.location.lng,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Google geocoding failed",
    };
  }
}

// ============================================================================
// Mapbox Provider
// ============================================================================

interface MapboxFeature {
  place_name: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  address?: string;
  text?: string;
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[];
}

async function mapboxReverseGeocode(
  coordinates: Coordinates,
  options: ReverseGeocodingOptions = {},
): Promise<GeocodingResult> {
  const config = getProviderConfig();
  if (!config.mapbox.apiKey) {
    return {
      success: false,
      error: "Mapbox API key not configured",
      provider: "mapbox",
    };
  }

  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.longitude},${coordinates.latitude}.json`;
    const params = new URLSearchParams({
      access_token: config.mapbox.apiKey,
      types: "address,neighborhood,locality,place,region,country",
    });

    if (options.language) {
      params.append("language", options.language);
    }

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = (await response.json()) as MapboxGeocodingResponse;

    if (!data.features.length) {
      return {
        success: false,
        error: "No results found",
        provider: "mapbox",
      };
    }

    const feature = data.features[0];
    const getContext = (type: string): string | undefined =>
      feature.context?.find((c) => c.id.startsWith(type))?.text;

    const getContextShort = (type: string): string | undefined =>
      feature.context
        ?.find((c) => c.id.startsWith(type))
        ?.short_code?.toUpperCase();

    const address: GeocodedAddress = {
      formattedAddress: feature.place_name,
      streetNumber: feature.address,
      street: feature.text,
      neighborhood: getContext("neighborhood"),
      city: getContext("place") || getContext("locality"),
      state: getContext("region"),
      postalCode: getContext("postcode"),
      country: getContext("country"),
      countryCode: getContextShort("country"),
    };

    return {
      success: true,
      address: options.privacyMode
        ? sanitizeAddressForPrivacy(address)
        : address,
      provider: "mapbox",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Mapbox geocoding failed",
      provider: "mapbox",
    };
  }
}

async function mapboxGeocode(
  addressQuery: string,
  options: { language?: string } = {},
): Promise<{ success: boolean; coordinates?: Coordinates; error?: string }> {
  const config = getProviderConfig();
  if (!config.mapbox.apiKey) {
    return {
      success: false,
      error: "Mapbox API key not configured",
    };
  }

  try {
    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressQuery)}.json`;
    const params = new URLSearchParams({
      access_token: config.mapbox.apiKey,
      limit: "1",
    });

    if (options.language) {
      params.append("language", options.language);
    }

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = (await response.json()) as MapboxGeocodingResponse;

    if (!data.features.length) {
      return {
        success: false,
        error: "No results found",
      };
    }

    const [lng, lat] = data.features[0].center;

    return {
      success: true,
      coordinates: {
        latitude: lat,
        longitude: lng,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Mapbox geocoding failed",
    };
  }
}

// ============================================================================
// Public API - Reverse Geocoding
// ============================================================================

/**
 * Reverse geocode coordinates to an address.
 *
 * Uses the best available provider with automatic fallback:
 * 1. Google Maps (if API key configured)
 * 2. Mapbox (if API key configured)
 * 3. OpenStreetMap Nominatim (always available)
 */
export async function reverseGeocode(
  coordinates: Coordinates,
  options: ReverseGeocodingOptions = {},
): Promise<GeocodingResult> {
  // Apply privacy controls if requested
  const coords = options.privacyMode
    ? applyPrivacyControls(coordinates)
    : coordinates;

  // Determine provider
  const provider = getAvailableProvider(options.preferredProvider);

  // Try primary provider
  let result: GeocodingResult;

  switch (provider) {
    case "google":
      result = await googleReverseGeocode(coords, options);
      break;
    case "mapbox":
      result = await mapboxReverseGeocode(coords, options);
      break;
    case "nominatim":
    default:
      result = await nominatimReverseGeocode(coords, options);
      break;
  }

  // Fallback to Nominatim if primary provider fails
  if (!result.success && provider !== "nominatim") {
    result = await nominatimReverseGeocode(coords, options);
  }

  return result;
}

/**
 * Geocode an address to coordinates.
 *
 * Uses the best available provider with automatic fallback.
 */
export async function geocodeAddress(
  address: string,
  options: { language?: string; preferredProvider?: GeocodingProvider } = {},
): Promise<{ success: boolean; coordinates?: Coordinates; error?: string }> {
  if (!address || address.trim().length < 3) {
    return {
      success: false,
      error: "Address is too short",
    };
  }

  const provider = getAvailableProvider(options.preferredProvider);

  let result: { success: boolean; coordinates?: Coordinates; error?: string };

  switch (provider) {
    case "google":
      result = await googleGeocode(address, options);
      break;
    case "mapbox":
      result = await mapboxGeocode(address, options);
      break;
    case "nominatim":
    default:
      result = await nominatimGeocode(address, options);
      break;
  }

  // Fallback to Nominatim if primary provider fails
  if (!result.success && provider !== "nominatim") {
    result = await nominatimGeocode(address, options);
  }

  return result;
}

// ============================================================================
// Places Search
// ============================================================================

interface NominatimPlaceSearchResponse {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  importance: number;
  address?: {
    amenity?: string;
    shop?: string;
    tourism?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Map OSM class/type to PlaceCategory.
 */
function mapOsmToCategory(osmClass: string, osmType: string): PlaceCategory {
  const mapping: Record<string, PlaceCategory> = {
    // Amenities
    restaurant: "restaurant",
    cafe: "cafe",
    bar: "bar",
    pub: "bar",
    fast_food: "restaurant",
    hospital: "hospital",
    clinic: "hospital",
    pharmacy: "pharmacy",
    bank: "bank",
    atm: "atm",
    fuel: "gas_station",
    parking: "parking",
    school: "school",
    university: "school",
    college: "school",
    place_of_worship: "church",
    // Tourism
    hotel: "hotel",
    motel: "hotel",
    hostel: "hotel",
    museum: "museum",
    // Leisure
    fitness_centre: "gym",
    gym: "gym",
    park: "park",
    // Transport
    bus_station: "transit",
    railway: "transit",
    station: "transit",
    airport: "airport",
    aerodrome: "airport",
    // Shop
    supermarket: "store",
    convenience: "store",
    mall: "store",
  };

  return mapping[osmType] || mapping[osmClass] || "other";
}

/**
 * Search for nearby places using Nominatim.
 */
export async function searchNearbyPlaces(
  coordinates: Coordinates,
  options: PlacesSearchOptions = {},
): Promise<Place[]> {
  const { radius = 1000, category, limit = 10, language } = options;

  try {
    // Calculate bounding box
    const latOffset = radius / 111000; // ~111km per degree latitude
    const lonOffset =
      radius / (111000 * Math.cos((coordinates.latitude * Math.PI) / 180));

    const params = new URLSearchParams({
      format: "json",
      limit: String(Math.min(limit * 2, 50)), // Request more to filter
      viewbox: [
        coordinates.longitude - lonOffset,
        coordinates.latitude + latOffset,
        coordinates.longitude + lonOffset,
        coordinates.latitude - latOffset,
      ].join(","),
      bounded: "1",
    });

    // Add category-specific search
    if (category) {
      const osmAmenity = getCategoryOsmMapping(category);
      if (osmAmenity) {
        params.append("q", osmAmenity);
      }
    } else {
      params.append("q", "*");
    }

    if (language) {
      params.append("accept-language", language);
    }

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as NominatimPlaceSearchResponse[];

    const places = data
      .map((item): Place | null => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const distance = calculateDistanceMeters(
          coordinates.latitude,
          coordinates.longitude,
          lat,
          lon,
        );

        const placeCategory = mapOsmToCategory(item.class, item.type);

        // Filter by category if specified
        if (category && placeCategory !== category) {
          return null;
        }

        return {
          id: `osm_${item.place_id}`,
          name:
            item.address?.amenity ||
            item.address?.shop ||
            item.address?.tourism ||
            item.display_name.split(",")[0],
          address: item.display_name,
          coordinates: { latitude: lat, longitude: lon },
          category: placeCategory,
          distance,
        };
      })
      .filter((p): p is Place => p !== null)
      .filter((p) => (p.distance ?? 0) <= radius)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, limit);

    return places;
  } catch {
    return [];
  }
}

/**
 * Search places by text query.
 */
export async function searchPlaces(
  query: string,
  coordinates?: Coordinates,
  options: PlacesSearchOptions = {},
): Promise<Place[]> {
  const { limit = 10, language } = options;

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: String(limit),
      addressdetails: "1",
    });

    if (coordinates) {
      // Bias results towards user's location
      params.append(
        "viewbox",
        [
          coordinates.longitude - 0.5,
          coordinates.latitude + 0.5,
          coordinates.longitude + 0.5,
          coordinates.latitude - 0.5,
        ].join(","),
      );
    }

    if (language) {
      params.append("accept-language", language);
    }

    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as NominatimPlaceSearchResponse[];

    return data.map((item) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      return {
        id: `osm_${item.place_id}`,
        name:
          item.address?.amenity ||
          item.address?.shop ||
          item.address?.tourism ||
          item.display_name.split(",")[0],
        address: item.display_name,
        coordinates: { latitude: lat, longitude: lon },
        category: mapOsmToCategory(item.class, item.type),
        distance: coordinates
          ? calculateDistanceMeters(
              coordinates.latitude,
              coordinates.longitude,
              lat,
              lon,
            )
          : undefined,
      };
    });
  } catch {
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate distance between two points in meters.
 */
function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Map PlaceCategory to OSM search term.
 */
function getCategoryOsmMapping(category: PlaceCategory): string | null {
  const mapping: Record<PlaceCategory, string> = {
    restaurant: "restaurant",
    cafe: "cafe",
    bar: "bar pub",
    store: "shop supermarket",
    hotel: "hotel",
    hospital: "hospital clinic",
    pharmacy: "pharmacy",
    gas_station: "fuel",
    parking: "parking",
    transit: "station",
    airport: "airport",
    school: "school university",
    gym: "gym fitness",
    park: "park",
    museum: "museum",
    church: "church mosque temple synagogue",
    bank: "bank",
    atm: "atm",
    other: "",
  };

  return mapping[category] || null;
}

// ============================================================================
// Address Formatting
// ============================================================================

/**
 * Format address for display.
 */
export function formatAddress(
  address: GeocodedAddress,
  style: "full" | "short" | "city" = "full",
): string {
  switch (style) {
    case "short":
      return [address.street, address.city].filter(Boolean).join(", ");
    case "city":
      return [address.city, address.state, address.country]
        .filter(Boolean)
        .join(", ");
    case "full":
    default:
      return address.formattedAddress;
  }
}

/**
 * Get place category icon name.
 */
export function getPlaceCategoryIcon(category: PlaceCategory): string {
  const icons: Record<PlaceCategory, string> = {
    restaurant: "utensils",
    cafe: "coffee",
    bar: "wine",
    store: "shopping-bag",
    hotel: "building",
    hospital: "hospital",
    pharmacy: "pill",
    gas_station: "fuel",
    parking: "parking",
    transit: "train",
    airport: "plane",
    school: "graduation-cap",
    gym: "dumbbell",
    park: "tree",
    museum: "landmark",
    church: "church",
    bank: "landmark",
    atm: "credit-card",
    other: "map-pin",
  };

  return icons[category] || "map-pin";
}

/**
 * Get place category display name.
 */
export function getPlaceCategoryName(category: PlaceCategory): string {
  const names: Record<PlaceCategory, string> = {
    restaurant: "Restaurant",
    cafe: "Cafe",
    bar: "Bar",
    store: "Store",
    hotel: "Hotel",
    hospital: "Hospital",
    pharmacy: "Pharmacy",
    gas_station: "Gas Station",
    parking: "Parking",
    transit: "Transit",
    airport: "Airport",
    school: "School",
    gym: "Gym",
    park: "Park",
    museum: "Museum",
    church: "Church",
    bank: "Bank",
    atm: "ATM",
    other: "Place",
  };

  return names[category] || "Place";
}

// ============================================================================
// Provider Status
// ============================================================================

/**
 * Get the status of available geocoding providers.
 */
export function getGeocodingProviderStatus(): {
  available: GeocodingProvider[];
  default: GeocodingProvider;
  configured: Record<GeocodingProvider, boolean>;
} {
  const config = getProviderConfig();
  const available = (Object.keys(config) as GeocodingProvider[]).filter(
    (p) => config[p].enabled,
  );

  return {
    available,
    default: getAvailableProvider(),
    configured: {
      nominatim: config.nominatim.enabled,
      google: config.google.enabled,
      mapbox: config.mapbox.enabled,
    },
  };
}
