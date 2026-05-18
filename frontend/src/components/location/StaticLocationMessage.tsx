"use client";

import {
  MapPin,
  Navigation,
  Copy,
  ExternalLink,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LocationMap } from "./LocationMap";
import {
  type StaticLocation,
  formatCoordinates,
  formatAddress,
  getDirectionsUrl,
  copyCoordinates,
  openDirections,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface StaticLocationMessageProps {
  /** Static location data */
  location: StaticLocation;
  /** Whether this is the current user's message */
  isOwnMessage?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the map */
  showMap?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Static Location Message Component
// ============================================================================

/**
 * Static Location Message
 *
 * Displays a static (one-time) location share in a message.
 */
export function StaticLocationMessage({
  location,
  isOwnMessage = false,
  size = "md",
  showMap = true,
  className,
}: StaticLocationMessageProps) {
  const { coordinates, address, label, sharedBy, sharedAt } = location;

  const handleCopy = async () => {
    await copyCoordinates(coordinates);
  };

  const handleOpenMaps = () => {
    window.open(getDirectionsUrl(coordinates), "_blank");
  };

  const handleGetDirections = () => {
    openDirections(coordinates);
  };

  const sizeConfig = {
    sm: {
      mapHeight: 120,
      padding: "p-2",
      gap: "gap-2",
      icon: "h-4 w-4",
      title: "text-sm",
      text: "text-xs",
      maxWidth: "max-w-[240px]",
    },
    md: {
      mapHeight: 160,
      padding: "p-3",
      gap: "gap-2.5",
      icon: "h-5 w-5",
      title: "text-base",
      text: "text-sm",
      maxWidth: "max-w-[300px]",
    },
    lg: {
      mapHeight: 200,
      padding: "p-4",
      gap: "gap-3",
      icon: "h-6 w-6",
      title: "text-lg",
      text: "text-base",
      maxWidth: "max-w-[360px]",
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        config.maxWidth,
        isOwnMessage && "bg-primary/5",
        className,
      )}
    >
      {/* Map Preview */}
      {showMap && (
        <div className="relative">
          <LocationMap
            center={coordinates}
            zoom={15}
            interactive={false}
            height={config.mapHeight}
            className="rounded-none border-0"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
        </div>
      )}

      {/* Location Info */}
      <div className={config.padding}>
        <div className={cn("flex items-start justify-between", config.gap)}>
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <div
              className={cn(
                "flex items-center justify-center rounded-full",
                isOwnMessage ? "bg-primary/20" : "bg-primary/10",
                size === "sm" ? "h-8 w-8" : "h-10 w-10",
              )}
            >
              <MapPin className={cn("text-primary", config.icon)} />
            </div>

            <div className="min-w-0 flex-1">
              {label ? (
                <>
                  <p className={cn("truncate font-semibold", config.title)}>
                    {label}
                  </p>
                  {address && (
                    <p
                      className={cn(
                        "truncate text-muted-foreground",
                        config.text,
                      )}
                    >
                      {typeof address === "string"
                        ? address
                        : formatAddress(address, "short")}
                    </p>
                  )}
                </>
              ) : address ? (
                <p className={cn("font-medium", config.text)}>
                  {typeof address === "string"
                    ? address
                    : formatAddress(address, "short")}
                </p>
              ) : (
                <p className={cn("font-medium", config.text)}>
                  {formatCoordinates(coordinates)}
                </p>
              )}
              <p className={cn("mt-0.5 text-muted-foreground", config.text)}>
                Shared location
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGetDirections}>
                <Navigation className="mr-2 h-4 w-4" />
                Get Directions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenMaps}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in Maps
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Coordinates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick Actions */}
        <div className={cn("mt-3 flex gap-2", config.gap)}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleGetDirections}
          >
            <Navigation className="mr-1.5 h-3.5 w-3.5" />
            Directions
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenMaps}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Static Location
// ============================================================================

interface CompactStaticLocationProps {
  location: StaticLocation;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact static location display for message previews.
 */
export function CompactStaticLocation({
  location,
  onClick,
  className,
}: CompactStaticLocationProps) {
  const { coordinates, address, label } = location;

  return (
    <button
      className={cn(
        "bg-muted/50 flex items-center gap-2 rounded-lg p-2 text-left hover:bg-muted",
        className,
      )}
      onClick={onClick}
    >
      <MapPin className="h-4 w-4 text-primary" />
      <span className="truncate text-sm">
        {label ||
          (address && typeof address === "string"
            ? address
            : formatCoordinates(coordinates))}
      </span>
    </button>
  );
}

export default StaticLocationMessage;
