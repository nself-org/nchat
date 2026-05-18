"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { MessageUser } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

interface LocationMarkerProps {
  /** Marker type */
  type?: "user" | "place" | "pin";
  /** User info (for user markers) */
  user?: MessageUser;
  /** Marker label */
  label?: string;
  /** Marker color */
  color?: string;
  /** Whether marker is animated (for live locations) */
  isAnimated?: boolean;
  /** Heading/direction in degrees */
  heading?: number;
  /** Size of the marker */
  size?: "sm" | "md" | "lg";
  /** Whether this marker is selected */
  isSelected?: boolean;
  /** Custom class name */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// ============================================================================
// Size Configurations
// ============================================================================

const sizeConfig = {
  sm: {
    container: "h-6 w-6",
    avatar: "h-4 w-4",
    pin: 20,
    pulse: "h-8 w-8 -top-1 -left-1",
  },
  md: {
    container: "h-10 w-10",
    avatar: "h-7 w-7",
    pin: 32,
    pulse: "h-14 w-14 -top-2 -left-2",
  },
  lg: {
    container: "h-14 w-14",
    avatar: "h-10 w-10",
    pin: 44,
    pulse: "h-20 w-20 -top-3 -left-3",
  },
};

// ============================================================================
// Location Marker Component
// ============================================================================

/**
 * Location Marker Component
 *
 * Displays a marker on the map for users, places, or generic pins.
 */
export function LocationMarker({
  type = "pin",
  user,
  label,
  color = "var(--primary)",
  isAnimated = false,
  heading,
  size = "md",
  isSelected = false,
  className,
  onClick,
}: LocationMarkerProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "relative cursor-pointer transition-transform",
        isSelected && "scale-110",
        onClick && "hover:scale-105",
        className,
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Pulse animation for live locations */}
      {isAnimated && (
        <div
          className={cn(
            "absolute animate-ping rounded-full opacity-75",
            config.pulse,
          )}
          style={{ backgroundColor: `${color}30` }}
        />
      )}

      {/* User marker */}
      {type === "user" && user && (
        <UserMarker
          user={user}
          size={size}
          color={color}
          heading={heading}
          isAnimated={isAnimated}
          isSelected={isSelected}
        />
      )}

      {/* Place marker */}
      {type === "place" && (
        <PlaceMarker
          label={label}
          size={config.pin}
          color={color}
          isSelected={isSelected}
        />
      )}

      {/* Generic pin marker */}
      {type === "pin" && (
        <PinMarker
          size={config.pin}
          color={color}
          label={label}
          isSelected={isSelected}
        />
      )}

      {/* Heading indicator */}
      {heading !== undefined && (
        <HeadingIndicator heading={heading} color={color} size={size} />
      )}
    </div>
  );
}

// ============================================================================
// User Marker
// ============================================================================

interface UserMarkerProps {
  user: MessageUser;
  size: "sm" | "md" | "lg";
  color: string;
  heading?: number;
  isAnimated: boolean;
  isSelected: boolean;
}

function UserMarker({
  user,
  size,
  color,
  isAnimated,
  isSelected,
}: UserMarkerProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 shadow-lg",
        config.container,
        isSelected && "ring-2 ring-offset-2",
      )}
      style={{
        borderColor: color,
        backgroundColor: isAnimated ? `${color}10` : "white",
      }}
    >
      <Avatar className={config.avatar}>
        {user.avatarUrl && (
          <AvatarImage src={user.avatarUrl} alt={user.displayName} />
        )}
        <AvatarFallback
          className="text-xs"
          style={{ backgroundColor: color, color: "white" }}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Live indicator dot */}
      {isAnimated && (
        <div
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white"
          style={{ backgroundColor: "rgb(34, 197, 94)" }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Place Marker
// ============================================================================

interface PlaceMarkerProps {
  label?: string;
  size: number;
  color: string;
  isSelected: boolean;
}

function PlaceMarker({ label, size, color, isSelected }: PlaceMarkerProps) {
  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("drop-shadow-lg", isSelected && "drop-shadow-xl")}
      >
        {/* Marker shape */}
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
        {/* Inner circle */}
        <circle cx="12" cy="9" r="3" fill="white" opacity="0.9" />
      </svg>

      {/* Label */}
      {label && (
        <div className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-sm bg-white px-1 py-0.5 text-[10px] font-medium shadow-sm">
          {label}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Pin Marker
// ============================================================================

interface PinMarkerProps {
  size: number;
  color: string;
  label?: string;
  isSelected: boolean;
}

function PinMarker({ size, color, label, isSelected }: PinMarkerProps) {
  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("drop-shadow-md", isSelected && "drop-shadow-lg")}
      >
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill={color}
        />
        <circle cx="12" cy="9" r="2.5" fill="white" />
      </svg>

      {/* Label */}
      {label && (
        <div className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-sm bg-white px-1 py-0.5 text-[10px] font-medium shadow-sm">
          {label}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Heading Indicator
// ============================================================================

interface HeadingIndicatorProps {
  heading: number;
  color: string;
  size: "sm" | "md" | "lg";
}

function HeadingIndicator({ heading, color, size }: HeadingIndicatorProps) {
  const arrowSize = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const offset = size === "sm" ? 16 : size === "md" ? 24 : 32;

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `translate(-50%, -50%) rotate(${heading}deg) translateY(-${offset}px)`,
      }}
    >
      <div
        className="h-0 w-0"
        style={{
          borderLeft: `${arrowSize / 2}px solid transparent`,
          borderRight: `${arrowSize / 2}px solid transparent`,
          borderBottom: `${arrowSize}px solid ${color}`,
        }}
      />
    </div>
  );
}

// ============================================================================
// Cluster Marker
// ============================================================================

interface ClusterMarkerProps {
  count: number;
  size?: "sm" | "md" | "lg";
  color?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Cluster marker for grouped locations.
 */
export function ClusterMarker({
  count,
  size = "md",
  color = "var(--primary)",
  onClick,
  className,
}: ClusterMarkerProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold text-white shadow-lg transition-transform",
        sizeClasses[size],
        onClick && "cursor-pointer hover:scale-110",
        className,
      )}
      style={{ backgroundColor: color }}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {count}
    </div>
  );
}

export default LocationMarker;
