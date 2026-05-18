"use client";

import { MapPin, Navigation, Copy, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocationMap } from "./LocationMap";
import {
  type Coordinates,
  type GeocodedAddress,
  formatCoordinates,
  getDirectionsUrl,
  copyCoordinates,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LocationPreviewProps {
  /** Location coordinates */
  coordinates: Coordinates;
  /** Address (if available) */
  address?: GeocodedAddress | string;
  /** Custom label */
  label?: string;
  /** Whether to show the map */
  showMap?: boolean;
  /** Map height */
  mapHeight?: number;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Callback when directions button is clicked */
  onGetDirections?: () => void;
  /** Callback when share button is clicked */
  onShare?: () => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Location Preview Component
// ============================================================================

/**
 * Location Preview Card
 *
 * Shows a preview of a location with map and action buttons.
 */
export function LocationPreview({
  coordinates,
  address,
  label,
  showMap = true,
  mapHeight = 150,
  showActions = true,
  onGetDirections,
  onShare,
  size = "md",
  className,
}: LocationPreviewProps) {
  const addressText =
    typeof address === "string" ? address : address?.formattedAddress;

  const handleCopyCoordinates = async () => {
    const success = await copyCoordinates(coordinates);
    if (success) {
      // Could show a toast here
    }
  };

  const handleOpenInMaps = () => {
    window.open(getDirectionsUrl(coordinates), "_blank");
  };

  const sizeConfig = {
    sm: {
      padding: "p-2",
      gap: "gap-2",
      icon: "h-4 w-4",
      title: "text-sm",
      text: "text-xs",
      button: "h-7 text-xs",
    },
    md: {
      padding: "p-3",
      gap: "gap-3",
      icon: "h-5 w-5",
      title: "text-base",
      text: "text-sm",
      button: "h-8 text-sm",
    },
    lg: {
      padding: "p-4",
      gap: "gap-4",
      icon: "h-6 w-6",
      title: "text-lg",
      text: "text-base",
      button: "h-9 text-sm",
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      {/* Map Preview */}
      {showMap && (
        <LocationMap
          center={coordinates}
          zoom={15}
          interactive={false}
          height={mapHeight}
          className="rounded-none border-0"
        />
      )}

      {/* Location Info */}
      <div className={cn(config.padding)}>
        <div className={cn("flex items-start", config.gap)}>
          <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
            <MapPin className={cn("text-primary", config.icon)} />
          </div>

          <div className="min-w-0 flex-1">
            {label && (
              <p className={cn("font-semibold", config.title)}>{label}</p>
            )}
            {addressText && (
              <p
                className={cn(
                  "text-muted-foreground",
                  config.text,
                  label ? "" : "font-medium text-foreground",
                )}
              >
                {addressText}
              </p>
            )}
            <p className={cn("text-muted-foreground", config.text)}>
              {formatCoordinates(coordinates)}
            </p>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className={cn("mt-3 flex flex-wrap", config.gap)}>
            <Button
              variant="outline"
              size="sm"
              className={config.button}
              onClick={onGetDirections || handleOpenInMaps}
            >
              <Navigation className="mr-1.5 h-3.5 w-3.5" />
              Directions
            </Button>

            <Button
              variant="outline"
              size="sm"
              className={config.button}
              onClick={handleCopyCoordinates}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy
            </Button>

            {onShare && (
              <Button
                variant="outline"
                size="sm"
                className={config.button}
                onClick={onShare}
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Share
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className={config.button}
              onClick={handleOpenInMaps}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in Maps
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Location Preview
// ============================================================================

interface CompactLocationPreviewProps {
  /** Location coordinates */
  coordinates: Coordinates;
  /** Address (if available) */
  address?: string;
  /** Label */
  label?: string;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

/**
 * Compact location preview for inline use.
 */
export function CompactLocationPreview({
  coordinates,
  address,
  label,
  onClick,
  className,
}: CompactLocationPreviewProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-muted",
        className,
      )}
      onClick={onClick}
    >
      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
        <MapPin className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        {label && <p className="truncate text-sm font-medium">{label}</p>}
        <p className="truncate text-xs text-muted-foreground">
          {address || formatCoordinates(coordinates)}
        </p>
      </div>
    </button>
  );
}

// ============================================================================
// Mini Location Preview
// ============================================================================

interface MiniLocationPreviewProps {
  /** Location coordinates */
  coordinates: Coordinates;
  /** Custom class name */
  className?: string;
}

/**
 * Minimal location preview showing just the map.
 */
export function MiniLocationPreview({
  coordinates,
  className,
}: MiniLocationPreviewProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <LocationMap
        center={coordinates}
        zoom={15}
        interactive={false}
        height={100}
        className="rounded-lg"
      />
      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
        {formatCoordinates(coordinates, 4)}
      </div>
    </div>
  );
}

export default LocationPreview;
