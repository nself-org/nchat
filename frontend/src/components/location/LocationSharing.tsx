"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Navigation,
  Clock,
  Radio,
  Share2,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LocationMap } from "./LocationMap";
import { LocationPicker } from "./LocationPicker";
import { LocationDuration } from "./LocationDuration";
import { LocationPermission } from "./LocationPermission";
import { NearbyPlaces } from "./NearbyPlaces";
import { LiveLocationIndicator } from "./LiveLocationIndicator";
import { StopSharingButton } from "./StopSharingButton";
import { logger } from "@/lib/logger";
import {
  type Coordinates,
  type Place,
  type LocationSharingDuration,
  type LiveLocation,
  type StaticLocation,
  getCurrentPosition,
  isLocationPermissionGranted,
  DEFAULT_LOCATION_PRIVACY,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LocationSharingProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when static location is shared */
  onShareStatic?: (coordinates: Coordinates, label?: string) => void;
  /** Callback when live location is started */
  onShareLive?: (duration: LocationSharingDuration) => void;
  /** Current live location (if sharing) */
  currentLiveLocation?: LiveLocation | null;
  /** Callback to stop live sharing */
  onStopLiveSharing?: () => void;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Location Sharing Component
// ============================================================================

/**
 * Location Sharing Dialog
 *
 * Main component for sharing location (like Telegram).
 * Supports both static location pins and live location sharing.
 */
export function LocationSharing({
  isOpen,
  onClose,
  onShareStatic,
  onShareLive,
  currentLiveLocation,
  onStopLiveSharing,
  className,
}: LocationSharingProps) {
  const [activeTab, setActiveTab] = useState<"location" | "live" | "places">(
    "location",
  );
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(
    null,
  );
  const [selectedDuration, setSelectedDuration] =
    useState<LocationSharingDuration>(
      DEFAULT_LOCATION_PRIVACY.defaultSharingDuration,
    );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Check permission on mount
  useEffect(() => {
    if (isOpen) {
      isLocationPermissionGranted().then(setHasPermission);
    }
  }, [isOpen]);

  // Get current position when permission is granted
  useEffect(() => {
    if (hasPermission && isOpen && !currentPosition) {
      getCurrentPosition()
        .then(setCurrentPosition)
        .catch((error) => {
          logger.error("Failed to get position:", error);
        });
    }
  }, [hasPermission, isOpen, currentPosition]);

  const handlePermissionGranted = useCallback(() => {
    setHasPermission(true);
    getCurrentPosition().then(setCurrentPosition).catch(console.error);
  }, []);

  const handleShareCurrentLocation = useCallback(async () => {
    if (!currentPosition) return;

    setIsLoading(true);
    try {
      await onShareStatic?.(currentPosition);
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [currentPosition, onShareStatic, onClose]);

  const handleShareSelectedPlace = useCallback(async () => {
    if (!selectedPlace) return;

    setIsLoading(true);
    try {
      await onShareStatic?.(selectedPlace.coordinates, selectedPlace.name);
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlace, onShareStatic, onClose]);

  const handleStartLiveSharing = useCallback(async () => {
    setIsLoading(true);
    try {
      await onShareLive?.(selectedDuration);
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [selectedDuration, onShareLive, onClose]);

  const handlePickLocation = useCallback(
    (coordinates: Coordinates, _address?: string, place?: Place) => {
      onShareStatic?.(coordinates, place?.name);
      onClose();
    },
    [onShareStatic, onClose],
  );

  // If already sharing live location, show that UI
  if (currentLiveLocation) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className={cn("sm:max-w-md", className)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-500" />
              Sharing Live Location
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Map showing current location */}
            <LocationMap
              center={currentLiveLocation.coordinates}
              zoom={16}
              height={200}
              showMyLocation
              markers={[
                {
                  id: "live",
                  coordinates: currentLiveLocation.coordinates,
                  type: "user",
                  isAnimated: true,
                  color: "hsl(var(--primary))",
                },
              ]}
            />

            {/* Status */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <LiveLocationIndicator
                startedAt={currentLiveLocation.startedAt}
                expiresAt={currentLiveLocation.expiresAt}
                duration={currentLiveLocation.duration}
                isActive={currentLiveLocation.isActive}
              />
            </div>

            {/* Stop Button */}
            {onStopLiveSharing && (
              <StopSharingButton
                onStop={onStopLiveSharing}
                className="w-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Share Location
          </DialogTitle>
          <DialogDescription>
            Share your current location or pick a place on the map
          </DialogDescription>
        </DialogHeader>

        {/* Permission Check */}
        {hasPermission === false && (
          <LocationPermission
            onGranted={handlePermissionGranted}
            variant="card"
          />
        )}

        {/* Main Content */}
        {hasPermission && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="location" className="gap-1.5">
                <MapPin className="h-4 w-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-1.5">
                <Radio className="h-4 w-4" />
                Live
              </TabsTrigger>
              <TabsTrigger value="places" className="gap-1.5">
                <Navigation className="h-4 w-4" />
                Places
              </TabsTrigger>
            </TabsList>

            {/* Current Location Tab */}
            <TabsContent value="location" className="space-y-4">
              {currentPosition ? (
                <>
                  <LocationMap
                    center={currentPosition}
                    zoom={16}
                    height={200}
                    interactive
                    showMyLocation
                    onMapClick={handlePickLocation}
                  />

                  <Button
                    onClick={handleShareCurrentLocation}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="mr-2 h-4 w-4" />
                    )}
                    Share Current Location
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Tap on the map to select a different location
                  </p>
                </>
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </TabsContent>

            {/* Live Location Tab */}
            <TabsContent value="live" className="space-y-4">
              <div className="bg-primary/5 rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                    <Radio className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Live Location</h4>
                    <p className="text-sm text-muted-foreground">
                      Share your real-time location that updates automatically.
                      Others can see where you are as you move.
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration Selection */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Share for:</span>
                <LocationDuration
                  value={selectedDuration}
                  onChange={setSelectedDuration}
                  variant="list"
                />
              </div>

              <Button
                onClick={handleStartLiveSharing}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Radio className="mr-2 h-4 w-4" />
                )}
                Start Sharing Live Location
              </Button>
            </TabsContent>

            {/* Nearby Places Tab */}
            <TabsContent value="places" className="space-y-4">
              {currentPosition ? (
                <>
                  <div className="max-h-[300px] overflow-auto">
                    <NearbyPlaces
                      coordinates={currentPosition}
                      onPlaceSelect={(place) => setSelectedPlace(place)}
                      showFilter
                    />
                  </div>

                  {selectedPlace && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {selectedPlace.name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleShareSelectedPlace}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Share
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-[200px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Location Share Button
// ============================================================================

interface LocationShareButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Whether currently sharing live */
  isLiveSharing?: boolean;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Variant */
  variant?: "default" | "outline" | "ghost";
  /** Custom class name */
  className?: string;
}

/**
 * Button to open location sharing.
 */
export function LocationShareButton({
  onClick,
  isLiveSharing = false,
  size = "default",
  variant = "ghost",
  className,
}: LocationShareButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn(
        isLiveSharing && "text-green-500 hover:text-green-600",
        className,
      )}
    >
      {isLiveSharing ? (
        <>
          <Radio className="mr-2 h-4 w-4" />
          Live
        </>
      ) : (
        <>
          <MapPin className="mr-2 h-4 w-4" />
          Location
        </>
      )}
    </Button>
  );
}

export default LocationSharing;
