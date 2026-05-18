"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  Coordinates,
  MapConfig,
  LocationMarker,
  DEFAULT_MAP_CONFIG,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LocationMapProps {
  /** Center coordinates */
  center: Coordinates;
  /** Zoom level (1-20) */
  zoom?: number;
  /** Map markers */
  markers?: LocationMarker[];
  /** Map style */
  style?: "light" | "dark" | "satellite" | "terrain";
  /** Whether to show user's current location */
  showMyLocation?: boolean;
  /** Whether the map is interactive */
  interactive?: boolean;
  /** Callback when map is clicked */
  onMapClick?: (coordinates: Coordinates) => void;
  /** Callback when marker is clicked */
  onMarkerClick?: (marker: LocationMarker) => void;
  /** Custom class name */
  className?: string;
  /** Height of the map */
  height?: number | string;
  /** Width of the map */
  width?: number | string;
}

// ============================================================================
// Map Component
// ============================================================================

/**
 * Location Map Component
 *
 * A placeholder map component that displays a static map preview.
 * In production, this would integrate with Mapbox, Google Maps, or Leaflet.
 */
export function LocationMap({
  center,
  zoom = 15,
  markers = [],
  style = "light",
  showMyLocation = false,
  interactive = true,
  onMapClick,
  onMarkerClick,
  className,
  height = 300,
  width = "100%",
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !onMapClick || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Placeholder: Convert click position to coordinates
      // In real implementation, this would use the map's unproject method
      const clickedCoords: Coordinates = {
        latitude: center.latitude + (rect.height / 2 - y) * 0.0001,
        longitude: center.longitude + (x - rect.width / 2) * 0.0001,
      };

      onMapClick(clickedCoords);
    },
    [center, interactive, onMapClick],
  );

  // Generate static map preview URL (using OpenStreetMap tiles as placeholder)
  const mapPreviewUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${center.latitude},${center.longitude}&zoom=${zoom}&size=640x400&maptype=osmarenderer`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-muted",
        interactive && "cursor-crosshair",
        className,
      )}
      style={{ height, width }}
      onClick={handleClick}
      onKeyDown={
        interactive && onMapClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onMapClick(center);
              }
            }
          : undefined
      }
      role={interactive && onMapClick ? "button" : undefined}
      tabIndex={interactive && onMapClick ? 0 : undefined}
    >
      {/* Map background */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Placeholder map background pattern */}
        <div
          className={cn(
            "absolute inset-0",
            style === "dark"
              ? "bg-gradient-to-br from-slate-800 to-slate-900"
              : style === "satellite"
                ? "bg-gradient-to-br from-green-900 to-emerald-800"
                : "bg-gradient-to-br from-blue-50 to-green-50",
          )}
        >
          {/* Grid pattern to simulate map */}
          <svg
            className="absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="map-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke={
                    style === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)"
                  }
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
          </svg>

          {/* Simulated roads */}
          <div
            className={cn(
              "absolute left-1/4 top-0 h-full w-1",
              style === "dark" ? "bg-slate-600" : "bg-gray-200",
            )}
          />
          <div
            className={cn(
              "absolute left-0 top-1/3 h-1 w-full",
              style === "dark" ? "bg-slate-600" : "bg-gray-200",
            )}
          />
          <div
            className={cn(
              "absolute left-2/3 top-0 h-full w-0.5",
              style === "dark" ? "bg-slate-700" : "bg-gray-100",
            )}
          />
        </div>
      </div>

      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-sm text-muted-foreground">Loading map...</div>
        </div>
      )}

      {/* Map markers */}
      {isLoaded && (
        <div className="absolute inset-0">
          {/* Center marker */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
            <MapPin color="var(--primary)" size={32} isAnimated={false} />
          </div>

          {/* Additional markers */}
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute cursor-pointer"
              style={{
                // Placeholder positioning - real implementation would use actual coordinates
                left: `${50 + (marker.coordinates.longitude - center.longitude) * 10000}%`,
                top: `${50 - (marker.coordinates.latitude - center.latitude) * 10000}%`,
                transform: "translate(-50%, -100%)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onMarkerClick?.(marker);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkerClick?.(marker);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <MapPin
                color={marker.color || "var(--primary)"}
                size={24}
                isAnimated={marker.isAnimated}
                label={marker.label}
                heading={marker.heading}
              />
            </div>
          ))}

          {/* User location marker */}
          {showMyLocation && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute -inset-4 animate-ping rounded-full bg-blue-500/20" />
                <div className="h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zoom controls (placeholder) */}
      {interactive && isLoaded && (
        <div className="absolute right-3 top-3 flex flex-col gap-1">
          <button
            className="flex h-8 w-8 items-center justify-center rounded bg-white shadow hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              // Zoom in logic would go here
            }}
          >
            <span className="text-lg font-bold text-gray-700">+</span>
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded bg-white shadow hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              // Zoom out logic would go here
            }}
          >
            <span className="text-lg font-bold text-gray-700">-</span>
          </button>
        </div>
      )}

      {/* Coordinates display */}
      {isLoaded && (
        <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs text-gray-600 shadow-sm backdrop-blur-sm">
          {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-400">
        Map placeholder
      </div>
    </div>
  );
}

// ============================================================================
// Map Pin Component
// ============================================================================

interface MapPinProps {
  color?: string;
  size?: number;
  isAnimated?: boolean;
  label?: string;
  heading?: number;
}

function MapPin({
  color = "var(--primary)",
  size = 32,
  isAnimated = false,
  label,
  heading,
}: MapPinProps) {
  return (
    <div className="relative">
      {/* Pulse animation for live locations */}
      {isAnimated && (
        <div
          className="absolute -inset-2 animate-ping rounded-full opacity-75"
          style={{ backgroundColor: `${color}40` }}
        />
      )}

      {/* Pin icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill={color}
        />
        <circle cx="12" cy="9" r="2.5" fill="white" />
      </svg>

      {/* Heading indicator */}
      {heading !== undefined && (
        <div
          className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2"
          style={{
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderBottom: "8px solid white",
            transform: `translate(-50%, -50%) rotate(${heading}deg) translateY(-${size / 2 + 4}px)`,
          }}
        />
      )}

      {/* Label */}
      {label && (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-xs font-medium shadow">
          {label}
        </div>
      )}
    </div>
  );
}

export default LocationMap;
