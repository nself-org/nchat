"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Crosshair, Search, Loader2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LocationMap } from "./LocationMap";
import { NearbyPlaces } from "./NearbyPlaces";
import { logger } from "@/lib/logger";
import {
  type Coordinates,
  type Place,
  getCurrentPosition,
  reverseGeocode,
  searchPlaces,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LocationPickerProps {
  /** Initial coordinates to center on */
  initialCoordinates?: Coordinates;
  /** Callback when location is selected */
  onSelect: (coordinates: Coordinates, address?: string, place?: Place) => void;
  /** Callback when picker is cancelled */
  onCancel?: () => void;
  /** Whether to show nearby places */
  showNearbyPlaces?: boolean;
  /** Whether to show search */
  showSearch?: boolean;
  /** Height of the picker */
  height?: number | string;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Location Picker Component
// ============================================================================

/**
 * Location Picker Component
 *
 * Allows users to select a location from a map or search.
 */
export function LocationPicker({
  initialCoordinates,
  onSelect,
  onCancel,
  showNearbyPlaces = true,
  showSearch = true,
  height = 400,
  className,
}: LocationPickerProps) {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(
    initialCoordinates || null,
  );
  const [address, setAddress] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "places" | "search">(
    "map",
  );

  // Get initial location if not provided
  useEffect(() => {
    if (!initialCoordinates) {
      handleGetCurrentLocation();
    }
  }, [initialCoordinates]);

  // Reverse geocode when coordinates change
  useEffect(() => {
    if (coordinates && !selectedPlace) {
      reverseGeocode(coordinates).then((result) => {
        if (result.success && result.address) {
          setAddress(result.address.formattedAddress);
        }
      });
    }
  }, [coordinates, selectedPlace]);

  const handleGetCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    try {
      const position = await getCurrentPosition();
      setCoordinates(position);
      setSelectedPlace(null);
    } catch (error) {
      logger.error("Failed to get current location:", error);
    } finally {
      setIsGettingLocation(false);
    }
  }, []);

  const handleMapClick = useCallback((coords: Coordinates) => {
    setCoordinates(coords);
    setSelectedPlace(null);
    setAddress(null);
  }, []);

  const handlePlaceSelect = useCallback((place: Place) => {
    setCoordinates(place.coordinates);
    setSelectedPlace(place);
    setAddress(place.address);
    setActiveTab("map");
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchPlaces(searchQuery, coordinates || undefined);
      setSearchResults(results);
    } catch (error) {
      logger.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, coordinates]);

  const handleConfirm = useCallback(() => {
    if (coordinates) {
      onSelect(coordinates, address || undefined, selectedPlace || undefined);
    }
  }, [coordinates, address, selectedPlace, onSelect]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border",
        className,
      )}
    >
      {/* Header with tabs */}
      <div className="bg-muted/30 flex items-center gap-2 border-b p-2">
        <Button
          variant={activeTab === "map" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("map")}
        >
          <MapPin className="mr-1.5 h-4 w-4" />
          Map
        </Button>
        {showNearbyPlaces && (
          <Button
            variant={activeTab === "places" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("places")}
          >
            <Navigation className="mr-1.5 h-4 w-4" />
            Nearby
          </Button>
        )}
        {showSearch && (
          <Button
            variant={activeTab === "search" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("search")}
          >
            <Search className="mr-1.5 h-4 w-4" />
            Search
          </Button>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Crosshair className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      <div style={{ height }}>
        {/* Map Tab */}
        {activeTab === "map" && coordinates && (
          <LocationMap
            center={coordinates}
            zoom={16}
            interactive
            onMapClick={handleMapClick}
            showMyLocation
            height="100%"
            className="rounded-none border-0"
          />
        )}

        {activeTab === "map" && !coordinates && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {isLoading || isGettingLocation ? (
                <>
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Getting your location...
                  </p>
                </>
              ) : (
                <>
                  <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Unable to get location
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleGetCurrentLocation}
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Nearby Places Tab */}
        {activeTab === "places" && coordinates && (
          <div className="h-full overflow-auto p-2">
            <NearbyPlaces
              coordinates={coordinates}
              onPlaceSelect={handlePlaceSelect}
            />
          </div>
        )}

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className="flex h-full flex-col p-2">
            <div className="mb-2 flex gap-2">
              <Input
                placeholder="Search for a place..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((place) => (
                    <button
                      key={place.id}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
                      onClick={() => handlePlaceSelect(place)}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{place.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {place.address}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {isSearching
                    ? "Searching..."
                    : searchQuery
                      ? "No results found"
                      : "Enter a search term"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with selected location and actions */}
      <div className="bg-muted/30 border-t p-3">
        {coordinates && (
          <div className="mb-3 flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              {selectedPlace ? (
                <>
                  <p className="truncate font-medium">{selectedPlace.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedPlace.address}
                  </p>
                </>
              ) : address ? (
                <p className="truncate text-sm">{address}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {coordinates.latitude.toFixed(6)},{" "}
                  {coordinates.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={!coordinates}
            onClick={handleConfirm}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Select Location
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LocationPicker;
