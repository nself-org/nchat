/**
 * Geocoding Module Tests
 */

import {
  reverseGeocode,
  geocodeAddress,
  searchNearbyPlaces,
  searchPlaces,
  formatAddress,
  getPlaceCategoryIcon,
  getPlaceCategoryName,
  getGeocodingProviderStatus,
} from "../geocoding";
import type {
  GeocodedAddress,
  Coordinates,
  PlaceCategory,
} from "../location-types";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Geocoding Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("reverseGeocode", () => {
    it("should successfully reverse geocode coordinates using Nominatim", async () => {
      const mockResponse = {
        place_id: 12345,
        display_name: "123 Main Street, San Francisco, California, USA",
        address: {
          house_number: "123",
          road: "Main Street",
          neighbourhood: "Downtown",
          city: "San Francisco",
          state: "California",
          postcode: "94102",
          country: "United States",
          country_code: "us",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const result = await reverseGeocode(coordinates);

      expect(result.success).toBe(true);
      expect(result.address).toBeDefined();
      expect(result.address?.city).toBe("San Francisco");
      expect(result.address?.country).toBe("United States");
      expect(result.provider).toBe("nominatim");
    });

    it("should apply privacy controls when requested", async () => {
      const mockResponse = {
        place_id: 12345,
        display_name: "123 Main Street, San Francisco, California, USA",
        address: {
          house_number: "123",
          road: "Main Street",
          city: "San Francisco",
          state: "California",
          country: "United States",
          country_code: "us",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const result = await reverseGeocode(coordinates, { privacyMode: true });

      expect(result.success).toBe(true);
      expect(result.address?.streetNumber).toBeUndefined();
      // Street should be included but not the number
      expect(result.address?.formattedAddress).not.toContain("123");
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const result = await reverseGeocode(coordinates);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const result = await reverseGeocode(coordinates);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should pass language option to API", async () => {
      const mockResponse = {
        place_id: 12345,
        display_name: "Test Address",
        address: {
          city: "San Francisco",
          country: "United States",
          country_code: "us",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      await reverseGeocode(coordinates, { language: "es" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("accept-language=es"),
        expect.any(Object),
      );
    });
  });

  describe("geocodeAddress", () => {
    it("should successfully geocode an address", async () => {
      const mockResponse = [
        {
          place_id: 12345,
          display_name: "123 Main Street, San Francisco, CA, USA",
          lat: "37.7749",
          lon: "-122.4194",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await geocodeAddress("123 Main Street, San Francisco");

      expect(result.success).toBe(true);
      expect(result.coordinates).toBeDefined();
      expect(result.coordinates?.latitude).toBeCloseTo(37.7749, 4);
      expect(result.coordinates?.longitude).toBeCloseTo(-122.4194, 4);
    });

    it("should reject addresses that are too short", async () => {
      const result = await geocodeAddress("ab");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Address is too short");
    });

    it("should handle no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await geocodeAddress("nonexistent address xyz123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No results found");
    });
  });

  describe("searchNearbyPlaces", () => {
    it("should search for nearby places", async () => {
      const mockResponse = [
        {
          place_id: 1,
          display_name: "Coffee Shop, Main St",
          lat: "37.7750",
          lon: "-122.4193",
          class: "amenity",
          type: "cafe",
          importance: 0.5,
          address: { amenity: "Coffee Shop" },
        },
        {
          place_id: 2,
          display_name: "Park, Park Ave",
          lat: "37.7751",
          lon: "-122.4192",
          class: "leisure",
          type: "park",
          importance: 0.4,
          address: {},
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const places = await searchNearbyPlaces(coordinates, { limit: 10 });

      expect(Array.isArray(places)).toBe(true);
      expect(places.length).toBeGreaterThan(0);
      expect(places[0]).toHaveProperty("id");
      expect(places[0]).toHaveProperty("name");
      expect(places[0]).toHaveProperty("coordinates");
    });

    it("should filter by category", async () => {
      const mockResponse = [
        {
          place_id: 1,
          display_name: "Coffee Shop",
          lat: "37.7750",
          lon: "-122.4193",
          class: "amenity",
          type: "cafe",
          importance: 0.5,
          address: { amenity: "Coffee Shop" },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const places = await searchNearbyPlaces(coordinates, {
        category: "cafe",
      });

      expect(places.every((p) => p.category === "cafe")).toBe(true);
    });

    it("should respect radius limit", async () => {
      const mockResponse = [
        {
          place_id: 1,
          display_name: "Nearby Place",
          lat: "37.7750",
          lon: "-122.4193",
          class: "amenity",
          type: "cafe",
          importance: 0.5,
        },
        {
          place_id: 2,
          display_name: "Far Away Place",
          lat: "37.8000",
          lon: "-122.4000",
          class: "amenity",
          type: "cafe",
          importance: 0.5,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const places = await searchNearbyPlaces(coordinates, { radius: 500 });

      // Should filter out places beyond radius
      expect(places.every((p) => (p.distance || 0) <= 500)).toBe(true);
    });
  });

  describe("searchPlaces", () => {
    it("should search places by query", async () => {
      const mockResponse = [
        {
          place_id: 1,
          display_name: "Central Coffee House, Market St, San Francisco",
          lat: "37.7750",
          lon: "-122.4193",
          class: "amenity",
          type: "cafe",
          importance: 0.5,
          address: { amenity: "Central Coffee House" },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const places = await searchPlaces("coffee");

      expect(Array.isArray(places)).toBe(true);
      expect(places.length).toBeGreaterThan(0);
    });

    it("should include distance when coordinates are provided", async () => {
      const mockResponse = [
        {
          place_id: 1,
          display_name: "Coffee Shop",
          lat: "37.7750",
          lon: "-122.4193",
          class: "amenity",
          type: "cafe",
          importance: 0.5,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coordinates: Coordinates = {
        latitude: 37.7749,
        longitude: -122.4194,
      };
      const places = await searchPlaces("coffee", coordinates);

      expect(places[0].distance).toBeDefined();
      expect(typeof places[0].distance).toBe("number");
    });
  });

  describe("formatAddress", () => {
    const address: GeocodedAddress = {
      formattedAddress: "123 Main Street, San Francisco, CA 94102, USA",
      streetNumber: "123",
      street: "Main Street",
      neighborhood: "Downtown",
      city: "San Francisco",
      state: "California",
      postalCode: "94102",
      country: "United States",
      countryCode: "US",
    };

    it("should format full address", () => {
      expect(formatAddress(address, "full")).toBe(address.formattedAddress);
    });

    it("should format short address", () => {
      expect(formatAddress(address, "short")).toBe(
        "Main Street, San Francisco",
      );
    });

    it("should format city address", () => {
      expect(formatAddress(address, "city")).toBe(
        "San Francisco, California, United States",
      );
    });

    it("should handle missing components", () => {
      const partialAddress: GeocodedAddress = {
        formattedAddress: "San Francisco, USA",
        city: "San Francisco",
        country: "United States",
      };

      expect(formatAddress(partialAddress, "short")).toBe("San Francisco");
      expect(formatAddress(partialAddress, "city")).toBe(
        "San Francisco, United States",
      );
    });
  });

  describe("getPlaceCategoryIcon", () => {
    it("should return correct icon for each category", () => {
      const categories: PlaceCategory[] = [
        "restaurant",
        "cafe",
        "bar",
        "store",
        "hotel",
        "hospital",
        "pharmacy",
        "gas_station",
        "parking",
        "transit",
        "airport",
        "school",
        "gym",
        "park",
        "museum",
        "church",
        "bank",
        "atm",
        "other",
      ];

      categories.forEach((category) => {
        const icon = getPlaceCategoryIcon(category);
        expect(typeof icon).toBe("string");
        expect(icon.length).toBeGreaterThan(0);
      });
    });

    it("should return map-pin for unknown categories", () => {
      expect(getPlaceCategoryIcon("unknown" as PlaceCategory)).toBe("map-pin");
    });
  });

  describe("getPlaceCategoryName", () => {
    it("should return correct name for each category", () => {
      expect(getPlaceCategoryName("restaurant")).toBe("Restaurant");
      expect(getPlaceCategoryName("cafe")).toBe("Cafe");
      expect(getPlaceCategoryName("gas_station")).toBe("Gas Station");
    });

    it("should return Place for unknown categories", () => {
      expect(getPlaceCategoryName("unknown" as PlaceCategory)).toBe("Place");
    });
  });

  describe("getGeocodingProviderStatus", () => {
    it("should return provider status", () => {
      const status = getGeocodingProviderStatus();

      expect(status).toHaveProperty("available");
      expect(status).toHaveProperty("default");
      expect(status).toHaveProperty("configured");
      expect(Array.isArray(status.available)).toBe(true);
      expect(status.available).toContain("nominatim");
      expect(status.configured.nominatim).toBe(true);
    });

    it("should indicate nominatim is always available", () => {
      const status = getGeocodingProviderStatus();

      expect(status.configured.nominatim).toBe(true);
      expect(status.available).toContain("nominatim");
    });
  });
});
