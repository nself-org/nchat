"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  MoreVertical,
  Timer,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LocationMap } from "./LocationMap";
import {
  LiveLocationIndicator,
  LiveBadge,
  LiveLocationTimer,
} from "./LiveLocationIndicator";
import { StopSharingButton, InlineStopButton } from "./StopSharingButton";
import {
  type LiveLocation,
  formatCoordinates,
  formatAddress,
  formatRemainingTime,
  getDirectionsUrl,
  openDirections,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LiveLocationMessageProps {
  /** Live location data */
  location: LiveLocation;
  /** Whether this is the current user sharing */
  isOwnLocation?: boolean;
  /** Callback to stop sharing (only for own location) */
  onStopSharing?: () => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the map */
  showMap?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Live Location Message Component
// ============================================================================

/**
 * Live Location Message
 *
 * Displays a live (real-time) location share in a message.
 * Shows animated marker and countdown timer.
 */
export function LiveLocationMessage({
  location,
  isOwnLocation = false,
  onStopSharing,
  size = "md",
  showMap = true,
  className,
}: LiveLocationMessageProps) {
  const {
    coordinates,
    address,
    user,
    startedAt,
    expiresAt,
    duration,
    isActive,
    heading,
    speed,
  } = location;
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Update remaining time
  useEffect(() => {
    if (!isActive) {
      setRemainingTime(0);
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const end = new Date(expiresAt).getTime();
      setRemainingTime(Math.max(0, end - now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isActive]);

  const handleGetDirections = () => {
    openDirections(coordinates);
  };

  const handleOpenMaps = () => {
    window.open(getDirectionsUrl(coordinates), "_blank");
  };

  const sizeConfig = {
    sm: {
      mapHeight: 140,
      padding: "p-2",
      gap: "gap-2",
      avatar: "h-8 w-8",
      icon: "h-4 w-4",
      title: "text-sm",
      text: "text-xs",
      maxWidth: "max-w-[260px]",
    },
    md: {
      mapHeight: 180,
      padding: "p-3",
      gap: "gap-2.5",
      avatar: "h-10 w-10",
      icon: "h-5 w-5",
      title: "text-base",
      text: "text-sm",
      maxWidth: "max-w-[320px]",
    },
    lg: {
      mapHeight: 220,
      padding: "p-4",
      gap: "gap-3",
      avatar: "h-12 w-12",
      icon: "h-6 w-6",
      title: "text-lg",
      text: "text-base",
      maxWidth: "max-w-[380px]",
    },
  };

  const config = sizeConfig[size];

  // Expired state
  if (!isActive || remainingTime <= 0) {
    return (
      <ExpiredLocationMessage
        location={location}
        size={size}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        config.maxWidth,
        isOwnLocation && "bg-primary/5 border-primary/20",
        className,
      )}
    >
      {/* Map Preview with Live Marker */}
      {showMap && (
        <div className="relative">
          <LocationMap
            center={coordinates}
            zoom={16}
            interactive={false}
            height={config.mapHeight}
            markers={[
              {
                id: "live",
                coordinates,
                type: "user",
                user,
                isAnimated: true,
                heading,
                color: isOwnLocation ? "hsl(var(--primary))" : "#10b981",
              },
            ]}
            showMyLocation={false}
            className="rounded-none border-0"
          />

          {/* Live Badge */}
          <div className="absolute right-2 top-2">
            <LiveBadge size="sm" />
          </div>

          {/* Timer in corner */}
          <div className="absolute bottom-2 right-2">
            <LiveLocationTimer
              startedAt={startedAt}
              expiresAt={expiresAt}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* User Info and Status */}
      <div className={config.padding}>
        <div className={cn("flex items-start justify-between", config.gap)}>
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            {/* User Avatar */}
            <div className="relative">
              <Avatar className={config.avatar}>
                {user.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                )}
                <AvatarFallback>
                  {user.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Live indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={cn("truncate font-semibold", config.title)}>
                  {isOwnLocation ? "You" : user.displayName}
                </p>
              </div>
              <p className={cn("text-muted-foreground", config.text)}>
                Sharing live location
              </p>

              {/* Location info */}
              {address && (
                <p
                  className={cn(
                    "mt-1 truncate text-muted-foreground",
                    config.text,
                  )}
                >
                  {typeof address === "string"
                    ? address
                    : formatAddress(address, "short")}
                </p>
              )}

              {/* Speed indicator */}
              {speed !== undefined && speed > 0.5 && (
                <p className={cn("mt-0.5 text-muted-foreground", config.text)}>
                  Moving at {Math.round(speed * 3.6)} km/h
                </p>
              )}
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
              {isOwnLocation && onStopSharing && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onStopSharing}
                    className="text-destructive focus:text-destructive"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Stop Sharing
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Time Remaining */}
        <div className="mt-3 flex items-center justify-between">
          <LiveLocationIndicator
            startedAt={startedAt}
            expiresAt={expiresAt}
            duration={duration}
            isActive={isActive}
            size="sm"
          />

          {/* Actions */}
          <div className="flex gap-2">
            {isOwnLocation && onStopSharing ? (
              <InlineStopButton onStop={onStopSharing} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={handleGetDirections}
              >
                <Navigation className="mr-1.5 h-3 w-3" />
                Directions
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Expired Location Message
// ============================================================================

interface ExpiredLocationMessageProps {
  location: LiveLocation;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function ExpiredLocationMessage({
  location,
  size = "md",
  className,
}: ExpiredLocationMessageProps) {
  const { coordinates, user } = location;

  const sizeConfig = {
    sm: {
      padding: "p-2",
      avatar: "h-6 w-6",
      text: "text-xs",
      maxWidth: "max-w-[220px]",
    },
    md: {
      padding: "p-3",
      avatar: "h-8 w-8",
      text: "text-sm",
      maxWidth: "max-w-[280px]",
    },
    lg: {
      padding: "p-4",
      avatar: "h-10 w-10",
      text: "text-base",
      maxWidth: "max-w-[340px]",
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "bg-muted/30 rounded-xl border",
        config.maxWidth,
        config.padding,
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar className={cn(config.avatar, "opacity-50")}>
          {user.avatarUrl && (
            <AvatarImage src={user.avatarUrl} alt={user.displayName} />
          )}
          <AvatarFallback>
            {user.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-muted-foreground", config.text)}>
            {user.displayName}&apos;s live location ended
          </p>
          <p className={cn("text-muted-foreground", config.text)}>
            Last seen: {formatCoordinates(coordinates)}
          </p>
        </div>

        <Timer className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

// ============================================================================
// Compact Live Location
// ============================================================================

interface CompactLiveLocationProps {
  location: LiveLocation;
  isOwnLocation?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact live location display for message previews.
 */
export function CompactLiveLocation({
  location,
  isOwnLocation = false,
  onClick,
  className,
}: CompactLiveLocationProps) {
  const { user, isActive } = location;

  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg p-2 text-left transition-colors",
        isActive
          ? "bg-green-500/10 hover:bg-green-500/20"
          : "bg-muted/50 hover:bg-muted",
        className,
      )}
      onClick={onClick}
    >
      <div className="relative">
        <MapPin className="h-4 w-4 text-green-500" />
        {isActive && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        )}
      </div>
      <span className="truncate text-sm">
        {isOwnLocation ? "Your" : `${user.displayName}'s`} live location
      </span>
      {isActive && <LiveBadge size="sm" />}
    </button>
  );
}

export default LiveLocationMessage;
