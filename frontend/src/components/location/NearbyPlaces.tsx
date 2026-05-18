"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Loader2,
  Coffee,
  Utensils,
  ShoppingBag,
  Building,
  Heart,
  Train,
  TreePine,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  type Coordinates,
  type Place,
  type PlaceCategory,
  searchNearbyPlaces,
  formatDistanceForUI,
  getPlaceCategoryName,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface NearbyPlacesProps {
  /** Current coordinates to search from */
  coordinates: Coordinates;
  /** Search radius in meters */
  radius?: number;
  /** Maximum number of results */
  limit?: number;
  /** Callback when a place is selected */
  onPlaceSelect?: (place: Place) => void;
  /** Whether to show category filter */
  showFilter?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Category Icons
// ============================================================================

const categoryIcons: Record<PlaceCategory, typeof MapPin> = {
  restaurant: Utensils,
  cafe: Coffee,
  bar: Coffee,
  store: ShoppingBag,
  hotel: Building,
  hospital: Heart,
  pharmacy: Heart,
  gas_station: MapPin,
  parking: MapPin,
  transit: Train,
  airport: MapPin,
  school: Building,
  gym: Building,
  park: TreePine,
  museum: Building,
  church: Building,
  bank: Building,
  atm: MapPin,
  other: MapPin,
};

const categoryFilters: PlaceCategory[] = [
  "restaurant",
  "cafe",
  "store",
  "transit",
  "park",
  "hospital",
];

// ============================================================================
// Nearby Places Component
// ============================================================================

/**
 * Nearby Places Component
 *
 * Shows a list of nearby places that users can select to share.
 */
export function NearbyPlaces({
  coordinates,
  radius = 1000,
  limit = 10,
  onPlaceSelect,
  showFilter = true,
  className,
}: NearbyPlacesProps) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<PlaceCategory | null>(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await searchNearbyPlaces(coordinates, {
          radius,
          limit,
          category: selectedCategory || undefined,
        });
        setPlaces(results);
      } catch (err) {
        setError("Failed to load nearby places");
        logger.error("Failed to fetch nearby places:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, [coordinates, radius, limit, selectedCategory]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Category Filter */}
      {showFilter && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categoryFilters.map((category) => {
            const Icon = categoryIcons[category];
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedCategory(category)}
              >
                <Icon className="mr-1 h-3 w-3" />
                {getPlaceCategoryName(category)}
              </Button>
            );
          })}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && places.length === 0 && (
        <div className="py-8 text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No places found nearby
          </p>
        </div>
      )}

      {/* Places List */}
      {!isLoading && !error && places.length > 0 && (
        <div className="space-y-1">
          {places.map((place) => (
            <PlaceItem
              key={place.id}
              place={place}
              onClick={() => onPlaceSelect?.(place)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Place Item Component
// ============================================================================

interface PlaceItemProps {
  place: Place;
  onClick?: () => void;
  className?: string;
}

/**
 * Individual place list item.
 */
export function PlaceItem({ place, onClick, className }: PlaceItemProps) {
  const Icon = place.category ? categoryIcons[place.category] : MapPin;

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted",
        className,
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
        <Icon className="h-5 w-5 text-primary" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{place.name}</p>
          {place.rating && (
            <div className="flex items-center gap-0.5 text-xs text-amber-500">
              <Star className="h-3 w-3 fill-current" />
              {place.rating.toFixed(1)}
            </div>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {place.address}
        </p>
        {place.category && (
          <p className="text-xs text-muted-foreground">
            {getPlaceCategoryName(place.category)}
          </p>
        )}
      </div>

      {/* Distance */}
      {place.distance !== undefined && (
        <div className="text-right">
          <p className="text-sm font-medium">
            {formatDistanceForUI(place.distance)}
          </p>
          {place.isOpen !== undefined && (
            <p
              className={cn(
                "text-xs",
                place.isOpen ? "text-green-600" : "text-muted-foreground",
              )}
            >
              {place.isOpen ? "Open" : "Closed"}
            </p>
          )}
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Compact Place Card
// ============================================================================

interface PlaceCardProps {
  place: Place;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact place card for grid display.
 */
export function PlaceCard({ place, onClick, className }: PlaceCardProps) {
  const Icon = place.category ? categoryIcons[place.category] : MapPin;

  return (
    <button
      className={cn(
        "flex flex-col items-center rounded-lg border p-3 text-center transition-colors hover:bg-muted",
        className,
      )}
      onClick={onClick}
    >
      <div className="bg-primary/10 mb-2 flex h-10 w-10 items-center justify-center rounded-full">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="mb-0.5 truncate text-sm font-medium">{place.name}</p>
      {place.distance !== undefined && (
        <p className="text-xs text-muted-foreground">
          {formatDistanceForUI(place.distance)}
        </p>
      )}
    </button>
  );
}

export default NearbyPlaces;
